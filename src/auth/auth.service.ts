import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { PasswordService } from './services/password.service';
import { EmailService } from './services/email.service';
import { JwtTokenService } from './services/jwt.service';
import { AuditService } from './services/audit.service';
import { TokenManagementService } from './services/token-management.service';
import { TokenPair } from './interfaces/token.interface';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly auditService: AuditService,
    private readonly tokenManagementService: TokenManagementService,
  ) {}

  /**
   * Register a new user with email verification
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Omit<User, 'password'>; tokens: TokenPair }> {
    const { email, password, role, name, specializations, skills, interests } =
      registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate university email domain
    if (!this.emailService.isUniversityEmail(email)) {
      throw new BadRequestException(
        'Must use University of Ibadan email address',
      );
    }

    // Validate password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Hash password
    const hashedPassword = await this.passwordService.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken =
      this.emailService.generateVerificationToken();

    // Create user entity
    const user = this.userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      emailVerificationToken,
      isEmailVerified: false,
      isActive: true,
    });

    try {
      // Save user to database
      const savedUser = await this.userRepository.save(user);

      // Create profile based on role
      await this.createUserProfile(savedUser, {
        name,
        specializations,
        skills,
        interests,
      });

      // Generate JWT tokens
      const tokens = await this.jwtTokenService.generateTokenPair(savedUser);

      // Store refresh token
      await this.tokenManagementService.storeRefreshToken(
        savedUser.id,
        tokens.refreshToken,
      );

      // Send verification email
      await this.sendVerificationEmail(savedUser, emailVerificationToken);

      // Log successful registration
      this.logger.log(`User registered successfully: ${email} (${role})`);
      await this.auditService.logRegistration(savedUser.id, role);

      // Return user without password
      const { password: _, ...userWithoutPassword } = savedUser;

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      this.logger.error(`Registration failed for ${email}:`, error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: Omit<User, 'password'>; tokens: TokenPair }> {
    const { email, password } = loginDto;

    try {
      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        await this.auditService.logLoginFailure(
          email,
          'User not found',
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is active
      if (!user.isActive) {
        await this.auditService.logLoginFailure(
          email,
          'Account deactivated',
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException('Account has been deactivated');
      }

      // Verify password
      const isPasswordValid = await this.passwordService.comparePasswords(
        password,
        user.password,
      );
      if (!isPasswordValid) {
        this.logger.warn(`Failed login attempt for ${email}`);
        await this.auditService.logLoginFailure(
          email,
          'Invalid password',
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        await this.auditService.logLoginFailure(
          email,
          'Email not verified',
          ipAddress,
          userAgent,
        );
        throw new UnauthorizedException(
          'Please verify your email address before logging in',
        );
      }

      // Generate tokens
      const tokens = await this.jwtTokenService.generateTokenPair(user);

      // Store refresh token
      await this.tokenManagementService.storeRefreshToken(
        user.id,
        tokens.refreshToken,
      );

      // Log successful login
      this.logger.log(`User logged in successfully: ${email}`);
      await this.auditService.logLoginSuccess(user.id, ipAddress, userAgent);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens,
      };
    } catch (error) {
      // If it's already an UnauthorizedException, re-throw it
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // For any other error, log it and throw a generic error
      this.logger.error(`Login error for ${email}:`, error);
      await this.auditService.logLoginFailure(
        email,
        'System error',
        ipAddress,
        userAgent,
      );
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }

    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.emailVerificationToken = null;

    await this.userRepository.save(user);

    // Send welcome email
    await this.emailService.sendWelcomeEmailAfterVerification({
      email: user.email,
      name: user.email.split('@')[0], // Use email prefix as name for now
      role: user.role,
    });

    // Log email verification
    await this.auditService.logEmailVerification(user.id);

    this.logger.log(`Email verified successfully for user: ${user.email}`);
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification token
    const emailVerificationToken =
      this.emailService.generateVerificationToken();
    user.emailVerificationToken = emailVerificationToken;

    await this.userRepository.save(user);

    // Send verification email
    await this.sendVerificationEmail(user, emailVerificationToken);

    this.logger.log(`Verification email resent to: ${email}`);
  }

  /**
   * Refresh access and refresh tokens
   */
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    return this.tokenManagementService.refreshTokens(
      refreshToken,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    return this.tokenManagementService.logout(
      userId,
      refreshToken,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Logout user from all devices
   */
  async logoutFromAllDevices(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.tokenManagementService.revokeAllUserTokens(userId);
    await this.auditService.logLogout(userId, ipAddress, userAgent);
    this.logger.log(`User logged out from all devices: ${userId}`);
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return;
    }

    if (!user.isActive) {
      throw new BadRequestException('Account has been deactivated');
    }

    // Generate password reset token
    const resetToken = this.emailService.generateVerificationToken();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

    // Update user with reset token
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;

    await this.userRepository.save(user);

    // Send password reset email
    await this.emailService.sendPasswordReset({
      email: user.email,
      name: user.email.split('@')[0], // Use email prefix as name for now
      resetUrl: this.emailService.createPasswordResetUrl(resetToken),
      expiresIn: '1 hour',
    });

    this.logger.log(`Password reset email sent to: ${email}`);
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token) {
      throw new BadRequestException('Reset token is required');
    }

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Validate new password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      );
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(newPassword);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await this.userRepository.save(user);

    // Revoke all existing tokens for security
    await this.tokenManagementService.revokeAllUserTokens(user.id);

    // Log password reset
    await this.auditService.logPasswordResetComplete(user.id);

    this.logger.log(`Password reset successfully for user: ${user.email}`);
  }

  /**
   * Send verification email to user
   */
  private async sendVerificationEmail(
    user: User,
    token: string,
  ): Promise<void> {
    const verificationUrl = this.emailService.createVerificationUrl(token);

    await this.emailService.sendEmailVerification({
      email: user.email,
      name: user.email.split('@')[0], // Use email prefix as name for now
      verificationUrl,
    });
  }

  /**
   * Create user profile based on role
   */
  private async createUserProfile(
    user: User,
    profileData: {
      name: string;
      specializations?: string[];
      skills?: string[];
      interests?: string[];
    },
  ): Promise<void> {
    // Profile creation will be implemented when profile entities are available
    // For now, we'll just log the profile data
    this.logger.log(
      `Profile data for ${user.email} (${user.role}):`,
      profileData,
    );

    // TODO: Implement profile creation when StudentProfile and SupervisorProfile entities are available
    // if (user.role === UserRole.STUDENT) {
    //     const studentProfile = this.studentProfileRepository.create({
    //         user,
    //         name: profileData.name,
    //         skills: profileData.skills || [],
    //         interests: profileData.interests || [],
    //     });
    //     await this.studentProfileRepository.save(studentProfile);
    // } else if (user.role === UserRole.SUPERVISOR) {
    //     const supervisorProfile = this.supervisorProfileRepository.create({
    //         user,
    //         name: profileData.name,
    //         specializations: profileData.specializations || [],
    //     });
    //     await this.supervisorProfileRepository.save(supervisorProfile);
    // }
  }
}
