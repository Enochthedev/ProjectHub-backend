import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Project } from '../src/entities/project.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { ConversationMessage } from '../src/entities/conversation-message.entity';
import { SupervisorProfile } from '../src/entities/supervisor-profile.entity';
import { StudentProfile } from '../src/entities/student-profile.entity';
import {
  UserRole,
  ConversationStatus,
  MessageType,
  MessageStatus,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Supervisor AI Monitoring (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let supervisorProfileRepository: Repository<SupervisorProfile>;
  let studentProfileRepository: Repository<StudentProfile>;
  let jwtService: JwtService;

  let supervisorUser: User;
  let studentUser1: User;
  let studentUser2: User;
  let adminUser: User;
  let project1: Project;
  let project2: Project;
  let conversation1: Conversation;
  let conversation2: Conversation;
  let escalatedConversation: Conversation;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    projectRepository = moduleFixture.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    conversationRepository = moduleFixture.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    messageRepository = moduleFixture.get<Repository<ConversationMessage>>(
      getRepositoryToken(ConversationMessage),
    );
    supervisorProfileRepository = moduleFixture.get<
      Repository<SupervisorProfile>
    >(getRepositoryToken(SupervisorProfile));
    studentProfileRepository = moduleFixture.get<Repository<StudentProfile>>(
      getRepositoryToken(StudentProfile),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    // Clean up database
    await messageRepository.delete({});
    await conversationRepository.delete({});
    await projectRepository.delete({});
    await supervisorProfileRepository.delete({});
    await studentProfileRepository.delete({});
    await userRepository.delete({});

    // Create test users
    supervisorUser = await userRepository.save({
      email: 'supervisor@test.com',
      firstName: 'John',
      lastName: 'Supervisor',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });

    studentUser1 = await userRepository.save({
      email: 'student1@test.com',
      firstName: 'Alice',
      lastName: 'Student',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });

    studentUser2 = await userRepository.save({
      email: 'student2@test.com',
      firstName: 'Bob',
      lastName: 'Student',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });

    adminUser = await userRepository.save({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });

    // Create supervisor and student profiles
    await supervisorProfileRepository.save({
      userId: supervisorUser.id,
      department: 'Computer Science',
      specializations: ['AI', 'Machine Learning'],
      maxStudents: 10,
    });

    await studentProfileRepository.save({
      userId: studentUser1.id,
      studentId: 'CS2024001',
      program: 'Computer Science',
      year: 4,
      gpa: 3.8,
    });

    await studentProfileRepository.save({
      userId: studentUser2.id,
      studentId: 'CS2024002',
      program: 'Computer Science',
      year: 4,
      gpa: 3.6,
    });

    // Create projects
    project1 = await projectRepository.save({
      title: 'AI Chatbot Development',
      description: 'Building an AI-powered chatbot',
      studentId: studentUser1.id,
      supervisorId: supervisorUser.id,
      status: 'active',
      type: 'research',
    });

    project2 = await projectRepository.save({
      title: 'Machine Learning Pipeline',
      description: 'Creating an ML pipeline for data processing',
      studentId: studentUser2.id,
      supervisorId: supervisorUser.id,
      status: 'active',
      type: 'development',
    });

    // Create conversations
    conversation1 = await conversationRepository.save({
      title: 'Literature Review Questions',
      studentId: studentUser1.id,
      projectId: project1.id,
      status: ConversationStatus.ACTIVE,
      language: 'en',
      lastMessageAt: new Date(),
    });

    conversation2 = await conversationRepository.save({
      title: 'Methodology Help',
      studentId: studentUser2.id,
      projectId: project2.id,
      status: ConversationStatus.ACTIVE,
      language: 'en',
      lastMessageAt: new Date(),
    });

    escalatedConversation = await conversationRepository.save({
      title: 'Complex Technical Issue',
      studentId: studentUser1.id,
      projectId: project1.id,
      status: ConversationStatus.ESCALATED,
      language: 'en',
      lastMessageAt: new Date(),
    });

    // Create messages
    await messageRepository.save([
      {
        conversationId: conversation1.id,
        type: MessageType.USER_QUERY,
        content: 'How do I write a literature review?',
        status: MessageStatus.DELIVERED,
        metadata: { category: 'literature_review' },
      },
      {
        conversationId: conversation1.id,
        type: MessageType.AI_RESPONSE,
        content: 'A literature review is a comprehensive analysis...',
        status: MessageStatus.DELIVERED,
        confidenceScore: 0.85,
        sources: ['knowledge_base'],
        averageRating: 4.2,
        ratingCount: 3,
        metadata: { category: 'literature_review', processingTime: 1200 },
      },
      {
        conversationId: conversation2.id,
        type: MessageType.USER_QUERY,
        content: 'What methodology should I use for my ML project?',
        status: MessageStatus.DELIVERED,
        metadata: { category: 'methodology' },
      },
      {
        conversationId: conversation2.id,
        type: MessageType.AI_RESPONSE,
        content: 'For machine learning projects, consider...',
        status: MessageStatus.DELIVERED,
        confidenceScore: 0.72,
        sources: ['knowledge_base', 'templates'],
        averageRating: 3.8,
        ratingCount: 2,
        metadata: { category: 'methodology', processingTime: 1500 },
      },
      {
        conversationId: escalatedConversation.id,
        type: MessageType.USER_QUERY,
        content: 'I am having trouble with complex neural network architecture',
        status: MessageStatus.DELIVERED,
        metadata: { category: 'technical_issue' },
      },
      {
        conversationId: escalatedConversation.id,
        type: MessageType.AI_RESPONSE,
        content: 'This is a complex topic that may require human expertise...',
        status: MessageStatus.DELIVERED,
        confidenceScore: 0.25,
        sources: ['fallback_template'],
        averageRating: 2.1,
        ratingCount: 1,
        metadata: { category: 'technical_issue', requiresHumanReview: true },
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /ai-assistant/supervisor/student-interactions', () => {
    it('should return student interactions overview for supervisor', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
      expect(response.body).toHaveProperty('totalStudents');
      expect(response.body).toHaveProperty('activeStudents');
      expect(response.body).toHaveProperty('studentsWithEscalations');
      expect(response.body).toHaveProperty('overallAverageConfidence');
      expect(response.body).toHaveProperty('totalInteractions');

      expect(response.body.students).toHaveLength(2);
      expect(response.body.totalStudents).toBe(2);
      expect(response.body.studentsWithEscalations).toBe(1);

      const student1Summary = response.body.students.find(
        (s: any) => s.studentId === studentUser1.id,
      );
      expect(student1Summary).toBeDefined();
      expect(student1Summary.studentName).toBe('Alice Student');
      expect(student1Summary.totalConversations).toBe(2);
      expect(student1Summary.escalatedConversations).toBe(1);
    });

    it('should filter by student ID', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .query({ studentId: studentUser1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.students).toHaveLength(1);
      expect(response.body.students[0].studentId).toBe(studentUser1.id);
    });

    it('should deny access to non-supervisor users', async () => {
      const token = jwtService.sign({
        sub: studentUser1.id,
        email: studentUser1.email,
        role: studentUser1.role,
      });

      await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('should allow admin access', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('students');
    });
  });

  describe('GET /ai-assistant/supervisor/common-questions', () => {
    it('should return common questions analysis', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/common-questions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('questions');
      expect(response.body).toHaveProperty('totalQuestions');
      expect(response.body).toHaveProperty('lowConfidenceQuestions');
      expect(response.body).toHaveProperty('lowRatedQuestions');
      expect(response.body).toHaveProperty('problematicCategories');
      expect(response.body).toHaveProperty('knowledgeGaps');

      expect(Array.isArray(response.body.questions)).toBe(true);
      expect(response.body.totalQuestions).toBeGreaterThanOrEqual(0);
    });

    it('should filter by confidence score', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/common-questions')
        .query({ maxConfidence: 0.5 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('questions');
      // Should only include questions with low confidence responses
    });

    it('should deny access to students', async () => {
      const token = jwtService.sign({
        sub: studentUser1.id,
        email: studentUser1.email,
        role: studentUser1.role,
      });

      await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/common-questions')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('GET /ai-assistant/supervisor/escalations', () => {
    it('should return escalated conversations', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/escalations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('escalations');
      expect(response.body).toHaveProperty('totalEscalations');
      expect(response.body).toHaveProperty('newEscalations');
      expect(response.body).toHaveProperty('highPriorityEscalations');
      expect(response.body).toHaveProperty('urgentEscalations');
      expect(response.body).toHaveProperty('commonReasons');

      expect(response.body.escalations).toHaveLength(1);
      expect(response.body.totalEscalations).toBe(1);

      const escalation = response.body.escalations[0];
      expect(escalation.conversationId).toBe(escalatedConversation.id);
      expect(escalation.studentId).toBe(studentUser1.id);
      expect(escalation.studentName).toBe('Alice Student');
      expect(escalation.title).toBe('Complex Technical Issue');
      expect(escalation).toHaveProperty('escalationReason');
      expect(escalation).toHaveProperty('priority');
      expect(escalation).toHaveProperty('suggestedActions');
      expect(Array.isArray(escalation.suggestedActions)).toBe(true);
    });

    it('should filter escalations by project', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/escalations')
        .query({ projectId: project1.id })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.escalations).toHaveLength(1);
      expect(response.body.escalations[0].projectId).toBe(project1.id);
    });

    it('should deny access to unauthorized users', async () => {
      const token = jwtService.sign({
        sub: studentUser1.id,
        email: studentUser1.email,
        role: studentUser1.role,
      });

      await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/escalations')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Authorization and Error Handling', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .expect(401);
    });

    it('should handle supervisor with no students', async () => {
      // Create a supervisor with no students
      const emptySupervisor = await userRepository.save({
        email: 'empty.supervisor@test.com',
        firstName: 'Empty',
        lastName: 'Supervisor',
        role: UserRole.SUPERVISOR,
        isEmailVerified: true,
      });

      await supervisorProfileRepository.save({
        userId: emptySupervisor.id,
        department: 'Mathematics',
        specializations: ['Statistics'],
        maxStudents: 5,
      });

      const token = jwtService.sign({
        sub: emptySupervisor.id,
        email: emptySupervisor.email,
        role: emptySupervisor.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.students).toHaveLength(0);
      expect(response.body.totalStudents).toBe(0);
    });

    it('should validate query parameters', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      // Test invalid confidence range
      await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/common-questions')
        .query({ minConfidence: 1.5 }) // Invalid: > 1.0
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      // Test invalid limit
      await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/escalations')
        .query({ limit: 150 }) // Invalid: > 100
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('Performance and Pagination', () => {
    it('should handle pagination for large datasets', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/student-interactions')
        .query({ limit: 1, offset: 0 })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.students.length).toBeLessThanOrEqual(1);
    });

    it('should handle date range filtering', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/supervisor/common-questions')
        .query({
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('questions');
    });
  });
});
