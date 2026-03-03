import { Injectable } from '@nestjs/common';
import { CreateCostLayerDto } from './dto/create-cost_layer.dto';
import { UpdateCostLayerDto } from './dto/update-cost_layer.dto';

@Injectable()
export class CostLayersService {
  create(createCostLayerDto: CreateCostLayerDto) {
    return 'This action adds a new costLayer';
  }

  findAll() {
    return `This action returns all costLayers`;
  }

  findOne(id: number) {
    return `This action returns a #${id} costLayer`;
  }

  update(id: number, updateCostLayerDto: UpdateCostLayerDto) {
    return `This action updates a #${id} costLayer`;
  }

  remove(id: number) {
    return `This action removes a #${id} costLayer`;
  }
}
