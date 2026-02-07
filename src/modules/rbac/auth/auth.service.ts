import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EmailService } from 'src/common/emails/emails.service';
import { errUserMessage } from 'src/libs/errors/error_user';
import { successUserMessage } from 'src/libs/success/success_user';
import { EmailType } from 'src/types/email.types';
import { AuthResponse } from 'src/types/response/auth.type';
import { SessionsService } from '../sessions/sessions.service';
import {
  CreateUserDto,
  EmailRequest,
  LoginUserDto,
  ResetPasswordDto,
} from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { Logger } from 'winston';

@Injectable()
export class AuthService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly usersService: UsersService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
  ) {}

  // register user for role owner and super admin
  async register(reqDto: CreateUserDto): Promise<AuthResponse> {
    try {
      // check user already exists
      const userExists = await this.usersService.findEmail(reqDto.email);
      if (userExists) {
        throw new HttpException(
          errUserMessage.USER_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        );
      }
      const user = await this.usersService.create(reqDto);
      this.logger.debug(`${successUserMessage.USER_CREATED}: ${user.name}`);

      // Send verification email
      const links = process.env.CLIENT_SITE;
      const baseSite = (links || '').replace(/\/+$/, '');
      this.logger.debug(
        `Sending verification email with token: ${user.verify_code}`,
      );

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
          is_verified: user.is_verified,
        },
      };
    } catch (error) {
      this.logger.debug(errUserMessage.USER_CREATE_FAILED, error.stack);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_CREATE_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // verify account user
  async verifyAccount(verify_code: string): Promise<AuthResponse> {
    try {
      // check verify code is valid
      const user = await this.usersService.findVerifyCode(verify_code);
      if (!user) {
        this.logger.debug(
          `${errUserMessage.USER_VERIFY_CODE_NOT_FOUND}: ${verify_code}`,
        );
        throw new HttpException(
          errUserMessage.USER_VERIFY_CODE_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
      // check user already verified
      if (user.is_verified === true) {
        this.logger.debug(
          `${errUserMessage.USER_ALREADY_VERIFIED}: ${user.name}`,
        );
        throw new HttpException(
          errUserMessage.USER_ALREADY_VERIFIED,
          HttpStatus.BAD_REQUEST,
        );
      }
      // update user
      await this.usersService.update(user.id, {
        name: user.name,
        email: user.email,
        password: user.password,
        is_verified: true,
        verify_code: null,
        exp_verify_at: null,
      });
      this.logger.debug(`${successUserMessage.USER_VERIFIED}: ${user.name}`);
      return {
        message: successUserMessage.USER_VERIFIED,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
        },
      };
    } catch (error) {
      this.logger.debug(errUserMessage.USER_VERIFY_FAILED, error.stack);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_VERIFY_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // resend verify code
  async resendVerifyCode(reqDto: EmailRequest): Promise<AuthResponse> {
    try {
      // check user exists
      const user = await this.usersService.findEmail(reqDto.email);
      if (!user) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${reqDto.email}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
      // check user already verified
      if (user.is_verified === true) {
        this.logger.debug(
          `${errUserMessage.USER_ALREADY_VERIFIED}: ${user.name}`,
        );
        throw new HttpException(
          errUserMessage.USER_ALREADY_VERIFIED,
          HttpStatus.BAD_REQUEST,
        );
      }

      // generate verify code
      const tokens = crypto.randomBytes(40).toString('hex');
      const tokenVerify = `${tokens}-${Date.now()}`;

      // update user
      await this.usersService.update(user.id, {
        ...user,
        verify_code: tokenVerify,
        exp_verify_at: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Send verification email
      const links = process.env.CLIENT_SITE;
      const baseSite = (links || '').replace(/\/+$/, '');
      this.logger.debug(
        `Sending verification email with token: ${user.verify_code}`,
      );

      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: `${baseSite}/verify-account?verify_token=${user.verify_code}`,
        email: user.email,
        subjectMessage: 'Verify your account',
      });

      this.logger.debug(`${successUserMessage.USER_VERIFIED}: ${user.name}`);
      return {
        message: successUserMessage.USER_VERIFIED,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
        },
      };
    } catch (error) {
      this.logger.debug(errUserMessage.USER_VERIFY_FAILED, error.stack);
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new HttpException(
        errUserMessage.USER_VERIFY_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // login user
  async login(
    ip: string,
    device: string,
    reqDto: LoginUserDto,
  ): Promise<AuthResponse & { session_token: string }> {
    try {
      // check user exists
      const user = await this.usersService.findEmail(reqDto.email);
      if (!user) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${reqDto.email}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
      // check user already verified
      if (user.is_verified === false) {
        this.logger.debug(`${errUserMessage.USER_NOT_VERIFIED}: ${user.name}`);
        throw new HttpException(
          errUserMessage.USER_NOT_VERIFIED,
          HttpStatus.BAD_REQUEST,
        );
      }
      // check password
      const isPasswordValid = await bcrypt.compare(
        reqDto.password,
        user.password,
      );
      if (!isPasswordValid) {
        this.logger.debug(
          `${errUserMessage.USER_PASSWORD_NOT_MATCH}: ${user.name}`,
        );
        throw new HttpException(
          errUserMessage.USER_PASSWORD_NOT_MATCH,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generate access token (JWT)
      const accessToken = this.jwtService.sign(
        { sub: user.id },
        { expiresIn: '1h' },
      );

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

      this.logger.debug(`${successUserMessage.USER_LOGGED_IN}: ${user.name}`);

      return {
        message: successUserMessage.USER_LOGGED_IN,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          is_verified: user.is_verified,
          token: accessToken,
        },
        session_token: sessionToken,
      };
    } catch (error) {
      this.logger.debug(errUserMessage.USER_LOGIN_FAILED, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errUserMessage.USER_LOGIN_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // logout user
  async logout(sessionToken: string): Promise<AuthResponse> {
    try {
      // Hash session token for storage
      const tokenHash = crypto
        .createHash('sha256')
        .update(sessionToken)
        .digest('hex');

      // find session by refresh token
      const session = await this.sessionsService.findByRefreshToken(tokenHash);
      if (!session) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${tokenHash}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Delete session
      await this.sessionsService.removeSession(tokenHash);

      this.logger.debug(
        `${successUserMessage.USER_LOGGED_OUT}: ${session.user.name}`,
      );

      return {
        message: successUserMessage.USER_LOGGED_OUT,
      };
    } catch (error) {
      this.logger.debug(errUserMessage.USER_LOGOUT_FAILED, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errUserMessage.USER_LOGOUT_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // refresh token
  async refreshToken(
    token: string,
  ): Promise<AuthResponse & { session_token: string }> {
    try {
      // Hash session token for storage
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // find session by refresh token
      const session = await this.sessionsService.findByRefreshToken(tokenHash);
      if (!session) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${tokenHash}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generate access token (JWT)
      const accessToken = this.jwtService.sign(
        { sub: session.user.id },
        { expiresIn: '1h' },
      );

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

      this.logger.debug(
        `${successUserMessage.USER_REFRESH_TOKEN}: ${session.user.name}`,
      );

      return {
        message: successUserMessage.USER_REFRESH_TOKEN,
        data: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          is_verified: session.user.is_verified,
          token: accessToken,
        },
        session_token: sessionToken,
      };
    } catch (error) {
      this.logger.debug(errUserMessage.USER_REFRESH_TOKEN_FAILED, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errUserMessage.USER_REFRESH_TOKEN_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // forgot password user
  async forgotPassword(reqDto: EmailRequest): Promise<AuthResponse> {
    try {
      const user = await this.usersService.findEmail(reqDto.email);
      if (!user) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${reqDto.email}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
      // check user already verified
      if (user.is_verified === false) {
        this.logger.debug(`${errUserMessage.USER_NOT_VERIFIED}: ${user.name}`);
        throw new HttpException(
          errUserMessage.USER_NOT_VERIFIED,
          HttpStatus.BAD_REQUEST,
        );
      }

      // generate verify token
      const tokens = crypto.randomBytes(40).toString('hex');
      const tokenVerify = `${tokens}-${Date.now()}`;

      // create verify token
      await this.usersService.update(user.id, {
        ...user,
        verify_code: tokenVerify,
        exp_verify_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      // Send reset password
      const links = process.env.CLIENT_SITE;
      const baseSite = (links || '').replace(/\/+$/, '');
      this.logger.debug(
        `Sending reset password email with token: ${user.verify_code}`,
      );

      await this.emailService.sendMail(EmailType.VERIFY_ACCOUNT, {
        links: `${baseSite}/reset-password?verify_token=${user.verify_code}`,
        email: user.email,
        subjectMessage: 'Reset your password',
      });

      this.logger.debug(
        `${successUserMessage.USER_FORGOT_PASSWORD}: ${user.name}`,
      );

      return {
        message: successUserMessage.USER_FORGOT_PASSWORD,
      };
    } catch (error) {
      this.logger.debug(
        errUserMessage.USER_FORGOT_PASSWORD_FAILED,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errUserMessage.USER_FORGOT_PASSWORD_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // reset password user
  async resetPassword(reqDto: ResetPasswordDto): Promise<AuthResponse> {
    try {
      // check user by verify token
      const user = await this.usersService.findVerifyCode(reqDto.token);
      if (!user) {
        this.logger.debug(`${errUserMessage.USER_NOT_FOUND}: ${reqDto.token}`);
        throw new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        );
      }
      // check user already verified
      if (user.is_verified === false) {
        this.logger.debug(`${errUserMessage.USER_NOT_VERIFIED}: ${user.name}`);
        throw new HttpException(
          errUserMessage.USER_NOT_VERIFIED,
          HttpStatus.BAD_REQUEST,
        );
      }

      // hash password
      const hashedPassword = await bcrypt.hash(reqDto.password, 10);

      // update user
      await this.usersService.update(user.id, {
        ...user,
        password: hashedPassword,
        verify_code: null,
        exp_verify_at: null,
      });

      // Send reset password
      const links = process.env.CLIENT_SITE;
      const baseSite = (links || '').replace(/\/+$/, '');
      this.logger.debug(
        `Sending reset password email with token: ${user.verify_code}`,
      );

      await this.emailService.sendMail(EmailType.RESET_PASSWORD, {
        links: `${baseSite}/reset-password?verify_token=${user.verify_code}`,
        email: user.email,
        subjectMessage: 'Success Reset Password',
      });

      this.logger.debug(
        `${successUserMessage.USER_RESET_PASSWORD}: ${user.name}`,
      );

      return {
        message: successUserMessage.USER_RESET_PASSWORD,
      };
    } catch (error) {
      this.logger.debug(
        errUserMessage.USER_RESET_PASSWORD_FAILED,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errUserMessage.USER_FORGOT_PASSWORD_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
