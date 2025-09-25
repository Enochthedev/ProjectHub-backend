import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  MilestoneTeamNotification,
  SharedMilestone,
  User,
  NotificationType,
  NotificationPriority,
} from '../entities';
import {
  CreateTeamNotificationDto,
  NotificationFiltersDto,
  TeamNotificationResponseDto,
  PaginatedNotificationResponseDto,
} from '../dto/milestone';

@Injectable()
export class MilestoneTeamNotificationService {
  constructor(
    @InjectRepository(MilestoneTeamNotification)
    private readonly notificationRepository: Repository<MilestoneTeamNotification>,
    @InjectRepository(SharedMilestone)
    private readonly sharedMilestoneRepository: Repository<SharedMilestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createNotification(
    createDto: CreateTeamNotificationDto,
  ): Promise<TeamNotificationResponseDto> {
    // Verify recipient exists
    const recipient = await this.userRepository.findOne({
      where: { id: createDto.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Verify milestone exists if provided
    if (createDto.milestoneId) {
      const milestone = await this.sharedMilestoneRepository.findOne({
        where: { id: createDto.milestoneId },
      });

      if (!milestone) {
        throw new NotFoundException('Milestone not found');
      }
    }

    const notification = this.notificationRepository.create({
      recipientId: createDto.recipientId,
      milestoneId: createDto.milestoneId || null,
      type: createDto.type,
      priority: createDto.priority || NotificationPriority.MEDIUM,
      title: createDto.title,
      message: createDto.message,
      metadata: createDto.metadata || null,
      triggeredById: createDto.triggeredById || null,
    });

    const savedNotification =
      await this.notificationRepository.save(notification);
    return this.getNotificationById(savedNotification.id);
  }

  async createBulkNotifications(
    recipientIds: string[],
    notificationData: Omit<CreateTeamNotificationDto, 'recipientId'>,
  ): Promise<TeamNotificationResponseDto[]> {
    const notifications = recipientIds.map((recipientId) => {
      return this.notificationRepository.create({
        recipientId,
        milestoneId: notificationData.milestoneId || null,
        type: notificationData.type,
        priority: notificationData.priority || NotificationPriority.MEDIUM,
        title: notificationData.title,
        message: notificationData.message,
        metadata: notificationData.metadata || null,
        triggeredById: notificationData.triggeredById || null,
      });
    });

    const savedNotifications =
      await this.notificationRepository.save(notifications);
    return Promise.all(
      savedNotifications.map((notification) =>
        this.getNotificationById(notification.id),
      ),
    );
  }

  async getNotificationById(id: string): Promise<TeamNotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
      relations: [
        'recipient',
        'recipient.studentProfile',
        'milestone',
        'triggeredBy',
        'triggeredBy.studentProfile',
      ],
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.mapToResponseDto(notification);
  }

  async getNotificationsByUser(
    userId: string,
    filters?: NotificationFiltersDto,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedNotificationResponseDto> {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .leftJoinAndSelect('recipient.studentProfile', 'recipientProfile')
      .leftJoinAndSelect('notification.milestone', 'milestone')
      .leftJoinAndSelect('notification.triggeredBy', 'triggeredBy')
      .leftJoinAndSelect('triggeredBy.studentProfile', 'triggeredByProfile')
      .where('notification.recipientId = :userId', { userId });

    if (filters?.milestoneId) {
      queryBuilder.andWhere('notification.milestoneId = :milestoneId', {
        milestoneId: filters.milestoneId,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('notification.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.priority) {
      queryBuilder.andWhere('notification.priority = :priority', {
        priority: filters.priority,
      });
    }

    if (filters?.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', {
        isRead: filters.isRead,
      });
    }

    if (filters?.isEmailSent !== undefined) {
      queryBuilder.andWhere('notification.isEmailSent = :isEmailSent', {
        isEmailSent: filters.isEmailSent,
      });
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const notifications = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });

    return {
      notifications: notifications.map((notification) =>
        this.mapToResponseDto(notification),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  async markAsRead(
    id: string,
    userId: string,
  ): Promise<TeamNotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipientId: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.markAsRead();
    await this.notificationRepository.save(notification);

    return this.getNotificationById(id);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipientId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id, recipientId: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async getPendingEmailNotifications(): Promise<MilestoneTeamNotification[]> {
    return this.notificationRepository.find({
      where: { isEmailSent: false },
      relations: ['recipient', 'milestone', 'triggeredBy'],
    });
  }

  async markEmailAsSent(id: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (notification) {
      notification.markEmailAsSent();
      await this.notificationRepository.save(notification);
    }
  }

  // Helper methods for creating specific notification types
  async notifyMilestoneCreated(
    milestoneId: string,
    assigneeIds: string[],
    createdById: string,
  ): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: milestoneId },
    });

    if (!milestone) return;

    const notificationData = {
      milestoneId,
      type: NotificationType.MILESTONE_CREATED,
      priority: NotificationPriority.MEDIUM,
      title: 'New Milestone Created',
      message: `A new milestone "${milestone.title}" has been created and assigned to you.`,
      triggeredById: createdById,
    };

    await this.createBulkNotifications(assigneeIds, notificationData);
  }

  async notifyMilestoneStatusChanged(
    milestoneId: string,
    assigneeIds: string[],
    newStatus: string,
    changedById: string,
  ): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: milestoneId },
    });

