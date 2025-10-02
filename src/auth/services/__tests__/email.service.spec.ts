import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '../email.service';
import { EmailDelivery, EmailStatus, EmailType } from '../../../entities/email-delivery.entity';

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let emailDeliveryRepository: Repository<EmailDelivery>;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        EMAIL_USER: 'test@example.com',
        EMAIL_PASSWORD: 'test-password',
        EMAIL_HOST: 'smtp.test.com',
        EMAIL_PORT: 587,
        EMAIL_SECURE: false,
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockEmailDeliveryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(EmailDelivery),
          useValue: mockEmailDeliveryRepository,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
    emailDeliveryRepository = module.get<Repository<EmailDelivery>>(
      getRepositoryToken(EmailDelivery),
    );

    // Mock the transporter to avoid actual email sending
    (service as any).transporter = {
      verify: jest.fn((callback) => callback(null, true)),
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateVerificationToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = service.generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(service.isValidEmail('test@example.com')).toBe(true);
      expect(service.isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(service.isValidEmail('')).toBe(false);
      expect(service.isValidEmail('invalid-email')).toBe(false);
      expect(service.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isUniversityEmail', () => {
    it('should accept valid university email domains', () => {
      expect(service.isUniversityEmail('student@ui.edu.ng')).toBe(true);
      expect(service.isUniversityEmail('user@stu.ui.edu.ng')).toBe(true);
    });

    it('should reject non-university email domains', () => {
      expect(service.isUniversityEmail('test@gmail.com')).toBe(false);
      expect(service.isUniversityEmail('user@yahoo.com')).toBe(false);
    });
  });
});