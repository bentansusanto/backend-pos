import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { WebResponse } from 'src/types/response/index.type';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('create')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
  )
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ): Promise<WebResponse> {
    const result = await this.productsService.create(
      createProductDto,
      files?.thumbnail?.[0],
      files?.images,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // get all products
  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.productsService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  // get product by id
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.productsService.findOne(id, branchId);
    return {
      message: result.message,
      data: result.data,
    };
  }

  // update product by id
  @Put('update/:id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'thumbnail', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ): Promise<WebResponse> {
    const result = await this.productsService.update(
      id,
      updateProductDto,
      files?.thumbnail?.[0],
      files?.images,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  // delete product by id
  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productsService.remove(id);
    return {
      message: result.message,
    };
  }
}
