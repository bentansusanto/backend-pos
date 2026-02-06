import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RolesModule } from './modules/rbac/roles/roles.module';
import { SessionsModule } from './modules/rbac/sessions/sessions.module';
import { UsersModule } from './modules/rbac/users/users.module';
import { SeederModule } from './modules/seeder/seeder.module';
import { AuthModule } from './modules/rbac/auth/auth.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    RolesModule,
    BranchesModule,
    SeederModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
