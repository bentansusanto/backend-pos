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
} from '@nestjs/common';
import { WebResponse } from 'src/types/response/index.type';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createBranchDto: CreateBranchDto): Promise<WebResponse> {
    const result = await this.branchesService.create(createBranchDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Get('find-all')
  async findAll(): Promise<WebResponse> {
    const result = await this.branchesService.findAll();
    return {
      message: result.message,
      data: result.datas,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.branchesService.findOne(id);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ): Promise<WebResponse> {
    const result = await this.branchesService.update(id, updateBranchDto);
    return {
      message: result.message,
      data: result.data,
    };
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.branchesService.remove(id);
    return {
      message: result.message,
    };
  }

  @Post(':id/assign-user')
  async assignUser(
    @Param('id') id: string,
    @Body('userId') userId: string,
  ): Promise<WebResponse> {
    const result = await this.branchesService.assignUser(id, userId);
    return {
      message: result.message,
    };
  }
}
