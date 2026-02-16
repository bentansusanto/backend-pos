import { ResponseModel } from './index.type';

export class OrderData {
  id: string;
  customer_id: string;
  branch_id: string;
  user_id: string;
  items: OrderItemData[];
  invoice_number: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class OrderItemData {
  id: string;
  order_id: string;
  variant_id: string;
  qty: number;
  price: number;
  total_amount: number;
}

export class OrderResponse extends ResponseModel<OrderData> {
  message: string;
  data?: OrderData;
  datas?: OrderData[];
}
