import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLogsModule } from '../user_logs/user_logs.module';
import { Tax } from './entities/tax.entity';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tax]), UserLogsModule],
  controllers: [TaxController],
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
