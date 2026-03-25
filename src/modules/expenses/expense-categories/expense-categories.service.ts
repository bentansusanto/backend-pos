import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { errExpenseMessage } from 'src/libs/errors/error_expense';
import { successExpenseMessage } from 'src/libs/success/success_expense';
import { ExpenseCategoryResponse } from 'src/types/response/expense.type';
import { Repository } from 'typeorm';
import { ExpenseCategory } from '../entities/expense-category.entity';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/create-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private readonly expenseCategoryRepository: Repository<ExpenseCategory>,
  ) {}
  // create expense category
  async create(
    createExpenseCategoryDto: CreateExpenseCategoryDto,
  ): Promise<ExpenseCategoryResponse> {
    // Step 1: Ensure category names are strictly unique to avoid duplication
    const findCategory = await this.expenseCategoryRepository.findOne({
      where: { name: createExpenseCategoryDto.name },
    });
    if (findCategory) {
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_CREATE,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Step 2: Initialize entity and write directly to database
    const expenseCategory = this.expenseCategoryRepository.create(
      createExpenseCategoryDto,
    );
    await this.expenseCategoryRepository.save(expenseCategory);

    return {
      message: successExpenseMessage.SUCCESS_EXPENSE_CATEGORY_CREATED,
    };
  }

  async findAll(): Promise<ExpenseCategoryResponse> {
    // Retrieve all active categories, ordering by timestamp
    const expenseCategories = await this.expenseCategoryRepository.find({
      order: { createdAt: 'DESC' },
    });
    return {
      message: successExpenseMessage.SUCCESS_EXPENSE_CATEGORY_LISTED,
      datas: expenseCategories,
    };
  }

  async findOne(id: string): Promise<ExpenseCategoryResponse> {
    // Retrieve specific individual category by its hash ID
    const expenseCategory = await this.expenseCategoryRepository.findOne({
      where: { id },
    });
    if (!expenseCategory) {
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    return {
      message: successExpenseMessage.SUCCESS_EXPENSE_CATEGORY_FOUND,
      data: expenseCategory,
    };
  }

  async update(
    id: string,
    updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategoryResponse> {
    // Step 1: Ensure target entity to update is present
    const expenseCategory = await this.findOne(id);

    // Step 2: If modifying the parameter name, enforce uniqueness rule
    if (
      updateExpenseCategoryDto.name &&
      updateExpenseCategoryDto.name !== expenseCategory.data.name
    ) {
      const findCategory = await this.expenseCategoryRepository.findOne({
        where: { name: updateExpenseCategoryDto.name },
      });
      if (findCategory) {
        throw new HttpException(
          errExpenseMessage.ERR_EXPENSE_CATEGORY_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Step 3: Run patch update over existing fields safely
    await this.expenseCategoryRepository.update(id, updateExpenseCategoryDto);

    const updatedCategory = await this.expenseCategoryRepository.findOne({
      where: { id },
    });

    return {
      message: successExpenseMessage.SUCCESS_EXPENSE_CATEGORY_UPDATED,
      data: updatedCategory,
    };
  }

  async remove(id: string): Promise<ExpenseCategoryResponse> {
    // Step 1: Prove the category exists before committing to destruction
    const expenseCategory = await this.expenseCategoryRepository.findOne({
      where: { id },
    });
    if (!expenseCategory) {
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    // Step 2: Hide the data softly
    await this.expenseCategoryRepository.softDelete(id);

    return {
      message: successExpenseMessage.SUCCESS_EXPENSE_CATEGORY_DELETED,
    };
  }
}
