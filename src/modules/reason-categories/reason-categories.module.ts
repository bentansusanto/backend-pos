import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReasonCategory } from './entities/reason-category.entity';
import { ReasonCategoriesService } from './reason-categories.service';
import { ReasonCategoriesController } from './reason-categories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ReasonCategory])],
  controllers: [ReasonCategoriesController],
  providers: [ReasonCategoriesService],
  exports: [ReasonCategoriesService],
})
export class ReasonCategoriesModule {}
