import { ResponseModel } from './index.type';

export class RolePermissionData {
  id: string;
  role_id: string;
  permission_id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class RolePermissionResponse extends ResponseModel<RolePermissionData> {
  message: string;
  data?: RolePermissionData;
  datas?: RolePermissionData[];
}
