import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';
import { ProductVariant } from '../entities/product-variant.entity';
import { ProductsModule } from '../products.module';
import { ProductVariantsController } from './product-variants.controller';
import { ProductVariantsService } from './product-variants.service';

@Module({
  controllers: [ProductVariantsController],
  providers: [ProductVariantsService],
  imports: [
    TypeOrmModule.forFeature([ProductVariant]),
    ProductsModule,
    CloudinaryModule,
  ],
  exports: [ProductVariantsService],
})
export class ProductVariantsModule {}
