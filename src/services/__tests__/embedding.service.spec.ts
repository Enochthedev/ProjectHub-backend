import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { EmbeddingService, BatchEmbeddingResult } from '../embedding.service';
import { HuggingFaceService } from '../hugging-face.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let huggingFaceService: jest.Mocked<HuggingFaceService>;
  let cacheManager: jest.Mocked<any>;

  const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];
  const mockEmbeddings = [
    [0.1, 0.2, 0.3, 0.4, 0.5],
    [0.6, 0.7, 0.8, 0.9, 1.0],
  ];

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockHuggingFaceService = {
      generateEmbeddings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: HuggingFaceService,
          useValue: mockHuggingFaceService,
        },
      ],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
    huggingFaceService = module.get(HuggingFaceService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbeddings', () => {
    it('should generate embeddings for texts', async () => {
      const texts = ['hello world', 'test text'];
      huggingFaceService.generateEmbeddings
        .mockResolvedValueOnce([mockEmbeddings[0]])
        .mockResolvedValueOnce([mockEmbeddings[1]]);
      cacheManager.get.mockResolvedValue(null); // No cache hits

      const result = await service.generateEmbeddings(texts);

      expect(result.embeddings).toEqual(mockEmbeddings);
      expect(result.fromCache).toEqual([false, false]);
      expect(result.cacheHits).toBe(0);
      expect(result.cacheMisses).toBe(2);
      expect(huggingFaceService.generateEmbeddings).toHaveBeenCalledTimes(2);
    });

    it('should use cached embeddings when available', async () => {
      const texts = ['cached text'];
      const cachedEntry = {
        embedding: mockEmbedding,
        createdAt: new Date(),
        textHash: 'test-hash',
      };
      cacheManager.get.mockResolvedValue(cachedEntry);

      const result = await service.generateEmbeddings(texts);

      expect(result.embeddings).toEqual([mockEmbedding]);
      expect(result.fromCache).toEqual([true]);
      expect(result.cacheHits).toBe(1);
      expect(result.cacheMisses).toBe(0);
      expect(huggingFaceService.generateEmbeddings).not.toHaveBeenCalled();
    });

    it('should handle mixed cache hits and misses', async () => {
      const texts = ['cached text', 'new text'];
      const cachedEntry = {
        embedding: mockEmbedding,
        createdAt: new Date(),
        textHash: 'test-hash',
      };

      cacheManager.get
        .mockResolvedValueOnce(cachedEntry) // First text is cached
        .mockResolvedValueOnce(null); // Second text is not cached

      huggingFaceService.generateEmbeddings.mockResolvedValue([
        mockEmbeddings[1],
      ]);

      const result = await service.generateEmbeddings(texts);

      expect(result.embeddings).toEqual([mockEmbedding, mockEmbeddings[1]]);
      expect(result.fromCache).toEqual([true, false]);
      expect(result.cacheHits).toBe(1);
      expect(result.cacheMisses).toBe(1);
    });

    it('should throw error for empty texts array', async () => {
      await expect(service.generateEmbeddings([])).rejects.toThrow(
        'Texts array cannot be empty',
      );
    });

    it('should handle cache errors gracefully', async () => {
      const texts = ['test text'];
      cacheManager.get.mockRejectedValue(new Error('Cache error'));
      huggingFaceService.generateEmbeddings.mockResolvedValue([mockEmbedding]);

      const result = await service.generateEmbeddings(texts);

      expect(result.embeddings).toEqual([mockEmbedding]);
      expect(result.fromCache).toEqual([false]);
      expect(result.cacheMisses).toBe(1);
    });
  });

  describe('generateSingleEmbedding', () => {
    it('should generate embedding for single text', async () => {
      const text = 'test text';
      huggingFaceService.generateEmbeddings.mockResolvedValue([mockEmbedding]);

      const result = await service.generateSingleEmbedding(text);

      expect(result).toEqual(mockEmbedding);
      expect(huggingFaceService.generateEmbeddings).toHaveBeenCalledWith(
        ['test text'],
        undefined,
      );
    });

    it('should throw error when no embeddings returned', async () => {
      const text = 'test text';
      huggingFaceService.generateEmbeddings.mockResolvedValue([]);

      await expect(service.generateSingleEmbedding(text)).rejects.toThrow(
        'Failed to generate embedding',
      );
    });
  });

  describe('generateEmbeddingsBatch', () => {
    it('should process texts in batches', async () => {
      const texts = ['text1', 'text2', 'text3', 'text4', 'text5'];
      const batchSize = 2;

      cacheManager.get.mockResolvedValue(null);
      huggingFaceService.generateEmbeddings.mockResolvedValue([mockEmbedding]);

      // Mock delay to avoid actual waiting
      jest.spyOn(service as any, 'delay').mockResolvedValue(undefined);

      const result = await service.generateEmbeddingsBatch(texts, batchSize);

      expect(result.embeddings).toHaveLength(5);
      expect(result.cacheMisses).toBe(5);
      expect(huggingFaceService.generateEmbeddings).toHaveBeenCalledTimes(5);
    });

    it('should throw error for empty texts array', async () => {
      await expect(service.generateEmbeddingsBatch([])).rejects.toThrow(
        'Texts array cannot be empty',
      );
    });
  });

  describe('text preprocessing', () => {
    it('should preprocess text correctly', () => {
      const preprocessText = (service as any).preprocessText.bind(service);

      expect(preprocessText('  Hello   World!  ')).toBe('hello world');
      expect(preprocessText('Test@#$%Text')).toBe('test text');
      expect(preprocessText('')).toBe('');
      expect(preprocessText(null)).toBe('');
    });

    it('should truncate long text', () => {
      const preprocessText = (service as any).preprocessText.bind(service);
      const longText = 'a'.repeat(3000);

      const result = preprocessText(longText);

      expect(result.length).toBeLessThan(longText.length);
    });
  });

  describe('cache operations', () => {
    it('should invalidate embedding cache', async () => {
      const texts = ['text1', 'text2'];
      cacheManager.del.mockResolvedValue(undefined);

      await service.invalidateEmbeddingCache(texts);

      expect(cacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should handle cache invalidation errors', async () => {
      const texts = ['text1'];
      cacheManager.del.mockRejectedValue(new Error('Cache error'));

      // Should not throw error
      await expect(
        service.invalidateEmbeddingCache(texts),
      ).resolves.toBeUndefined();
    });

    it('should warm up cache', async () => {
      const commonTexts = ['common1', 'common2'];
      cacheManager.get.mockResolvedValue(null);
      huggingFaceService.generateEmbeddings.mockResolvedValue([mockEmbedding]);

      await service.warmUpCache(commonTexts);

      expect(huggingFaceService.generateEmbeddings).toHaveBeenCalled();
    });
  });

  describe('utility methods', () => {
    it('should estimate token count', () => {
      const text = 'hello world test';
      const tokenCount = service.estimateTokenCount(text);

      expect(tokenCount).toBeGreaterThan(0);
      expect(typeof tokenCount).toBe('number');
    });

    it('should check if text is within token limit', () => {
      const shortText = 'hello';
      const longText = 'a'.repeat(3000);

      expect(service.isTextWithinTokenLimit(shortText, 512)).toBe(true);
      expect(service.isTextWithinTokenLimit(longText, 100)).toBe(false);
    });

    it('should get cache stats', async () => {
      const stats = await service.getCacheStats();

      expect(stats).toHaveProperty('totalCachedEmbeddings');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageEmbeddingSize');
    });
  });
});
