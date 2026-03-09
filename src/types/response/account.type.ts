import { ResponseModel } from './index.type';

export class AccountData {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  category?: string;
  cashflowType?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;

  // For journal entries
  date?: Date;
  referenceType?: string;
  referenceCode?: string;
  description?: string;
  branchId?: string;
  journalLines?: any[];

  // For reports
  assets?: any[];
  totalAssets?: number;
  liabilities?: any[];
  totalLiabilities?: number;
  equities?: any[];
  totalEquities?: number;
  isBalanced?: boolean;

  revenues?: any[];
  totalRevenue?: number;
  expenses?: any[];
  totalExpense?: number;
  netIncome?: number;

  operating?: any[];
  netOperating?: number;
  investing?: any[];
  netInvesting?: number;
  financing?: any[];
  netFinancing?: number;
  netIncreaseInCash?: number;
}

export class AccountResponse extends ResponseModel<AccountData> {
  message: string;
  data?: AccountData;
  datas?: AccountData[];
}
