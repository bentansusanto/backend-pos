import { ResponseModel } from './index.type';

export class RoleData {
  id: string;
  name: string;
  code: string;
  description: string;
  self_registered: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RoleResponse extends ResponseModel<RoleData> {
  message: string;
  data?: RoleData;
  datas?: RoleData[];
}
