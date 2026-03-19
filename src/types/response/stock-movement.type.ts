import { ResponseModel } from "./index.type";

export class StockMovementData {
  id: string;
  variantId?: string;
  productName?: string;
  variantName?: string;
  sku?: string;
  branchId: string;
  referenceType: string;
  qty: number;
  referenceId: string;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StockMovementResponse extends ResponseModel<StockMovementData> {
  message: string;
  data?: StockMovementData;
  datas?: StockMovementData[];
}
