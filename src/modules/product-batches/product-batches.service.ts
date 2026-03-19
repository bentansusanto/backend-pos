import { Injectable } from '@nestjs/common';
import { CreateProductBatchDto, UpdateProductBatchDto } from './dto/create-product-batch.dto';

@Injectable()
export class ProductBatchesService {
  create(createProductBatchDto: CreateProductBatchDto) {
    return 'This action adds a new productBatch';
  }

  findAll() {
    return `This action returns all productBatches`;
  }

  findOne(id: string) {
    return `This action returns a #${id} productBatch`;
  }

  update(id: string, updateProductBatchDto: UpdateProductBatchDto) {
    return `This action updates a #${id} productBatch`;
  }

  remove(id: string) {
    return `This action removes a #${id} productBatch`;
  }
}
