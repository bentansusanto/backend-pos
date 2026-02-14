import { ResponseModel } from "./index.type";

export class CustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  loyalPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CustomerResponse extends ResponseModel<CustomerData> {
  message: string;
  data?: CustomerData;
  datas?: CustomerData[];
}
