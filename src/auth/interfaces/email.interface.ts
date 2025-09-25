export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
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
