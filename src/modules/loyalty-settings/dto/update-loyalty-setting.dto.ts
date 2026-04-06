import { PartialType } from '@nestjs/mapped-types';
import { CreateLoyaltySettingDto } from './create-loyalty-setting.dto';

export class UpdateLoyaltySettingDto extends PartialType(CreateLoyaltySettingDto) {}