    if (!milestone) return;

    const notificationData = {
      milestoneId,
      type: NotificationType.MILESTONE_STATUS_CHANGED,
      priority: NotificationPriority.MEDIUM,
      title: 'Milestone Status Updated',
      message: `Milestone "${milestone.title}" status has been changed to ${newStatus}.`,
      triggeredById: changedById,
    };

    // Don't notify the person who made the change
    const recipientIds = assigneeIds.filter((id) => id !== changedById);
    if (recipientIds.length > 0) {
      await this.createBulkNotifications(recipientIds, notificationData);
    }
  }

  async notifyConflictReported(
    milestoneId: string,
    assigneeIds: string[],
    reportedById: string,
    conflictDetails: string,
  ): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: milestoneId },
    });

    if (!milestone) return;

    const notificationData = {
      milestoneId,
      type: NotificationType.CONFLICT_REPORTED,
      priority: NotificationPriority.HIGH,
      title: 'Conflict Reported',
      message: `A conflict has been reported for milestone "${milestone.title}": ${conflictDetails}`,
      metadata: { conflictDetails },
      triggeredById: reportedById,
    };

    // Don't notify the person who reported the conflict
    const recipientIds = assigneeIds.filter((id) => id !== reportedById);
    if (recipientIds.length > 0) {
      await this.createBulkNotifications(recipientIds, notificationData);
    }
  }

  async notifyDeadlineApproaching(
    milestoneId: string,
    assigneeIds: string[],
    daysUntilDue: number,
  ): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: milestoneId },
    });

    if (!milestone) return;

    const priority =
      daysUntilDue <= 1
        ? NotificationPriority.URGENT
        : NotificationPriority.HIGH;

    const notificationData = {
      milestoneId,
      type: NotificationType.DEADLINE_APPROACHING,
      priority,
      title: 'Milestone Deadline Approaching',
      message: `Milestone "${milestone.title}" is due in ${daysUntilDue} day(s).`,
      metadata: { daysUntilDue },
    };

    await this.createBulkNotifications(assigneeIds, notificationData);
  }

  async notifyMilestoneOverdue(
    milestoneId: string,
    assigneeIds: string[],
  ): Promise<void> {
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: milestoneId },
    });

    if (!milestone) return;

    const notificationData = {
      milestoneId,
      type: NotificationType.MILESTONE_OVERDUE,
      priority: NotificationPriority.URGENT,
      title: 'Milestone Overdue',
      message: `Milestone "${milestone.title}" is now overdue. Please update the status or contact your team.`,
    };

    await this.createBulkNotifications(assigneeIds, notificationData);
  }

  private mapToResponseDto(
    notification: MilestoneTeamNotification,
  ): TeamNotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      isRead: notification.isRead,
      readAt: notification.readAt,
      isEmailSent: notification.isEmailSent,
      emailSentAt: notification.emailSentAt,
      recipient: {
        id: notification.recipient.id,
        email: notification.recipient.email,
        studentProfile: notification.recipient.studentProfile
          ? {
              name: notification.recipient.studentProfile.name,
            }
          : undefined,
      },
      milestone: notification.milestone
        ? {
            id: notification.milestone.id,
            title: notification.milestone.title,
            dueDate: notification.milestone.dueDate,
            status: notification.milestone.status,
          }
        : null,
      triggeredBy: notification.triggeredBy
        ? {
            id: notification.triggeredBy.id,
            email: notification.triggeredBy.email,
            studentProfile: notification.triggeredBy.studentProfile
              ? {
                  name: notification.triggeredBy.studentProfile.name,
                }
              : undefined,
          }
        : null,
      createdAt: notification.createdAt,
    };
  }
}
