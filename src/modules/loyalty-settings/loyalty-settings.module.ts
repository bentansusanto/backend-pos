import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltySetting } from './entities/loyalty-setting.entity';
import { LoyaltySettingsService } from './loyalty-settings.service';
import { LoyaltySettingsController } from './loyalty-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltySetting])],
  controllers: [LoyaltySettingsController],
  providers: [LoyaltySettingsService],
  exports: [LoyaltySettingsService],
})
export class LoyaltySettingsModule {}
