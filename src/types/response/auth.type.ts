import { ResponseModel } from './index.type';

export class AuthData {
  id: string;
  name: string;
  email: string;
  is_verified: boolean;
  isActive?: boolean;
  role: string;
  token?: string;
  session_token?: string;
  branches?: any[];
  profile?: {
    address: string;
    phone: string;
  } | null;
}

export class AuthResponse extends ResponseModel<AuthData> {
  message: string;
  data?: AuthData;
  datas?: AuthData[];
}
