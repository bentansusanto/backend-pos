export enum EmailType {
  VERIFY_ACCOUNT = 'verifyAccount',
  GENERATE_NEW_OTP = 'generateNewOtp',
  VERIFY_OTP = 'verifyOtp',
  RESET_PASSWORD = 'resetPassword',
}

export class SendMailOptions {
  email: string;
  otpCode?: string;
  links: string;
  subjectMessage?: string;
  webhookInfo?: string;
}
