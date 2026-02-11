import { ResponseModel } from './index.type';

export class BranchData {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  city: string;
  province: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BranchResponse extends ResponseModel<BranchData> {
  message: string;
  data?: BranchData;
  datas?: BranchData[];
}
