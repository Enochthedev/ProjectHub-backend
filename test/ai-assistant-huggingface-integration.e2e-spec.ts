import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { HuggingFaceService } from '../src/services/hugging-face.service';
import { AIRateLimiterService } from '../src/services/ai-rate-limiter.service';
import { CircuitBreakerService } from '../src/services/circuit-breaker.service';
import { AIResponseGenerationService } from '../src/services/ai-response-generation.service';
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

// Mock the @huggingface/inference module for controlled testing
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    featureExtraction: jest.fn(),
    questionAnswering: jest.fn(),
  })),
}));

describe('AI Assistant Hugging Face Integration (e2e)', () => {
  let app: INestApplication;
  let huggingFaceService: HuggingFaceService;
  let rateLimiterService: AIRateLimiterService;
  let circuitBreakerService: CircuitBreakerService;
  let responseGenerationService: AIResponseGenerationService;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let aiUsageRepository: Repository<AIApiUsage>;
  let projectRepository: Repository<Project>;
  let jwtService: JwtService;
  let configService: ConfigService;

  let testUser: User;
  let testProject: Project;
  let testConversation: Conversation;
  let authToken: string;
  let mockHfInference: any;

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
    circuitBreakerService = moduleFixture.get<CircuitBreakerService>(
      CircuitBreakerService,
    );
    responseGenerationService = moduleFixture.get<AIResponseGenerationService>(
      AIResponseGenerationService,
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
    configService = moduleFixture.get<ConfigService>(ConfigService);

    // Setup mock Hugging Face inference
    const { HfInference } = require('@huggingface/inference');
    mockHfInference = {
      featureExtraction: jest.fn(),
      questionAnswering: jest.fn(),
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

    // Reset mocks
    jest.clearAllMocks();

    // Create test user
    testUser = userRepository.create({
      email: 'test@example.com',
      password: 'hashedpassword',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
    testUser = await userRepository.save(testUser);

    // Create test project
    testProject = projectRepository.create({
      title: 'Machine Learning FYP',
      abstract: 'A machine learning final year project',
      supervisorId: testUser.id,
      specialization: 'Machine Learning & AI',
      technologyStack: ['Python', 'TensorFlow', 'Scikit-learn'],
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
    });
    testProject = await projectRepository.save(testProject);

    // Create test conversation
    testConversation = conversationRepository.create({
      title: 'ML Project Discussion',
      studentId: testUser.id,
      projectId: testProject.id,
      status: ConversationStatus.ACTIVE,
      language: 'en',
      context: {
        projectId: testProject.id,
        projectPhase: 'methodology',
        recentTopics: ['machine learning', 'data preprocessing'],
        keyTerms: ['neural networks', 'supervised learning'],
        conversationSummary: 'Discussion about ML methodology',
        lastActivity: new Date(),
        preferences: {
          language: 'en',
          responseStyle: 'academic',
          detailLevel: 'detailed',
        },
      },
      lastMessageAt: new Date(),
    });
    testConversation = await conversationRepository.save(testConversation);

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Hugging Face Q&A API Integration', () => {
    it('should successfully process Q&A request with proper API interaction', async () => {
      const mockQAResponse = {
        answer:
          'A literature review is a comprehensive survey of scholarly sources on a specific topic. It provides an overview of current knowledge, identifies gaps, and establishes the theoretical foundation for research.',
        score: 0.85,
        start: 0,
        end: 150,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockQAResponse);

      const askDto = {
        query: 'What is a literature review and why is it important for FYP?',
        conversationId: testConversation.id,
        language: 'en',
        includeProjectContext: true,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(response.body).toMatchObject({
        response: expect.stringContaining('literature review'),
        confidenceScore: 0.85,
        fromAI: true,
        conversationId: testConversation.id,
        sources: expect.arrayContaining(['AI Assistant']),
        metadata: expect.objectContaining({
          processingTime: expect.any(Number),
          aiModel: expect.any(String),
          language: 'en',
          category: expect.any(String),
        }),
      });

      // Verify Hugging Face API was called correctly
      expect(mockHfInference.questionAnswering).toHaveBeenCalledWith({
        model: expect.any(String),
        inputs: expect.objectContaining({
          question: askDto.query,
          context: expect.any(String),
        }),
      });

      // Verify usage tracking
      const usageRecords = await aiUsageRepository.find({
        where: { userId: testUser.id },
      });
      expect(usageRecords.length).toBeGreaterThan(0);
      expect(usageRecords[0]).toMatchObject({
        endpoint: '/question-answering',
        success: true,
        userId: testUser.id,
      });
    });

    it('should handle API timeout gracefully with fallback', async () => {
      // Mock timeout scenario
      mockHfInference.questionAnswering.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Request timeout after 15000ms')),
              100,
            ),
          ),
      );

      const askDto = {
        query: 'What is machine learning methodology?',
        conversationId: testConversation.id,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      // Should receive fallback response
      expect(response.body.fromAI).toBe(false);
      expect(response.body.escalationSuggestion).toBeDefined();
      expect(response.body.response).toContain('not able to provide');

      // Verify error was tracked
      const usageRecords = await aiUsageRepository.find({
        where: { userId: testUser.id, success: false },
      });
      expect(usageRecords.length).toBeGreaterThan(0);
      expect(usageRecords[0].errorMessage).toContain('timeout');
    });

    it('should retry failed requests with exponential backoff', async () => {
      const mockQAResponse = {
        answer: 'Machine learning is a subset of artificial intelligence...',
        score: 0.75,
      };

      // Fail first two attempts, succeed on third
      mockHfInference.questionAnswering
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Service unavailable'))
        .mockResolvedValueOnce(mockQAResponse);

      const askDto = {
        query: 'What is machine learning?',
        conversationId: testConversation.id,
      };

      const startTime = Date.now();
      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      const endTime = Date.now();

      expect(response.body.fromAI).toBe(true);
      expect(response.body.confidenceScore).toBe(0.75);

      // Should have taken time for retries (with exponential backoff)
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second for retries

      // Verify all attempts were made
      expect(mockHfInference.questionAnswering).toHaveBeenCalledTimes(3);
    });

    it('should handle different response formats correctly', async () => {
      const mockResponses = [
        { answer: 'Response 1', score: 0.8 },
        { answer: 'Response 2', score: 0.7, start: 10, end: 50 },
      ];

      for (const mockResponse of mockResponses) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(mockResponse);

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Test question',
            conversationId: testConversation.id,
          })
          .expect(200);

        expect(response.body.confidenceScore).toBe(mockResponse.score);
        expect(response.body.response).toContain(mockResponse.answer);
      }
    });

    it('should truncate long contexts to fit token limits', async () => {
      const longContext = 'A'.repeat(5000); // Very long context

      // Create conversation with long context
      const longConversation = conversationRepository.create({
        title: 'Long Context Test',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        context: {
          conversationSummary: longContext,
          recentTopics: ['very', 'long', 'topic', 'list'],
          keyTerms: Array(100).fill('term'),
        },
        lastMessageAt: new Date(),
      });
      await conversationRepository.save(longConversation);

      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Truncated context response',
        score: 0.6,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test with long context',
          conversationId: longConversation.id,
        })
        .expect(200);

      expect(response.body.response).toBeDefined();

      // Verify the context was truncated in the API call
      const apiCall = mockHfInference.questionAnswering.mock.calls[0][0];
      expect(apiCall.inputs.context.length).toBeLessThan(longContext.length);
    });

    it('should validate response confidence and provide appropriate feedback', async () => {
      const lowConfidenceResponse = {
        answer: 'Uncertain answer',
        score: 0.15, // Below threshold
      };

      mockHfInference.questionAnswering.mockResolvedValue(
        lowConfidenceResponse,
      );

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Very ambiguous question about something unclear?',
          conversationId: testConversation.id,
        })
        .expect(200);

      // Should fall back to template response due to low confidence
      expect(response.body.fromAI).toBe(false);
      expect(response.body.escalationSuggestion).toBeDefined();
      expect(response.body.metadata.requiresHumanReview).toBe(true);
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce per-minute rate limits', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Test response',
        score: 0.8,
      });

      const rateLimitPerMinute =
        configService.get<number>('huggingFace.rateLimitPerMinute') || 10;

      // Make requests up to the limit
      for (let i = 0; i < rateLimitPerMinute; i++) {
        await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Test question ${i}`,
            conversationId: testConversation.id,
          })
          .expect(200);
      }

      // Next request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Rate limited question',
          conversationId: testConversation.id,
        })
        .expect(429);

      expect(response.body.message).toContain('Rate limit exceeded');
      expect(response.body.remainingRequests).toBe(0);
    });

    it('should track detailed API usage metrics', async () => {
      mockHfInference.questionAnswering.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  answer: 'Delayed response for metrics test',
                  score: 0.9,
                }),
              200,
            ),
          ),
      );

      const startTime = Date.now();
      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test question for metrics',
          conversationId: testConversation.id,
        })
        .expect(200);

      const endTime = Date.now();

      // Verify usage was tracked with accurate metrics
      const usageRecord = await aiUsageRepository.findOne({
        where: { userId: testUser.id },
        order: { createdAt: 'DESC' },
      });

      expect(usageRecord).toMatchObject({
        endpoint: '/question-answering',
        success: true,
        userId: testUser.id,
        tokensUsed: expect.any(Number),
        responseTimeMs: expect.any(Number),
      });

      expect(usageRecord.responseTimeMs).toBeGreaterThanOrEqual(200);
      expect(usageRecord.responseTimeMs).toBeLessThan(
        endTime - startTime + 100,
      ); // Allow some margin
      expect(usageRecord.tokensUsed).toBeGreaterThan(0);
    });

    it('should provide comprehensive usage statistics', async () => {
      // Create some usage history
      const usageData = [
        { tokensUsed: 100, responseTimeMs: 500, success: true },
        { tokensUsed: 150, responseTimeMs: 600, success: true },
        { tokensUsed: 75, responseTimeMs: 400, success: false },
      ];

      for (const usage of usageData) {
        const record = aiUsageRepository.create({
          ...usage,
          userId: testUser.id,
          endpoint: '/question-answering',
          model: 'test-model',
          errorMessage: usage.success ? null : 'Test error',
        });
        await aiUsageRepository.save(record);
      }

      const stats = await rateLimiterService.getUsageStats(testUser.id);

      expect(stats).toMatchObject({
        totalRequests: 3,
        successfulRequests: 2,
        failedRequests: 1,
        totalTokens: 325,
        averageResponseTime: 500,
        successRate: expect.closeTo(66.67, 0.1),
      });
    });
  });

  describe('Circuit Breaker Integration', () => {
    it('should protect against cascading failures', async () => {
      const failingFunction = jest
        .fn()
        .mockRejectedValue(new Error('Service unavailable'));

      // Trigger circuit breaker to open (5 failures)
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('test-service', failingFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit should be open
      const status = circuitBreakerService.getStatus('test-service');
      expect(status.state).toBe('OPEN');

      // Next call should be rejected immediately
      await expect(
        circuitBreakerService.execute('test-service', failingFunction),
      ).rejects.toThrow('Circuit breaker is OPEN');

      // Function should only have been called 5 times (not 6)
      expect(failingFunction).toHaveBeenCalledTimes(5);
    });

    it('should handle AI service failures with circuit breaker', async () => {
      // Mock consecutive failures
      mockHfInference.questionAnswering.mockRejectedValue(
        new Error('AI service down'),
      );

      // Make multiple requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Failing question ${i}`,
            conversationId: testConversation.id,
          })
          .expect(200); // Should still return 200 with fallback

        expect(response.body.fromAI).toBe(false);
        expect(response.body.escalationSuggestion).toBeDefined();
      }

      // Verify circuit breaker status
      const status = circuitBreakerService.getStatus('hugging-face-qa');
      expect(status.failureCount).toBeGreaterThan(0);
    });

    it('should recover when service becomes available', async () => {
      jest.useFakeTimers();

      const mockFunction = jest.fn();

      // Trigger circuit to open
      mockFunction.mockRejectedValue(new Error('Service error'));
      for (let i = 0; i < 5; i++) {
        try {
          await circuitBreakerService.execute('recovery-test', mockFunction);
        } catch (error) {
          // Expected to fail
        }
      }

      expect(circuitBreakerService.getStatus('recovery-test').state).toBe(
        'OPEN',
      );

      // Fast forward past recovery timeout
      jest.advanceTimersByTime(61000);

      // Function succeeds, circuit should close
      mockFunction.mockResolvedValueOnce('success');
      const result = await circuitBreakerService.execute(
        'recovery-test',
        mockFunction,
      );

      expect(result).toBe('success');
      expect(circuitBreakerService.getStatus('recovery-test').state).toBe(
        'CLOSED',
      );

      jest.useRealTimers();
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle concurrent Q&A requests efficiently', async () => {
      const mockResponse = {
        answer: 'Concurrent response',
        score: 0.8,
      };

      mockHfInference.questionAnswering.mockResolvedValue(mockResponse);

      const concurrentRequests = 5;
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Concurrent question ${i}`,
            conversationId: testConversation.id,
          }),
      );

      const startTime = Date.now();
      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.response).toBeDefined();
      });

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max

      // Verify all API calls were made
      expect(mockHfInference.questionAnswering).toHaveBeenCalledTimes(
        concurrentRequests,
      );
    });

    it('should maintain performance under batch processing', async () => {
      const mockResponse = {
        answer: 'Batch processing response',
        score: 0.7,
      };

      mockHfInference.questionAnswering.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockResponse), 100),
          ),
      );

      const batchSize = 10;
      const startTime = Date.now();

      // Process batch of requests sequentially
      for (let i = 0; i < batchSize; i++) {
        await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Batch question ${i}`,
            conversationId: testConversation.id,
          })
          .expect(200);
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should process efficiently (allowing for overhead)
      expect(totalTime).toBeLessThan(batchSize * 200); // Max 200ms per request including overhead

      // Verify usage tracking for all requests
      const usageRecords = await aiUsageRepository.find({
        where: { userId: testUser.id },
      });
      expect(usageRecords.length).toBe(batchSize);
    });

    it('should track accurate performance metrics', async () => {
      const processingDelay = 150;
      mockHfInference.questionAnswering.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  answer: 'Performance test response',
                  score: 0.85,
                }),
              processingDelay,
            ),
          ),
      );

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Performance test question',
          conversationId: testConversation.id,
        })
        .expect(200);

      expect(response.body.metadata.processingTime).toBeGreaterThanOrEqual(
        processingDelay,
      );

      // Verify database tracking
      const usageRecord = await aiUsageRepository.findOne({
        where: { userId: testUser.id },
        order: { createdAt: 'DESC' },
      });

      expect(usageRecord.responseTimeMs).toBeGreaterThanOrEqual(
        processingDelay,
      );
      expect(usageRecord.success).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary network failures', async () => {
      const mockResponse = {
        answer: 'Recovery test response',
        score: 0.8,
      };

      // First call fails, second succeeds
      mockHfInference.questionAnswering
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Recovery test question',
          conversationId: testConversation.id,
        })
        .expect(200);

      expect(response.body.fromAI).toBe(true);
      expect(response.body.response).toContain('Recovery test response');

      // Verify retry was attempted
      expect(mockHfInference.questionAnswering).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed API responses gracefully', async () => {
      // Return invalid response format
      mockHfInference.questionAnswering.mockResolvedValue({
        invalid: 'response',
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test malformed response',
          conversationId: testConversation.id,
        })
        .expect(200);

      // Should fall back to template response
      expect(response.body.fromAI).toBe(false);
      expect(response.body.escalationSuggestion).toBeDefined();

      // Verify error was tracked
      const usageRecord = await aiUsageRepository.findOne({
        where: { userId: testUser.id, success: false },
        order: { createdAt: 'DESC' },
      });
      expect(usageRecord).toBeDefined();
      expect(usageRecord.errorMessage).toContain('Invalid response format');
    });

    it('should handle service unavailable scenarios', async () => {
      mockHfInference.questionAnswering.mockRejectedValue(
        new Error('Service unavailable'),
      );

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Service unavailable test',
          conversationId: testConversation.id,
        })
        .expect(200);

      // Should provide fallback response
      expect(response.body.fromAI).toBe(false);
      expect(response.body.response).toContain('not able to provide');
      expect(response.body.escalationSuggestion).toContain('supervisor');
      expect(response.body.suggestedFollowUps).toBeInstanceOf(Array);
    });
  });

  describe('End-to-End Conversation Workflows', () => {
    it('should complete full conversation workflow with context maintenance', async () => {
      const qaResponses = [
        {
          answer:
            'A literature review surveys existing research on your topic.',
          score: 0.9,
        },
        {
          answer: 'You should include recent papers from the last 5-10 years.',
          score: 0.85,
        },
        {
          answer:
            'Organize by themes or chronologically based on your research.',
          score: 0.8,
        },
      ];

      const questions = [
        'What is a literature review?',
        'How recent should the papers be?',
        'How should I organize my review?',
      ];

      // Process conversation with context building
      for (let i = 0; i < questions.length; i++) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(qaResponses[i]);

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: questions[i],
            conversationId: testConversation.id,
            includeProjectContext: true,
          })
          .expect(200);

        expect(response.body.fromAI).toBe(true);
        expect(response.body.conversationId).toBe(testConversation.id);
        expect(response.body.contextUsed.projectInfo).toBe(true);

        // Later questions should have conversation history context
        if (i > 0) {
          expect(response.body.contextUsed.conversationHistory).toBe(true);
        }
      }

      // Verify conversation was updated with context
      const updatedConversation = await conversationRepository.findOne({
        where: { id: testConversation.id },
      });
      expect(updatedConversation.lastMessageAt).toBeDefined();

      // Verify messages were created
      const messages = await messageRepository.find({
        where: { conversationId: testConversation.id },
        order: { createdAt: 'ASC' },
      });
      expect(messages.length).toBe(questions.length * 2); // Question + response for each
    });

    it('should handle multilingual conversation workflow', async () => {
      const multilingualResponses = [
        {
          answer: 'Una revisión de literatura es un análisis comprensivo...',
          score: 0.8,
        },
        {
          answer: 'Une revue de littérature est une analyse complète...',
          score: 0.75,
        },
      ];

      const multilingualQuestions = [
        { query: '¿Qué es una revisión de literatura?', language: 'es' },
        { query: "Qu'est-ce qu'une revue de littérature?", language: 'fr' },
      ];

      for (let i = 0; i < multilingualQuestions.length; i++) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          multilingualResponses[i],
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            ...multilingualQuestions[i],
            conversationId: testConversation.id,
          })
          .expect(200);

        expect(response.body.metadata.language).toBe(
          multilingualQuestions[i].language,
        );
        expect(response.body.fromAI).toBe(true);
      }
    });

    it('should integrate project context effectively', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer:
          'For machine learning projects, focus on data quality, model selection, and evaluation metrics.',
        score: 0.9,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What should I focus on in my methodology?',
          conversationId: testConversation.id,
          includeProjectContext: true,
        })
        .expect(200);

      expect(response.body.contextUsed.projectInfo).toBe(true);
      expect(response.body.sources).toContain('Project Context');

      // Verify project-specific context was included in API call
      const apiCall = mockHfInference.questionAnswering.mock.calls[0][0];
      expect(apiCall.inputs.context).toContain('Machine Learning FYP');
      expect(apiCall.inputs.context).toContain('TensorFlow');
    });
  });
});
