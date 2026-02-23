import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { LoginUserDto } from '../users/dto/create-user.dto';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockUser = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    token: 'jwt-token',
    session_token: 'session-token',
  };

  const mockAuthResponse = {
    message: 'Success',
    data: mockUser,
  };

  const mockAuthService = {
    register: jest.fn().mockResolvedValue(mockAuthResponse),
    login: jest.fn().mockResolvedValue(mockAuthResponse),
    logout: jest.fn().mockResolvedValue({ message: 'Logged out' }),
    verifyAccount: jest.fn().mockResolvedValue(mockAuthResponse),
    resendVerifyCode: jest.fn().mockResolvedValue({ message: 'Code resent' }),
    refreshToken: jest.fn().mockResolvedValue(mockAuthResponse),
    forgotPassword: jest.fn().mockResolvedValue({ message: 'Email sent' }),
    resetPassword: jest.fn().mockResolvedValue({ message: 'Password reset' }),
  };

  const mockRequest = {
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'Test Agent',
    },
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockResponse = {
    cookie: jest.fn(),
    setHeader: jest.fn(),
    clearCookie: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login and set cookies', async () => {
      const loginDto: LoginUserDto = {
        email: 'test@example.com',
        password: 'password',
      };

      await controller.login(loginDto, mockRequest, mockResponse);

      expect(service.login).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.setHeader).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('logout', () => {
    it('should logout and clear cookies', async () => {
      const result = await controller.logout(
        'token',
        { session_token: 'session-token' },
        mockResponse,
      );

      expect(service.logout).toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('session_pos');
      expect(result).toEqual({ message: 'Logged out' });
    });
  });
});
