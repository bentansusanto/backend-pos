import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errExpenseMessage } from 'src/libs/errors/error_expense';
import { successExpenseMessage } from 'src/libs/success/success_expense';
import { ExpenseCategoryResponse } from 'src/types/response/expense.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { ExpenseCategory } from '../entities/expense-category.entity';
import {
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from './dto/create-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(ExpenseCategory)
    private readonly expenseCategoryRepository: Repository<ExpenseCategory>,
  ) {}
  // create expense category
  async create(
    createExpenseCategoryDto: CreateExpenseCategoryDto,
  ): Promise<ExpenseCategoryResponse> {
    try {
      // Step 1: Ensure category names are strictly unique to avoid duplication
      const findCategory = await this.expenseCategoryRepository.findOne({
        where: { name: createExpenseCategoryDto.name },
      });
      if (findCategory) {
        this.logger.error(errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_GET);
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
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_CREATE,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_CREATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<ExpenseCategoryResponse> {
    try {
      // Retrieve all active categories, ordering by timestamp
      const expenseCategories = await this.expenseCategoryRepository.find({
        order: { createdAt: 'DESC' },
      });
      return {
        message: successExpenseMessage.SUCCESS_EXPENSE_CATEGORY_LISTED,
        datas: expenseCategories,
      };
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_LIST,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_LIST,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<ExpenseCategoryResponse> {
    try {
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
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_GET,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_GET,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateExpenseCategoryDto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategoryResponse> {
    try {
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
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_UPDATE,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_UPDATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<ExpenseCategoryResponse> {
    try {
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
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_DELETE,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CATEGORY_CANNOT_DELETE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
