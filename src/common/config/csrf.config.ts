import { doubleCsrf } from 'csrf-csrf';
import { Request } from 'express';

export { generateCsrfToken, doubleCsrfProtection };

const {
  invalidCsrfTokenError: _,
  generateCsrfToken,
  validateRequest,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: (req: Request) => process.env.SESSION_SECRET || 'a_very_long_and_secure_csrf_secret_32_chars',
  getSessionIdentifier: () => 'pos_app_session_id', // Use a stable ID to avoid session-binding mismatches in dev/local
  cookieName: 'pos_csrf_secret',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'none',
    path: '/',
    secure: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) => req.headers['x-csrf-token'] as string,
});
