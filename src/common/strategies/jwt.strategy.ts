import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'temporary_development_secret_do_not_use_in_prod',
    });
    
    if (!(configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET)) {
      console.error('[CRITICAL] JWT_SECRET is not defined! Using dangerous fallback secret.');
    }
  }

  async validate(payload: any) {
    // Load user with all RBAC relations
    const user = await this.userRepository.findOne({
      where: { id: payload.sub || payload.userId },
      relations: {
        userBranches: {
          branch: true,
        },
        role: {
          rolePermissions: {
            permission: true,
          },
        },
      },
    });

    return user;
  }
}
