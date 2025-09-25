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
import { Project } from '../src/entities/project.entity';
import { UserRole } from '../src/common/enums/user-role.enum';
import {
  MilestoneStatus,
  Priority,
  ProjectType,
  NoteType,
} from '../src/common/enums';
import { JwtService } from '@nestjs/jwt';

describe('Milestone Performance Tests (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;
  let studentUsers: User[] = [];
  let supervisorUser: User;
  let testProject: Project;
  let studentTokens: string[] = [];
  let supervisorToken: string;

  const PERFORMANCE_THRESHOLDS = {
    CREATE_MILESTONE: 500, // ms
    GET_MILESTONES_LIST: 1000, // ms
    UPDATE_MILESTONE: 300, // ms
    PROGRESS_CALCULATION: 800, // ms
    TEMPLATE_APPLICATION: 1500, // ms
    BULK_OPERATIONS: 2000, // ms
  };

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

    // Create test data for performance testing
    await createPerformanceTestUsers();
    await createTestProject();
    await createLargeDataset();
  }, 60000); // Increase timeout for setup

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('Milestone Creation Performance', () => {
    it('should create milestone within performance threshold', async () => {
      const createMilestoneDto = {
        title: 'Performance Test Milestone',
        description:
          'Testing milestone creation performance with comprehensive data',
        dueDate: '2024-06-15',
        priority: Priority.HIGH,
        estimatedHours: 40,
        projectId: testProject.id,
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/milestones')
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .send(createMilestoneDto)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CREATE_MILESTONE);
      expect(response.body.id).toBeDefined();

      console.log(
        `Milestone creation took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.CREATE_MILESTONE}ms)`,
      );
    });

    it('should handle concurrent milestone creation', async () => {
      const createMilestoneDto = {
        title: 'Concurrent Test Milestone',
        description: 'Testing concurrent milestone creation',
        dueDate: '2024-06-15',
        priority: Priority.MEDIUM,
        estimatedHours: 30,
      };

      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, index) =>
        request(app.getHttpServer())
          .post('/milestones')
          .set(
            'Authorization',
            `Bearer ${studentTokens[index % studentTokens.length]}`,
          )
          .send({
            ...createMilestoneDto,
            title: `${createMilestoneDto.title} ${index}`,
          })
          .expect(201),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATIONS);

      console.log(
        `${concurrentRequests} concurrent milestone creations took ${duration}ms`,
      );
    });
  });

  describe('Milestone Listing Performance', () => {
    beforeAll(async () => {
      // Create additional milestones for performance testing
      await createBulkMilestones(100);
    });

    it('should list milestones within performance threshold', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .query({ page: 1, limit: 20 })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET_MILESTONES_LIST);
      expect(response.body.milestones).toBeDefined();
      expect(response.body.total).toBeGreaterThan(0);

      console.log(
        `Milestone listing took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.GET_MILESTONES_LIST}ms)`,
      );
    });

    it('should handle complex filtering efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .query({
          status: MilestoneStatus.NOT_STARTED,
          priority: Priority.HIGH,
          search: 'Performance',
          dueDateFrom: '2024-01-01',
          dueDateTo: '2024-12-31',
          page: 1,
          limit: 50,
        })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.GET_MILESTONES_LIST);
      expect(response.body.milestones).toBeDefined();

      console.log(`Complex filtered listing took ${duration}ms`);
    });

    it('should handle large page sizes efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/milestones')
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .query({ page: 1, limit: 100 })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.GET_MILESTONES_LIST * 1.5,
      ); // Allow 50% more time for larger pages
      expect(response.body.milestones).toBeDefined();

      console.log(`Large page listing (100 items) took ${duration}ms`);
    });
  });

  describe('Progress Calculation Performance', () => {
    beforeAll(async () => {
      // Create milestones with various statuses for progress calculation
      await createMilestonesWithVariedStatuses(50);
    });

    it('should calculate progress within performance threshold', async () => {
      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .get('/milestones/progress/overview')
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.PROGRESS_CALCULATION,
      );
      expect(response.body.overallProgress).toBeDefined();
      expect(response.body.totalMilestones).toBeGreaterThan(0);

      console.log(
        `Progress calculation took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.PROGRESS_CALCULATION}ms)`,
      );
    });

    it('should handle concurrent progress calculations', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, (_, index) =>
        request(app.getHttpServer())
          .get('/milestones/progress/overview')
          .set(
            'Authorization',
            `Bearer ${studentTokens[index % studentTokens.length]}`,
          )
          .expect(200),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.PROGRESS_CALCULATION * 2,
      );

      console.log(
        `${concurrentRequests} concurrent progress calculations took ${duration}ms`,
      );
    });
  });

  describe('Template Application Performance', () => {
    let performanceTemplate: MilestoneTemplate;

    beforeAll(async () => {
      performanceTemplate = await createLargeTemplate();
    });

    it('should apply template within performance threshold', async () => {
      const applyDto = {
        templateId: performanceTemplate.id,
        startDate: '2024-03-01',
        projectId: testProject.id,
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/milestones/apply-template')
        .set('Authorization', `Bearer ${studentTokens[1]}`) // Use different student
        .send(applyDto)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.TEMPLATE_APPLICATION,
      );
      expect(response.body.milestones).toBeDefined();
      expect(response.body.milestones.length).toBeGreaterThan(0);

      console.log(
        `Template application took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.TEMPLATE_APPLICATION}ms)`,
      );
    });

    it('should preview template efficiently', async () => {
      const previewDto = {
        templateId: performanceTemplate.id,
        startDate: '2024-03-01',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post('/milestones/preview-template')
        .set('Authorization', `Bearer ${studentTokens[2]}`)
        .send(previewDto)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(
        PERFORMANCE_THRESHOLDS.TEMPLATE_APPLICATION / 2,
      ); // Preview should be faster
      expect(response.body.preview).toBeDefined();

      console.log(`Template preview took ${duration}ms`);
    });
  });

  describe('Note Management Performance', () => {
    let testMilestones: Milestone[];

    beforeAll(async () => {
      testMilestones = await createMilestonesForNotesTesting(10);
    });

    it('should add notes efficiently', async () => {
      const noteDto = {
        content:
          'Performance test note with comprehensive content to simulate real-world usage patterns and data volumes',
        type: NoteType.PROGRESS,
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .post(`/milestones/${testMilestones[0].id}/notes`)
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .send(noteDto)
        .expect(201);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300); // Notes should be very fast
      expect(response.body.content).toBe(noteDto.content);

      console.log(`Note creation took ${duration}ms`);
    });

    it('should handle bulk note creation', async () => {
      const noteCount = 20;
      const startTime = Date.now();

      const promises = Array.from({ length: noteCount }, (_, index) =>
        request(app.getHttpServer())
          .post(
            `/milestones/${testMilestones[index % testMilestones.length].id}/notes`,
          )
          .set('Authorization', `Bearer ${studentTokens[0]}`)
          .send({
            content: `Bulk performance test note ${index} with detailed content`,
            type: NoteType.PROGRESS,
          })
          .expect(201),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(noteCount);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATIONS);

      console.log(`${noteCount} bulk note creations took ${duration}ms`);
    });
  });

  describe('Status Update Performance', () => {
    let statusTestMilestones: Milestone[];

    beforeAll(async () => {
      statusTestMilestones = await createMilestonesForStatusTesting(20);
    });

    it('should update status efficiently', async () => {
      const statusDto = {
        status: MilestoneStatus.IN_PROGRESS,
        notes: 'Performance test status update with comprehensive notes',
      };

      const startTime = Date.now();

      const response = await request(app.getHttpServer())
        .patch(`/milestones/${statusTestMilestones[0].id}/status`)
        .set('Authorization', `Bearer ${studentTokens[0]}`)
        .send(statusDto)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.UPDATE_MILESTONE);
      expect(response.body.status).toBe(statusDto.status);

      console.log(
        `Status update took ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.UPDATE_MILESTONE}ms)`,
      );
    });

    it('should handle concurrent status updates', async () => {
      const concurrentUpdates = 10;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentUpdates }, (_, index) =>
        request(app.getHttpServer())
          .patch(`/milestones/${statusTestMilestones[index + 1].id}/status`)
          .set('Authorization', `Bearer ${studentTokens[0]}`)
          .send({
            status: MilestoneStatus.IN_PROGRESS,
            notes: `Concurrent status update ${index}`,
          })
          .expect(200),
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(responses).toHaveLength(concurrentUpdates);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.BULK_OPERATIONS);

      console.log(
        `${concurrentUpdates} concurrent status updates took ${duration}ms`,
      );
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large dataset queries without memory issues', async () => {
      const initialMemory = process.memoryUsage();

      // Perform multiple operations to test memory usage
      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .get('/milestones')
          .set('Authorization', `Bearer ${studentTokens[0]}`)
          .query({ page: i + 1, limit: 50 })
          .expect(200);

        await request(app.getHttpServer())
          .get('/milestones/progress/overview')
          .set('Authorization', `Bearer ${studentTokens[0]}`)
          .expect(200);
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

      console.log(
        `Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`,
      );
    });
  });

  // Helper functions for performance testing
  async function createPerformanceTestUsers() {
    const userRepo = dataSource.getRepository(User);

    // Create multiple student users for concurrent testing
    for (let i = 0; i < 5; i++) {
      const student = userRepo.create({
        email: `student${i}@performance.test`,
        name: `Performance Test Student ${i}`,
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isActive: true,
      });
      const savedStudent = await userRepo.save(student);
      studentUsers.push(savedStudent);

      const token = jwtService.sign({
        sub: savedStudent.id,
        email: savedStudent.email,
        role: savedStudent.role,
      });
      studentTokens.push(token);
    }

    supervisorUser = userRepo.create({
      email: 'supervisor@performance.test',
      name: 'Performance Test Supervisor',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
      isActive: true,
    });
    await userRepo.save(supervisorUser);

    supervisorToken = jwtService.sign({
      sub: supervisorUser.id,
      email: supervisorUser.email,
      role: supervisorUser.role,
    });
  }

  async function createTestProject() {
    const projectRepo = dataSource.getRepository(Project);

    testProject = projectRepo.create({
      title: 'Performance Test Project',
      description: 'A project for performance testing',
      specialization: 'Computer Science',
      supervisorId: supervisorUser.id,
      year: 2024,
      status: 'approved',
    });
    await projectRepo.save(testProject);
  }

  async function createLargeDataset() {
    // Create initial milestones for each student
    const milestoneRepo = dataSource.getRepository(Milestone);

    for (const student of studentUsers) {
      for (let i = 0; i < 20; i++) {
        const milestone = milestoneRepo.create({
          title: `Initial Milestone ${i} for ${student.name}`,
          description: `Performance test milestone ${i} with comprehensive description`,
          dueDate: new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000), // Spread over weeks
          priority:
            i % 3 === 0
              ? Priority.HIGH
              : i % 3 === 1
                ? Priority.MEDIUM
                : Priority.LOW,
          status: MilestoneStatus.NOT_STARTED,
          studentId: student.id,
          estimatedHours: 20 + i * 5,
        });
        await milestoneRepo.save(milestone);
      }
    }
  }

  async function createBulkMilestones(count: number) {
    const milestoneRepo = dataSource.getRepository(Milestone);
    const milestones = [];

    for (let i = 0; i < count; i++) {
      const milestone = milestoneRepo.create({
        title: `Performance Bulk Milestone ${i}`,
        description: `Bulk milestone ${i} for performance testing with detailed description`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        priority: Priority.MEDIUM,
        status: MilestoneStatus.NOT_STARTED,
        studentId: studentUsers[i % studentUsers.length].id,
        estimatedHours: 30,
      });
      milestones.push(milestone);
    }

    await milestoneRepo.save(milestones);
  }

  async function createMilestonesWithVariedStatuses(count: number) {
    const milestoneRepo = dataSource.getRepository(Milestone);
    const statuses = [
      MilestoneStatus.NOT_STARTED,
      MilestoneStatus.IN_PROGRESS,
      MilestoneStatus.COMPLETED,
      MilestoneStatus.BLOCKED,
    ];

    for (let i = 0; i < count; i++) {
      const milestone = milestoneRepo.create({
        title: `Progress Test Milestone ${i}`,
        description: `Milestone ${i} for progress calculation testing`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        priority: Priority.MEDIUM,
        status: statuses[i % statuses.length],
        studentId: studentUsers[0].id, // All for first student for progress calculation
        estimatedHours: 25,
        actualHours:
          statuses[i % statuses.length] === MilestoneStatus.COMPLETED ? 23 : 0,
        completedAt:
          statuses[i % statuses.length] === MilestoneStatus.COMPLETED
            ? new Date()
            : null,
      });
      await milestoneRepo.save(milestone);
    }
  }

  async function createLargeTemplate(): Promise<MilestoneTemplate> {
    const templateRepo = dataSource.getRepository(MilestoneTemplate);

    const milestoneItems = [];
    for (let i = 0; i < 15; i++) {
      milestoneItems.push({
        title: `Template Milestone ${i + 1}`,
        description: `Comprehensive milestone ${i + 1} from performance template`,
        daysFromStart: (i + 1) * 7,
        priority: Priority.MEDIUM,
        estimatedHours: 30,
        tags: ['performance', 'test'],
      });
    }

    const template = templateRepo.create({
      name: 'Performance Test Template',
      description: 'Large template for performance testing',
      specialization: 'Computer Science',
      projectType: ProjectType.INDIVIDUAL,
      estimatedDurationWeeks: 20,
      milestoneItems,
      createdById: supervisorUser.id,
    });

    return await templateRepo.save(template);
  }

  async function createMilestonesForNotesTesting(
    count: number,
  ): Promise<Milestone[]> {
    const milestoneRepo = dataSource.getRepository(Milestone);
    const milestones = [];

    for (let i = 0; i < count; i++) {
      const milestone = milestoneRepo.create({
        title: `Notes Test Milestone ${i}`,
        description: `Milestone ${i} for notes performance testing`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        priority: Priority.MEDIUM,
        status: MilestoneStatus.IN_PROGRESS,
        studentId: studentUsers[0].id,
        estimatedHours: 25,
      });
      const saved = await milestoneRepo.save(milestone);
      milestones.push(saved);
    }

    return milestones;
  }

  async function createMilestonesForStatusTesting(
    count: number,
  ): Promise<Milestone[]> {
    const milestoneRepo = dataSource.getRepository(Milestone);
    const milestones = [];

    for (let i = 0; i < count; i++) {
      const milestone = milestoneRepo.create({
        title: `Status Test Milestone ${i}`,
        description: `Milestone ${i} for status update performance testing`,
        dueDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        priority: Priority.MEDIUM,
        status: MilestoneStatus.NOT_STARTED,
        studentId: studentUsers[0].id,
        estimatedHours: 25,
      });
      const saved = await milestoneRepo.save(milestone);
      milestones.push(saved);
    }

    return milestones;
  }
});
