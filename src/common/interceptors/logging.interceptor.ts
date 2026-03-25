import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const delay = Date.now() - now;
          this.logger.log(
            'info',
            `${method} ${url} ${delay}ms`,
            {
              context: 'LoggingInterceptor',
              user: request.user?.id || 'anonymous',
            }
          );
        },
        error: (error) => {
          const delay = Date.now() - now;
          this.logger.error(
            `${method} ${url} ${delay}ms - Error: ${error.message}`,
            {
              context: 'LoggingInterceptor',
              stack: error.stack,
            }
          );
        },
      }),
    );
  }
}
