import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VectorEmbeddingService } from '../vector-embedding.service';
import { EmbeddingService } from '../embedding.service';

describe('VectorEmbeddingService', () => {
  let service: VectorEmbeddingService;
  let embeddingService: EmbeddingService;

  const mockQdrantConfig = {
    url: 'http://localhost:6333',
    apiKey: undefined,
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000,
    collections: {
      conversations: 'test_conversations',
      userMemories: 'test_user_memories',
      institutionalKnowledge: 'test_institutional_knowledge',
    },
    vectorDimensions: 384,
    distanceMetric: 'Cosine' as const,
  };

  const mockEmbedding = new Array(384).fill(0).map(() => Math.random());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorEmbeddingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'qdrant') {
                return mockQdrantConfig;
              }
              return undefined;
            }),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            generateSingleEmbedding: jest.fn().mockResolvedValue(mockEmbedding),
            generateEmbeddings: jest.fn().mockResolvedValue({
              embeddings: [mockEmbedding],
              fromCache: [false],
              totalTokens: 10,
              cacheHits: 0,
              cacheMisses: 1,
            }),
            getCacheStats: jest.fn().mockResolvedValue({
              totalCachedEmbeddings: 0,
              cacheHitRate: 0,
              averageEmbeddingSize: 384,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<VectorEmbeddingService>(VectorEmbeddingService);
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateEmbedding', () => {
    it('should generate embedding for valid text', async () => {
      const text = 'This is a test message';
      const metadata = { userId: 'test-user' };

      const result = await service.generateEmbedding(text, metadata);

      expect(result).toBeDefined();
      expect(result.embedding).toHaveLength(384);
      expect(result.text).toBe(text);
      expect(result.metadata).toMatchObject(metadata);
      expect(result.metadata?.generatedAt).toBeDefined();
      expect(result.metadata?.dimensions).toBe(384);
    });

    it('should throw error for empty text', async () => {
      await expect(service.generateEmbedding('')).rejects.toThrow(
        'Text cannot be empty',
      );
      await expect(service.generateEmbedding('   ')).rejects.toThrow(
        'Text cannot be empty',
      );
    });

    it('should normalize vector when requested', async () => {
      const text = 'Test text';
      const options = { normalize: true };

      const result = await service.generateEmbedding(text, {}, options);

      expect(result.embedding).toBeDefined();
      expect(result.embedding.length).toBe(384);

      // Check if vector is normalized (magnitude should be close to 1)
      const magnitude = Math.sqrt(
        result.embedding.reduce((sum, val) => sum + val * val, 0),
      );
      expect(magnitude).toBeCloseTo(1, 5);
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['Text 1', 'Text 2', 'Text 3'];
      const metadata = [
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' },
      ];

      embeddingService.generateEmbeddings = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding, mockEmbedding, mockEmbedding],
        fromCache: [false, false, false],
        totalTokens: 30,
        cacheHits: 0,
        cacheMisses: 3,
      });

      const result = await service.generateBatchEmbeddings(texts, metadata);

      expect(result).toBeDefined();
      expect(result.embeddings).toHaveLength(3);
      expect(result.totalTokens).toBe(30);
      expect(result.cacheHits).toBe(0);
      expect(result.cacheMisses).toBe(3);
    });

    it('should filter out empty texts', async () => {
      const texts = ['Valid text', '', '   ', 'Another valid text'];

      embeddingService.generateEmbeddings = jest.fn().mockResolvedValue({
        embeddings: [mockEmbedding, mockEmbedding],
        fromCache: [false, false],
        totalTokens: 20,
        cacheHits: 0,
        cacheMisses: 2,
      });

      const result = await service.generateBatchEmbeddings(texts);

      expect(embeddingService.generateEmbeddings).toHaveBeenCalledWith([
        'Valid text',
        'Another valid text',
      ]);
      expect(result.embeddings).toHaveLength(2);
    });
  });

  describe('specialized embedding methods', () => {
    it('should generate conversation embedding', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ];
      const conversationId = 'conv-123';
      const userId = 'user-456';

      const result = await service.generateConversationEmbedding(
        messages,
        conversationId,
        userId,
      );

      expect(result).toBeDefined();
      expect(result.metadata?.type).toBe('conversation');
      expect(result.metadata?.conversationId).toBe(conversationId);
      expect(result.metadata?.userId).toBe(userId);
      expect(result.metadata?.messageCount).toBe(2);
    });

    it('should generate user memory embedding', async () => {
      const content = 'User prefers technical explanations';
      const userId = 'user-123';
      const memoryType = 'preference';

      const result = await service.generateUserMemoryEmbedding(
        content,
        userId,
        memoryType,
      );

      expect(result).toBeDefined();
      expect(result.metadata?.type).toBe('user_memory');
      expect(result.metadata?.memoryType).toBe(memoryType);
      expect(result.metadata?.userId).toBe(userId);
    });

    it('should generate institutional embedding', async () => {
      const content = 'Dr. Smith specializes in machine learning';
      const knowledgeType = 'lecturer';

      const result = await service.generateInstitutionalEmbedding(
        content,
        knowledgeType,
      );

      expect(result).toBeDefined();
      expect(result.metadata?.type).toBe('institutional_knowledge');
      expect(result.metadata?.knowledgeType).toBe(knowledgeType);
    });
  });

  describe('utility methods', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      const vectorC = [1, 0, 0];

      const similarity1 = service.calculateCosineSimilarity(vectorA, vectorB);
      const similarity2 = service.calculateCosineSimilarity(vectorA, vectorC);

      expect(similarity1).toBeCloseTo(0, 5); // Orthogonal vectors
      expect(similarity2).toBeCloseTo(1, 5); // Identical vectors
    });

    it('should validate embeddings correctly', () => {
      const validEmbedding = new Array(384).fill(0.1);
      const invalidEmbedding1 = new Array(256).fill(0.1); // Wrong dimensions
      const invalidEmbedding2 = [1, 2, NaN]; // Contains NaN
      const invalidEmbedding3 = 'not an array'; // Not an array

      expect(service.validateEmbedding(validEmbedding)).toBe(true);
      expect(service.validateEmbedding(invalidEmbedding1)).toBe(false);
      expect(service.validateEmbedding(invalidEmbedding2)).toBe(false);
      expect(service.validateEmbedding(invalidEmbedding3 as any)).toBe(false);
    });

    it('should preprocess text correctly', () => {
      const text = '  Hello   world!  \n\n  ';
      const processed = service.preprocessTextForEmbedding(text);

      expect(processed).toBe('Hello world!');
    });
  });
});
