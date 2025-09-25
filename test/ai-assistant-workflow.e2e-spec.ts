import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { ConversationMessage } from '../src/entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../src/entities/knowledge-base-entry.entity';
import { Project } from '../src/entities/project.entity';
import { MessageRating } from '../src/entities/message-rating.entity';
import { Milestone } from '../src/entities/milestone.entity';
import {
  UserRole,
  ConversationStatus,
  MessageType,
  MessageStatus,
  ContentType,
  MilestoneStatus,
  DifficultyLevel,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

// Mock external services for controlled workflow testing
jest.mock('@huggingface/inference', () => ({
  HfInference: jest.fn().mockImplementation(() => ({
    questionAnswering: jest.fn(),
    featureExtraction: jest.fn(),
  })),
}));

describe('AI Assistant Complete Workflow Tests (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let conversationRepository: Repository<Conversation>;
  let messageRepository: Repository<ConversationMessage>;
  let knowledgeRepository: Repository<KnowledgeBaseEntry>;
  let projectRepository: Repository<Project>;
  let ratingRepository: Repository<MessageRating>;
  let milestoneRepository: Repository<Milestone>;
  let jwtService: JwtService;

  let testUser: User;
  let testSupervisor: User;
  let testProject: Project;
  let testMilestones: Milestone[] = [];
  let authToken: string;
  let supervisorToken: string;
  let mockHfInference: any;

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
    ratingRepository = moduleFixture.get<Repository<MessageRating>>(
      getRepositoryToken(MessageRating),
    );
    milestoneRepository = moduleFixture.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
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
    await milestoneRepository.delete({});
    await knowledgeRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});

    // Reset mocks
    jest.clearAllMocks();

    // Create test supervisor
    testSupervisor = userRepository.create({
      email: 'supervisor@example.com',
      password: 'hashedpassword',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });
    testSupervisor = await userRepository.save(testSupervisor);

    // Create test student
    testUser = userRepository.create({
      email: 'student@example.com',
      password: 'hashedpassword',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
    testUser = await userRepository.save(testUser);

    // Create comprehensive test project
    testProject = projectRepository.create({
      title: 'AI-Powered Educational Platform',
      abstract:
        'Development of an AI-powered platform for personalized learning experiences that adapts to individual learning styles and provides personalized content recommendations.',
      supervisorId: testSupervisor.id,
      specialization: 'Artificial Intelligence & Machine Learning',
      technologyStack: [
        'Python',
        'TensorFlow',
        'React',
        'Node.js',
        'PostgreSQL',
      ],
      difficultyLevel: DifficultyLevel.ADVANCED,
      year: 2024,
    });
    testProject = await projectRepository.save(testProject);

    // Create project milestones
    const milestoneData = [
      {
        title: 'Literature Review Completion',
        description:
          'Complete comprehensive literature review on AI in education',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        status: MilestoneStatus.IN_PROGRESS,
        priority: 'high',
      },
      {
        title: 'System Architecture Design',
        description:
          'Design and document system architecture and technical specifications',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
        status: MilestoneStatus.NOT_STARTED,
        priority: 'high',
      },
      {
        title: 'Prototype Development',
        description: 'Develop initial prototype with core ML algorithms',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
        status: MilestoneStatus.NOT_STARTED,
        priority: 'medium',
      },
      {
        title: 'User Testing Phase',
        description: 'Conduct user testing and gather feedback',
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 1.5 months from now
        status: MilestoneStatus.NOT_STARTED,
        priority: 'medium',
      },
    ];

    for (const milestone of milestoneData) {
      const created = milestoneRepository.create({
        ...milestone,
        projectId: testProject.id,
        studentId: testUser.id,
      });
      const saved = await milestoneRepository.save(created);
      testMilestones.push(saved);
    }

    // Create comprehensive knowledge base
    const knowledgeEntries = [
      {
        title: 'Literature Review Best Practices',
        content:
          'A literature review is a comprehensive survey of scholarly sources on a specific topic. It provides an overview of current knowledge, identifies gaps, and establishes the theoretical foundation for research. Best practices include: systematic search strategies, critical analysis of sources, proper citation, and clear organization of findings.',
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
          'sources',
          'analysis',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },
      {
        title: 'AI and Machine Learning Project Guidelines',
        content:
          'AI and ML projects require careful consideration of data quality, model selection, evaluation metrics, and ethical implications. Key phases include: problem definition, data collection and preprocessing, model development and training, evaluation and validation, deployment considerations, and ongoing monitoring.',
        category: 'ai_ml',
        tags: [
          'artificial_intelligence',
          'machine_learning',
          'project_management',
          'methodology',
        ],
        keywords: [
          'AI',
          'ML',
          'machine learning',
          'data',
          'model',
          'evaluation',
          'ethics',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },
      {
        title: 'System Architecture Documentation',
        content:
          'System architecture documentation should include: high-level system overview, component diagrams, data flow diagrams, technology stack justification, scalability considerations, security measures, and deployment architecture. Use standard notation like UML for consistency.',
        category: 'technical_documentation',
        tags: [
          'architecture',
          'documentation',
          'system_design',
          'technical_writing',
        ],
        keywords: [
          'architecture',
          'system',
          'design',
          'documentation',
          'UML',
          'components',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },
      {
        title: 'User Testing and Evaluation Methods',
        content:
          'User testing involves systematic evaluation of system usability and effectiveness. Methods include: usability testing, A/B testing, user interviews, surveys, analytics analysis, and heuristic evaluation. Plan testing early, recruit representative users, and document findings systematically.',
        category: 'user_experience',
        tags: ['user_testing', 'evaluation', 'usability', 'UX', 'methodology'],
        keywords: [
          'user',
          'testing',
          'usability',
          'evaluation',
          'UX',
          'feedback',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      },
    ];

    for (const entry of knowledgeEntries) {
      const knowledgeEntry = knowledgeRepository.create({
        ...entry,
        createdById: testSupervisor.id,
      });
      await knowledgeRepository.save(knowledgeEntry);
    }

    // Generate auth tokens
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
    supervisorToken = jwtService.sign({
      sub: testSupervisor.id,
      email: testSupervisor.email,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete FYP Guidance Workflow', () => {
    it('should guide student through complete literature review process', async () => {
      // Mock AI responses for literature review guidance
      const literatureReviewResponses = [
        {
          answer:
            'A literature review is a comprehensive survey of scholarly sources on your AI in education topic. It should systematically examine existing research, identify gaps, and establish theoretical foundations for your project.',
          score: 0.92,
        },
        {
          answer:
            'For AI in education research, focus on recent papers (last 5-7 years) from top-tier conferences like AIED, EDM, and journals like Computers & Education. Use databases like IEEE Xplore, ACM Digital Library, and Google Scholar.',
          score: 0.89,
        },
        {
          answer:
            'Organize your literature review thematically: 1) AI techniques in education, 2) Personalized learning systems, 3) Learning analytics, 4) Evaluation methods. Within each theme, discuss key findings and limitations.',
          score: 0.87,
        },
        {
          answer:
            "Your literature review should be 15-20 pages for a master's project. Include 40-60 high-quality sources, with emphasis on peer-reviewed papers. Ensure proper citation using your institution's preferred style.",
          score: 0.85,
        },
      ];

      const literatureQuestions = [
        'I need to start my literature review for my AI education project. What should I focus on?',
        'Where can I find the best sources for AI in education research?',
        'How should I organize my literature review?',
        'How long should my literature review be and how many sources should I include?',
      ];

      // Create conversation for literature review guidance
      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Literature Review Guidance',
          projectId: testProject.id,
          language: 'en',
        })
        .expect(201);

      const conversationId = conversationResponse.body.id;

      // Process literature review questions
      for (let i = 0; i < literatureQuestions.length; i++) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          literatureReviewResponses[i],
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: literatureQuestions[i],
            conversationId,
            includeProjectContext: true,
          })
          .expect(200);

        expect(response.body.fromAI).toBe(true);
        expect(response.body.confidenceScore).toBeGreaterThan(0.8);
        expect(response.body.contextUsed.projectInfo).toBe(true);
        expect(response.body.sources).toContain('Project Context');

        // Bookmark important responses
        if (i === 1 || i === 2) {
          // Bookmark source finding and organization guidance
          const messages = await messageRepository.find({
            where: { conversationId, type: MessageType.AI_RESPONSE },
            order: { createdAt: 'DESC' },
            take: 1,
          });

          await request(app.getHttpServer())
            .post(`/ai-assistant/messages/${messages[0].id}/bookmark`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              note: `Important guidance for ${i === 1 ? 'finding sources' : 'organizing literature review'}`,
            })
            .expect(200);
        }

        // Rate responses
        const messages = await messageRepository.find({
          where: { conversationId, type: MessageType.AI_RESPONSE },
          order: { createdAt: 'DESC' },
          take: 1,
        });

        await request(app.getHttpServer())
          .post(`/ai-assistant/messages/${messages[0].id}/rate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rating: 4.5 + i * 0.1, // Varying ratings
            feedback: `Very helpful guidance on ${literatureQuestions[i].toLowerCase()}`,
          })
          .expect(200);
      }

      // Verify conversation context was built properly
      const contextResponse = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${conversationId}/context`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(contextResponse.body.recentTopics).toContain('literature review');
      expect(contextResponse.body.keyTerms).toContain('AI');
      expect(contextResponse.body.conversationSummary).toContain(
        'literature review',
      );
    });

    it('should provide milestone-aware guidance with urgency handling', async () => {
      // Update first milestone to be overdue
      await milestoneRepository.update(testMilestones[0].id, {
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: MilestoneStatus.OVERDUE,
      });

      mockHfInference.questionAnswering.mockResolvedValue({
        answer:
          'Given your overdue literature review milestone, I recommend prioritizing completion immediately. Focus on key papers in AI education, create a structured outline, and set daily writing targets.',
        score: 0.88,
      });

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What should I prioritize in my project right now?',
          projectId: testProject.id,
          includeProjectContext: true,
        })
        .expect(200);

      expect(response.body.response).toContain('overdue');
      expect(response.body.response).toContain('literature review');
      expect(response.body.metadata.requiresHumanReview).toBe(false);
      expect(response.body.suggestedFollowUps).toContain(
        expect.stringMatching(/milestone|deadline|priority/i),
      );
    });

    it('should handle technical implementation guidance workflow', async () => {
      const technicalResponses = [
        {
          answer:
            'For your AI education platform, consider a microservices architecture with: 1) User management service, 2) Content recommendation engine, 3) Learning analytics service, 4) Frontend React application. Use Docker for containerization and PostgreSQL for data persistence.',
          score: 0.91,
        },
        {
          answer:
            'For the ML recommendation system, implement collaborative filtering combined with content-based filtering. Use TensorFlow/Keras for model development. Consider user behavior data, content features, and learning outcomes as input features.',
          score: 0.89,
        },
        {
          answer:
            'Implement proper data preprocessing: handle missing values, normalize features, create train/validation/test splits (70/15/15). Use techniques like SMOTE for class imbalance if needed. Ensure data privacy compliance.',
          score: 0.86,
        },
        {
          answer:
            'For evaluation, use metrics like precision@k, recall@k, NDCG for recommendations. For learning outcomes, track engagement metrics, completion rates, and learning gains. Implement A/B testing framework for continuous improvement.',
          score: 0.88,
        },
      ];

      const technicalQuestions = [
        'What architecture should I use for my AI education platform?',
        'How should I implement the machine learning recommendation system?',
        'What data preprocessing steps are important for my ML models?',
        'How should I evaluate the effectiveness of my AI system?',
      ];

      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Technical Implementation Guidance',
          projectId: testProject.id,
          language: 'en',
        })
        .expect(201);

      const conversationId = conversationResponse.body.id;

      for (let i = 0; i < technicalQuestions.length; i++) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          technicalResponses[i],
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: technicalQuestions[i],
            conversationId,
            includeProjectContext: true,
          })
          .expect(200);

        expect(response.body.fromAI).toBe(true);
        expect(response.body.contextUsed.projectInfo).toBe(true);
        expect(response.body.response).toMatch(
          /TensorFlow|React|PostgreSQL|architecture|ML/i,
        );

        // Verify technical context is maintained
        if (i > 0) {
          expect(response.body.contextUsed.conversationHistory).toBe(true);
        }
      }
    });

    it('should handle multilingual student interaction workflow', async () => {
      const multilingualResponses = [
        {
          answer:
            'Una revisión de literatura es un análisis comprensivo de fuentes académicas sobre tu tema de IA en educación. Debe examinar sistemáticamente la investigación existente e identificar brechas.',
          score: 0.85,
        },
        {
          answer:
            "Pour votre projet d'IA éducative, concentrez-vous sur les articles récents des conférences AIED et EDM. Utilisez des bases de données comme IEEE Xplore et ACM Digital Library.",
          score: 0.82,
        },
        {
          answer:
            'For your AI education project architecture, I recommend using microservices with React frontend and TensorFlow for ML components, as discussed in our previous conversation.',
          score: 0.88,
        },
      ];

      const multilingualQuestions = [
        {
          query: '¿Qué es una revisión de literatura para mi proyecto de IA?',
          language: 'es',
        },
        {
          query:
            "Où puis-je trouver des sources pour mon projet d'IA éducative?",
          language: 'fr',
        },
        {
          query: 'Can you summarize the technical recommendations in English?',
          language: 'en',
        },
      ];

      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Multilingual Project Guidance',
          projectId: testProject.id,
          language: 'en',
        })
        .expect(201);

      const conversationId = conversationResponse.body.id;

      for (let i = 0; i < multilingualQuestions.length; i++) {
        mockHfInference.questionAnswering.mockResolvedValueOnce(
          multilingualResponses[i],
        );

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: multilingualQuestions[i].query,
            conversationId,
            language: multilingualQuestions[i].language,
            includeProjectContext: true,
          })
          .expect(200);

        expect(response.body.metadata.language).toBe(
          multilingualQuestions[i].language,
        );
        expect(response.body.fromAI).toBe(true);

        // Context should be maintained across languages
        if (i > 0) {
          expect(response.body.contextUsed.conversationHistory).toBe(true);
        }
      }
    });
  });

  describe('Supervisor Monitoring and Analytics Workflow', () => {
    let studentConversation: string;
    let studentMessages: any[] = [];

    beforeEach(async () => {
      // Create student conversation with multiple interactions
      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Student Project Assistance',
          projectId: testProject.id,
          language: 'en',
        })
        .expect(201);

      studentConversation = conversationResponse.body.id;

      // Simulate student interactions
      const studentQueries = [
        "I'm struggling with my literature review methodology",
        'How do I implement the recommendation algorithm?',
        'What evaluation metrics should I use?',
        "I'm behind on my milestones, what should I prioritize?",
      ];

      for (const query of studentQueries) {
        mockHfInference.questionAnswering.mockResolvedValue({
          answer: `Helpful response to: ${query}`,
          score: 0.8,
        });

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query,
            conversationId: studentConversation,
            includeProjectContext: true,
          })
          .expect(200);

        studentMessages.push(response.body);
      }
    });

    it('should provide supervisor with student interaction overview', async () => {
      const response = await request(app.getHttpServer())
        .get('/supervisor/student-interactions')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({
          studentId: testUser.id,
          timeframe: '7d',
        })
        .expect(200);

      expect(response.body.totalInteractions).toBeGreaterThan(0);
      expect(response.body.commonTopics).toContain('literature review');
      expect(response.body.averageConfidence).toBeGreaterThan(0);
      expect(response.body.escalationNeeded).toBeDefined();
    });

    it('should identify common questions across students', async () => {
      const response = await request(app.getHttpServer())
        .get('/supervisor/common-questions')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({
          timeframe: '30d',
          minOccurrences: 1,
        })
        .expect(200);

      expect(response.body.questions).toBeInstanceOf(Array);
      expect(response.body.questions.length).toBeGreaterThan(0);

      const literatureQuestion = response.body.questions.find((q) =>
        q.topic.toLowerCase().includes('literature'),
      );
      expect(literatureQuestion).toBeDefined();
      expect(literatureQuestion.frequency).toBeGreaterThan(0);
    });

    it('should flag conversations requiring human intervention', async () => {
      // Create a conversation that should be escalated
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'I cannot provide specific guidance on this complex issue.',
        score: 0.2, // Low confidence
      });

      await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query:
            "I'm having serious personal issues affecting my project and don't know what to do",
          conversationId: studentConversation,
        })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/supervisor/escalations')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({
          status: 'pending',
        })
        .expect(200);

      expect(response.body.escalations).toBeInstanceOf(Array);
      const personalIssueEscalation = response.body.escalations.find(
        (e) =>
          e.reason.includes('low confidence') || e.reason.includes('personal'),
      );
      expect(personalIssueEscalation).toBeDefined();
    });
  });

  describe('Knowledge Base Management Workflow', () => {
    it('should allow admin to manage knowledge base content', async () => {
      // Create new knowledge base entry
      const newEntryResponse = await request(app.getHttpServer())
        .post('/admin/knowledge-base')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          title: 'Advanced ML Evaluation Techniques',
          content:
            'Advanced evaluation techniques for machine learning models include cross-validation, bootstrap sampling, statistical significance testing, and fairness metrics evaluation.',
          category: 'ai_ml_advanced',
          tags: ['machine_learning', 'evaluation', 'advanced', 'statistics'],
          keywords: [
            'evaluation',
            'cross-validation',
            'bootstrap',
            'fairness',
            'metrics',
          ],
          contentType: ContentType.GUIDELINE,
          language: 'en',
        })
        .expect(201);

      expect(newEntryResponse.body.title).toBe(
        'Advanced ML Evaluation Techniques',
      );

      // Update existing entry
      const entries = await knowledgeRepository.find({ take: 1 });
      const entryToUpdate = entries[0];

      const updateResponse = await request(app.getHttpServer())
        .put(`/admin/knowledge-base/${entryToUpdate.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({
          content:
            entryToUpdate.content +
            ' Updated with additional best practices and recent research findings.',
          tags: [...entryToUpdate.tags, 'updated'],
        })
        .expect(200);

      expect(updateResponse.body.content).toContain('Updated with additional');
      expect(updateResponse.body.tags).toContain('updated');

      // Verify updated content is used in AI responses
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Based on updated guidelines, here are the best practices...',
        score: 0.9,
      });

      const aiResponse = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'What are the best practices for literature review?',
        })
        .expect(200);

      expect(aiResponse.body.sources).toContain('FYP Guidelines');
    });

    it('should track knowledge base usage analytics', async () => {
      // Make several queries that would use knowledge base
      const knowledgeQueries = [
        'What is a literature review?',
        'How do I document system architecture?',
        'What are AI project guidelines?',
        'How do I conduct user testing?',
      ];

      for (const query of knowledgeQueries) {
        mockHfInference.questionAnswering.mockResolvedValue({
          answer: `Knowledge-based response to: ${query}`,
          score: 0.85,
        });

        await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ query })
          .expect(200);
      }

      // Get usage analytics
      const analyticsResponse = await request(app.getHttpServer())
        .get('/admin/knowledge-base/analytics')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .query({
          timeframe: '7d',
        })
        .expect(200);

      expect(analyticsResponse.body.totalQueries).toBeGreaterThan(0);
      expect(analyticsResponse.body.topCategories).toBeInstanceOf(Array);
      expect(analyticsResponse.body.averageRelevanceScore).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Fallback Workflows', () => {
    it('should handle AI service failures gracefully in complete workflow', async () => {
      // Simulate AI service failure
      mockHfInference.questionAnswering.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Fallback Testing Conversation',
          projectId: testProject.id,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/ask')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'How do I write a good literature review?',
          conversationId: conversationResponse.body.id,
          includeProjectContext: true,
        })
        .expect(200);

      // Should provide fallback response
      expect(response.body.fromAI).toBe(false);
      expect(response.body.response).toContain('not able to provide');
      expect(response.body.escalationSuggestion).toContain('supervisor');
      expect(response.body.suggestedFollowUps).toBeInstanceOf(Array);
      expect(response.body.suggestedFollowUps.length).toBeGreaterThan(0);

      // Should still maintain conversation context
      expect(response.body.conversationId).toBe(conversationResponse.body.id);
    });

    it('should handle rate limiting in extended conversation workflow', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Rate limiting test response',
        score: 0.8,
      });

      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Rate Limiting Test',
          projectId: testProject.id,
        })
        .expect(201);

      // Make requests up to rate limit
      const rateLimitPerMinute = 10;
      const responses = [];

      for (let i = 0; i < rateLimitPerMinute + 2; i++) {
        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Rate limit test question ${i}`,
            conversationId: conversationResponse.body.id,
          });

        responses.push(response);
      }

      // First 10 should succeed
      responses.slice(0, rateLimitPerMinute).forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Additional requests should be rate limited
      responses.slice(rateLimitPerMinute).forEach((response) => {
        expect(response.status).toBe(429);
        expect(response.body.message).toContain('Rate limit exceeded');
      });
    });

    it('should maintain data consistency during concurrent operations', async () => {
      mockHfInference.questionAnswering.mockResolvedValue({
        answer: 'Concurrent operation test response',
        score: 0.8,
      });

      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Concurrent Operations Test',
          projectId: testProject.id,
        })
        .expect(201);

      const conversationId = conversationResponse.body.id;

      // Perform concurrent operations
      const concurrentPromises = [
        // Ask questions
        request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Concurrent question 1',
            conversationId,
          }),

        request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: 'Concurrent question 2',
            conversationId,
          }),

        // Get messages
        request(app.getHttpServer())
          .get(`/ai-assistant/conversations/${conversationId}/messages`)
          .set('Authorization', `Bearer ${authToken}`),

        // Get context
        request(app.getHttpServer())
          .get(`/ai-assistant/conversations/${conversationId}/context`)
          .set('Authorization', `Bearer ${authToken}`),
      ];

      const results = await Promise.all(concurrentPromises);

      // All operations should succeed
      results.forEach((result) => {
        expect(result.status).toBe(200);
      });

      // Verify data consistency
      const finalMessages = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalMessages.body.messages.length).toBeGreaterThan(0);
      expect(finalMessages.body.total).toBe(finalMessages.body.messages.length);
    });
  });

  describe('Performance and Scalability Workflow', () => {
    it('should handle extended conversation sessions efficiently', async () => {
      mockHfInference.questionAnswering.mockImplementation((params) => {
        return Promise.resolve({
          answer: `Response to: ${params.inputs.question}`,
          score: 0.8,
        });
      });

      const conversationResponse = await request(app.getHttpServer())
        .post('/ai-assistant/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Extended Session Test',
          projectId: testProject.id,
        })
        .expect(201);

      const conversationId = conversationResponse.body.id;
      const sessionLength = 20; // 20 interactions
      const responseTimes = [];

      for (let i = 0; i < sessionLength; i++) {
        const startTime = Date.now();

        const response = await request(app.getHttpServer())
          .post('/ai-assistant/ask')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: `Extended session question ${i}: How do I improve my project methodology?`,
            conversationId,
            includeProjectContext: true,
          })
          .expect(200);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);

        expect(response.body.response).toBeDefined();
        expect(response.body.contextUsed.conversationHistory).toBe(i > 0);
      }

      // Performance should remain consistent
      const avgResponseTime =
        responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(avgResponseTime).toBeLessThan(5000); // Average under 5 seconds
      expect(maxResponseTime).toBeLessThan(15000); // Max under 15 seconds

      // Context should be maintained efficiently
      const finalContext = await request(app.getHttpServer())
        .get(`/ai-assistant/conversations/${conversationId}/context`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalContext.body.recentTopics.length).toBeGreaterThan(0);
      expect(finalContext.body.conversationSummary).toBeDefined();
    });
  });
});
