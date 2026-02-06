import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { SessionsService } from 'src/modules/rbac/sessions/sessions.service';

@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private sessionService: SessionsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Try to get user from access token (Authorization header)
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.substring(7);

        try {
          // Verify access token
          const payload = this.jwtService.verify(accessToken);

          // Try to get session from refresh token cookie
          const refreshToken = req.cookies?.sessionToken;
          if (refreshToken) {
            // Hash refresh token
            const tokenHash = crypto
              .createHash('sha256')
              .update(refreshToken)
              .digest('hex');

            // Find and validate session
            const session =
              await this.sessionService.findValidSession(tokenHash);

            if (session && session.user.id === payload.sub) {
              // Attach user and session to request
              (req as any).user = session.user;
              (req as any).session = session;

              // Update last activity
              await this.sessionService.updateLastActivity(session.id);
              return next();
            }
          }
       } catch (error) {
          // Access token invalid or expired
          // Fall back to refresh token authentication
        }
      }

      // Fallback: Try to authenticate with refresh token only
      await this.authenticateWithRefreshToken(req);
    } catch (error) {
      // Continue without user context
    }

    next();
  }

  /**
   * Authenticate user using refresh token from cookie
   */
  private async authenticateWithRefreshToken(req: Request) {
    try {
      const refreshToken = req.cookies?.sessionToken;

      if (!refreshToken) {
        return;
      }

      // Hash refresh token
      const tokenHash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Find and validate session (includes user with all relations)
      const session = await this.sessionService.findValidSession(tokenHash);

      if (session) {
        // Attach user and session to request
        (req as any).user = session.user;
        (req as any).session = session;

        // Update last activity
        await this.sessionService.updateLastActivity(session.id);
      }
    } catch (error) {
      // Invalid refresh token, continue without user
    }
  }
}
