import { EmailType, EmailStatus } from '../../entities/email-delivery.entity';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: EmailType;
  scheduledAt?: Date;
  metadata?: Record<string, any>;
}

export interface EmailVerificationData {
  name: string;
  email: string;
  verificationUrl: string;
}

export interface PasswordResetData {
  name: string;
  email: string;
  resetUrl: string;
  expiresIn: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
  role: string;
}

export interface EmailDeliveryStatus {
  id: string;
  status: EmailStatus;
  messageId?: string;
  errorMessage?: string;
  retryCount: number;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
}

export interface EmailQueueItem {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: EmailType;
  scheduledAt?: Date;
  retryCount: number;
  maxRetries: number;
  metadata?: Record<string, any>;
}
