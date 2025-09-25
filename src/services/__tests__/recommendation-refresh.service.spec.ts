import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  RecommendationRefreshService,
  RefreshStats,
} from '../recommendation-refresh.service';
import { RecommendationService } from '../recommendation.service';
import { RecommendationCacheService } from '../recommendation-cache.service';
import { User } from '../../entities/user.entity';
import { Recommendation } from '../../entities/recommendation.entity';
import { ProjectView } from '../../entities/project-view.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { RecommendationStatus } from '../../common/enums/recommendation-status.enum';

describe('RecommendationRefreshService', () => {
  let service: RecommendationRefreshService;
  let userRepository: jest.Mocked<Repository<User>>;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let projectViewRepository: jest.Mocked<Repository<ProjectView>>;
  let recommendationService: jest.Mocked<RecommendationService>;
  let cacheService: jest.Mocked<RecommendationCacheService>;

  const mockUser: Partial<User> = {
    id: 'user-1',
    role: UserRole.STUDENT,
    email: 'student@test.com',
  };

  const mockRecommendation: Partial<Recommendation> = {
    id: 'rec-1',
    studentId: 'user-1',
    status: RecommendationStatus.ACTIVE,
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago (stale)
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
  };

  const mockProjectView: Partial<ProjectView> = {
    id: 'view-1',
    viewerId: 'user-1',
    projectId: 'project-1',
    viewedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
  };

  beforeEach(async () => {
    const mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockRecommendationRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProjectViewRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      })),
    };

    const mockRecommendationService = {
      generateRecommendations: jest.fn(),
    };

    const mockCacheService = {
      getCachedRecommendations: jest.fn(),
      invalidateRecommendations: jest.fn(),
      invalidateStudentCaches: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationRefreshService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRecommendationRepository,
        },
        {
          provide: getRepositoryToken(ProjectView),
          useValue: mockProjectViewRepository,
        },
        {
          provide: RecommendationService,
          useValue: mockRecommendationService,
        },
        {
          provide: RecommendationCacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<RecommendationRefreshService>(
      RecommendationRefreshService,
    );
    userRepository = module.get(getRepositoryToken(User));
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
    projectViewRepository = module.get(getRepositoryToken(ProjectView));
    recommendationService = module.get(RecommendationService);
    cacheService = module.get(RecommendationCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshRecommendationsForStudents', () => {
    it('should refresh recommendations for multiple students', async () => {
      const studentIds = ['user-1', 'user-2'];

      cacheService.invalidateRecommendations.mockResolvedValue(undefined);
      recommendationService.generateRecommendations.mockResolvedValue({
        recommendations: [],
        reasoning: 'Test reasoning',
        averageSimilarityScore: 0.8,
        fromCache: false,
        generatedAt: new Date(),
        metadata: { method: 'ai-embeddings', fallback: false },
      } as any);

      const result =
        await service.refreshRecommendationsForStudents(studentIds);

      expect(result.totalStudents).toBe(2);
      expect(result.refreshedCount).toBe(2);
      expect(result.errorCount).toBe(0);
      expect(cacheService.invalidateRecommendations).toHaveBeenCalledTimes(2);
      expect(
        recommendationService.generateRecommendations,
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully during refresh', async () => {
      const studentIds = ['user-1', 'user-2'];

      cacheService.invalidateRecommendations.mockResolvedValue(undefined);
      recommendationService.generateRecommendations
        .mockResolvedValueOnce({
          recommendations: [],
          reasoning: 'Test reasoning',
          averageSimilarityScore: 0.8,
          fromCache: false,
          generatedAt: new Date(),
          metadata: { method: 'ai-embeddings', fallback: false },
        } as any)
        .mockRejectedValueOnce(new Error('Generation failed'));

      const result =
        await service.refreshRecommendationsForStudents(studentIds);

      expect(result.totalStudents).toBe(2);
      expect(result.refreshedCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });

    it('should process students in batches', async () => {
      // Create more students than batch size (assuming batch size is 10)
      const studentIds = Array.from({ length: 15 }, (_, i) => `user-${i + 1}`);

      cacheService.invalidateRecommendations.mockResolvedValue(undefined);
      recommendationService.generateRecommendations.mockResolvedValue({
        recommendations: [],
        reasoning: 'Test reasoning',
        averageSimilarityScore: 0.8,
        fromCache: false,
        generatedAt: new Date(),
        metadata: { method: 'ai-embeddings', fallback: false },
      } as any);

      const result =
        await service.refreshRecommendationsForStudents(studentIds);

      expect(result.totalStudents).toBe(15);
      expect(result.refreshedCount).toBe(15);
      expect(
        recommendationService.generateRecommendations,
      ).toHaveBeenCalledTimes(15);
    });
  });

  describe('forceRefreshStudent', () => {
    it('should force refresh recommendations for a single student', async () => {
      const studentId = 'user-1';

      cacheService.invalidateStudentCaches.mockResolvedValue(undefined);
      recommendationService.generateRecommendations.mockResolvedValue({
        recommendations: [],
        reasoning: 'Test reasoning',
        averageSimilarityScore: 0.8,
        fromCache: false,
        generatedAt: new Date(),
        metadata: { method: 'ai-embeddings', fallback: false },
      } as any);

      await service.forceRefreshStudent(studentId);

      expect(cacheService.invalidateStudentCaches).toHaveBeenCalledWith(
        studentId,
      );
      expect(
        recommendationService.generateRecommendations,
      ).toHaveBeenCalledWith(studentId, {
        forceRefresh: true,
      });
    });

    it('should throw error if refresh fails', async () => {
      const studentId = 'user-1';
      const error = new Error('Refresh failed');

      cacheService.invalidateStudentCaches.mockResolvedValue(undefined);
      recommendationService.generateRecommendations.mockRejectedValue(error);

      await expect(service.forceRefreshStudent(studentId)).rejects.toThrow(
        'Refresh failed',
      );
    });
  });

  describe('getRefreshStats', () => {
    it('should return comprehensive refresh statistics', async () => {
      // Mock stale recommendations
      recommendationRepository.find.mockResolvedValueOnce([
        { studentId: 'user-1' },
        { studentId: 'user-2' },
      ] as any);

      // Mock active students query
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ viewerId: 'user-1' }, { viewerId: 'user-3' }]),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock active students filter
      const mockUserQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-1' }, { id: 'user-3' }]),
      };
      userRepository.createQueryBuilder.mockReturnValue(
        mockUserQueryBuilder as any,
      );

      // Mock recommendation counts
      recommendationRepository.count
        .mockResolvedValueOnce(10) // total active
        .mockResolvedValueOnce(5); // expired

      const stats = await service.getRefreshStats();

      expect(stats.isRefreshRunning).toBe(false);
      expect(stats.staleRecommendationsCount).toBe(2);
      expect(stats.activeStudentsCount).toBe(2);
      expect(stats.totalRecommendationsCount).toBe(10);
      expect(stats.expiredRecommendationsCount).toBe(5);
    });
  });

  describe('cleanupExpiredRecommendations', () => {
    it('should mark expired recommendations as expired', async () => {
      recommendationRepository.count.mockResolvedValue(3);
      recommendationRepository.update.mockResolvedValue({ affected: 3 } as any);

      await service.cleanupExpiredRecommendations();

      expect(recommendationRepository.count).toHaveBeenCalledWith({
        where: {
          status: RecommendationStatus.ACTIVE,
          expiresAt: expect.any(Object), // LessThan matcher
        },
      });

      expect(recommendationRepository.update).toHaveBeenCalledWith(
        {
          status: RecommendationStatus.ACTIVE,
          expiresAt: expect.any(Object),
        },
        {
          status: RecommendationStatus.EXPIRED,
        },
      );
    });

    it('should skip cleanup if no expired recommendations found', async () => {
      recommendationRepository.count.mockResolvedValue(0);

      await service.cleanupExpiredRecommendations();

      expect(recommendationRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('warmUpActiveUserCache', () => {
    it('should warm up cache for active users without cached recommendations', async () => {
      // Mock active students query
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest
          .fn()
          .mockResolvedValue([{ viewerId: 'user-1' }, { viewerId: 'user-2' }]),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock active students filter
      const mockUserQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]),
      };
      userRepository.createQueryBuilder.mockReturnValue(
        mockUserQueryBuilder as any,
      );

      // Mock cache check - user-1 has cache, user-2 doesn't
      cacheService.getCachedRecommendations
        .mockResolvedValueOnce({ recommendations: [] } as any) // user-1 has cache
        .mockResolvedValueOnce(null); // user-2 doesn't have cache

      cacheService.invalidateRecommendations.mockResolvedValue(undefined);
      recommendationService.generateRecommendations.mockResolvedValue({
        recommendations: [],
        reasoning: 'Test reasoning',
        averageSimilarityScore: 0.8,
        fromCache: false,
        generatedAt: new Date(),
        metadata: { method: 'ai-embeddings', fallback: false },
      } as any);

      await service.warmUpActiveUserCache();

      // Should only refresh user-2 (who doesn't have cache)
      expect(
        recommendationService.generateRecommendations,
      ).toHaveBeenCalledTimes(1);
      expect(
        recommendationService.generateRecommendations,
      ).toHaveBeenCalledWith('user-2', {
        forceRefresh: true,
      });
    });

    it('should skip warm-up if no active students found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await service.warmUpActiveUserCache();

      expect(
        recommendationService.generateRecommendations,
      ).not.toHaveBeenCalled();
    });
  });
});
