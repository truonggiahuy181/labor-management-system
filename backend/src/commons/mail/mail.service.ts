import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  get appName(): string {
    return this.configService.get<string>('APP_NAME', 'Hệ thống Quản lý Lao động');
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
      port: Number(this.configService.get('MAIL_PORT', 587)),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });

    await transporter.sendMail({
      from: `"${this.appName}" <${this.configService.get<string>('MAIL_USER')}>`,
      to,
      subject: `[${this.appName}] ${subject}`,
      html,
    });
  }
}
