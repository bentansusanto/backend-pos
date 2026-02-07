import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { successUserMessage } from 'src/libs/success/success_user';
import { LoginUserDto } from '../users/dto/create-user.dto';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockRequest = {
    headers: {
      'x-forwarded-for': '192.168.1.100',
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockResponse = {
    cookie: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;

  const mockLoginResult = {
    message: successUserMessage.USER_LOGGED_IN,
    data: {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
      is_verified: true,
      token: 'accessToken123',
    },
    session_token: 'sessionToken123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            register: jest.fn(),
            verifyAccount: jest.fn(),
            resendVerifyCode: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginUserDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login and set cookies and headers', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await controller.login(
        loginDto,
        mockRequest,
        mockResponse,
      );

      // Assert
      expect(result).toEqual({
        message: successUserMessage.USER_LOGGED_IN,
        data: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          is_verified: true,
          token: 'accessToken123',
        },
      });

      // Verify session token cookie was set
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'session_pos',
        'sessionToken123',
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
      );

      // Verify Authorization header was set
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Authorization',
        'Bearer accessToken123',
      );
    });

    it('should extract IP from x-forwarded-for header', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, mockRequest, mockResponse);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        '192.168.1.100',
        expect.any(String),
        loginDto,
      );
    });

    it('should fallback to req.ip when x-forwarded-for is not present', async () => {
      // Arrange
      const requestWithoutForwardedFor = {
        headers: {
          'user-agent': 'Chrome/120.0',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(
        loginDto,
        requestWithoutForwardedFor,
        mockResponse,
      );

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        '127.0.0.1',
        expect.any(String),
        loginDto,
      );
    });

    it('should use "unknown" when no IP is available', async () => {
      // Arrange
      const requestWithoutIP = {
        headers: {
          'user-agent': 'Chrome/120.0',
        },
      } as unknown as Request;
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, requestWithoutIP, mockResponse);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        'unknown',
        expect.any(String),
        loginDto,
      );
    });

    it('should parse device info from user-agent', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, mockRequest, mockResponse);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Chrome'),
        loginDto,
      );
    });

    it('should handle missing user-agent gracefully', async () => {
      // Arrange
      const requestWithoutUserAgent = {
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, requestWithoutUserAgent, mockResponse);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(
        expect.any(String),
        'Unknown Device',
        loginDto,
      );
    });

    it('should not include session_token in response body', async () => {
      // Arrange
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      const result = await controller.login(
        loginDto,
        mockRequest,
        mockResponse,
      );

      // Assert
      expect(result).not.toHaveProperty('session_token');
      expect(result.data).toHaveProperty('token'); // Access token should be in response
    });

    it('should set cookie with correct security flags in production', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, mockRequest, mockResponse);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'session_pos',
        'sessionToken123',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should set cookie with secure=false in development', async () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, mockRequest, mockResponse);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'session_pos',
        'sessionToken123',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'strict',
        }),
      );

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should propagate errors from AuthService', async () => {
      // Arrange
      const error = new Error('Login failed');
      authService.login.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.login(loginDto, mockRequest, mockResponse),
      ).rejects.toThrow(error);
    });

    it('should handle x-forwarded-for with multiple IPs', async () => {
      // Arrange
      const requestWithMultipleIPs = {
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1, 172.16.0.1',
          'user-agent': 'Chrome/120.0',
        },
        ip: '127.0.0.1',
      } as unknown as Request;
      authService.login.mockResolvedValue(mockLoginResult);

      // Act
      await controller.login(loginDto, requestWithMultipleIPs, mockResponse);

      // Assert
      // Should use the first IP in the chain
      expect(authService.login).toHaveBeenCalledWith(
        '192.168.1.100',
        expect.any(String),
        loginDto,
      );
    });
  });
});
