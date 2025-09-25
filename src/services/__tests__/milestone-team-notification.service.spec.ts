import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MilestoneTeamNotificationService } from '../milestone-team-notification.service';
import {
  MilestoneTeamNotification,
  SharedMilestone,
  User,
  NotificationType,
  NotificationPriority,
} from '../../entities';
import { CreateTeamNotificationDto } from '../../dto/milestone';

describe('MilestoneTeamNotificationService', () => {
  let service: MilestoneTeamNotificationService;
  let notificationRepository: jest.Mocked<
    Repository<MilestoneTeamNotification>
  >;
  let sharedMilestoneRepository: jest.Mocked<Repository<SharedMilestone>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    studentProfile: {
      name: 'John Doe',
    },
  } as any;

  const mockMilestone = {
    id: 'milestone-1',
    title: 'Test Milestone',
    dueDate: new Date('2024-12-31'),
    status: 'not_started',
  } as any;

  const mockNotification = {
    id: 'notification-1',
    recipientId: 'user-1',
    milestoneId: 'milestone-1',
    type: NotificationType.MILESTONE_CREATED,
    priority: NotificationPriority.MEDIUM,
    title: 'Test Notification',
    message: 'Test message',
    metadata: null,
    triggeredById: 'user-2',
    isRead: false,
    readAt: null,
    isEmailSent: false,
    emailSentAt: null,
    recipient: mockUser,
    milestone: mockMilestone,
    triggeredBy: mockUser,
    createdAt: new Date(),
    markAsRead: jest.fn(),
    markEmailAsSent: jest.fn(),
    isUrgent: jest.fn().mockReturnValue(false),
    shouldSendEmail: jest.fn().mockReturnValue(true),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneTeamNotificationService,
        {
          provide: getRepositoryToken(MilestoneTeamNotification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SharedMilestone),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MilestoneTeamNotificationService>(
      MilestoneTeamNotificationService,
    );
    notificationRepository = module.get(
      getRepositoryToken(MilestoneTeamNotification),
    );
    sharedMilestoneRepository = module.get(getRepositoryToken(SharedMilestone));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('createNotification', () => {
    const createDto: CreateTeamNotificationDto = {
      recipientId: 'user-1',
      milestoneId: 'milestone-1',
      type: NotificationType.MILESTONE_CREATED,
      title: 'Test Notification',
      message: 'Test message',
    };

    it('should create notification successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      sharedMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.createNotification(createDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(sharedMilestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
      });
      expect(notificationRepository.create).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if recipient not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.createNotification(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if milestone not found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      sharedMilestoneRepository.findOne.mockResolvedValue(null);

      await expect(service.createNotification(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create notification without milestone', async () => {
      const createDtoWithoutMilestone = {
        ...createDto,
        milestoneId: undefined,
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.createNotification(
        createDtoWithoutMilestone,
      );

      expect(sharedMilestoneRepository.findOne).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('createBulkNotifications', () => {
    it('should create multiple notifications', async () => {
      const recipientIds = ['user-1', 'user-2'];
      const notificationData = {
        milestoneId: 'milestone-1',
        type: NotificationType.MILESTONE_CREATED,
        title: 'Test Notification',
        message: 'Test message',
      };

      const mockNotifications = [
        mockNotification,
        { ...mockNotification, id: 'notification-2' },
      ];
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotifications as any);
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.createBulkNotifications(
        recipientIds,
        notificationData,
      );

      expect(notificationRepository.create).toHaveBeenCalledTimes(2);
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('getNotificationById', () => {
    it('should return notification by id', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);

      const result = await service.getNotificationById('notification-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-1' },
        relations: expect.any(Array),
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('notification-1');
    });

    it('should throw NotFoundException if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.getNotificationById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      notificationRepository.findOne.mockResolvedValue(mockNotification);
      notificationRepository.save.mockResolvedValue(mockNotification);

      const result = await service.markAsRead('notification-1', 'user-1');

      expect(notificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'notification-1', recipientId: 'user-1' },
      });
      expect(mockNotification.markAsRead).toHaveBeenCalled();
      expect(notificationRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if notification not found', async () => {
      notificationRepository.findOne.mockResolvedValue(null);

      await expect(service.markAsRead('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      await service.markAllAsRead('user-1');

      expect(notificationRepository.update).toHaveBeenCalledWith(
        { recipientId: 'user-1', isRead: false },
        { isRead: true, readAt: expect.any(Date) },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      notificationRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(notificationRepository.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', isRead: false },
      });
      expect(result).toBe(5);
    });
  });

  describe('notification helper methods', () => {
    beforeEach(() => {
      sharedMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      notificationRepository.create.mockReturnValue(mockNotification);
      notificationRepository.save.mockResolvedValue([mockNotification] as any);
      notificationRepository.findOne.mockResolvedValue(mockNotification);
    });

    it('should notify milestone created', async () => {
      await service.notifyMilestoneCreated(
        'milestone-1',
        ['user-1', 'user-2'],
        'creator-1',
      );

      expect(sharedMilestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
      });
      expect(notificationRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should notify milestone status changed', async () => {
      await service.notifyMilestoneStatusChanged(
        'milestone-1',
        ['user-1', 'user-2', 'changer-1'],
        'completed',
        'changer-1',
      );

      expect(notificationRepository.create).toHaveBeenCalledTimes(2); // Excludes the changer
    });

    it('should notify conflict reported', async () => {
      await service.notifyConflictReported(
        'milestone-1',
        ['user-1', 'user-2', 'reporter-1'],
        'reporter-1',
        'Deadline conflict',
      );

      expect(notificationRepository.create).toHaveBeenCalledTimes(2); // Excludes the reporter
    });

    it('should notify deadline approaching', async () => {
      await service.notifyDeadlineApproaching(
        'milestone-1',
        ['user-1', 'user-2'],
        3,
      );

      expect(notificationRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should notify milestone overdue', async () => {
      await service.notifyMilestoneOverdue('milestone-1', ['user-1', 'user-2']);

      expect(notificationRepository.create).toHaveBeenCalledTimes(2);
    });
  });
});
