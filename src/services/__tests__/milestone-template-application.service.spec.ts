import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MilestoneTemplateApplicationService } from '../milestone-template-application.service';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import {
  ApplyTemplateDto,
  TemplateMilestoneCustomizationDto,
} from '../../dto/milestone';
import {
  MilestoneNotFoundException,
  MilestoneValidationException,
  AcademicCalendarException,
} from '../../common/exceptions';
import {
  UserRole,
  ProjectType,
  Priority,
  MilestoneStatus,
} from '../../common/enums';

describe('MilestoneTemplateApplicationService', () => {
  let service: MilestoneTemplateApplicationService;
  let templateRepository: jest.Mocked<Repository<MilestoneTemplate>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockUser = {
    id: 'student-1',
    email: 'student@test.com',
    role: UserRole.STUDENT,
  } as User;

  const mockProject = {
    id: 'project-1',
    title: 'Test Project',
  } as Project;

  const createMockTemplate = (
    overrides: Partial<MilestoneTemplate> = {},
  ): MilestoneTemplate => {
    return {
      id: 'template-1',
      name: 'AI/ML Project Template',
      description: 'Standard template for AI/ML projects',
      specialization: 'Artificial Intelligence',
      projectType: ProjectType.INDIVIDUAL,
      milestoneItems: [
        {
          title: 'Literature Review',
          description: 'Complete comprehensive literature review',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 40,
          dependencies: [],
          tags: ['research'],
        },
        {
          title: 'Data Collection',
          description: 'Gather and prepare dataset',
          daysFromStart: 28,
          priority: Priority.HIGH,
          estimatedHours: 30,
          dependencies: ['Literature Review'],
          tags: ['data'],
        },
      ],
      configuration: {
        allowCustomization: true,
        minimumDurationWeeks: 8,
        maximumDurationWeeks: 16,
        requiredMilestones: ['Literature Review'],
        optionalMilestones: [],
      },
      estimatedDurationWeeks: 12,
      isActive: true,
      usageCount: 5,
      averageRating: 4.2,
      ratingCount: 3,
      tags: ['ai', 'ml'],
      createdById: 'admin-1',
      archivedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      incrementUsage: jest.fn(),
      ...overrides,
    } as unknown as MilestoneTemplate;
  };

  const createMockMilestone = (
    overrides: Partial<Milestone> = {},
  ): Milestone => {
    return {
      id: 'milestone-1',
      title: 'Test Milestone',
      description: 'Test description',
      dueDate: new Date('2024-06-01'),
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
      studentId: 'student-1',
      projectId: null,
      estimatedHours: 20,
      actualHours: 0,
      ...overrides,
    } as Milestone;
  };

  beforeEach(async () => {
    const mockEntityManager = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneTemplateApplicationService,
        {
          provide: getRepositoryToken(MilestoneTemplate),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation(async (callback) => {
              return callback(mockEntityManager);
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MilestoneTemplateApplicationService>(
      MilestoneTemplateApplicationService,
    );
    templateRepository = module.get(getRepositoryToken(MilestoneTemplate));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    dataSource = module.get(DataSource);
  });

  describe('applyTemplate', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

    const applyDto: ApplyTemplateDto = {
      templateId: 'template-1',
      startDate: futureDate.toISOString().split('T')[0],
      projectId: 'project-1',
    };

    it('should apply template successfully', async () => {
      const mockTemplate = createMockTemplate();
      const mockMilestone = createMockMilestone();

      userRepository.findOne.mockResolvedValue(mockUser);
      templateRepository.findOne.mockResolvedValue(mockTemplate);
      projectRepository.findOne.mockResolvedValue(mockProject);
      milestoneRepository.find.mockResolvedValue([mockMilestone]);

      // Mock transaction
      const mockEntityManager = {
        create: jest.fn().mockReturnValue(mockMilestone),
        save: jest.fn().mockResolvedValue(mockMilestone),
      };
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockEntityManager);
        },
      );

      const result = await service.applyTemplate(applyDto, mockUser.id);

      expect(result).toEqual([mockMilestone]);
      expect(mockTemplate.incrementUsage).toHaveBeenCalled();
    });

    it('should throw error if student not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyTemplate(applyDto, 'invalid-student'),
      ).rejects.toThrow(MilestoneValidationException);
    });

    it('should throw error if template not found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      templateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyTemplate(applyDto, mockUser.id),
      ).rejects.toThrow(MilestoneNotFoundException);
    });

    it('should throw error if project not found', async () => {
      const mockTemplate = createMockTemplate();
      userRepository.findOne.mockResolvedValue(mockUser);
      templateRepository.findOne.mockResolvedValue(mockTemplate);
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.applyTemplate(applyDto, mockUser.id),
      ).rejects.toThrow(MilestoneValidationException);
    });

    it('should apply template with customizations', async () => {
      const customizations: TemplateMilestoneCustomizationDto[] = [
        {
          milestoneTitle: 'Literature Review',
          newTitle: 'Custom Literature Review',
          newDaysFromStart: 21,
        },
      ];

      const applyDtoWithCustomizations = {
        ...applyDto,
        customizations,
      };

      const mockTemplate = createMockTemplate();
      const mockMilestone = createMockMilestone();

      userRepository.findOne.mockResolvedValue(mockUser);
      templateRepository.findOne.mockResolvedValue(mockTemplate);
      projectRepository.findOne.mockResolvedValue(mockProject);
      milestoneRepository.find.mockResolvedValue([mockMilestone]);

      const mockEntityManager = {
        create: jest.fn().mockReturnValue(mockMilestone),
        save: jest.fn().mockResolvedValue(mockMilestone),
      };
      (dataSource.transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return callback(mockEntityManager);
        },
      );

      const result = await service.applyTemplate(
        applyDtoWithCustomizations,
        mockUser.id,
      );

      expect(result).toEqual([mockMilestone]);
    });
  });

  describe('validateTemplateApplication', () => {
    it('should return no errors for valid application', async () => {
      const mockTemplate = createMockTemplate();
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
      const errors = await service.validateTemplateApplication(
        'template-1',
        futureDate,
      );

      expect(errors).toEqual([]);
    });

    it('should return error for past start date', async () => {
      const mockTemplate = createMockTemplate();
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const pastDate = new Date('2020-01-01');
      const errors = await service.validateTemplateApplication(
        'template-1',
        pastDate,
      );

      expect(errors).toContain('Start date cannot be in the past');
    });

    it('should return error for invalid template', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      const startDate = new Date('2024-05-01');
      const errors = await service.validateTemplateApplication(
        'invalid-template',
        startDate,
      );

      expect(errors).toContain('Template not found or inactive');
    });

    it('should validate customizations', async () => {
      const mockTemplate = createMockTemplate();
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const customizations: TemplateMilestoneCustomizationDto[] = [
        {
          milestoneTitle: 'Non-existent Milestone',
          newTitle: 'Custom Title',
        },
      ];

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const errors = await service.validateTemplateApplication(
        'template-1',
        futureDate,
        customizations,
      );

      expect(errors).toContain(
        'Milestone "Non-existent Milestone" not found in template',
      );
    });

    it('should prevent exclusion of required milestones', async () => {
      const mockTemplate = createMockTemplate();
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const customizations: TemplateMilestoneCustomizationDto[] = [
        {
          milestoneTitle: 'Literature Review',
          exclude: true,
        },
      ];

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const errors = await service.validateTemplateApplication(
        'template-1',
        futureDate,
        customizations,
      );

      expect(errors).toContain(
        'Required milestone "Literature Review" cannot be excluded',
      );
    });
  });

  describe('calculateMilestoneDueDates', () => {
    it('should calculate due dates correctly', () => {
      const mockTemplate = createMockTemplate();
      const startDate = new Date('2025-05-01');

      const dueDateMap = service.calculateMilestoneDueDates(
        mockTemplate,
        startDate,
      );

      expect(dueDateMap.size).toBe(2);
      expect(dueDateMap.get('Literature Review')).toEqual(
        new Date('2025-05-15'),
      ); // 14 days from start
      expect(dueDateMap.get('Data Collection')).toEqual(new Date('2025-05-29')); // 28 days from start
    });

    it('should scale due dates with custom duration', () => {
      const mockTemplate = createMockTemplate();
      const startDate = new Date('2025-05-01');
      const customDurationWeeks = 24; // Double the original 12 weeks

      const dueDateMap = service.calculateMilestoneDueDates(
        mockTemplate,
        startDate,
        customDurationWeeks,
      );

      expect(dueDateMap.size).toBe(2);
      expect(dueDateMap.get('Literature Review')).toEqual(
        new Date('2025-05-29'),
      ); // 28 days (14 * 2)
      expect(dueDateMap.get('Data Collection')).toEqual(new Date('2025-06-26')); // 56 days (28 * 2)
    });
  });

  describe('detectSchedulingConflicts', () => {
    it('should detect conflicts with existing milestones', async () => {
      const existingMilestone = createMockMilestone({
        title: 'Existing Milestone',
        dueDate: new Date('2024-05-15'),
      });

      milestoneRepository.find.mockResolvedValue([existingMilestone]);

      const proposedMilestones = [
        { title: 'New Milestone', dueDate: new Date('2024-05-16') }, // 1 day apart
      ];

      const conflicts = await service.detectSchedulingConflicts(
        'student-1',
        proposedMilestones,
      );

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('conflicts with existing milestone');
    });

    it('should detect conflicts within proposed milestones', async () => {
      milestoneRepository.find.mockResolvedValue([]);

      const proposedMilestones = [
        { title: 'Milestone 1', dueDate: new Date('2025-05-15') },
        { title: 'Milestone 2', dueDate: new Date('2025-05-16') }, // 1 day apart
      ];

      const conflicts = await service.detectSchedulingConflicts(
        'student-1',
        proposedMilestones,
      );

      expect(conflicts.length).toBeGreaterThan(0);
      expect(conflicts[0]).toContain('conflicts with');
    });

    it('should return no conflicts when milestones are well spaced', async () => {
      milestoneRepository.find.mockResolvedValue([]);

      const proposedMilestones = [
        { title: 'Milestone 1', dueDate: new Date('2024-05-01') },
        { title: 'Milestone 2', dueDate: new Date('2024-05-15') }, // 14 days apart
      ];

      const conflicts = await service.detectSchedulingConflicts(
        'student-1',
        proposedMilestones,
      );

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('previewTemplateApplication', () => {
    it('should generate preview of template application', async () => {
      const mockTemplate = createMockTemplate();
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const applyDto: ApplyTemplateDto = {
        templateId: 'template-1',
        startDate: '2025-05-01',
      };

      const preview = await service.previewTemplateApplication(
        applyDto,
        'student-1',
      );

      expect(preview).toHaveLength(2);
      expect(preview[0].title).toBe('Literature Review');
      expect(preview[0].dueDate).toEqual(new Date('2025-05-15'));
      expect(preview[1].title).toBe('Data Collection');
      expect(preview[1].dueDate).toEqual(new Date('2025-05-29'));
    });

    it('should apply customizations in preview', async () => {
      const mockTemplate = createMockTemplate();
      templateRepository.findOne.mockResolvedValue(mockTemplate);

      const customizations: TemplateMilestoneCustomizationDto[] = [
        {
          milestoneTitle: 'Literature Review',
          newTitle: 'Custom Literature Review',
          newDaysFromStart: 21,
        },
        {
          milestoneTitle: 'Data Collection',
          exclude: true,
        },
      ];

      const applyDto: ApplyTemplateDto = {
        templateId: 'template-1',
        startDate: '2025-05-01',
        customizations,
      };

      const preview = await service.previewTemplateApplication(
        applyDto,
        'student-1',
      );

      expect(preview).toHaveLength(1); // Data Collection excluded
      expect(preview[0].title).toBe('Custom Literature Review');
      expect(preview[0].dueDate).toEqual(new Date('2025-05-22')); // 21 days from start
    });

    it('should throw error if template not found', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      const applyDto: ApplyTemplateDto = {
        templateId: 'invalid-template',
        startDate: '2025-05-01',
      };

      await expect(
        service.previewTemplateApplication(applyDto, 'student-1'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });
});
