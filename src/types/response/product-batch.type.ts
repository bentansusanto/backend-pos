import { ResponseModel } from './index.type';

export class ProductBatchData {
  id: string;
  variantId: string;
  branchId: string;
  batch_code: string;
  exp_date: Date;
  qty: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductBatchResponse extends ResponseModel<ProductBatchData> {
  message: string;
  data?: ProductBatchData;
  datas?: ProductBatchData[];
}
