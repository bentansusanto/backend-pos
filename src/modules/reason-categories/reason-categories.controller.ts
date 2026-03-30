import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { ReasonCategoriesService } from './reason-categories.service';
import { ReasonCategoryType } from './entities/reason-category.entity';

@Controller('reason-categories')
export class ReasonCategoriesController {
  constructor(private readonly reasonCategoriesService: ReasonCategoriesService) {}

  @Get()
  findAll(@Query('type') type?: ReasonCategoryType) {
    return this.reasonCategoriesService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reasonCategoriesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.reasonCategoriesService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.reasonCategoriesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reasonCategoriesService.remove(id);
  }
}
