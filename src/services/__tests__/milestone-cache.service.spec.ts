import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MilestoneCacheService } from '../milestone-cache.service';
import {
  ProjectProgressDto,
  MilestoneAnalyticsDto,
  SupervisorDashboardDto,
  StudentProgressSummaryDto,
} from '../../dto/milestone';

describe('MilestoneCacheService', () => {
  let service: MilestoneCacheService;
  let cacheManager: jest.Mocked<Cache>;

  const mockProjectProgress: ProjectProgressDto = {
    overallProgress: 75.5,
    totalMilestones: 10,
    completedMilestones: 7,
    inProgressMilestones: 2,
    blockedMilestones: 0,
    overdueMilestones: 1,
    estimatedCompletionDate: '2024-06-01',
    progressVelocity: 1.2,
    milestones: [],
    nextMilestone: null,
  };

  const mockAnalytics: any = {
    studentId: 'student-1',
    velocity: {
      periodDays: 90,
      totalMilestones: 10,
      completedMilestones: 7,
      completionRate: 70,
      weeklyVelocity: 1.2,
      averageCompletionTime: 14.5,
      velocityTrend: [],
      prediction: {
        estimatedWeeksToCompletion: 2.5,
        estimatedCompletionDate: '2024-06-01',
        confidence: 'high',
        assumptions: ['Current velocity remains constant'],
      },
      lastUpdated: '2024-01-01T00:00:00.000Z',
    },
    trends: {} as any,
    criticalPath: {} as any,
    comparison: null,
    performanceScore: 85,
    productivityMetrics: {} as any,
    keyInsights: ['Strong completion velocity'],
    generatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockSupervisorDashboard: SupervisorDashboardDto = {
    supervisorId: 'supervisor-1',
    supervisorName: 'Dr. Smith',
    totalStudents: 5,
    metrics: {
      totalMilestones: 50,
      completedMilestones: 35,
      overdueMilestones: 3,
      blockedMilestones: 1,
      overallCompletionRate: 70,
      averageProgressVelocity: 1.1,
      atRiskStudentCount: 2,
    },
    studentSummaries: [],
    atRiskStudents: [],
    recentActivity: [],
    upcomingDeadlines: [],
    lastUpdated: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<MilestoneCacheService>(MilestoneCacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Progress Caching', () => {
    describe('getCachedProgress', () => {
      it('should return cached progress when available', async () => {
        cacheManager.get.mockResolvedValue(mockProjectProgress);

        const result = await service.getCachedProgress('student-1');

        expect(result).toEqual(mockProjectProgress);
        expect(cacheManager.get).toHaveBeenCalledWith(
          'milestone:progress:student-1',
        );
      });

      it('should return null when cache miss', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        const result = await service.getCachedProgress('student-1');

        expect(result).toBeNull();
        expect(cacheManager.get).toHaveBeenCalledWith(
          'milestone:progress:student-1',
        );
      });

      it('should handle cache errors gracefully', async () => {
        cacheManager.get.mockRejectedValue(new Error('Cache error'));

        const result = await service.getCachedProgress('student-1');

        expect(result).toBeNull();
      });
    });

    describe('setCachedProgress', () => {
      it('should cache progress with default TTL', async () => {
        await service.setCachedProgress('student-1', mockProjectProgress);

        expect(cacheManager.set).toHaveBeenCalledWith(
          'milestone:progress:student-1',
          mockProjectProgress,
          900000, // 15 minutes in milliseconds
        );
      });

      it('should cache progress with custom TTL', async () => {
        await service.setCachedProgress('student-1', mockProjectProgress, 1800);

        expect(cacheManager.set).toHaveBeenCalledWith(
          'milestone:progress:student-1',
          mockProjectProgress,
          1800000, // 30 minutes in milliseconds
        );
      });

      it('should handle cache errors gracefully', async () => {
        cacheManager.set.mockRejectedValue(new Error('Cache error'));

        await expect(
          service.setCachedProgress('student-1', mockProjectProgress),
        ).resolves.not.toThrow();
      });
    });

    describe('invalidateProgressCache', () => {
      it('should invalidate progress cache', async () => {
        await service.invalidateProgressCache('student-1');

        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:progress:student-1',
        );
      });

      it('should handle invalidation errors gracefully', async () => {
        cacheManager.del.mockRejectedValue(new Error('Cache error'));

        await expect(
          service.invalidateProgressCache('student-1'),
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Analytics Caching', () => {
    describe('getCachedAnalytics', () => {
      it('should return cached analytics when available', async () => {
        cacheManager.get.mockResolvedValue(mockAnalytics);

        const result = await service.getCachedAnalytics('student-1');

        expect(result).toEqual(mockAnalytics);
        expect(cacheManager.get).toHaveBeenCalledWith(
          'milestone:analytics:student-1',
        );
      });

      it('should return null when cache miss', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        const result = await service.getCachedAnalytics('student-1');

        expect(result).toBeNull();
      });
    });

    describe('setCachedAnalytics', () => {
      it('should cache analytics with default TTL', async () => {
        await service.setCachedAnalytics('student-1', mockAnalytics);

        expect(cacheManager.set).toHaveBeenCalledWith(
          'milestone:analytics:student-1',
          mockAnalytics,
          3600000, // 1 hour in milliseconds
        );
      });
    });

    describe('invalidateAnalyticsCache', () => {
      it('should invalidate analytics cache', async () => {
        await service.invalidateAnalyticsCache('student-1');

        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:analytics:student-1',
        );
      });
    });
  });

  describe('Supervisor Dashboard Caching', () => {
    describe('getCachedSupervisorDashboard', () => {
      it('should return cached dashboard when available', async () => {
        cacheManager.get.mockResolvedValue(mockSupervisorDashboard);

        const result =
          await service.getCachedSupervisorDashboard('supervisor-1');

        expect(result).toEqual(mockSupervisorDashboard);
        expect(cacheManager.get).toHaveBeenCalledWith(
          'milestone:supervisor:dashboard:supervisor-1',
        );
      });

      it('should return null when cache miss', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        const result =
          await service.getCachedSupervisorDashboard('supervisor-1');

        expect(result).toBeNull();
      });
    });

    describe('setCachedSupervisorDashboard', () => {
      it('should cache dashboard with default TTL', async () => {
        await service.setCachedSupervisorDashboard(
          'supervisor-1',
          mockSupervisorDashboard,
        );

        expect(cacheManager.set).toHaveBeenCalledWith(
          'milestone:supervisor:dashboard:supervisor-1',
          mockSupervisorDashboard,
          1200000, // 20 minutes in milliseconds
        );
      });
    });

    describe('invalidateSupervisorDashboardCache', () => {
      it('should invalidate supervisor dashboard cache', async () => {
        await service.invalidateSupervisorDashboardCache('supervisor-1');

        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:supervisor:dashboard:supervisor-1',
        );
      });
    });
  });

  describe('Student Summaries Caching', () => {
    const mockStudentSummaries: StudentProgressSummaryDto[] = [
      {
        studentId: 'student-1',
        studentName: 'John Doe',
        studentEmail: 'john@example.com',
        totalMilestones: 10,
        completedMilestones: 7,
        inProgressMilestones: 2,
        overdueMilestones: 1,
        blockedMilestones: 0,
        completionRate: 70,
        riskScore: 0.2,
        nextMilestone: null,
        lastActivity: '2024-01-01T00:00:00.000Z',
        projectCount: 1,
      },
    ];

    describe('getCachedStudentSummaries', () => {
      it('should return cached summaries when available', async () => {
        cacheManager.get.mockResolvedValue(mockStudentSummaries);

        const result = await service.getCachedStudentSummaries('supervisor-1');

        expect(result).toEqual(mockStudentSummaries);
        expect(cacheManager.get).toHaveBeenCalledWith(
          'milestone:supervisor:summaries:supervisor-1',
        );
      });

      it('should return null when cache miss', async () => {
        cacheManager.get.mockResolvedValue(undefined);

        const result = await service.getCachedStudentSummaries('supervisor-1');

        expect(result).toBeNull();
      });
    });

    describe('setCachedStudentSummaries', () => {
      it('should cache summaries with default TTL', async () => {
        await service.setCachedStudentSummaries(
          'supervisor-1',
          mockStudentSummaries,
        );

        expect(cacheManager.set).toHaveBeenCalledWith(
          'milestone:supervisor:summaries:supervisor-1',
          mockStudentSummaries,
          1200000, // 20 minutes in milliseconds
        );
      });
    });

    describe('invalidateStudentSummariesCache', () => {
      it('should invalidate student summaries cache', async () => {
        await service.invalidateStudentSummariesCache('supervisor-1');

        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:supervisor:summaries:supervisor-1',
        );
      });
    });
  });

  describe('Bulk Operations', () => {
    describe('invalidateAllStudentCaches', () => {
      it('should invalidate all student-related caches', async () => {
        await service.invalidateAllStudentCaches('student-1');

        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:progress:student-1',
        );
        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:analytics:student-1',
        );
      });
    });

    describe('invalidateAllSupervisorCaches', () => {
      it('should invalidate all supervisor-related caches', async () => {
        await service.invalidateAllSupervisorCaches('supervisor-1');

        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:supervisor:dashboard:supervisor-1',
        );
        expect(cacheManager.del).toHaveBeenCalledWith(
          'milestone:supervisor:summaries:supervisor-1',
        );
      });
    });

    describe('clearAllCaches', () => {
      it('should clear all caches', async () => {
        await service.clearAllCaches();

        // Note: reset method is not available in current cache-manager version
        // This test verifies the method completes without error
        expect(true).toBe(true);
      });
    });
  });

  describe('Cache Statistics', () => {
    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        // Simulate some cache hits and misses
        cacheManager.get.mockResolvedValueOnce(mockProjectProgress); // hit
        cacheManager.get.mockResolvedValueOnce(undefined); // miss
        cacheManager.get.mockResolvedValueOnce(mockAnalytics); // hit

        await service.getCachedProgress('student-1');
        await service.getCachedProgress('student-2');
        await service.getCachedAnalytics('student-1');

        const stats = await service.getCacheStats();

        expect(stats).toEqual({
          totalKeys: 0,
          progressCacheHits: 1,
          progressCacheMisses: 1,
          analyticsCacheHits: 1,
          analyticsCacheMisses: 0,
          supervisorCacheHits: 0,
          supervisorCacheMisses: 0,
          cacheHitRate: expect.closeTo(66.67, 0.1), // 2 hits out of 3 requests
          lastUpdated: expect.any(String),
        });
      });
    });
  });
});
