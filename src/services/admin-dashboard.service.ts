import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, Not, IsNull } from 'typeorm';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { ProjectApplication } from '../entities/project-application.entity';
import { UserActivityService } from './user-activity.service';
import { ProjectApplicationService } from './project-application.service';
import {
    AdminDashboardDto,
    PlatformMetricsDto,
    UserGrowthDataDto,
    ProjectStatusDistributionDto,
    SystemAlertDto,
    RecentSystemActivityDto,
    TopPerformingProjectDto,
} from '../dto/dashboard/admin-dashboard.dto';
import { ApprovalStatus } from '../common/enums/approval-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';

@Injectable()
export class AdminDashboardService {
    private readonly logger = new Logger(AdminDashboardService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(ProjectBookmark)
        private readonly bookmarkRepository: Repository<ProjectBookmark>,
        @InjectRepository(ProjectApplication)
        private readonly applicationRepository: Repository<ProjectApplication>,
        private readonly userActivityService: UserActivityService,
        private readonly projectApplicationService: ProjectApplicationService,
    ) { }

    /**
     * Get complete admin dashboard data
     */
    async getAdminDashboard(): Promise<AdminDashboardDto> {
        this.logger.log('Getting admin dashboard data');

        const [
            metrics,
            userGrowthData,
            projectStatusDistribution,
            systemAlerts,
            recentActivities,
            topPerformingProjects,
            pendingApprovals,
        ] = await Promise.all([
            this.getPlatformMetrics(),
            this.getUserGrowthData(),
            this.getProjectStatusDistribution(),
            this.getSystemAlerts(),
            this.getRecentSystemActivities(),
            this.getTopPerformingProjects(),
            this.getPendingApprovals(),
        ]);

        return {
            metrics,
            userGrowthData,
            projectStatusDistribution,
            systemAlerts,
            recentActivities,
            topPerformingProjects,
            pendingApprovals,
            lastUpdated: new Date().toISOString(),
        };
    }

    /**
     * Get platform-wide metrics
     */
    private async getPlatformMetrics(): Promise<PlatformMetricsDto> {
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const [
            totalUsers,
            activeUsers,
            newUsersToday,
            totalProjects,
            pendingProjects,
            approvedProjects,
            totalMilestones,
            completedMilestones,
            overdueMilestones,
        ] = await Promise.all([
            this.userRepository.count(),
            this.userActivityService.getActiveUsersCount(),
            this.userRepository.count({
                where: {
                    createdAt: Between(startOfDay, endOfDay),
                },
            }),
            this.projectRepository.count(),
            this.projectRepository.count({
                where: { approvalStatus: ApprovalStatus.PENDING },
            }),
            this.projectRepository.count({
                where: { approvalStatus: ApprovalStatus.APPROVED },
            }),
            this.milestoneRepository.count(),
            this.milestoneRepository.count({
                where: { status: MilestoneStatus.COMPLETED },
            }),
            this.getOverdueMilestonesCount(),
        ]);

        // Calculate system health score based on various factors
        const systemHealthScore = this.calculateSystemHealthScore({
            totalUsers,
            activeUsers,
            pendingProjects,
            totalProjects,
            overdueMilestones,
            totalMilestones,
        });

        return {
            totalUsers,
            activeUsers,
            newUsersToday,
            totalProjects,
            pendingProjects,
            approvedProjects,
            totalMilestones,
            completedMilestones,
            overdueMilestones,
            systemHealthScore,
        };
    }

