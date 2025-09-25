import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { UserRole } from '../common/enums/user-role.enum';

export interface UserGrowthAnalytics {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  usersByRole: Record<UserRole, number>;
  growthTrend: Array<{
    date: string;
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
  }>;
  registrationsByMonth: Array<{
    month: string;
    count: number;
    role: UserRole;
  }>;
}

export interface UserActivityMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  topActiveUsers: Array<{
    userId: string;
    email: string;
    name?: string;
    role: UserRole;
    activityScore: number;
    lastActive: Date;
  }>;
  activityByHour: Array<{
    hour: number;
    count: number;
  }>;
  activityByDay: Array<{
    day: string;
    count: number;
  }>;
}

export interface UserEngagementMetrics {
  profileCompletionRate: number;
  emailVerificationRate: number;
  averageProfileCompleteness: number;
  engagementByRole: Record<
    UserRole,
    {
      totalUsers: number;
      activeUsers: number;
      profileCompletionRate: number;
      averageCompleteness: number;
    }
  >;
  retentionRates: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export interface UserDemographicAnalysis {
  roleDistribution: Array<{
    role: UserRole;
    count: number;
    percentage: number;
  }>;
  studentAnalytics: {
    totalStudents: number;
    byYear: Array<{
      year: number;
      count: number;
    }>;
    byGpaRange: Array<{
      range: string;
      count: number;
    }>;
    topSkills: Array<{
      skill: string;
      count: number;
    }>;
    topInterests: Array<{
      interest: string;
      count: number;
    }>;
    topSpecializations: Array<{
      specialization: string;
      count: number;
    }>;
  };
  supervisorAnalytics: {
    totalSupervisors: number;
    availableSupervisors: number;
    averageCapacity: number;
    capacityUtilization: number;
    topSpecializations: Array<{
      specialization: string;
      count: number;
    }>;
    byCapacityRange: Array<{
      range: string;
      count: number;
    }>;
  };
}

export interface UserReportOptions {
  startDate?: Date;
  endDate?: Date;
  role?: UserRole;
  includeInactive?: boolean;
  groupBy?: 'day' | 'week' | 'month';
  metrics?: Array<'growth' | 'activity' | 'engagement' | 'demographics'>;
}

export interface ComprehensiveUserReport {
  reportId: string;
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    growthRate: number;
  };
  growth?: UserGrowthAnalytics;
  activity?: UserActivityMetrics;
  engagement?: UserEngagementMetrics;
  demographics?: UserDemographicAnalysis;
}

/**
 * Admin User Analytics Service
 *
 * Provides comprehensive user analytics and reporting including:
 * - User growth analytics and trend analysis
 * - User activity monitoring and engagement metrics
 * - User demographic analysis and reporting
 * - Comprehensive reporting with customizable metrics
 * - Performance optimized queries with caching
 */
@Injectable()
export class AdminUserAnalyticsService {
  private readonly logger = new Logger(AdminUserAnalyticsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Get comprehensive user growth analytics
   */
  async getUserGrowthAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserGrowthAnalytics> {
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 6, 1); // 6 months ago
    const defaultEndDate = now;

    const periodStart = startDate || defaultStartDate;
    const periodEnd = endDate || defaultEndDate;

    // Get basic user counts
    const [totalUsers, activeUsers, verifiedUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({ where: { isEmailVerified: true } }),
    ]);

    // Get users by role
    const usersByRole = {} as Record<UserRole, number>;
    for (const role of Object.values(UserRole)) {
      usersByRole[role] = await this.userRepository.count({ where: { role } });
    }

    // Get growth trend data
    const growthTrend = await this.getGrowthTrendData(periodStart, periodEnd);

    // Get registrations by month
    const registrationsByMonth = await this.getRegistrationsByMonth(
      periodStart,
      periodEnd,
    );

