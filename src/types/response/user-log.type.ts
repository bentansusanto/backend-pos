import { ResponseModel } from "./index.type";

export class UserLogData {
  id: string;
  user_id: string;
  branch_id: string;
  action: string;
  module: string;
  description: string;
  metadata: any;
  ip_address: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UserLogResponse extends ResponseModel<UserLogData>{
  message: string;
  data?: UserLogData;
  datas?: UserLogData[];
}
