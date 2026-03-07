import { ResponseModel } from './index.type';

export class ExpenseData {
  id: string;
  expense_code: string;
  expense_category_id: string;
  branch_id: string;
  amount: number;
  description: string;
  notes: string;
  expense_date: Date;
  payment_method: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ExpenseResponse extends ResponseModel<ExpenseData> {
  message: string;
  data?: ExpenseData;
  datas?: ExpenseData[];
}

export class ExpenseCategoryData {
  id: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ExpenseCategoryResponse extends ResponseModel<ExpenseCategoryData> {
  message: string;
  data?: ExpenseCategoryData;
  datas?: ExpenseCategoryData[];
}
