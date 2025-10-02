import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { RealtimeNotification } from '../entities/realtime-notification.entity';
import { User } from '../entities/user.entity';

export interface NotificationPayload {
    type: 'milestone_deadline' | 'project_update' | 'ai_response' | 'bookmark_update' | 'system_alert';
    title: string;
    message: string;
    data?: any;
    userId?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    actionUrl?: string;
    expiresAt?: Date;
}

@Injectable()
export class RealtimeNotificationService {
    private readonly logger = new Logger(RealtimeNotificationService.name);

    constructor(
        @InjectRepository(RealtimeNotification)
        private readonly notificationRepository: Repository<RealtimeNotification>,
        private readonly websocketGateway: RealtimeGateway,
    ) { }

    async sendNotification(payload: NotificationPayload): Promise<void> {
        try {
            // Save notification to database
            const notification = this.notificationRepository.create({
                type: payload.type,
                title: payload.title,
                message: payload.message,
                data: payload.data,
                userId: payload.userId,
                priority: payload.priority,
                actionUrl: payload.actionUrl,
                expiresAt: payload.expiresAt,
                isRead: false,
                createdAt: new Date(),
            });

            await this.notificationRepository.save(notification);

            // Send real-time notification
            if (payload.userId) {
                this.websocketGateway.emitToUser(payload.userId, 'notification', {
                    id: notification.id,
                    ...payload,
                    timestamp: notification.createdAt,
                });
            } else {
                // Broadcast to all users
                this.websocketGateway.emitToAll('notification', {
                    id: notification.id,
                    ...payload,
                    timestamp: notification.createdAt,
                });
            }

            this.logger.log(`Notification sent: ${payload.type} - ${payload.title}`);
        } catch (error) {
            this.logger.error('Failed to send notification:', error);
            throw error;
        }
    }

    async sendMilestoneDeadlineAlert(userId: string, milestoneTitle: string, dueDate: Date): Promise<void> {
        const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        await this.sendNotification({
            type: 'milestone_deadline',
            title: 'Milestone Deadline Approaching',
            message: `"${milestoneTitle}" is due in ${daysUntilDue} day(s)`,
            userId,
            priority: daysUntilDue <= 1 ? 'urgent' : daysUntilDue <= 3 ? 'high' : 'medium',
            actionUrl: '/dashboard/milestones',
            data: { milestoneTitle, dueDate, daysUntilDue },
        });
    }

    async sendProjectUpdateNotification(userId: string, projectTitle: string, updateType: string): Promise<void> {
        await this.sendNotification({
            type: 'project_update',
            title: 'Project Updated',
            message: `"${projectTitle}" has been ${updateType}`,
            userId,
            priority: 'medium',
            actionUrl: '/dashboard/projects',
            data: { projectTitle, updateType },
        });
    }

    async sendAIResponseNotification(userId: string, conversationId: string): Promise<void> {
        await this.sendNotification({
            type: 'ai_response',
            title: 'AI Assistant Response',
            message: 'Your AI assistant has responded to your question',
            userId,
            priority: 'low',
            actionUrl: `/ai-assistant?conversation=${conversationId}`,
            data: { conversationId },
        });
    }

    async sendBookmarkUpdateNotification(userId: string, projectTitle: string, action: 'added' | 'removed'): Promise<void> {
        await this.sendNotification({
            type: 'bookmark_update',
            title: 'Bookmark Updated',
            message: `"${projectTitle}" ${action === 'added' ? 'added to' : 'removed from'} bookmarks`,
            userId,
            priority: 'low',
            actionUrl: '/dashboard/bookmarks',
            data: { projectTitle, action },
        });
    }

    async sendSystemAlert(message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'): Promise<void> {
        await this.sendNotification({
            type: 'system_alert',
            title: 'System Alert',
            message,
            priority,
            actionUrl: '/dashboard',
        });
    }

    async getUserNotifications(userId: string, limit: number = 50): Promise<RealtimeNotification[]> {
        return this.notificationRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    async markAsRead(notificationId: string, userId: string): Promise<void> {
        await this.notificationRepository.update(
            { id: notificationId, userId },
            { isRead: true, readAt: new Date() }
        );

        // Emit read status update
        this.websocketGateway.emitToUser(userId, 'notification-read', {
            notificationId,
        });
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationRepository.update(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        // Emit all read status update
        this.websocketGateway.emitToUser(userId, 'notifications-all-read', {});
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationRepository.count({
            where: { userId, isRead: false },
        });
    }

    async deleteNotification(notificationId: string, userId: string): Promise<void> {
        await this.notificationRepository.delete({ id: notificationId, userId });

        // Emit deletion update
        this.websocketGateway.emitToUser(userId, 'notification-deleted', {
            notificationId,
        });
    }

    async cleanupExpiredNotifications(): Promise<void> {
        const now = new Date();
        const result = await this.notificationRepository.delete({
            expiresAt: { $lt: now } as any,
        });

        this.logger.log(`Cleaned up ${result.affected} expired notifications`);
    }
}