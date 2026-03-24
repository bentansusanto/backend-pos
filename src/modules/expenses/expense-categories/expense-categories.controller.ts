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
  Put,
} from '@nestjs/common';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/create-expense-category.dto';
import { ExpenseCategoriesService } from './expense-categories.service';
import { WebResponse } from 'src/types/response/index.type';

@Controller('expense-categories')
export class ExpenseCategoriesController {
  constructor(
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createExpenseCategoryDto: CreateExpenseCategoryDto):Promise<WebResponse> {
    const result = await this.expenseCategoriesService.create(createExpenseCategoryDto);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Get('find-all')
  @HttpCode(HttpStatus.OK)
  async findAll():Promise<WebResponse> {
    const result = await this.expenseCategoriesService.findAll();
    return{
      message: result.message,
      data: result.datas,
    }
  }

  @Get('find-one/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.expenseCategoriesService.findOne(id);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ):Promise<WebResponse> {
    const result = await this.expenseCategoriesService.update(id, updateExpenseCategoryDto);
    return{
      message: result.message,
      data: result.data,
    }
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string):Promise<WebResponse> {
    const result = await this.expenseCategoriesService.remove(id);
    return{
      message: result.message,
    }
  }
}
