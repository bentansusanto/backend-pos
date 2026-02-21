import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permissions } from 'src/common/decorator/permissions.decorator';
import { Roles } from 'src/common/decorator/roles.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@Controller('variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  // create product variant
  @Roles('admin', 'owner')
  @Permissions('variants:create')
  @Post('create')
  @UseInterceptors(FileInterceptor('thumbnail'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductVariantDto: CreateProductVariantDto,
    @UploadedFile() thumbnailFile: Express.Multer.File,
  ): Promise<WebResponse> {
    const result = await this.productVariantsService.create(
      createProductVariantDto,
      thumbnailFile,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update product variant
  @Roles('admin', 'owner')
  @Permissions('variants:update')
  @Post('update/:id')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async update(
    @Param('id') id: string,
    @Body() updateProductVariantDto: CreateProductVariantDto,
    @UploadedFile() thumbnailFile?: Express.Multer.File,
  ): Promise<WebResponse> {
    const result = await this.productVariantsService.update(
      id,
      updateProductVariantDto,
      thumbnailFile,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // delete product variant
  @Roles('admin', 'owner')
  @Permissions('variants:delete')
  @Post('delete/:id')
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productVariantsService.delete(id);
    return {
      message: result.message,
    };
  }

  // get product variant by id
  @Permissions('variants:read')
  @Get('get/:id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productVariantsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all product variant
  @Permissions('variants:read')
  @Get('find-all')
  async findAll(): Promise<WebResponse> {
    const result = await this.productVariantsService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }
}
