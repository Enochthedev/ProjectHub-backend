import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { PasswordService } from './services/password.service';
import { EmailService } from './services/email.service';
import { JwtTokenService } from './services/jwt.service';
import { AuditService } from './services/audit.service';
import { TokenManagementService } from './services/token-management.service';
import { TokenPair } from './interfaces/token.interface';
import { UserRole } from '../common/enums/user-role.enum';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly auditService: AuditService,
    private readonly tokenManagementService: TokenManagementService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService?: NotificationService, // Optional to avoid circular dependency
  ) { }

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
      isEmailVerified: this.configService.get('NODE_ENV') === 'development', // Auto-verify in development
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

      // Send verification email (skip in development)
      if (this.configService.get('NODE_ENV') !== 'development') {
        await this.sendVerificationEmail(savedUser, emailVerificationToken);
      } else {
        this.logger.log(
          `Skipping email verification in development mode for: ${email}`,
        );
      }

      // Log successful registration
      this.logger.log(`User registered successfully: ${email} (${role})`);
      await this.auditService.logRegistration(savedUser.id, role);

      // Get user with profile data
      const userWithProfile = await this.getUserWithProfile(savedUser.id);
      const { password: _, ...userWithoutPassword } = userWithProfile;

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

      // Get user with profile data
      const userWithProfile = await this.getUserWithProfile(user.id);
      const { password: _, ...userWithoutPassword } = userWithProfile;

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
    try {
      if (user.role === UserRole.STUDENT) {
        const studentProfile = this.studentProfileRepository.create({
          user,
          name: profileData.name,
          skills: profileData.skills || [],
          interests: profileData.interests || [],
          preferredSpecializations: profileData.specializations || [],
        });
        await this.studentProfileRepository.save(studentProfile);
        this.logger.log(`Created student profile for user: ${user.email}`);
      } else if (user.role === UserRole.SUPERVISOR) {
        const supervisorProfile = this.supervisorProfileRepository.create({
          user,
          name: profileData.name,
          specializations: profileData.specializations || [],
          isAvailable: true,
          maxStudents: 5, // Default capacity
        });
        await this.supervisorProfileRepository.save(supervisorProfile);
        this.logger.log(`Created supervisor profile for user: ${user.email}`);
      }

      // Initialize default notification preferences for the user
      if (this.notificationService) {
        await this.notificationService.initializeDefaultPreferences(
          user.id,
          user.role,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to create profile for user ${user.email}:`,
        error,
      );
      throw new BadRequestException('Failed to create user profile');
    }
  }

  /**
   * Get user with profile data
   */
  private async getUserWithProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studentProfile', 'supervisorProfile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<Omit<User, 'password'> & { profile?: any }> {
    const user = await this.getUserWithProfile(userId);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    // Format profile data based on role
    const result: Omit<User, 'password'> & { profile?: any } = userWithoutPassword;

    if (user.role === UserRole.STUDENT && user.studentProfile) {
      result.profile = user.studentProfile;
    } else if (user.role === UserRole.SUPERVISOR && user.supervisorProfile) {
      result.profile = user.supervisorProfile;
    }

    return result;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: any,
  ): Promise<Omit<User, 'password'> & { profile?: any }> {
    const user = await this.getUserWithProfile(userId);

    try {
      if (user.role === UserRole.STUDENT && user.studentProfile) {
        // Update student profile
        const profileUpdate: Partial<StudentProfile> = {};

        if (updateData.firstName || updateData.lastName) {
          // Combine first and last name into name field
          const firstName = updateData.firstName || '';
          const lastName = updateData.lastName || '';
          profileUpdate.name = `${firstName} ${lastName}`.trim();
        }
        if (updateData.specialization) {
          profileUpdate.preferredSpecializations = [updateData.specialization];
        }
        if (updateData.year) {
          profileUpdate.currentYear = updateData.year;
        }
        if (updateData.interests) {
          profileUpdate.interests = updateData.interests;
        }
        if (updateData.skills) {
          profileUpdate.skills = updateData.skills;
        }

        await this.studentProfileRepository.update(
          user.studentProfile.id,
          profileUpdate,
        );

      } else if (user.role === UserRole.SUPERVISOR && user.supervisorProfile) {
        // Update supervisor profile
        const profileUpdate: Partial<SupervisorProfile> = {};

        if (updateData.name) {
          profileUpdate.name = updateData.name;
        }
        if (updateData.specializations) {
          profileUpdate.specializations = updateData.specializations;
        }
        if (updateData.capacity !== undefined) {
          profileUpdate.maxStudents = updateData.capacity;
        }
        if (updateData.isAvailable !== undefined) {
          profileUpdate.isAvailable = updateData.isAvailable;
        }

        await this.supervisorProfileRepository.update(
          user.supervisorProfile.id,
          profileUpdate,
        );
      }

      // Log the profile update
      await this.auditService.logEvent({
        userId,
        action: 'PROFILE_UPDATED',
        resource: 'profile',
        details: { updatedFields: Object.keys(updateData) },
      });

      // Return updated profile
      return this.getProfile(userId);

    } catch (error) {
      this.logger.error(`Failed to update profile for user ${userId}:`, error);
      throw new BadRequestException('Failed to update profile');
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.comparePasswords(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await this.passwordService.hashPassword(newPassword);

    // Update password
    await this.userRepository.update(userId, { password: hashedNewPassword });

    // Log password change
    await this.auditService.logEvent({
      userId,
      action: 'PASSWORD_CHANGED',
      resource: 'auth',
    });

    this.logger.log(`Password changed for user: ${user.email}`);
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password is incorrect');
    }

    try {
      // Delete related profile data
      if (user.role === UserRole.STUDENT) {
        await this.studentProfileRepository.delete({ user: { id: userId } });
      } else if (user.role === UserRole.SUPERVISOR) {
        await this.supervisorProfileRepository.delete({ user: { id: userId } });
      }

      // Revoke all tokens
      await this.tokenManagementService.revokeAllUserTokens(userId);

      // Log account deletion
      await this.auditService.logEvent({
        userId,
        action: 'ACCOUNT_DELETED',
        resource: 'auth',
      });

      // Delete user
      await this.userRepository.delete(userId);

      this.logger.log(`Account deleted for user: ${user.email}`);

    } catch (error) {
      this.logger.error(`Failed to delete account for user ${userId}:`, error);
      throw new BadRequestException('Failed to delete account');
    }
  }

  /**
   * Export user data
   */
  async exportUserData(
    userId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const user = await this.getUserWithProfile(userId);

    try {
      // Collect all user data
      const userData = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        profile:
          user.role === UserRole.STUDENT
            ? user.studentProfile
            : user.supervisorProfile,
        // Add other related data as needed (bookmarks, conversations, etc.)
      };

      // In a real implementation, you would:
      // 1. Generate a secure file with the data
      // 2. Store it temporarily in a secure location
      // 3. Return a signed URL that expires

      // For now, return a mock URL
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

      const downloadUrl = `${this.configService.get('APP_URL')}/api/auth/download-data/${userId}?token=mock-token`;

      // Log data export request
      await this.auditService.logEvent({
        userId,
        action: 'DATA_EXPORTED',
        resource: 'profile',
      });

      return {
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
      };

    } catch (error) {
      this.logger.error(`Failed to export data for user ${userId}:`, error);
      throw new BadRequestException('Failed to export user data');
    }
  }

  /**
   * Get user settings (placeholder - would need UserSettings entity)
   */
  async getUserSettings(userId: string): Promise<any> {
    // This would typically fetch from a UserSettings entity
    // For now, return default settings
    return {
      id: `settings-${userId}`,
      userId,
      notificationPreferences: {
        emailNotifications: true,
        milestoneReminders: true,
        projectUpdates: true,
        aiAssistantUpdates: false,
        weeklyDigest: true,
        marketingEmails: false,
      },
      privacySettings: {
        profileVisibility: 'public',
        showEmail: false,
        showProjects: true,
        allowDirectMessages: true,
        dataProcessingConsent: true,
      },
      language: 'en',
      timezone: 'UTC',
      theme: 'system',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update notification preferences (placeholder)
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: any,
  ): Promise<any> {
    // This would typically update a UserSettings entity
    // For now, return the updated preferences
    const settings = await this.getUserSettings(userId);
    settings.notificationPreferences = {
      ...settings.notificationPreferences,
      ...preferences,
    };
    settings.updatedAt = new Date().toISOString();

    // Log settings update
    await this.auditService.logEvent({
      userId,
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      resource: 'settings',
      details: { preferences },
    });

    return settings;
  }

  /**
   * Update privacy settings (placeholder)
   */
  async updatePrivacySettings(
    userId: string,
    privacySettings: any,
  ): Promise<any> {
    // This would typically update a UserSettings entity
    // For now, return the updated settings
    const settings = await this.getUserSettings(userId);
    settings.privacySettings = {
      ...settings.privacySettings,
      ...privacySettings,
    };
    settings.updatedAt = new Date().toISOString();

    // Log settings update
    await this.auditService.logEvent({
      userId,
      action: 'PRIVACY_SETTINGS_UPDATED',
      resource: 'settings',
      details: { privacySettings },
    });

    return settings;
  }

  /**
   * Update general settings (placeholder)
   */
  async updateGeneralSettings(
    userId: string,
    generalSettings: any,
  ): Promise<any> {
    // This would typically update a UserSettings entity
    // For now, return the updated settings
    const settings = await this.getUserSettings(userId);

    if (generalSettings.language) {
      settings.language = generalSettings.language;
    }
    if (generalSettings.timezone) {
      settings.timezone = generalSettings.timezone;
    }
    if (generalSettings.theme) {
      settings.theme = generalSettings.theme;
    }

    settings.updatedAt = new Date().toISOString();

    // Log settings update
    await this.auditService.logEvent({
      userId,
      action: 'GENERAL_SETTINGS_UPDATED',
      resource: 'settings',
      details: { generalSettings },
    });

    return settings;
  }
}
