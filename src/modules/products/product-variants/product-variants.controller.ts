import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@Controller('variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  // create product variant
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
  @Post('delete/:id')
  async delete(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productVariantsService.delete(id);
    return {
      message: result.message,
    };
  }

  // get product variant by id
  @Get('get/:id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productVariantsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all product variant
  @Get('find-all')
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.productVariantsService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }
}