    /**
     * Get user growth data for the last 30 days
     */
    private async getUserGrowthData(): Promise<UserGrowthDataDto[]> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const result = await this.userRepository
            .createQueryBuilder('user')
            .select('DATE(user.createdAt)', 'date')
            .addSelect('COUNT(*)', 'newUsers')
            .where('user.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .groupBy('DATE(user.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();

        // Fill in missing dates with 0 users
        const growthData: UserGrowthDataDto[] = [];
        let currentDate = new Date(startDate);
        let totalUsers = await this.userRepository.count({
            where: {
                createdAt: LessThan(startDate),
            },
        });

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayData = result.find((r) => r.date === dateStr);
            const newUsers = dayData ? parseInt(dayData.newUsers, 10) : 0;

            totalUsers += newUsers;

            growthData.push({
                date: dateStr,
                newUsers,
                totalUsers,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return growthData;
    }

    /**
     * Get project status distribution
     */
    private async getProjectStatusDistribution(): Promise<ProjectStatusDistributionDto[]> {
        const result = await this.projectRepository
            .createQueryBuilder('project')
            .select('project.approvalStatus', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('project.approvalStatus')
            .getRawMany();

        const totalProjects = await this.projectRepository.count();

        return result.map((row) => ({
            status: row.status,
            count: parseInt(row.count, 10),
            percentage: totalProjects > 0 ?
                Math.round((parseInt(row.count, 10) / totalProjects) * 100 * 100) / 100 : 0,
        }));
    }

    /**
     * Get system alerts
     */
    private async getSystemAlerts(): Promise<SystemAlertDto[]> {
        const alerts: SystemAlertDto[] = [];
        const now = new Date();

        // Check for high pending projects
        const pendingProjects = await this.projectRepository.count({
            where: { approvalStatus: ApprovalStatus.PENDING },
        });

        if (pendingProjects > 20) {
            alerts.push({
                id: `alert-pending-projects-${now.getTime()}`,
                type: 'warning',
                title: 'High Pending Projects',
                message: `${pendingProjects} projects are pending approval`,
                timestamp: now.toISOString(),
                severity: pendingProjects > 50 ? 5 : 3,
            });
        }

        // Check for overdue milestones
        const overdueMilestones = await this.getOverdueMilestonesCount();
        if (overdueMilestones > 50) {
            alerts.push({
                id: `alert-overdue-milestones-${now.getTime()}`,
                type: 'error',
                title: 'High Overdue Milestones',
                message: `${overdueMilestones} milestones are overdue`,
                timestamp: now.toISOString(),
                severity: overdueMilestones > 100 ? 5 : 4,
            });
        }

        // Check for low user activity
        const activeUsers = await this.userActivityService.getActiveUsersCount();
        const totalUsers = await this.userRepository.count();
        const activityRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

        if (activityRate < 20) {
            alerts.push({
                id: `alert-low-activity-${now.getTime()}`,
                type: 'warning',
                title: 'Low User Activity',
                message: `Only ${Math.round(activityRate)}% of users are active`,
                timestamp: now.toISOString(),
                severity: activityRate < 10 ? 4 : 2,
            });
        }

        // Check for system health
        const systemHealth = this.calculateSystemHealthScore({
            totalUsers,
            activeUsers,
            pendingProjects,
            totalProjects: await this.projectRepository.count(),
            overdueMilestones,
            totalMilestones: await this.milestoneRepository.count(),
        });

        if (systemHealth < 70) {
            alerts.push({
                id: `alert-system-health-${now.getTime()}`,
                type: 'error',
                title: 'System Health Critical',
                message: `System health score is ${systemHealth}%`,
                timestamp: now.toISOString(),
                severity: 5,
            });
        } else if (systemHealth < 85) {
            alerts.push({
                id: `alert-system-health-${now.getTime()}`,
                type: 'warning',
                title: 'System Health Warning',
                message: `System health score is ${systemHealth}%`,
                timestamp: now.toISOString(),
                severity: 3,
            });
        }

        return alerts.sort((a, b) => b.severity - a.severity);
    }

    /**
     * Get recent system activities
     */
    private async getRecentSystemActivities(): Promise<RecentSystemActivityDto[]> {
        const activities = await this.userActivityService.getSystemRecentActivities(15);

        return activities.map((activity) => ({
            id: activity.id,
            type: activity.activityType,
            description: activity.description,
            userName: activity.user?.studentProfile?.name ||
                activity.user?.supervisorProfile?.name ||
                activity.user?.email || null,
            timestamp: activity.createdAt.toISOString(),
        }));
    }

    /**
     * Get top performing projects
     */
    private async getTopPerformingProjects(): Promise<TopPerformingProjectDto[]> {
        const projects = await this.projectRepository
            .createQueryBuilder('project')
            .leftJoinAndSelect('project.supervisor', 'supervisor')
            .leftJoinAndSelect('supervisor.supervisorProfile', 'supervisorProfile')
            .leftJoin('project.bookmarks', 'bookmarks')
            .leftJoin('project.views', 'views')
            .leftJoin('project_applications', 'applications', 'applications.projectId = project.id')
            .select([
                'project.id',
                'project.title',
                'supervisor.id',
                'supervisorProfile.name',
                'supervisor.email',
            ])
            .addSelect('COUNT(DISTINCT bookmarks.id)', 'bookmarkCount')
            .addSelect('COUNT(DISTINCT views.id)', 'viewCount')
            .addSelect('COUNT(DISTINCT applications.id)', 'applicationCount')
            .where('project.approvalStatus = :status', { status: ApprovalStatus.APPROVED })
            .groupBy('project.id')
            .addGroupBy('supervisor.id')
            .addGroupBy('supervisorProfile.id')
            .orderBy('bookmarkCount', 'DESC')
            .addOrderBy('viewCount', 'DESC')
            .limit(10)
            .getRawMany();

        return projects.map((project) => ({
            id: project.project_id,
            title: project.project_title,
            supervisorName: project.supervisorProfile_name || project.supervisor_email || 'Unknown',
            viewCount: parseInt(project.viewCount, 10) || 0,
            bookmarkCount: parseInt(project.bookmarkCount, 10) || 0,
            applicationCount: parseInt(project.applicationCount, 10) || 0,
        }));
    }

    /**
     * Get pending approvals count
     */
    private async getPendingApprovals(): Promise<{
        projects: number;
        users: number;
        reports: number;
    }> {
        const [pendingProjects, unverifiedUsers] = await Promise.all([
            this.projectRepository.count({
                where: { approvalStatus: ApprovalStatus.PENDING },
            }),
            this.userRepository.count({
                where: { isEmailVerified: false },
            }),
        ]);

        return {
            projects: pendingProjects,
            users: unverifiedUsers,
            reports: 0, // Placeholder for future report approval system
        };
    }

    /**
     * Get overdue milestones count
     */
    private async getOverdueMilestonesCount(): Promise<number> {
        const now = new Date();
        return this.milestoneRepository.count({
            where: {
                dueDate: LessThan(now),
                status: Not(MilestoneStatus.COMPLETED),
            },
        });
    }

    /**
     * Calculate system health score
     */
    private calculateSystemHealthScore(metrics: {
        totalUsers: number;
        activeUsers: number;
        pendingProjects: number;
        totalProjects: number;
        overdueMilestones: number;
        totalMilestones: number;
    }): number {
        let score = 100;

        // Deduct points for low user activity
        if (metrics.totalUsers > 0) {
            const activityRate = (metrics.activeUsers / metrics.totalUsers) * 100;
            if (activityRate < 50) {
                score -= (50 - activityRate) * 0.5; // Up to 25 points deduction
            }
        }

        // Deduct points for high pending projects ratio
        if (metrics.totalProjects > 0) {
            const pendingRatio = (metrics.pendingProjects / metrics.totalProjects) * 100;
            if (pendingRatio > 20) {
                score -= (pendingRatio - 20) * 0.3; // Up to 24 points deduction
            }
        }

        // Deduct points for overdue milestones
        if (metrics.totalMilestones > 0) {
            const overdueRatio = (metrics.overdueMilestones / metrics.totalMilestones) * 100;
            if (overdueRatio > 10) {
                score -= (overdueRatio - 10) * 0.5; // Up to 45 points deduction
            }
        }

        return Math.max(Math.round(score), 0);
    }

    /**
     * Get detailed platform statistics
     */
    async getPlatformStatistics(): Promise<{
        users: {
            total: number;
            students: number;
            supervisors: number;
            admins: number;
            verified: number;
            active24h: number;
        };
        projects: {
            total: number;
            approved: number;
            pending: number;
            rejected: number;
            withStudents: number;
        };
        milestones: {
            total: number;
            completed: number;
            inProgress: number;
            overdue: number;
            blocked: number;
        };
        applications: {
            total: number;
            pending: number;
            approved: number;
            rejected: number;
        };
    }> {
        const [userStats, projectStats, milestoneStats, applicationStats] = await Promise.all([
            this.getUserStatistics(),
            this.getProjectStatistics(),
            this.getMilestoneStatistics(),
            this.projectApplicationService.getApplicationStatistics(),
        ]);

        return {
            users: userStats,
            projects: projectStats,
            milestones: milestoneStats,
            applications: applicationStats,
        };
    }

    /**
     * Get user statistics
     */
    private async getUserStatistics(): Promise<{
        total: number;
        students: number;
        supervisors: number;
        admins: number;
        verified: number;
        active24h: number;
    }> {
        const [total, students, supervisors, admins, verified, active24h] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { role: UserRole.STUDENT } }),
            this.userRepository.count({ where: { role: UserRole.SUPERVISOR } }),
            this.userRepository.count({ where: { role: UserRole.ADMIN } }),
            this.userRepository.count({ where: { isEmailVerified: true } }),
            this.userActivityService.getActiveUsersCount(),
        ]);

        return {
            total,
            students,
            supervisors,
            admins,
            verified,
            active24h,
        };
    }

