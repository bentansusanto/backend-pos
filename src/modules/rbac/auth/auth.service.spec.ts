import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { EmailService } from 'src/common/emails/emails.service';
import { errUserMessage } from 'src/libs/errors/error_user';
import { successUserMessage } from 'src/libs/success/success_user';
import { SessionsService } from '../sessions/sessions.service';
import { CreateUserDto, LoginUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

jest.mock('bcryptjs');
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('random-token'),
  }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hashed-token'),
  }),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let emailService: EmailService;
  let jwtService: JwtService;
  let sessionsService: SessionsService;
  let logger: any;

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    is_verified: true,
    verify_code: null,
    role: { code: 'owner', self_register: true },
  };

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  const mockUsersService = {
    findEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findVerifyCode: jest.fn(),
    findRole: jest.fn(),
    countByRole: jest.fn(),
  };

  const mockEmailService = {
    sendMail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockSessionsService = {
    createSession: jest.fn(),
    findByRefreshToken: jest.fn(),
    removeSession: jest.fn(),
  };

  beforeEach(async () => {
    logger = mockLogger;
    usersService = mockUsersService as any;
    emailService = mockEmailService as any;
    jwtService = mockJwtService as any;
    sessionsService = mockSessionsService as any;

    service = new AuthService(
      logger,
      usersService,
      emailService,
      jwtService,
      sessionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a user successfully', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
      };

      mockUsersService.findRole.mockResolvedValue({
        code: 'owner',
        self_register: true,
      });
      mockUsersService.countByRole.mockResolvedValue(0);
      mockUsersService.findEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        verify_code: 'token',
      });
      mockEmailService.sendMail.mockResolvedValue(undefined);

      const result = await service.register(createUserDto);

      expect(result).toEqual({
        message: successUserMessage.USER_CREATED,
        data: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role.code,
          is_verified: mockUser.is_verified,
        },
      });
      expect(usersService.findRole).toHaveBeenCalledWith('owner');
      expect(usersService.countByRole).toHaveBeenCalledWith('owner');
      expect(usersService.findEmail).toHaveBeenCalledWith(createUserDto.email);
      expect(usersService.create).toHaveBeenCalled();
      expect(emailService.sendMail).toHaveBeenCalled();
    });

    it('should throw error if user already exists', async () => {
      const createUserDto: CreateUserDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password',
      };

      mockUsersService.findRole.mockResolvedValue({
        code: 'owner',
        self_register: true,
      });
      mockUsersService.countByRole.mockResolvedValue(0);
      mockUsersService.findEmail.mockResolvedValue(mockUser);

      await expect(service.register(createUserDto)).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('login', () => {
    it('should login a user successfully', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password',
      };

      mockUsersService.findEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('access-token');
      mockSessionsService.createSession.mockResolvedValue(undefined);

      const result = await service.login('127.0.0.1', 'device', loginDto);

      expect(result).toEqual({
        message: successUserMessage.USER_LOGGED_IN,
        data: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role.code,
          is_verified: mockUser.is_verified,
          token: 'access-token',
          session_token: 'random-token',
        },
      });
      expect(usersService.findEmail).toHaveBeenCalledWith(loginDto.email);
      expect(sessionsService.createSession).toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password',
      };

      mockUsersService.findEmail.mockResolvedValue(null);

      await expect(
        service.login('127.0.0.1', 'device', loginDto),
      ).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });

  describe('logout', () => {
    it('should logout a user successfully', async () => {
      const refreshToken = 'refresh-token';
      mockSessionsService.findByRefreshToken.mockResolvedValue({
        id: 'session-id',
        user: mockUser,
      });
      mockSessionsService.removeSession.mockResolvedValue(undefined);

      const result = await service.logout(refreshToken);

      expect(result).toEqual({
        message: successUserMessage.USER_LOGGED_OUT,
      });
      expect(sessionsService.findByRefreshToken).toHaveBeenCalledWith(
        'hashed-token',
      );
      expect(sessionsService.removeSession).toHaveBeenCalledWith(
        'hashed-token',
      );
    });

    it('should throw error if session not found', async () => {
      const refreshToken = 'refresh-token';
      mockSessionsService.findByRefreshToken.mockResolvedValue(null);

      await expect(service.logout(refreshToken)).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });
  });
});
