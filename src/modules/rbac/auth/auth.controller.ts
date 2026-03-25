import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Get,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from 'src/common/decorator/public.decorator';
import { parseDeviceInfo } from 'src/libs/utils/device-parser.util';
import { WebResponse } from 'src/types/response/index.type';
import {
  CreateUserDto,
  EmailRequest,
  LoginUserDto,
  ResetPasswordDto,
} from '../users/dto/create-user.dto';
import { AuthService } from './auth.service';
import { generateCsrfToken } from 'src/common/config/csrf.config';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  
  // get csrf token
  @Public()
  @Get('csrf-token')
  async getCsrfToken(@Req() req: Request, @Res() res: Response) {
    const token = generateCsrfToken(req, res);
    res.setHeader('Cache-Control', 'no-cache');
    return res.json({ csrfToken: token });
  }

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
  ): Promise<any> {
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
    res.cookie('session_pos', result.data.session_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    });

    // Set access token in Authorization header
    res.setHeader('Authorization', `Bearer ${result.data.token}`);

    // Return response (without session_token in body)
    res.status(HttpStatus.OK).json({
      message: result.message,
      data: result.data,
    });
  }

  // logout user
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { user?: any },
    @Body() body: { session_token?: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse> {
    const sessionToken = req.cookies['session_pos'] || body?.session_token;
    const result = await this.authService.logout(sessionToken, req.user);
    res.clearCookie('session_pos', { path: '/' });
    return {
      message: result.message,
    };
  }

  // refresh token
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse> {
    const sessionToken = req.cookies['session_pos'];
    const result = await this.authService.refreshToken(sessionToken);
    res.cookie('session_pos', result.data.session_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
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
  async forgotPassword(@Body() reqDto: EmailRequest): Promise<WebResponse> {
    const result = await this.authService.forgotPassword(reqDto);
    return {
      message: result.message,
    };
  }

  // reset password
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() reqDto: ResetPasswordDto): Promise<WebResponse> {
    const result = await this.authService.resetPassword(reqDto);
    return {
      message: result.message,
    };
  }
}
