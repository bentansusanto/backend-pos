import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { LoyaltySettingsService } from './loyalty-settings.service';
import { CreateLoyaltySettingDto } from './dto/create-loyalty-setting.dto';
import { UpdateLoyaltySettingDto } from './dto/update-loyalty-setting.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorator/permissions.decorator';

@Controller('loyalty-settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoyaltySettingsController {
  constructor(private readonly loyaltySettingsService: LoyaltySettingsService) {}

  @Post()
  @Permissions('loyalti:manage')
  create(@Body() createLoyaltySettingDto: CreateLoyaltySettingDto) {
    return this.loyaltySettingsService.create(createLoyaltySettingDto);
  }

  @Get()
  @Permissions('loyalti:read')
  findAll() {
    return this.loyaltySettingsService.getAllSettings();
  }

  @Get('current')
  getCurrent(@Query('branchId') branchId?: string) {
    return this.loyaltySettingsService.getSettings(branchId);
  }

  @Patch(':id')
  @Permissions('loyalti:manage')
  update(
    @Param('id') id: string,
    @Body() updateLoyaltySettingDto: UpdateLoyaltySettingDto,
  ) {
    return this.loyaltySettingsService.update(id, updateLoyaltySettingDto);
  }

  @Delete(':id')
  @Permissions('loyalti:manage')
  remove(@Param('id') id: string) {
    return this.loyaltySettingsService.remove(id);
  }
}
