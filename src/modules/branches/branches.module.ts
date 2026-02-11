import { Module } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from './entities/branch.entity';
import { UsersModule } from '../rbac/users/users.module';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
  imports: [TypeOrmModule.forFeature([Branch]), UsersModule],
  exports: [BranchesService],
})
export class BranchesModule {}
