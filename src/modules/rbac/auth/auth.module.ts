import { Module } from '@nestjs/common';
import { CommonModule } from 'src/common/common.module';
import { EmailService } from 'src/common/emails/emails.service';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, EmailService],
  imports: [SessionsModule, UsersModule, CommonModule],
})
export class AuthModule {}
