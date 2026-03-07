import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CurrentBranchId } from 'src/common/decorator/branch.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { User } from 'src/modules/rbac/users/entities/user.entity';
import { WebResponse } from 'src/types/response/index.type';
import { DiscountsService } from './discounts.service';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
} from './dto/create-discount.dto';

@UseGuards(JwtAuthGuard)
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('create')
  async create(
    @Body() createDiscountDto: CreateDiscountDto,
    @CurrentUser() currentUser: User,
    @CurrentBranchId() branchId?: string,
    @Req() req?: Request,
  ): Promise<WebResponse> {
    const result = await this.discountsService.create(
      createDiscountDto,
      currentUser?.id,
      branchId,
      req?.ip,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find-all')
  async findAll(
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.discountsService.findAll(branchId);
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('branch_id') queryBranchId?: string,
    @CurrentBranchId() headerBranchId?: string,
  ): Promise<WebResponse> {
    const branchId = queryBranchId || headerBranchId;
    const result = await this.discountsService.findOne(id, branchId);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateDiscountDto: UpdateDiscountDto,
    @CurrentUser() currentUser: User,
    @CurrentBranchId() branchId?: string,
    @Req() req?: Request,
  ): Promise<WebResponse> {
    const result = await this.discountsService.update(
      id,
      updateDiscountDto,
      currentUser?.id,
      branchId,
      req?.ip,
    );
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @CurrentBranchId() branchId?: string,
    @Req() req?: Request,
  ): Promise<WebResponse> {
    const result = await this.discountsService.remove(
      id,
      currentUser?.id,
      branchId,
      req?.ip,
    );
    return {
      message: result.message,
    };
  }
}
