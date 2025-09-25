import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { randomBytes, createHash } from 'crypto';
import {
  EmailOptions,
  EmailVerificationData,
  PasswordResetData,
  WelcomeEmailData,
} from '../interfaces/email.interface';
import { emailVerificationTemplate } from '../templates/email-verification.template';
import { passwordResetTemplate } from '../templates/password-reset.template';
import { welcomeTemplate } from '../templates/welcome.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

    // Skip email configuration if credentials are not provided
    if (!emailUser || !emailPassword || emailUser === 'your-email@gmail.com') {
      this.logger.warn(
        'Email service disabled: No valid email credentials provided',
      );
      return;
    }

    const emailConfig = {
      host: this.configService.get<string>('EMAIL_HOST'),
      port: this.configService.get<number>('EMAIL_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('Email transporter configuration error:', error);
      } else {
        this.logger.log('Email transporter is ready to send messages');
      }
    });
  }

  /**
   * Send email with the provided options
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Email sending skipped (no transporter configured): ${options.subject} to ${options.to}`,
      );
      return;
    }

    try {
      const mailOptions = {
        from: `"FYP Platform" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${options.to}: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Generate a secure verification token
   */
  generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a secure password reset token
   */
  generatePasswordResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Create a hash of the token for secure storage
   */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Send email verification email
   */
  async sendEmailVerification(data: EmailVerificationData): Promise<void> {
    const { html, text } = emailVerificationTemplate(data);

    await this.sendEmail({
      to: data.email,
      subject: 'Verify Your Email - FYP Platform',
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<void> {
    const { html, text } = passwordResetTemplate(data);

    await this.sendEmail({
      to: data.email,
      subject: 'Reset Your Password - FYP Platform',
      html,
      text,
    });
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmailAfterVerification(
    data: WelcomeEmailData,
  ): Promise<void> {
    const { html, text } = welcomeTemplate(data);

    await this.sendEmail({
      to: data.email,
      subject: 'Welcome to FYP Platform!',
      html,
      text,
    });
  }

  /**
   * Create verification URL
   */
  createVerificationUrl(token: string): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}/auth/verify-email?token=${token}`;
  }

  /**
   * Create password reset URL
   */
  createPasswordResetUrl(token: string): string {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontendUrl}/auth/reset-password?token=${token}`;
  }

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    if (!email || email.length === 0) {
      return false;
    }

    // More strict email validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    // Additional checks for common invalid patterns
    if (email.includes('..') || email.startsWith('.') || email.endsWith('.')) {
      return false;
    }

    if (email.startsWith('@') || email.endsWith('@')) {
      return false;
    }

    return emailRegex.test(email);
  }

  /**
   * Check if email is from University of Ibadan domain
   */
  isUniversityEmail(email: string): boolean {
    const allowedDomains = [
      '@ui.edu.ng',
      '@stu.ui.edu.ng',
      '@student.ui.edu.ng',
      '@postgrad.ui.edu.ng',
    ];
    const normalizedEmail = email.toLowerCase().trim();
    return allowedDomains.some((domain) => normalizedEmail.endsWith(domain));
  }

  /**
   * Send admin password reset email with temporary password
   */
  async sendPasswordResetByAdmin(
    email: string,
    temporaryPassword: string,
  ): Promise<void> {
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset by Administrator</h2>
                <p>Hello,</p>
                <p>Your password has been reset by an administrator. Please use the temporary password below to log in:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong style="font-size: 18px; color: #d32f2f;">Temporary Password: ${temporaryPassword}</strong>
                </div>
                <p><strong>Important:</strong> Please change this password immediately after logging in for security reasons.</p>
                <p>If you did not request this password reset, please contact the administrator immediately.</p>
                <p>Best regards,<br>FYP Platform Team</p>
            </div>
        `;

    const text = `
Password Reset by Administrator

Hello,

Your password has been reset by an administrator. Please use the temporary password below to log in:

Temporary Password: ${temporaryPassword}

Important: Please change this password immediately after logging in for security reasons.

If you did not request this password reset, please contact the administrator immediately.

Best regards,
FYP Platform Team
        `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset by Administrator - FYP Platform',
      html,
      text,
    });
  }

  /**
   * Send welcome email with temporary password for new users
   */
  async sendWelcomeEmail(
    email: string,
    temporaryPassword: string,
    name: string,
  ): Promise<void> {
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to FYP Platform!</h2>
                <p>Hello ${name},</p>
                <p>Your account has been created successfully. Please use the temporary password below to log in:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <strong style="font-size: 18px; color: #1976d2;">Temporary Password: ${temporaryPassword}</strong>
                </div>
                <p><strong>Important:</strong> Please change this password immediately after your first login for security reasons.</p>
                <p>You can log in at: <a href="${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/login">FYP Platform</a></p>
                <p>Best regards,<br>FYP Platform Team</p>
            </div>
        `;

    const text = `
Welcome to FYP Platform!

Hello ${name},

Your account has been created successfully. Please use the temporary password below to log in:

Temporary Password: ${temporaryPassword}

Important: Please change this password immediately after your first login for security reasons.

You can log in at: ${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/login

Best regards,
FYP Platform Team
        `;

    await this.sendEmail({
      to: email,
      subject: 'Welcome to FYP Platform - Account Created',
      html,
      text,
    });
  }

  /**
   * Send account status notification email
   */
  async sendAccountStatusNotification(
    email: string,
    isActive: boolean,
    reason?: string,
  ): Promise<void> {
    const status = isActive ? 'activated' : 'deactivated';
    const statusColor = isActive ? '#4caf50' : '#f44336';

    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Account Status Update</h2>
                <p>Hello,</p>
                <p>Your account has been <strong style="color: ${statusColor};">${status}</strong> by an administrator.</p>
                ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                ${
                  isActive
                    ? '<p>You can now log in to your account and access the platform.</p>'
                    : '<p>You will no longer be able to access your account. If you believe this is an error, please contact the administrator.</p>'
                }
                <p>If you have any questions, please contact the administrator.</p>
                <p>Best regards,<br>FYP Platform Team</p>
            </div>
        `;

    const text = `
Account Status Update

Hello,

Your account has been ${status} by an administrator.

${reason ? `Reason: ${reason}` : ''}

${
  isActive
    ? 'You can now log in to your account and access the platform.'
    : 'You will no longer be able to access your account. If you believe this is an error, please contact the administrator.'
}

If you have any questions, please contact the administrator.

Best regards,
FYP Platform Team
        `;

    await this.sendEmail({
      to: email,
      subject: `Account ${status.charAt(0).toUpperCase() + status.slice(1)} - FYP Platform`,
      html,
      text,
    });
  }

  /**
   * Send test email (for development/testing purposes)
   */
  async sendTestEmail(to: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Test Email - FYP Platform',
      html: '<h1>Test Email</h1><p>This is a test email from the FYP Platform.</p>',
      text: 'Test Email\n\nThis is a test email from the FYP Platform.',
    });
  }
}
