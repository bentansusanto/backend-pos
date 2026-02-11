import { Controller } from '@nestjs/common';
import { ProductVariantsService } from './product-variants.service';

@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly productVariantsService: ProductVariantsService) {}
}
