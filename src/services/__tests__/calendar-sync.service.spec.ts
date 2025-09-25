import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CalendarSyncService,
  CalendarProvider,
  SyncStatus,
} from '../calendar-sync.service';
import { ICalExportService } from '../ical-export.service';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { CalendarSync } from '../../entities/calendar-sync.entity';
import { MilestoneStatus, Priority, UserRole } from '../../common/enums';
import {
  CalendarSyncException,
  MilestoneNotFoundException,
  MilestonePermissionException,
} from '../../common/exceptions';

describe('CalendarSyncService', () => {
  let service: CalendarSyncService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let calendarSyncRepository: jest.Mocked<Repository<CalendarSync>>;
  let iCalExportService: jest.Mocked<ICalExportService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'john.doe@example.com',
    password: 'hashedpassword',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockMilestone: Milestone = {
    id: 'milestone-1',
    title: 'Literature Review',
    description: 'Complete comprehensive literature review',
    dueDate: new Date('2024-03-15'),
    status: MilestoneStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    studentId: 'user-1',
    projectId: 'project-1',
    student: mockUser,
    project: null,
    estimatedHours: 40,
    actualHours: 20,
    blockingReason: null,
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    isTemplate: false,
    templateId: null,
    notes: [],
    reminders: [],
    isOverdue: jest.fn().mockReturnValue(false),
    getDaysUntilDue: jest.fn().mockReturnValue(30),
    canTransitionTo: jest.fn().mockReturnValue(true),
    getProgressPercentage: jest.fn().mockReturnValue(50),
  };

  const mockCalendarSync: CalendarSync = {
    id: 'sync-1',
    userId: 'user-1',
    user: mockUser,
    provider: CalendarProvider.GOOGLE,
    calendarId: 'primary',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    serverUrl: null,
    username: null,
    password: null,
    syncInterval: 60,
    autoSync: true,
    status: SyncStatus.COMPLETED,
    lastSyncAt: new Date('2024-01-15T10:00:00Z'),
    syncErrors: [],
    totalSyncs: 10,
    successfulSyncs: 9,
    failedSyncs: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    getSuccessRate: jest.fn().mockReturnValue(90),
    isHealthy: jest.fn().mockReturnValue(true),
    needsAttention: jest.fn().mockReturnValue(false),
    getNextSyncTime: jest
      .fn()
      .mockReturnValue(new Date('2024-01-15T11:00:00Z')),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarSyncService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CalendarSync),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: ICalExportService,
          useValue: {
            exportSingleMilestone: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CalendarSyncService>(CalendarSyncService);
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
    calendarSyncRepository = module.get(getRepositoryToken(CalendarSync));
    iCalExportService = module.get(ICalExportService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSyncConfig', () => {
    it('should create a new calendar sync configuration', async () => {
      // Arrange
      const config = {
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        syncInterval: 60,
        autoSync: true,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      calendarSyncRepository.create.mockReturnValue(mockCalendarSync);
      calendarSyncRepository.save.mockResolvedValue(mockCalendarSync);

      // Act
      const result = await service.createSyncConfig('user-1', config);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('sync-1');
      expect(result.provider).toBe(CalendarProvider.GOOGLE);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(calendarSyncRepository.create).toHaveBeenCalled();
      expect(calendarSyncRepository.save).toHaveBeenCalled();
    });

    it('should throw MilestonePermissionException for invalid user', async () => {
      // Arrange
      const config = {
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        accessToken: 'access-token',
        syncInterval: 60,
        autoSync: false,
      };

      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createSyncConfig('invalid-user', config),
      ).rejects.toThrow(MilestonePermissionException);
    });

    it('should validate calendar access for different providers', async () => {
      // Arrange
      const googleConfig = {
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        accessToken: 'access-token',
        syncInterval: 60,
        autoSync: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      calendarSyncRepository.create.mockReturnValue(mockCalendarSync);
      calendarSyncRepository.save.mockResolvedValue(mockCalendarSync);

      // Act
      const result = await service.createSyncConfig('user-1', googleConfig);

      // Assert
      expect(result).toBeDefined();
      expect(userRepository.findOne).toHaveBeenCalled();
    });

    it('should throw CalendarSyncException for invalid calendar credentials', async () => {
      // Arrange
      const invalidConfig = {
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        // Missing accessToken
        syncInterval: 60,
        autoSync: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.createSyncConfig('user-1', invalidConfig),
      ).rejects.toThrow(CalendarSyncException);
    });
  });

  describe('updateSyncConfig', () => {
    it('should update an existing calendar sync configuration', async () => {
      // Arrange
      const updates = {
        syncInterval: 120,
        autoSync: false,
      };

      calendarSyncRepository.findOne.mockResolvedValue(mockCalendarSync);
      const updatedSync = {
        ...mockCalendarSync,
        ...updates,
        getSuccessRate: jest.fn().mockReturnValue(90),
        isHealthy: jest.fn().mockReturnValue(true),
        needsAttention: jest.fn().mockReturnValue(false),
        getNextSyncTime: jest
          .fn()
          .mockReturnValue(new Date('2024-01-15T11:00:00Z')),
      };
      calendarSyncRepository.save.mockResolvedValue(updatedSync);

      // Act
      const result = await service.updateSyncConfig(
        'sync-1',
        'user-1',
        updates,
      );

      // Assert
      expect(result).toBeDefined();
      expect(calendarSyncRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sync-1', userId: 'user-1' },
      });
      expect(calendarSyncRepository.save).toHaveBeenCalled();
    });

    it('should throw CalendarSyncException for non-existent config', async () => {
      // Arrange
      const updates = { syncInterval: 120 };
      calendarSyncRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateSyncConfig('invalid-sync', 'user-1', updates),
      ).rejects.toThrow(CalendarSyncException);
    });
  });

  describe('deleteSyncConfig', () => {
    it('should delete a calendar sync configuration', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(mockCalendarSync);
      calendarSyncRepository.remove.mockResolvedValue(mockCalendarSync);

      // Act
      await service.deleteSyncConfig('sync-1', 'user-1');

      // Assert
      expect(calendarSyncRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sync-1', userId: 'user-1' },
      });
      expect(calendarSyncRepository.remove).toHaveBeenCalledWith(
        mockCalendarSync,
      );
    });

    it('should throw CalendarSyncException for non-existent config', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteSyncConfig('invalid-sync', 'user-1'),
      ).rejects.toThrow(CalendarSyncException);
    });
  });

  describe('syncMilestones', () => {
    it('should sync milestones successfully', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(mockCalendarSync);
      milestoneRepository.find.mockResolvedValue([mockMilestone]);
      iCalExportService.exportSingleMilestone.mockResolvedValue({
        calendar: 'BEGIN:VCALENDAR...',
        filename: 'milestone.ics',
        mimeType: 'text/calendar',
      });
      const completedSync = {
        ...mockCalendarSync,
        status: SyncStatus.COMPLETED,
        getSuccessRate: jest.fn().mockReturnValue(90),
        isHealthy: jest.fn().mockReturnValue(true),
        needsAttention: jest.fn().mockReturnValue(false),
        getNextSyncTime: jest
          .fn()
          .mockReturnValue(new Date('2024-01-15T11:00:00Z')),
      };
      calendarSyncRepository.save.mockResolvedValue(completedSync);

      // Act
      const result = await service.syncMilestones('sync-1', 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(calendarSyncRepository.save).toHaveBeenCalledTimes(2); // Once for in_progress, once for completed
    });

    it('should handle sync failures gracefully', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(mockCalendarSync);
      milestoneRepository.find.mockResolvedValue([mockMilestone]);
      iCalExportService.exportSingleMilestone.mockRejectedValue(
        new Error('Export failed'),
      );
      const completedSync = {
        ...mockCalendarSync,
        status: SyncStatus.COMPLETED,
        getSuccessRate: jest.fn().mockReturnValue(90),
        isHealthy: jest.fn().mockReturnValue(true),
        needsAttention: jest.fn().mockReturnValue(false),
        getNextSyncTime: jest
          .fn()
          .mockReturnValue(new Date('2024-01-15T11:00:00Z')),
      };
      calendarSyncRepository.save.mockResolvedValue(completedSync);

      // Act
      const result = await service.syncMilestones('sync-1', 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe(SyncStatus.FAILED); // Failed when all syncs fail
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Export failed');
    });

    it('should throw CalendarSyncException for non-existent config', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.syncMilestones('invalid-sync', 'user-1'),
      ).rejects.toThrow(CalendarSyncException);
    });
  });

  describe('getSyncConfigs', () => {
    it('should return sync configurations for a user', async () => {
      // Arrange
      calendarSyncRepository.find.mockResolvedValue([mockCalendarSync]);

      // Act
      const result = await service.getSyncConfigs('user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sync-1');
      expect(calendarSyncRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync history for a configuration', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(mockCalendarSync);

      // Act
      const result = await service.getSyncHistory('sync-1', 'user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('sync-1');
      expect(calendarSyncRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sync-1', userId: 'user-1' },
      });
    });

    it('should throw CalendarSyncException for non-existent config', async () => {
      // Arrange
      calendarSyncRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getSyncHistory('invalid-sync', 'user-1'),
      ).rejects.toThrow(CalendarSyncException);
    });
  });

  describe('handleMilestoneUpdate', () => {
    it('should trigger auto-sync for milestone updates', async () => {
      // Arrange
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      calendarSyncRepository.find.mockResolvedValue([mockCalendarSync]);
      calendarSyncRepository.findOne.mockResolvedValue(mockCalendarSync);
      milestoneRepository.find.mockResolvedValue([mockMilestone]);
      iCalExportService.exportSingleMilestone.mockResolvedValue({
        calendar: 'BEGIN:VCALENDAR...',
        filename: 'milestone.ics',
        mimeType: 'text/calendar',
      });
      const completedSync = {
        ...mockCalendarSync,
        status: SyncStatus.COMPLETED,
        getSuccessRate: jest.fn().mockReturnValue(90),
        isHealthy: jest.fn().mockReturnValue(true),
        needsAttention: jest.fn().mockReturnValue(false),
        getNextSyncTime: jest
          .fn()
          .mockReturnValue(new Date('2024-01-15T11:00:00Z')),
      };
      calendarSyncRepository.save.mockResolvedValue(completedSync);

      // Act
      await service.handleMilestoneUpdate('milestone-1');

      // Assert
      expect(milestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        relations: ['student'],
      });
      expect(calendarSyncRepository.find).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          autoSync: true,
          status: SyncStatus.COMPLETED,
        },
      });
    });

    it('should throw MilestoneNotFoundException for invalid milestone', async () => {
      // Arrange
      milestoneRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.handleMilestoneUpdate('invalid-milestone'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });

  describe('calendar provider validation', () => {
    it('should validate Google Calendar configuration', async () => {
      // Arrange
      const config = {
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        accessToken: 'valid-token',
        syncInterval: 60,
        autoSync: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      calendarSyncRepository.create.mockReturnValue(mockCalendarSync);
      calendarSyncRepository.save.mockResolvedValue(mockCalendarSync);

      // Act
      const result = await service.createSyncConfig('user-1', config);

      // Assert
      expect(result).toBeDefined();
    });

    it('should validate CalDAV configuration', async () => {
      // Arrange
      const config = {
        provider: CalendarProvider.CALDAV,
        calendarId: 'personal',
        serverUrl: 'https://caldav.example.com',
        username: 'user@example.com',
        password: 'password',
        syncInterval: 60,
        autoSync: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);
      const caldavSync = {
        ...mockCalendarSync,
        provider: CalendarProvider.CALDAV,
        getSuccessRate: jest.fn().mockReturnValue(90),
        isHealthy: jest.fn().mockReturnValue(true),
        needsAttention: jest.fn().mockReturnValue(false),
        getNextSyncTime: jest
          .fn()
          .mockReturnValue(new Date('2024-01-15T11:00:00Z')),
      };
      calendarSyncRepository.create.mockReturnValue(caldavSync);
      calendarSyncRepository.save.mockResolvedValue(caldavSync);

      // Act
      const result = await service.createSyncConfig('user-1', config);

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw error for invalid CalDAV configuration', async () => {
      // Arrange
      const config = {
        provider: CalendarProvider.CALDAV,
        calendarId: 'personal',
        // Missing serverUrl, username, password
        syncInterval: 60,
        autoSync: false,
      };

      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.createSyncConfig('user-1', config)).rejects.toThrow(
        CalendarSyncException,
      );
    });
  });
});
