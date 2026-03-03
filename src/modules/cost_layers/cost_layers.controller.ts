import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CostLayersService } from './cost_layers.service';
import { CreateCostLayerDto } from './dto/create-cost_layer.dto';
import { UpdateCostLayerDto } from './dto/update-cost_layer.dto';

@Controller('cost-layers')
export class CostLayersController {
  constructor(private readonly costLayersService: CostLayersService) {}

  @Post()
  create(@Body() createCostLayerDto: CreateCostLayerDto) {
    return this.costLayersService.create(createCostLayerDto);
  }

  @Get()
  findAll() {
    return this.costLayersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.costLayersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCostLayerDto: UpdateCostLayerDto) {
    return this.costLayersService.update(+id, updateCostLayerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.costLayersService.remove(+id);
  }
}
