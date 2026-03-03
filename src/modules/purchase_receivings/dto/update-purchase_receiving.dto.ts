import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseReceivingDto } from './create-purchase_receiving.dto';

export class UpdatePurchaseReceivingDto extends PartialType(CreatePurchaseReceivingDto) {}
