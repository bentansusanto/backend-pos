import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesModule } from './categories/categories.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    CategoriesModule,
    ProductVariantsModule,
    TypeOrmModule.forFeature([Product]),
  ],
})
export class ProductsModule {}
