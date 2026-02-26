import { ResponseModel } from './index.type';

export class PermissionData {
  id: string;
  module: string;
  action: string;
  description: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PermissionResponse extends ResponseModel<PermissionData> {
  message: string;
  data?: PermissionData;
  datas?: PermissionData[];
}
