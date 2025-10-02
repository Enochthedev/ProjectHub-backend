import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CalendarSyncService } from '../calendar-sync.service';
import { CalendarSync, CalendarProvider, SyncStatus } from '../../entities/calendar-sync.entity';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { ICalExportService } from '../ical-export.service';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';

describe('CalendarSyncService', () => {
  let service: CalendarSyncService;
  let calendarSyncRepository: Repository<CalendarSync>;
  let milestoneRepository: Repository<Milestone>;
  let userRepository: Repository<User>;
  let iCalExportService: ICalExportService;
  let configService: ConfigService;

  const mockCalendarSyncRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockMilestoneRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockICalExportService = {
    exportSingleMilestone: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        DEFAULT_TIMEZONE: 'UTC',
        GOOGLE_CLIENT_ID: 'test-google-client-id',
        GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
        MICROSOFT_CLIENT_ID: 'test-microsoft-client-id',
        MICROSOFT_CLIENT_SECRET: 'test-microsoft-client-secret',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarSyncService,
        {
          provide: getRepositoryToken(CalendarSync),
          useValue: mockCalendarSyncRepository,
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ICalExportService,
          useValue: mockICalExportService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CalendarSyncService>(CalendarSyncService);
    calendarSyncRepository = module.get<Repository<CalendarSync>>(
      getRepositoryToken(CalendarSync),
    );
    milestoneRepository = module.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    iCalExportService = module.get<ICalExportService>(ICalExportService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSyncConfig', () => {
    it('should create a new calendar sync configuration', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@ui.edu.ng',
      };

      const mockConfig = {
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        syncInterval: 60,
        autoSync: true,
      };

      const mockCalendarSync = {
        id: 'sync-id',
        userId: 'user-id',
        ...mockConfig,
        status: SyncStatus.PENDING,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockCalendarSyncRepository.create.mockReturnValue(mockCalendarSync);
      mockCalendarSyncRepository.save.mockResolvedValue(mockCalendarSync);

      // Mock the validation method to avoid actual API calls
      jest.spyOn(service as any, 'validateCalendarAccess').mockResolvedValue(undefined);

      const result = await service.createSyncConfig('user-id', mockConfig);

      expect(result).toEqual(mockCalendarSync);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(mockCalendarSyncRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        provider: mockConfig.provider,
        calendarId: mockConfig.calendarId,
        accessToken: mockConfig.accessToken,
        refreshToken: mockConfig.refreshToken,
        serverUrl: undefined,
        username: undefined,
        password: undefined,
        syncInterval: mockConfig.syncInterval,
        autoSync: mockConfig.autoSync,
        status: SyncStatus.PENDING,
        lastSyncAt: null,
        syncErrors: [],
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createSyncConfig('non-existent-user', {
          provider: CalendarProvider.GOOGLE,
          calendarId: 'primary',
          syncInterval: 60,
          autoSync: true,
        }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('getSyncConfigs', () => {
    it('should return user sync configurations', async () => {
      const mockConfigs = [
        {
          id: 'sync-1',
          userId: 'user-id',
          provider: CalendarProvider.GOOGLE,
          status: SyncStatus.COMPLETED,
        },
        {
          id: 'sync-2',
          userId: 'user-id',
          provider: CalendarProvider.OUTLOOK,
          status: SyncStatus.PENDING,
        },
      ];

      mockCalendarSyncRepository.find.mockResolvedValue(mockConfigs);

      const result = await service.getSyncConfigs('user-id');

      expect(result).toEqual(mockConfigs);
      expect(mockCalendarSyncRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateSyncConfig', () => {
    it('should update existing sync configuration', async () => {
      const existingConfig = {
        id: 'sync-id',
        userId: 'user-id',
        provider: CalendarProvider.GOOGLE,
        calendarId: 'primary',
        syncInterval: 60,
        autoSync: false,
      };

      const updates = {
        syncInterval: 120,
        autoSync: true,
      };

      const updatedConfig = { ...existingConfig, ...updates };

      mockCalendarSyncRepository.findOne.mockResolvedValue(existingConfig);
      mockCalendarSyncRepository.save.mockResolvedValue(updatedConfig);

      const result = await service.updateSyncConfig('sync-id', 'user-id', updates);

      expect(result).toEqual(updatedConfig);
      expect(mockCalendarSyncRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sync-id', userId: 'user-id' },
      });
    });

    it('should throw error when sync config not found', async () => {
      mockCalendarSyncRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSyncConfig('non-existent-id', 'user-id', {}),
      ).rejects.toThrow('Calendar sync configuration not found');
    });
  });

  describe('deleteSyncConfig', () => {
    it('should delete sync configuration', async () => {
      const mockConfig = {
        id: 'sync-id',
        userId: 'user-id',
      };

      mockCalendarSyncRepository.findOne.mockResolvedValue(mockConfig);
      mockCalendarSyncRepository.remove.mockResolvedValue(mockConfig);

      await service.deleteSyncConfig('sync-id', 'user-id');

      expect(mockCalendarSyncRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sync-id', userId: 'user-id' },
      });
      expect(mockCalendarSyncRepository.remove).toHaveBeenCalledWith(mockConfig);
    });
  });

  describe('getSyncStatistics', () => {
    it('should return sync statistics for user', async () => {
      const mockConfigs = [
        {
          autoSync: true,
          totalSyncs: 10,
          successfulSyncs: 8,
          failedSyncs: 2,
          isHealthy: () => true,
          needsAttention: () => false,
        },
        {
          autoSync: false,
          totalSyncs: 5,
          successfulSyncs: 5,
          failedSyncs: 0,
          isHealthy: () => true,
          needsAttention: () => false,
        },
      ];

      mockCalendarSyncRepository.find.mockResolvedValue(mockConfigs);

      const result = await service.getSyncStatistics('user-id');

      expect(result).toEqual({
        totalConfigs: 2,
        activeConfigs: 1,
        healthyConfigs: 2,
        configsNeedingAttention: 0,
        totalSyncs: 15,
        successfulSyncs: 13,
        failedSyncs: 2,
        successRate: (13 / 15) * 100,
      });
    });
  });

  describe('exportMilestonesAsICal', () => {
    it('should export milestones as iCal format', async () => {
      const mockMilestones = [
        {
          id: 'milestone-1',
          title: 'Test Milestone 1',
          description: 'Test description 1',
          dueDate: new Date('2024-12-31T10:00:00Z'),
          priority: 'high',
          project: { title: 'Test Project' },
        },
        {
          id: 'milestone-2',
          title: 'Test Milestone 2',
          description: 'Test description 2',
          dueDate: new Date('2024-12-31T14:00:00Z'),
          priority: 'medium',
          project: { title: 'Test Project 2' },
        },
      ];

      mockMilestoneRepository.find.mockResolvedValue(mockMilestones);

      const result = await service.exportMilestonesAsICal('user-id');

      expect(result).toContain('BEGIN:VCALENDAR');
      expect(result).toContain('END:VCALENDAR');
      expect(result).toContain('[FYP] Test Milestone 1');
      expect(result).toContain('[FYP] Test Milestone 2');
      expect(mockMilestoneRepository.find).toHaveBeenCalledWith({
        where: { studentId: 'user-id' },
        relations: ['project'],
      });
    });

    it('should export specific milestones when IDs provided', async () => {
      const mockMilestones = [
        {
          id: 'milestone-1',
          title: 'Test Milestone 1',
          description: 'Test description 1',
          dueDate: new Date('2024-12-31T10:00:00Z'),
          priority: 'high',
          project: { title: 'Test Project' },
        },
      ];

      mockMilestoneRepository.find.mockResolvedValue(mockMilestones);

      const result = await service.exportMilestonesAsICal('user-id', ['milestone-1']);

      expect(result).toContain('[FYP] Test Milestone 1');
      expect(mockMilestoneRepository.find).toHaveBeenCalledWith({
        where: {
          id: expect.anything(),
          studentId: 'user-id',
        },
        relations: ['project'],
      });
    });
  });
});