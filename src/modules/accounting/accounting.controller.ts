import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AccountResponse } from 'src/types/response/account.type';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { WebResponse } from 'src/types/response/index.type';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // ==========================================
  // ACCOUNTS CRUD
  // ==========================================

  @Post('create')
  async createAccount(
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<WebResponse> {
    const result = await this.accountingService.createAccount(createAccountDto);
    return{
      message: result.message,
      data: result.data
    }
  }

  @Get('accounts')
  async findAllAccounts(): Promise<WebResponse> {
    const result = await this.accountingService.findAllAccounts();
    return{
      message: result.message,
      data: result.datas
    }
  }

  @Get(':id')
  async findOneAccount(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.accountingService.findOneAccount(id);
    return{
      message: result.message,
      data: result.data
    }
  }

  @Put('update/:id')
  async updateAccount(
    @Param('id') id: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<WebResponse> {
    const result = await this.accountingService.updateAccount(id, updateAccountDto);
    return{
      message: result.message,
      data: result.data
    }
  }

  @Delete('accounts/:id')
  async removeAccount(@Param('id') id: string): Promise<WebResponse> {
    const result = await this.accountingService.removeAccount(id);
    return{
      message: result.message
    }
  }

  // ==========================================
  // JOURNAL ENTRIES
  // ==========================================

  @Post('journals/create')
  async createJournalEntry(
    @Body() createJournalDto: CreateJournalEntryDto,
  ): Promise<WebResponse> {
    const result = await this.accountingService.createJournalEntry(createJournalDto);
    return{
      message: result.message,
      data: result.data
    }
  }

  // ==========================================
  // REPORTS
  // ==========================================

  @Get('reports/balance-sheet')
  async getBalanceSheet(
    @Query('branchId') branchId?: string,
    @Query('endDate') endDate?: string,
  ): Promise<WebResponse> {
    const result = await this.accountingService.getBalanceSheet(branchId, endDate);
    return{
      message: result.message,
      data: result.data
    }
  }

  @Get('reports/income-statement')
  async getIncomeStatement(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<WebResponse> {
    const result = await this.accountingService.getIncomeStatement(
      branchId,
      startDate,
      endDate,
    );
    return{
      message: result.message,
      data: result.data
    }
  }

  @Get('reports/cashflow')
  async getCashflow(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<WebResponse> {
    const result = await this.accountingService.getCashflow(branchId, startDate, endDate);
    return{
      message: result.message,
      data: result.data
    }
  }
}
