import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  BatchRecommendationService,
  BatchPriority,
  BatchRequest,
} from '../batch-recommendation.service';
import { EmbeddingService } from '../embedding.service';
import { SimilarityService } from '../similarity.service';
import { TextProcessingService } from '../text-processing.service';
import { RecommendationCacheService } from '../recommendation-cache.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';

import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';

describe('BatchRecommendationService', () => {
  let service: BatchRecommendationService;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let similarityService: jest.Mocked<SimilarityService>;
  let textProcessingService: jest.Mocked<TextProcessingService>;
  let cacheService: jest.Mocked<RecommendationCacheService>;
  let rateLimiterService: jest.Mocked<AIRateLimiterService>;

  const mockStudent: Partial<User> = {
    id: 'student-1',
    role: UserRole.STUDENT,
    email: 'student@test.com',
    studentProfile: {
      id: 'profile-1',
      skills: ['JavaScript', 'React'],
      interests: ['Web Development'],
      specialization: 'Software Engineering',
      name: 'Test Student',
      preferredSpecializations: ['Software Engineering'],
      currentYear: 3,
      gpa: 3.5,
      bio: 'Test bio',
    } as StudentProfile,
  };

  const mockProject: Partial<Project> = {
    id: 'project-1',
    title: 'Test Project',
    abstract: 'A test project for web development',
    specialization: 'Software Engineering',
    approvalStatus: ApprovalStatus.APPROVED,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProjectRepository = {
      find: jest.fn(),
    };

    const mockStudentProfileRepository = {
      find: jest.fn(),
    };

    const mockEmbeddingService = {
      generateEmbeddings: jest.fn(),
    };

    const mockSimilarityService = {
      calculateBatchSimilarity: jest.fn(),
    };

    const mockTextProcessingService = {
      processStudentProfile: jest.fn(),
      processProject: jest.fn(),
    };

    const mockCacheService = {
      getCachedRecommendations: jest.fn(),
      setCachedRecommendations: jest.fn(),
    };

    const mockRateLimiterService = {
      checkRateLimit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchRecommendationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: mockStudentProfileRepository,
        },
        {
          provide: EmbeddingService,
          useValue: mockEmbeddingService,
        },
        {
          provide: SimilarityService,
          useValue: mockSimilarityService,
        },
        {
          provide: TextProcessingService,
          useValue: mockTextProcessingService,
        },
        {
          provide: RecommendationCacheService,
          useValue: mockCacheService,
        },
        {
          provide: AIRateLimiterService,
          useValue: mockRateLimiterService,
        },
      ],
    }).compile();

    service = module.get<BatchRecommendationService>(
      BatchRecommendationService,
    );
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    embeddingService = module.get(EmbeddingService);
    similarityService = module.get(SimilarityService);
    textProcessingService = module.get(TextProcessingService);
    cacheService = module.get(RecommendationCacheService);
    rateLimiterService = module.get(AIRateLimiterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitBatchRequest', () => {
    it('should submit a batch request successfully', async () => {
      const studentIds = ['student-1', 'student-2'];
      const options = { limit: 5 };
      const priority = BatchPriority.NORMAL;

      const requestId = await service.submitBatchRequest(
        studentIds,
        options,
        priority,
      );

      expect(requestId).toMatch(/^batch_\d+_[a-z0-9]+$/);

      const status = service.getBatchStatus(requestId);
      expect(status.status).toBe('queued');
      expect(status.position).toBe(1);
    });

    it('should reject empty student IDs array', async () => {
      await expect(service.submitBatchRequest([])).rejects.toThrow(
        'Student IDs array cannot be empty',
      );
    });

    it('should reject batch size exceeding limit', async () => {
      const studentIds = Array.from(
        { length: 51 },
        (_, i) => `student-${i + 1}`,
      );

      await expect(service.submitBatchRequest(studentIds)).rejects.toThrow(
        'Batch size cannot exceed 50 students',
      );
    });

    it('should order requests by priority', async () => {
      const studentIds1 = ['student-1'];
      const studentIds2 = ['student-2'];
      const studentIds3 = ['student-3'];

      // Submit in order: NORMAL, HIGH, LOW
      const requestId1 = await service.submitBatchRequest(
        studentIds1,
        {},
        BatchPriority.NORMAL,
      );
      const requestId2 = await service.submitBatchRequest(
        studentIds2,
        {},
        BatchPriority.HIGH,
      );
      const requestId3 = await service.submitBatchRequest(
        studentIds3,
        {},
        BatchPriority.LOW,
      );

      // HIGH should be first, then NORMAL, then LOW
      const status1 = service.getBatchStatus(requestId1);
      const status2 = service.getBatchStatus(requestId2);
      const status3 = service.getBatchStatus(requestId3);

      expect(status2.position).toBe(1); // HIGH priority
      expect(status1.position).toBe(2); // NORMAL priority
      expect(status3.position).toBe(3); // LOW priority
    });
  });

  describe('getBatchStatus', () => {
    it('should return not_found for non-existent request', () => {
      const status = service.getBatchStatus('non-existent-id');
      expect(status.status).toBe('not_found');
    });

    it('should return queued status with position and estimated wait time', async () => {
      const studentIds = ['student-1', 'student-2'];
      const requestId = await service.submitBatchRequest(studentIds);

      const status = service.getBatchStatus(requestId);

      expect(status.status).toBe('queued');
      expect(status.position).toBe(1);
      expect(status.estimatedWaitTime).toBeGreaterThan(0);
    });
  });

  describe('cancelBatchRequest', () => {
    it('should cancel a queued request successfully', async () => {
      const studentIds = ['student-1'];
      const requestId = await service.submitBatchRequest(studentIds);

      const cancelled = service.cancelBatchRequest(requestId);
      expect(cancelled).toBe(true);

      const status = service.getBatchStatus(requestId);
      expect(status.status).toBe('not_found');
    });

    it('should return false for non-existent request', () => {
      const cancelled = service.cancelBatchRequest('non-existent-id');
      expect(cancelled).toBe(false);
    });
  });

  describe('getBatchStats', () => {
    it('should return initial batch statistics', () => {
      const stats = service.getBatchStats();

      expect(stats).toEqual({
        queueSize: 0,
        processingCount: 0,
        completedToday: 0,
        averageProcessingTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
      });
    });

    it('should update queue size when requests are added', async () => {
      await service.submitBatchRequest(['student-1']);
      await service.submitBatchRequest(['student-2']);

      const stats = service.getBatchStats();
      expect(stats.queueSize).toBe(2);
    });
  });

  describe('batch processing optimization', () => {
    beforeEach(() => {
      // Setup common mocks for processing tests
      userRepository.find.mockResolvedValue([mockStudent as User]);
      projectRepository.find.mockResolvedValue([mockProject as Project]);

      textProcessingService.processStudentProfile.mockReturnValue({
        combined: { text: 'student profile text' },
      } as any);

      textProcessingService.processProject.mockReturnValue({
        combined: { text: 'project description text' },
      } as any);

      embeddingService.generateEmbeddings.mockResolvedValue({
        embeddings: [[0.1, 0.2, 0.3]],
        cacheHitRate: 0.5,
      } as any);

      similarityService.calculateBatchSimilarity.mockReturnValue({
        similarities: [{ normalizedScore: 0.8 }],
        rankedIndices: [0],
      } as any);

      cacheService.setCachedRecommendations.mockResolvedValue(undefined);
      rateLimiterService.checkRateLimit.mockResolvedValue({
        canProceed: true,
      } as any);
    });

    it('should handle cache hits efficiently', async () => {
      const studentIds = ['student-1', 'student-2'];

      // Mock cache hits for both students
      cacheService.getCachedRecommendations
        .mockResolvedValueOnce({
          recommendations: [],
          reasoning: 'Cached result',
          averageSimilarityScore: 0.8,
          fromCache: true,
          generatedAt: new Date(),
          metadata: { method: 'cached' },
        } as any)
        .mockResolvedValueOnce({
          recommendations: [],
          reasoning: 'Cached result',
          averageSimilarityScore: 0.8,
          fromCache: true,
          generatedAt: new Date(),
          metadata: { method: 'cached' },
        } as any);

      const requestId = await service.submitBatchRequest(studentIds);

      // Wait for processing (in real implementation, this would be handled by the queue processor)
      // For testing, we'll simulate the processing
      const status = service.getBatchStatus(requestId);
      expect(status.status).toBe('queued');

      // Verify that cache was checked
      expect(cacheService.getCachedRecommendations).toHaveBeenCalledTimes(2);
    });

    it('should estimate processing time based on batch size', async () => {
      const smallBatch = ['student-1'];
      const largeBatch = [
        'student-1',
        'student-2',
        'student-3',
        'student-4',
        'student-5',
      ];

      const smallRequestId = await service.submitBatchRequest(smallBatch);
      const largeRequestId = await service.submitBatchRequest(largeBatch);

      const smallStatus = service.getBatchStatus(smallRequestId);
      const largeStatus = service.getBatchStatus(largeRequestId);

      expect(largeStatus.estimatedWaitTime).toBeGreaterThan(
        smallStatus.estimatedWaitTime || 0,
      );
    });

    it('should handle mixed cache hits and misses', async () => {
      const studentIds = ['student-1', 'student-2'];

      // Mock cache hit for first student, miss for second
      cacheService.getCachedRecommendations
        .mockResolvedValueOnce({
          recommendations: [],
          reasoning: 'Cached result',
          averageSimilarityScore: 0.8,
          fromCache: true,
          generatedAt: new Date(),
          metadata: { method: 'cached' },
        } as any)
        .mockResolvedValueOnce(null); // Cache miss

      const requestId = await service.submitBatchRequest(studentIds);

      // Verify cache was checked for both students
      expect(cacheService.getCachedRecommendations).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should handle processing errors gracefully', async () => {
      const studentIds = ['student-1'];

      // Mock error during processing
      userRepository.find.mockRejectedValue(new Error('Database error'));
      cacheService.getCachedRecommendations.mockResolvedValue(null);

      const requestId = await service.submitBatchRequest(studentIds);

      // The request should be queued successfully even if processing will fail
      const status = service.getBatchStatus(requestId);
      expect(status.status).toBe('queued');
    });

    it('should handle rate limiting', async () => {
      rateLimiterService.checkRateLimit.mockResolvedValue({
        canProceed: false,
        resetTime: new Date(Date.now() + 60000),
      } as any);

      const studentIds = ['student-1'];
      const requestId = await service.submitBatchRequest(studentIds);

      // Request should be queued but processing should be delayed due to rate limiting
      const status = service.getBatchStatus(requestId);
      expect(status.status).toBe('queued');
    });
  });
});
