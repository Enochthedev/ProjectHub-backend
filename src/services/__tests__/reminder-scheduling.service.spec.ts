import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ReminderSchedulingService,
  ReminderPreferences,
} from '../reminder-scheduling.service';
import { MilestoneReminder } from '../../entities/milestone-reminder.entity';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { UserPreferences } from '../../entities/user-preferences.entity';
import { ReminderType } from '../../common/enums/reminder-type.enum';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';

describe('ReminderSchedulingService', () => {
  let service: ReminderSchedulingService;
  let reminderRepository: jest.Mocked<Repository<MilestoneReminder>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let userPreferencesRepository: jest.Mocked<Repository<UserPreferences>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderSchedulingService,
        {
          provide: getRepositoryToken(MilestoneReminder),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserPreferences),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReminderSchedulingService>(ReminderSchedulingService);
    reminderRepository = module.get(getRepositoryToken(MilestoneReminder));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
    userPreferencesRepository = module.get(getRepositoryToken(UserPreferences));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('scheduleRemindersForMilestone', () => {
    const mockMilestone: Milestone = {
      id: 'milestone-1',
      title: 'Test Milestone',
      description: 'Test Description',
      dueDate: new Date('2024-06-01'),
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
      studentId: 'student-1',
      student: {
        id: 'student-1',
        email: 'student@test.com',
      } as User,
      estimatedHours: 10,
      actualHours: 0,
      completedAt: null,
      blockingReason: null,
      isTemplate: false,
      templateId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isOverdue: jest.fn().mockReturnValue(false),
      getDaysUntilDue: jest.fn().mockReturnValue(30),
      canTransitionTo: jest.fn().mockReturnValue(true),
      getProgressPercentage: jest.fn().mockReturnValue(0),
    } as any;

    it('should schedule reminders for a milestone with default preferences', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      reminderRepository.create.mockImplementation(
        (data) => data as MilestoneReminder,
      );
      reminderRepository.save.mockResolvedValue({} as MilestoneReminder);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.scheduleRemindersForMilestone('milestone-1');

      expect(result.remindersCreated).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);
      expect(reminderRepository.save).toHaveBeenCalled();
    });

    it('should not schedule reminders for completed milestones', async () => {
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.COMPLETED,
      } as Milestone;
      milestoneRepository.findOne.mockResolvedValue(completedMilestone);

      const result = await service.scheduleRemindersForMilestone('milestone-1');

      expect(result.remindersCreated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(reminderRepository.save).not.toHaveBeenCalled();
    });

    it('should not schedule reminders for cancelled milestones', async () => {
      const cancelledMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.CANCELLED,
      } as Milestone;
      milestoneRepository.findOne.mockResolvedValue(cancelledMilestone);

      const result = await service.scheduleRemindersForMilestone('milestone-1');

      expect(result.remindersCreated).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(reminderRepository.save).not.toHaveBeenCalled();
    });

    it('should handle milestone not found', async () => {
      milestoneRepository.findOne.mockResolvedValue(null);

      const result = await service.scheduleRemindersForMilestone('nonexistent');

      expect(result.remindersCreated).toBe(0);
      expect(result.errors).toContain('Milestone nonexistent not found');
    });

    it('should schedule reminders with custom preferences', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      reminderRepository.create.mockImplementation(
        (data) => data as MilestoneReminder,
      );
      reminderRepository.save.mockResolvedValue({} as MilestoneReminder);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const customPreferences: Partial<ReminderPreferences> = {
        emailEnabled: true,
        inAppEnabled: false,
        smsEnabled: false,
        advanceReminderDays: [5, 2],
        overdueReminderEnabled: false,
      };

      const result = await service.scheduleRemindersForMilestone(
        'milestone-1',
        customPreferences,
      );

      expect(result.remindersCreated).toBe(2); // Only 2 email reminders (5 days, 2 days)
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors during reminder creation', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      reminderRepository.create.mockImplementation(
        (data) => data as MilestoneReminder,
      );
      reminderRepository.save.mockRejectedValue(new Error('Database error'));
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const result = await service.scheduleRemindersForMilestone('milestone-1');

      expect(result.remindersCreated).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to create');
    });
  });

  describe('updateReminderPreferences', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'user@test.com',
    } as User;

    const mockUserPreferences: UserPreferences = {
      id: 'pref-1',
      userId: 'user-1',
      emailRemindersEnabled: true,
      inAppRemindersEnabled: true,
      smsRemindersEnabled: false,
      advanceReminderDays: [7, 3, 1],
      overdueRemindersEnabled: true,
      escalationEnabled: true,
      getReminderPreferences: jest.fn(),
      updateReminderPreferences: jest.fn(),
    } as any;

    it('should update reminder preferences for a user', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userPreferencesRepository.findOne.mockResolvedValue(mockUserPreferences);
      userPreferencesRepository.save.mockResolvedValue(mockUserPreferences);

      const preferences: Partial<ReminderPreferences> = {
        emailEnabled: false,
        advanceReminderDays: [5, 1],
      };

      await service.updateReminderPreferences('user-1', preferences);

      expect(
        mockUserPreferences.updateReminderPreferences,
      ).toHaveBeenCalledWith(preferences);
      expect(userPreferencesRepository.save).toHaveBeenCalledWith(
        mockUserPreferences,
      );
    });

    it('should throw error for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateReminderPreferences('nonexistent', {}),
      ).rejects.toThrow('User nonexistent not found');
    });

    it('should create default preferences if they do not exist', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userPreferencesRepository.findOne.mockResolvedValue(null);

      const defaultPreferences = UserPreferences.createDefault('user-1');
      jest
        .spyOn(UserPreferences, 'createDefault')
        .mockReturnValue(defaultPreferences);
      userPreferencesRepository.save.mockResolvedValue(defaultPreferences);

      const preferences: Partial<ReminderPreferences> = {
        emailEnabled: false,
      };

      await service.updateReminderPreferences('user-1', preferences);

      expect(UserPreferences.createDefault).toHaveBeenCalledWith('user-1');
      expect(userPreferencesRepository.save).toHaveBeenCalled();
    });
  });

  describe('getReminderPreferences', () => {
    const mockUser: User = {
      id: 'user-1',
      email: 'user@test.com',
    } as User;

    it('should return stored preferences', async () => {
      const mockUserPreferences: UserPreferences = {
        id: 'pref-1',
        userId: 'user-1',
        getReminderPreferences: jest.fn().mockReturnValue({
          emailEnabled: true,
          inAppEnabled: true,
          smsEnabled: false,
          advanceReminderDays: [7, 3, 1],
          overdueReminderEnabled: true,
          escalationEnabled: true,
        }),
      } as any;

      userRepository.findOne.mockResolvedValue(mockUser);
      userPreferencesRepository.findOne.mockResolvedValue(mockUserPreferences);

      const preferences = await service.getReminderPreferences('user-1');

      expect(preferences.emailEnabled).toBe(true);
      expect(preferences.inAppEnabled).toBe(true);
      expect(preferences.smsEnabled).toBe(false);
      expect(preferences.advanceReminderDays).toEqual([7, 3, 1]);
    });

    it('should create and return default preferences if none exist', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      userPreferencesRepository.findOne.mockResolvedValue(null);

      const defaultPreferences = UserPreferences.createDefault('user-1');
      jest
        .spyOn(UserPreferences, 'createDefault')
        .mockReturnValue(defaultPreferences);
      userPreferencesRepository.save.mockResolvedValue(defaultPreferences);

      const preferences = await service.getReminderPreferences('user-1');

      expect(UserPreferences.createDefault).toHaveBeenCalledWith('user-1');
      expect(userPreferencesRepository.save).toHaveBeenCalledWith(
        defaultPreferences,
      );
    });

    it('should throw error for non-existent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getReminderPreferences('nonexistent'),
      ).rejects.toThrow('User nonexistent not found');
    });
  });

  describe('getDueReminders', () => {
    it('should return due reminders', async () => {
      const mockReminders = [
        {
          id: 'reminder-1',
          milestoneId: 'milestone-1',
          reminderType: ReminderType.EMAIL,
          daysBefore: 3,
          sent: false,
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockReminders);

      const reminders = await service.getDueReminders();

      expect(reminders).toEqual(mockReminders);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reminder.sent = false',
      );
    });

    it('should filter out sent reminders', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getDueReminders();

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'reminder.sent = false',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'reminder.canRetry() = true',
      );
    });
  });

  describe('getOverdueMilestonesForEscalation', () => {
    it('should return overdue milestones older than 3 days', async () => {
      const mockMilestones = [
        {
          id: 'milestone-1',
          title: 'Overdue Milestone',
          dueDate: new Date('2024-01-01'),
          status: MilestoneStatus.IN_PROGRESS,
        },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(mockMilestones);

      const milestones = await service.getOverdueMilestonesForEscalation();

      expect(milestones).toEqual(mockMilestones);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.status NOT IN (:...excludedStatuses)',
        {
          excludedStatuses: [
            MilestoneStatus.COMPLETED,
            MilestoneStatus.CANCELLED,
          ],
        },
      );
    });
  });

  describe('rescheduleReminders', () => {
    const mockMilestone: Milestone = {
      id: 'milestone-1',
      title: 'Test Milestone',
      studentId: 'student-1',
      status: MilestoneStatus.NOT_STARTED,
    } as Milestone;

    it('should reschedule reminders for a milestone', async () => {
      const mockUserPreferences: UserPreferences = {
        id: 'pref-1',
        userId: 'student-1',
        getReminderPreferences: jest.fn().mockReturnValue({
          emailEnabled: true,
          inAppEnabled: true,
          smsEnabled: false,
          advanceReminderDays: [7, 3, 1],
          overdueReminderEnabled: true,
          escalationEnabled: true,
        }),
      } as any;

      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue({
        id: 'student-1',
      } as User);
      userPreferencesRepository.findOne.mockResolvedValue(mockUserPreferences);
      reminderRepository.create.mockImplementation(
        (data) => data as MilestoneReminder,
      );
      reminderRepository.save.mockResolvedValue({} as MilestoneReminder);
      mockQueryBuilder.execute.mockResolvedValue({ affected: 2 });

      const result = await service.rescheduleReminders('milestone-1');

      expect(result.remindersCreated).toBeGreaterThan(0);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('should handle milestone not found during rescheduling', async () => {
      milestoneRepository.findOne.mockResolvedValue(null);

      const result = await service.rescheduleReminders('nonexistent');

      expect(result.remindersCreated).toBe(0);
      expect(result.errors).toContain('Milestone nonexistent not found');
    });
  });

  describe('cleanupOldReminders', () => {
    it('should clean up old processed reminders', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 5 });

      const cleaned = await service.cleanupOldReminders(30);

      expect(cleaned).toBe(5);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('sent = true');
    });

    it('should handle no reminders to clean up', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ affected: 0 });

      const cleaned = await service.cleanupOldReminders(30);

      expect(cleaned).toBe(0);
    });
  });
});
