import { ResponseModel } from './index.type';

export class AuthData {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  token?: string;
  session_token?: string;
}

export class AuthResponse extends ResponseModel<AuthData> {
  message: string;
  data?: AuthData;
  datas?: AuthData[];
}
