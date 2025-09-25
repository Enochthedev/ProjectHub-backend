import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { User } from '../../entities/user.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { RegisterDto } from '../../dto/auth/register.dto';
import { LoginDto } from '../../dto/auth/login.dto';
import { RefreshTokenDto } from '../../dto/auth/refresh-token.dto';
import { JwtTokenService } from '../services/jwt.service';
import { PasswordService } from '../services/password.service';
import { EmailService } from '../services/email.service';
import { AuditService } from '../services/audit.service';
import { TokenManagementService } from '../services/token-management.service';
import { TokenCleanupService } from '../services/token-cleanup.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { AuthThrottlerGuard } from '../../common/guards/auth-throttler.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let userRepository: any;

  const mockUser = {
    id: 'test-user-id',
    email: 'test@ui.edu.ng',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    logoutFromAllDevices: jest.fn(),
    verifyEmail: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    resendEmailVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000, // 60 seconds in milliseconds
            limit: 100, // High limit for testing
          },
        ]),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, AuditLog, RefreshToken],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, AuditLog, RefreshToken]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        JwtTokenService,
        PasswordService,
        EmailService,
        AuditService,
        TokenManagementService,
        TokenCleanupService,
        JwtStrategy,
        AuthThrottlerGuard,
        JwtAuthGuard,
      ],
    }).compile();

    app = module.createNestApplication();
    authService = module.get<AuthService>(AuthService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'student@ui.edu.ng',
      password: 'StrongPass123!',
      role: UserRole.STUDENT,
      name: 'Test Student',
      skills: ['JavaScript', 'TypeScript'],
      interests: ['Web Development', 'AI'],
    };

    it('should register a new user successfully', async () => {
      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validRegisterDto)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message:
          'Registration successful. Please check your email to verify your account.',
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      expect(mockAuthService.register).toHaveBeenCalledWith(validRegisterDto);
    });

    it('should reject registration with invalid email domain', async () => {
      const invalidDto = {
        ...validRegisterDto,
        email: 'student@gmail.com',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      const invalidDto = {
        ...validRegisterDto,
        password: 'weak',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should reject registration with missing required fields', async () => {
      const invalidDto = {
        email: 'student@ui.edu.ng',
        password: 'StrongPass123!',
        // Missing role and name
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidDto)
        .expect(400);

      expect(mockAuthService.register).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/login', () => {
    const validLoginDto: LoginDto = {
      email: 'student@ui.edu.ng',
      password: 'StrongPass123!',
    };

    it('should login user successfully', async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        tokens: mockTokens,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(validLoginDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Login successful',
        data: {
          user: mockUser,
          tokens: mockTokens,
        },
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(
        validLoginDto,
        expect.any(String), // IP address
        expect.any(String), // User agent
      );
    });

    it('should reject login with invalid email format', async () => {
      const invalidDto = {
        ...validLoginDto,
        email: 'invalid-email',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should reject login with missing password', async () => {
      const invalidDto = {
        email: 'student@ui.edu.ng',
        // Missing password
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(invalidDto)
        .expect(400);

      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/refresh', () => {
    const validRefreshDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh tokens successfully', async () => {
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(validRefreshDto)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Tokens refreshed successfully',
        data: { tokens: mockTokens },
      });

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        validRefreshDto.refreshToken,
        expect.any(String), // IP address
        expect.any(String), // User agent
      );
    });

    it('should reject refresh with missing token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(mockAuthService.refreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('GET /auth/verify-email', () => {
    it('should verify email successfully', async () => {
      const token = 'valid-verification-token';
      mockAuthService.verifyEmail.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message:
          'Email verified successfully. You can now log in to your account.',
      });

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('should reject verification with missing token', async () => {
      await request(app.getHttpServer()).get('/auth/verify-email').expect(400);

      expect(mockAuthService.verifyEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should request password reset successfully', async () => {
      const email = 'student@ui.edu.ng';
      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message:
          'If an account with that email exists, a password reset link has been sent.',
      });

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(email);
    });

    it('should reject request with invalid email domain', async () => {
      const email = 'student@gmail.com';

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(400);

      expect(mockAuthService.requestPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'NewStrongPass123!',
      };
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message:
          'Password reset successfully. Please log in with your new password.',
      });

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        resetData.token,
        resetData.newPassword,
      );
    });

    it('should reject reset with weak password', async () => {
      const resetData = {
        token: 'valid-reset-token',
        newPassword: 'weak',
      };

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email successfully', async () => {
      const email = 'student@ui.edu.ng';
      mockAuthService.resendEmailVerification.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Verification email has been resent.',
      });

      expect(mockAuthService.resendEmailVerification).toHaveBeenCalledWith(
        email,
      );
    });
  });
});
