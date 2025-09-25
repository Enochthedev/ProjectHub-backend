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
import { KnowledgeBaseEntry } from '../src/entities/knowledge-base-entry.entity';
import { Project } from '../src/entities/project.entity';
import {
  ConversationStatus,
  MessageType,
  MessageStatus,
  UserRole,
  ContentType,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('AI Assistant Search and Knowledge Base (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let knowledgeRepository: Repository<KnowledgeBaseEntry>;
  let projectRepository: Repository<Project>;
  let jwtService: JwtService;

  let testUser: User;
  let testProject: Project;
  let testConversation: Conversation;
  let knowledgeEntry1: KnowledgeBaseEntry;
  let knowledgeEntry2: KnowledgeBaseEntry;
  let knowledgeEntry3: KnowledgeBaseEntry;
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
    knowledgeRepository = moduleFixture.get<Repository<KnowledgeBaseEntry>>(
      getRepositoryToken(KnowledgeBaseEntry),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
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

    // Create test conversation
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
        conversationSummary:
          'Discussion about literature review and methodology',
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

    // Create test knowledge base entries
    knowledgeEntry1 = knowledgeRepository.create({
      title: 'Literature Review Guidelines',
      content:
        'A literature review is a comprehensive survey of scholarly sources on a specific topic. It provides an overview of current knowledge, allowing you to identify relevant theories, methods, and gaps in existing research.',
      category: 'methodology',
      tags: [
        'literature_review',
        'research',
        'methodology',
        'academic_writing',
      ],
      keywords: [
        'literature',
        'review',
        'research',
        'methodology',
        'scholarly',
        'sources',
      ],
      contentType: ContentType.GUIDELINE,
      language: 'en',
      isActive: true,
      usageCount: 25,
      averageRating: 4.5,
      createdById: testUser.id,
    });

    knowledgeEntry2 = knowledgeRepository.create({
      title: 'Research Methodology Framework',
      content:
        'Research methodology refers to the specific procedures or techniques used to identify, select, process, and analyze information about a topic. It includes both quantitative and qualitative approaches.',
      category: 'methodology',
      tags: ['methodology', 'research_design', 'quantitative', 'qualitative'],
      keywords: [
        'methodology',
        'research',
        'quantitative',
        'qualitative',
        'framework',
      ],
      contentType: ContentType.GUIDELINE,
      language: 'en',
      isActive: true,
      usageCount: 18,
      averageRating: 4.2,
      createdById: testUser.id,
    });

    knowledgeEntry3 = knowledgeRepository.create({
      title: 'Citation and Referencing Guide',
      content:
        'Proper citation and referencing is crucial in academic writing. This guide covers APA, MLA, and IEEE citation styles commonly used in final year projects.',
      category: 'academic_writing',
      tags: [
        'citation',
        'referencing',
        'apa',
        'mla',
        'ieee',
        'academic_writing',
      ],
      keywords: ['citation', 'reference', 'apa', 'mla', 'ieee', 'bibliography'],
      contentType: ContentType.TEMPLATE,
      language: 'en',
      isActive: true,
      usageCount: 32,
      averageRating: 4.8,
      createdById: testUser.id,
    });

    // Create inactive entry for testing
    const inactiveEntry = knowledgeRepository.create({
      title: 'Outdated Guidelines',
      content:
        'This is outdated content that should not appear in search results.',
      category: 'methodology',
      tags: ['outdated'],
      keywords: ['outdated'],
      contentType: ContentType.GUIDELINE,
      language: 'en',
      isActive: false,
      usageCount: 0,
      averageRating: 0,
      createdById: testUser.id,
    });

    await knowledgeRepository.save([
      knowledgeEntry1,
      knowledgeEntry2,
      knowledgeEntry3,
      inactiveEntry,
    ]);

    // Create bookmarked messages for testing
    const bookmarkedMessage1 = messageRepository.create({
      conversationId: testConversation.id,
      type: MessageType.AI_RESPONSE,
      content:
        'Excellent explanation about literature review structure and components.',
      confidenceScore: 0.92,
      sources: ['Literature Review Guidelines'],
      status: MessageStatus.DELIVERED,
      isBookmarked: true,
      averageRating: 4.7,
      ratingCount: 3,
      metadata: {
        bookmarkNote: 'Great resource for literature review',
        bookmarkedAt: new Date(),
        category: 'methodology',
      },
    });

    const bookmarkedMessage2 = messageRepository.create({
      conversationId: testConversation.id,
      type: MessageType.AI_RESPONSE,
      content:
        'Comprehensive guide to choosing appropriate research methodology.',
      confidenceScore: 0.88,
      sources: ['Research Methodology Framework'],
      status: MessageStatus.DELIVERED,
      isBookmarked: true,
      averageRating: 4.3,
      ratingCount: 2,
      metadata: {
        bookmarkNote: 'Helpful for methodology selection',
        bookmarkedAt: new Date(Date.now() - 86400000), // 1 day ago
        category: 'methodology',
      },
    });

    const normalMessage = messageRepository.create({
      conversationId: testConversation.id,
      type: MessageType.AI_RESPONSE,
      content: 'Regular response that is not bookmarked.',
      confidenceScore: 0.75,
      sources: ['General Guidelines'],
      status: MessageStatus.DELIVERED,
      isBookmarked: false,
      averageRating: 3.5,
      ratingCount: 1,
    });

    await messageRepository.save([
      bookmarkedMessage1,
      bookmarkedMessage2,
      normalMessage,
    ]);

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /ai-assistant/knowledge/search', () => {
    it('should search knowledge base with query', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'literature review' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.entries).toBeInstanceOf(Array);
      expect(response.body.entries.length).toBeGreaterThan(0);

      // Should find the literature review entry
      const literatureEntry = response.body.entries.find(
        (entry: any) => entry.title === 'Literature Review Guidelines',
      );
      expect(literatureEntry).toBeDefined();
      expect(literatureEntry.content).toContain('literature review');
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({
          query: 'research',
          category: 'methodology',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries).toBeInstanceOf(Array);

      // All results should be from methodology category
      response.body.entries.forEach((entry: any) => {
        expect(entry.category).toBe('methodology');
      });
    });

    it('should filter by language', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({
          query: 'methodology',
          language: 'en',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries).toBeInstanceOf(Array);

      // All results should be in English
      response.body.entries.forEach((entry: any) => {
        expect(entry.language).toBe('en');
      });
    });

    it('should limit results', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({
          query: 'research',
          limit: 2,
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries.length).toBeLessThanOrEqual(2);
    });

    it('should exclude inactive entries', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'outdated' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should not find the inactive entry
      const outdatedEntry = response.body.entries.find(
        (entry: any) => entry.title === 'Outdated Guidelines',
      );
      expect(outdatedEntry).toBeUndefined();
    });

    it('should handle empty search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'nonexistent_topic_xyz' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries).toBeInstanceOf(Array);
      expect(response.body.entries.length).toBe(0);
      expect(response.body.total).toBe(0);
    });

    it('should search by tags', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'academic_writing' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries.length).toBeGreaterThan(0);

      // Should find entries with academic_writing tag
      const writingEntry = response.body.entries.find((entry: any) =>
        entry.tags.includes('academic_writing'),
      );
      expect(writingEntry).toBeDefined();
    });

    it('should search by keywords', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'bibliography' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries.length).toBeGreaterThan(0);

      // Should find citation guide which has bibliography in keywords
      const citationEntry = response.body.entries.find(
        (entry: any) => entry.title === 'Citation and Referencing Guide',
      );
      expect(citationEntry).toBeDefined();
    });

    it('should require query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('query');
    });

    it('should validate limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({
          query: 'research',
          limit: 150, // Exceeds maximum of 100
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('100');
    });

    it('should handle special characters in query', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'research & methodology' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries).toBeInstanceOf(Array);
    });

    it('should be case insensitive', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'LITERATURE REVIEW' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries.length).toBeGreaterThan(0);

      const literatureEntry = response.body.entries.find(
        (entry: any) => entry.title === 'Literature Review Guidelines',
      );
      expect(literatureEntry).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'literature review' })
        .expect(401);
    });
  });

  describe('GET /ai-assistant/messages/bookmarked', () => {
    it('should retrieve bookmarked messages', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.any(Array),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });

      expect(response.body.messages.length).toBe(2); // Two bookmarked messages
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(false);

      // All messages should be bookmarked
      response.body.messages.forEach((message: any) => {
        expect(message.isBookmarked).toBe(true);
      });

      // Should be sorted by creation date DESC (most recent first)
      expect(response.body.messages[0].content).toContain(
        'literature review structure',
      );
      expect(response.body.messages[1].content).toContain(
        'research methodology',
      );
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.messages.length).toBe(1);
      expect(response.body.total).toBe(2);
      expect(response.body.hasMore).toBe(true);

      // Get second page
      const response2 = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .query({ limit: 1, offset: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response2.body.messages.length).toBe(1);
      expect(response2.body.total).toBe(2);
      expect(response2.body.hasMore).toBe(false);

      // Should be different messages
      expect(response.body.messages[0].id).not.toBe(
        response2.body.messages[0].id,
      );
    });

    it('should include bookmark metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const messageWithNote = response.body.messages.find(
        (msg: any) => msg.metadata?.bookmarkNote,
      );

      expect(messageWithNote).toBeDefined();
      expect(messageWithNote.metadata.bookmarkNote).toBeDefined();
      expect(messageWithNote.metadata.bookmarkedAt).toBeDefined();
    });

    it('should validate limit parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .query({ limit: 150 }) // Exceeds maximum
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('100');
    });

    it('should validate offset parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .query({ offset: -1 }) // Negative offset
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('0');
    });

    it('should return empty array when no bookmarked messages', async () => {
      // Create a new user with no bookmarked messages
      const newUser = userRepository.create({
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: UserRole.STUDENT,
        isEmailVerified: true,
      });
      await userRepository.save(newUser);

      const newUserToken = jwtService.sign({
        sub: newUser.id,
        email: newUser.email,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body.messages).toEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.hasMore).toBe(false);
    });

    it('should only return user own bookmarked messages', async () => {
      // Create another user with their own conversation and bookmarked message
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: UserRole.STUDENT,
        isEmailVerified: true,
      });
      await userRepository.save(otherUser);

      const otherConversation = conversationRepository.create({
        title: 'Other Conversation',
        studentId: otherUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      await conversationRepository.save(otherConversation);

      const otherBookmarkedMessage = messageRepository.create({
        conversationId: otherConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'Other user bookmarked message',
        status: MessageStatus.DELIVERED,
        isBookmarked: true,
      });
      await messageRepository.save(otherBookmarkedMessage);

      const otherUserToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
      });

      // Other user should only see their own bookmarked message
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.messages.length).toBe(1);
      expect(response.body.messages[0].content).toBe(
        'Other user bookmarked message',
      );
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .expect(401);
    });
  });

  describe('GET /ai-assistant/conversations/:id/context', () => {
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
        conversationSummary:
          'Discussion about literature review and methodology',
        preferences: {
          language: 'en',
          responseStyle: 'academic',
          detailLevel: 'detailed',
        },
      });

      expect(response.body.lastActivity).toBeDefined();
    });

    it('should handle conversation without context', async () => {
      // Create conversation without context
      const simpleConversation = conversationRepository.create({
        title: 'Simple Conversation',
        studentId: testUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      await conversationRepository.save(simpleConversation);

      const response = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${simpleConversation.id}/context`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should still return context (built dynamically)
      expect(response.body).toBeDefined();
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

    it('should return 404 for non-existent conversation', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${fakeId}/context`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should validate UUID format', async () => {
      const invalidId = 'invalid-uuid';

      await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${invalidId}/context`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${testConversation.id}/context`)
        .expect(401);
    });
  });

  describe('Integration - Search and Context', () => {
    it('should provide relevant knowledge base results for conversation context', async () => {
      // Search for content related to the conversation context
      const response = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({
          query: 'literature review methodology',
          category: 'methodology',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.entries.length).toBeGreaterThan(0);

      // Should find both literature review and methodology entries
      const titles = response.body.entries.map((entry: any) => entry.title);
      expect(titles).toContain('Literature Review Guidelines');
      expect(titles).toContain('Research Methodology Framework');
    });

    it('should correlate bookmarked messages with knowledge base content', async () => {
      // Get bookmarked messages
      const bookmarkedResponse = await request(app.getHttpServer())
        .get('/ai-assistant/messages/bookmarked')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Search knowledge base for related content
      const knowledgeResponse = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'literature review' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Both should contain literature review related content
      expect(
        bookmarkedResponse.body.messages.some((msg: any) =>
          msg.content.includes('literature review'),
        ),
      ).toBe(true);

      expect(
        knowledgeResponse.body.entries.some((entry: any) =>
          entry.title.includes('Literature Review'),
        ),
      ).toBe(true);
    });

    it('should handle complex search scenarios', async () => {
      // Multi-term search
      const response1 = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({ query: 'research methodology framework' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Category-specific search
      const response2 = await request(app.getHttpServer())
        .get('/ai-assistant/knowledge/search')
        .query({
          query: 'citation',
          category: 'academic_writing',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Both should return relevant results
      expect(response1.body.entries.length).toBeGreaterThan(0);
      expect(response2.body.entries.length).toBeGreaterThan(0);

      // Second search should only return academic writing category
      response2.body.entries.forEach((entry: any) => {
        expect(entry.category).toBe('academic_writing');
      });
    });
  });
});
