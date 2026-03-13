import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DataSource, Repository } from 'typeorm';
import { Logger } from 'winston';
import { errAccountMessage } from 'src/libs/errors/error_acconts';
import { successAccountMessage } from 'src/libs/success/success_accounts';
import { AccountResponse } from 'src/types/response/account.type';

import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Accounts } from './entities/account.entity';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalLine } from './entities/journal-line.entity';

@Injectable()
export class AccountingService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    @InjectRepository(Accounts)
    private readonly accountsRepository: Repository<Accounts>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepository: Repository<JournalEntry>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================
  // ACCOUNTS CRUD
  // ==========================================

  async createAccount(createAccountDto: CreateAccountDto): Promise<AccountResponse> {
    try {
      const findAccountCode = await this.accountsRepository.findOne({
        where: { code: createAccountDto.code },
      });

      if (findAccountCode) {
        throw new HttpException(
          errAccountMessage.ERR_ACCOUNT_CODE_ALREADY_EXISTS,
          HttpStatus.BAD_REQUEST,
        );
      }

      const account = this.accountsRepository.create(createAccountDto);
      const savedAccount = await this.accountsRepository.save(account);

      return {
        message: successAccountMessage.SUCCESS_CREATE_ACCOUNT,
        data: savedAccount as any,
      };
    } catch (error) {
      this.logger.error('Error creating account', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error creating account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllAccounts(): Promise<AccountResponse> {
    try {
      const accounts = await this.accountsRepository.find({
        order: { code: 'ASC' },
      });

      if (accounts.length === 0) {
        this.logger.warn(
          errAccountMessage.ERR_ACCOUNT_NOT_FOUND,
          'Accounts not found',
        );
        throw new NotFoundException({
          message: errAccountMessage.ERR_ACCOUNT_NOT_FOUND,
          data: null,
        });
      }

      return {
        message: successAccountMessage.SUCCESS_FIND_ALL_ACCOUNTS,
        datas: accounts as any[],
      };
    } catch (error) {
      this.logger.error('Error finding accounts', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error finding accounts',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOneAccount(id: string): Promise<AccountResponse> {
    try {
      const account = await this.accountsRepository.findOne({ where: { id } });
      if (!account) {
        throw new NotFoundException({
          message: errAccountMessage.ERR_ACCOUNT_NOT_FOUND,
          data: null,
        });
      }

      return {
        message: successAccountMessage.SUCCESS_FIND_ONE_ACCOUNT,
        data: account as any,
      };
    } catch (error) {
      this.logger.error('Error finding account', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error finding account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateAccount(
    id: string,
    updateAccountDto: UpdateAccountDto,
  ): Promise<AccountResponse> {
    try {
      const findAccount = await this.findOneAccount(id);
      await this.accountsRepository.update(id, updateAccountDto);

      return {
        message: successAccountMessage.SUCCESS_UPDATE_ACCOUNT,
        data: {
          ...findAccount.data,
          ...updateAccountDto,
        } as any,
      };
    } catch (error) {
      this.logger.error('Error updating account', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error updating account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAccountByCode(code: string): Promise<Accounts | null> {
    try {
      return await this.accountsRepository.findOne({ where: { code } });
    } catch (error) {
      this.logger.error(`Error finding account by code: ${code}`, error.stack);
      return null;
    }
  }

  async removeAccount(id: string): Promise<AccountResponse> {
    try {
      const findAccount = await this.findOneAccount(id);
      await this.accountsRepository.delete(id);

      return {
        message: successAccountMessage.SUCCESS_DELETE_ACCOUNT,
      };
    } catch (error) {
      this.logger.error('Error deleting account', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error deleting account',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================================
  // JOURNAL ENTRIES
  // ==========================================

  async createJournalEntry(createJournalDto: CreateJournalEntryDto): Promise<AccountResponse> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validate Double Entry (Total Debit === Total Credit)
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of createJournalDto.journalLines) {
        totalDebit += Number(line.debit);
        totalCredit += Number(line.credit);
      }

      if (totalDebit !== totalCredit) {
        throw new BadRequestException('Total Debit must equal Total Credit');
      }

      const entry = this.journalEntryRepository.create({
        date: new Date(createJournalDto.date),
        referenceType: createJournalDto.referenceType,
        referenceCode: createJournalDto.referenceCode,
        description: createJournalDto.description,
        branchId: createJournalDto.branchId,
        journalLines: createJournalDto.journalLines, // Cascade insert handles lines
      });

      const savedEntry = await queryRunner.manager.save(JournalEntry, entry);

      await queryRunner.commitTransaction();

      return {
        message: successAccountMessage.SUCCESS_CREATE_JOURNAL_ENTRY,
        data: savedEntry as any,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Error creating journal entry', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error creating journal entry',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAllJournalEntries(): Promise<AccountResponse> {
    try {
      const entries = await this.journalEntryRepository.find({
        relations: ['journalLines', 'journalLines.account'],
        order: { date: 'DESC', createdAt: 'DESC' },
      });

      return {
        message: successAccountMessage.SUCCESS_FIND_ALL_ACCOUNTS || 'Successfully fetched journal entries',
        datas: entries as any[],
      };
    } catch (error) {
      this.logger.error('Error finding journal entries', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error finding journal entries',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================================
  // REPORTS
  // ==========================================

  async getBalanceSheet(branchId?: string, endDate?: string): Promise<AccountResponse> {
    try {
      const query = this.dataSource
        .getRepository(JournalLine)
        .createQueryBuilder('line')
        .leftJoin('line.account', 'account')
        .leftJoin('line.journalEntry', 'entry')
        .select('account.id', 'accountId')
        .addSelect('account.name', 'accountName')
        .addSelect('account.code', 'accountCode')
        .addSelect('account.type', 'accountType')
        .addSelect('account.category', 'accountCategory')
        .addSelect('SUM(line.debit)', 'totalDebit')
        .addSelect('SUM(line.credit)', 'totalCredit')
        .where('account.type IN (:...types)', {
          types: ['ASSET', 'LIABILITY', 'EQUITY'],
        })
        .groupBy('account.id')
        .addGroupBy('account.name')
        .addGroupBy('account.code')
        .addGroupBy('account.type')
        .addGroupBy('account.category')
        .orderBy('account.code', 'ASC');

      if (branchId) {
        query.andWhere('line.branchId = :branchId', { branchId });
      }

      if (endDate) {
        query.andWhere('entry.date <= :endDate', { endDate: new Date(endDate) });
      }

      const rawData = await query.getRawMany();

      const assets = [];
      let totalAssets = 0;
      const liabilities = [];
      let totalLiabilities = 0;
      const equities = [];
      let totalEquities = 0;

      for (const row of rawData) {
        const debit = Number(row.totalDebit) || 0;
        const credit = Number(row.totalCredit) || 0;

        if (row.accountType === 'ASSET') {
          const balance = debit - credit;
          assets.push({ ...row, balance });
          totalAssets += balance;
        } else if (row.accountType === 'LIABILITY') {
          const balance = credit - debit;
          liabilities.push({ ...row, balance });
          totalLiabilities += balance;
        } else if (row.accountType === 'EQUITY') {
          const balance = credit - debit;
          equities.push({ ...row, balance });
          totalEquities += balance;
        }
      }

      return {
        message: successAccountMessage.SUCCESS_GET_BALANCE_SHEET,
        data: {
          assets,
          totalAssets,
          liabilities,
          totalLiabilities,
          equities,
          totalEquities,
          isBalanced: totalAssets === totalLiabilities + totalEquities,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching balance sheet', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error fetching balance sheet',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getIncomeStatement(
    branchId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AccountResponse> {
    try {
      const query = this.dataSource
        .getRepository(JournalLine)
        .createQueryBuilder('line')
        .leftJoin('line.account', 'account')
        .leftJoin('line.journalEntry', 'entry')
        .select('account.id', 'accountId')
        .addSelect('account.name', 'accountName')
        .addSelect('account.code', 'accountCode')
        .addSelect('account.type', 'accountType')
        .addSelect('account.category', 'accountCategory')
        .addSelect('SUM(line.debit)', 'totalDebit')
        .addSelect('SUM(line.credit)', 'totalCredit')
        .where('account.type IN (:...types)', {
          types: ['REVENUE', 'EXPENSE'],
        })
        .groupBy('account.id')
        .addGroupBy('account.name')
        .addGroupBy('account.code')
        .addGroupBy('account.type')
        .addGroupBy('account.category')
        .orderBy('account.code', 'ASC');

      if (branchId) {
        query.andWhere('line.branchId = :branchId', { branchId });
      }

      if (startDate) {
        query.andWhere('entry.date >= :startDate', {
          startDate: new Date(startDate),
        });
      }

      if (endDate) {
        query.andWhere('entry.date <= :endDate', { endDate: new Date(endDate) });
      }

      const rawData = await query.getRawMany();

      const revenues = [];
      let totalRevenue = 0;
      const expenses = [];
      let totalExpense = 0;

      for (const row of rawData) {
        const debit = Number(row.totalDebit) || 0;
        const credit = Number(row.totalCredit) || 0;

        if (row.accountType === 'REVENUE') {
          const balance = credit - debit;
          revenues.push({ ...row, balance });
          totalRevenue += balance;
        } else if (row.accountType === 'EXPENSE') {
          const balance = debit - credit;
          expenses.push({ ...row, balance });
          totalExpense += balance;
        }
      }

      const netIncome = totalRevenue - totalExpense;

      return {
        message: successAccountMessage.SUCCESS_GET_INCOME_STATEMENT,
        data: {
          revenues,
          totalRevenue,
          expenses,
          totalExpense,
          netIncome,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching income statement', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error fetching income statement',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCashflow(branchId?: string, startDate?: string, endDate?: string): Promise<AccountResponse> {
    try {
      const query = this.dataSource
        .getRepository(JournalLine)
        .createQueryBuilder('line')
        .leftJoin('line.account', 'account')
        .leftJoin('line.journalEntry', 'entry')
        .select('account.id', 'accountId')
        .addSelect('account.name', 'accountName')
        .addSelect('account.code', 'accountCode')
        .addSelect('account.cashflowType', 'cashflowType')
        .addSelect('SUM(line.debit)', 'totalDebit') // Debit on cash means money IN
        .addSelect('SUM(line.credit)', 'totalCredit') // Credit on cash means money OUT
        .where('account.cashflowType IS NOT NULL') // Only accounts tagged with cashflow
        .groupBy('account.id')
        .addGroupBy('account.name')
        .addGroupBy('account.code')
        .addGroupBy('account.cashflowType')
        .orderBy('account.code', 'ASC');

      if (branchId) {
        query.andWhere('line.branchId = :branchId', { branchId });
      }

      if (startDate) {
        query.andWhere('entry.date >= :startDate', {
          startDate: new Date(startDate),
        });
      }

      if (endDate) {
        query.andWhere('entry.date <= :endDate', { endDate: new Date(endDate) });
      }

      const rawData = await query.getRawMany();

      const operating = [];
      let netOperating = 0;
      const investing = [];
      let netInvesting = 0;
      const financing = [];
      let netFinancing = 0;

      for (const row of rawData) {
        const inflow = Number(row.totalDebit) || 0;
        const outflow = Number(row.totalCredit) || 0;
        const netCash = inflow - outflow;

        if (row.cashflowType === 'OPERATING') {
          operating.push({ ...row, inflow, outflow, netCash });
          netOperating += netCash;
        } else if (row.cashflowType === 'INVESTING') {
          investing.push({ ...row, inflow, outflow, netCash });
          netInvesting += netCash;
        } else if (row.cashflowType === 'FINANCING') {
          financing.push({ ...row, inflow, outflow, netCash });
          netFinancing += netCash;
        }
      }

      return {
        message: successAccountMessage.SUCCESS_GET_CASHFLOW,
        data: {
          operating,
          netOperating,
          investing,
          netInvesting,
          financing,
          netFinancing,
          netIncreaseInCash: netOperating + netInvesting + netFinancing,
        },
      };

    } catch (error) {
      this.logger.error('Error fetching cashflow', error.stack);
      if (error instanceof HttpException) {
        throw new Error(error.message);
      }
      throw new HttpException(
        'Error fetching cashflow',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
