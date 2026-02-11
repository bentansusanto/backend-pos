import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesModule } from './categories/categories.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [CategoriesModule, ProductVariantsModule],
})
export class ProductsModule {}
