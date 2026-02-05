import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Logger } from 'winston';
import { EmailType, SendMailOptions } from '../../types/email.types';

@Injectable()
export class EmailService {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: Logger) {}
  private transporter = nodemailer.createTransport({
    service: 'Gmail',
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  } as SMTPTransport.Options);

  async sendMail(type: EmailType, options: SendMailOptions) {
    const { email, links, subjectMessage } = options;

    let subject = '';
    let htmlContent = '';

    switch (type) {
      case EmailType.VERIFY_ACCOUNT:
        subject = subjectMessage;
        htmlContent = `<div style="font-family: Arial, sans-serif; text-align: center;">
                    <p>${subjectMessage}</p>
                    <a href=${links} style="background:rgb(0, 128, 119); text-color:#ffff; padding: 10px 5px">Verify Account</a>
                    <p>Kode ini berlaku hanya dalam beberapa menit.</p>
                </div>`;
        break;

      case EmailType.RESET_PASSWORD:
        subject = subjectMessage;
        htmlContent = `<div style="font-family: Arial, sans-serif; text-align: center;">
                    <p>${subjectMessage}</p>
                    <p>Reset Password ini berlaku hanya dalam beberapa menit.</p>
                    <a href=${links} style="background:rgb(246, 127, 0); padding: 10px 5px">Reset Password</a>`;
        break;

      default:
        this.logger.error('Invalid email type');
        throw new Error('Invalid email type');
    }

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject,
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.debug(`Email sent to ${email} - Type: ${type}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${email}: ${error.message}`);
      // In development, we don't want to block the entire process if email fails
      // especially for common Gmail auth issues (App Password requirement)
    }
  }
}
