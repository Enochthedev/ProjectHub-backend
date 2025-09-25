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
import { MessageRating } from '../src/entities/message-rating.entity';
import { Project } from '../src/entities/project.entity';
import {
  ConversationStatus,
  MessageType,
  MessageStatus,
  UserRole,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('AI Assistant Q&A and Interaction (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let ratingRepository: Repository<MessageRating>;
  let projectRepository: Repository<Project>;
  let jwtService: JwtService;

  let testUser: User;
  let testProject: Project;
  let testConversation: Conversation;
  let testMessage: ConversationMessage;
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
    ratingRepository = moduleFixture.get<Repository<MessageRating>>(
      getRepositoryToken(MessageRating),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
  });

  beforeEach(async () => {
    // Clean up database
    await ratingRepository.delete({});
    await messageRepository.delete({});
    await conversationRepository.delete({});
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
      lastMessageAt: new Date(),
    });
    testConversation = await conversationRepository.save(testConversation);

    // Create test message
    testMessage = messageRepository.create({
      conversationId: testConversation.id,
      type: MessageType.AI_RESPONSE,
      content:
        'A literature review is a comprehensive survey of scholarly sources...',
      confidenceScore: 0.85,
      sources: ['FYP Guidelines', 'Research Methodology Handbook'],
      status: MessageStatus.DELIVERED,
      isBookmarked: false,
      averageRating: 0,
      ratingCount: 0,
    });
    testMessage = await messageRepository.save(testMessage);

    // Generate auth token
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /ai-assistant/ask', () => {
    it('should process a question with existing conversation', async () => {
      const askDto = {
        query:
          'What is the difference between qualitative and quantitative research?',
        conversationId: testConversation.id,
        language: 'en',
        includeProjectContext: true,
        projectPhase: 'methodology',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(response.body).toMatchObject({
        conversationId: testConversation.id,
        fromAI: expect.any(Boolean),
        response: expect.any(String),
        confidenceScore: expect.any(Number),
        sources: expect.any(Array),
        metadata: expect.objectContaining({
          processingTime: expect.any(Number),
          language: expect.any(String),
          category: expect.any(String),
        }),
      });

      expect(response.body.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(response.body.confidenceScore).toBeLessThanOrEqual(1);
      expect(response.body.response.length).toBeGreaterThan(0);
    });

    it('should process a question without conversation ID', async () => {
      const askDto = {
        query: 'How do I choose a research methodology?',
        language: 'en',
        includeProjectContext: false,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(response.body).toMatchObject({
        fromAI: expect.any(Boolean),
        response: expect.any(String),
        confidenceScore: expect.any(Number),
        sources: expect.any(Array),
      });
    });

    it('should handle multilingual queries', async () => {
      const askDto = {
        query: '¿Qué es una revisión de literatura?',
        conversationId: testConversation.id,
        language: 'es',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(response.body.metadata.language).toBe('es');
    });

    it('should validate query length', async () => {
      const askDto = {
        query: 'Hi', // Too short (less than 3 characters)
        conversationId: testConversation.id,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(400);

      expect(response.body.message).toContain(
        'Question must be at least 3 characters long',
      );
    });

    it('should validate query maximum length', async () => {
      const longQuery = 'A'.repeat(1001); // Exceeds 1000 character limit
      const askDto = {
        query: longQuery,
        conversationId: testConversation.id,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(400);

      expect(response.body.message).toContain(
        'Question cannot exceed 1000 characters',
      );
    });

    it('should handle invalid conversation ID gracefully', async () => {
      const askDto = {
        query: 'What is a literature review?',
        conversationId: '123e4567-e89b-12d3-a456-426614174000', // Non-existent ID
      };

      // Should still process the question but may not use conversation context
      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(response.body.response).toBeDefined();
    });

    it('should include suggested follow-ups when available', async () => {
      const askDto = {
        query: 'What is a literature review?',
        conversationId: testConversation.id,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      if (response.body.suggestedFollowUps) {
        expect(response.body.suggestedFollowUps).toBeInstanceOf(Array);
        expect(response.body.suggestedFollowUps.length).toBeGreaterThan(0);
      }
    });

    it('should provide escalation suggestion for low confidence responses', async () => {
      const askDto = {
        query: 'What is the meaning of life in the context of FYP research?', // Likely low confidence
        conversationId: testConversation.id,
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      // If confidence is low, should have escalation suggestion
      if (response.body.confidenceScore < 0.5) {
        expect(response.body.escalationSuggestion).toBeDefined();
        expect(response.body.escalationSuggestion).toContain('human review');
      }
    });

    it('should require authentication', async () => {
      const askDto = {
        query: 'What is a literature review?',
      };

      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .send(askDto)
        .expect(401);
    });
  });

  describe('POST /ai-assistant/messages/:id/bookmark', () => {
    it('should bookmark a message successfully', async () => {
      const bookmarkDto = {
        note: 'Excellent explanation of literature review methodology',
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookmarkDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testMessage.id,
        isBookmarked: true,
        metadata: expect.objectContaining({
          bookmarkNote: bookmarkDto.note,
          bookmarkedAt: expect.any(String),
        }),
      });

      // Verify in database
      const updatedMessage = await messageRepository.findOne({
        where: { id: testMessage.id },
      });
      expect(updatedMessage.isBookmarked).toBe(true);
    });

    it('should bookmark a message without note', async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.isBookmarked).toBe(true);
    });

    it('should prevent bookmarking already bookmarked message', async () => {
      // First bookmark
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      // Try to bookmark again
      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('already bookmarked');
    });

    it('should validate note length', async () => {
      const longNote = 'A'.repeat(501); // Exceeds 500 character limit
      const bookmarkDto = {
        note: longNote,
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(bookmarkDto)
        .expect(400);

      expect(response.body.message).toContain('500');
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${fakeId}/bookmark`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });

    it('should deny access to other users messages', async () => {
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
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({})
        .expect(403);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/bookmark`)
        .send({})
        .expect(401);
    });
  });

  describe('POST /ai-assistant/messages/:id/rate', () => {
    it('should rate a message successfully', async () => {
      const rateDto = {
        rating: 4.5,
        feedback: 'Very helpful and accurate response',
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testMessage.id,
        averageRating: 4.5,
        ratingCount: 1,
      });

      // Verify rating was created in database
      const rating = await ratingRepository.findOne({
        where: {
          messageId: testMessage.id,
          userId: testUser.id,
        },
      });
      expect(rating).toBeDefined();
      expect(rating.rating).toBe(4.5);
      expect(rating.feedback).toBe(rateDto.feedback);
    });

    it('should rate a message without feedback', async () => {
      const rateDto = {
        rating: 3.0,
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(200);

      expect(response.body.averageRating).toBe(3.0);
      expect(response.body.ratingCount).toBe(1);
    });

    it('should update existing rating', async () => {
      // First rating
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 3.0 })
        .expect(200);

      // Update rating
      const rateDto = {
        rating: 5.0,
        feedback: 'Updated feedback - excellent!',
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(200);

      expect(response.body.averageRating).toBe(5.0);
      expect(response.body.ratingCount).toBe(1); // Still 1 rating, just updated

      // Verify updated rating in database
      const rating = await ratingRepository.findOne({
        where: {
          messageId: testMessage.id,
          userId: testUser.id,
        },
      });
      expect(rating.rating).toBe(5.0);
      expect(rating.feedback).toBe(rateDto.feedback);
    });

    it('should validate rating range - minimum', async () => {
      const rateDto = {
        rating: 0.5, // Below minimum of 1.0
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(400);

      expect(response.body.message).toContain('1');
    });

    it('should validate rating range - maximum', async () => {
      const rateDto = {
        rating: 6.0, // Above maximum of 5.0
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(400);

      expect(response.body.message).toContain('5');
    });

    it('should validate feedback length', async () => {
      const longFeedback = 'A'.repeat(1001); // Exceeds 1000 character limit
      const rateDto = {
        rating: 4.0,
        feedback: longFeedback,
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(400);

      expect(response.body.message).toContain('1000');
    });

    it('should handle decimal ratings correctly', async () => {
      const rateDto = {
        rating: 4.7,
      };

      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(rateDto)
        .expect(200);

      expect(response.body.averageRating).toBe(4.7);
    });

    it('should calculate average rating with multiple users', async () => {
      // Create another user
      const otherUser = userRepository.create({
        email: 'other@example.com',
        firstName: 'Other',
        lastName: 'User',
        role: UserRole.STUDENT,
        isEmailVerified: true,
      });
      await userRepository.save(otherUser);

      // Create another conversation for the other user to access the message
      const otherConversation = conversationRepository.create({
        title: 'Other Conversation',
        studentId: otherUser.id,
        status: ConversationStatus.ACTIVE,
        language: 'en',
        lastMessageAt: new Date(),
      });
      await conversationRepository.save(otherConversation);

      // Create a message in the other conversation
      const otherMessage = messageRepository.create({
        conversationId: otherConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'Same content for rating test',
        status: MessageStatus.DELIVERED,
        averageRating: 0,
        ratingCount: 0,
      });
      await messageRepository.save(otherMessage);

      const otherToken = jwtService.sign({
        sub: otherUser.id,
        email: otherUser.email,
      });

      // First user rates 4.0
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${otherMessage.id}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 4.0 })
        .expect(200);

      // Second user rates 2.0
      const response = await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${otherMessage.id}/rate`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ rating: 2.0 })
        .expect(200);

      // Average should be 3.0
      expect(response.body.averageRating).toBe(3.0);
      expect(response.body.ratingCount).toBe(2);
    });

    it('should return 404 for non-existent message', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${fakeId}/rate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 4.0 })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/ai-assistant/messages/${testMessage.id}/rate`)
        .send({ rating: 4.0 })
        .expect(401);
    });
  });

  describe('Integration - Q&A with Bookmarking and Rating', () => {
    it('should allow full workflow: ask question, bookmark response, rate response', async () => {
      // 1. Ask a question
      const askDto = {
        query: 'What are the key components of a research proposal?',
        conversationId: testConversation.id,
        language: 'en',
      };

      const askResponse = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send(askDto)
        .expect(200);

      expect(askResponse.body.response).toBeDefined();
      const messageId = askResponse.body.messageId;

      // 2. Bookmark the response (if messageId is available)
      if (messageId) {
        const bookmarkResponse = await request(app.getHttpServer())
          .post(`/ai-assistant/messages/${messageId}/bookmark`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ note: 'Great overview of research proposal components' })
          .expect(200);

        expect(bookmarkResponse.body.isBookmarked).toBe(true);

        // 3. Rate the response
        const rateResponse = await request(app.getHttpServer())
          .post(`/ai-assistant/messages/${messageId}/rate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ rating: 4.5, feedback: 'Very comprehensive and helpful' })
          .expect(200);

        expect(rateResponse.body.averageRating).toBe(4.5);
        expect(rateResponse.body.ratingCount).toBe(1);
      }
    });

    it('should handle multiple questions in same conversation', async () => {
      const questions = [
        'What is a literature review?',
        'How do I structure my methodology section?',
        'What citation style should I use?',
      ];

      for (const question of questions) {
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: question,
            conversationId: testConversation.id,
          })
          .expect(200);

        expect(response.body.response).toBeDefined();
        expect(response.body.conversationId).toBe(testConversation.id);
      }
    });
  });
});
