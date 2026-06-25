import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getOtpVerificationTemplate } from './templates/otp-verification.template';
import { getWorkspaceAccessTemplate } from './templates/workspace-access.template';

/**
 * Service managing SMTP mailer configurations, connection transport setups,
 * and HTML email deliveries for user alerts and security verification challenges.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isSandbox = false;

  /**
   * Initializes the SMTP transporter connection on module lifecycle setup.
   * Falls back to a mock Ethereal testing account if SMTP configs are missing.
   */
  async onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.logger.log(`Initializing real SMTP Transporter (${host}:${port})...`);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isSandbox = false;
    } else {
      this.logger.warn('SMTP configuration is incomplete in .env. Creating an Ethereal Mail sandbox account...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        this.isSandbox = true;
        this.logger.log(`Ethereal sandbox account generated: User=${testAccount.user}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to initialize Ethereal Mail fallback transporter: ${message}`);
      }
    }
  }

  /**
   * Delivers an OTP verification email to the user.
   *
   * @param email - Target receiver email.
   * @param fullName - Full name of the user.
   * @param otpCode - The 6-digit verification code.
   * @returns A promise resolving to a success confirmation boolean.
   */
  async sendOtpVerification(email: string, fullName: string, otpCode: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Transporter is not initialized. Cannot send verification email.');
      return false;
    }

    const from = process.env.SMTP_FROM || '"MLHub Support" <no-reply@mlhub.com>';
    const html = getOtpVerificationTemplate(fullName, otpCode);

    try {
      const info = await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Verify Your MLHub Account',
        html,
      });

      this.logger.log(`Verification OTP email sent to ${email} (MessageID: ${info.messageId})`);
      if (this.isSandbox) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        this.logger.log(`[Ethereal Sandbox] Verification Code (OTP): ${otpCode}`);
        this.logger.log(`[Ethereal Sandbox] Preview Verification Email at: ${previewUrl}`);
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send verification OTP email to ${email}: ${message}`);
      return false;
    }
  }

  /**
   * Delivers a workspace access verification email to the user.
   *
   * @param email - Target receiver email.
   * @param orgName - The organization workspace name.
   * @param otpCode - The 6-digit access verification code.
   * @returns A promise resolving to a success confirmation boolean.
   */
  async sendWorkspaceAccessOtp(email: string, orgName: string, otpCode: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Transporter is not initialized. Cannot send workspace access email.');
      return false;
    }

    const from = process.env.SMTP_FROM || '"MLHub Security" <no-reply@mlhub.com>';
    const html = getWorkspaceAccessTemplate(email, orgName, otpCode);

    try {
      const info = await this.transporter.sendMail({
        from,
        to: email,
        subject: `Authorize Access: ${orgName} Workspace`,
        html,
      });

      this.logger.log(`Workspace access OTP email sent to ${email} (MessageID: ${info.messageId})`);
      if (this.isSandbox) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        this.logger.log(`[Ethereal Sandbox] Workspace Access Code (OTP): ${otpCode}`);
        this.logger.log(`[Ethereal Sandbox] Preview Workspace Access Email at: ${previewUrl}`);
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send workspace access OTP email to ${email}: ${message}`);
      return false;
    }
  }
}
