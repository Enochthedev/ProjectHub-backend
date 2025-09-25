import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneReminderJobService } from '../milestone-reminder-job.service';
import { MilestoneEmailReminderService } from '../milestone-email-reminder.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneReminder } from '../../entities/milestone-reminder.entity';
import { User } from '../../entities/user.entity';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';
import { ReminderType } from '../../common/enums/reminder-type.enum';
import { UserRole } from '../../common/enums/user-role.enum';

describe('MilestoneReminderJobService', () => {
  let service: MilestoneReminderJobService;
  let milestoneRepository: Repository<Milestone>;
  let reminderRepository: Repository<MilestoneReminder>;
  let emailReminderService: MilestoneEmailReminderService;

  const mockStudent: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'student@test.com',
    name: 'Test Student',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    password: 'hashedPassword',
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMilestone: Milestone = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    title: 'Literature Review',
    description: 'Complete comprehensive literature review',
    dueDate: new Date('2024-06-15'),
    status: MilestoneStatus.NOT_STARTED,
    priority: Priority.HIGH,
    studentId: mockStudent.id,
    student: mockStudent,
    projectId: null,
    project: null,
    completedAt: null,
    estimatedHours: 40,
    actualHours: 0,
    blockingReason: null,
    isTemplate: false,
    templateId: null,
    notes: [],
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    canTransitionTo: jest.fn(),
    getProgressPercentage: jest.fn(),
    getDaysUntilDue: jest.fn(),
    isOverdue: jest.fn(),
  } as any;

  const mockReminder: MilestoneReminder = {
    id: '323e4567-e89b-12d3-a456-426614174000',
    milestoneId: mockMilestone.id,
    milestone: mockMilestone,
    reminderType: ReminderType.EMAIL,
    daysBefore: 3,
    sent: false,
    sentAt: null,
    errorMessage: null,
    createdAt: new Date(),
  };

  const mockMilestoneRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
  };

  const mockReminderRepository = {
    createQueryBuilder: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockEmailReminderService = {
    sendMilestoneReminder: jest.fn(),
    sendOverdueReminder: jest.fn(),
    sendEscalationReminder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneReminderJobService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(MilestoneReminder),
          useValue: mockReminderRepository,
        },
        {
          provide: MilestoneEmailReminderService,
          useValue: mockEmailReminderService,
        },
      ],
    }).compile();

    service = module.get<MilestoneReminderJobService>(
      MilestoneReminderJobService,
    );
    milestoneRepository = module.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
    );
    reminderRepository = module.get<Repository<MilestoneReminder>>(
      getRepositoryToken(MilestoneReminder),
    );
    emailReminderService = module.get<MilestoneEmailReminderService>(
      MilestoneEmailReminderService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processReminders', () => {
    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockReminderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
    });

    it('should process due reminders successfully', async () => {
      // Arrange
      const dueReminders = [mockReminder];
      mockQueryBuilder.getMany.mockResolvedValue(dueReminders);
      mockEmailReminderService.sendMilestoneReminder.mockResolvedValue(true);
      mockReminderRepository.save.mockResolvedValue({
        ...mockReminder,
        sent: true,
      });

      // Act
      const result = await service.processReminders();

      // Assert
      expect(result.remindersSent).toBe(1);
      expect(result.errors).toBe(0);
      expect(
        mockEmailReminderService.sendMilestoneReminder,
      ).toHaveBeenCalledWith(mockReminder.milestone, mockReminder.daysBefore);
      expect(mockReminderRepository.save).toHaveBeenCalledWith({
        ...mockReminder,
        sent: true,
        sentAt: expect.any(Date),
      });
    });

    it('should handle email sending failures', async () => {
      // Arrange
      const dueReminders = [mockReminder];
      mockQueryBuilder.getMany.mockResolvedValue(dueReminders);
      mockEmailReminderService.sendMilestoneReminder.mockResolvedValue(false);
      mockReminderRepository.save.mockResolvedValue(mockReminder);

      // Act
      const result = await service.processReminders();

      // Assert
      expect(result.remindersSent).toBe(0);
      expect(result.errors).toBe(1);
      expect(mockReminderRepository.save).toHaveBeenCalledWith({
        ...mockReminder,
        errorMessage: 'Failed to send email reminder',
      });
    });

    it('should handle exceptions during reminder processing', async () => {
      // Arrange
      const dueReminders = [mockReminder];
      mockQueryBuilder.getMany.mockResolvedValue(dueReminders);
      mockEmailReminderService.sendMilestoneReminder.mockRejectedValue(
        new Error('Email service error'),
      );
      mockReminderRepository.save.mockResolvedValue(mockReminder);

      // Act
      const result = await service.processReminders();

      // Assert
      expect(result.remindersSent).toBe(0);
      expect(result.errors).toBe(1);
      expect(mockReminderRepository.save).toHaveBeenCalledWith({
        ...mockReminder,
        errorMessage: 'Email service error',
      });
    });

    it('should process multiple reminders', async () => {
      // Arrange
      const reminder1 = { ...mockReminder, id: 'reminder-1' };
      const reminder2 = { ...mockReminder, id: 'reminder-2', daysBefore: 1 };
      const dueReminders = [reminder1, reminder2];

      mockQueryBuilder.getMany.mockResolvedValue(dueReminders);
      mockEmailReminderService.sendMilestoneReminder.mockResolvedValue(true);
      mockReminderRepository.save.mockResolvedValue({});

      // Act
      const result = await service.processReminders();

      // Assert
      expect(result.remindersSent).toBe(2);
      expect(result.errors).toBe(0);
      expect(
        mockEmailReminderService.sendMilestoneReminder,
      ).toHaveBeenCalledTimes(2);
      expect(mockReminderRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should return empty result when no reminders are due', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.processReminders();

      // Assert
      expect(result.remindersSent).toBe(0);
      expect(result.errors).toBe(0);
      expect(
        mockEmailReminderService.sendMilestoneReminder,
      ).not.toHaveBeenCalled();
    });
  });

  describe('processOverdueReminders', () => {
    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockMilestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
    });

    it('should process overdue milestones successfully', async () => {
      // Arrange
      const overdueMilestone = {
        ...mockMilestone,
        dueDate: new Date('2024-01-01'), // Past date
        isOverdue: jest.fn().mockReturnValue(true),
      };
      mockQueryBuilder.getMany.mockResolvedValue([overdueMilestone]);
      mockEmailReminderService.sendOverdueReminder.mockResolvedValue(true);

      // Act
      const result = await service.processOverdueReminders();

      // Assert
      expect(result.overdueRemindersSent).toBe(1);
      expect(result.errors).toBe(0);
      expect(mockEmailReminderService.sendOverdueReminder).toHaveBeenCalledWith(
        overdueMilestone,
      );
    });

    it('should handle overdue reminder failures', async () => {
      // Arrange
      const overdueMilestone = {
        ...mockMilestone,
        dueDate: new Date('2024-01-01'),
        isOverdue: jest.fn().mockReturnValue(true),
      };
      mockQueryBuilder.getMany.mockResolvedValue([overdueMilestone]);
      mockEmailReminderService.sendOverdueReminder.mockResolvedValue(false);

      // Act
      const result = await service.processOverdueReminders();

      // Assert
      expect(result.overdueRemindersSent).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should skip completed milestones', async () => {
      // Arrange
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.COMPLETED,
        dueDate: new Date('2024-01-01'),
      };
      mockQueryBuilder.getMany.mockResolvedValue([completedMilestone]);

      // Act
      const result = await service.processOverdueReminders();

      // Assert
      expect(result.overdueRemindersSent).toBe(0);
      expect(
        mockEmailReminderService.sendOverdueReminder,
      ).not.toHaveBeenCalled();
    });
  });

  describe('processEscalationReminders', () => {
    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockMilestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
    });

    it('should process escalation reminders for blocked milestones', async () => {
      // Arrange
      const blockedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.BLOCKED,
        blockingReason: 'Waiting for supervisor feedback',
      };
      mockQueryBuilder.getMany.mockResolvedValue([blockedMilestone]);
      mockEmailReminderService.sendEscalationReminder.mockResolvedValue(true);

      // Act
      const result = await service.processEscalationReminders();

      // Assert
      expect(result.escalationsSent).toBe(1);
      expect(result.errors).toBe(0);
      expect(
        mockEmailReminderService.sendEscalationReminder,
      ).toHaveBeenCalledWith(blockedMilestone);
    });

    it('should process escalation reminders for severely overdue milestones', async () => {
      // Arrange
      const severelyOverdueMilestone = {
        ...mockMilestone,
        dueDate: new Date('2024-01-01'), // Very past date
        status: MilestoneStatus.NOT_STARTED,
        getDaysUntilDue: jest.fn().mockReturnValue(-7), // 7 days overdue
      };
      mockQueryBuilder.getMany.mockResolvedValue([severelyOverdueMilestone]);
      mockEmailReminderService.sendEscalationReminder.mockResolvedValue(true);

      // Act
      const result = await service.processEscalationReminders();

      // Assert
      expect(result.escalationsSent).toBe(1);
      expect(
        mockEmailReminderService.sendEscalationReminder,
      ).toHaveBeenCalledWith(severelyOverdueMilestone);
    });

    it('should handle escalation reminder failures', async () => {
      // Arrange
      const blockedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.BLOCKED,
      };
      mockQueryBuilder.getMany.mockResolvedValue([blockedMilestone]);
      mockEmailReminderService.sendEscalationReminder.mockRejectedValue(
        new Error('Escalation failed'),
      );

      // Act
      const result = await service.processEscalationReminders();

      // Assert
      expect(result.escalationsSent).toBe(0);
      expect(result.errors).toBe(1);
    });
  });

  describe('scheduleRemindersForMilestone', () => {
    it('should create reminders for new milestone', async () => {
      // Arrange
      const newMilestone = {
        ...mockMilestone,
        reminders: [],
      };
      mockReminderRepository.save.mockResolvedValue({});

      // Act
      await service.scheduleRemindersForMilestone(newMilestone);

      // Assert
      expect(mockReminderRepository.save).toHaveBeenCalledTimes(3); // 7, 3, 1 days before
      expect(mockReminderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          milestoneId: newMilestone.id,
          reminderType: ReminderType.EMAIL,
          daysBefore: 7,
          sent: false,
        }),
      );
    });

    it('should not create duplicate reminders', async () => {
      // Arrange
      const existingReminders = [
        { ...mockReminder, daysBefore: 7 },
        { ...mockReminder, daysBefore: 3 },
        { ...mockReminder, daysBefore: 1 },
      ];
      const milestoneWithReminders = {
        ...mockMilestone,
        reminders: existingReminders,
      };

      // Act
      await service.scheduleRemindersForMilestone(milestoneWithReminders);

      // Assert
      expect(mockReminderRepository.save).not.toHaveBeenCalled();
    });

    it('should create missing reminders only', async () => {
      // Arrange
      const existingReminders = [
        { ...mockReminder, daysBefore: 7 },
        // Missing 3 and 1 day reminders
      ];
      const milestoneWithPartialReminders = {
        ...mockMilestone,
        reminders: existingReminders,
      };
      mockReminderRepository.save.mockResolvedValue({});

      // Act
      await service.scheduleRemindersForMilestone(
        milestoneWithPartialReminders,
      );

      // Assert
      expect(mockReminderRepository.save).toHaveBeenCalledTimes(2); // 3 and 1 day reminders
    });
  });

  describe('cleanupOldReminders', () => {
    it('should delete old sent reminders', async () => {
      // Arrange
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      mockReminderRepository.delete.mockResolvedValue({ affected: 5 });

      // Act
      const result = await service.cleanupOldReminders();

      // Assert
      expect(result.deletedCount).toBe(5);
      expect(mockReminderRepository.delete).toHaveBeenCalledWith({
        sent: true,
        sentAt: expect.any(Object), // LessThan matcher
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      mockReminderRepository.delete.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      const result = await service.cleanupOldReminders();

      // Assert
      expect(result.deletedCount).toBe(0);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getReminderStatistics', () => {
    it('should return reminder statistics', async () => {
      // Arrange
      const mockStats = {
        totalReminders: 100,
        sentReminders: 80,
        pendingReminders: 15,
        failedReminders: 5,
        overdueReminders: 10,
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({
          total_reminders: mockStats.totalReminders,
          sent_reminders: mockStats.sentReminders,
          pending_reminders: mockStats.pendingReminders,
          failed_reminders: mockStats.failedReminders,
          overdue_reminders: mockStats.overdueReminders,
        }),
      };

      mockReminderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      const result = await service.getReminderStatistics();

      // Assert
      expect(result).toEqual(mockStats);
    });
  });

  describe('cron job methods', () => {
    it('should handle daily reminder processing', async () => {
      // Arrange
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockReminderRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
      mockMilestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      // Act
      await service.handleDailyReminderProcessing();

      // Assert - Should not throw and should call processing methods
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should handle weekly cleanup', async () => {
      // Arrange
      mockReminderRepository.delete.mockResolvedValue({ affected: 10 });

      // Act
      await service.handleWeeklyCleanup();

      // Assert
      expect(mockReminderRepository.delete).toHaveBeenCalled();
    });
  });
});
