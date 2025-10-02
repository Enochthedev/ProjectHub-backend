import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification.service';
import {
    Notification,
    NotificationType,
    NotificationStatus,
    NotificationPriority,
} from '../../entities/notification.entity';
import {
    NotificationPreference,
    NotificationChannel,
} from '../../entities/notification-preference.entity';
import { User } from '../../entities/user.entity';
import { Milestone } from '../../entities/milestone.entity';
import { EmailService } from '../../auth/services/email.service';
import { UserRole } from '../../common/enums/user-role.enum';

describe('NotificationService', () => {
    let service: NotificationService;
    let notificationRepository: Repository<Notification>;
    let preferenceRepository: Repository<NotificationPreference>;
    let userRepository: Repository<User>;
    let milestoneRepository: Repository<Milestone>;
    let emailService: EmailService;

    const mockNotificationRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn(),
            getMany: jest.fn(),
        })),
    };

    const mockPreferenceRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockUserRepository = {
        findOne: jest.fn(),
    };

    const mockMilestoneRepository = {
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
        })),
    };

    const mockEmailService = {
        sendEmail: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationService,
                {
                    provide: getRepositoryToken(Notification),
                    useValue: mockNotificationRepository,
                },
                {
                    provide: getRepositoryToken(NotificationPreference),
                    useValue: mockPreferenceRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(Milestone),
                    useValue: mockMilestoneRepository,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
            ],
        }).compile();

        service = module.get<NotificationService>(NotificationService);
        notificationRepository = module.get<Repository<Notification>>(
            getRepositoryToken(Notification),
        );
        preferenceRepository = module.get<Repository<NotificationPreference>>(
            getRepositoryToken(NotificationPreference),
        );
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        milestoneRepository = module.get<Repository<Milestone>>(
            getRepositoryToken(Milestone),
        );
        emailService = module.get<EmailService>(EmailService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createNotification', () => {
        it('should create and save a notification', async () => {
            const mockNotification = {
                id: 'test-notification-id',
                type: NotificationType.MILESTONE_OVERDUE,
                title: 'Test Notification',
                message: 'Test message',
                userId: 'user-id',
                priority: NotificationPriority.MEDIUM,
                status: NotificationStatus.UNREAD,
            };

            const mockUser = {
                id: 'user-id',
                email: 'test@ui.edu.ng',
                role: UserRole.STUDENT,
            };

            mockNotificationRepository.create.mockReturnValue(mockNotification);
            mockNotificationRepository.save.mockResolvedValue(mockNotification);
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockPreferenceRepository.find.mockResolvedValue([]);
            mockEmailService.sendEmail.mockResolvedValue('email-delivery-id');

            const result = await service.createNotification({
                type: NotificationType.MILESTONE_OVERDUE,
                title: 'Test Notification',
                message: 'Test message',
                userId: 'user-id',
            });

            expect(result).toEqual(mockNotification);
            expect(mockNotificationRepository.create).toHaveBeenCalledWith({
                type: NotificationType.MILESTONE_OVERDUE,
                title: 'Test Notification',
                message: 'Test message',
                userId: 'user-id',
                priority: NotificationPriority.MEDIUM,
                actionUrl: undefined,
                actionLabel: undefined,
                metadata: undefined,
                milestoneId: undefined,
                status: NotificationStatus.UNREAD,
            });
            expect(mockNotificationRepository.save).toHaveBeenCalledWith(mockNotification);
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read', async () => {
            mockNotificationRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.markAsRead('notification-id', 'user-id');

            expect(result).toBe(true);
            expect(mockNotificationRepository.update).toHaveBeenCalledWith(
                { id: 'notification-id', userId: 'user-id' },
                { status: NotificationStatus.READ, readAt: expect.any(Date) },
            );
        });

        it('should return false when notification not found', async () => {
            mockNotificationRepository.update.mockResolvedValue({ affected: 0 });

            const result = await service.markAsRead('non-existent-id', 'user-id');

            expect(result).toBe(false);
        });
    });

    describe('getUserNotifications', () => {
        it('should return paginated notifications with unread count', async () => {
            const mockNotifications = [
                {
                    id: 'notification-1',
                    title: 'Test 1',
                    status: NotificationStatus.UNREAD,
                },
                {
                    id: 'notification-2',
                    title: 'Test 2',
                    status: NotificationStatus.READ,
                },
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([mockNotifications, 2]),
            };

            mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
            mockNotificationRepository.count.mockResolvedValue(1);

            const result = await service.getUserNotifications('user-id', 1, 20);

            expect(result).toEqual({
                notifications: mockNotifications,
                total: 2,
                unreadCount: 1,
            });
        });
    });

    describe('updateNotificationPreference', () => {
        it('should create new preference when not exists', async () => {
            const mockPreference = {
                id: 'preference-id',
                userId: 'user-id',
                notificationType: NotificationType.MILESTONE_OVERDUE,
                channel: NotificationChannel.EMAIL,
                enabled: true,
            };

            mockPreferenceRepository.findOne.mockResolvedValue(null);
            mockPreferenceRepository.create.mockReturnValue(mockPreference);
            mockPreferenceRepository.save.mockResolvedValue(mockPreference);

            const result = await service.updateNotificationPreference(
                'user-id',
                NotificationType.MILESTONE_OVERDUE,
                NotificationChannel.EMAIL,
                true,
            );

            expect(result).toEqual(mockPreference);
            expect(mockPreferenceRepository.create).toHaveBeenCalledWith({
                userId: 'user-id',
                notificationType: NotificationType.MILESTONE_OVERDUE,
                channel: NotificationChannel.EMAIL,
                enabled: true,
                settings: undefined,
            });
        });

        it('should update existing preference', async () => {
            const existingPreference = {
                id: 'preference-id',
                userId: 'user-id',
                notificationType: NotificationType.MILESTONE_OVERDUE,
                channel: NotificationChannel.EMAIL,
                enabled: false,
            };

            const updatedPreference = { ...existingPreference, enabled: true };

            mockPreferenceRepository.findOne.mockResolvedValue(existingPreference);
            mockPreferenceRepository.save.mockResolvedValue(updatedPreference);

            const result = await service.updateNotificationPreference(
                'user-id',
                NotificationType.MILESTONE_OVERDUE,
                NotificationChannel.EMAIL,
                true,
            );

            expect(result).toEqual(updatedPreference);
            expect(existingPreference.enabled).toBe(true);
        });
    });

    describe('initializeDefaultPreferences', () => {
        it('should create default preferences for student', async () => {
            mockPreferenceRepository.create.mockImplementation((data) => data);
            mockPreferenceRepository.save.mockImplementation((data) => Promise.resolve(data));

            await service.initializeDefaultPreferences('user-id', UserRole.STUDENT);

            // Should create preferences for both in-app and email channels
            expect(mockPreferenceRepository.save).toHaveBeenCalledTimes(14); // 7 types × 2 channels
        });

        it('should create default preferences for supervisor', async () => {
            mockPreferenceRepository.create.mockImplementation((data) => data);
            mockPreferenceRepository.save.mockImplementation((data) => Promise.resolve(data));

            await service.initializeDefaultPreferences('user-id', UserRole.SUPERVISOR);

            expect(mockPreferenceRepository.save).toHaveBeenCalledTimes(14); // 7 types × 2 channels
        });
    });
});