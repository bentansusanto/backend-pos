import { ResponseModel } from './index.type';

export class ProductStockData {
  id: string;
  variantId: string;
  productId?: string;
  branchId?: string;
  stock: number;
  minStock: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProductStockResponse extends ResponseModel<ProductStockData> {
  message: string;
  data?: ProductStockData;
  datas?: ProductStockData[];
}
