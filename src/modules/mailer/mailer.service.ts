import { Injectable, Logger } from '@nestjs/common';
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';
import { env } from '@config/env.config';
import { mailerConfig } from '@/config/mailer.config';

@Injectable()
export class MailerService {
  private mailerSend: MailerSend;
  private readonly logger = new Logger(MailerService.name);

  constructor() {
    this.mailerSend = new MailerSend({
      apiKey: env.MAILERSEND_API_KEY,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<void> {
    const fromEmail = mailerConfig.EMAIL_FROM_ADDRESS;
    const fromName = mailerConfig.EMAIL_FROM_NAME;
    const frontendUrl = mailerConfig.FRONTEND_URL;

    const sentFrom = new Sender(fromEmail, fromName);
    const recipients = [new Recipient(email, userName)];

    const resetUrl = `${frontendUrl}?token=${resetToken}`;

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Permintaan Ubah Password akun Ruang Diri').setHtml(`
        <h1>Halo ${userName}</h1>
        <p>Kami menerima permintaan untuk mengubah password akun <br></br> kamu.</p>
        <p>Klik tautan di bawah ini untuk mengubah password kamu:</p>
        <a href="${resetUrl}">Klik tautan</a>
        <p>Tautan ini berlaku selama 15 menit. Jika kamu tidak 
        <br></br> melakukan permintaan pengubahan password akun kamu, abaikan email ini</p>
        <p>Terima kasih, <br></br> Tim Ruang Diri</p>
      `);

    try {
      await this.mailerSend.email.send(emailParams);
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }
}