    return {
      totalUsers,
      activeUsers,
      verifiedUsers,
      usersByRole,
      growthTrend,
      registrationsByMonth,
    };
  }

  /**
   * Get user activity metrics
   */
  async getUserActivityMetrics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<UserActivityMetrics> {
    const now = new Date();
    const defaultStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const defaultEndDate = now;

    const periodStart = startDate || defaultStartDate;
    const periodEnd = endDate || defaultEndDate;

    // Calculate active user counts based on audit logs
    const [dailyActiveUsers, weeklyActiveUsers, monthlyActiveUsers] =
      await Promise.all([
        this.getActiveUsersCount(1), // Last 1 day
        this.getActiveUsersCount(7), // Last 7 days
        this.getActiveUsersCount(30), // Last 30 days
      ]);

    // Get top active users
    const topActiveUsers = await this.getTopActiveUsers(10);

    // Get activity patterns
    const [activityByHour, activityByDay] = await Promise.all([
      this.getActivityByHour(periodStart, periodEnd),
      this.getActivityByDay(periodStart, periodEnd),
    ]);

    return {
      dailyActiveUsers,
      weeklyActiveUsers,
      monthlyActiveUsers,
      averageSessionDuration: 0, // Would need session tracking to implement
      topActiveUsers,
      activityByHour,
      activityByDay,
    };
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(): Promise<UserEngagementMetrics> {
    // Calculate profile completion rates
    const totalUsers = await this.userRepository.count();
    const usersWithProfiles = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.studentProfile', 'studentProfile')
      .leftJoin('user.supervisorProfile', 'supervisorProfile')
      .where(
        'studentProfile.id IS NOT NULL OR supervisorProfile.id IS NOT NULL',
      )
      .getCount();

    const profileCompletionRate =
      totalUsers > 0 ? (usersWithProfiles / totalUsers) * 100 : 0;

    // Calculate email verification rate
    const verifiedUsers = await this.userRepository.count({
      where: { isEmailVerified: true },
    });
    const emailVerificationRate =
      totalUsers > 0 ? (verifiedUsers / totalUsers) * 100 : 0;

    // Calculate average profile completeness
    const averageProfileCompleteness =
      await this.calculateAverageProfileCompleteness();

    // Get engagement by role
    const engagementByRole = await this.getEngagementByRole();

    // Calculate retention rates (simplified - would need more sophisticated tracking)
    const retentionRates = await this.calculateRetentionRates();

    return {
      profileCompletionRate,
      emailVerificationRate,
      averageProfileCompleteness,
      engagementByRole,
      retentionRates,
    };
  }

  /**
   * Get user demographic analysis
   */
  async getUserDemographicAnalysis(): Promise<UserDemographicAnalysis> {
    const totalUsers = await this.userRepository.count();

    // Get role distribution
    const roleDistribution: Array<{
      role: UserRole;
      count: number;
      percentage: number;
    }> = [];
    for (const role of Object.values(UserRole)) {
      const count = await this.userRepository.count({ where: { role } });
      const percentage = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
      roleDistribution.push({ role, count, percentage });
    }

    // Get student analytics
    const studentAnalytics = await this.getStudentAnalytics();

    // Get supervisor analytics
    const supervisorAnalytics = await this.getSupervisorAnalytics();

    return {
      roleDistribution,
      studentAnalytics,
      supervisorAnalytics,
    };
  }

  /**
   * Generate comprehensive user report
   */
  async generateComprehensiveReport(
    options: UserReportOptions = {},
  ): Promise<ComprehensiveUserReport> {
    const {
      startDate,
      endDate,
      role,
      includeInactive = true,
      metrics = ['growth', 'activity', 'engagement', 'demographics'],
    } = options;

    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Last month
    const defaultEndDate = now;

    const periodStart = startDate || defaultStartDate;
    const periodEnd = endDate || defaultEndDate;

    // Generate report ID
    const reportId = `user-report-${Date.now()}`;

    // Get summary data
    const summary = await this.getReportSummary(
      periodStart,
      periodEnd,
      role,
      includeInactive,
    );

    // Generate requested metrics
    const report: ComprehensiveUserReport = {
      reportId,
      generatedAt: now,
      period: {
        startDate: periodStart,
        endDate: periodEnd,
      },
      summary,
    };

    if (metrics.includes('growth')) {
      report.growth = await this.getUserGrowthAnalytics(periodStart, periodEnd);
    }

    if (metrics.includes('activity')) {
      report.activity = await this.getUserActivityMetrics(
        periodStart,
        periodEnd,
      );
    }

    if (metrics.includes('engagement')) {
      report.engagement = await this.getUserEngagementMetrics();
    }

    if (metrics.includes('demographics')) {
      report.demographics = await this.getUserDemographicAnalysis();
    }

    this.logger.log(`Generated comprehensive user report: ${reportId}`);

    return report;
  }

  /**
   * Get growth trend data over time
   */
  private async getGrowthTrendData(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      totalUsers: number;
      newUsers: number;
      activeUsers: number;
    }>
  > {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt)', 'date')
      .addSelect('COUNT(*)', 'newUsers')
      .where('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('DATE(user.createdAt)')
      .orderBy('DATE(user.createdAt)', 'ASC')
      .getRawMany();

    // Transform and add cumulative totals
    let cumulativeTotal = 0;
    return result.map((row) => {
      cumulativeTotal += parseInt(row.newUsers);
      return {
        date: row.date,
        totalUsers: cumulativeTotal,
        newUsers: parseInt(row.newUsers),
        activeUsers: 0, // Would need activity tracking to implement
      };
    });
  }

  /**
   * Get registrations by month
   */
  private async getRegistrationsByMonth(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ month: string; count: number; role: UserRole }>> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select("DATE_TRUNC('month', user.createdAt)", 'month')
      .addSelect('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("DATE_TRUNC('month', user.createdAt), user.role")
      .orderBy("DATE_TRUNC('month', user.createdAt)", 'ASC')
      .getRawMany();

    return result.map((row) => ({
      month: row.month,
      count: parseInt(row.count),
      role: row.role,
    }));
  }

  /**
   * Get active users count for a given number of days
   */
  private async getActiveUsersCount(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Count users who have audit log entries in the period
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('COUNT(DISTINCT audit.userId)', 'count')
      .where('audit.createdAt >= :cutoffDate', { cutoffDate })
      .andWhere('audit.userId IS NOT NULL')
      .getRawOne();

    return parseInt(result?.count || '0');
  }

  /**
   * Get top active users
   */
  private async getTopActiveUsers(limit: number): Promise<
    Array<{
      userId: string;
      email: string;
      name?: string;
      role: UserRole;
      activityScore: number;
      lastActive: Date;
    }>
  > {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('COUNT(*)', 'activityScore')
      .addSelect('MAX(audit.createdAt)', 'lastActive')
      .leftJoin('audit.user', 'user')
      .addSelect('user.email', 'email')
      .addSelect('user.role', 'role')
      .where('audit.userId IS NOT NULL')
      .andWhere('audit.createdAt >= :cutoffDate', {
        cutoffDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      })
      .groupBy('audit.userId, user.email, user.role')
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    // Get user names from profiles
    const usersWithNames = await Promise.all(
      result.map(async (row) => {
        const user = await this.userRepository.findOne({
          where: { id: row.userId },
          relations: ['studentProfile', 'supervisorProfile'],
        });

        return {
          userId: row.userId,
          email: row.email,
          name: user?.studentProfile?.name || user?.supervisorProfile?.name,
          role: row.role,
          activityScore: parseInt(row.activityScore),
          lastActive: new Date(row.lastActive),
        };
      }),
    );

    return usersWithNames;
  }

  /**
   * Get activity by hour of day
   */
  private async getActivityByHour(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ hour: number; count: number }>> {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('EXTRACT(HOUR FROM audit.createdAt)', 'hour')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('EXTRACT(HOUR FROM audit.createdAt)')
      .orderBy('EXTRACT(HOUR FROM audit.createdAt)', 'ASC')
      .getRawMany();

    return result.map((row) => ({
      hour: parseInt(row.hour),
      count: parseInt(row.count),
    }));
  }

  /**
   * Get activity by day of week
   */
  private async getActivityByDay(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ day: string; count: number }>> {
    const result = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select("TO_CHAR(audit.createdAt, 'Day')", 'day')
      .addSelect('COUNT(*)', 'count')
      .where('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy("TO_CHAR(audit.createdAt, 'Day')")
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return result.map((row) => ({
      day: row.day.trim(),
      count: parseInt(row.count),
    }));
  }

  /**
   * Calculate average profile completeness
   */
  private async calculateAverageProfileCompleteness(): Promise<number> {
    const users = await this.userRepository.find({
      relations: ['studentProfile', 'supervisorProfile'],
    });

    if (users.length === 0) return 0;

    const totalCompleteness = users.reduce((sum, user) => {
      return sum + this.calculateUserProfileCompleteness(user);
    }, 0);

    return totalCompleteness / users.length;
  }

  /**
   * Calculate profile completeness for a single user
   */
  private calculateUserProfileCompleteness(user: User): number {
    let completeness = 0;
    const totalFields = 10;

    // Basic user fields
    if (user.email) completeness += 1;
    if (user.isEmailVerified) completeness += 1;

    if (user.studentProfile) {
      if (user.studentProfile.name) completeness += 2;
      if (user.studentProfile.skills?.length > 0) completeness += 2;
      if (user.studentProfile.interests?.length > 0) completeness += 2;
      if (user.studentProfile.preferredSpecializations?.length > 0)
        completeness += 1;
      if (user.studentProfile.currentYear) completeness += 1;
      if (user.studentProfile.gpa) completeness += 1;
    } else if (user.supervisorProfile) {
      if (user.supervisorProfile.name) completeness += 2;
      if (user.supervisorProfile.specializations?.length > 0) completeness += 2;
      if (user.supervisorProfile.maxStudents > 0) completeness += 1;
      if (user.supervisorProfile.officeLocation) completeness += 1;
      if (user.supervisorProfile.phoneNumber) completeness += 1;
      completeness += 1; // For availability status
    }

    return (completeness / totalFields) * 100;
  }

  /**
   * Get engagement metrics by role
   */
  private async getEngagementByRole(): Promise<
    Record<
      UserRole,
      {
        totalUsers: number;
        activeUsers: number;
        profileCompletionRate: number;
        averageCompleteness: number;
      }
    >
  > {
    const result = {} as any;

    for (const role of Object.values(UserRole)) {
      const totalUsers = await this.userRepository.count({ where: { role } });
      const activeUsers = await this.userRepository.count({
        where: { role, isActive: true },
      });

      const usersWithProfiles = await this.userRepository
        .createQueryBuilder('user')
        .leftJoin('user.studentProfile', 'studentProfile')
        .leftJoin('user.supervisorProfile', 'supervisorProfile')
        .where('user.role = :role', { role })
        .andWhere(
          'studentProfile.id IS NOT NULL OR supervisorProfile.id IS NOT NULL',
        )
        .getCount();

      const profileCompletionRate =
        totalUsers > 0 ? (usersWithProfiles / totalUsers) * 100 : 0;

      // Calculate average completeness for this role
      const roleUsers = await this.userRepository.find({
        where: { role },
        relations: ['studentProfile', 'supervisorProfile'],
      });

      const averageCompleteness =
        roleUsers.length > 0
          ? roleUsers.reduce(
              (sum, user) => sum + this.calculateUserProfileCompleteness(user),
              0,
            ) / roleUsers.length
          : 0;

      result[role] = {
        totalUsers,
        activeUsers,
        profileCompletionRate,
        averageCompleteness,
      };
    }

    return result;
  }

  /**
   * Calculate retention rates (simplified implementation)
   */
  private async calculateRetentionRates(): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }> {
    // This is a simplified implementation
    // In a real system, you'd track user sessions and activity more precisely

    const now = new Date();
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [day1Active, day7Active, day30Active, totalUsers] = await Promise.all(
      [
        this.getActiveUsersCount(1),
        this.getActiveUsersCount(7),
        this.getActiveUsersCount(30),
        this.userRepository.count(),
      ],
    );

    return {
      day1: totalUsers > 0 ? (day1Active / totalUsers) * 100 : 0,
      day7: totalUsers > 0 ? (day7Active / totalUsers) * 100 : 0,
      day30: totalUsers > 0 ? (day30Active / totalUsers) * 100 : 0,
    };
  }

  /**
   * Get student-specific analytics
   */
  private async getStudentAnalytics(): Promise<any> {
    const totalStudents = await this.studentProfileRepository.count();

    // Get students by year
    const byYear = await this.studentProfileRepository
      .createQueryBuilder('profile')
      .select('profile.currentYear', 'year')
      .addSelect('COUNT(*)', 'count')
      .where('profile.currentYear IS NOT NULL')
      .groupBy('profile.currentYear')
      .orderBy('profile.currentYear', 'ASC')
      .getRawMany();

    // Get students by GPA range
    const byGpaRange = await this.studentProfileRepository
      .createQueryBuilder('profile')
      .select(
        `
        CASE 
          WHEN profile.gpa >= 3.5 THEN '3.5-4.0'
          WHEN profile.gpa >= 3.0 THEN '3.0-3.49'
          WHEN profile.gpa >= 2.5 THEN '2.5-2.99'
          WHEN profile.gpa >= 2.0 THEN '2.0-2.49'
          ELSE 'Below 2.0'
        END
      `,
        'range',
      )
      .addSelect('COUNT(*)', 'count')
      .where('profile.gpa IS NOT NULL')
      .groupBy('range')
      .getRawMany();

    // Get top skills, interests, and specializations
    const [topSkills, topInterests, topSpecializations] = await Promise.all([
      this.getTopArrayValues('skills'),
      this.getTopArrayValues('interests'),
      this.getTopArrayValues('preferredSpecializations'),
    ]);

    return {
      totalStudents,
      byYear: byYear.map((row) => ({
        year: parseInt(row.year),
        count: parseInt(row.count),
      })),
      byGpaRange: byGpaRange.map((row) => ({
        range: row.range,
        count: parseInt(row.count),
      })),
      topSkills,
      topInterests,
      topSpecializations,
    };
  }

  /**
   * Get supervisor-specific analytics
   */
  private async getSupervisorAnalytics(): Promise<any> {
    const totalSupervisors = await this.supervisorProfileRepository.count();
    const availableSupervisors = await this.supervisorProfileRepository.count({
      where: { isAvailable: true },
    });

    // Calculate average capacity
    const capacityResult = await this.supervisorProfileRepository
      .createQueryBuilder('profile')
      .select('AVG(profile.maxStudents)', 'average')
      .getRawOne();

    const averageCapacity = parseFloat(capacityResult?.average || '0');

    // Get supervisors by capacity range
    const byCapacityRange = await this.supervisorProfileRepository
      .createQueryBuilder('profile')
      .select(
        `
        CASE 
          WHEN profile.maxStudents >= 10 THEN '10+'
          WHEN profile.maxStudents >= 5 THEN '5-9'
          WHEN profile.maxStudents >= 3 THEN '3-4'
          ELSE '1-2'
        END
      `,
        'range',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('range')
      .getRawMany();

    // Get top specializations
    const topSpecializations = await this.getTopSupervisorSpecializations();

    return {
      totalSupervisors,
      availableSupervisors,
      averageCapacity,
      capacityUtilization: 0, // Would need project assignment data
      topSpecializations,
      byCapacityRange: byCapacityRange.map((row) => ({
        range: row.range,
        count: parseInt(row.count),
      })),
    };
  }

  /**
   * Get top values from array fields (skills, interests, etc.)
   */
  private async getTopArrayValues(
    field: string,
  ): Promise<Array<{ [key: string]: string | number }>> {
    const result = await this.studentProfileRepository
      .createQueryBuilder('profile')
      .select(`unnest(profile.${field})`, 'value')
      .addSelect('COUNT(*)', 'count')
      .groupBy('value')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((row) => ({
      [field.slice(0, -1)]: row.value, // Remove 's' from field name
      count: parseInt(row.count),
    }));
  }

  /**
   * Get top supervisor specializations
   */
  private async getTopSupervisorSpecializations(): Promise<
    Array<{ specialization: string; count: number }>
  > {
    const result = await this.supervisorProfileRepository
      .createQueryBuilder('profile')
      .select('unnest(profile.specializations)', 'specialization')
      .addSelect('COUNT(*)', 'count')
      .groupBy('specialization')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return result.map((row) => ({
      specialization: row.specialization,
      count: parseInt(row.count),
    }));
  }

  /**
   * Get report summary data
   */
  private async getReportSummary(
    startDate: Date,
    endDate: Date,
    role?: UserRole,
    includeInactive: boolean = true,
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    growthRate: number;
  }> {
    const whereConditions: any = {};
    if (role) whereConditions.role = role;
    if (!includeInactive) whereConditions.isActive = true;

    const totalUsers = await this.userRepository.count({
      where: whereConditions,
    });
    const activeUsers = await this.userRepository.count({
      where: { ...whereConditions, isActive: true },
    });

    const newUsers = await this.userRepository.count({
      where: {
        ...whereConditions,
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
    });

    // Calculate growth rate (simplified)
    const previousPeriodStart = new Date(
      startDate.getTime() - (endDate.getTime() - startDate.getTime()),
    );
    const previousPeriodUsers = await this.userRepository.count({
      where: {
        ...whereConditions,
        createdAt: { $gte: previousPeriodStart, $lt: startDate } as any,
      },
    });

    const growthRate =
      previousPeriodUsers > 0
        ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100
        : 0;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      growthRate,
    };
  }
}
