import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { getOtpVerificationTemplate } from './templates/otp-verification.template';
import { getWorkspaceAccessTemplate } from './templates/workspace-access.template';
import { getOrganizationInvitationTemplate } from './templates/org-invitation.template';

/**
 * Service managing SMTP mailer configurations, connection transport setups,
 * and HTML email deliveries for user alerts and security verification challenges.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private isSandbox = false;

  private getPreviewUrl(info: SMTPTransport.SentMessageInfo): string | false {
    return nodemailer.getTestMessageUrl(info);
  }

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
      this.logger.log(
        `Initializing real SMTP Transporter (${host}:${port})...`,
      );
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isSandbox = false;
    } else {
      this.logger.warn(
        'SMTP configuration is incomplete in .env. Creating an Ethereal Mail sandbox account...',
      );
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
        this.logger.log(
          `Ethereal sandbox account generated: User=${testAccount.user}`,
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Failed to initialize Ethereal Mail fallback transporter: ${message}`,
        );
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
  async sendOtpVerification(
    email: string,
    fullName: string,
    otpCode: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error(
        'Transporter is not initialized. Cannot send verification email.',
      );
      return false;
    }

    const from =
      process.env.SMTP_FROM || '"MLHub Support" <no-reply@mlhub.com>';
    const html = getOtpVerificationTemplate(fullName, otpCode);

    try {
      const rawInfo: unknown = await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Verify Your MLHub Account',
        html,
      });
      const info = rawInfo as SMTPTransport.SentMessageInfo;

      this.logger.log(
        `Verification OTP email sent to ${email} (MessageID: ${info.messageId})`,
      );
      if (this.isSandbox) {
        const previewUrl = this.getPreviewUrl(info);
        this.logger.log(
          `[Ethereal Sandbox] Verification Code (OTP): ${otpCode}`,
        );
        this.logger.log(
          `[Ethereal Sandbox] Preview Verification Email at: ${previewUrl}`,
        );
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send verification OTP email to ${email}: ${message}`,
      );
      return false;
    }
  }

  /**
   * Sends a plain-text security/fraud alert notification to a model owner.
   *
   * @param email - Recipient email.
   * @param subject - Email subject line.
   * @param body - Plain-text alert body.
   * @returns A promise resolving to a success confirmation boolean.
   */
  async sendSecurityAlert(
    email: string,
    subject: string,
    body: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error('Transporter is not initialized. Cannot send alert.');
      return false;
    }
    const from =
      process.env.SMTP_FROM || '"MLHub Security" <no-reply@mlhub.com>';
    try {
      const rawInfo: unknown = await this.transporter.sendMail({
        from,
        to: email,
        subject,
        text: body,
      });
      const info = rawInfo as SMTPTransport.SentMessageInfo;
      this.logger.log(
        `Security alert email sent to ${email} (MessageID: ${info.messageId})`,
      );
      if (this.isSandbox) {
        this.logger.log(
          `[Ethereal Sandbox] Preview Security Alert at: ${this.getPreviewUrl(info)}`,
        );
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send security alert to ${email}: ${message}`,
      );
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
  async sendWorkspaceAccessOtp(
    email: string,
    orgName: string,
    otpCode: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error(
        'Transporter is not initialized. Cannot send workspace access email.',
      );
      return false;
    }

    const from =
      process.env.SMTP_FROM || '"MLHub Security" <no-reply@mlhub.com>';
    const html = getWorkspaceAccessTemplate(email, orgName, otpCode);

    try {
      const rawInfo: unknown = await this.transporter.sendMail({
        from,
        to: email,
        subject: `Authorize Access: ${orgName} Workspace`,
        html,
      });
      const info = rawInfo as SMTPTransport.SentMessageInfo;

      this.logger.log(
        `Workspace access OTP email sent to ${email} (MessageID: ${info.messageId})`,
      );
      if (this.isSandbox) {
        const previewUrl = this.getPreviewUrl(info);
        this.logger.log(
          `[Ethereal Sandbox] Workspace Access Code (OTP): ${otpCode}`,
        );
        this.logger.log(
          `[Ethereal Sandbox] Preview Workspace Access Email at: ${previewUrl}`,
        );
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send workspace access OTP email to ${email}: ${message}`,
      );
      return false;
    }
  }

  /**
   * Delivers a professional organization invitation email to the invited collaborator.
   *
   * @param email - Target receiver email.
   * @param inviteeName - Display name of the invited user.
   * @param orgName - The organization name.
   * @param role - Role granted inside the organization.
   * @param inviterName - Display name of the inviter.
   * @returns A promise resolving to a success confirmation boolean.
   */
  async sendOrganizationInvitation(
    email: string,
    inviteeName: string,
    orgName: string,
    role: string,
    inviterName: string,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.error(
        'Transporter is not initialized. Cannot send organization invitation email.',
      );
      return false;
    }

    const from =
      process.env.SMTP_FROM || '"MLHub Workspace" <no-reply@mlhub.com>';
    const html = getOrganizationInvitationTemplate(
      inviteeName,
      orgName,
      role,
      inviterName,
    );

    try {
      const rawInfo: unknown = await this.transporter.sendMail({
        from,
        to: email,
        subject: `You're invited to join ${orgName} on MLHub`,
        html,
      });
      const info = rawInfo as SMTPTransport.SentMessageInfo;

      this.logger.log(
        `Organization invitation email sent to ${email} (MessageID: ${info.messageId})`,
      );
      if (this.isSandbox) {
        const previewUrl = this.getPreviewUrl(info);
        this.logger.log(
          `[Ethereal Sandbox] Preview Organization Invitation Email at: ${previewUrl}`,
        );
      }
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to send organization invitation email to ${email}: ${message}`,
      );
      return false;
    }
  }
}
