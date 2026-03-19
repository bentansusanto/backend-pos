import { ResponseModel } from "./index.type";

export class StockTakeItemData {
  id: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  systemQty: number;
  countedQty: number;
  difference: number;
  reason?: string;
}

export class StockTakeData {
  id: string;
  branchId: string;
  userId: string;
  status: string;
  notes?: string;
  isFrozen: boolean;
  items?: StockTakeItemData[];
  approvedById?: string;
  approvedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class StockTakeResponse extends ResponseModel<StockTakeData> {
  message: string;
  data?: StockTakeData;
  datas?: StockTakeData[];
}
