import { ResponseModel } from './index.type';

export class AuthData {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  pin?: string | null;
  is_verified: boolean;
  isActive?: boolean;
  role: string;
  role_code?: string;
  token?: string;
  session_token?: string;
  branches?: any[];
  profile?: {
    id?: string;
    address: string;
    phone: string;
  } | null;
}

export class AuthResponse extends ResponseModel<AuthData> {
  message: string;
  data?: AuthData;
  datas?: AuthData[];
}