    /**
     * Get project statistics
     */
    private async getProjectStatistics(): Promise<{
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        withStudents: number;
    }> {
        const [total, approved, pending, rejected, withStudents] = await Promise.all([
            this.projectRepository.count(),
            this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.APPROVED } }),
            this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
            this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.REJECTED } }),
            this.projectRepository.count({ where: { studentId: Not(IsNull()) } }),
        ]);

        return {
            total,
            approved,
            pending,
            rejected,
            withStudents,
        };
    }

    /**
     * Get milestone statistics
     */
    private async getMilestoneStatistics(): Promise<{
        total: number;
        completed: number;
        inProgress: number;
        overdue: number;
        blocked: number;
    }> {
        const now = new Date();

        const [total, completed, inProgress, blocked] = await Promise.all([
            this.milestoneRepository.count(),
            this.milestoneRepository.count({ where: { status: MilestoneStatus.COMPLETED } }),
            this.milestoneRepository.count({ where: { status: MilestoneStatus.IN_PROGRESS } }),
            this.milestoneRepository.count({ where: { status: MilestoneStatus.BLOCKED } }),
        ]);

        const overdue = await this.milestoneRepository.count({
            where: {
                dueDate: LessThan(now),
                status: Not(MilestoneStatus.COMPLETED),
            },
        });

        return {
            total,
            completed,
            inProgress,
            overdue,
            blocked,
        };
    }
}