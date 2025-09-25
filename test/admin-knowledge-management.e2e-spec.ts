import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { KnowledgeBaseEntry } from '../src/entities/knowledge-base-entry.entity';
import { ResponseTemplate } from '../src/entities/response-template.entity';
import { UserRole, ContentType } from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Admin Knowledge Management (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let knowledgeRepository: Repository<KnowledgeBaseEntry>;
  let templateRepository: Repository<ResponseTemplate>;
  let jwtService: JwtService;

  let adminUser: User;
  let supervisorUser: User;
  let studentUser: User;
  let knowledgeEntry: KnowledgeBaseEntry;
  let responseTemplate: ResponseTemplate;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
    knowledgeRepository = moduleFixture.get<Repository<KnowledgeBaseEntry>>(
      getRepositoryToken(KnowledgeBaseEntry),
    );
    templateRepository = moduleFixture.get<Repository<ResponseTemplate>>(
      getRepositoryToken(ResponseTemplate),
    );
    jwtService = moduleFixture.get<JwtService>(JwtService);
  });

  beforeEach(async () => {
    // Clean up database
    await templateRepository.delete({});
    await knowledgeRepository.delete({});
    await userRepository.delete({});

    // Create test users
    adminUser = await userRepository.save({
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });

    supervisorUser = await userRepository.save({
      email: 'supervisor@test.com',
      firstName: 'Supervisor',
      lastName: 'User',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });

    studentUser = await userRepository.save({
      email: 'student@test.com',
      firstName: 'Student',
      lastName: 'User',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });

    // Create test knowledge entry
    knowledgeEntry = await knowledgeRepository.save({
      title: 'How to Write a Literature Review',
      content:
        'A literature review is a comprehensive analysis of existing research on a particular topic...',
      category: 'literature_review',
      tags: ['research', 'writing', 'academic'],
      keywords: ['literature', 'review', 'research', 'analysis'],
      contentType: ContentType.GUIDELINE,
      language: 'en',
      isActive: true,
      usageCount: 5,
      averageRating: 4.2,
      createdBy: adminUser,
    });

    // Create test response template
    responseTemplate = await templateRepository.save({
      name: 'Literature Review Help',
      template:
        'To write a literature review, you should: 1. {{step1}} 2. {{step2}} 3. {{step3}}',
      category: 'literature_review',
      triggerKeywords: ['literature review', 'research review', 'lit review'],
      variables: {
        step1: 'Search for relevant sources',
        step2: 'Analyze and synthesize findings',
        step3: 'Write a critical analysis',
      },
      language: 'en',
      isActive: true,
      usageCount: 3,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /ai-assistant/admin/knowledge', () => {
    it('should create a new knowledge entry', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const createDto = {
        title: 'How to Choose a Research Methodology',
        content:
          'Choosing the right research methodology is crucial for your FYP success. Consider these factors...',
        category: 'methodology',
        tags: ['research', 'methodology', 'planning'],
        keywords: [
          'methodology',
          'research design',
          'qualitative',
          'quantitative',
        ],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/admin/knowledge')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createDto.title);
      expect(response.body.content).toBe(createDto.content);
      expect(response.body.category).toBe(createDto.category);
      expect(response.body.isActive).toBe(true);
      expect(response.body.usageCount).toBe(0);
      expect(response.body.createdBy).toBe(adminUser.id);
    });

    it('should deny access to non-admin users', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      const createDto = {
        title: 'Test Entry',
        content: 'Test content for knowledge entry',
        category: 'test',
        tags: ['test'],
        keywords: ['test'],
        contentType: ContentType.GUIDELINE,
      };

      await request(app.getHttpServer())
        .post('/ai-assistant/admin/knowledge')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const invalidDto = {
        title: 'A', // Too short
        content: 'Short', // Too short
        // Missing required fields
      };

      await request(app.getHttpServer())
        .post('/ai-assistant/admin/knowledge')
        .set('Authorization', `Bearer ${token}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /ai-assistant/admin/knowledge', () => {
    it('should retrieve knowledge entries with pagination', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('entries');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.entries)).toBe(true);
      expect(response.body.entries.length).toBeGreaterThan(0);
      expect(response.body.total).toBeGreaterThan(0);
    });

    it('should filter by category', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge')
        .query({ category: 'literature_review' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.entries).toHaveLength(1);
      expect(response.body.entries[0].category).toBe('literature_review');
    });

    it('should search by content', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge')
        .query({ search: 'literature' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.entries.length).toBeGreaterThan(0);
      expect(response.body.entries[0].title).toContain('Literature');
    });
  });

  describe('PUT /ai-assistant/admin/knowledge/:id', () => {
    it('should update a knowledge entry', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const updateDto = {
        title: 'Updated Literature Review Guide',
        content: 'Updated content for literature review guidance...',
        isActive: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/ai-assistant/admin/knowledge/${knowledgeEntry.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.title).toBe(updateDto.title);
      expect(response.body.content).toBe(updateDto.content);
      expect(response.body.isActive).toBe(false);
    });

    it('should return 404 for non-existent entry', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .put(`/ai-assistant/admin/knowledge/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' })
        .expect(404);
    });
  });

  describe('DELETE /ai-assistant/admin/knowledge/:id', () => {
    it('should delete a knowledge entry', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      await request(app.getHttpServer())
        .delete(`/ai-assistant/admin/knowledge/${knowledgeEntry.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify entry is deleted
      const deletedEntry = await knowledgeRepository.findOne({
        where: { id: knowledgeEntry.id },
      });
      expect(deletedEntry).toBeNull();
    });
  });

  describe('POST /ai-assistant/admin/templates', () => {
    it('should create a new response template', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const createDto = {
        name: 'Methodology Help Template',
        template:
          'For methodology questions: {{methodology_type}} is suitable when {{conditions}}',
        category: 'methodology',
        triggerKeywords: ['methodology', 'research method', 'approach'],
        variables: {
          methodology_type: 'Qualitative research',
          conditions: 'exploring subjective experiences',
        },
        language: 'en',
      };

      const response = await request(app.getHttpServer())
        .post('/ai-assistant/admin/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.template).toBe(createDto.template);
      expect(response.body.category).toBe(createDto.category);
      expect(response.body.isActive).toBe(true);
      expect(response.body.usageCount).toBe(0);
    });

    it('should deny access to non-admin users', async () => {
      const token = jwtService.sign({
        sub: studentUser.id,
        email: studentUser.email,
        role: studentUser.role,
      });

      const createDto = {
        name: 'Test Template',
        template: 'Test template content',
        category: 'test',
        triggerKeywords: ['test'],
      };

      await request(app.getHttpServer())
        .post('/ai-assistant/admin/templates')
        .set('Authorization', `Bearer ${token}`)
        .send(createDto)
        .expect(403);
    });
  });

  describe('GET /ai-assistant/admin/templates', () => {
    it('should retrieve response templates', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/admin/templates')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should filter templates by category', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/admin/templates')
        .query({ category: 'literature_review' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.templates).toHaveLength(1);
      expect(response.body.templates[0].category).toBe('literature_review');
    });
  });

  describe('GET /ai-assistant/admin/analytics', () => {
    it('should return content analytics', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      const response = await request(app.getHttpServer())
        .get('/ai-assistant/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalKnowledgeEntries');
      expect(response.body).toHaveProperty('activeKnowledgeEntries');
      expect(response.body).toHaveProperty('totalTemplates');
      expect(response.body).toHaveProperty('activeTemplates');
      expect(response.body).toHaveProperty('mostUsedKnowledge');
      expect(response.body).toHaveProperty('mostUsedTemplates');
      expect(response.body).toHaveProperty('categoryStats');
      expect(response.body).toHaveProperty('languageStats');
      expect(response.body).toHaveProperty('qualityMetrics');
      expect(response.body).toHaveProperty('usageTrends');

      expect(response.body.totalKnowledgeEntries).toBeGreaterThan(0);
      expect(response.body.totalTemplates).toBeGreaterThan(0);
      expect(Array.isArray(response.body.mostUsedKnowledge)).toBe(true);
      expect(Array.isArray(response.body.categoryStats)).toBe(true);
    });

    it('should deny access to non-admin users', async () => {
      const token = jwtService.sign({
        sub: supervisorUser.id,
        email: supervisorUser.email,
        role: supervisorUser.role,
      });

      await request(app.getHttpServer())
        .get('/ai-assistant/admin/analytics')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  describe('Authorization and Validation', () => {
    it('should require authentication for all admin endpoints', async () => {
      await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge')
        .expect(401);

      await request(app.getHttpServer())
        .post('/ai-assistant/admin/knowledge')
        .send({})
        .expect(401);

      await request(app.getHttpServer())
        .get('/ai-assistant/admin/analytics')
        .expect(401);
    });

    it('should validate UUID parameters', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge/invalid-uuid')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('should validate query parameters', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      // Test invalid limit
      await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge')
        .query({ limit: 150 }) // Over max limit
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      // Test invalid sort order
      await request(app.getHttpServer())
        .get('/ai-assistant/admin/knowledge')
        .query({ sortOrder: 'INVALID' })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });

  describe('Content Management Workflows', () => {
    it('should handle complete CRUD workflow for knowledge entries', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/ai-assistant/admin/knowledge')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test CRUD Entry',
          content: 'This is a test entry for CRUD operations testing.',
          category: 'test',
          tags: ['test', 'crud'],
          keywords: ['test', 'crud', 'operations'],
          contentType: ContentType.EXAMPLE,
        })
        .expect(201);

      const entryId = createResponse.body.id;

      // Read
      const readResponse = await request(app.getHttpServer())
        .get(`/ai-assistant/admin/knowledge/${entryId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(readResponse.body.title).toBe('Test CRUD Entry');

      // Update
      const updateResponse = await request(app.getHttpServer())
        .put(`/ai-assistant/admin/knowledge/${entryId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated CRUD Entry',
          isActive: false,
        })
        .expect(200);

      expect(updateResponse.body.title).toBe('Updated CRUD Entry');
      expect(updateResponse.body.isActive).toBe(false);

      // Delete
      await request(app.getHttpServer())
        .delete(`/ai-assistant/admin/knowledge/${entryId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/ai-assistant/admin/knowledge/${entryId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });

    it('should handle template management workflow', async () => {
      const token = jwtService.sign({
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });

      // Create template
      const createResponse = await request(app.getHttpServer())
        .post('/ai-assistant/admin/templates')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Template Workflow',
          template: 'This is a {{type}} template for {{purpose}}',
          category: 'test',
          triggerKeywords: ['test', 'workflow'],
          variables: { type: 'test', purpose: 'workflow testing' },
        })
        .expect(201);

      const templateId = createResponse.body.id;

      // Update template
      await request(app.getHttpServer())
        .put(`/ai-assistant/admin/templates/${templateId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Test Template',
          isActive: false,
        })
        .expect(200);

      // Delete template
      await request(app.getHttpServer())
        .delete(`/ai-assistant/admin/templates/${templateId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
