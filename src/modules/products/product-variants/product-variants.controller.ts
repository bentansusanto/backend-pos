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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { WebResponse } from 'src/types/response/index.type';
import { CreateProductVariantDto } from '../dto/create-product-variant.dto';
import { ProductVariantsService } from './product-variants.service';

@UseGuards(JwtAuthGuard)
@Controller('variants')
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('thumbnail'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createProductVariantDto: CreateProductVariantDto,
    @CurrentUser() currentUser: User,
    @UploadedFile() thumbnailFile: Express.Multer.File,
  ): Promise<WebResponse> {
    const result = await this.productVariantsService.create(
      createProductVariantDto,
      thumbnailFile,
      currentUser?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('thumbnail'))
  async update(
    @Param('id') id: string,
    @Body() updateProductVariantDto: CreateProductVariantDto,
    @CurrentUser() currentUser: User,
    @UploadedFile() thumbnailFile?: Express.Multer.File,
  ): Promise<WebResponse> {
    const result = await this.productVariantsService.update(
      id,
      updateProductVariantDto,
      thumbnailFile,
      currentUser?.id,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.productVariantsService.delete(
      id,
      currentUser?.id,
    );
    return {
      message: result.message,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.productVariantsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
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
