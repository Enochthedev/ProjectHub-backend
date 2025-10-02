import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserActivity, ActivityType } from '../entities/user-activity.entity';

export interface LogActivityParams {
    userId: string;
    activityType: ActivityType;
    description: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

export interface ActivitySummary {
    totalActivities: number;
    activitiesByType: Record<ActivityType, number>;
    recentActivities: UserActivity[];
    dailyActivityCount: Array<{ date: string; count: number }>;
}

@Injectable()
export class UserActivityService {
    private readonly logger = new Logger(UserActivityService.name);

    constructor(
        @InjectRepository(UserActivity)
        private readonly activityRepository: Repository<UserActivity>,
    ) { }

    /**
     * Log a user activity
     */
    async logActivity(params: LogActivityParams): Promise<UserActivity> {
        try {
            const activity = this.activityRepository.create({
                userId: params.userId,
                activityType: params.activityType,
                description: params.description,
                metadata: params.metadata || null,
                ipAddress: params.ipAddress || null,
                userAgent: params.userAgent || null,
            });

            const savedActivity = await this.activityRepository.save(activity);

            this.logger.log(
                `Logged activity: ${params.activityType} for user ${params.userId}`,
            );

            return savedActivity;
        } catch (error) {
            this.logger.error(
                `Failed to log activity for user ${params.userId}:`,
                error,
            );
            throw error;
        }
    }

    /**
     * Get recent activities for a user
     */
    async getRecentActivities(
        userId: string,
        limit: number = 10,
    ): Promise<UserActivity[]> {
        return this.activityRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }

    /**
     * Get activities by type for a user
     */
    async getActivitiesByType(
        userId: string,
        activityType: ActivityType,
        limit: number = 50,
    ): Promise<UserActivity[]> {
        return this.activityRepository.find({
            where: { userId, activityType },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * Get activity summary for a user
     */
    async getActivitySummary(
        userId: string,
        days: number = 30,
    ): Promise<ActivitySummary> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const endDate = new Date();

        // Get all activities in the date range
        const activities = await this.activityRepository.find({
            where: {
                userId,
                createdAt: Between(startDate, endDate),
            },
            order: { createdAt: 'DESC' },
        });

        // Count activities by type
        const activitiesByType: Record<ActivityType, number> = {} as Record<
            ActivityType,
            number
        >;

        Object.values(ActivityType).forEach((type) => {
            activitiesByType[type] = 0;
        });

        activities.forEach((activity) => {
            activitiesByType[activity.activityType]++;
        });

        // Get daily activity counts
        const dailyActivityCount = await this.getDailyActivityCount(
            userId,
            startDate,
            endDate,
        );

        return {
            totalActivities: activities.length,
            activitiesByType,
            recentActivities: activities.slice(0, 10),
            dailyActivityCount,
        };
    }

    /**
     * Get system-wide recent activities (for admin dashboard)
     */
    async getSystemRecentActivities(limit: number = 20): Promise<UserActivity[]> {
        return this.activityRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['user'],
        });
    }

    /**
     * Get active users count (users with activity in the last 24 hours)
     */
    async getActiveUsersCount(): Promise<number> {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);

        const result = await this.activityRepository
            .createQueryBuilder('activity')
            .select('COUNT(DISTINCT activity.userId)', 'count')
            .where('activity.createdAt >= :date', { date: last24Hours })
            .getRawOne();

        return parseInt(result.count, 10) || 0;
    }

    /**
     * Get daily activity count for a user
     */
    private async getDailyActivityCount(
        userId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<Array<{ date: string; count: number }>> {
        const result = await this.activityRepository
            .createQueryBuilder('activity')
            .select('DATE(activity.createdAt)', 'date')
            .addSelect('COUNT(*)', 'count')
            .where('activity.userId = :userId', { userId })
            .andWhere('activity.createdAt BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .groupBy('DATE(activity.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();

        return result.map((row) => ({
            date: row.date,
            count: parseInt(row.count, 10),
        }));
    }

    /**
     * Clean up old activities (for maintenance)
     */
    async cleanupOldActivities(daysToKeep: number = 90): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.activityRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();

        this.logger.log(
            `Cleaned up ${result.affected} old activities older than ${daysToKeep} days`,
        );

        return result.affected || 0;
    }

    /**
     * Get user activity statistics for admin dashboard
     */
    async getUserActivityStats(): Promise<{
        totalActivities: number;
        activitiesLast24h: number;
        activitiesLast7d: number;
        topActivityTypes: Array<{ type: ActivityType; count: number }>;
    }> {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [totalActivities, activitiesLast24h, activitiesLast7d, topTypes] =
            await Promise.all([
                this.activityRepository.count(),
                this.activityRepository.count({
                    where: { createdAt: Between(last24h, now) },
                }),
                this.activityRepository.count({
                    where: { createdAt: Between(last7d, now) },
                }),
                this.getTopActivityTypes(),
            ]);

        return {
            totalActivities,
            activitiesLast24h,
            activitiesLast7d,
            topActivityTypes: topTypes,
        };
    }

    /**
     * Get top activity types by count
     */
    private async getTopActivityTypes(): Promise<
        Array<{ type: ActivityType; count: number }>
    > {
        const result = await this.activityRepository
            .createQueryBuilder('activity')
            .select('activity.activityType', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('activity.activityType')
            .orderBy('count', 'DESC')
            .limit(10)
            .getRawMany();

        return result.map((row) => ({
            type: row.type as ActivityType,
            count: parseInt(row.count, 10),
        }));
    }
}