import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { MilestoneTemplate } from '../src/entities/milestone-template.entity';
import { AcademicCalendar } from '../src/entities/academic-calendar.entity';
import { AdminMilestoneController } from '../src/controllers/admin-milestone.controller';
import { MilestoneTemplateService } from '../src/services/milestone-template.service';
import { AcademicCalendarService } from '../src/services/academic-calendar.service';
import { MilestoneReminderJobService } from '../src/services/milestone-reminder-job.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { UserRole } from '../src/common/enums/user-role.enum';
import { ProjectType } from '../src/common/enums/project-type.enum';
import { createTestDatabase, cleanupTestDatabase } from './setup';

describe('AdminMilestoneController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let templateRepository: Repository<MilestoneTemplate>;
  let academicCalendarRepository: Repository<AcademicCalendar>;
  let adminUser: User;
  let supervisorUser: User;
  let studentUser: User;
  let adminToken: string;
  let supervisorToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(await createTestDatabase()),
        TypeOrmModule.forFeature([User, MilestoneTemplate, AcademicCalendar]),
      ],
      controllers: [AdminMilestoneController],
      providers: [
        MilestoneTemplateService,
        AcademicCalendarService,
        MilestoneReminderJobService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          const authHeader = request.headers.authorization;
          if (authHeader === 'Bearer admin-token') {
            request.user = { id: adminUser?.id, role: UserRole.ADMIN };
            return true;
          }
          if (authHeader === 'Bearer supervisor-token') {
            request.user = {
              id: supervisorUser?.id,
              role: UserRole.SUPERVISOR,
            };
            return true;
          }
          if (authHeader === 'Bearer student-token') {
            request.user = { id: studentUser?.id, role: UserRole.STUDENT };
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
    templateRepository = moduleFixture.get('MilestoneTemplateRepository');
    academicCalendarRepository = moduleFixture.get(
      'AcademicCalendarRepository',
    );

    // Create test users
    adminUser = await userRepository.save({
      email: 'admin@test.com',
      password: 'hashedpassword',
      role: UserRole.ADMIN,
      isEmailVerified: true,
    });

    supervisorUser = await userRepository.save({
      email: 'supervisor@test.com',
      password: 'hashedpassword',
      role: UserRole.SUPERVISOR,
      isEmailVerified: true,
    });

    studentUser = await userRepository.save({
      email: 'student@test.com',
      password: 'hashedpassword',
      role: UserRole.STUDENT,
      isEmailVerified: true,
    });

    adminToken = 'admin-token';
    supervisorToken = 'supervisor-token';
    studentToken = 'student-token';
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await app.close();
  });

  beforeEach(async () => {
    // Clean up templates and calendar entries before each test
    await templateRepository.delete({});
    await academicCalendarRepository.delete({});
  });

  describe('Template Management', () => {
    describe('GET /admin/milestone/templates', () => {
      it('should return all templates for admin', async () => {
        // Create test templates
        await templateRepository.save([
          {
            name: 'AI Research Template',
            description: 'Template for AI research projects',
            specialization: 'Artificial Intelligence',
            projectType: ProjectType.RESEARCH,
            milestoneItems: [
              {
                title: 'Literature Review',
                description: 'Complete literature review',
                daysFromStart: 14,
                estimatedHours: 20,
                priority: 'high',
                isRequired: true,
              },
            ],
            estimatedDurationWeeks: 16,
            createdById: adminUser.id,
          },
          {
            name: 'Web Development Template',
            description: 'Template for web development projects',
            specialization: 'Web Development',
            projectType: ProjectType.INDIVIDUAL,
            milestoneItems: [
              {
                title: 'Project Setup',
                description: 'Set up development environment',
                daysFromStart: 7,
                estimatedHours: 10,
                priority: 'medium',
                isRequired: true,
              },
            ],
            estimatedDurationWeeks: 12,
            createdById: supervisorUser.id,
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/admin/milestone/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('templates');
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('page');
        expect(response.body).toHaveProperty('limit');
        expect(response.body).toHaveProperty('totalPages');
        expect(Array.isArray(response.body.templates)).toBe(true);
        expect(response.body.templates.length).toBe(2);
        expect(response.body.total).toBe(2);
      });

      it('should filter templates by specialization', async () => {
        await templateRepository.save([
          {
            name: 'AI Template',
            description: 'AI template',
            specialization: 'Artificial Intelligence',
            projectType: ProjectType.RESEARCH,
            milestoneItems: [],
            estimatedDurationWeeks: 16,
            createdById: adminUser.id,
          },
          {
            name: 'Web Template',
            description: 'Web template',
            specialization: 'Web Development',
            projectType: ProjectType.INDIVIDUAL,
            milestoneItems: [],
            estimatedDurationWeeks: 12,
            createdById: adminUser.id,
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/admin/milestone/templates')
          .query({ specialization: 'Artificial Intelligence' })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.templates.length).toBe(1);
        expect(response.body.templates[0].specialization).toBe(
          'Artificial Intelligence',
        );
      });

      it('should deny access to non-admin users', async () => {
        await request(app.getHttpServer())
          .get('/admin/milestone/templates')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);

        await request(app.getHttpServer())
          .get('/admin/milestone/templates')
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });
    });

    describe('POST /admin/milestone/templates', () => {
      it('should create a new template', async () => {
        const createDto = {
          name: 'New AI Template',
          description: 'A new template for AI projects',
          specialization: 'Artificial Intelligence',
          projectType: ProjectType.RESEARCH,
          milestoneItems: [
            {
              title: 'Literature Review',
              description: 'Complete comprehensive literature review',
              daysFromStart: 14,
              estimatedHours: 20,
              priority: 'high',
              isRequired: true,
            },
            {
              title: 'Data Collection',
              description: 'Collect and prepare training data',
              daysFromStart: 28,
              estimatedHours: 30,
              priority: 'high',
              isRequired: true,
            },
          ],
          estimatedDurationWeeks: 16,
          tags: ['ai', 'research', 'machine-learning'],
        };

        const response = await request(app.getHttpServer())
          .post('/admin/milestone/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createDto)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(createDto.name);
        expect(response.body.specialization).toBe(createDto.specialization);
        expect(response.body.milestoneItems).toHaveLength(2);
        expect(response.body.tags).toEqual(createDto.tags);
      });

      it('should return 400 for invalid template data', async () => {
        const invalidDto = {
          name: 'A', // Too short
          description: 'Short', // Too short
          specialization: 'AI',
          projectType: 'invalid-type',
          milestoneItems: [], // Empty
          estimatedDurationWeeks: 0, // Invalid
        };

        await request(app.getHttpServer())
          .post('/admin/milestone/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidDto)
          .expect(400);
      });

      it('should deny access to non-admin users', async () => {
        const createDto = {
          name: 'Test Template',
          description: 'Test template description',
          specialization: 'Test',
          projectType: ProjectType.INDIVIDUAL,
          milestoneItems: [],
          estimatedDurationWeeks: 12,
        };

        await request(app.getHttpServer())
          .post('/admin/milestone/templates')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(createDto)
          .expect(403);
      });
    });

    describe('PUT /admin/milestone/templates/:id', () => {
      it('should update an existing template', async () => {
        const template = await templateRepository.save({
          name: 'Original Template',
          description: 'Original description',
          specialization: 'AI',
          projectType: ProjectType.RESEARCH,
          milestoneItems: [],
          estimatedDurationWeeks: 16,
          createdById: adminUser.id,
        });

        const updateDto = {
          name: 'Updated Template',
          description: 'Updated description',
          estimatedDurationWeeks: 20,
        };

        const response = await request(app.getHttpServer())
          .put(`/admin/milestone/templates/${template.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateDto)
          .expect(200);

        expect(response.body.name).toBe(updateDto.name);
        expect(response.body.description).toBe(updateDto.description);
        expect(response.body.estimatedDurationWeeks).toBe(
          updateDto.estimatedDurationWeeks,
        );
      });

      it('should return 400 for invalid template ID', async () => {
        await request(app.getHttpServer())
          .put('/admin/milestone/templates/invalid-uuid')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Updated' })
          .expect(400);
      });
    });

    describe('DELETE /admin/milestone/templates/:id', () => {
      it('should delete a template that is not in use', async () => {
        const template = await templateRepository.save({
          name: 'Template to Delete',
          description: 'This template will be deleted',
          specialization: 'Test',
          projectType: ProjectType.INDIVIDUAL,
          milestoneItems: [],
          estimatedDurationWeeks: 12,
          usageCount: 0, // Not in use
          createdById: adminUser.id,
        });

        await request(app.getHttpServer())
          .delete(`/admin/milestone/templates/${template.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(204);

        // Verify template is deleted
        const deletedTemplate = await templateRepository.findOne({
          where: { id: template.id },
        });
        expect(deletedTemplate).toBeNull();
      });

      it('should return 400 when trying to delete a template in use', async () => {
        const template = await templateRepository.save({
          name: 'Template in Use',
          description: 'This template is in use',
          specialization: 'Test',
          projectType: ProjectType.INDIVIDUAL,
          milestoneItems: [],
          estimatedDurationWeeks: 12,
          usageCount: 5, // In use
          createdById: adminUser.id,
        });

        await request(app.getHttpServer())
          .delete(`/admin/milestone/templates/${template.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });
    });

    describe('PATCH /admin/milestone/templates/:id/archive', () => {
      it('should archive a template', async () => {
        const template = await templateRepository.save({
          name: 'Template to Archive',
          description: 'This template will be archived',
          specialization: 'Test',
          projectType: ProjectType.INDIVIDUAL,
          milestoneItems: [],
          estimatedDurationWeeks: 12,
          isActive: true,
          createdById: adminUser.id,
        });

        const response = await request(app.getHttpServer())
          .patch(`/admin/milestone/templates/${template.id}/archive`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.isActive).toBe(false);
      });
    });

    describe('POST /admin/milestone/templates/:id/duplicate', () => {
      it('should duplicate a template', async () => {
        const originalTemplate = await templateRepository.save({
          name: 'Original Template',
          description: 'Original template description',
          specialization: 'AI',
          projectType: ProjectType.RESEARCH,
          milestoneItems: [
            {
              title: 'Test Milestone',
              description: 'Test milestone description',
              daysFromStart: 7,
              estimatedHours: 10,
              priority: 'medium',
              isRequired: true,
            },
          ],
          estimatedDurationWeeks: 16,
          tags: ['ai', 'research'],
          createdById: adminUser.id,
        });

        const response = await request(app.getHttpServer())
          .post(`/admin/milestone/templates/${originalTemplate.id}/duplicate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ newName: 'Duplicated Template' })
          .expect(201);

        expect(response.body.name).toBe('Duplicated Template');
        expect(response.body.description).toBe(originalTemplate.description);
        expect(response.body.specialization).toBe(
          originalTemplate.specialization,
        );
        expect(response.body.milestoneItems).toHaveLength(1);
        expect(response.body.id).not.toBe(originalTemplate.id);
      });
    });
  });

  describe('Academic Calendar Management', () => {
    describe('POST /admin/milestone/academic-calendar/import', () => {
      it('should import academic calendar from JSON', async () => {
        const calendarData = [
          {
            title: 'Fall Semester Start',
            type: 'semester_start',
            startDate: '2024-08-26',
            semester: 'fall',
            affectsMilestones: true,
            priority: 5,
          },
          {
            title: 'Thanksgiving Break',
            type: 'holiday',
            startDate: '2024-11-28',
            endDate: '2024-11-29',
            semester: 'fall',
            affectsMilestones: true,
            priority: 3,
          },
        ];

        const importDto = {
          source: 'University Calendar',
          format: 'json',
          data: JSON.stringify(calendarData),
          academicYear: 2024,
          semester: 'fall',
        };

        const response = await request(app.getHttpServer())
          .post('/admin/milestone/academic-calendar/import')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(importDto)
          .expect(201);

        expect(response.body).toHaveProperty('importedEvents');
        expect(response.body).toHaveProperty('totalImported');
        expect(response.body).toHaveProperty('adjustedMilestones');
        expect(response.body.totalImported).toBe(2);
        expect(Array.isArray(response.body.importedEvents)).toBe(true);
      });

      it('should return 400 for invalid calendar data', async () => {
        const importDto = {
          source: 'Test',
          format: 'json',
          data: 'invalid json',
          academicYear: 2024,
        };

        await request(app.getHttpServer())
          .post('/admin/milestone/academic-calendar/import')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(importDto)
          .expect(400);
      });

      it('should deny access to non-admin users', async () => {
        const importDto = {
          source: 'Test',
          format: 'json',
          data: '[]',
          academicYear: 2024,
        };

        await request(app.getHttpServer())
          .post('/admin/milestone/academic-calendar/import')
          .set('Authorization', `Bearer ${studentToken}`)
          .send(importDto)
          .expect(403);
      });
    });

    describe('GET /admin/milestone/academic-calendar', () => {
      it('should return academic calendar events', async () => {
        // Create test calendar events
        await academicCalendarRepository.save([
          {
            title: 'Fall Semester Start',
            eventType: 'semester_start',
            startDate: new Date('2024-08-26'),
            semester: 'fall',
            academicYear: 2024,
            isRecurring: false,
            affectsMilestones: true,
            priority: 5,
            importSource: 'Test',
            importedBy: adminUser.id,
          },
          {
            title: 'Spring Semester Start',
            eventType: 'semester_start',
            startDate: new Date('2025-01-15'),
            semester: 'spring',
            academicYear: 2024,
            isRecurring: false,
            affectsMilestones: true,
            priority: 5,
            importSource: 'Test',
            importedBy: adminUser.id,
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/admin/milestone/academic-calendar')
          .query({ academicYear: 2024 })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
        expect(response.body[0]).toHaveProperty('title');
        expect(response.body[0]).toHaveProperty('eventType');
        expect(response.body[0]).toHaveProperty('startDate');
        expect(response.body[0]).toHaveProperty('academicYear', 2024);
      });

      it('should filter by semester', async () => {
        await academicCalendarRepository.save([
          {
            title: 'Fall Event',
            eventType: 'semester_start',
            startDate: new Date('2024-08-26'),
            semester: 'fall',
            academicYear: 2024,
            isRecurring: false,
            affectsMilestones: true,
            priority: 5,
            importSource: 'Test',
            importedBy: adminUser.id,
          },
          {
            title: 'Spring Event',
            eventType: 'semester_start',
            startDate: new Date('2025-01-15'),
            semester: 'spring',
            academicYear: 2024,
            isRecurring: false,
            affectsMilestones: true,
            priority: 5,
            importSource: 'Test',
            importedBy: adminUser.id,
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/admin/milestone/academic-calendar')
          .query({ academicYear: 2024, semester: 'fall' })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.length).toBe(1);
        expect(response.body[0].semester).toBe('fall');
      });

      it('should return 400 for invalid academic year', async () => {
        await request(app.getHttpServer())
          .get('/admin/milestone/academic-calendar')
          .query({ academicYear: 'invalid' })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        await request(app.getHttpServer())
          .get('/admin/milestone/academic-calendar')
          .query({ academicYear: 2050 })
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);
      });
    });
  });

  describe('System Configuration', () => {
    describe('GET /admin/milestone/reminder-configuration', () => {
      it('should return reminder configuration and status', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/milestone/reminder-configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('configuration');
        expect(response.body).toHaveProperty('status');
        expect(response.body.configuration).toHaveProperty('enabled');
        expect(response.body.configuration).toHaveProperty(
          'advanceReminderDays',
        );
        expect(response.body.configuration).toHaveProperty(
          'overdueReminderDays',
        );
        expect(response.body.configuration).toHaveProperty('escalationDays');
        expect(response.body.status).toHaveProperty('isHealthy');
      });

      it('should deny access to non-admin users', async () => {
        await request(app.getHttpServer())
          .get('/admin/milestone/reminder-configuration')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
      });
    });

    describe('PUT /admin/milestone/reminder-configuration', () => {
      it('should update reminder configuration', async () => {
        const configDto = {
          enabled: true,
          advanceReminderDays: [7, 3, 1],
          overdueReminderDays: [1, 3, 7],
          escalationDays: 5,
          maxRetries: 3,
          retryIntervalHours: 4,
        };

        const response = await request(app.getHttpServer())
          .put('/admin/milestone/reminder-configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(configDto)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('configuration');
        expect(response.body).toHaveProperty('restartRequired');
        expect(response.body.configuration.escalationDays).toBe(5);
        expect(response.body.configuration.retryIntervalHours).toBe(4);
      });

      it('should return 400 for invalid configuration', async () => {
        const invalidConfig = {
          enabled: true,
          advanceReminderDays: [50], // Invalid: > 30
          overdueReminderDays: [1],
          escalationDays: 3,
          maxRetries: 3,
          retryIntervalHours: 2,
        };

        await request(app.getHttpServer())
          .put('/admin/milestone/reminder-configuration')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidConfig)
          .expect(400);
      });
    });

    describe('POST /admin/milestone/reminder-jobs/trigger', () => {
      it('should manually trigger reminder job', async () => {
        const response = await request(app.getHttpServer())
          .post('/admin/milestone/reminder-jobs/trigger')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('jobId');
        expect(response.body).toHaveProperty('processedReminders');
        expect(response.body).toHaveProperty('failedReminders');
        expect(response.body).toHaveProperty('executionTime');
        expect(typeof response.body.executionTime).toBe('number');
      });

      it('should deny access to non-admin users', async () => {
        await request(app.getHttpServer())
          .post('/admin/milestone/reminder-jobs/trigger')
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(403);
      });
    });

    describe('GET /admin/milestone/system-health', () => {
      it('should return system health status', async () => {
        const response = await request(app.getHttpServer())
          .get('/admin/milestone/system-health')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('overall');
        expect(response.body).toHaveProperty('components');
        expect(response.body).toHaveProperty('metrics');
        expect(response.body).toHaveProperty('lastChecked');
        expect(['healthy', 'warning', 'critical']).toContain(
          response.body.overall,
        );
        expect(response.body.components).toHaveProperty('database');
        expect(response.body.components).toHaveProperty('reminderJobs');
        expect(response.body.components).toHaveProperty('academicCalendar');
        expect(response.body.components).toHaveProperty('templates');
        expect(response.body.metrics).toHaveProperty('totalTemplates');
      });

      it('should deny access to non-admin users', async () => {
        await request(app.getHttpServer())
          .get('/admin/milestone/system-health')
          .set('Authorization', `Bearer ${supervisorToken}`)
          .expect(403);
      });
    });
  });
});
