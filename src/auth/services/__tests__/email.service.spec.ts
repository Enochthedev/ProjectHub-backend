import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockTransporter = {
    sendMail: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        EMAIL_HOST: 'smtp.gmail.com',
        EMAIL_PORT: 587,
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'password',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key as keyof typeof config];
    }),
  };

  beforeEach(async () => {
    // Mock nodemailer.createTransport before creating the service
    mockedNodemailer.createTransport.mockReturnValue(mockTransporter as any);
    mockTransporter.verify.mockImplementation((callback) => {
      callback(null, true);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailOptions = {
        to: 'test@ui.edu.ng',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendEmail(emailOptions);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: '"FYP Platform" <test@example.com>',
        to: emailOptions.to,
        subject: emailOptions.subject,
        html: emailOptions.html,
        text: emailOptions.text,
      });
    });

    it('should throw error when email sending fails', async () => {
      const emailOptions = {
        to: 'test@ui.edu.ng',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
        text: 'Test text',
      };

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(service.sendEmail(emailOptions)).rejects.toThrow(
        'Failed to send email',
      );
    });
  });

  describe('generateVerificationToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = service.generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate different tokens on multiple calls', () => {
      const token1 = service.generateVerificationToken();
      const token2 = service.generateVerificationToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = service.generatePasswordResetToken();
      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it('should generate different tokens on multiple calls', () => {
      const token1 = service.generatePasswordResetToken();
      const token2 = service.generatePasswordResetToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('should generate consistent hash for same token', () => {
      const token = 'test-token';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'test-token-1';
      const token2 = 'test-token-2';
      const hash1 = service.hashToken(token1);
      const hash2 = service.hashToken(token2);
      expect(hash1).not.toBe(hash2);
    });

    it('should generate 64-character hex hash', () => {
      const token = 'test-token';
      const hash = service.hashToken(token);
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('sendEmailVerification', () => {
    it('should send email verification with correct data', async () => {
      const verificationData = {
        name: 'John Doe',
        email: 'john@ui.edu.ng',
        verificationUrl: 'http://localhost:3000/verify?token=abc123',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendEmailVerification(verificationData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: verificationData.email,
          subject: 'Verify Your Email - FYP Platform',
          html: expect.stringContaining(verificationData.name),
          text: expect.stringContaining(verificationData.name),
        }),
      );
    });
  });

  describe('sendPasswordReset', () => {
    it('should send password reset email with correct data', async () => {
      const resetData = {
        name: 'John Doe',
        email: 'john@ui.edu.ng',
        resetUrl: 'http://localhost:3000/reset?token=abc123',
        expiresIn: '1 hour',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendPasswordReset(resetData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: resetData.email,
          subject: 'Reset Your Password - FYP Platform',
          html: expect.stringContaining(resetData.name),
          text: expect.stringContaining(resetData.name),
        }),
      );
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct data', async () => {
      const welcomeData = {
        name: 'John Doe',
        email: 'john@ui.edu.ng',
        role: 'student',
      };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendWelcomeEmail(welcomeData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: welcomeData.email,
          subject: 'Welcome to FYP Platform!',
          html: expect.stringContaining(welcomeData.name),
          text: expect.stringContaining(welcomeData.name),
        }),
      );
    });
  });

  describe('createVerificationUrl', () => {
    it('should create verification URL with token', () => {
      const token = 'abc123';
      const url = service.createVerificationUrl(token);
      expect(url).toBe('http://localhost:3000/auth/verify-email?token=abc123');
    });
  });

  describe('createPasswordResetUrl', () => {
    it('should create password reset URL with token', () => {
      const token = 'abc123';
      const url = service.createPasswordResetUrl(token);
      expect(url).toBe(
        'http://localhost:3000/auth/reset-password?token=abc123',
      );
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'student@ui.edu.ng',
      ];

      validEmails.forEach((email) => {
        expect(service.isValidEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..name@example.com',
        'user@.com',
        '',
      ];

      invalidEmails.forEach((email) => {
        const result = service.isValidEmail(email);
        expect(result).toBe(false);
      });
    });
  });

  describe('isUniversityEmail', () => {
    it('should return true for UI email addresses', () => {
      const uiEmails = [
        'student@ui.edu.ng',
        'STUDENT@UI.EDU.NG',
        'test.user@ui.edu.ng',
      ];

      uiEmails.forEach((email) => {
        expect(service.isUniversityEmail(email)).toBe(true);
      });
    });

    it('should return false for non-UI email addresses', () => {
      const nonUiEmails = [
        'student@gmail.com',
        'user@yahoo.com',
        'test@example.com',
        'student@ui.edu.com',
      ];

      nonUiEmails.forEach((email) => {
        expect(service.isUniversityEmail(email)).toBe(false);
      });
    });
  });

  describe('sendTestEmail', () => {
    it('should send test email successfully', async () => {
      const testEmail = 'test@ui.edu.ng';
      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
      });

      await service.sendTestEmail(testEmail);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: testEmail,
          subject: 'Test Email - FYP Platform',
          html: expect.stringContaining('Test Email'),
          text: expect.stringContaining('Test Email'),
        }),
      );
    });
  });
});
