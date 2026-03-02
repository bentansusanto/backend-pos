import { DiscountType } from "src/modules/discounts/entities/discount.entity";
import { ResponseModel } from "./index.type";

export class DiscountData{
  id: string;
  name: string;
  description: string;
  type: DiscountType;
  value: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DiscountResponse extends ResponseModel<DiscountData>{
  message: string;
  data?: DiscountData;
  datas?: DiscountData[];
}
