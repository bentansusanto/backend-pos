import { ResponseModel } from './index.type';

export class RoleData {
  id: string;
  name: string;
  code: string;
  description: string;
  self_registered: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  permissions?: { id: string; action: string; description?: string }[];
}

export class RoleResponse extends ResponseModel<RoleData> {
  message: string;
  data?: RoleData;
  datas?: RoleData[];
}
