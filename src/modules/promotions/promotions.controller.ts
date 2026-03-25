import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { User } from '../rbac/users/entities/user.entity';
import { WebResponse } from '../../types/response/index.type';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/create-promotion.dto';
import { PromotionsService } from './promotions.service';

@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPromotionDto: CreatePromotionDto,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.promotionsService.create(createPromotionDto, currentUser?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('branch_id') branchId?: string,
  ): Promise<WebResponse> {
    const result = await this.promotionsService.findAll(status, branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.promotionsService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.promotionsService.update(id, updatePromotionDto, currentUser?.id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
  ): Promise<WebResponse> {
    const result = await this.promotionsService.remove(id, currentUser?.id);
    return {
      message: result.message,
    };
  }
}
