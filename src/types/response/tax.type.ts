import { ResponseModel } from "./index.type";

export class TaxData {
  id: string;
  name: string;
  rate: number;
  is_inclusive: boolean;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TaxResponse extends ResponseModel<TaxData>{
  message: string;
  data?: TaxData;
  datas?: TaxData[];
}
