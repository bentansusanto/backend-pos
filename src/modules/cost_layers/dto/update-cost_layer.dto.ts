import { PartialType } from '@nestjs/mapped-types';
import { CreateCostLayerDto } from './create-cost_layer.dto';

export class UpdateCostLayerDto extends PartialType(CreateCostLayerDto) {}
