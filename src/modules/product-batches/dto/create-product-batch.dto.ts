import { PartialType } from '@nestjs/mapped-types';

export class CreateProductBatchDto {}

export class UpdateProductBatchDto extends PartialType(CreateProductBatchDto) {}
