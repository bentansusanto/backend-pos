import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExpenseCategoriesModule } from './expense-categories/expense-categories.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  imports: [
    ExpenseCategoriesModule,
    TypeOrmModule.forFeature([Expense]),
  ],
})
export class ExpensesModule {}
