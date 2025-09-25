import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Milestone } from '../src/entities/milestone.entity';
import { Project } from '../src/entities/project.entity';
import { MilestoneNote } from '../src/entities/milestone-note.entity';
import { SupervisorController } from '../src/controllers/supervisor.controller';
import { SupervisorReportingService } from '../src/services/supervisor-reporting.service';
import { MilestoneAnalyticsService } from '../src/services/milestone-analytics.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/common/enums/user-role.enum';
import { MilestoneStatus } from '../src/common/enums/milestone-status.enum';
import { Priority } from '../src/common/enums/priority.enum';
import { createTestDatabase, cleanupTestDatabase } from './setup';

describe('SupervisorController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let milestoneRepository: Repository<Milestone>;
  let projectRepository: Repository<Project>;
  let supervisorUser: User;
  let studentUser1: User;
  let studentUser2: User;
  let testProject: Project;
  let supervisorToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(await createTestDatabase()),
        TypeOrmModule.forFeature([User, Milestone, Project, MilestoneNote]),
      ],
      controllers: [SupervisorController],
      providers: [SupervisorReportingService, MilestoneAnalyticsService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          // Mock authentication based on Authorization header
          const authHeader = request.headers.authorization;
          if (authHeader === 'Bearer supervisor-token') {
            request.user = {
              id: supervisorUser?.id,
              role: UserRole.SUPERVISOR,
            };
            return true;
          }
          if (authHeader === 'Bearer student-token') {
            request.user = { id: studentUser1?.id, role: UserRole.STUDENT };
            return true;
          }
          return false;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          const requiredRoles = Reflect.getMetadata(
            'roles',
            context.getHandler(),
          );
          if (!requiredRoles) return true;
          return requiredRoles.includes(request.user?.role);
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
    milestoneRepository = moduleFixture.get('MilestoneRepository');
    projectRepository = moduleFixture.get('ProjectRepository');

    // Create test users
    supervisorUser = await userRepository.save({
      email: 'supervisor@test.com',
      password: 'hashedpassword',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });

    studentUser1 = await userRepository.save({
      email: 'student1@test.com',
      password: 'hashedpassword',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });

    studentUser2 = await userRepository.save({
      email: 'student2@test.com',
      password: 'hashedpassword',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });

    // Create test project
    testProject = await projectRepository.save({
      title: 'Test AI Project',
      description: 'Test project for AI research',
      specialization: 'Artificial Intelligence',
      difficultyLevel: 'intermediate',
      technologyStack: ['Python', 'TensorFlow'],
      supervisorId: supervisorUser.id,
    });

    supervisorToken = 'supervisor-token';
    studentToken = 'student-token';
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up milestones before each test
    await milestoneRepository.delete({});
  });

  describe('GET /supervisor/dashboard', () => {
    it('should return supervisor dashboard with metrics', async () => {
      // Create test milestones
      await milestoneRepository.save([
        {
          title: 'Literature Review',
          description: 'Complete literature review',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
          completedAt: new Date('2024-05-25'),
        },
        {
          title: 'System Design',
          description: 'Design system architecture',
          dueDate: new Date('2024-07-01'),
          status: MilestoneStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
        {
          title: 'Data Collection',
          description: 'Collect training data',
          dueDate: new Date('2024-05-15'),
          status: MilestoneStatus.BLOCKED,
          priority: Priority.HIGH,
          studentId: studentUser2.id,
          projectId: testProject.id,
          blockingReason: 'Waiting for data access approval',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/dashboard')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('supervisorId', supervisorUser.id);
      expect(response.body).toHaveProperty('totalStudents');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body.metrics).toHaveProperty('totalMilestones');
      expect(response.body.metrics).toHaveProperty('completedMilestones');
      expect(response.body.metrics).toHaveProperty('overdueMilestones');
      expect(response.body.metrics).toHaveProperty('blockedMilestones');
      expect(response.body).toHaveProperty('studentSummaries');
      expect(response.body).toHaveProperty('atRiskStudents');
      expect(response.body).toHaveProperty('recentActivity');
      expect(response.body).toHaveProperty('upcomingDeadlines');
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should deny access without authentication', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/dashboard')
        .expect(401);
    });
  });

  describe('GET /supervisor/students/progress', () => {
    it('should return student progress summaries', async () => {
      // Create test milestones for multiple students
      await milestoneRepository.save([
        {
          title: 'Literature Review',
          description: 'Complete literature review',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
        {
          title: 'Implementation',
          description: 'Implement core features',
          dueDate: new Date('2024-07-01'),
          status: MilestoneStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
        {
          title: 'Testing',
          description: 'Test the system',
          dueDate: new Date('2024-05-15'),
          status: MilestoneStatus.BLOCKED,
          priority: Priority.HIGH,
          studentId: studentUser2.id,
          projectId: testProject.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/students/progress')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const studentSummary = response.body[0];
      expect(studentSummary).toHaveProperty('studentId');
      expect(studentSummary).toHaveProperty('studentName');
      expect(studentSummary).toHaveProperty('totalMilestones');
      expect(studentSummary).toHaveProperty('completedMilestones');
      expect(studentSummary).toHaveProperty('overdueMilestones');
      expect(studentSummary).toHaveProperty('blockedMilestones');
      expect(studentSummary).toHaveProperty('completionRate');
      expect(studentSummary).toHaveProperty('riskScore');
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/students/progress')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('GET /supervisor/students/:studentId/overview', () => {
    it('should return detailed student milestone overview', async () => {
      // Create test milestones for the student
      await milestoneRepository.save([
        {
          title: 'Literature Review',
          description: 'Complete comprehensive literature review',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
          estimatedHours: 20,
          actualHours: 18,
        },
        {
          title: 'System Design',
          description: 'Design system architecture',
          dueDate: new Date('2024-07-01'),
          status: MilestoneStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          studentId: studentUser1.id,
          projectId: testProject.id,
          estimatedHours: 30,
          actualHours: 15,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get(`/supervisor/students/${studentUser1.id}/overview`)
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('studentId', studentUser1.id);
      expect(response.body).toHaveProperty('studentName');
      expect(response.body).toHaveProperty('studentEmail', studentUser1.email);
      expect(response.body).toHaveProperty('milestones');
      expect(Array.isArray(response.body.milestones)).toBe(true);
      expect(response.body.milestones.length).toBe(2);

      const milestone = response.body.milestones[0];
      expect(milestone).toHaveProperty('id');
      expect(milestone).toHaveProperty('title');
      expect(milestone).toHaveProperty('status');
      expect(milestone).toHaveProperty('priority');
      expect(milestone).toHaveProperty('dueDate');
      expect(milestone).toHaveProperty('estimatedHours');
      expect(milestone).toHaveProperty('actualHours');
      expect(milestone).toHaveProperty('isOverdue');
    });

    it('should return 400 for invalid student ID format', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/students/invalid-uuid/overview')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(400);
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get(`/supervisor/students/${studentUser1.id}/overview`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('GET /supervisor/alerts', () => {
    it('should return at-risk student alerts', async () => {
      // Create milestones that make students at-risk
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 5); // 5 days overdue

      await milestoneRepository.save([
        {
          title: 'Overdue Milestone',
          description: 'This milestone is overdue',
          dueDate: overdueDate,
          status: MilestoneStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
        {
          title: 'Blocked Milestone',
          description: 'This milestone is blocked',
          dueDate: new Date('2024-07-01'),
          status: MilestoneStatus.BLOCKED,
          priority: Priority.MEDIUM,
          studentId: studentUser2.id,
          projectId: testProject.id,
          blockingReason: 'Waiting for approval',
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/alerts')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      if (response.body.length > 0) {
        const alert = response.body[0];
        expect(alert).toHaveProperty('studentId');
        expect(alert).toHaveProperty('studentName');
        expect(alert).toHaveProperty('riskLevel');
        expect(alert).toHaveProperty('riskFactors');
        expect(alert).toHaveProperty('overdueMilestones');
        expect(alert).toHaveProperty('blockedMilestones');
        expect(alert).toHaveProperty('recommendedActions');
        expect(alert).toHaveProperty('urgencyScore');
        expect(['low', 'medium', 'high']).toContain(alert.riskLevel);
      }
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/alerts')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('GET /supervisor/reports', () => {
    it('should generate progress report without filters', async () => {
      // Create test milestones
      await milestoneRepository.save([
        {
          title: 'Literature Review',
          description: 'Complete literature review',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
        {
          title: 'Implementation',
          description: 'Implement features',
          dueDate: new Date('2024-07-01'),
          status: MilestoneStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/reports')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('supervisorId', supervisorUser.id);
      expect(response.body).toHaveProperty('generatedAt');
      expect(response.body).toHaveProperty('reportPeriod');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('studentData');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.studentData)).toBe(true);
    });

    it('should generate progress report with date filters', async () => {
      await milestoneRepository.save([
        {
          title: 'Test Milestone',
          description: 'Test milestone',
          dueDate: new Date('2024-06-15'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.MEDIUM,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/reports')
        .query({
          startDate: '2024-06-01',
          endDate: '2024-06-30',
          status: MilestoneStatus.COMPLETED,
        })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body.reportPeriod.startDate).toBe('2024-06-01');
      expect(response.body.reportPeriod.endDate).toBe('2024-06-30');
      expect(response.body.filters.status).toBe(MilestoneStatus.COMPLETED);
    });

    it('should return 400 for invalid date format', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/reports')
        .query({ startDate: 'invalid-date' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(400);
    });

    it('should return 400 when start date is after end date', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/reports')
        .query({
          startDate: '2024-06-30',
          endDate: '2024-06-01',
        })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(400);
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/reports')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('GET /supervisor/reports/export', () => {
    it('should export report in CSV format', async () => {
      await milestoneRepository.save([
        {
          title: 'Test Milestone',
          description: 'Test milestone for export',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/reports/export')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('format', 'csv');
      expect(response.body).toHaveProperty('filename');
      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('mimeType', 'text/csv');
      expect(response.body).toHaveProperty('size');
      expect(response.body.filename).toMatch(/\.csv$/);
    });

    it('should export report in PDF format', async () => {
      await milestoneRepository.save([
        {
          title: 'Test Milestone',
          description: 'Test milestone for export',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/reports/export')
        .query({ format: 'pdf' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('format', 'pdf');
      expect(response.body).toHaveProperty('mimeType', 'application/pdf');
      expect(response.body.filename).toMatch(/\.pdf$/);
    });

    it('should return 400 for invalid format', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/reports/export')
        .query({ format: 'invalid' })
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(400);
    });

    it('should return 400 for missing format', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/reports/export')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(400);
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/reports/export')
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  describe('GET /supervisor/analytics', () => {
    it('should return supervisor analytics', async () => {
      // Create test milestones for analytics
      await milestoneRepository.save([
        {
          title: 'Analytics Test 1',
          description: 'Test milestone 1',
          dueDate: new Date('2024-06-01'),
          status: MilestoneStatus.COMPLETED,
          priority: Priority.HIGH,
          studentId: studentUser1.id,
          projectId: testProject.id,
        },
        {
          title: 'Analytics Test 2',
          description: 'Test milestone 2',
          dueDate: new Date('2024-07-01'),
          status: MilestoneStatus.IN_PROGRESS,
          priority: Priority.MEDIUM,
          studentId: studentUser2.id,
          projectId: testProject.id,
        },
      ]);

      const response = await request(app.getHttpServer())
        .get('/supervisor/analytics')
        .set('Authorization', `Bearer ${supervisorToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('supervisorId', supervisorUser.id);
      expect(response.body).toHaveProperty('totalStudents');
      expect(response.body).toHaveProperty('overallMetrics');
      expect(response.body).toHaveProperty('studentPerformance');
      expect(response.body).toHaveProperty('trendAnalysis');
      expect(response.body).toHaveProperty('benchmarks');
      expect(response.body).toHaveProperty('insights');
      expect(response.body).toHaveProperty('generatedAt');
      expect(Array.isArray(response.body.insights)).toBe(true);
    });

    it('should deny access to students', async () => {
      await request(app.getHttpServer())
        .get('/supervisor/analytics')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });
});
