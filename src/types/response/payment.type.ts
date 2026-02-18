import { ResponseModel } from './index.type';

export class PaymentData {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  paid_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class PaymentResponse extends ResponseModel<PaymentData> {
  message: string;
  data?: PaymentData;
  datas?: PaymentData[];
}
