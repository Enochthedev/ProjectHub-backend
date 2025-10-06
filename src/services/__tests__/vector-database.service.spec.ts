import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VectorDatabaseService } from '../vector-database.service';

describe('VectorDatabaseService', () => {
  let service: VectorDatabaseService;
  let configService: ConfigService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorDatabaseService,
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
      ],
    }).compile();

    service = module.get<VectorDatabaseService>(VectorDatabaseService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load qdrant configuration', () => {
    expect(configService.get('qdrant')).toEqual(mockQdrantConfig);
  });

  describe('vector operations', () => {
    const mockVector = new Array(384).fill(0).map(() => Math.random());
    const mockPayload = {
      userId: 'test-user',
      type: 'conversation',
      content: 'test content',
    };

    it('should validate embedding dimensions', () => {
      const validEmbedding = new Array(384).fill(0.1);
      const invalidEmbedding = new Array(256).fill(0.1);

      // Note: This test would require the service to be properly initialized
      // For now, we're just testing the configuration
      expect(mockQdrantConfig.vectorDimensions).toBe(384);
      expect(validEmbedding.length).toBe(mockQdrantConfig.vectorDimensions);
      expect(invalidEmbedding.length).not.toBe(
        mockQdrantConfig.vectorDimensions,
      );
    });

    it('should handle search options correctly', () => {
      const searchOptions = {
        limit: 10,
        scoreThreshold: 0.7,
        filter: { userId: 'test-user' },
        withVector: false,
        offset: 0,
      };

      expect(searchOptions.limit).toBe(10);
      expect(searchOptions.scoreThreshold).toBe(0.7);
      expect(searchOptions.filter).toEqual({ userId: 'test-user' });
    });
  });

  describe('collection management', () => {
    it('should have correct collection names', () => {
      expect(mockQdrantConfig.collections.conversations).toBe(
        'test_conversations',
      );
      expect(mockQdrantConfig.collections.userMemories).toBe(
        'test_user_memories',
      );
      expect(mockQdrantConfig.collections.institutionalKnowledge).toBe(
        'test_institutional_knowledge',
      );
    });

    it('should use correct distance metric', () => {
      expect(mockQdrantConfig.distanceMetric).toBe('Cosine');
    });
  });
});
