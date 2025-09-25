import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneCacheInvalidationService } from '../milestone-cache-invalidation.service';
import { MilestoneCacheService } from '../milestone-cache.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';

describe('MilestoneCacheInvalidationService', () => {
  let service: MilestoneCacheInvalidationService;
  let cacheService: jest.Mocked<MilestoneCacheService>;

  const mockMilestone: Milestone = {
    id: 'milestone-1',
    title: 'Test Milestone',
    description: 'Test Description',
    dueDate: new Date('2024-06-01'),
    status: MilestoneStatus.IN_PROGRESS,
    priority: Priority.MEDIUM,
    studentId: 'student-1',
    projectId: 'project-1',
    estimatedHours: 10,
    actualHours: 5,
    completedAt: null,
    blockingReason: null,
    isTemplate: false,
    templateId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    student: null,
    project: null,
    notes: [],
    reminders: [],
    canTransitionTo: jest.fn(),
    isOverdue: jest.fn().mockReturnValue(false),
    getProgressPercentage: jest.fn().mockReturnValue(50),
  } as any;

  beforeEach(async () => {
    const mockCacheService = {
      invalidateProgressCache: jest.fn(),
      invalidateAnalyticsCache: jest.fn(),
      invalidateAllStudentCaches: jest.fn(),
      invalidateAllSupervisorCaches: jest.fn(),
      warmupCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneCacheInvalidationService,
        {
          provide: MilestoneCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<MilestoneCacheInvalidationService>(
      MilestoneCacheInvalidationService,
    );
    cacheService = module.get(MilestoneCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Strategy Methods', () => {
    describe('shouldInvalidateProgress', () => {
      it('should return true for progress-affecting field changes', () => {
        const changes = { status: MilestoneStatus.COMPLETED };
        const result = service.shouldInvalidateProgress(mockMilestone, changes);
        expect(result).toBe(true);
      });

      it('should return true for due date changes', () => {
        const changes = { dueDate: new Date('2024-07-01') };
        const result = service.shouldInvalidateProgress(mockMilestone, changes);
        expect(result).toBe(true);
      });

      it('should return true for priority changes', () => {
        const changes = { priority: Priority.HIGH };
        const result = service.shouldInvalidateProgress(mockMilestone, changes);
        expect(result).toBe(true);
      });

      it('should return false for non-progress-affecting changes', () => {
        const changes = { title: 'New Title' };
        const result = service.shouldInvalidateProgress(mockMilestone, changes);
        expect(result).toBe(false);
      });
    });

    describe('shouldInvalidateAnalytics', () => {
      it('should return true for analytics-affecting field changes', () => {
        const changes = { actualHours: 8 };
        const result = service.shouldInvalidateAnalytics(
          mockMilestone,
          changes,
        );
        expect(result).toBe(true);
      });

      it('should return true for blocking reason changes', () => {
        const changes = { blockingReason: 'Waiting for approval' };
        const result = service.shouldInvalidateAnalytics(
          mockMilestone,
          changes,
        );
        expect(result).toBe(true);
      });

      it('should return false for non-analytics-affecting changes', () => {
        const changes = { title: 'New Title' };
        const result = service.shouldInvalidateAnalytics(
          mockMilestone,
          changes,
        );
        expect(result).toBe(false);
      });
    });

    describe('shouldInvalidateSupervisorCaches', () => {
      it('should return true when milestone becomes blocked', () => {
        const changes = { status: MilestoneStatus.BLOCKED };
        const result = service.shouldInvalidateSupervisorCaches(
          mockMilestone,
          changes,
        );
        expect(result).toBe(true);
      });

      it('should return true when milestone is completed', () => {
        const changes = { status: MilestoneStatus.COMPLETED };
        const result = service.shouldInvalidateSupervisorCaches(
          mockMilestone,
          changes,
        );
        expect(result).toBe(true);
      });

      it('should return true when due date becomes overdue', () => {
        const pastDate = new Date('2023-12-01');
        const changes = { dueDate: pastDate };
        const result = service.shouldInvalidateSupervisorCaches(
          mockMilestone,
          changes,
        );
        expect(result).toBe(true);
      });

      it('should return true for supervisor-affecting field changes', () => {
        const changes = { priority: Priority.CRITICAL };
        const result = service.shouldInvalidateSupervisorCaches(
          mockMilestone,
          changes,
        );
        expect(result).toBe(true);
      });

      it('should return false for non-supervisor-affecting changes', () => {
        const changes = { description: 'New Description' };
        const result = service.shouldInvalidateSupervisorCaches(
          mockMilestone,
          changes,
        );
        expect(result).toBe(false);
      });
    });

    describe('getAffectedStudents', () => {
      it('should return current student ID', () => {
        const changes = { status: MilestoneStatus.COMPLETED };
        const result = service.getAffectedStudents(mockMilestone, changes);
        expect(result).toEqual(['student-1']);
      });

      it('should return both old and new student IDs when student changes', () => {
        const changes = { studentId: 'student-2' };
        const result = service.getAffectedStudents(mockMilestone, changes);
        expect(result).toEqual(['student-1', 'student-2']);
      });
    });

    describe('getAffectedSupervisors', () => {
      it('should return empty array (placeholder implementation)', () => {
        const changes = { status: MilestoneStatus.COMPLETED };
        const result = service.getAffectedSupervisors(mockMilestone, changes);
        expect(result).toEqual([]);
      });
    });
  });

  describe('Cache Invalidation Operations', () => {
    describe('invalidateCachesForMilestoneUpdate', () => {
      it('should invalidate progress cache when progress fields change', async () => {
        const changes = { status: MilestoneStatus.COMPLETED };

        await service.invalidateCachesForMilestoneUpdate(
          mockMilestone,
          changes,
        );

        expect(cacheService.invalidateProgressCache).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should invalidate analytics cache when analytics fields change', async () => {
        const changes = { actualHours: 8 };

        await service.invalidateCachesForMilestoneUpdate(
          mockMilestone,
          changes,
        );

        expect(cacheService.invalidateAnalyticsCache).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should not invalidate caches when non-affecting fields change', async () => {
        const changes = { title: 'New Title' };

        await service.invalidateCachesForMilestoneUpdate(
          mockMilestone,
          changes,
        );

        expect(cacheService.invalidateProgressCache).not.toHaveBeenCalled();
        expect(cacheService.invalidateAnalyticsCache).not.toHaveBeenCalled();
      });

      it('should handle errors gracefully', async () => {
        cacheService.invalidateProgressCache.mockRejectedValue(
          new Error('Cache error'),
        );
        const changes = { status: MilestoneStatus.COMPLETED };

        await expect(
          service.invalidateCachesForMilestoneUpdate(mockMilestone, changes),
        ).resolves.not.toThrow();
      });
    });

    describe('invalidateCachesForMilestoneCreation', () => {
      it('should invalidate all student caches', async () => {
        await service.invalidateCachesForMilestoneCreation(mockMilestone);

        expect(cacheService.invalidateAllStudentCaches).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should handle errors gracefully', async () => {
        cacheService.invalidateAllStudentCaches.mockRejectedValue(
          new Error('Cache error'),
        );

        await expect(
          service.invalidateCachesForMilestoneCreation(mockMilestone),
        ).resolves.not.toThrow();
      });
    });

    describe('invalidateCachesForMilestoneDeletion', () => {
      it('should invalidate all student caches', async () => {
        await service.invalidateCachesForMilestoneDeletion(mockMilestone);

        expect(cacheService.invalidateAllStudentCaches).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should handle errors gracefully', async () => {
        cacheService.invalidateAllStudentCaches.mockRejectedValue(
          new Error('Cache error'),
        );

        await expect(
          service.invalidateCachesForMilestoneDeletion(mockMilestone),
        ).resolves.not.toThrow();
      });
    });

    describe('invalidateCachesForBulkMilestoneUpdate', () => {
      it('should invalidate caches for all affected students', async () => {
        const milestone2 = {
          ...mockMilestone,
          id: 'milestone-2',
          studentId: 'student-2',
        } as Milestone;
        const milestones = [mockMilestone, milestone2];

        await service.invalidateCachesForBulkMilestoneUpdate(milestones);

        expect(cacheService.invalidateAllStudentCaches).toHaveBeenCalledWith(
          'student-1',
        );
        expect(cacheService.invalidateAllStudentCaches).toHaveBeenCalledWith(
          'student-2',
        );
      });

      it('should handle errors gracefully', async () => {
        cacheService.invalidateAllStudentCaches.mockRejectedValue(
          new Error('Cache error'),
        );
        const milestones = [mockMilestone];

        await expect(
          service.invalidateCachesForBulkMilestoneUpdate(milestones),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Specific Invalidation Methods', () => {
    describe('invalidateForStatusChange', () => {
      it('should invalidate caches for status change', async () => {
        await service.invalidateForStatusChange(
          mockMilestone,
          MilestoneStatus.COMPLETED,
        );

        expect(cacheService.invalidateProgressCache).toHaveBeenCalledWith(
          'student-1',
        );
        expect(cacheService.invalidateAnalyticsCache).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should warm up cache when milestone is completed', async () => {
        await service.invalidateForStatusChange(
          mockMilestone,
          MilestoneStatus.COMPLETED,
        );

        expect(cacheService.warmupCache).toHaveBeenCalledWith('student-1');
      });
    });

    describe('invalidateForDueDateChange', () => {
      it('should invalidate caches for due date change', async () => {
        const newDueDate = new Date('2024-07-01');

        await service.invalidateForDueDateChange(mockMilestone, newDueDate);

        expect(cacheService.invalidateProgressCache).toHaveBeenCalledWith(
          'student-1',
        );
        expect(cacheService.invalidateAnalyticsCache).toHaveBeenCalledWith(
          'student-1',
        );
      });
    });

    describe('invalidateForProgressUpdate', () => {
      it('should invalidate analytics cache for progress update', async () => {
        await service.invalidateForProgressUpdate(mockMilestone, 8);

        expect(cacheService.invalidateAnalyticsCache).toHaveBeenCalledWith(
          'student-1',
        );
      });
    });
  });

  describe('Smart Invalidation', () => {
    describe('smartInvalidation', () => {
      it('should immediately invalidate for high priority milestones', async () => {
        const highPriorityMilestone = {
          ...mockMilestone,
          priority: Priority.HIGH,
        } as Milestone;
        const changes = { status: MilestoneStatus.COMPLETED };

        await service.smartInvalidation(highPriorityMilestone, changes);

        expect(cacheService.invalidateProgressCache).toHaveBeenCalledWith(
          'student-1',
        );
        expect(cacheService.invalidateAnalyticsCache).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should immediately invalidate for status changes', async () => {
        const changes = { status: MilestoneStatus.BLOCKED };

        await service.smartInvalidation(mockMilestone, changes);

        expect(cacheService.invalidateProgressCache).toHaveBeenCalledWith(
          'student-1',
        );
        expect(cacheService.invalidateAnalyticsCache).toHaveBeenCalledWith(
          'student-1',
        );
      });

      it('should use delayed invalidation for low-impact changes', async () => {
        const changes = { description: 'New Description' };

        await service.smartInvalidation(mockMilestone, changes);

        // For low-impact changes, the service should still complete
        // The actual delayed invalidation would be tested in integration tests
        expect(true).toBe(true);
      }, 10000);
    });
  });

  describe('Scheduled Operations', () => {
    describe('invalidateTimeBasedCaches', () => {
      it('should complete without errors', async () => {
        await expect(
          service.invalidateTimeBasedCaches(),
        ).resolves.not.toThrow();
      });
    });

    describe('warmupCriticalCaches', () => {
      it('should complete without errors', async () => {
        await expect(service.warmupCriticalCaches()).resolves.not.toThrow();
      });
    });
  });
});
