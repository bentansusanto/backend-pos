import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from 'src/common/emails/emails.service';
import { SessionsModule } from '../sessions/sessions.module';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Session } from '../sessions/entities/session.entity';
import { JwtService } from '@nestjs/jwt';
import { SessionsService } from '../sessions/sessions.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    UsersService,
    EmailService,
    JwtService,
    SessionsService,
  ],
  imports: [TypeOrmModule.forFeature([User, Session]), SessionsModule],
})
export class AuthModule {}
