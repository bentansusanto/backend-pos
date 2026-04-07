import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoyaltySetting } from './entities/loyalty-setting.entity';
import { CreateLoyaltySettingDto } from './dto/create-loyalty-setting.dto';
import { UpdateLoyaltySettingDto } from './dto/update-loyalty-setting.dto';

@Injectable()
export class LoyaltySettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(LoyaltySetting)
    private readonly loyaltySettingRepository: Repository<LoyaltySetting>,
  ) {}

  async onModuleInit() {
    // Ensure default global setting exists
    const globalSetting = await this.loyaltySettingRepository.findOne({
      where: { branchId: null },
    });

    if (!globalSetting) {
      const newSetting = this.loyaltySettingRepository.create({
        branchId: null,
        minimumSpend: 0,
        amountPerPoint: 10, // Default to $10 = 1 Point initially
        pointsEarned: 1,
        isActive: true,
      });
      await this.loyaltySettingRepository.save(newSetting);
    }
  }

  async getSettings(branchId?: string): Promise<LoyaltySetting> {
    if (branchId) {
      const branchSetting = await this.loyaltySettingRepository.findOne({
        where: { branchId, isActive: true },
      });
      if (branchSetting) return branchSetting;
    }

    // Fallback to global
    return await this.loyaltySettingRepository.findOne({
      where: { branchId: null },
    });
  }

  async getAllSettings(): Promise<LoyaltySetting[]> {
    return await this.loyaltySettingRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(createDto: CreateLoyaltySettingDto): Promise<LoyaltySetting> {
    const setting = this.loyaltySettingRepository.create(createDto);
    return await this.loyaltySettingRepository.save(setting);
  }

  async update(id: string, updateDto: UpdateLoyaltySettingDto): Promise<LoyaltySetting> {
    await this.loyaltySettingRepository.update(id, updateDto);
    return await this.loyaltySettingRepository.findOne({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.loyaltySettingRepository.delete(id);
  }
}
