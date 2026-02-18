import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductsModule } from '../products.module';
import { ProductVariantsController } from './product-variants.controller';
import { ProductVariantsService } from './product-variants.service';

@Module({
  controllers: [ProductVariantsController],
  providers: [ProductVariantsService],
  imports: [TypeOrmModule.forFeature([ProductVariant]), ProductsModule],
  exports: [ProductVariantsService],
})
export class ProductVariantsModule {}
