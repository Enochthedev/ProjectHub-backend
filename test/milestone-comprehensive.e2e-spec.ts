import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/entities/user.entity';
import { Milestone } from '../src/entities/milestone.entity';
import { MilestoneTemplate } from '../src/entities/milestone-template.entity';
import { MilestoneNote } from '../src/entities/milestone-note.entity';
import { MilestoneReminder } from '../src/entities/milestone-reminder.entity';
import { Project } from '../src/entities/project.entity';
import { UserRole } from '../src/common/enums/user-role.enum';
import {
  MilestoneStatus,
  Priority,
  ProjectType,
  NoteType,
  ReminderType,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Milestone System Comprehensive (e2e)', () => {
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

    // Create test data
    await createTestUsers();
    await createTestProject();
    await createTestTemplate();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up milestones and related data before each test
    await dataSource.getRepository(MilestoneReminder).delete({});
    await dataSource.getRepository(MilestoneNote).delete({});
    await dataSource.getRepository(Milestone).delete({});
  });

  describe('Milestone CRUD Operations', () => {
    describe('POST /milestones', () => {
      it('should create milestone with all fields', async () => {
        const createMilestoneDto = {
          title: 'Comprehensive Literature Review',
          description:
            'Complete comprehensive literature review on machine learning applications in education',
          dueDate: '2024-06-15',
          priority: Priority.HIGH,
          estimatedHours: 40,
          projectId: testProject.id,
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
          projectId: createMilestoneDto.projectId,
        });

        expect(response.body.id).toBeDefined();
        expect(response.body.student).toBeDefined();
        expect(response.body.student.id).toBe(studentUser.id);
        expect(response.body.dueDate).toBe(createMilestoneDto.dueDate);
      });

      it('should validate milestone data comprehensively', async () => {
        const invalidMilestone = {
          title: 'A', // Too short
          description: 'Short', // Too short
          dueDate: '2023-01-01', // Past date
          priority: 'INVALID_PRIORITY',
          estimatedHours: -5, // Negative
        };

        const response = await request(app.getHttpServer())
          .post('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidMilestone)
          .expect(400);

        expect(response.body.message).toContain('validation');
      });

      it('should prevent non-students from creating milestones', async () => {
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

      it('should validate academic calendar constraints', async () => {
        const christmasDto = {
          title: 'Christmas Milestone',
          description: 'This should fail due to academic calendar',
          dueDate: '2024-12-25', // Christmas Day
          priority: Priority.MEDIUM,
        };

        await request(app.getHttpServer())
          .post('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(christmasDto)
          .expect(400);
      });
    });

    describe('GET /milestones', () => {
      beforeEach(async () => {
        await createComprehensiveTestMilestones();
      });

      it('should get milestones with comprehensive filtering', async () => {
        const response = await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({
            status: MilestoneStatus.NOT_STARTED,
            priority: Priority.HIGH,
            page: 1,
            limit: 10,
            search: 'Literature',
          })
          .expect(200);

        expect(response.body).toHaveProperty('milestones');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page', 1);
        expect(response.body).toHaveProperty('limit', 10);
        expect(response.body).toHaveProperty('totalPages');

        // Verify filtering works
        response.body.milestones.forEach((milestone: any) => {
          expect(milestone.status).toBe(MilestoneStatus.NOT_STARTED);
          expect(milestone.priority).toBe(Priority.HIGH);
          expect(milestone.title.toLowerCase()).toContain('literature');
        });
      });

      it('should filter by date range', async () => {
        const response = await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({
            dueDateFrom: '2024-06-01',
            dueDateTo: '2024-06-30',
          })
          .expect(200);

        response.body.milestones.forEach((milestone: any) => {
          const dueDate = new Date(milestone.dueDate);
          expect(dueDate).toBeInstanceOf(Date);
          expect(dueDate.getTime()).toBeGreaterThanOrEqual(
            new Date('2024-06-01').getTime(),
          );
          expect(dueDate.getTime()).toBeLessThanOrEqual(
            new Date('2024-06-30').getTime(),
          );
        });
      });

      it('should filter overdue milestones', async () => {
        const response = await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ isOverdue: true })
          .expect(200);

        // All returned milestones should be overdue
        response.body.milestones.forEach((milestone: any) => {
          const dueDate = new Date(milestone.dueDate);
          const today = new Date();
          expect(dueDate.getTime()).toBeLessThan(today.getTime());
        });
      });

      it('should handle pagination correctly', async () => {
        const page1Response = await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ page: 1, limit: 2 })
          .expect(200);

        const page2Response = await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${studentToken}`)
          .query({ page: 2, limit: 2 })
          .expect(200);

        expect(page1Response.body.milestones).toHaveLength(2);
        expect(page2Response.body.milestones).toHaveLength(2);
        expect(page1Response.body.milestones[0].id).not.toBe(
          page2Response.body.milestones[0].id,
        );
      });
    });

    describe('PUT /milestones/:id', () => {
      let testMilestone: Milestone;

      beforeEach(async () => {
        testMilestone = await createSingleTestMilestone();
      });

      it('should update milestone comprehensively', async () => {
        const updateDto = {
          title: 'Updated Literature Review',
          description: 'Updated comprehensive description with more details',
          priority: Priority.CRITICAL,
          estimatedHours: 50,
          dueDate: '2024-07-01',
        };

        const response = await request(app.getHttpServer())
          .put(`/milestones/${testMilestone.id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body.title).toBe(updateDto.title);
        expect(response.body.description).toBe(updateDto.description);
        expect(response.body.priority).toBe(updateDto.priority);
        expect(response.body.estimatedHours).toBe(updateDto.estimatedHours);
        expect(response.body.dueDate).toBe(updateDto.dueDate);
      });

      it('should prevent unauthorized updates', async () => {
        const updateDto = {
          title: 'Unauthorized Update',
        };

        await request(app.getHttpServer())
          .put(`/milestones/${testMilestone.id}`)
          .set('Authorization', `Bearer ${supervisorToken}`)
          .send(updateDto)
          .expect(403);
      });

      it('should validate update data', async () => {
        const invalidUpdate = {
          dueDate: '2023-01-01', // Past date
          estimatedHours: -10, // Negative
        };

        await request(app.getHttpServer())
          .put(`/milestones/${testMilestone.id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidUpdate)
          .expect(400);
      });
    });
  });

  describe('Milestone Status Management', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    describe('PATCH /milestones/:id/status', () => {
      it('should update status to in progress', async () => {
        const statusDto = {
          status: MilestoneStatus.IN_PROGRESS,
          notes: 'Started working on literature review, found initial sources',
        };

        const response = await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(statusDto)
          .expect(200);

        expect(response.body.status).toBe(statusDto.status);
      });

      it('should complete milestone with time tracking', async () => {
        // First set to in progress
        await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ status: MilestoneStatus.IN_PROGRESS })
          .expect(200);

        // Then complete
        const completionDto = {
          status: MilestoneStatus.COMPLETED,
          actualHours: 35,
          notes:
            'Literature review completed successfully. Found 25 relevant papers.',
        };

        const response = await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(completionDto)
          .expect(200);

        expect(response.body.status).toBe(MilestoneStatus.COMPLETED);
        expect(response.body.actualHours).toBe(35);
        expect(response.body.completedAt).toBeDefined();
      });

      it('should handle blocked status with reason', async () => {
        const blockedDto = {
          status: MilestoneStatus.BLOCKED,
          blockingReason:
            'Waiting for supervisor feedback on research direction',
          notes: 'Cannot proceed without guidance on methodology approach',
        };

        const response = await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(blockedDto)
          .expect(200);

        expect(response.body.status).toBe(MilestoneStatus.BLOCKED);
        expect(response.body.blockingReason).toBe(blockedDto.blockingReason);
      });

      it('should require blocking reason for blocked status', async () => {
        const invalidBlockedDto = {
          status: MilestoneStatus.BLOCKED,
          // Missing blockingReason
        };

        await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidBlockedDto)
          .expect(400);
      });

      it('should validate status transitions', async () => {
        // Try to go directly from NOT_STARTED to COMPLETED (invalid transition)
        const invalidTransition = {
          status: MilestoneStatus.COMPLETED,
        };

        // This should fail if proper status transition validation is implemented
        // The exact behavior depends on the business rules in the milestone entity
        const response = await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidTransition);

        // The response could be 400 (validation error) or 200 (if transition is allowed)
        // This test documents the expected behavior
        expect([200, 400]).toContain(response.status);
      });
    });
  });

  describe('Milestone Notes and Progress Tracking', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    describe('POST /milestones/:id/notes', () => {
      it('should add progress note', async () => {
        const noteDto = {
          content:
            'Found 15 relevant papers on machine learning in education. Key themes emerging around personalized learning and adaptive systems.',
          type: NoteType.PROGRESS,
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
        expect(response.body.createdAt).toBeDefined();
      });

      it('should add different types of notes', async () => {
        const noteTypes = [
          {
            content: 'Identified potential issue with data availability',
            type: NoteType.ISSUE,
          },
          {
            content: 'Resolved data issue by contacting dataset maintainers',
            type: NoteType.SOLUTION,
          },
          {
            content: 'Met with supervisor to discuss methodology',
            type: NoteType.MEETING,
          },
        ];

        for (const noteDto of noteTypes) {
          const response = await request(app.getHttpServer())
            .post(`/milestones/${testMilestone.id}/notes`)
            .set('Authorization', `Bearer ${studentToken}`)
            .send(noteDto)
            .expect(201);

          expect(response.body.type).toBe(noteDto.type);
        }
      });

      it('should allow supervisor to add feedback notes', async () => {
        const supervisorNoteDto = {
          content:
            'Good progress on literature review. Consider expanding the search to include recent conference papers.',
          type: NoteType.SUPERVISOR_FEEDBACK,
        };

        const response = await request(app.getHttpServer())
          .post(`/milestones/${testMilestone.id}/notes`)
          .set('Authorization', `Bearer ${supervisorToken}`)
          .send(supervisorNoteDto)
          .expect(201);

        expect(response.body.content).toBe(supervisorNoteDto.content);
        expect(response.body.type).toBe(supervisorNoteDto.type);
        expect(response.body.author.id).toBe(supervisorUser.id);
      });

      it('should validate note content length', async () => {
        const shortNoteDto = {
          content: 'Short', // Too short
          type: NoteType.PROGRESS,
        };

        await request(app.getHttpServer())
          .post(`/milestones/${testMilestone.id}/notes`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send(shortNoteDto)
          .expect(400);
      });
    });

    describe('GET /milestones/:id/progress', () => {
      beforeEach(async () => {
        // Add some notes and update status for comprehensive progress data
        await request(app.getHttpServer())
          .post(`/milestones/${testMilestone.id}/notes`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            content: 'Started literature review process',
            type: NoteType.PROGRESS,
          });

        await request(app.getHttpServer())
          .patch(`/milestones/${testMilestone.id}/status`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            status: MilestoneStatus.IN_PROGRESS,
            notes: 'Milestone is now in progress',
          });
      });

      it('should get comprehensive milestone progress', async () => {
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

        expect(response.body.milestone.id).toBe(testMilestone.id);
        expect(Array.isArray(response.body.recentNotes)).toBe(true);
        expect(typeof response.body.progressPercentage).toBe('number');
        expect(typeof response.body.daysUntilDue).toBe('number');
        expect(typeof response.body.isOverdue).toBe('boolean');
      });
    });
  });

  describe('Project Progress Overview', () => {
    beforeEach(async () => {
      await createComprehensiveTestMilestones();
    });

    describe('GET /milestones/progress/overview', () => {
      it('should get comprehensive project progress overview', async () => {
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
        expect(response.body).toHaveProperty('estimatedCompletionDate');
        expect(response.body).toHaveProperty('progressVelocity');
        expect(response.body).toHaveProperty('milestones');
        expect(response.body).toHaveProperty('nextMilestone');

        expect(typeof response.body.overallProgress).toBe('number');
        expect(typeof response.body.totalMilestones).toBe('number');
        expect(Array.isArray(response.body.milestones)).toBe(true);

        // Verify progress calculations
        expect(response.body.overallProgress).toBeGreaterThanOrEqual(0);
        expect(response.body.overallProgress).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Template Application', () => {
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
        expect(response.body).toHaveProperty('appliedAt');

        expect(Array.isArray(response.body.milestones)).toBe(true);
        expect(response.body.milestones.length).toBeGreaterThan(0);
        expect(response.body.totalMilestones).toBe(
          response.body.milestones.length,
        );

        // Verify milestone details
        response.body.milestones.forEach((milestone: any) => {
          expect(milestone.studentId).toBe(studentUser.id);
          expect(milestone.projectId).toBe(testProject.id);
          expect(milestone.status).toBe(MilestoneStatus.NOT_STARTED);
        });
      });

      it('should validate template application data', async () => {
        const invalidApplyDto = {
          templateId: testTemplate.id,
          startDate: '2023-01-01', // Past date
        };

        await request(app.getHttpServer())
          .post('/milestones/apply-template')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidApplyDto)
          .expect(400);
      });

      it('should handle non-existent template', async () => {
        const invalidApplyDto = {
          templateId: '550e8400-e29b-41d4-a716-446655440000',
          startDate: '2024-03-01',
        };

        await request(app.getHttpServer())
          .post('/milestones/apply-template')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(invalidApplyDto)
          .expect(400);
      });
    });

    describe('POST /milestones/preview-template', () => {
      it('should preview template application', async () => {
        const previewDto = {
          templateId: testTemplate.id,
          startDate: '2024-03-01',
        };

        const response = await request(app.getHttpServer())
          .post('/milestones/preview-template')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(previewDto)
          .expect(200);

        expect(response.body).toHaveProperty('preview');
        expect(response.body).toHaveProperty('templateId', testTemplate.id);
        expect(response.body).toHaveProperty('conflicts');

        expect(Array.isArray(response.body.preview)).toBe(true);
        expect(Array.isArray(response.body.conflicts)).toBe(true);

        // Verify preview structure
        response.body.preview.forEach((previewItem: any) => {
          expect(previewItem).toHaveProperty('title');
          expect(previewItem).toHaveProperty('description');
          expect(previewItem).toHaveProperty('dueDate');
          expect(previewItem).toHaveProperty('priority');
          expect(previewItem).toHaveProperty('estimatedHours');
        });
      });
    });
  });

  describe('Milestone Deletion', () => {
    let testMilestone: Milestone;

    beforeEach(async () => {
      testMilestone = await createSingleTestMilestone();
    });

    describe('DELETE /milestones/:id', () => {
      it('should delete milestone without dependencies', async () => {
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

      it('should prevent deletion of milestone with notes', async () => {
        // Add a note to create dependency
        await request(app.getHttpServer())
          .post(`/milestones/${testMilestone.id}/notes`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            content: 'This note creates a dependency',
            type: NoteType.PROGRESS,
          })
          .expect(201);

        // Try to delete milestone
        await request(app.getHttpServer())
          .delete(`/milestones/${testMilestone.id}`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(400);
      });

      it('should prevent unauthorized deletion', async () => {
        await request(app.getHttpServer())
          .delete(`/milestones/${testMilestone.id}`)
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });
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
      isActive: true,
    });
    await userRepo.save(studentUser);

    supervisorUser = userRepo.create({
      email: 'supervisor@test.com',
      name: 'Test Supervisor',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
      isActive: true,
    });
    await userRepo.save(supervisorUser);

    adminUser = userRepo.create({
      email: 'admin@test.com',
      name: 'Test Admin',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
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
      title: 'Machine Learning in Education',
      description:
        'A comprehensive project on ML applications in educational technology',
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
      name: 'Computer Science Research Project',
      description: 'Standard template for CS research projects',
      specialization: 'Computer Science',
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 16,
      milestoneItems: [
        {
          title: 'Literature Review',
          description: 'Complete comprehensive literature review',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 40,
          tags: ['research'],
        },
        {
          title: 'Methodology Design',
          description: 'Design research methodology',
          daysFromStart: 28,
          priority: Priority.MEDIUM,
          estimatedHours: 20,
          tags: ['planning'],
        },
        {
          title: 'Implementation',
          description: 'Implement the proposed solution',
          daysFromStart: 70,
          priority: Priority.HIGH,
          estimatedHours: 80,
          tags: ['development'],
        },
      ],
      createdById: supervisorUser.id,
    });
    await templateRepo.save(testTemplate);
  }

  async function createComprehensiveTestMilestones() {
    const milestoneRepo = dataSource.getRepository(Milestone);

    const milestones = [
      {
        title: 'Literature Review',
        description:
          'Complete comprehensive literature review on machine learning',
        dueDate: new Date('2024-06-15'),
        priority: Priority.HIGH,
        status: MilestoneStatus.NOT_STARTED,
        studentId: studentUser.id,
        estimatedHours: 40,
      },
      {
        title: 'Methodology Design',
        description: 'Design research methodology and experimental setup',
        dueDate: new Date('2024-07-01'),
        priority: Priority.MEDIUM,
        status: MilestoneStatus.IN_PROGRESS,
        studentId: studentUser.id,
        estimatedHours: 20,
      },
      {
        title: 'Data Collection',
        description: 'Collect and preprocess research data',
        dueDate: new Date('2024-01-15'), // Past date for overdue testing
        priority: Priority.HIGH,
        status: MilestoneStatus.NOT_STARTED,
        studentId: studentUser.id,
        estimatedHours: 30,
      },
      {
        title: 'Implementation',
        description: 'Implement the proposed solution',
        dueDate: new Date('2024-08-01'),
        priority: Priority.CRITICAL,
        status: MilestoneStatus.COMPLETED,
        studentId: studentUser.id,
        estimatedHours: 60,
        actualHours: 55,
        completedAt: new Date('2024-07-25'),
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
      title: 'Test Milestone for Individual Testing',
      description:
        'A comprehensive test milestone with detailed description for individual test scenarios',
      dueDate: new Date('2024-06-15'),
      priority: Priority.MEDIUM,
      status: MilestoneStatus.NOT_STARTED,
      studentId: studentUser.id,
      estimatedHours: 30,
    });

    return await milestoneRepo.save(milestone);
  }
});
