import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '../../entities/user.entity';
import { PasswordService } from '../services/password.service';
import { EmailService } from '../services/email.service';
import { JwtTokenService } from '../services/jwt.service';
import { AuditService } from '../services/audit.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let passwordService: PasswordService;
  let emailService: EmailService;
  let jwtTokenService: JwtTokenService;
  let auditService: AuditService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@ui.edu.ng',
    password: 'hashedPassword123',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokenPair = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPasswordService = {
    validatePasswordStrength: jest.fn(),
    hashPassword: jest.fn(),
    comparePasswords: jest.fn(),
  };

  const mockEmailService = {
    isUniversityEmail: jest.fn(),
    generateVerificationToken: jest.fn(),
    sendEmailVerification: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    createVerificationUrl: jest.fn(),
  };

  const mockJwtTokenService = {
    generateTokenPair: jest.fn(),
  };

  const mockAuditService = {
    logRegistration: jest.fn(),
    logLoginSuccess: jest.fn(),
    logLoginFailure: jest.fn(),
    logEmailVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: JwtTokenService,
          useValue: mockJwtTokenService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    passwordService = module.get<PasswordService>(PasswordService);
    emailService = module.get<EmailService>(EmailService);
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
    auditService = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'newuser@ui.edu.ng',
      password: 'ValidPass123!',
      role: UserRole.STUDENT,
      name: 'Test User',
    };

    it('should successfully register a new user', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);
      mockEmailService.isUniversityEmail.mockReturnValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue('hashedPassword123');
      mockEmailService.generateVerificationToken.mockReturnValue(
        'verification-token',
      );
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtTokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);
      mockAuditService.logRegistration.mockResolvedValue(undefined);

      // Act
      const result = await service.register(validRegisterDto);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        tokens: mockTokenPair,
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: validRegisterDto.email.toLowerCase() },
      });
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(
        validRegisterDto.password,
      );
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled();
      expect(mockAuditService.logRegistration).toHaveBeenCalledWith(
        mockUser.id,
        validRegisterDto.role,
      );
    });

    it('should throw ConflictException if user already exists', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(validRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: validRegisterDto.email.toLowerCase() },
      });
    });

    it('should throw BadRequestException for non-university email', async () => {
      // Arrange
      const invalidEmailDto = { ...validRegisterDto, email: 'test@gmail.com' };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockEmailService.isUniversityEmail.mockReturnValue(false);

      // Act & Assert
      await expect(service.register(invalidEmailDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockEmailService.isUniversityEmail).toHaveBeenCalledWith(
        invalidEmailDto.email,
      );
    });

    it('should throw BadRequestException for weak password', async () => {
      // Arrange
      const weakPasswordDto = { ...validRegisterDto, password: 'weak' };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockEmailService.isUniversityEmail.mockReturnValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: false,
        errors: ['Password too weak'],
      });

      // Act & Assert
      await expect(service.register(weakPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPasswordService.validatePasswordStrength).toHaveBeenCalledWith(
        weakPasswordDto.password,
      );
    });

    it('should handle database save errors gracefully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);
      mockEmailService.isUniversityEmail.mockReturnValue(true);
      mockPasswordService.validatePasswordStrength.mockReturnValue({
        isValid: true,
        errors: [],
      });
      mockPasswordService.hashPassword.mockResolvedValue('hashedPassword123');
      mockEmailService.generateVerificationToken.mockReturnValue(
        'verification-token',
      );
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.register(validRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@ui.edu.ng',
      password: 'ValidPass123!',
    };

    it('should successfully login with valid credentials', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordService.comparePasswords.mockResolvedValue(true);
      mockJwtTokenService.generateTokenPair.mockResolvedValue(mockTokenPair);
      mockAuditService.logLoginSuccess.mockResolvedValue(undefined);

      // Act
      const result = await service.login(validLoginDto);

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        }),
        tokens: mockTokenPair,
      });
      expect(result.user).not.toHaveProperty('password');
      expect(mockPasswordService.comparePasswords).toHaveBeenCalledWith(
        validLoginDto.password,
        mockUser.password,
      );
      expect(mockAuditService.logLoginSuccess).toHaveBeenCalledWith(
        mockUser.id,
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);
      mockAuditService.logLoginFailure.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        validLoginDto.email,
        'User not found',
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockPasswordService.comparePasswords.mockResolvedValue(false);
      mockAuditService.logLoginFailure.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        validLoginDto.email,
        'Invalid password',
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      // Arrange
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);
      mockAuditService.logLoginFailure.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        validLoginDto.email,
        'Account deactivated',
        undefined,
        undefined,
      );
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      // Arrange
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockPasswordService.comparePasswords.mockResolvedValue(true);
      mockAuditService.logLoginFailure.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockAuditService.logLoginFailure).toHaveBeenCalledWith(
        validLoginDto.email,
        'Email not verified',
        undefined,
        undefined,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      // Arrange
      const token = 'valid-verification-token';
      const unverifiedUser = {
        ...mockUser,
        isEmailVerified: false,
        emailVerificationToken: token,
      };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockUserRepository.save.mockResolvedValue({
        ...unverifiedUser,
        isEmailVerified: true,
      });
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);
      mockAuditService.logEmailVerification.mockResolvedValue(undefined);

      // Act
      await service.verifyEmail(token);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { emailVerificationToken: token },
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isEmailVerified: true,
          emailVerificationToken: null,
        }),
      );
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
      expect(mockAuditService.logEmailVerification).toHaveBeenCalledWith(
        unverifiedUser.id,
      );
    });

    it('should throw BadRequestException for invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for already verified email', async () => {
      // Arrange
      const token = 'valid-token';
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      mockUserRepository.findOne.mockResolvedValue(verifiedUser);

      // Act & Assert
      await expect(service.verifyEmail(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for empty token', async () => {
      // Act & Assert
      await expect(service.verifyEmail('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendEmailVerification', () => {
    it('should successfully resend verification email', async () => {
      // Arrange
      const email = 'test@ui.edu.ng';
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);
      mockEmailService.generateVerificationToken.mockReturnValue('new-token');
      mockUserRepository.save.mockResolvedValue(unverifiedUser);
      mockEmailService.sendEmailVerification.mockResolvedValue(undefined);

      // Act
      await service.resendEmailVerification(email);

      // Assert
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: email.toLowerCase() },
      });
      expect(mockEmailService.generateVerificationToken).toHaveBeenCalled();
      expect(mockEmailService.sendEmailVerification).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      const email = 'nonexistent@ui.edu.ng';
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resendEmailVerification(email)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for already verified email', async () => {
      // Arrange
      const email = 'test@ui.edu.ng';
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      mockUserRepository.findOne.mockResolvedValue(verifiedUser);

      // Act & Assert
      await expect(service.resendEmailVerification(email)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
