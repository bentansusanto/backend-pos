import { ResponseModel } from './index.type';

export class PosSessionData {
  id: string;
  branch_id: string;
  user_id: string;
  startTime: Date;
  endTime?: Date;
  openingBalance: number;
  closingBalance?: number;
  status: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PosSessionResponse extends ResponseModel<PosSessionData> {
  message: string;
  data?: PosSessionData;
  datas?: PosSessionData[];
}
