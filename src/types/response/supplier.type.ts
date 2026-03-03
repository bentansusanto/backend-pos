import { ResponseModel } from "./index.type";

export class SupplierData{
  id : string;
  name : string;
  email : string;
  phone : string;
  address : string;
  city : string;
  province : string;
  country : string;
  postalCode : string;
  createdAt? : Date;
  updatedAt? : Date;
}

export class SupplierResponse extends ResponseModel<SupplierData>{
  message: string;
  data?: SupplierData;
  datas?: SupplierData[];
}
