import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';
import { WebResponse } from 'src/types/response/index.type';

@Controller('product-variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  // create product variant
  @Roles('admin', 'owner')
  @Permissions('create:product-variant')
  @Post('create')
  async screate(@Body() createProductVariantDto: CreateProductVariantDto):Promise<WebResponse> {
    const result = await this.productVariantsService.create(createProductVariantDto);
    return{
      message: result.message,
      data: result.data
    }
  }

  // update product variant
  @Roles('admin', 'owner')
  @Permissions('update:product-variant')
  @Post('update/:id')
  async update(@Param('id') id: string, @Body() updateProductVariantDto: CreateProductVariantDto):Promise<WebResponse> {
    const result = await this.productVariantsService.update(id, updateProductVariantDto);
    return{
      message: result.message,
      data: result.data
    }
  }

  // delete product variant
  @Roles('admin', 'owner')
  @Permissions('delete:product-variant')
  @Post('delete/:id')
  async delete(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.productVariantsService.delete(id);
    return{
      message: result.message,
    }
  }

  // get product variant by id
  @Permissions('read:product-variant')
  @Get('get/:id')
  async findOne(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.productVariantsService.findOne(id);
    return{
      message: result.message,
      data: result.data
    }
  }

  // get all product variant
  @Permissions('read:product-variant')
  @Get('find-all')
  async findAll():Promise<WebResponse> {
    const result = await this.productVariantsService.findAll();
    return{
      message: result.message,
      data: result.datas
    }
  }

}
