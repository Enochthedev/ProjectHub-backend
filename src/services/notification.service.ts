import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
    Notification,
    NotificationType,
    NotificationStatus,
    NotificationPriority,
} from '../entities/notification.entity';
import {
    NotificationPreference,
    NotificationChannel,
} from '../entities/notification-preference.entity';
import { User } from '../entities/user.entity';
import { Milestone } from '../entities/milestone.entity';
import { EmailService } from '../auth/services/email.service';
import { UserRole } from '../common/enums/user-role.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';

export interface CreateNotificationDto {
    type: NotificationType;
    title: string;
    message: string;
    userId: string;
    priority?: NotificationPriority;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    milestoneId?: string;
}

export interface NotificationDeliveryOptions {
    sendEmail?: boolean;
    sendInApp?: boolean;
    respectPreferences?: boolean;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Notification)
        private readonly notificationRepository: Repository<Notification>,
        @InjectRepository(NotificationPreference)
        private readonly preferenceRepository: Repository<NotificationPreference>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        private readonly emailService: EmailService,
    ) { }

    /**
     * Create and send a notification
     */
    async createNotification(
        dto: CreateNotificationDto,
        options: NotificationDeliveryOptions = { sendEmail: true, sendInApp: true, respectPreferences: true },
    ): Promise<Notification> {
        // Create notification record
        const notification = this.notificationRepository.create({
            type: dto.type,
            title: dto.title,
            message: dto.message,
            userId: dto.userId,
            priority: dto.priority || NotificationPriority.MEDIUM,
            actionUrl: dto.actionUrl,
            actionLabel: dto.actionLabel,
            metadata: dto.metadata,
            milestoneId: dto.milestoneId,
            status: NotificationStatus.UNREAD,
        });

        const savedNotification = await this.notificationRepository.save(notification);

        // Send notification through enabled channels
        if (options.respectPreferences) {
            await this.sendNotificationThroughPreferences(savedNotification, options);
        } else {
            // Send through all requested channels without checking preferences
            if (options.sendInApp) {
                // In-app notification is already created
                this.logger.log(`In-app notification created: ${savedNotification.id}`);
            }

            if (options.sendEmail) {
                await this.sendEmailNotification(savedNotification);
            }
        }

        return savedNotification;
    }

    /**
     * Send notification through user's preferred channels
     */
    private async sendNotificationThroughPreferences(
        notification: Notification,
        options: NotificationDeliveryOptions,
    ): Promise<void> {
        const preferences = await this.getUserNotificationPreferences(
            notification.userId,
            notification.type,
        );

        // Check if in-app notifications are enabled
        const inAppPreference = preferences.find(p => p.channel === NotificationChannel.IN_APP);
        if (options.sendInApp && (!inAppPreference || inAppPreference.enabled)) {
            this.logger.log(`In-app notification created: ${notification.id}`);
        }

        // Check if email notifications are enabled
        const emailPreference = preferences.find(p => p.channel === NotificationChannel.EMAIL);
        if (options.sendEmail && (!emailPreference || emailPreference.enabled)) {
            await this.sendEmailNotification(notification);
        }
    }

    /**
     * Send email notification
     */
    private async sendEmailNotification(notification: Notification): Promise<void> {
        try {
            const user = await this.userRepository.findOne({
                where: { id: notification.userId },
            });

            if (!user) {
                this.logger.warn(`User not found for notification: ${notification.id}`);
                return;
            }

            const emailHtml = this.generateEmailTemplate(notification, user);
            const emailText = this.generateEmailText(notification, user);

            await this.emailService.sendEmail({
                to: user.email,
                subject: `FYP Platform - ${notification.title}`,
                html: emailHtml,
                text: emailText,
                type: 'notification' as any,
                metadata: {
                    notificationId: notification.id,
                    notificationType: notification.type,
                    userId: user.id,
                },
            });

            // Update notification to mark email as sent
            notification.emailSent = true;
            notification.emailSentAt = new Date();
            await this.notificationRepository.save(notification);

            this.logger.log(`Email notification sent: ${notification.id} to ${user.email}`);
        } catch (error) {
            this.logger.error(`Failed to send email notification ${notification.id}:`, error);
        }
    }

    /**
     * Generate email template for notification
     */
    private generateEmailTemplate(notification: Notification, user: User): string {
        const actionButton = notification.actionUrl
            ? `<a href="${notification.actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px; margin: 16px 0;">${notification.actionLabel || 'View Details'}</a>`
            : '';

        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="border: 2px solid #000; padding: 24px;">
          <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #000;">${notification.title}</h1>
          
          <div style="background-color: #f5f5f5; padding: 16px; margin: 16px 0; border: 1px solid #ddd;">
            <p style="margin: 0; color: #333; line-height: 1.5;">${notification.message}</p>
          </div>
          
          ${actionButton}
          
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              Priority: <strong>${notification.priority.toUpperCase()}</strong><br>
              Time: ${notification.createdAt.toLocaleString()}
            </p>
          </div>
          
          <div style="margin-top: 24px; font-size: 12px; color: #999;">
            <p>This notification was sent to you because you are subscribed to ${notification.type.replace('_', ' ')} notifications.</p>
            <p>You can manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Generate plain text email for notification
     */
    private generateEmailText(notification: Notification, user: User): string {
        return `
FYP Platform Notification

${notification.title}

${notification.message}

Priority: ${notification.priority.toUpperCase()}
Time: ${notification.createdAt.toLocaleString()}

${notification.actionUrl ? `View Details: ${notification.actionUrl}` : ''}

---
This notification was sent to you because you are subscribed to ${notification.type.replace('_', ' ')} notifications.
You can manage your notification preferences in your account settings.
    `.trim();
    }

    /**
     * Get user's notification preferences
     */
    async getUserNotificationPreferences(
        userId: string,
        notificationType?: NotificationType,
    ): Promise<NotificationPreference[]> {
        const where: any = { userId };
        if (notificationType) {
            where.notificationType = notificationType;
        }

        return this.preferenceRepository.find({ where });
    }

    /**
     * Update user's notification preferences
     */
    async updateNotificationPreference(
        userId: string,
        notificationType: NotificationType,
        channel: NotificationChannel,
        enabled: boolean,
        settings?: Record<string, any>,
    ): Promise<NotificationPreference> {
        let preference = await this.preferenceRepository.findOne({
            where: { userId, notificationType, channel },
        });

        if (preference) {
            preference.enabled = enabled;
            if (settings) {
                preference.settings = settings;
            }
        } else {
            preference = this.preferenceRepository.create({
                userId,
                notificationType,
                channel,
                enabled,
                settings,
            });
        }

        return this.preferenceRepository.save(preference);
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string, userId: string): Promise<boolean> {
        const result = await this.notificationRepository.update(
            { id: notificationId, userId },
            { status: NotificationStatus.READ, readAt: new Date() },
        );

        return (result.affected ?? 0) > 0;
    }

    /**
     * Mark multiple notifications as read
     */
    async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
        const result = await this.notificationRepository.update(
            { id: In(notificationIds), userId },
            { status: NotificationStatus.READ, readAt: new Date() },
        );

        return result.affected || 0;
    }

    /**
     * Get user's notifications with pagination
     */
    async getUserNotifications(
        userId: string,
        page: number = 1,
        limit: number = 20,
        status?: NotificationStatus,
    ): Promise<{
        notifications: Notification[];
        total: number;
        unreadCount: number;
    }> {
        const query = this.notificationRepository
            .createQueryBuilder('notification')
            .where('notification.userId = :userId', { userId })
            .leftJoinAndSelect('notification.milestone', 'milestone')
            .orderBy('notification.createdAt', 'DESC');

        if (status) {
            query.andWhere('notification.status = :status', { status });
        }

        const [notifications, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        // Get unread count
        const unreadCount = await this.notificationRepository.count({
            where: { userId, status: NotificationStatus.UNREAD },
        });

        return { notifications, total, unreadCount };
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
        const result = await this.notificationRepository.delete({
            id: notificationId,
            userId,
        });

        return (result.affected ?? 0) > 0;
    }

    /**
     * Notify supervisor about milestone updates
     */
    async notifyMilestoneUpdate(
        milestoneId: string,
        updateType: 'completed' | 'blocked' | 'updated',
        updatedBy: string,
    ): Promise<void> {
        const milestone = await this.milestoneRepository.findOne({
            where: { id: milestoneId },
            relations: ['project', 'project.supervisor'],
        });

        if (!milestone || !milestone.project?.supervisor) {
            this.logger.warn(`Milestone or supervisor not found for notification: ${milestoneId}`);
            return;
        }

        const student = await this.userRepository.findOne({
            where: { id: updatedBy },
        });

        if (!student) {
            this.logger.warn(`Student not found for milestone update: ${updatedBy}`);
            return;
        }

        let notificationType: NotificationType;
        let title: string;
        let message: string;
        let priority: NotificationPriority = NotificationPriority.MEDIUM;

        switch (updateType) {
            case 'completed':
                notificationType = NotificationType.MILESTONE_COMPLETED;
                title = 'Milestone Completed';
                message = `${student.email} has completed the milestone "${milestone.title}" in project "${milestone.project.title}".`;
                priority = NotificationPriority.LOW;
                break;
            case 'blocked':
                notificationType = NotificationType.MILESTONE_BLOCKED;
                title = 'Milestone Blocked';
                message = `${student.email} has marked the milestone "${milestone.title}" as blocked in project "${milestone.project.title}". They may need assistance.`;
                priority = NotificationPriority.HIGH;
                break;
            case 'updated':
                notificationType = NotificationType.MILESTONE_UPDATED;
                title = 'Milestone Updated';
                message = `${student.email} has updated the milestone "${milestone.title}" in project "${milestone.project.title}".`;
                break;
        }

        await this.createNotification({
            type: notificationType,
            title,
            message,
            userId: milestone.project.supervisor.id,
            priority,
            actionUrl: `/milestones/${milestoneId}`,
            actionLabel: 'View Milestone',
            metadata: {
                milestoneId,
                projectId: milestone.project.id,
                studentId: updatedBy,
                updateType,
            },
            milestoneId,
        });
    }

    /**
     * Check for overdue milestones and send notifications (scheduled task)
     */
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async checkOverdueMilestones(): Promise<void> {
        this.logger.log('Checking for overdue milestones...');

        const overdueMilestones = await this.milestoneRepository
            .createQueryBuilder('milestone')
            .leftJoinAndSelect('milestone.project', 'project')
            .leftJoinAndSelect('project.student', 'student')
            .leftJoinAndSelect('project.supervisor', 'supervisor')
            .where('milestone.dueDate < :now', { now: new Date() })
            .andWhere('milestone.status != :completed', { completed: MilestoneStatus.COMPLETED })
            .getMany();

        for (const milestone of overdueMilestones) {
            // Notify student
            if (milestone.project?.student) {
                await this.createNotification({
                    type: NotificationType.MILESTONE_OVERDUE,
                    title: 'Milestone Overdue',
                    message: `Your milestone "${milestone.title}" in project "${milestone.project.title}" is overdue. Please update your progress or contact your supervisor.`,
                    userId: milestone.project.student.id,
                    priority: NotificationPriority.HIGH,
                    actionUrl: `/milestones/${milestone.id}`,
                    actionLabel: 'Update Milestone',
                    metadata: {
                        milestoneId: milestone.id,
                        projectId: milestone.project.id,
                        dueDate: milestone.dueDate,
                    },
                    milestoneId: milestone.id,
                });
            }

            // Notify supervisor
            if (milestone.project?.supervisor) {
                await this.createNotification({
                    type: NotificationType.MILESTONE_OVERDUE,
                    title: 'Student Milestone Overdue',
                    message: `Student ${milestone.project.student?.email} has an overdue milestone "${milestone.title}" in project "${milestone.project.title}".`,
                    userId: milestone.project.supervisor.id,
                    priority: NotificationPriority.MEDIUM,
                    actionUrl: `/milestones/${milestone.id}`,
                    actionLabel: 'Review Milestone',
                    metadata: {
                        milestoneId: milestone.id,
                        projectId: milestone.project.id,
                        studentId: milestone.project.student?.id,
                        dueDate: milestone.dueDate,
                    },
                    milestoneId: milestone.id,
                });
            }
        }

        this.logger.log(`Processed ${overdueMilestones.length} overdue milestones`);
    }

    /**
     * Initialize default notification preferences for a new user
     */
    async initializeDefaultPreferences(userId: string, userRole: UserRole): Promise<void> {
        const defaultPreferences = this.getDefaultPreferences(userRole);

        for (const pref of defaultPreferences) {
            await this.preferenceRepository.save(
                this.preferenceRepository.create({
                    userId,
                    notificationType: pref.type,
                    channel: pref.channel,
                    enabled: pref.enabled,
                    settings: pref.settings,
                }),
            );
        }

        this.logger.log(`Initialized default notification preferences for user: ${userId}`);
    }

    /**
     * Get default notification preferences based on user role
     */
    private getDefaultPreferences(userRole: UserRole): Array<{
        type: NotificationType;
        channel: NotificationChannel;
        enabled: boolean;
        settings?: Record<string, any>;
    }> {
        const basePreferences = [
            // In-app notifications (enabled by default for all types)
            { type: NotificationType.MILESTONE_OVERDUE, channel: NotificationChannel.IN_APP, enabled: true },
            { type: NotificationType.MILESTONE_BLOCKED, channel: NotificationChannel.IN_APP, enabled: true },
            { type: NotificationType.MILESTONE_COMPLETED, channel: NotificationChannel.IN_APP, enabled: true },
            { type: NotificationType.MILESTONE_UPDATED, channel: NotificationChannel.IN_APP, enabled: true },
            { type: NotificationType.PROJECT_ASSIGNED, channel: NotificationChannel.IN_APP, enabled: true },
            { type: NotificationType.SUPERVISOR_MESSAGE, channel: NotificationChannel.IN_APP, enabled: true },
            { type: NotificationType.SYSTEM_ANNOUNCEMENT, channel: NotificationChannel.IN_APP, enabled: true },
        ];

        if (userRole === UserRole.STUDENT) {
            return [
                ...basePreferences,
                // Email notifications for students (selective)
                { type: NotificationType.MILESTONE_OVERDUE, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.PROJECT_ASSIGNED, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.SUPERVISOR_MESSAGE, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.SYSTEM_ANNOUNCEMENT, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.MILESTONE_BLOCKED, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.MILESTONE_COMPLETED, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.MILESTONE_UPDATED, channel: NotificationChannel.EMAIL, enabled: false },
            ];
        } else if (userRole === UserRole.SUPERVISOR) {
            return [
                ...basePreferences,
                // Email notifications for supervisors (more comprehensive)
                { type: NotificationType.MILESTONE_OVERDUE, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.MILESTONE_BLOCKED, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.MILESTONE_COMPLETED, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.MILESTONE_UPDATED, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.PROJECT_ASSIGNED, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.SUPERVISOR_MESSAGE, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.SYSTEM_ANNOUNCEMENT, channel: NotificationChannel.EMAIL, enabled: true },
            ];
        } else {
            // Admin gets all notifications
            return [
                ...basePreferences,
                { type: NotificationType.MILESTONE_OVERDUE, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.MILESTONE_BLOCKED, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.MILESTONE_COMPLETED, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.MILESTONE_UPDATED, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.PROJECT_ASSIGNED, channel: NotificationChannel.EMAIL, enabled: true },
                { type: NotificationType.SUPERVISOR_MESSAGE, channel: NotificationChannel.EMAIL, enabled: false },
                { type: NotificationType.SYSTEM_ANNOUNCEMENT, channel: NotificationChannel.EMAIL, enabled: true },
            ];
        }
    }
}