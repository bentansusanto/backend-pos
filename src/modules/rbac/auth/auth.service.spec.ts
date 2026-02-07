import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EmailService } from '../../../common/emails/emails.service';
import { errUserMessage } from '../../../libs/errors/error_user';
import { successUserMessage } from '../../../libs/success/success_user';
import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import crypto from 'crypto';

// Mock bcryptjs
jest.mock('bcryptjs');

// Mock crypto module - must be before imports
jest.mock('crypto', () => ({
  randomBytes: jest.fn((size: number) =>
    Buffer.from('a'.repeat(size * 2), 'hex'),
  ),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hashedSessionToken123'),
  })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let emailService: jest.Mocked<EmailService>;
  let jwtService: jest.Mocked<JwtService>;
  let sessionsService: jest.Mocked<SessionsService>;
  let logger: jest.Mocked<Logger>;

  const mockUser = {
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedPassword123',
    is_verified: true,
    verify_code: null,
    exp_verify_at: null,
    isActive: true,
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
            info: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findEmail: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findVerifyCode: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendMail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            createSession: jest.fn(),
            findByRefreshToken: jest.fn(),
            removeSession: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    emailService = module.get(EmailService);
    jwtService = module.get(JwtService);
    sessionsService = module.get(SessionsService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };
    const ip = '192.168.1.100';
    const device = 'Chrome 120.0 on macOS 10.15';

    it('should successfully login with valid credentials', async () => {
      // Arrange
      usersService.findEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('accessToken123');
      sessionsService.createSession.mockResolvedValue({
        id: 'session123',
        token: 'hashedSessionToken123',
        ip,
        device,
        user: mockUser,
        expiresAt: new Date(),
        lastActivityAt: new Date(),
        currentBranchId: null,
        currentBranch: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Act
      const result = await service.login(ip, device, loginDto);

      // Assert
      expect(result).toEqual({
        message: successUserMessage.USER_LOGGED_IN,
        data: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          is_verified: mockUser.is_verified,
          token: 'accessToken123',
        },
        session_token: expect.any(String),
      });

      expect(usersService.findEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: mockUser.id },
        { expiresIn: '1h' },
      );
      expect(sessionsService.createSession).toHaveBeenCalledWith(
        mockUser,
        'hashedSessionToken123',
        expect.any(Date),
        ip,
        device,
      );
    });

    it('should throw error when user not found', async () => {
      // Arrange
      usersService.findEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(ip, device, loginDto)).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_NOT_FOUND,
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(usersService.findEmail).toHaveBeenCalledWith(loginDto.email);
    });

    it('should throw error when user is not verified', async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, is_verified: false };
      usersService.findEmail.mockResolvedValue(unverifiedUser as any);

      // Act & Assert
      await expect(service.login(ip, device, loginDto)).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_NOT_VERIFIED,
          HttpStatus.BAD_REQUEST,
        ),
      );
    });

    it('should throw error when password is invalid', async () => {
      // Arrange
      usersService.findEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(ip, device, loginDto)).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_PASSWORD_NOT_MATCH,
          HttpStatus.BAD_REQUEST,
        ),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
    });

    it('should hash session token before storing', async () => {
      // Arrange
      usersService.findEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('accessToken123');
      sessionsService.createSession.mockResolvedValue({} as any);

      // Act
      await service.login(ip, device, loginDto);

      // Assert
      expect(crypto.createHash as jest.Mock).toHaveBeenCalledWith('sha256');
      expect(sessionsService.createSession).toHaveBeenCalledWith(
        mockUser,
        'hashedSessionToken123',
        expect.any(Date),
        ip,
        device,
      );
    });

    it('should set session expiry to 7 days', async () => {
      // Arrange
      usersService.findEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('accessToken123');
      sessionsService.createSession.mockResolvedValue({} as any);

      const now = new Date();
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      // Act
      await service.login(ip, device, loginDto);

      // Assert
      const expectedExpiry = new Date(now);
      expectedExpiry.setDate(expectedExpiry.getDate() + 7);

      expect(sessionsService.createSession).toHaveBeenCalledWith(
        mockUser,
        expect.any(String),
        expect.any(Date),
        ip,
        device,
      );

      // Verify the expiry date is approximately 7 days from now
      const actualExpiry = (sessionsService.createSession as jest.Mock).mock
        .calls[0][2];
      const diffInDays =
        (actualExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffInDays)).toBe(7);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      usersService.findEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('accessToken123');
      sessionsService.createSession.mockRejectedValue(
        new Error('Database error'),
      );

      // Act & Assert
      await expect(service.login(ip, device, loginDto)).rejects.toThrow(
        new HttpException(
          errUserMessage.USER_LOGIN_FAILED,
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
