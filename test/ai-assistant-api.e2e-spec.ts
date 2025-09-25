import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { ConversationMessage } from '../src/entities/conversation-message.entity';
import { Project } from '../src/entities/project.entity';
import { KnowledgeBaseEntry } from '../src/entities/knowledge-base-entry.entity';
import {
  ConversationStatus,
  MessageType,
  MessageStatus,
  UserRole,
  ContentType,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('AI Assistant API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let projectRepository: Repository<Project>;
  let knowledgeRepository: Repository<KnowledgeBaseEntry>;
  let jwtService: JwtService;

  let testUser: User;
  let testProject: Project;
  let testConversation: Conversation;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
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
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    knowledgeRepository = moduleFixture.get<Repository<KnowledgeBaseEntry>>(
      getRepositoryToken(KnowledgeBaseEntry),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database
    await messageRepository.delete({});
    await conversationRepository.delete({});
    await knowledgeRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});

    // Create test user
    testUser = userRepository.create({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
    testUser = await userRepository.save(testUser);

    // Create test project
    testProject = projectRepository.create({
      title: 'Test FYP Project',
      description: 'A test final year project',
      studentId: testUser.id,
      supervisorId: testUser.id,
    });
    testProject = await projectRepository.save(testProject);

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });

    // Create test knowledge base entries
    const knowledgeEntry = knowledgeRepository.create({
      title: 'Literature Review Guidelines',
      content:
        'A literature review is a comprehensive survey of scholarly sources on a specific topic...',
      category: 'methodology',
      tags: ['literature_review', 'research', 'methodology'],
      keywords: ['literature', 'review', 'research', 'methodology'],
      contentType: ContentType.GUIDELINE,
      language: 'en',
      createdById: testUser.id,
    });
    await knowledgeRepository.save(knowledgeEntry);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /ai-assistant/conversations', () => {
    it('should create a new conversation', async () => {
      const createDto = {
        title: 'Literature Review Help',
        projectId: testProject.id,
        language: 'en',
        initialQuery: 'How do I write a literature review?',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createDto.title,
        projectId: testProject.id,
        language: 'en',
        status: ConversationStatus.ACTIVE,
        studentId: testUser.id,
        messageCount: 1, // Initial query creates a message
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should create conversation without project', async () => {
      const createDto = {
        title: 'General FYP Questions',
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createDto.title,
        projectId: null,
        language: 'en',
        status: ConversationStatus.ACTIVE,
        studentId: testUser.id,
        messageCount: 0,
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('title');
    });

    it('should require authentication', async () => {
      const createDto = {
        title: 'Test Conversation',
      };

      await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /ai-assistant/conversations', () => {
    beforeEach(async () => {
      // Create test conversations
      const conversation1 = conversationRepository.create({
        title: 'Literature Review Discussion',
        studentId: testUser.id,
        projectId: testProject.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });

      const conversation2 = conversationRepository.create({
        title: 'Methodology Questions',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(Date.now() - 86400000), // 1 day ago
      });

      testConversation = await conversationRepository.save(conversation1);
      await conversationRepository.save(conversation2);
    });

    it('should retrieve user conversations', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.conversations).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);

      // Should be sorted by lastMessageAt DESC
      expect(response.body.conversations[0].title).toBe(
        'Literature Review Discussion',
      );
      expect(response.body.conversations[1].title).toBe(
        'Methodology Questions',
      );
    });

    it('should filter by status', async () => {
      // Archive one conversation
      await conversationRepository.update(testConversation.id, {
        status: ConversationStatus.ARCHIVED,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/conversations')
        .query({ status: ConversationStatus.ACTIVE })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.conversations).toHaveLength(1);
      expect(response.body.conversations[0].title).toBe(
        'Methodology Questions',
      );
    });

    it('should filter by project', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/conversations')
        .query({ projectId: testProject.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.conversations).toHaveLength(1);
      expect(response.body.conversations[0].title).toBe(
        'Literature Review Discussion',
      );
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/conversations')
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.conversations).toHaveLength(1);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(true);
    });

    it('should search conversations', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/conversations')
        .query({ search: 'literature' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.conversations).toHaveLength(1);
      expect(response.body.conversations[0].title).toBe(
        'Literature Review Discussion',
      );
    });
  });

  describe('GET /ai-assistant/conversations/:id/messages', () => {
    let testMessage: ConversationMessage;

    beforeEach(async () => {
      // Create test conversation
      testConversation = conversationRepository.create({
        title: 'Test Conversation',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);

      // Create test messages
      const message1 = messageRepository.create({
        conversationId: testConversation.id,
        type: MessageType.USER_QUERY,
        content: 'What is a literature review?',
        status: MessageStatus.DELIVERED,
      });

      const message2 = messageRepository.create({
        conversationId: testConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'A literature review is a comprehensive survey...',
        confidenceScore: 0.85,
        sources: ['FYP Guidelines'],
        status: MessageStatus.DELIVERED,
      });

      testMessage = await messageRepository.save(message1);
      await messageRepository.save(message2);
    });

    it('should retrieve conversation messages', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);

      // Should be sorted by createdAt ASC
      expect(response.body.messages[0].type).toBe(MessageType.USER_QUERY);
      expect(response.body.messages[1].type).toBe(MessageType.AI_RESPONSE);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${testConversation.id}/messages`)
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(1);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(true);
    });

    it('should deny access to other users conversations', async () => {
      // Create another user
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: UserRole.STUDENT,
        isEmailVerified: true,
      });
      await userRepository.save(otherUser);

      const otherToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
      });

      await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${fakeId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /ai-assistant/conversations/:id/context', () => {
    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Test Conversation',
        studentId: testUser.id,
        projectId: testProject.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        context: {
          projectId: testProject.id,
          projectPhase: 'literature_review',
          recentTopics: ['literature review', 'methodology'],
          keyTerms: ['research', 'academic'],
          conversationSummary: 'Discussion about literature review',
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

    it('should retrieve conversation context', async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${testConversation.id}/context`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        projectId: testProject.id,
        projectPhase: 'literature_review',
        recentTopics: ['literature review', 'methodology'],
        keyTerms: ['research', 'academic'],
        conversationSummary: 'Discussion about literature review',
      });

      expect(response.body.preferences).toMatchObject({
        language: 'en',
        responseStyle: 'academic',
        detailLevel: 'detailed',
      });
    });

    it('should deny access to other users conversations', async () => {
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: UserRole.STUDENT,
        isEmailVerified: true,
      });
      await userRepository.save(otherUser);

      const otherToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
      });

      await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${testConversation.id}/context`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });

  describe('POST /ai-assistant/ask', () => {
    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Test Conversation',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);
    });

    it('should process a question and return AI response', async () => {
      const askDto = {
        query: 'What is a literature review?',
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
        conversationId: testConversation.id,
        fromAI: true,
      });

      expect(response.body.response).toBeDefined();
      expect(response.body.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(response.body.confidenceScore).toBeLessThanOrEqual(1);
      expect(response.body.sources).toBeInstanceOf(Array);
      expect(response.body.metadata).toBeDefined();
    });

    it('should validate question length', async () => {
      const askDto = {
        query: 'Hi', // Too short
        conversationId: testConversation.id,
      };

      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(400);
    });

    it('should handle questions without conversation ID', async () => {
      const askDto = {
        query: 'What is a literature review?',
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(response.body.response).toBeDefined();
      expect(response.body.fromAI).toBeDefined();
    });
  });

  describe('POST /ai-assistant/messages/:id/bookmark', () => {
    let testMessage: ConversationMessage;

    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Test Conversation',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);

      testMessage = messageRepository.create({
        conversationId: testConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'A literature review is a comprehensive survey...',
        confidenceScore: 0.85,
        sources: ['FYP Guidelines'],
        status: MessageStatus.DELIVERED,
        isBookmarked: false,
      });
      testMessage = await messageRepository.save(testMessage);
    });

    it('should bookmark a message', async () => {
      const bookmarkDto = {
        note: 'Great explanation of literature review',
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookmarkDto)
        .expect(200);

      expect(response.body.isBookmarked).toBe(true);
      expect(response.body.metadata.bookmarkNote).toBe(bookmarkDto.note);
    });

    it('should prevent bookmarking already bookmarked message', async () => {
      // First bookmark
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Try to bookmark again
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('POST /ai-assistant/messages/:id/rate', () => {
    let testMessage: ConversationMessage;

    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Test Conversation',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);

      testMessage = messageRepository.create({
        conversationId: testConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'A literature review is a comprehensive survey...',
        confidenceScore: 0.85,
        sources: ['FYP Guidelines'],
        status: MessageStatus.DELIVERED,
        averageRating: 0,
        ratingCount: 0,
      });
      testMessage = await messageRepository.save(testMessage);
    });

    it('should rate a message', async () => {
      const rateDto = {
        rating: 4.5,
        feedback: 'Very helpful response',
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(200);

      expect(response.body.averageRating).toBe(4.5);
      expect(response.body.ratingCount).toBe(1);
    });

    it('should validate rating range', async () => {
      const rateDto = {
        rating: 6.0, // Invalid - too high
      };

      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(400);
    });
  });

  describe('GET /ai-assistant/knowledge/search', () => {
    it('should search knowledge base', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'literature review' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].title).toContain('Literature Review');
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'review', category: 'methodology' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should require query parameter', async () => {
      await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /ai-assistant/messages/bookmarked', () => {
    beforeEach(async () => {
      testConversation = conversationRepository.create({
        title: 'Test Conversation',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      testConversation = await conversationRepository.save(testConversation);

      // Create bookmarked message
      const bookmarkedMessage = messageRepository.create({
        conversationId: testConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'Bookmarked response about literature review',
        isBookmarked: true,
        status: MessageStatus.DELIVERED,
      });

      // Create non-bookmarked message
      const normalMessage = messageRepository.create({
        conversationId: testConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'Normal response',
        isBookmarked: false,
        status: MessageStatus.DELIVERED,
      });

      await messageRepository.save(bookmarkedMessage);
      await messageRepository.save(normalMessage);
    });

    it('should retrieve bookmarked messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].isBookmarked).toBe(true);
      expect(response.body.messages[0].content).toContain(
        'Bookmarked response',
      );
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .query({ limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.hasMore).toBe(false);
    });
  });
});
