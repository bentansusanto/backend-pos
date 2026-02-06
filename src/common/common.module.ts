import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { Branch } from 'src/modules/branches/entities/branch.entity';
import { UserBranch } from 'src/modules/branches/entities/user-branch.entity';
import { Permission } from 'src/modules/rbac/roles/entities/permission.entity';
import { Role } from 'src/modules/rbac/roles/entities/role.entity';
import { RolePermission } from 'src/modules/rbac/roles/entities/role_permission.entity';
import { Session } from 'src/modules/rbac/sessions/entities/session.entity';
import { SessionsModule } from 'src/modules/rbac/sessions/sessions.module';
import { Profile } from 'src/modules/rbac/users/entities/profile.entity';
import { UserRole } from 'src/modules/rbac/users/entities/user-role.entity';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import * as winston from 'winston';
import { ErrorsService } from './errors/errors.service';
import { JwtAuthGuard, PermissionsGuard, RolesGuard } from './guards';
import { RbacService } from './services/rbac.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            winston.format.simple(),
          ),
        }),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        // synchronize: configService.get<string>('NODE_ENV') === 'production',
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        charset: 'utf8mb4',
        ssl: false,
        extra: {
          connectionLimit: 10,
          ssl: false,
        },
        connectTimeout: 60000,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      Role,
      RolePermission,
      Permission,
      Branch,
      UserRole,
      UserBranch,
      Session,
      Profile,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '1h',
          },
        } as any;
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    SessionsModule, // Import SessionsModule for UserContextMiddleware
  ],
  providers: [
    ErrorsService,
    RbacService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    JwtStrategy,
  ],
  exports: [
    TypeOrmModule,
    ThrottlerModule,
    WinstonModule,
    JwtModule,
    RbacService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class CommonModule {}
