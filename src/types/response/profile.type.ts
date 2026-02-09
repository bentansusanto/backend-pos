import { ResponseModel } from './index.type';

export class ProfileData {
  id: string;
  address: string;
  phone: string;
  user_id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ProfileResponse extends ResponseModel<ProfileData> {
  message: string;
  data?: ProfileData;
  datas?: ProfileData[];
}
