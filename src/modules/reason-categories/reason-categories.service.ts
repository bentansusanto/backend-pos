import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReasonCategory, ReasonCategoryType } from './entities/reason-category.entity';

@Injectable()
export class ReasonCategoriesService {
  constructor(
    @InjectRepository(ReasonCategory)
    private reasonCategoryRepository: Repository<ReasonCategory>,
  ) {}

  async findAll(type?: ReasonCategoryType) {
    const where: any = { is_active: true };
    if (type) {
      where.type = type;
    }
    return this.reasonCategoryRepository.find({
      where,
      order: { label: 'ASC' },
    });
  }

  async findOne(id: string) {
    const category = await this.reasonCategoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Reason category with ID ${id} not found`);
    }
    return category;
  }

  async create(data: Partial<ReasonCategory>) {
    const category = this.reasonCategoryRepository.create(data);
    return this.reasonCategoryRepository.save(category);
  }

  async update(id: string, data: Partial<ReasonCategory>) {
    const category = await this.findOne(id);
    this.reasonCategoryRepository.merge(category, data);
    return this.reasonCategoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);
    category.is_active = false;
    return this.reasonCategoryRepository.save(category);
  }
}
