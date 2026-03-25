import {
  ClassSerializerInterceptor,
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { ClassTransformOptions } from 'class-transformer';

@Injectable()
export class ProductSerializerInterceptor extends ClassSerializerInterceptor {
  getContextOptions(context: ExecutionContext): ClassTransformOptions | undefined {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Default options
    const options: ClassTransformOptions = {
        groups: []
    };

    // If user is Admin, add 'admin' group to see cost_price
    if (user && user.role && user.role.code && user.role.code.includes('ADMIN')) {
      options.groups = ['admin'];
    }

    return options;
  }
}
