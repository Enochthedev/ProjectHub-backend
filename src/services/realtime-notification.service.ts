import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeNotification } from '../entities/realtime-notification.entity';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

export interface NotificationData {
  userId: string;
  type:
    | 'milestone_deadline'
    | 'project_update'
    | 'ai_response'
    | 'bookmark_update'
    | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  data?: Record<string, any>;
  expiresAt?: Date;
}

@Injectable()
export class RealtimeNotificationService {
  private readonly logger = new Logger(RealtimeNotificationService.name);

  constructor(
    @InjectRepository(RealtimeNotification)
    private readonly notificationRepository: Repository<RealtimeNotification>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createNotification(
    notificationData: NotificationData,
  ): Promise<RealtimeNotification> {
    try {
      const notification = this.notificationRepository.create({
        userId: notificationData.userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        priority: notificationData.priority,
        actionUrl: notificationData.actionUrl,
        data: notificationData.data || {},
        expiresAt: notificationData.expiresAt,
        isRead: false,
      });

      const savedNotification =
        await this.notificationRepository.save(notification);

      // Emit event for real-time delivery
      this.eventEmitter.emit('notification.created', savedNotification);

      this.logger.log(
        `Created notification: ${notificationData.type} for user ${notificationData.userId}`,
      );

      return savedNotification;
    } catch (error) {
      this.logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async getPendingNotifications(
    userId: string,
  ): Promise<RealtimeNotification[]> {
    return this.notificationRepository.find({
      where: {
        userId,
        isRead: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getUnreadNotifications(
    userId: string,
    limit: number = 50,
  ): Promise<RealtimeNotification[]> {
    return this.notificationRepository.find({
      where: { userId, isRead: false },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getAllNotifications(
    userId: string,
    limit: number = 100,
  ): Promise<RealtimeNotification[]> {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    await this.notificationRepository.delete({ id: notificationId, userId });
  }

  async deleteExpiredNotifications(): Promise<void> {
    const now = new Date();
    await this.notificationRepository
      .createQueryBuilder()
      .delete()
      .where('expires_at IS NOT NULL AND expires_at < :now', { now })
      .execute();

    this.logger.log('Deleted expired notifications');
  }

  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
  }> {
    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: { userId } }),
      this.notificationRepository.count({ where: { userId, isRead: false } }),
    ]);

    return { total, unread };
  }

  // Convenience methods for specific notification types
  async createMilestoneDeadlineNotification(
    userId: string,
    milestoneTitle: string,
    dueDate: Date,
    projectId: string,
  ) {
    const daysUntilDue = Math.ceil(
      (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    return this.createNotification({
      userId,
      type: 'milestone_deadline',
      title: 'Milestone Deadline Approaching',
      message: `"${milestoneTitle}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
      priority:
        daysUntilDue <= 1 ? 'urgent' : daysUntilDue <= 3 ? 'high' : 'medium',
      actionUrl: `/projects/${projectId}/milestones`,
      data: { projectId, dueDate: dueDate.toISOString() },
    });
  }

  async createProjectUpdateNotification(
    userId: string,
    projectTitle: string,
    updateType: string,
    projectId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'project_update',
      title: 'Project Updated',
      message: `"${projectTitle}" has been ${updateType}`,
      priority: 'medium',
      actionUrl: `/projects/${projectId}`,
      data: { projectId, updateType },
    });
  }

  async createAIResponseNotification(
    userId: string,
    conversationId: string,
    preview: string,
  ) {
    return this.createNotification({
      userId,
      type: 'ai_response',
      title: 'AI Assistant Response',
      message:
        preview.length > 100 ? `${preview.substring(0, 100)}...` : preview,
      priority: 'low',
      actionUrl: `/ai-assistant?conversation=${conversationId}`,
      data: { conversationId },
    });
  }

  async createBookmarkUpdateNotification(
    userId: string,
    projectTitle: string,
    action: 'added' | 'removed',
    projectId: string,
  ) {
    return this.createNotification({
      userId,
      type: 'bookmark_update',
      title: `Bookmark ${action === 'added' ? 'Added' : 'Removed'}`,
      message: `"${projectTitle}" has been ${action === 'added' ? 'added to' : 'removed from'} your bookmarks`,
      priority: 'low',
      actionUrl: action === 'added' ? '/bookmarks' : `/projects/${projectId}`,
      data: { projectId, action },
    });
  }

  async createSystemAlertNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
  ) {
    return this.createNotification({
      userId,
      type: 'system_alert',
      title,
      message,
      priority,
      data: { isSystemAlert: true },
    });
  }

  @OnEvent('notification.created')
  handleNotificationCreated(notification: RealtimeNotification) {
    // This will be handled by the WebSocket gateway to emit to connected clients
    this.eventEmitter.emit('realtime.notification.send', notification);
  }
}
