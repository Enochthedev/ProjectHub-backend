import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Milestone } from '../src/entities/milestone.entity';
import { MilestoneTemplate } from '../src/entities/milestone-template.entity';
import { Project } from '../src/entities/project.entity';
import { UserRole } from '../src/entities/user.entity';
import { MilestoneStatus, Priority, ProjectType } from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Milestone API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let studentUser: User;
  let supervisorUser: User;
  let adminUser: User;
  let testProject: Project;
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
    await createTestProject();
    await createTestTemplate();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up milestones before each test
    await dataSource.getRepository(Milestone).delete({});
  });

  describe('POST /milestones', () => {
    it('should create a milestone for student', async () => {
      const createMilestoneDto = {
        title: 'Literature Review',
        description:
          'Complete comprehensive literature review on machine learning',
        dueDate: '2024-06-15',
        priority: Priority.HIGH,
        estimatedHours: 40,
      };

      const response = await request(app.getHttpServer())
        .post('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createMilestoneDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createMilestoneDto.title,
        description: createMilestoneDto.description,
        priority: createMilestoneDto.priority,
        status: MilestoneStatus.NOT_STARTED,
        estimatedHours: createMilestoneDto.estimatedHours,
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.student).toBeDefined();
      expect(response.body.student.id).toBe(studentUser.id);
    });

    it('should reject milestone with past due date', async () => {
      const createMilestoneDto = {
        title: 'Past Milestone',
        description: 'This should fail',
        dueDate: '2023-01-01',
        priority: Priority.MEDIUM,
      };

      await request(app.getHttpServer())
        .post('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createMilestoneDto)
        .expect(400);
    });

    it('should reject milestone creation by non-student', async () => {
      const createMilestoneDto = {
        title: 'Supervisor Milestone',
        description: 'This should fail',
        dueDate: '2024-06-15',
        priority: Priority.MEDIUM,
      };

      await request(app.getHttpServer())
        .post('/milestones')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .send(createMilestoneDto)
        .expect(403);
    });

    it('should validate required fields', async () => {
      const invalidMilestone = {
        title: 'A', // Too short
        description: 'Short', // Too short
        dueDate: 'invalid-date',
        priority: 'INVALID_PRIORITY',
      };

      await request(app.getHttpServer())
        .post('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(invalidMilestone)
        .expect(400);
    });
  });

  describe('GET /milestones', () => {
    beforeEach(async () => {
      // Create test milestones
      await createTestMilestones();
    });

    it('should get milestones for student with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('milestones');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.milestones)).toBe(true);
    });

    it('should filter milestones by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ status: MilestoneStatus.NOT_STARTED })
        .expect(200);

      expect(response.body.milestones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            status: MilestoneStatus.NOT_STARTED,
          }),
        ]),
      );
    });

    it('should filter milestones by priority', async () => {
      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ priority: Priority.HIGH })
        .expect(200);

      expect(response.body.milestones).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            priority: Priority.HIGH,
          }),
        ]),
      );
    });

    it('should search milestones by title and description', async () => {
      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ search: 'Literature' })
        .expect(200);

      expect(response.body.milestones.length).toBeGreaterThan(0);
      expect(response.body.milestones[0].title).toContain('Literature');
    });
  });

  describe('GET /milestones/:id', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    it('should get milestone by id for owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/milestones/${testMilestone.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.id).toBe(testMilestone.id);
      expect(response.body.title).toBe(testMilestone.title);
    });

    it('should return 404 for non-existent milestone', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      await request(app.getHttpServer())
        .get(`/milestones/${fakeId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    it('should return 400 for invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/milestones/invalid-uuid')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });
  });

  describe('PUT /milestones/:id', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    it('should update milestone for owner', async () => {
      const updateDto = {
        title: 'Updated Literature Review',
        description: 'Updated description for literature review',
        priority: Priority.CRITICAL,
      };

      const response = await request(app.getHttpServer())
        .put(`/milestones/${testMilestone.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.title).toBe(updateDto.title);
      expect(response.body.description).toBe(updateDto.description);
      expect(response.body.priority).toBe(updateDto.priority);
    });

    it('should reject update with past due date', async () => {
      const updateDto = {
        dueDate: '2023-01-01',
      };

      await request(app.getHttpServer())
        .put(`/milestones/${testMilestone.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(updateDto)
        .expect(400);
    });
  });

  describe('PATCH /milestones/:id/status', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    it('should update milestone status', async () => {
      const statusDto = {
        status: MilestoneStatus.IN_PROGRESS,
        notes: 'Started working on literature review',
      };

      const response = await request(app.getHttpServer())
        .patch(`/milestones/${testMilestone.id}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(statusDto)
        .expect(200);

      expect(response.body.status).toBe(statusDto.status);
    });

    it('should require blocking reason for blocked status', async () => {
      const statusDto = {
        status: MilestoneStatus.BLOCKED,
        // Missing blockingReason
      };

      await request(app.getHttpServer())
        .patch(`/milestones/${testMilestone.id}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(statusDto)
        .expect(400);
    });

    it('should update completion date when completed', async () => {
      const statusDto = {
        status: MilestoneStatus.COMPLETED,
        actualHours: 35,
        notes: 'Literature review completed successfully',
      };

      const response = await request(app.getHttpServer())
        .patch(`/milestones/${testMilestone.id}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(statusDto)
        .expect(200);

      expect(response.body.status).toBe(MilestoneStatus.COMPLETED);
      expect(response.body.actualHours).toBe(35);
      expect(response.body.completedAt).toBeDefined();
    });
  });

  describe('POST /milestones/:id/notes', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    it('should add note to milestone', async () => {
      const noteDto = {
        content: 'Found 15 relevant papers on machine learning in education',
        type: 'progress',
      };

      const response = await request(app.getHttpServer())
        .post(`/milestones/${testMilestone.id}/notes`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(noteDto)
        .expect(201);

      expect(response.body.content).toBe(noteDto.content);
      expect(response.body.type).toBe(noteDto.type);
      expect(response.body.author).toBeDefined();
      expect(response.body.author.id).toBe(studentUser.id);
    });

    it('should validate note content length', async () => {
      const noteDto = {
        content: 'Short', // Too short
        type: 'progress',
      };

      await request(app.getHttpServer())
        .post(`/milestones/${testMilestone.id}/notes`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send(noteDto)
        .expect(400);
    });
  });

  describe('GET /milestones/:id/progress', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    it('should get detailed milestone progress', async () => {
      const response = await request(app.getHttpServer())
        .get(`/milestones/${testMilestone.id}/progress`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('milestone');
      expect(response.body).toHaveProperty('progressPercentage');
      expect(response.body).toHaveProperty('daysUntilDue');
      expect(response.body).toHaveProperty('isOverdue');
      expect(response.body).toHaveProperty('timeSpent');
      expect(response.body).toHaveProperty('estimatedTimeRemaining');
      expect(response.body).toHaveProperty('recentNotes');
    });
  });

  describe('GET /milestones/progress/overview', () => {
    beforeEach(async () => {
      await createTestMilestones();
    });

    it('should get project progress overview', async () => {
      const response = await request(app.getHttpServer())
        .get('/milestones/progress/overview')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('overallProgress');
      expect(response.body).toHaveProperty('totalMilestones');
      expect(response.body).toHaveProperty('completedMilestones');
      expect(response.body).toHaveProperty('inProgressMilestones');
      expect(response.body).toHaveProperty('blockedMilestones');
      expect(response.body).toHaveProperty('overdueMilestones');
      expect(response.body).toHaveProperty('milestones');
      expect(Array.isArray(response.body.milestones)).toBe(true);
    });
  });

  describe('POST /milestones/apply-template', () => {
    it('should apply template and create milestones', async () => {
      const applyDto = {
        templateId: testTemplate.id,
        startDate: '2024-03-01',
        projectId: testProject.id,
      };

      const response = await request(app.getHttpServer())
        .post('/milestones/apply-template')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(applyDto)
        .expect(201);

      expect(response.body).toHaveProperty('milestones');
      expect(response.body).toHaveProperty('templateId', testTemplate.id);
      expect(response.body).toHaveProperty('totalMilestones');
      expect(Array.isArray(response.body.milestones)).toBe(true);
      expect(response.body.milestones.length).toBeGreaterThan(0);
    });

    it('should reject template application with past start date', async () => {
      const applyDto = {
        templateId: testTemplate.id,
        startDate: '2023-01-01',
      };

      await request(app.getHttpServer())
        .post('/milestones/apply-template')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(applyDto)
        .expect(400);
    });
  });

  describe('POST /milestones/preview-template', () => {
    it('should preview template application', async () => {
      const applyDto = {
        templateId: testTemplate.id,
        startDate: '2024-03-01',
      };

      const response = await request(app.getHttpServer())
        .post('/milestones/preview-template')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(applyDto)
        .expect(200);

      expect(response.body).toHaveProperty('preview');
      expect(response.body).toHaveProperty('templateId', testTemplate.id);
      expect(response.body).toHaveProperty('conflicts');
      expect(Array.isArray(response.body.preview)).toBe(true);
      expect(Array.isArray(response.body.conflicts)).toBe(true);
    });
  });

  describe('DELETE /milestones/:id', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    it('should delete milestone for owner', async () => {
      await request(app.getHttpServer())
        .delete(`/milestones/${testMilestone.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(204);

      // Verify milestone is deleted
      await request(app.getHttpServer())
        .get(`/milestones/${testMilestone.id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
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

  async function createTestProject() {
    const projectRepo = dataSource.getRepository(Project);

    testProject = projectRepo.create({
      title: 'Test Project',
      description: 'A test project for milestone testing',
      specialization: 'Computer Science',
      supervisorId: supervisorUser.id,
      year: 2024,
      status: 'approved',
    });
    await projectRepo.save(testProject);
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
    });
    await templateRepo.save(testTemplate);
  }

  async function createTestMilestones() {
    const milestoneRepo = dataSource.getRepository(Milestone);

    const milestones = [
      {
        title: 'Literature Review',
        description: 'Complete comprehensive literature review',
        dueDate: new Date('2024-06-15'),
        priority: Priority.HIGH,
        status: MilestoneStatus.NOT_STARTED,
        studentId: studentUser.id,
        estimatedHours: 40,
      },
      {
        title: 'Methodology Design',
        description: 'Design research methodology',
        dueDate: new Date('2024-07-01'),
        priority: Priority.MEDIUM,
        status: MilestoneStatus.IN_PROGRESS,
        studentId: studentUser.id,
        estimatedHours: 20,
      },
    ];

    for (const milestoneData of milestones) {
      const milestone = milestoneRepo.create(milestoneData);
      await milestoneRepo.save(milestone);
    }
  }

  async function createSingleTestMilestone(): Promise<Milestone> {
    const milestoneRepo = dataSource.getRepository(Milestone);

    const milestone = milestoneRepo.create({
      title: 'Test Milestone',
      description: 'A test milestone for individual testing',
      dueDate: new Date('2024-06-15'),
      priority: Priority.MEDIUM,
      status: MilestoneStatus.NOT_STARTED,
      studentId: studentUser.id,
      estimatedHours: 30,
    });

    return await milestoneRepo.save(milestone);
  }
});
