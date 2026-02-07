import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { parseDeviceInfo } from 'src/libs/utils/device-parser.util';
import { WebResponse } from 'src/types/response/index.type';
import {
  CreateUserDto,
  EmailRequest,
  LoginUserDto,
  ResetPasswordDto,
} from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { CurrentToken } from 'src/common/decorator/current-user.decorator';
import { Public } from 'src/common/decorator/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // register
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: CreateUserDto): Promise<WebResponse> {
    const result = await this.authService.register(registerDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // verify account
  @Public()
  @Post('verify-account')
  @HttpCode(HttpStatus.OK)
  async verifyAccount(
    @Query('verify_token') verifyToken: string,
  ): Promise<WebResponse> {
    const result = await this.authService.verifyAccount(verifyToken);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // resend verify account
  @Public()
  @Post('resend-verify-account')
  @HttpCode(HttpStatus.OK)
  async resendVerifyAccount(
    @Body() reqDto: EmailRequest,
  ): Promise<WebResponse> {
    const result = await this.authService.resendVerifyCode(reqDto);
    return {
      message: result.message,
    };
  }

  // login user
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginUserDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse> {
    // Extract IP address
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'unknown';

    // Extract device info from User-Agent
    const userAgent = req.headers['user-agent'];
    const device = parseDeviceInfo(userAgent);

    // Call login service
    const result = await this.authService.login(ip, device, loginDto);

    // Set session token in cookie
    res.cookie('session_pos', result.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Set access token in Authorization header
    res.setHeader('Authorization', `Bearer ${result.data.token}`);

    // Return response (without session_token in body)
    return {
      message: result.message,
      data: result.data,
    };
  }

  // logout user
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentToken() token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse> {
    const result = await this.authService.logout(token);
    res.clearCookie('session_pos');
    return {
      message: result.message,
    };
  }

  // refresh token
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @CurrentToken() token: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse> {
    const result = await this.authService.refreshToken(token);
    res.cookie('session_pos', result.session_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });
    res.setHeader('Authorization', `Bearer ${result.data.token}`);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // forgot password
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() reqDto: EmailRequest,
  ): Promise<WebResponse> {
    const result = await this.authService.forgotPassword(reqDto);
    return {
      message: result.message,
    };
  }

  // reset password
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() reqDto: ResetPasswordDto,
  ): Promise<WebResponse> {
    const result = await this.authService.resetPassword(reqDto);
    return {
      message: result.message,
    };
  }
}
