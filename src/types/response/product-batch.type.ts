import { ProductBatchStatus } from 'src/modules/product-batches/entities/product-batch.entity';
import { ResponseModel } from './index.type';

export class ProductBatchData {
  id: string;
  batchNumber?: string;
  productVariantId: string;
  branchId: string;
  supplierId?: string;
  purchaseReceivingId?: string;
  initialQuantity: number;
  currentQuantity: number;
  costPrice: number;
  manufacturingDate?: Date;
  expiryDate?: Date;
  receivedDate?: Date;
  status: ProductBatchStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class ProductBatchResponse extends ResponseModel<ProductBatchData> {
  message: string;
  data?: ProductBatchData;
  datas?: ProductBatchData[];
}
