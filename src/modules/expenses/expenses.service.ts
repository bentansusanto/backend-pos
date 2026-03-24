import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { errExpenseMessage } from 'src/libs/errors/error_expense';
import { successExpenseMessage } from 'src/libs/success/success_expense';
import { ExpenseData, ExpenseResponse } from 'src/types/response/expense.type';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/create-expense.dto';
import { Expense } from './entities/expense.entity';
import { ExpenseCategoriesService } from './expense-categories/expense-categories.service';

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly expenseCategoriesService: ExpenseCategoriesService,
  ) {}

  private mapToExpenseData(expense: Expense): ExpenseData {
    return {
      id: expense.id,
      expense_code: expense.expense_code,
      expense_category_id: expense.expense_category?.id,
      branch_id: expense.branch?.id,
      amount: expense.amount,
      description: expense.description,
      notes: expense.notes,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  async create(createExpenseDto: CreateExpenseDto): Promise<ExpenseResponse> {
    try {
      // Step 1: Verify if the referenced expense category exists in the system
      const expenseCategory = await this.expenseCategoriesService.findOne(
        createExpenseDto.expense_category_id,
      );
      if (!expenseCategory.data) {
        throw new HttpException(
          errExpenseMessage.ERR_EXPENSE_CATEGORY_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      // Step 2: Map the DTO to a new entity and generate a unique expense code
      const expense = this.expenseRepository.create({
        ...createExpenseDto,
        expense_code: `EXP-${Date.now()}`,
        expense_category: { id: createExpenseDto.expense_category_id },
        branch: { id: createExpenseDto.branch_id },
      });
      // Remove relation ID fields so they don't clash with entity properties
      delete (expense as any).expense_category_id;
      delete (expense as any).branch_id;

      // Step 3: Save the new expense record to the database
      await this.expenseRepository.save(expense);

      return {
        message: successExpenseMessage.SUCCESS_EXPENSE_CREATED,
        data: this.mapToExpenseData(expense),
      };
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CANNOT_CREATE,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CANNOT_CREATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<ExpenseResponse> {
    try {
      // Fetch all expense records sorted by latest creation time,
      // including their associated category and branch details.
      const expenses = await this.expenseRepository.find({
        order: { createdAt: 'DESC' },
        relations: ['expense_category', 'branch'],
      });

      return {
        message: successExpenseMessage.SUCCESS_EXPENSE_LISTED,
        datas: expenses.map((expense) => this.mapToExpenseData(expense)),
      };
    } catch (error) {
      this.logger.error(errExpenseMessage.ERR_EXPENSE_CANNOT_LIST, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CANNOT_LIST,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string): Promise<ExpenseResponse> {
    try {
      // Retrieve a specific expense by its hash ID, including relations
      const expense = await this.expenseRepository.findOne({
        where: { id },
        relations: ['expense_category', 'branch'],
      });

      if (!expense) {
        throw new HttpException(
          errExpenseMessage.ERR_EXPENSE_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }
      return {
        message: successExpenseMessage.SUCCESS_EXPENSE_FOUND,
        data: this.mapToExpenseData(expense),
      };
    } catch (error) {
      this.logger.error(errExpenseMessage.ERR_EXPENSE_CANNOT_GET, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CANNOT_GET,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateExpenseDto: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    try {
      // Step 1: Ensure the corresponding expense actually exists
      const expenseResponse = await this.findOne(id);
      if (!expenseResponse.data) {
        throw new HttpException(
          errExpenseMessage.ERR_EXPENSE_NOT_FOUND,
          HttpStatus.NOT_FOUND,
        );
      }

      // Step 2: Prepare the payload for updates, replacing relation IDs with mapped objects
      const updateData: any = { ...updateExpenseDto };
      if (updateExpenseDto.expense_category_id) {
        updateData.expense_category = {
          id: updateExpenseDto.expense_category_id,
        };
        delete updateData.expense_category_id;
      }
      if (updateExpenseDto.branch_id) {
        updateData.branch = { id: updateExpenseDto.branch_id };
        delete updateData.branch_id;
      }

      // Step 3: Apply partial updates and return the updated entity
      await this.expenseRepository.update(id, updateData);

      const updatedExpense = await this.expenseRepository.findOne({
        where: { id },
        relations: ['expense_category', 'branch'],
      });


      return {
        message: successExpenseMessage.SUCCESS_EXPENSE_UPDATED,
        data: updatedExpense
          ? this.mapToExpenseData(updatedExpense)
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CANNOT_UPDATE,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CANNOT_UPDATE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<ExpenseResponse> {
    try {
      // Verify existence; will throw a 404 Http Exception if not found
      await this.findOne(id);

      // Perform soft deletion marking the record as deleted instead of dropping it entirely
      await this.expenseRepository.softDelete(id);


      return {
        message: successExpenseMessage.SUCCESS_EXPENSE_DELETED,
      };
    } catch (error) {
      this.logger.error(
        errExpenseMessage.ERR_EXPENSE_CANNOT_DELETE,
        error.stack,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        errExpenseMessage.ERR_EXPENSE_CANNOT_DELETE,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
