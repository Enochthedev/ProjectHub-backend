import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { HuggingFaceService } from '../src/services/hugging-face.service';
import { AIRateLimiterService } from '../src/services/ai-rate-limiter.service';
import { ConversationCacheService } from '../src/services/conversation-cache.service';
import { User } from '../src/entities/user.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { ConversationMessage } from '../src/entities/conversation-message.entity';
import { AIApiUsage } from '../src/entities/ai-api-usage.entity';
import { Project } from '../src/entities/project.entity';
import {
  UserRole,
  ConversationStatus,
  MessageType,
  MessageStatus,
  DifficultyLevel,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

// Mock external services for controlled performance testing
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    questionAnswering: jest.fn(),
    featureExtraction: jest.fn(),
  })),
}));

describe('AI Assistant Performance Tests (e2e)', () => {
  let app: INestApplication;
  let huggingFaceService: HuggingFaceService;
  let rateLimiterService: AIRateLimiterService;
  let conversationCacheService: ConversationCacheService;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let aiUsageRepository: Repository<AIApiUsage>;
  let projectRepository: Repository<Project>;
  let jwtService: JwtService;

  let testUsers: User[] = [];
  let testProjects: Project[] = [];
  let testConversations: Conversation[] = [];
  let authTokens: string[] = [];
  let mockHfInference: any;

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    CACHED_RESPONSE_TIME: 1000, // 1 second
    AI_RESPONSE_TIME: 15000, // 15 seconds
    CONCURRENT_REQUEST_TIME: 20000, // 20 seconds for 10 concurrent requests
    BATCH_PROCESSING_TIME_PER_REQUEST: 2000, // 2 seconds per request in batch
    DATABASE_QUERY_TIME: 500, // 500ms for database operations
    CACHE_HIT_RATIO: 0.8, // 80% cache hit ratio under load
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );

    huggingFaceService =
      moduleFixture.get<HuggingFaceService>(HuggingFaceService);
    rateLimiterService =
      moduleFixture.get<AIRateLimiterService>(AIRateLimiterService);
    conversationCacheService = moduleFixture.get<ConversationCacheService>(
      ConversationCacheService,
    );
    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    conversationRepository = moduleFixture.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    messageRepository = moduleFixture.get<Repository<ConversationMessage>>(
      getRepositoryToken(ConversationMessage),
    );
    aiUsageRepository = moduleFixture.get<Repository<AIApiUsage>>(
      getRepositoryToken(AIApiUsage),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Setup mock Hugging Face inference
    const { HfInference } = require('@huggingface/inference');
    mockHfInference = {
      questionAnswering: jest.fn(),
      featureExtraction: jest.fn(),
    };
    HfInference.mockImplementation(() => mockHfInference);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database
    await aiUsageRepository.delete({});
    await messageRepository.delete({});
    await conversationRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});

    // Reset arrays
    testUsers = [];
    testProjects = [];
    testConversations = [];
    authTokens = [];

    // Reset mocks
    jest.clearAllMocks();

    // Create multiple test users for concurrent testing
    for (let i = 0; i < 10; i++) {
      const user = userRepository.create({
        email: `test${i}@example.com`,
        password: 'hashedpassword',
        role: UserRole.STUDENT,
        isEmailVerified: true,
      });
      const savedUser = await userRepository.save(user);
      testUsers.push(savedUser);

      // Create project for each user
      const project = projectRepository.create({
        title: `Performance Test Project ${i}`,
        abstract: `Performance testing project for user ${i}`,
        supervisorId: savedUser.id,
        specialization: 'Computer Science',
        technologyStack: ['JavaScript', 'Node.js', 'React'],
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
      });
      const savedProject = await projectRepository.save(project);
      testProjects.push(savedProject);

      // Create conversation for each user
      const conversation = conversationRepository.create({
        title: `Performance Test Conversation ${i}`,
        studentId: savedUser.id,
        projectId: savedProject.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        context: {
          projectId: savedProject.id,
          projectPhase: 'implementation',
          recentTopics: ['performance', 'testing'],
          keyTerms: ['optimization', 'scalability'],
          conversationSummary: 'Discussion about performance testing',
          lastActivity: new Date(),
          preferences: {
            language: 'en',
            responseStyle: 'technical',
            detailLevel: 'detailed',
          },
        },
        lastMessageAt: new Date(),
      });
      const savedConversation = await conversationRepository.save(conversation);
      testConversations.push(savedConversation);

      // Generate auth token
      const token = jwtService.sign({
        sub: savedUser.id,
        email: savedUser.email,
      });
      authTokens.push(token);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Response Time Performance', () => {
    it('should meet cached response time requirements', async () => {
      const mockResponse = {
        answer: 'Cached response about performance optimization',
        score: 0.9,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      const query = 'How do I optimize performance in my application?';
      const conversationId = testConversations[0].id;
      const authToken = authTokens[0];

      // First request - will be cached
      const firstStartTime = Date.now();
      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, conversationId })
        .expect(200);
      const firstEndTime = Date.now();

      // Second request - should be served from cache
      const secondStartTime = Date.now();
      const cachedResponse = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, conversationId })
        .expect(200);
      const secondEndTime = Date.now();

      const firstResponseTime = firstEndTime - firstStartTime;
      const cachedResponseTime = secondEndTime - secondStartTime;

      // Cached response should be significantly faster
      expect(cachedResponseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHED_RESPONSE_TIME,
      );
      expect(cachedResponseTime).toBeLessThan(firstResponseTime / 2);

      // Verify response quality is maintained
      expect(cachedResponse.body.response).toBeDefined();
      expect(cachedResponse.body.confidenceScore).toBeGreaterThan(0);
    });

    it('should meet AI processing time requirements', async () => {
      const processingDelays = [100, 500, 1000, 2000]; // Various AI processing delays

      for (const delay of processingDelays) {
        mockHfInference.questionAnswering.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    answer: `Response with ${delay}ms processing delay`,
                    score: 0.8,
                  }),
                delay,
              ),
            ),
        );

        const startTime = Date.now();
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            query: `Performance test with ${delay}ms delay`,
            conversationId: testConversations[0].id,
          })
          .expect(200);
        const endTime = Date.now();

        const totalResponseTime = endTime - startTime;

        // Should complete within threshold
        expect(totalResponseTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS.AI_RESPONSE_TIME,
        );

        // Verify processing time is tracked accurately
        expect(response.body.metadata.processingTime).toBeGreaterThanOrEqual(
          delay,
        );
        expect(response.body.metadata.processingTime).toBeLessThan(
          totalResponseTime,
        );
      }
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Mock a very slow response that would timeout
      mockHfInference.questionAnswering.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 20000),
          ),
      );

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          query: 'This will timeout',
          conversationId: testConversations[0].id,
        })
        .expect(200); // Should still return 200 with fallback
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      // Should fallback quickly, not wait for full timeout
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.AI_RESPONSE_TIME,
      );
      expect(response.body.fromAI).toBe(false);
      expect(response.body.escalationSuggestion).toBeDefined();
    });

    it('should optimize database query performance', async () => {
      // Create a conversation with many messages to test query optimization
      const conversationId = testConversations[0].id;

      // Create 100 messages
      const messages = [];
      for (let i = 0; i < 100; i++) {
        messages.push({
          conversationId,
          type: i % 2 === 0 ? MessageType.USER_QUERY : MessageType.AI_RESPONSE,
          content: `Message ${i} for performance testing`,
          status: MessageStatus.DELIVERED,
        });
      }

      await messageRepository.save(messages);

      // Test message retrieval performance
      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .query({ limit: 20, offset: 0 })
        .expect(200);
      const endTime = Date.now();

      const queryTime = endTime - startTime;

      expect(queryTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME,
      );
      expect(response.body.messages).toHaveLength(20);
      expect(response.body.total).toBe(100);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockResponse = {
        answer: 'Concurrent request response',
        score: 0.85,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      const concurrentRequests = 10;
      const promises = [];

      const startTime = Date.now();

      // Create concurrent requests from different users
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[i]}`)
          .send({
            query: `Concurrent question ${i}`,
            conversationId: testConversations[i].id,
          });
        promises.push(promise);
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // All requests should complete within threshold
      expect(totalTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CONCURRENT_REQUEST_TIME,
      );

      // All responses should be successful
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.response).toBeDefined();
        expect(response.body.conversationId).toBe(testConversations[index].id);
      });

      // Verify all API calls were made
      expect(mockHfInference.questionAnswering).toHaveBeenCalledTimes(
        concurrentRequests,
      );
    });

    it('should maintain performance under high load', async () => {
      const mockResponse = {
        answer: 'High load test response',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockImplementation(
        () =>
          new Promise(
            (resolve) => setTimeout(() => resolve(mockResponse), 200), // 200ms processing time
          ),
      );

      const loadTestRounds = 3;
      const requestsPerRound = 5;

      for (let round = 0; round < loadTestRounds; round++) {
        const roundStartTime = Date.now();
        const roundPromises = [];

        for (let i = 0; i < requestsPerRound; i++) {
          const userIndex = (round * requestsPerRound + i) % testUsers.length;
          const promise = request(app.getHttpServer())
            .post('/ai-assistant/ask')
            .set('Authorization', `Bearer ${authTokens[userIndex]}`)
            .send({
              query: `Load test round ${round} request ${i}`,
              conversationId: testConversations[userIndex].id,
            });
          roundPromises.push(promise);
        }

        const roundResponses = await Promise.all(roundPromises);
        const roundEndTime = Date.now();
        const roundTime = roundEndTime - roundStartTime;

        // Each round should complete efficiently
        expect(roundTime).toBeLessThan(
          requestsPerRound *
            PERFORMANCE_THRESHOLDS.BATCH_PROCESSING_TIME_PER_REQUEST,
        );

        // All responses should be successful
        roundResponses.forEach((response) => {
          expect(response.status).toBe(200);
          expect(response.body.response).toBeDefined();
        });
      }
    });

    it('should handle rate limiting gracefully under load', async () => {
      const mockResponse = {
        answer: 'Rate limit test response',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      const user = testUsers[0];
      const conversation = testConversations[0];
      const authToken = authTokens[0];

      // Make requests up to rate limit
      const rateLimitPerMinute = 10; // Assuming this is the configured limit
      const successfulRequests = [];
      const rateLimitedRequests = [];

      for (let i = 0; i < rateLimitPerMinute + 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Rate limit test ${i}`,
            conversationId: conversation.id,
          });

        if (response.status === 200) {
          successfulRequests.push(response);
        } else if (response.status === 429) {
          rateLimitedRequests.push(response);
        }
      }

      // Should have exactly the rate limit number of successful requests
      expect(successfulRequests.length).toBe(rateLimitPerMinute);
      expect(rateLimitedRequests.length).toBe(5);

      // Rate limited responses should include helpful information
      rateLimitedRequests.forEach((response) => {
        expect(response.body.message).toContain('Rate limit exceeded');
        expect(response.body.remainingRequests).toBeDefined();
        expect(response.body.resetTime).toBeDefined();
      });
    });
  });

  describe('Caching Performance', () => {
    it('should achieve target cache hit ratio under load', async () => {
      const mockResponse = {
        answer: 'Cacheable response for performance testing',
        score: 0.9,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      // Define a set of common queries that should be cached
      const commonQueries = [
        'What is a literature review?',
        'How do I write a methodology section?',
        'What citation style should I use?',
        'How do I analyze my data?',
        'What is the structure of a research proposal?',
      ];

      const totalRequests = 50;
      let cacheHits = 0;
      let cacheMisses = 0;

      // Make multiple requests with repeated queries
      for (let i = 0; i < totalRequests; i++) {
        const queryIndex = i % commonQueries.length;
        const userIndex = i % testUsers.length;
        const query = commonQueries[queryIndex];

        const startTime = Date.now();
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[userIndex]}`)
          .send({
            query,
            conversationId: testConversations[userIndex].id,
          })
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;

        // Classify as cache hit or miss based on response time
        if (responseTime < PERFORMANCE_THRESHOLDS.CACHED_RESPONSE_TIME) {
          cacheHits++;
        } else {
          cacheMisses++;
        }

        expect(response.body.response).toBeDefined();
      }

      const cacheHitRatio = cacheHits / totalRequests;

      // Should achieve target cache hit ratio
      expect(cacheHitRatio).toBeGreaterThan(
        PERFORMANCE_THRESHOLDS.CACHE_HIT_RATIO,
      );

      console.log(
        `Cache performance: ${cacheHits}/${totalRequests} hits (${(cacheHitRatio * 100).toFixed(1)}%)`,
      );
    });

    it('should invalidate cache appropriately', async () => {
      const mockResponse = {
        answer: 'Response for cache invalidation test',
        score: 0.85,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      const query = 'Cache invalidation test query';
      const conversationId = testConversations[0].id;
      const authToken = authTokens[0];

      // First request - populate cache
      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, conversationId })
        .expect(200);

      // Second request - should be cached (fast)
      const cachedStartTime = Date.now();
      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, conversationId })
        .expect(200);
      const cachedEndTime = Date.now();

      const cachedResponseTime = cachedEndTime - cachedStartTime;
      expect(cachedResponseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.CACHED_RESPONSE_TIME,
      );

      // Simulate cache invalidation (e.g., context update)
      await conversationCacheService.invalidateConversationCache(
        conversationId,
      );

      // Third request - should be slower due to cache miss
      const invalidatedStartTime = Date.now();
      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query, conversationId })
        .expect(200);
      const invalidatedEndTime = Date.now();

      const invalidatedResponseTime = invalidatedEndTime - invalidatedStartTime;
      expect(invalidatedResponseTime).toBeGreaterThan(cachedResponseTime);
    });

    it('should manage cache memory efficiently', async () => {
      const mockResponse = {
        answer: 'Memory efficiency test response',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      // Generate many unique queries to test cache memory management
      const uniqueQueries = Array.from(
        { length: 100 },
        (_, i) => `Unique query ${i} for memory efficiency testing`,
      );

      // Make requests with unique queries
      for (let i = 0; i < uniqueQueries.length; i++) {
        const userIndex = i % testUsers.length;

        const startTime = Date.now();
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[userIndex]}`)
          .send({
            query: uniqueQueries[i],
            conversationId: testConversations[userIndex].id,
          })
          .expect(200);
        const endTime = Date.now();

        const responseTime = endTime - startTime;

        // Should maintain reasonable performance even with cache pressure
        expect(responseTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS.AI_RESPONSE_TIME,
        );
        expect(response.body.response).toBeDefined();
      }

      // Verify system is still responsive after cache pressure
      const finalResponse = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authTokens[0]}`)
        .send({
          query: 'Final responsiveness test',
          conversationId: testConversations[0].id,
        })
        .expect(200);

      expect(finalResponse.body.response).toBeDefined();
    });
  });

  describe('Accuracy Performance', () => {
    it('should maintain response accuracy under load', async () => {
      const accuracyTestCases = [
        {
          query: 'What is a literature review?',
          expectedKeywords: ['literature', 'review', 'research', 'sources'],
          mockResponse: {
            answer:
              'A literature review is a comprehensive survey of scholarly sources on a specific topic.',
            score: 0.9,
          },
        },
        {
          query: 'How do I write a methodology section?',
          expectedKeywords: ['methodology', 'research', 'methods', 'approach'],
          mockResponse: {
            answer:
              'A methodology section describes the research methods and approaches used in your study.',
            score: 0.85,
          },
        },
        {
          query: 'What citation style should I use?',
          expectedKeywords: ['citation', 'style', 'APA', 'MLA', 'references'],
          mockResponse: {
            answer:
              'Common citation styles include APA, MLA, and Chicago, depending on your field.',
            score: 0.88,
          },
        },
      ];

      // Test accuracy under concurrent load
      const concurrentPromises = [];

      for (let i = 0; i < 15; i++) {
        // 5 requests per test case
        const testCase = accuracyTestCases[i % accuracyTestCases.length];
        const userIndex = i % testUsers.length;

        mockHfInference.questionAnswering.mockResolvedValueOnce(
          testCase.mockResponse,
        );

        const promise = request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[userIndex]}`)
          .send({
            query: testCase.query,
            conversationId: testConversations[userIndex].id,
          })
          .then((response) => ({
            response,
            testCase,
            userIndex,
          }));

        concurrentPromises.push(promise);
      }

      const results = await Promise.all(concurrentPromises);

      // Verify accuracy for all responses
      results.forEach(({ response, testCase }) => {
        expect(response.status).toBe(200);
        expect(response.body.confidenceScore).toBeGreaterThan(0.7);

        const responseText = response.body.response.toLowerCase();
        const keywordMatches = testCase.expectedKeywords.filter((keyword) =>
          responseText.includes(keyword.toLowerCase()),
        );

        // Should match at least 50% of expected keywords
        expect(keywordMatches.length).toBeGreaterThanOrEqual(
          testCase.expectedKeywords.length * 0.5,
        );
      });
    });

    it('should track accuracy metrics over time', async () => {
      const mockResponses = [
        {
          answer: 'High quality response with detailed information',
          score: 0.95,
        },
        { answer: 'Medium quality response', score: 0.7 },
        { answer: 'Lower quality response', score: 0.4 },
        { answer: 'Another high quality detailed response', score: 0.9 },
      ];

      const accuracyMetrics = [];

      for (let i = 0; i < mockResponses.length; i++) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          mockResponses[i],
        );

        const startTime = Date.now();
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            query: `Accuracy test query ${i}`,
            conversationId: testConversations[0].id,
          })
          .expect(200);
        const endTime = Date.now();

        accuracyMetrics.push({
          confidenceScore: response.body.confidenceScore,
          responseTime: endTime - startTime,
          responseLength: response.body.response.length,
          fromAI: response.body.fromAI,
        });
      }

      // Calculate average accuracy metrics
      const avgConfidence =
        accuracyMetrics.reduce((sum, m) => sum + m.confidenceScore, 0) /
        accuracyMetrics.length;
      const avgResponseTime =
        accuracyMetrics.reduce((sum, m) => sum + m.responseTime, 0) /
        accuracyMetrics.length;
      const aiResponseRate =
        accuracyMetrics.filter((m) => m.fromAI).length / accuracyMetrics.length;

      expect(avgConfidence).toBeGreaterThan(0.6); // Average confidence should be reasonable
      expect(avgResponseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS.AI_RESPONSE_TIME,
      );
      expect(aiResponseRate).toBeGreaterThan(0.5); // At least 50% should be AI responses

      console.log(
        `Accuracy metrics - Avg confidence: ${avgConfidence.toFixed(2)}, Avg response time: ${avgResponseTime.toFixed(0)}ms, AI response rate: ${(aiResponseRate * 100).toFixed(1)}%`,
      );
    });

    it('should maintain consistency across similar queries', async () => {
      const similarQueries = [
        'What is a literature review?',
        'Can you explain what a literature review is?',
        'How would you define a literature review?',
        'What does literature review mean?',
      ];

      const mockResponse = {
        answer:
          'A literature review is a comprehensive survey of scholarly sources on a specific topic.',
        score: 0.9,
      };

      const responses = [];

      for (const query of similarQueries) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[0]}`)
          .send({
            query,
            conversationId: testConversations[0].id,
          })
          .expect(200);

        responses.push(response.body);
      }

      // All responses should have similar confidence scores
      const confidenceScores = responses.map((r) => r.confidenceScore);
      const avgConfidence =
        confidenceScores.reduce((sum, score) => sum + score, 0) /
        confidenceScores.length;
      const confidenceVariance =
        confidenceScores.reduce(
          (sum, score) => sum + Math.pow(score - avgConfidence, 2),
          0,
        ) / confidenceScores.length;

      expect(confidenceVariance).toBeLessThan(0.1); // Low variance indicates consistency

      // All responses should contain similar key terms
      responses.forEach((response) => {
        expect(response.response.toLowerCase()).toContain('literature');
        expect(response.response.toLowerCase()).toContain('review');
      });
    });
  });

  describe('Resource Usage Optimization', () => {
    it('should optimize memory usage during extended sessions', async () => {
      const mockResponse = {
        answer: 'Memory optimization test response',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      const extendedSessionRequests = 50;
      const memoryUsageSnapshots = [];

      // Simulate extended session
      for (let i = 0; i < extendedSessionRequests; i++) {
        const userIndex = i % testUsers.length;

        const beforeMemory = process.memoryUsage();

        await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authTokens[userIndex]}`)
          .send({
            query: `Extended session query ${i}`,
            conversationId: testConversations[userIndex].id,
          })
          .expect(200);

        const afterMemory = process.memoryUsage();

        memoryUsageSnapshots.push({
          heapUsed: afterMemory.heapUsed - beforeMemory.heapUsed,
          heapTotal: afterMemory.heapTotal,
          external: afterMemory.external,
        });

        // Periodic garbage collection simulation
        if (i % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      // Memory usage should not grow excessively
      const initialHeap = memoryUsageSnapshots[0].heapTotal;
      const finalHeap =
        memoryUsageSnapshots[memoryUsageSnapshots.length - 1].heapTotal;
      const heapGrowthRatio = finalHeap / initialHeap;

      expect(heapGrowthRatio).toBeLessThan(2.0); // Heap should not double during session
    });

    it('should handle database connection pooling efficiently', async () => {
      const mockResponse = {
        answer: 'Database pooling test response',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      // Create many concurrent database-intensive requests
      const concurrentDbRequests = 20;
      const promises = [];

      for (let i = 0; i < concurrentDbRequests; i++) {
        const userIndex = i % testUsers.length;

        const promise = Promise.all([
          // Ask question (involves multiple DB queries)
          request(app.getHttpServer())
            .post('/ai-assistant/ask')
            .set('Authorization', `Bearer ${authTokens[userIndex]}`)
            .send({
              query: `Database pooling test ${i}`,
              conversationId: testConversations[userIndex].id,
            }),

          // Get conversation messages (DB query)
          request(app.getHttpServer())
            .get(
              `/ai-assistant/conversations/${testConversations[userIndex].id}/messages`,
            )
            .set('Authorization', `Bearer ${authTokens[userIndex]}`)
            .query({ limit: 10 }),

          // Get conversation context (DB query)
          request(app.getHttpServer())
            .get(
              `/ai-assistant/conversations/${testConversations[userIndex].id}/context`,
            )
            .set('Authorization', `Bearer ${authTokens[userIndex]}`),
        ]);

        promises.push(promise);
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // All requests should complete successfully
      results.forEach(([askResponse, messagesResponse, contextResponse]) => {
        expect(askResponse.status).toBe(200);
        expect(messagesResponse.status).toBe(200);
        expect(contextResponse.status).toBe(200);
      });

      // Should handle concurrent DB operations efficiently
      expect(totalTime).toBeLessThan(30000); // 30 seconds for all concurrent operations

      console.log(
        `Database pooling test: ${concurrentDbRequests * 3} concurrent queries completed in ${totalTime}ms`,
      );
    });
  });
});
