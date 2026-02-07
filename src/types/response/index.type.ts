export class WebResponse {
  message: string;
  data?: any;
  errors?: any;
}

export class ResponseModel<T> {
  message: string;
  data?: T;
  datas?: T[];
}
