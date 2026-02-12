import { PartialType } from '@nestjs/mapped-types';
import { CreateProductBatchDto } from './create-product-batch.dto';

export class UpdateProductBatchDto extends PartialType(CreateProductBatchDto) {}
