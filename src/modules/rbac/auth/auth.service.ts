import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from 'src/common/emails/emails.service';
import { errUserMessage } from 'src/libs/errors/error_user';
import { successUserMessage } from 'src/libs/success/success_user';
import { EmailType } from 'src/types/email.types';
import { AuthResponse } from 'src/types/response/auth.type';
import { Repository } from 'typeorm';
import { SessionsService } from '../sessions/sessions.service';
import {
  CreateUserDto,
  EmailRequest,
  LoginUserDto,
  ResetPasswordDto,
} from '../users/dto/create-user.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
  ) {}

  // register user for role owner and super admin
  async register(reqDto: CreateUserDto): Promise<AuthResponse> {
    const { role_code } = reqDto as any;
    let role;

    if (role_code) {
      role = await this.usersService.findRole(role_code);
    } else {
      // Always default to owner role since role_code is not in DTO or not provided
      role = await this.usersService.findRole('owner');
    }

    if (!role) {
      throw new HttpException('Role not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Check max owner
    if (role.code === 'owner') {
      const countOwner = await this.usersService.countByRole('owner');
      if (countOwner >= 2) {
        throw new HttpException('Maximum owner limit reached (2)', HttpStatus.BAD_REQUEST);
      }
    }

    // check if role allows self register
    if (role.self_register === false) {
      throw new HttpException('User cannot register', HttpStatus.BAD_REQUEST);
    }

    // check user already exists
    const userExists = await this.usersService.findEmail(reqDto.email);
    if (userExists) {
      throw new HttpException(errUserMessage.USER_ALREADY_EXISTS, HttpStatus.BAD_REQUEST);
    }
    const user = await this.usersService.create(reqDto, role);

    // Send verification email
    const links = process.env.CLIENT_SITE || 'https://pos-app.backend.orb.local';
    const baseSite = (links || '').replace(/\/+$/, '');

    await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
      links: `${baseSite}/verify-account?verify_token=${user.verify_code}`,
      email: user.email,
      subjectMessage: 'Verify your account',
    });

    return {
      message: successUserMessage.USER_CREATED,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.code,
        is_verified: user.is_verified,
      },
    };
  }

  // verify account user
  async verifyAccount(verify_code: string): Promise<AuthResponse> {
    console.log('Attempting to verify account with code:', verify_code);
    // check verify code is valid
    const user = await this.usersService.findVerifyCode(verify_code);
    if (!user) {
      throw new HttpException(errUserMessage.USER_VERIFY_CODE_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }
    // check user already verified
    if (user.is_verified === true) {
      throw new HttpException(errUserMessage.USER_ALREADY_VERIFIED, HttpStatus.BAD_REQUEST);
    }
    // update user
    await this.usersService.update(user.id, {
      is_verified: true,
      verify_code: null,
      exp_verify_at: null,
      updatedAt: new Date(),
    });
    return {
      message: successUserMessage.USER_VERIFIED,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.code || 'user',
        is_verified: true,
      },
    };
  }

  // resend verify code
  async resendVerifyCode(reqDto: EmailRequest): Promise<AuthResponse> {
    // check user exists
    const user = await this.usersService.findEmail(reqDto.email);
    if (!user) {
      throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }
    // check user already verified
    if (user.is_verified === true) {
      throw new HttpException(errUserMessage.USER_ALREADY_VERIFIED, HttpStatus.BAD_REQUEST);
    }

    // generate verify code
    const tokens = crypto.randomBytes(40).toString('hex');
    const tokenVerify = `${tokens}-${Date.now()}`;

    // update user
    await this.usersService.update(user.id, {
      verify_code: tokenVerify,
      exp_verify_at: new Date(Date.now() + 10 * 60 * 1000),
    });

    // Send verification email
    const links = process.env.CLIENT_SITE || 'https://pos-app.backend.orb.local';
    const baseSite = (links || '').replace(/\/+$/, '');

    await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
      links: `${baseSite}/verify-account?verify_token=${tokenVerify}`,
      email: user.email,
      subjectMessage: 'Verify your account',
    });

    return {
      message: successUserMessage.USER_RESEND_VERIFY_EMAIL,
    };
  }

  // login user
  async login(
    ip: string,
    device: string,
    reqDto: LoginUserDto,
  ): Promise<AuthResponse> {
    let user: User;

    if (reqDto.pin) {
      // PIN login (for cashier)
      user = await this.usersRepository.findOne({
        where: { pin: reqDto.pin },
        relations: ['role'],
      });

      if (!user) {
        throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
      }

      if (user.role.code !== 'cashier') {
        throw new HttpException(errUserMessage.USER_NOT_AUTHORIZED, HttpStatus.UNAUTHORIZED);
      }
    } else if (reqDto.username && reqDto.password) {
      // Username login (for staff, admin, etc.)
      user = await this.usersRepository.findOne({
        where: { username: reqDto.username },
        relations: ['role'],
      });

      if (!user) {
        throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
      }

      if (user.role.code === 'cashier') {
        throw new HttpException(errUserMessage.USER_NOT_AUTHORIZED, HttpStatus.UNAUTHORIZED);
      }

      // check password
      const isPasswordValid = await bcrypt.compare(reqDto.password, user.password);
      if (!isPasswordValid) {
        throw new HttpException(errUserMessage.USER_LOGIN_FAILED, HttpStatus.BAD_REQUEST);
      }
    } else if (reqDto.email && reqDto.password) {
      // Email login (for owner)
      user = await this.usersRepository.findOne({
        where: { email: reqDto.email },
        relations: ['role'],
      });

      if (!user) {
        throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
      }

      if (user.role.code !== 'owner') {
        throw new HttpException(errUserMessage.USER_NOT_AUTHORIZED, HttpStatus.UNAUTHORIZED);
      }

      // check password
      const isPasswordValid = await bcrypt.compare(reqDto.password, user.password);
      if (!isPasswordValid) {
        throw new HttpException(errUserMessage.USER_LOGIN_FAILED, HttpStatus.BAD_REQUEST);
      }
    } else {
      throw new HttpException('Missing login credentials', HttpStatus.BAD_REQUEST);
    }

    // check user already verified
    if (user.is_verified === false) {
      throw new HttpException(errUserMessage.USER_NOT_VERIFIED, HttpStatus.BAD_REQUEST);
    }

    // Generate access token (JWT)
    const accessToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '1h' });

    // Generate session token (random)
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Hash session token for storage
    const sessionTokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');

    // Create session record with device info
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionsService.createSession(
      user,
      sessionTokenHash,
      expiresAt,
      ip,
      device,
    );

    return {
      message: successUserMessage.USER_LOGGED_IN,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.code,
        is_verified: user.is_verified,
        token: accessToken,
        session_token: sessionToken,
      },
    };
  }

  // logout user
  async logout(sessionToken: string, user?: any): Promise<AuthResponse> {
    if (!sessionToken) {
      return {
        message: successUserMessage.USER_LOGGED_OUT,
      };
    }

    // Hash session token for storage
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    // find session by refresh token
    const session = await this.sessionsService.findByRefreshToken(tokenHash);
    if (!session) {
      return {
        message: successUserMessage.USER_LOGGED_OUT, // silently succeed if session not found
      };
    }

    // Delete session
    await this.sessionsService.removeSession(tokenHash);

    return {
      message: successUserMessage.USER_LOGGED_OUT,
    };
  }

  // refresh token
  async refreshToken(token: string): Promise<AuthResponse> {
    if (!token) {
      throw new HttpException(errUserMessage.USER_REFRESH_TOKEN_FAILED, HttpStatus.BAD_REQUEST);
    }

    // Hash session token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // find session by refresh token
    const session = await this.sessionsService.findByRefreshToken(tokenHash);
    if (!session) {
      throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }

    // Generate access token (JWT)
    const accessToken = this.jwtService.sign({ sub: session.user.id }, { expiresIn: '1h' });

    // Generate session token (random)
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Hash session token for storage
    const sessionTokenHash = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');

    // Create session record with device info
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.sessionsService.createSession(
      session.user,
      sessionTokenHash,
      expiresAt,
      session.ip,
      session.device,
    );

    return {
      message: successUserMessage.USER_REFRESH_TOKEN,
      data: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role.code,
        is_verified: session.user.is_verified,
        token: accessToken,
        session_token: sessionToken,
      },
    };
  }

  // forgot password user
  async forgotPassword(reqDto: EmailRequest): Promise<AuthResponse> {
    const user = await this.usersService.findEmail(reqDto.email);
    if (!user) {
      throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }
    // check user already verified
    if (user.is_verified === false) {
      throw new HttpException(errUserMessage.USER_NOT_VERIFIED, HttpStatus.BAD_REQUEST);
    }

    // generate verify token
    const tokens = crypto.randomBytes(40).toString('hex');
    const tokenVerify = `${tokens}-${Date.now()}`;

    // create verify token
    await this.usersService.update(user.id, {
      verify_code: tokenVerify,
      exp_verify_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send reset password
    const links = process.env.CLIENT_SITE || 'https://pos-app.backend.orb.local';
    const baseSite = (links || '').replace(/\/+$/, '');

    await this.emailService.sendMail(EmailType.RESET_PASSWORD, {
      links: `${baseSite}/reset-password?verify_token=${tokenVerify}`,
      email: user.email,
      subjectMessage: 'Reset your password',
    });

    return {
      message: successUserMessage.USER_FORGOT_PASSWORD,
    };
  }

  // reset password user
  async resetPassword(reqDto: ResetPasswordDto): Promise<AuthResponse> {
    // check user by verify token
    const user = await this.usersService.findVerifyCode(reqDto.token);
    if (!user) {
      throw new HttpException(errUserMessage.USER_NOT_FOUND, HttpStatus.BAD_REQUEST);
    }
    // check user already verified
    if (user.is_verified === false) {
      throw new HttpException(errUserMessage.USER_NOT_VERIFIED, HttpStatus.BAD_REQUEST);
    }
    // check password and retry password
    if (reqDto.password !== reqDto.retryPassword) {
      throw new HttpException(errUserMessage.USER_PASSWORD_NOT_MATCH, HttpStatus.BAD_REQUEST);
    }

    // update user
    await this.usersService.update(user.id, {
      password: reqDto.password,
      verify_code: null,
      exp_verify_at: null,
    });

    // Send reset password
    const links = process.env.CLIENT_SITE;
    const baseSite = (links || '').replace(/\/+$/, '');

    await this.emailService.sendMail(EmailType.RESET_PASSWORD, {
      links: `${baseSite}/login`,
      email: user.email,
      subjectMessage: 'Success Reset Password',
    });

    return {
      message: successUserMessage.USER_RESET_PASSWORD,
    };
  }
}
