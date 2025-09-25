import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, MoreThanOrEqual } from 'typeorm';
import { User } from '../entities/user.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import {
  UserListQueryDto,
  UserListResponseDto,
  UserSummaryDto,
  UpdateUserStatusDto,
} from '../dto/admin';
import { UserRole } from '../common/enums/user-role.enum';
import { PasswordService } from '../auth/services/password.service';
import { EmailService } from '../auth/services/email.service';
import { AuditService } from '../auth/services/audit.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get paginated list of users with search and filtering
   */
  async getUserList(queryDto: UserListQueryDto): Promise<UserListResponseDto> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      isEmailVerified,
    } = queryDto;

    // Build where conditions
    const where: FindOptionsWhere<User> = {};

    if (role !== undefined) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isEmailVerified !== undefined) {
      where.isEmailVerified = isEmailVerified;
    }

    // Build query with search
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('user.supervisorProfile', 'supervisorProfile');

    // Apply where conditions
    Object.entries(where).forEach(([key, value]) => {
      queryBuilder.andWhere(`user.${key} = :${key}`, { [key]: value });
    });

    // Apply search if provided
    if (search) {
      queryBuilder.andWhere(
        '(user.email ILIKE :search OR studentProfile.name ILIKE :search OR supervisorProfile.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply pagination and ordering
    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    // Transform to response DTOs
    const userSummaries: UserSummaryDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      name: user.studentProfile?.name || user.supervisorProfile?.name,
    }));

    return {
      users: userSummaries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed user information by ID
   */
  async getUserById(userId: string): Promise<User> {
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
   * Update user account status (activate/deactivate)
   */
  async updateUserStatus(
    userId: string,
    statusDto: UpdateUserStatusDto,
    adminId: string,
    ipAddress?: string,
  ): Promise<User> {
    const user = await this.getUserById(userId);

    // Prevent admin from deactivating themselves
    if (userId === adminId && !statusDto.isActive) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    // Prevent deactivating other admin accounts
    if (
      user.role === UserRole.ADMIN &&
      !statusDto.isActive &&
      userId !== adminId
    ) {
      throw new ForbiddenException('Cannot deactivate other admin accounts');
    }

    const previousStatus = user.isActive;
    user.isActive = statusDto.isActive;

    const updatedUser = await this.userRepository.save(user);

    // If deactivating user, invalidate all their tokens
    if (!statusDto.isActive) {
      await this.invalidateUserTokens(userId);
    }

    // Log the admin action
    await this.auditService.logEvent({
      userId: adminId,
      action: statusDto.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      resource: 'User',
      ipAddress,
      details: {
        targetUserId: userId,
        previousStatus,
        newStatus: statusDto.isActive,
      },
    });

    return updatedUser;
  }

  /**
   * Reset user password (admin action)
   */
  async resetUserPassword(
    userId: string,
    adminId: string,
    ipAddress?: string,
  ): Promise<{ temporaryPassword: string }> {
    const user = await this.getUserById(userId);

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword =
      await this.passwordService.hashPassword(temporaryPassword);

    // Update user password and force password reset on next login
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await this.userRepository.save(user);

    // Invalidate all user tokens to force re-login
    await this.invalidateUserTokens(userId);

    // Send email with temporary password
    try {
      await this.emailService.sendPasswordResetByAdmin(
        user.email,
        temporaryPassword,
      );
    } catch (error) {
      // Log email error but don't fail the operation
      console.error('Failed to send password reset email:', error);
    }

    // Log the admin action
    await this.auditService.logEvent({
      userId: adminId,
      action: 'ADMIN_PASSWORD_RESET',
      resource: 'User',
      ipAddress,
      details: { targetUserId: userId },
    });

    return { temporaryPassword };
  }

  /**
   * Get user statistics for admin dashboard
   */
  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    usersByRole: Record<UserRole, number>;
    recentRegistrations: number;
  }> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { isActive: true },
    });
    const verifiedUsers = await this.userRepository.count({
      where: { isEmailVerified: true },
    });

    // Get user counts by role
    const usersByRole = {} as Record<UserRole, number>;
    for (const role of Object.values(UserRole)) {
      usersByRole[role] = await this.userRepository.count({ where: { role } });
    }

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRegistrations = await this.userRepository.count({
      where: {
        createdAt: MoreThanOrEqual(sevenDaysAgo),
      },
    });

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      usersByRole,
      recentRegistrations,
    };
  }

  /**
   * Search users across all profiles
   */
  async searchUsers(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<UserListResponseDto> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studentProfile', 'studentProfile')
      .leftJoinAndSelect('user.supervisorProfile', 'supervisorProfile')
      .where(
        `(
                    user.email ILIKE :searchTerm OR 
                    studentProfile.name ILIKE :searchTerm OR 
                    supervisorProfile.name ILIKE :searchTerm OR
                    studentProfile.skills::text ILIKE :searchTerm OR
                    studentProfile.interests::text ILIKE :searchTerm OR
                    supervisorProfile.specializations::text ILIKE :searchTerm
                )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    const [users, total] = await queryBuilder.getManyAndCount();

    const userSummaries: UserSummaryDto[] = users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      name: user.studentProfile?.name || user.supervisorProfile?.name,
    }));

    return {
      users: userSummaries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Invalidate all refresh tokens for a user
   */
  private async invalidateUserTokens(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { user: { id: userId } },
      { isRevoked: true },
    );
  }

  /**
   * Generate a secure temporary password
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';

    // Ensure at least one character from each required category
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // lowercase
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // uppercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // number
    password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // special character

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}
