import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { ConversationService } from '../src/services/conversation.service';
import { ContextService } from '../src/services/context.service';
import { LanguageDetectionService } from '../src/services/language-detection.service';
import { ResponseLocalizationService } from '../src/services/response-localization.service';
import { MultilingualKnowledgeBaseService } from '../src/services/multilingual-knowledge-base.service';
import { User } from '../src/entities/user.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { ConversationMessage } from '../src/entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../src/entities/knowledge-base-entry.entity';
import { Project } from '../src/entities/project.entity';
import { MessageRating } from '../src/entities/message-rating.entity';
import {
  UserRole,
  ConversationStatus,
  MessageType,
  MessageStatus,
  ContentType,
  DifficultyLevel,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

// Mock external services for controlled testing
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    questionAnswering: jest.fn(),
    featureExtraction: jest.fn(),
  })),
}));

describe('AI Assistant Conversation Quality Validation (e2e)', () => {
  let app: INestApplication;
  let conversationService: ConversationService;
  let contextService: ContextService;
  let languageDetectionService: LanguageDetectionService;
  let responseLocalizationService: ResponseLocalizationService;
  let multilingualKnowledgeService: MultilingualKnowledgeBaseService;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let knowledgeRepository: Repository<KnowledgeBaseEntry>;
  let projectRepository: Repository<Project>;
  let ratingRepository: Repository<MessageRating>;
  let jwtService: JwtService;

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

    conversationService =
      moduleFixture.get<ConversationService>(ConversationService);
    contextService = moduleFixture.get<ContextService>(ContextService);
    languageDetectionService = moduleFixture.get<LanguageDetectionService>(
      LanguageDetectionService,
    );
    responseLocalizationService =
      moduleFixture.get<ResponseLocalizationService>(
        ResponseLocalizationService,
      );
    multilingualKnowledgeService =
      moduleFixture.get<MultilingualKnowledgeBaseService>(
        MultilingualKnowledgeBaseService,
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
    knowledgeRepository = moduleFixture.get<Repository<KnowledgeBaseEntry>>(
      getRepositoryToken(KnowledgeBaseEntry),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    ratingRepository = moduleFixture.get<Repository<MessageRating>>(
      getRepositoryToken(MessageRating),
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
    await ratingRepository.delete({});
    await messageRepository.delete({});
    await conversationRepository.delete({});
    await knowledgeRepository.delete({});
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
      title: 'Multilingual NLP Project',
      abstract:
        'A natural language processing project with multilingual support',
      supervisorId: testUser.id,
      specialization: 'Natural Language Processing',
      technologyStack: ['Python', 'NLTK', 'spaCy', 'Transformers'],
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
    });
    testProject = await projectRepository.save(testProject);

    // Create multilingual knowledge base entries
    const knowledgeEntries = [
      {
        title: 'Literature Review Guidelines',
        content:
          'A literature review is a comprehensive survey of scholarly sources on a specific topic. It provides an overview of current knowledge, identifies gaps, and establishes the theoretical foundation for research.',
        category: 'methodology',
        tags: ['literature_review', 'research', 'methodology'],
        keywords: ['literature', 'review', 'research', 'methodology', 'survey'],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },
      {
        title: 'Guías de Revisión de Literatura',
        content:
          'Una revisión de literatura es un análisis comprensivo de fuentes académicas sobre un tema específico. Proporciona una visión general del conocimiento actual, identifica brechas y establece la base teórica para la investigación.',
        category: 'methodology',
        tags: ['revision_literatura', 'investigacion', 'metodologia'],
        keywords: [
          'literatura',
          'revision',
          'investigacion',
          'metodologia',
          'analisis',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'es',
      },
      {
        title: 'Directives de Revue de Littérature',
        content:
          'Une revue de littérature est une analyse complète des sources académiques sur un sujet spécifique. Elle fournit un aperçu des connaissances actuelles, identifie les lacunes et établit la base théorique pour la recherche.',
        category: 'methodology',
        tags: ['revue_litterature', 'recherche', 'methodologie'],
        keywords: [
          'litterature',
          'revue',
          'recherche',
          'methodologie',
          'analyse',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'fr',
      },
    ];

    for (const entry of knowledgeEntries) {
      const knowledgeEntry = knowledgeRepository.create({
        ...entry,
        createdById: testUser.id,
      });
      await knowledgeRepository.save(knowledgeEntry);
    }

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Conversation Context Maintenance and Accuracy', () => {
    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Context Maintenance Test',
        studentId: testUser.id,
        projectId: testProject.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        context: {
          projectId: testProject.id,
          projectPhase: 'literature_review',
          recentTopics: [],
          keyTerms: [],
          conversationSummary: '',
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
    });

    it('should maintain conversation context across multiple interactions', async () => {
      mockHfInference.questionAnswering.mockImplementation((params) => {
        const context = params.inputs.context;
        return Promise.resolve({
          answer: `Based on the context about ${context.includes('literature review') ? 'literature review' : 'your question'}, here is the response.`,
          score: 0.85,
        });
      });

      const conversationFlow = [
        {
          query: 'What is a literature review?',
          expectedContextTopics: [],
        },
        {
          query: 'How do I structure it?',
          expectedContextTopics: ['literature review'],
        },
        {
          query: 'What about citation styles?',
          expectedContextTopics: ['literature review', 'structure'],
        },
        {
          query: 'Should I include recent papers?',
          expectedContextTopics: ['literature review', 'structure', 'citation'],
        },
      ];

      for (let i = 0; i < conversationFlow.length; i++) {
        const { query, expectedContextTopics } = conversationFlow[i];

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query,
            conversationId: testConversation.id,
            includeConversationHistory: true,
          })
          .expect(200);

        expect(response.body.contextUsed.conversationHistory).toBe(i > 0);
        expect(response.body.response).toBeDefined();

        // Verify context was built correctly
        if (i > 0) {
          const apiCall = mockHfInference.questionAnswering.mock.calls[i][0];
          const contextString = apiCall.inputs.context;

          // Should contain previous topics
          expectedContextTopics.forEach((topic) => {
            expect(contextString.toLowerCase()).toContain(topic.toLowerCase());
          });
        }
      }

      // Verify conversation context was updated
      const updatedConversation = await conversationRepository.findOne({
        where: { id: testConversation.id },
      });

      expect(updatedConversation.context.recentTopics).toContain(
        'literature review',
      );
      expect(updatedConversation.context.keyTerms.length).toBeGreaterThan(0);
      expect(updatedConversation.context.conversationSummary).toBeDefined();
    });

    it('should accurately summarize conversation history', async () => {
      // Create a conversation with multiple messages
      const messages = [
        { type: MessageType.USER_QUERY, content: 'What is machine learning?' },
        {
          type: MessageType.AI_RESPONSE,
          content:
            'Machine learning is a subset of AI that enables computers to learn from data.',
        },
        { type: MessageType.USER_QUERY, content: 'What are the main types?' },
        {
          type: MessageType.AI_RESPONSE,
          content:
            'The main types are supervised, unsupervised, and reinforcement learning.',
        },
        {
          type: MessageType.USER_QUERY,
          content: 'Which should I use for my project?',
        },
        {
          type: MessageType.AI_RESPONSE,
          content:
            'For your NLP project, supervised learning would be most appropriate.',
        },
      ];

      for (const msg of messages) {
        const message = messageRepository.create({
          conversationId: testConversation.id,
          type: msg.type,
          content: msg.content,
          status: MessageStatus.DELIVERED,
        });
        await messageRepository.save(message);
      }

      // Build context and verify summary accuracy
      const context = await contextService.buildConversationContext(
        testConversation.id,
      );

      expect(context.recentTopics).toContain('machine learning');
      expect(context.keyTerms).toContain('supervised learning');
      expect(context.conversationSummary).toContain('machine learning');
      expect(context.conversationSummary).toContain('NLP project');
    });

    it('should maintain context window limits effectively', async () => {
      // Create a long conversation exceeding context window
      const longConversation = conversationRepository.create({
        title: 'Long Context Test',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      await conversationRepository.save(longConversation);

      // Create many messages
      for (let i = 0; i < 20; i++) {
        const userMessage = messageRepository.create({
          conversationId: longConversation.id,
          type: MessageType.USER_QUERY,
          content: `Question ${i}: What about topic ${i}?`,
          status: MessageStatus.DELIVERED,
        });
        await messageRepository.save(userMessage);

        const aiMessage = messageRepository.create({
          conversationId: longConversation.id,
          type: MessageType.AI_RESPONSE,
          content: `Response ${i}: Here's information about topic ${i}.`,
          status: MessageStatus.DELIVERED,
        });
        await messageRepository.save(aiMessage);
      }

      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Context window test response',
        score: 0.8,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Final question about the context',
          conversationId: longConversation.id,
          includeConversationHistory: true,
        })
        .expect(200);

      // Verify context was limited appropriately
      const apiCall = mockHfInference.questionAnswering.mock.calls[0][0];
      const contextLength = apiCall.inputs.context.length;

      // Should not exceed reasonable context length
      expect(contextLength).toBeLessThan(5000); // Reasonable limit

      // Should still contain recent information
      expect(apiCall.inputs.context).toContain('topic 19');
    });

    it('should handle context corruption gracefully', async () => {
      // Create conversation with corrupted context
      const corruptedConversation = conversationRepository.create({
        title: 'Corrupted Context Test',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        context: {
          // Intentionally malformed context
          recentTopics: null,
          keyTerms: undefined,
          conversationSummary: '',
          lastActivity: null,
        },
        lastMessageAt: new Date(),
      });
      await conversationRepository.save(corruptedConversation);

      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Graceful handling of corrupted context',
        score: 0.7,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Test with corrupted context',
          conversationId: corruptedConversation.id,
        })
        .expect(200);

      expect(response.body.response).toBeDefined();
      expect(response.body.fromAI).toBe(true);
    });
  });

  describe('Response Quality and Relevance Validation', () => {
    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Quality Validation Test',
        studentId: testUser.id,
        projectId: testProject.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);
    });

    it('should validate response relevance to query', async () => {
      const testCases = [
        {
          query: 'What is a literature review?',
          mockResponse: {
            answer:
              'A literature review is a comprehensive survey of scholarly sources.',
            score: 0.9,
          },
          expectedRelevant: true,
        },
        {
          query: 'How do I write a methodology section?',
          mockResponse: {
            answer: 'The weather is nice today.',
            score: 0.1,
          },
          expectedRelevant: false,
        },
        {
          query: 'What citation style should I use?',
          mockResponse: {
            answer: 'Common citation styles include APA, MLA, and Chicago.',
            score: 0.85,
          },
          expectedRelevant: true,
        },
      ];

      for (const testCase of testCases) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          testCase.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: testCase.query,
            conversationId: testConversation.id,
          })
          .expect(200);

        if (testCase.expectedRelevant) {
          expect(response.body.fromAI).toBe(true);
          expect(response.body.confidenceScore).toBeGreaterThan(0.3);
        } else {
          expect(response.body.fromAI).toBe(false);
          expect(response.body.escalationSuggestion).toBeDefined();
        }
      }
    });

    it('should assess response quality based on multiple factors', async () => {
      const qualityTestCases = [
        {
          name: 'High Quality Response',
          mockResponse: {
            answer:
              'A literature review systematically examines existing research to identify gaps, establish context, and provide theoretical foundation for your study. It should be comprehensive, critical, and well-organized.',
            score: 0.92,
          },
          expectedQuality: 'high',
        },
        {
          name: 'Medium Quality Response',
          mockResponse: {
            answer: 'Literature review looks at other research.',
            score: 0.65,
          },
          expectedQuality: 'medium',
        },
        {
          name: 'Low Quality Response',
          mockResponse: {
            answer: 'Yes.',
            score: 0.2,
          },
          expectedQuality: 'low',
        },
      ];

      for (const testCase of qualityTestCases) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          testCase.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'What is a literature review?',
            conversationId: testConversation.id,
          })
          .expect(200);

        switch (testCase.expectedQuality) {
          case 'high':
            expect(response.body.fromAI).toBe(true);
            expect(response.body.confidenceScore).toBeGreaterThan(0.8);
            expect(response.body.metadata.requiresHumanReview).toBe(false);
            break;
          case 'medium':
            expect(response.body.fromAI).toBe(true);
            expect(response.body.confidenceScore).toBeGreaterThan(0.3);
            expect(response.body.confidenceScore).toBeLessThan(0.8);
            break;
          case 'low':
            expect(response.body.fromAI).toBe(false);
            expect(response.body.escalationSuggestion).toBeDefined();
            break;
        }
      }
    });

    it('should validate academic appropriateness of responses', async () => {
      const academicTestCases = [
        {
          query: 'What is the best research methodology?',
          mockResponse: {
            answer:
              'The choice of research methodology depends on your research questions, objectives, and the nature of your study. Quantitative methods are suitable for testing hypotheses, while qualitative methods are better for exploratory research.',
            score: 0.88,
          },
          expectedAcademic: true,
        },
        {
          query: 'How do I analyze data?',
          mockResponse: {
            answer: 'Just use whatever software you like and make some charts.',
            score: 0.4,
          },
          expectedAcademic: false,
        },
      ];

      for (const testCase of academicTestCases) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          testCase.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: testCase.query,
            conversationId: testConversation.id,
          })
          .expect(200);

        if (testCase.expectedAcademic) {
          expect(response.body.response).toMatch(
            /research|methodology|analysis|study/i,
          );
          expect(response.body.sources).toContain('AI Assistant');
        } else {
          // Should either provide better response or escalate
          if (response.body.fromAI) {
            expect(response.body.response.length).toBeGreaterThan(
              testCase.mockResponse.answer.length,
            );
          } else {
            expect(response.body.escalationSuggestion).toBeDefined();
          }
        }
      }
    });

    it('should track and learn from response ratings', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'A comprehensive response about research methodology.',
        score: 0.8,
      });

      // Ask question and get response
      const askResponse = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What is research methodology?',
          conversationId: testConversation.id,
        })
        .expect(200);

      // Find the created message
      const message = await messageRepository.findOne({
        where: {
          conversationId: testConversation.id,
          type: MessageType.AI_RESPONSE,
        },
        order: { createdAt: 'DESC' },
      });

      expect(message).toBeDefined();

      // Rate the response
      const ratingResponse = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${message.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rating: 4.5,
          feedback: 'Very helpful and comprehensive response',
        })
        .expect(200);

      expect(ratingResponse.body.averageRating).toBe(4.5);

      // Verify rating was stored for learning
      const rating = await ratingRepository.findOne({
        where: { messageId: message.id },
      });

      expect(rating).toMatchObject({
        rating: 4.5,
        feedback: 'Very helpful and comprehensive response',
        userId: testUser.id,
      });
    });
  });

  describe('Multilingual Support and Translation Quality', () => {
    it('should detect language accurately', async () => {
      const languageTestCases = [
        { text: 'What is a literature review?', expectedLanguage: 'en' },
        { text: '¿Qué es una revisión de literatura?', expectedLanguage: 'es' },
        {
          text: "Qu'est-ce qu'une revue de littérature?",
          expectedLanguage: 'fr',
        },
        { text: 'Was ist eine Literaturübersicht?', expectedLanguage: 'de' },
        { text: 'O que é uma revisão de literatura?', expectedLanguage: 'pt' },
      ];

      for (const testCase of languageTestCases) {
        const detectedLanguage = await languageDetectionService.detectLanguage(
          testCase.text,
        );
        expect(detectedLanguage).toBe(testCase.expectedLanguage);
      }
    });

    it('should provide responses in detected language', async () => {
      const multilingualTestCases = [
        {
          query: '¿Qué es una revisión de literatura?',
          language: 'es',
          mockResponse: {
            answer:
              'Una revisión de literatura es un análisis comprensivo de fuentes académicas.',
            score: 0.85,
          },
        },
        {
          query: "Qu'est-ce qu'une revue de littérature?",
          language: 'fr',
          mockResponse: {
            answer:
              'Une revue de littérature est une analyse complète des sources académiques.',
            score: 0.8,
          },
        },
      ];

      for (const testCase of multilingualTestCases) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          testCase.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: testCase.query,
            language: testCase.language,
            conversationId: testConversation.id,
          })
          .expect(200);

        expect(response.body.metadata.language).toBe(testCase.language);
        expect(response.body.response).toContain(testCase.mockResponse.answer);
      }
    });

    it('should maintain translation quality across languages', async () => {
      // Test translation quality by comparing key concepts
      const conceptTestCases = [
        {
          concept: 'literature review',
          languages: {
            en: 'literature review',
            es: 'revisión de literatura',
            fr: 'revue de littérature',
          },
        },
        {
          concept: 'research methodology',
          languages: {
            en: 'research methodology',
            es: 'metodología de investigación',
            fr: 'méthodologie de recherche',
          },
        },
      ];

      for (const testCase of conceptTestCases) {
        for (const [lang, term] of Object.entries(testCase.languages)) {
          const knowledgeEntries =
            await multilingualKnowledgeService.searchByLanguage(term, lang);

          expect(knowledgeEntries.length).toBeGreaterThan(0);
          expect(knowledgeEntries[0].language).toBe(lang);
          expect(knowledgeEntries[0].content.toLowerCase()).toContain(
            term.toLowerCase(),
          );
        }
      }
    });

    it('should handle mixed-language conversations', async () => {
      const mixedLanguageFlow = [
        {
          query: 'What is a literature review?',
          language: 'en',
          mockResponse: { answer: 'A literature review is...', score: 0.9 },
        },
        {
          query: '¿Puedes explicarlo en español?',
          language: 'es',
          mockResponse: {
            answer: 'Una revisión de literatura es...',
            score: 0.85,
          },
        },
        {
          query: 'How long should it be?',
          language: 'en',
          mockResponse: { answer: 'The length depends on...', score: 0.8 },
        },
      ];

      for (const step of mixedLanguageFlow) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          step.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: step.query,
            conversationId: testConversation.id,
          })
          .expect(200);

        expect(response.body.metadata.language).toBe(step.language);
        expect(response.body.contextUsed.conversationHistory).toBe(true);
      }

      // Verify conversation maintained multilingual context
      const updatedConversation = await conversationRepository.findOne({
        where: { id: testConversation.id },
      });

      expect(updatedConversation.context.recentTopics).toContain(
        'literature review',
      );
    });

    it('should validate translation accuracy for technical terms', async () => {
      const technicalTerms = [
        {
          en: 'hypothesis',
          es: 'hipótesis',
          fr: 'hypothèse',
        },
        {
          en: 'methodology',
          es: 'metodología',
          fr: 'méthodologie',
        },
        {
          en: 'analysis',
          es: 'análisis',
          fr: 'analyse',
        },
      ];

      for (const termSet of technicalTerms) {
        // Test English to Spanish
        const esTranslation =
          await responseLocalizationService.translateTechnicalTerm(
            termSet.en,
            'en',
            'es',
          );
        expect(esTranslation.toLowerCase()).toBe(termSet.es.toLowerCase());

        // Test English to French
        const frTranslation =
          await responseLocalizationService.translateTechnicalTerm(
            termSet.en,
            'en',
            'fr',
          );
        expect(frTranslation.toLowerCase()).toBe(termSet.fr.toLowerCase());
      }
    });

    it('should handle unsupported languages gracefully', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Default English response for unsupported language',
        score: 0.7,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'こんにちは、文献レビューとは何ですか？', // Japanese
          conversationId: testConversation.id,
        })
        .expect(200);

      // Should default to English with language disclaimer
      expect(response.body.metadata.language).toBe('en');
      expect(response.body.response).toContain('English');
      expect(response.body.escalationSuggestion).toContain('language');
    });
  });

  describe('User Experience and Conversation Flow', () => {
    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'UX Flow Test',
        studentId: testUser.id,
        projectId: testProject.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);
    });

    it('should provide helpful follow-up suggestions', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer:
          'A literature review systematically examines existing research.',
        score: 0.9,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What is a literature review?',
          conversationId: testConversation.id,
        })
        .expect(200);

      expect(response.body.suggestedFollowUps).toBeInstanceOf(Array);
      expect(response.body.suggestedFollowUps.length).toBeGreaterThan(0);
      expect(response.body.suggestedFollowUps).toContain(
        expect.stringMatching(/example|structure|how/i),
      );
    });

    it('should maintain conversation flow coherence', async () => {
      const conversationFlow = [
        {
          query: 'I need help with my literature review',
          mockResponse: {
            answer:
              'I can help you with your literature review. What specific aspect would you like to know about?',
            score: 0.9,
          },
        },
        {
          query: 'How do I find relevant sources?',
          mockResponse: {
            answer:
              'You can find relevant sources through academic databases, library catalogs, and citation tracking.',
            score: 0.85,
          },
        },
        {
          query: 'What about organizing them?',
          mockResponse: {
            answer:
              'Organize your sources thematically, chronologically, or by methodology depending on your research focus.',
            score: 0.8,
          },
        },
      ];

      for (let i = 0; i < conversationFlow.length; i++) {
        const step = conversationFlow[i];
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          step.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: step.query,
            conversationId: testConversation.id,
          })
          .expect(200);

        expect(response.body.response).toBeDefined();

        // Later responses should reference earlier context
        if (i > 0) {
          expect(response.body.contextUsed.conversationHistory).toBe(true);
        }
      }
    });

    it('should handle conversation interruptions gracefully', async () => {
      // Start conversation about literature review
      mockHfInference.questionAnswering.mockResolvedValueOnce({
        answer: 'A literature review examines existing research.',
        score: 0.9,
      });

      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What is a literature review?',
          conversationId: testConversation.id,
        })
        .expect(200);

      // Suddenly switch to completely different topic
      mockHfInference.questionAnswering.mockResolvedValueOnce({
        answer:
          'Data analysis involves examining and interpreting data to draw conclusions.',
        score: 0.85,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'How do I analyze my data?',
          conversationId: testConversation.id,
        })
        .expect(200);

      expect(response.body.response).toBeDefined();
      expect(response.body.fromAI).toBe(true);

      // Should still maintain some context but adapt to new topic
      expect(response.body.contextUsed.conversationHistory).toBe(true);
    });

    it('should provide appropriate escalation paths', async () => {
      const escalationScenarios = [
        {
          query: "I'm having a personal crisis and can't focus on my project",
          mockResponse: {
            answer: "I understand you're going through difficulties.",
            score: 0.3,
          },
          expectEscalation: true,
          escalationType: 'counseling',
        },
        {
          query: 'My supervisor is not responding to my emails for weeks',
          mockResponse: {
            answer: 'Communication issues with supervisors can be challenging.',
            score: 0.4,
          },
          expectEscalation: true,
          escalationType: 'academic',
        },
        {
          query: 'What is the deadline for project submission?',
          mockResponse: {
            answer: "I don't have access to specific institutional deadlines.",
            score: 0.2,
          },
          expectEscalation: true,
          escalationType: 'administrative',
        },
      ];

      for (const scenario of escalationScenarios) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          scenario.mockResponse,
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: scenario.query,
            conversationId: testConversation.id,
          })
          .expect(200);

        if (scenario.expectEscalation) {
          expect(response.body.escalationSuggestion).toBeDefined();
          expect(response.body.escalationSuggestion.toLowerCase()).toContain(
            scenario.escalationType,
          );
        }
      }
    });

    it('should measure and optimize response times', async () => {
      const responseTimeTests = [
        { delay: 50, expectedFast: true },
        { delay: 200, expectedFast: true },
        { delay: 1000, expectedFast: false },
      ];

      for (const test of responseTimeTests) {
        mockHfInference.questionAnswering.mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(
                () =>
                  resolve({
                    answer: 'Response time test',
                    score: 0.8,
                  }),
                test.delay,
              ),
            ),
        );

        const startTime = Date.now();
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Response time test question',
            conversationId: testConversation.id,
          })
          .expect(200);

        const endTime = Date.now();
        const actualTime = endTime - startTime;

        expect(response.body.metadata.processingTime).toBeGreaterThanOrEqual(
          test.delay,
        );

        if (test.expectedFast) {
          expect(actualTime).toBeLessThan(5000); // Should be fast
        }
      }
    });
  });
});
