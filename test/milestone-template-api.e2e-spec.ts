import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { MilestoneTemplate } from '../src/entities/milestone-template.entity';
import { UserRole } from '../src/entities/user.entity';
import { Priority, ProjectType } from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Milestone Template API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let studentUser: User;
  let supervisorUser: User;
  let adminUser: User;
  let testTemplate: MilestoneTemplate;
  let studentToken: string;
  let supervisorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Clean up database
    await dataSource.synchronize(true);

    // Create test users
    await createTestUsers();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up templates before each test
    await dataSource.getRepository(MilestoneTemplate).delete({});
    await createTestTemplate();
  });

  describe('GET /templates', () => {
    beforeEach(async () => {
      await createMultipleTestTemplates();
    });

    it('should get templates with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('totalPages');
      expect(response.body).toHaveProperty('hasNext');
      expect(response.body).toHaveProperty('hasPrevious');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });

    it('should filter templates by specialization', async () => {
      const response = await request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ specialization: 'Computer Science' })
        .expect(200);

      expect(response.body.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            specialization: 'Computer Science',
          }),
        ]),
      );
    });

    it('should filter templates by project type', async () => {
      const response = await request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ projectType: ProjectType.INDIVIDUAL })
        .expect(200);

      expect(response.body.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            projectType: ProjectType.INDIVIDUAL,
          }),
        ]),
      );
    });

    it('should search templates by name and description', async () => {
      const response = await request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ search: 'AI' })
        .expect(200);

      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should filter by active status', async () => {
      const response = await request(app.getHttpServer())
        .get('/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ isActive: true })
        .expect(200);

      expect(response.body.templates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            isActive: true,
          }),
        ]),
      );
    });
  });

  describe('GET /templates/:id', () => {
    it('should get template by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.id).toBe(testTemplate.id);
      expect(response.body.name).toBe(testTemplate.name);
      expect(response.body.milestoneItems).toBeDefined();
      expect(Array.isArray(response.body.milestoneItems)).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app.getHttpServer())
        .get(`/templates/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/templates/invalid-uuid')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });
  });

  describe('POST /templates', () => {
    it('should create template as supervisor', async () => {
      const createTemplateDto = {
        name: 'New AI Template',
        description: 'A new template for AI projects',
        specialization: 'Artificial Intelligence',
        projectType: ProjectType.INDIVIDUAL,
        estimatedDurationWeeks: 20,
        milestoneItems: [
          {
            title: 'Research Phase',
            description: 'Initial research and planning',
            daysFromStart: 7,
            priority: Priority.HIGH,
            estimatedHours: 30,
            tags: ['research'],
          },
          {
            title: 'Implementation',
            description: 'Core implementation phase',
            daysFromStart: 60,
            priority: Priority.HIGH,
            estimatedHours: 80,
            tags: ['development'],
          },
        ],
        tags: ['ai', 'machine-learning'],
      };

      const response = await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(createTemplateDto)
        .expect(201);

      expect(response.body.name).toBe(createTemplateDto.name);
      expect(response.body.specialization).toBe(
        createTemplateDto.specialization,
      );
      expect(response.body.milestoneItems).toHaveLength(2);
      expect(response.body.isActive).toBe(true);
      expect(response.body.usageCount).toBe(0);
    });

    it('should create template as admin', async () => {
      const createTemplateDto = {
        name: 'Admin Template',
        description: 'A template created by admin',
        specialization: 'Software Engineering',
        projectType: ProjectType.GROUP,
        estimatedDurationWeeks: 16,
        milestoneItems: [
          {
            title: 'Planning',
            description: 'Project planning phase',
            daysFromStart: 7,
            priority: Priority.MEDIUM,
            estimatedHours: 20,
            tags: ['planning'],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createTemplateDto)
        .expect(201);

      expect(response.body.name).toBe(createTemplateDto.name);
    });

    it('should reject template creation by student', async () => {
      const createTemplateDto = {
        name: 'Student Template',
        description: 'This should fail',
        specialization: 'Computer Science',
        projectType: ProjectType.INDIVIDUAL,
        estimatedDurationWeeks: 16,
        milestoneItems: [],
      };

      await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createTemplateDto)
        .expect(403);
    });

    it('should validate template data', async () => {
      const invalidTemplate = {
        name: 'A', // Too short
        description: 'Short', // Too short
        specialization: '',
        projectType: 'INVALID_TYPE',
        estimatedDurationWeeks: 0, // Invalid
        milestoneItems: [], // Empty
      };

      await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(invalidTemplate)
        .expect(400);
    });

    it('should reject duplicate template names in same specialization', async () => {
      const createTemplateDto = {
        name: testTemplate.name, // Same name as existing template
        description: 'Different description',
        specialization: testTemplate.specialization, // Same specialization
        projectType: ProjectType.INDIVIDUAL,
        estimatedDurationWeeks: 16,
        milestoneItems: [
          {
            title: 'Test Milestone',
            description: 'Test description',
            daysFromStart: 7,
            priority: Priority.MEDIUM,
            estimatedHours: 20,
          },
        ],
      };

      await request(app.getHttpServer())
        .post('/templates')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(createTemplateDto)
        .expect(400);
    });
  });

  describe('PUT /templates/:id', () => {
    it('should update template by creator', async () => {
      const updateDto = {
        name: 'Updated Template Name',
        description: 'Updated description',
        estimatedDurationWeeks: 18,
      };

      const response = await request(app.getHttpServer())
        .put(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
      expect(response.body.description).toBe(updateDto.description);
      expect(response.body.estimatedDurationWeeks).toBe(
        updateDto.estimatedDurationWeeks,
      );
    });

    it('should update template by admin', async () => {
      const updateDto = {
        name: 'Admin Updated Template',
      };

      const response = await request(app.getHttpServer())
        .put(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
    });

    it('should reject update by non-creator supervisor', async () => {
      // Create another supervisor
      const anotherSupervisor = dataSource.getRepository(User).create({
        email: 'another@test.com',
        name: 'Another Supervisor',
        role: UserRole.SUPERVISOR,
        isEmailVerified: true,
      });
      await dataSource.getRepository(User).save(anotherSupervisor);

      const anotherToken = jwtService.sign({
        sub: anotherSupervisor.id,
        email: anotherSupervisor.email,
        role: anotherSupervisor.role,
      });

      const updateDto = {
        name: 'Unauthorized Update',
      };

      await request(app.getHttpServer())
        .put(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send(updateDto)
        .expect(403);
    });

    it('should reject update by student', async () => {
      const updateDto = {
        name: 'Student Update',
      };

      await request(app.getHttpServer())
        .put(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateDto)
        .expect(403);
    });
  });

  describe('DELETE /templates/:id', () => {
    it('should delete unused template by creator', async () => {
      await request(app.getHttpServer())
        .delete(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(204);

      // Verify template is deleted
      await request(app.getHttpServer())
        .get(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    it('should delete template by admin', async () => {
      await request(app.getHttpServer())
        .delete(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);
    });

    it('should reject deletion of used template', async () => {
      // Simulate template usage
      testTemplate.usageCount = 5;
      await dataSource.getRepository(MilestoneTemplate).save(testTemplate);

      await request(app.getHttpServer())
        .delete(`/templates/${testTemplate.id}`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(400);
    });
  });

  describe('POST /templates/:id/archive', () => {
    it('should archive template', async () => {
      const response = await request(app.getHttpServer())
        .post(`/templates/${testTemplate.id}/archive`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });

  describe('POST /templates/:id/restore', () => {
    beforeEach(async () => {
      // Archive the template first
      testTemplate.isActive = false;
      await dataSource.getRepository(MilestoneTemplate).save(testTemplate);
    });

    it('should restore archived template', async () => {
      const response = await request(app.getHttpServer())
        .post(`/templates/${testTemplate.id}/restore`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(true);
    });
  });

  describe('POST /templates/:id/duplicate', () => {
    it('should duplicate template with new name', async () => {
      const duplicateDto = {
        newName: 'Duplicated Template',
      };

      const response = await request(app.getHttpServer())
        .post(`/templates/${testTemplate.id}/duplicate`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(duplicateDto)
        .expect(201);

      expect(response.body.name).toBe(duplicateDto.newName);
      expect(response.body.id).not.toBe(testTemplate.id);
      expect(response.body.milestoneItems).toEqual(testTemplate.milestoneItems);
      expect(response.body.usageCount).toBe(0);
    });

    it('should duplicate template with default name', async () => {
      const response = await request(app.getHttpServer())
        .post(`/templates/${testTemplate.id}/duplicate`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send({})
        .expect(201);

      expect(response.body.name).toBe(`${testTemplate.name} (Copy)`);
    });
  });

  describe('GET /templates/:id/usage-stats', () => {
    it('should get template usage statistics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/templates/${testTemplate.id}/usage-stats`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('templateId', testTemplate.id);
      expect(response.body).toHaveProperty('templateName', testTemplate.name);
      expect(response.body).toHaveProperty('totalUsages');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('ratingCount');
    });

    it('should reject usage stats request by student', async () => {
      await request(app.getHttpServer())
        .get(`/templates/${testTemplate.id}/usage-stats`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  // Helper functions
  async function createTestUsers() {
    const userRepo = dataSource.getRepository(User);

    studentUser = userRepo.create({
      email: 'student@test.com',
      name: 'Test Student',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });
    await userRepo.save(studentUser);

    supervisorUser = userRepo.create({
      email: 'supervisor@test.com',
      name: 'Test Supervisor',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });
    await userRepo.save(supervisorUser);

    adminUser = userRepo.create({
      email: 'admin@test.com',
      name: 'Test Admin',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });
    await userRepo.save(adminUser);

    // Generate JWT tokens
    studentToken = jwtService.sign({
      sub: studentUser.id,
      email: studentUser.email,
      role: studentUser.role,
    });
    supervisorToken = jwtService.sign({
      sub: supervisorUser.id,
      email: supervisorUser.email,
      role: supervisorUser.role,
    });
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });
  }

  async function createTestTemplate() {
    const templateRepo = dataSource.getRepository(MilestoneTemplate);

    testTemplate = templateRepo.create({
      name: 'Test Template',
      description: 'A test template for milestone testing',
      specialization: 'Computer Science',
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 16,
      milestoneItems: [
        {
          title: 'Literature Review',
          description: 'Complete literature review',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 40,
          tags: ['research'],
        },
        {
          title: 'Methodology',
          description: 'Define methodology',
          daysFromStart: 28,
          priority: Priority.MEDIUM,
          estimatedHours: 20,
          tags: ['planning'],
        },
      ],
      createdById: supervisorUser.id,
      tags: ['test', 'computer-science'],
    });
    await templateRepo.save(testTemplate);
  }

  async function createMultipleTestTemplates() {
    const templateRepo = dataSource.getRepository(MilestoneTemplate);

    const templates = [
      {
        name: 'AI Research Template',
        description: 'Template for AI research projects',
        specialization: 'Artificial Intelligence',
        projectType: ProjectType.INDIVIDUAL,
        estimatedDurationWeeks: 20,
        milestoneItems: [
          {
            title: 'AI Research',
            description: 'AI research phase',
            daysFromStart: 14,
            priority: Priority.HIGH,
            estimatedHours: 50,
            tags: ['ai', 'research'],
          },
        ],
        createdById: supervisorUser.id,
        tags: ['ai', 'research'],
      },
      {
        name: 'Web Development Template',
        description: 'Template for web development projects',
        specialization: 'Software Engineering',
        projectType: ProjectType.GROUP,
        estimatedDurationWeeks: 12,
        milestoneItems: [
          {
            title: 'Web Planning',
            description: 'Web project planning',
            daysFromStart: 7,
            priority: Priority.MEDIUM,
            estimatedHours: 30,
            tags: ['web', 'planning'],
          },
        ],
        createdById: supervisorUser.id,
        tags: ['web', 'development'],
      },
    ];

    for (const templateData of templates) {
      const template = templateRepo.create(templateData);
      await templateRepo.save(template);
    }
  }
});
