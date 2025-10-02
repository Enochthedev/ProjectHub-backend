import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import { randomBytes, createHash } from 'crypto';
import {
  EmailOptions,
  EmailVerificationData,
  PasswordResetData,
  WelcomeEmailData,
  EmailDeliveryStatus,
  EmailQueueItem,
} from '../interfaces/email.interface';
import { EmailDelivery, EmailStatus, EmailType } from '../../entities/email-delivery.entity';
import { emailVerificationTemplate } from '../templates/email-verification.template';
import { passwordResetTemplate } from '../templates/password-reset.template';
import { welcomeTemplate } from '../templates/welcome.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private emailQueue: EmailQueueItem[] = [];
  private isProcessingQueue = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(EmailDelivery)
    private readonly emailDeliveryRepository: Repository<EmailDelivery>,
  ) {
    this.initializeTransporter();
    this.startQueueProcessor();
  }

  private initializeTransporter() {
    const emailUser = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');
    const emailHost = this.configService.get<string>('EMAIL_HOST', 'smtp.gmail.com');
    const emailPort = this.configService.get<number>('EMAIL_PORT', 587);
    const emailSecure = this.configService.get<boolean>('EMAIL_SECURE', false);
    const emailService = this.configService.get<string>('EMAIL_SERVICE');

    // Skip email configuration if credentials are not provided
    if (!emailUser || !emailPassword || emailUser === 'your-email@gmail.com') {
      this.logger.warn(
        'Email service disabled: No valid email credentials provided',
      );
      return;
    }

    let emailConfig: any;

    // Support for different email services
    if (emailService) {
      // Use predefined service (Gmail, Outlook, etc.)
      emailConfig = {
        service: emailService,
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    } else {
      // Custom SMTP configuration
      emailConfig = {
        host: emailHost,
        port: emailPort,
        secure: emailSecure, // true for 465, false for other ports
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
        // Additional security options for production
        tls: {
          rejectUnauthorized: this.configService.get<boolean>('EMAIL_TLS_REJECT_UNAUTHORIZED', true),
        },
        // Connection timeout
        connectionTimeout: this.configService.get<number>('EMAIL_CONNECTION_TIMEOUT', 60000),
        // Socket timeout
        socketTimeout: this.configService.get<number>('EMAIL_SOCKET_TIMEOUT', 60000),
        // Pool configuration for better performance
        pool: this.configService.get<boolean>('EMAIL_POOL', true),
        maxConnections: this.configService.get<number>('EMAIL_MAX_CONNECTIONS', 5),
        maxMessages: this.configService.get<number>('EMAIL_MAX_MESSAGES', 100),
      };
    }

    this.transporter = nodemailer.createTransport(emailConfig);

    // Verify connection configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter configuration error:', error);
      } else {
        this.logger.log('Email transporter is ready to send messages');
      }
    });
  }

  /**
   * Start the email queue processor
   */
  private startQueueProcessor() {
    // Process queue every 30 seconds
    setInterval(() => {
      if (!this.isProcessingQueue && this.emailQueue.length > 0) {
        this.processEmailQueue();
      }
    }, 30000);

    // Also process failed emails every 5 minutes
    setInterval(() => {
      void this.retryFailedEmails();
    }, 300000);
  }

  /**
   * Process the email queue
   */
  private async processEmailQueue() {
    if (this.isProcessingQueue || this.emailQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.logger.log(`Processing email queue with ${this.emailQueue.length} items`);

    try {
      const emailsToProcess = this.emailQueue.splice(0, 10); // Process up to 10 emails at once

      for (const emailItem of emailsToProcess) {
        try {
          await this.sendQueuedEmail(emailItem);
        } catch (error) {
          this.logger.error(`Failed to send queued email ${emailItem.id}:`, error);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Send a queued email
   */
  private async sendQueuedEmail(emailItem: EmailQueueItem) {
    const delivery = await this.emailDeliveryRepository.findOne({
      where: { id: emailItem.id },
    });

    if (!delivery) {
      this.logger.warn(`Email delivery record not found: ${emailItem.id}`);
      return;
    }

    // Check if email is scheduled for future
    if (emailItem.scheduledAt && emailItem.scheduledAt > new Date()) {
      // Put back in queue for later processing
      this.emailQueue.push(emailItem);
      return;
    }

    try {
      delivery.status = EmailStatus.SENDING;
      await this.emailDeliveryRepository.save(delivery);

      const result = await this.sendEmailDirect({
        to: emailItem.to,
        subject: emailItem.subject,
        html: emailItem.html,
        text: emailItem.text,
      });

      delivery.status = EmailStatus.SENT;
      delivery.messageId = result.messageId;
      delivery.sentAt = new Date();
      await this.emailDeliveryRepository.save(delivery);

      this.logger.log(`Email sent successfully: ${emailItem.id} to ${emailItem.to}`);
    } catch (error) {
      delivery.status = EmailStatus.FAILED;
      delivery.errorMessage = error.message;
      delivery.failedAt = new Date();
      delivery.retryCount += 1;
      await this.emailDeliveryRepository.save(delivery);

      // Retry if under max retries
      if (delivery.retryCount < delivery.maxRetries) {
        this.logger.warn(`Email failed, will retry: ${emailItem.id} (attempt ${delivery.retryCount}/${delivery.maxRetries})`);
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, delivery.retryCount) * 60000; // 2^n minutes
        setTimeout(() => {
          this.emailQueue.push(emailItem);
        }, retryDelay);
      } else {
        this.logger.error(`Email failed permanently after ${delivery.maxRetries} attempts: ${emailItem.id}`);
      }
    }
  }

  /**
   * Retry failed emails that haven't exceeded max retries
   */
  private async retryFailedEmails() {
    const failedEmails = await this.emailDeliveryRepository.find({
      where: {
        status: EmailStatus.FAILED,
      },
      take: 50, // Limit to 50 failed emails per retry cycle
    });

    for (const delivery of failedEmails) {
      if (delivery.retryCount < delivery.maxRetries) {
        // Add back to queue for retry
        this.emailQueue.push({
          id: delivery.id,
          to: delivery.to,
          subject: delivery.subject,
          html: '', // Will be regenerated
          text: '',
          type: delivery.type,
          retryCount: delivery.retryCount,
          maxRetries: delivery.maxRetries,
          metadata: delivery.metadata || undefined,
        });
      }
    }
  }

  /**
   * Add email to queue for processing
   */
  private async queueEmail(options: EmailOptions): Promise<string> {
    const delivery = this.emailDeliveryRepository.create({
      to: options.to,
      subject: options.subject,
      type: options.type || EmailType.NOTIFICATION,
      status: EmailStatus.QUEUED,
      scheduledAt: options.scheduledAt,
      metadata: options.metadata,
    });

    const savedDelivery = await this.emailDeliveryRepository.save(delivery);

    const queueItem: EmailQueueItem = {
      id: savedDelivery.id,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      type: options.type || EmailType.NOTIFICATION,
      scheduledAt: options.scheduledAt,
      retryCount: 0,
      maxRetries: 3,
      metadata: options.metadata,
    };

    this.emailQueue.push(queueItem);
    this.logger.log(`Email queued: ${savedDelivery.id} to ${options.to}`);

    return savedDelivery.id;
  }

  /**
   * Send email with the provided options
   */
  async sendEmail(options: EmailOptions): Promise<string> {
    if (!this.transporter) {
      this.logger.warn(
        `Email sending skipped (no transporter configured): ${options.subject} to ${options.to}`,
      );
      throw new Error('Email service not configured');
    }

    // Queue email for processing
    return this.queueEmail(options);
  }

  /**
   * Send email directly without queueing (for immediate sending)
   */
  private async sendEmailDirect(options: Omit<EmailOptions, 'type' | 'scheduledAt' | 'metadata'>): Promise<{ messageId: string }> {
    if (!this.transporter) {
      throw new Error('Email transporter not configured');
    }

    const mailOptions = {
      from: `"FYP Platform" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const info = await this.transporter.sendMail(mailOptions);
    return { messageId: info.messageId };
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
  async sendEmailVerification(data: EmailVerificationData): Promise<string> {
    const { html, text } = emailVerificationTemplate(data);

    return this.sendEmail({
      to: data.email,
      subject: 'Verify Your Email - FYP Platform',
      html,
      text,
      type: EmailType.VERIFICATION,
      metadata: { userId: data.email },
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: PasswordResetData): Promise<string> {
    const { html, text } = passwordResetTemplate(data);

    return this.sendEmail({
      to: data.email,
      subject: 'Reset Your Password - FYP Platform',
      html,
      text,
      type: EmailType.PASSWORD_RESET,
      metadata: { userId: data.email },
    });
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmailAfterVerification(
    data: WelcomeEmailData,
  ): Promise<string> {
    const { html, text } = welcomeTemplate(data);

    return this.sendEmail({
      to: data.email,
      subject: 'Welcome to FYP Platform!',
      html,
      text,
      type: EmailType.WELCOME,
      metadata: { userId: data.email, role: data.role },
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
                ${isActive
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

${isActive
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
   * Get email delivery status
   */
  async getEmailDeliveryStatus(deliveryId: string): Promise<EmailDeliveryStatus | null> {
    const delivery = await this.emailDeliveryRepository.findOne({
      where: { id: deliveryId },
    });

    if (!delivery) {
      return null;
    }

    return {
      id: delivery.id,
      status: delivery.status,
      messageId: delivery.messageId || undefined,
      errorMessage: delivery.errorMessage || undefined,
      retryCount: delivery.retryCount,
      sentAt: delivery.sentAt || undefined,
      deliveredAt: delivery.deliveredAt || undefined,
      failedAt: delivery.failedAt || undefined,
    };
  }

  /**
   * Get email delivery statistics
   */
  async getEmailDeliveryStats(startDate?: Date, endDate?: Date): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<EmailType, number>;
  }> {
    const query = this.emailDeliveryRepository.createQueryBuilder('delivery');

    if (startDate) {
      query.andWhere('delivery.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      query.andWhere('delivery.createdAt <= :endDate', { endDate });
    }

    const deliveries = await query.getMany();

    const stats = {
      total: deliveries.length,
      sent: deliveries.filter(d => d.status === EmailStatus.SENT).length,
      failed: deliveries.filter(d => d.status === EmailStatus.FAILED).length,
      pending: deliveries.filter(d => [EmailStatus.QUEUED, EmailStatus.SENDING].includes(d.status)).length,
      byType: {} as Record<EmailType, number>,
    };

    // Count by type
    Object.values(EmailType).forEach(type => {
      stats.byType[type] = deliveries.filter(d => d.type === type).length;
    });

    return stats;
  }

  /**
   * Schedule email for future delivery
   */
  async scheduleEmail(options: EmailOptions, scheduledAt: Date): Promise<string> {
    return this.sendEmail({
      ...options,
      scheduledAt,
    });
  }

  /**
   * Cancel scheduled email
   */
  async cancelScheduledEmail(deliveryId: string): Promise<boolean> {
    const delivery = await this.emailDeliveryRepository.findOne({
      where: { id: deliveryId, status: EmailStatus.QUEUED },
    });

    if (!delivery) {
      return false;
    }

    await this.emailDeliveryRepository.remove(delivery);

    // Remove from queue if present
    const queueIndex = this.emailQueue.findIndex(item => item.id === deliveryId);
    if (queueIndex !== -1) {
      this.emailQueue.splice(queueIndex, 1);
    }

    return true;
  }

  /**
   * Send test email (for development/testing purposes)
   */
  async sendTestEmail(to: string): Promise<string> {
    return this.sendEmail({
      to,
      subject: 'Test Email - FYP Platform',
      html: '<h1>Test Email</h1><p>This is a test email from the FYP Platform.</p>',
      text: 'Test Email\n\nThis is a test email from the FYP Platform.',
      type: EmailType.TEST,
      metadata: { testEmail: true },
    });
  }

  /**
   * Send immediate test email (bypass queue for testing)
   */
  async sendImmediateTestEmail(to: string): Promise<{ messageId: string }> {
    if (!this.transporter) {
      throw new Error('Email service not configured');
    }

    return this.sendEmailDirect({
      to,
      subject: 'Immediate Test Email - FYP Platform',
      html: '<h1>Immediate Test Email</h1><p>This email was sent immediately without queueing.</p>',
      text: 'Immediate Test Email\n\nThis email was sent immediately without queueing.',
    });
  }
}
