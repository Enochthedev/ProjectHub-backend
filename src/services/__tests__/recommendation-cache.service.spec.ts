import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  RecommendationCacheService,
  EmbeddingCacheEntry,
} from '../recommendation-cache.service';
import { RecommendationResultDto } from '../../dto/recommendation/recommendation-result.dto';

describe('RecommendationCacheService', () => {
  let service: RecommendationCacheService;
  let cacheManager: jest.Mocked<any>;

  const mockRecommendationResult: RecommendationResultDto = {
    recommendations: [
      {
        projectId: 'project-1',
        title: 'Test Project',
        abstract: 'Test abstract',
        specialization: 'Software Engineering',
        difficultyLevel: 'intermediate' as any,
        similarityScore: 0.85,
        matchingSkills: ['JavaScript', 'React'],
        matchingInterests: ['Web Development'],
        reasoning: 'Good match based on skills',
        supervisor: {
          id: 'supervisor-1',
          name: 'Dr. Smith',
          specialization: 'Software Engineering',
        },
      },
    ],
    reasoning: 'Overall good matches found',
    averageSimilarityScore: 0.85,
    fromCache: false,
    generatedAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
    metadata: {
      method: 'ai-embeddings',
      fallback: false,
      projectsAnalyzed: 10,
      cacheHitRate: 0,
      processingTimeMs: 1500,
    },
  };

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RecommendationCacheService>(
      RecommendationCacheService,
    );
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.resetCacheStats();
  });

  describe('getCachedRecommendations', () => {
    it('should return cached recommendations when available', async () => {
      const studentId = 'student-123';
      cacheManager.get.mockResolvedValue(mockRecommendationResult);

      const result = await service.getCachedRecommendations(studentId);

      expect(result).toBeDefined();
      expect(result?.fromCache).toBe(true);
      expect(cacheManager.get).toHaveBeenCalledWith('rec:student-123');
    });

    it('should return null when no cache entry exists', async () => {
      const studentId = 'student-123';
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedRecommendations(studentId);

      expect(result).toBeNull();
      expect(cacheManager.get).toHaveBeenCalledWith('rec:student-123');
    });

    it('should handle cache errors gracefully', async () => {
      const studentId = 'student-123';
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.getCachedRecommendations(studentId);

      expect(result).toBeNull();
    });
  });

  describe('setCachedRecommendations', () => {
    it('should cache recommendations with default TTL', async () => {
      const studentId = 'student-123';
      cacheManager.set.mockResolvedValue(undefined);

      await service.setCachedRecommendations(
        studentId,
        mockRecommendationResult,
      );

      expect(cacheManager.set).toHaveBeenCalledWith(
        'rec:student-123',
        { ...mockRecommendationResult, fromCache: false },
        3600,
      );
    });

    it('should cache recommendations with custom TTL', async () => {
      const studentId = 'student-123';
      const customTTL = 7200;
      cacheManager.set.mockResolvedValue(undefined);

      await service.setCachedRecommendations(
        studentId,
        mockRecommendationResult,
        customTTL,
      );

      expect(cacheManager.set).toHaveBeenCalledWith(
        'rec:student-123',
        { ...mockRecommendationResult, fromCache: false },
        customTTL,
      );
    });

    it('should handle cache errors gracefully', async () => {
      const studentId = 'student-123';
      cacheManager.set.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.setCachedRecommendations(studentId, mockRecommendationResult),
      ).resolves.not.toThrow();
    });
  });

  describe('getCachedEmbedding', () => {
    it('should return cached embedding when available', async () => {
      const text = 'test text';
      const model = 'test-model';
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockCacheEntry: EmbeddingCacheEntry = {
        embedding: mockEmbedding,
        text: text.substring(0, 100),
        model,
        createdAt: new Date(),
      };

      cacheManager.get.mockResolvedValue(mockCacheEntry);

      const result = await service.getCachedEmbedding(text, model);

      expect(result).toEqual(mockEmbedding);
      expect(cacheManager.get).toHaveBeenCalledWith(
        expect.stringMatching(/^emb:test-model:/),
      );
    });

    it('should return null when no cache entry exists', async () => {
      const text = 'test text';
      const model = 'test-model';
      cacheManager.get.mockResolvedValue(null);

      const result = await service.getCachedEmbedding(text, model);

      expect(result).toBeNull();
    });

    it('should handle cache errors gracefully', async () => {
      const text = 'test text';
      const model = 'test-model';
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      const result = await service.getCachedEmbedding(text, model);

      expect(result).toBeNull();
    });
  });

  describe('setCachedEmbedding', () => {
    it('should cache embedding with default TTL', async () => {
      const text = 'test text';
      const embedding = [0.1, 0.2, 0.3];
      const model = 'test-model';
      cacheManager.set.mockResolvedValue(undefined);

      await service.setCachedEmbedding(text, embedding, model);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^emb:test-model:/),
        expect.objectContaining({
          embedding,
          text: text.substring(0, 100),
          model,
          createdAt: expect.any(Date),
        }),
        86400,
      );
    });

    it('should cache embedding with custom TTL', async () => {
      const text = 'test text';
      const embedding = [0.1, 0.2, 0.3];
      const model = 'test-model';
      const customTTL = 3600;
      cacheManager.set.mockResolvedValue(undefined);

      await service.setCachedEmbedding(text, embedding, model, customTTL);

      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^emb:test-model:/),
        expect.any(Object),
        customTTL,
      );
    });
  });

  describe('getCachedBatchEmbeddings', () => {
    it('should return partial cache hits for batch embeddings', async () => {
      const texts = ['text1', 'text2', 'text3'];
      const model = 'test-model';
      const mockEmbedding1 = [0.1, 0.2, 0.3];
      const mockEmbedding3 = [0.7, 0.8, 0.9];

      // Mock cache hits for text1 and text3, miss for text2
      cacheManager.get
        .mockResolvedValueOnce({ embedding: mockEmbedding1 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ embedding: mockEmbedding3 });

      const result = await service.getCachedBatchEmbeddings(texts, model);

      expect(result.embeddings).toEqual([mockEmbedding1, null, mockEmbedding3]);
      expect(result.cacheHitRate).toBeCloseTo(0.67, 2);
    });

    it('should handle empty texts array', async () => {
      const texts: string[] = [];
      const model = 'test-model';

      const result = await service.getCachedBatchEmbeddings(texts, model);

      expect(result.embeddings).toEqual([]);
      expect(result.cacheHitRate).toBe(0);
    });
  });

  describe('setCachedBatchEmbeddings', () => {
    it('should cache all embeddings in batch', async () => {
      const texts = ['text1', 'text2'];
      const embeddings = [
        [0.1, 0.2],
        [0.3, 0.4],
      ];
      const model = 'test-model';
      cacheManager.set.mockResolvedValue(undefined);

      await service.setCachedBatchEmbeddings(texts, embeddings, model);

      expect(cacheManager.set).toHaveBeenCalledTimes(2);
    });

    it('should handle mismatched array lengths', async () => {
      const texts = ['text1', 'text2'];
      const embeddings = [[0.1, 0.2]]; // Different length
      const model = 'test-model';

      await service.setCachedBatchEmbeddings(texts, embeddings, model);

      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('invalidateRecommendations', () => {
    it('should invalidate recommendations cache for student', async () => {
      const studentId = 'student-123';
      cacheManager.del.mockResolvedValue(undefined);

      await service.invalidateRecommendations(studentId);

      expect(cacheManager.del).toHaveBeenCalledWith('rec:student-123');
    });

    it('should handle invalidation errors gracefully', async () => {
      const studentId = 'student-123';
      cacheManager.del.mockRejectedValue(new Error('Cache error'));

      await expect(
        service.invalidateRecommendations(studentId),
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateStudentCaches', () => {
    it('should invalidate all caches for student', async () => {
      const studentId = 'student-123';
      cacheManager.del.mockResolvedValue(undefined);

      await service.invalidateStudentCaches(studentId);

      expect(cacheManager.del).toHaveBeenCalledWith('rec:student-123');
      expect(cacheManager.del).toHaveBeenCalledWith('profile:student-123');
    });
  });

  describe('warmUpCache', () => {
    it('should process warm-up for multiple students', async () => {
      const studentIds = ['student-1', 'student-2', 'student-3'];
      cacheManager.get.mockResolvedValue(null); // No cached recommendations

      await service.warmUpCache(studentIds);

      expect(cacheManager.get).toHaveBeenCalledTimes(3);
    });

    it('should handle warm-up errors gracefully', async () => {
      const studentIds = ['student-1', 'student-2'];
      cacheManager.get
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Cache error'));

      await expect(service.warmUpCache(studentIds)).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      // Simulate some cache operations to generate stats
      cacheManager.get.mockResolvedValue(mockRecommendationResult);
      await service.getCachedRecommendations('student-1');

      cacheManager.get.mockResolvedValue(null);
      await service.getCachedRecommendations('student-2');

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 0,
        recommendationKeys: 0,
        embeddingKeys: 0,
        hitRate: 0.5,
        memoryUsage: 0,
      });
    });
  });

  describe('getCacheHitRate', () => {
    it('should calculate correct hit rate', async () => {
      // Simulate cache operations
      cacheManager.get.mockResolvedValue(mockRecommendationResult);
      await service.getCachedRecommendations('student-1');

      cacheManager.get.mockResolvedValue(null);
      await service.getCachedRecommendations('student-2');
      await service.getCachedRecommendations('student-3');

      const hitRate = service.getCacheHitRate();
      expect(hitRate).toBeCloseTo(0.33, 2);
    });

    it('should return 0 when no requests made', () => {
      const hitRate = service.getCacheHitRate();
      expect(hitRate).toBe(0);
    });
  });

  describe('refreshStaleCaches', () => {
    it('should refresh caches for multiple students', async () => {
      const studentIds = ['student-1', 'student-2'];
      cacheManager.del.mockResolvedValue(undefined);

      await service.refreshStaleCaches(studentIds);

      expect(cacheManager.del).toHaveBeenCalledTimes(2);
      expect(cacheManager.del).toHaveBeenCalledWith('rec:student-1');
      expect(cacheManager.del).toHaveBeenCalledWith('rec:student-2');
    });

    it('should handle refresh errors gracefully', async () => {
      const studentIds = ['student-1', 'student-2'];
      cacheManager.del
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Cache error'));

      await expect(
        service.refreshStaleCaches(studentIds),
      ).resolves.not.toThrow();
    });
  });
});
