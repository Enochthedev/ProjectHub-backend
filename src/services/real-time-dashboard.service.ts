import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeEvent } from '../entities/realtime-event.entity';

export interface DashboardUpdate {
    type: 'project_stats' | 'milestone_progress' | 'ai_activity' | 'user_activity' | 'system_health';
    data: any;
    userId?: string;
    role?: string;
    timestamp: Date;
}

@Injectable()
export class RealtimeDashboardService {
    private readonly logger = new Logger(RealtimeDashboardService.name);

    constructor(
        @InjectRepository(RealtimeEvent)
        private readonly eventRepository: Repository<RealtimeEvent>,
        private readonly websocketGateway: RealtimeGateway,
    ) { }

    async broadcastDashboardUpdate(update: DashboardUpdate): Promise<void> {
        try {
            // Save event to database for audit
            const event = this.eventRepository.create({
                type: update.type,
                data: update.data,
                userId: update.userId,
                role: update.role,
                timestamp: update.timestamp,
            });

            await this.eventRepository.save(event);

            // Broadcast to appropriate audience
            if (update.userId) {
                // Send to specific user
                this.websocketGateway.emitToUser(update.userId, 'dashboard-update', update);
            } else if (update.role) {
                // Send to all users with specific role
                this.websocketGateway.emitToRole(update.role, 'dashboard-update', update);
            } else {
                // Broadcast to all connected users
                this.websocketGateway.emitToAll('dashboard-update', update);
            }

            this.logger.log(`Dashboard update broadcasted: ${update.type}`);
        } catch (error) {
            this.logger.error('Failed to broadcast dashboard update:', error);
            throw error;
        }
    }

    async updateProjectStats(stats: any, role?: string): Promise<void> {
        await this.broadcastDashboardUpdate({
            type: 'project_stats',
            data: stats,
            role,
            timestamp: new Date(),
        });
    }

    async updateMilestoneProgress(userId: string, milestoneData: any): Promise<void> {
        await this.broadcastDashboardUpdate({
            type: 'milestone_progress',
            data: milestoneData,
            userId,
            timestamp: new Date(),
        });

        // Also notify supervisors if this is a student milestone
        if (milestoneData.supervisorId) {
            await this.broadcastDashboardUpdate({
                type: 'milestone_progress',
                data: { ...milestoneData, studentUpdate: true },
                userId: milestoneData.supervisorId,
                timestamp: new Date(),
            });
        }
    }

    async updateAIActivity(userId: string, activityData: any): Promise<void> {
        await this.broadcastDashboardUpdate({
            type: 'ai_activity',
            data: activityData,
            userId,
            timestamp: new Date(),
        });
    }

    async updateUserActivity(activityData: any): Promise<void> {
        await this.broadcastDashboardUpdate({
            type: 'user_activity',
            data: activityData,
            role: 'admin', // Only admins see user activity updates
            timestamp: new Date(),
        });
    }

    async updateSystemHealth(healthData: any): Promise<void> {
        await this.broadcastDashboardUpdate({
            type: 'system_health',
            data: healthData,
            role: 'admin', // Only admins see system health updates
            timestamp: new Date(),
        });
    }

    async getRecentEvents(userId?: string, role?: string, limit: number = 100): Promise<RealtimeEvent[]> {
        const queryBuilder = this.eventRepository.createQueryBuilder('event');

        if (userId) {
            queryBuilder.where('event.userId = :userId', { userId });
        } else if (role) {
            queryBuilder.where('event.role = :role OR event.role IS NULL', { role });
        }

        return queryBuilder
            .orderBy('event.timestamp', 'DESC')
            .limit(limit)
            .getMany();
    }

    async cleanupOldEvents(daysToKeep: number = 30): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await this.eventRepository.delete({
            timestamp: { $lt: cutoffDate } as any,
        });

        this.logger.log(`Cleaned up ${result.affected} old events`);
    }
}