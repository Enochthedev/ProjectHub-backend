import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MilestoneTemplateLibraryService } from '../milestone-template-library.service';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { User } from '../../entities/user.entity';
import { UserRole, ProjectType, Priority } from '../../common/enums';

describe('MilestoneTemplateLibraryService', () => {
  let service: MilestoneTemplateLibraryService;
  let templateRepository: jest.Mocked<Repository<MilestoneTemplate>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneTemplateLibraryService,
        {
          provide: getRepositoryToken(MilestoneTemplate),
          useValue: {
            findOne: jest.fn(),
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
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MilestoneTemplateLibraryService>(
      MilestoneTemplateLibraryService,
    );
    templateRepository = module.get(getRepositoryToken(MilestoneTemplate));
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
  });

  describe('initializeDefaultTemplates', () => {
    it('should create all default templates', async () => {
      userRepository.findOne.mockResolvedValue(mockAdmin);
      templateRepository.findOne.mockResolvedValue(null); // No existing templates

      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
      } as MilestoneTemplate;
      templateRepository.create.mockReturnValue(mockTemplate);
      templateRepository.save.mockResolvedValue(mockTemplate);

      const result = await service.initializeDefaultTemplates(mockAdmin.id);

      expect(result).toHaveLength(8); // Should create 8 default templates
      expect(templateRepository.create).toHaveBeenCalledTimes(8);
      expect(templateRepository.save).toHaveBeenCalledTimes(8);
    });

    it('should skip existing templates', async () => {
      userRepository.findOne.mockResolvedValue(mockAdmin);

      const existingTemplate = {
        id: 'existing-1',
        name: 'Existing Template',
      } as MilestoneTemplate;
      templateRepository.findOne.mockResolvedValue(existingTemplate);

      const result = await service.initializeDefaultTemplates(mockAdmin.id);

      expect(result).toHaveLength(8); // Should return 8 templates (all existing)
      expect(templateRepository.create).not.toHaveBeenCalled();
      expect(templateRepository.save).not.toHaveBeenCalled();
    });

    it('should throw error if admin not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.initializeDefaultTemplates('invalid-admin'),
      ).rejects.toThrow('Admin user not found');
    });
  });

  describe('getAIMLTemplates', () => {
    it('should return AI/ML milestone templates', () => {
      const templates = service.getAIMLTemplates();

      expect(templates).toHaveLength(8);
      expect(templates[0].title).toBe('Literature Review');
      expect(templates[0].priority).toBe(Priority.HIGH);
      expect(templates[0].estimatedHours).toBe(40);

      // Check that all templates have required properties
      templates.forEach((template) => {
        expect(template.title).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.daysFromStart).toBeGreaterThanOrEqual(0);
        expect(template.priority).toBeDefined();
        expect(template.estimatedHours).toBeGreaterThan(0);
        expect(template.dependencies).toBeDefined();
        expect(template.tags).toBeDefined();
      });
    });

    it('should have proper dependency chain', () => {
      const templates = service.getAIMLTemplates();

      // First template should have no dependencies
      expect(templates[0].dependencies).toEqual([]);

      // Later templates should have dependencies
      const dataPreprocessing = templates.find(
        (t) => t.title === 'Data Preprocessing & EDA',
      );
      expect(dataPreprocessing?.dependencies).toContain(
        'Problem Definition & Dataset Selection',
      );
    });
  });

  describe('getWebDevelopmentTemplates', () => {
    it('should return web development milestone templates', () => {
      const templates = service.getWebDevelopmentTemplates();

      expect(templates).toHaveLength(8);
      expect(templates[0].title).toBe('Project Setup');
      expect(templates[templates.length - 1].title).toBe('Final Deployment');

      // Check for key web development milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Backend API Development');
      expect(titles).toContain('Frontend Development');
      expect(titles).toContain('Database Design & Setup');
    });
  });

  describe('getMobileAppTemplates', () => {
    it('should return mobile app milestone templates', () => {
      const templates = service.getMobileAppTemplates();

      expect(templates).toHaveLength(8);
      expect(templates[0].title).toBe('App Design');

      // Check for key mobile development milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Development Environment Setup');
      expect(titles).toContain('App Store Submission');
      expect(titles).toContain('Testing & Bug Fixes');
    });
  });

  describe('getResearchProjectTemplates', () => {
    it('should return research project milestone templates', () => {
      const templates = service.getResearchProjectTemplates();

      expect(templates).toHaveLength(8);
      expect(templates[0].title).toBe('Research Proposal');

      // Check for key research milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Literature Review');
      expect(titles).toContain('Methodology Development');
      expect(titles).toContain('Thesis/Paper Writing');
    });
  });

  describe('getGroupProjectTemplates', () => {
    it('should return group project milestone templates', () => {
      const templates = service.getGroupProjectTemplates();

      expect(templates).toHaveLength(9);
      expect(templates[0].title).toBe('Team Formation & Planning');

      // Check for key group project milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Task Distribution & Setup');
      expect(titles).toContain('Sprint 1 - Core Features');
      expect(titles).toContain('Final Delivery');
    });
  });

  describe('getCybersecurityTemplates', () => {
    it('should return cybersecurity milestone templates', () => {
      const templates = service.getCybersecurityTemplates();

      expect(templates).toHaveLength(7);
      expect(templates[0].title).toBe('Security Analysis');

      // Check for key cybersecurity milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Vulnerability Assessment');
      expect(titles).toContain('Penetration Testing');
      expect(titles).toContain('Security Implementation');
    });
  });

  describe('getDataScienceTemplates', () => {
    it('should return data science milestone templates', () => {
      const templates = service.getDataScienceTemplates();

      expect(templates).toHaveLength(8);
      expect(templates[0].title).toBe('Data Collection');

      // Check for key data science milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Exploratory Data Analysis');
      expect(titles).toContain('Feature Engineering');
      expect(titles).toContain('Model Development');
      expect(titles).toContain('Model Deployment');
    });
  });

  describe('getGameDevelopmentTemplates', () => {
    it('should return game development milestone templates', () => {
      const templates = service.getGameDevelopmentTemplates();

      expect(templates).toHaveLength(8);
      expect(templates[0].title).toBe('Game Design Document');

      // Check for key game development milestones
      const titles = templates.map((t) => t.title);
      expect(titles).toContain('Core Game Mechanics');
      expect(titles).toContain('Art & Asset Creation');
      expect(titles).toContain('Level Design & Content');
      expect(titles).toContain('Game Release');
    });
  });

  describe('createTemplateFromLibrary', () => {
    beforeEach(() => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
      } as MilestoneTemplate;
      templateRepository.create.mockReturnValue(mockTemplate);
      templateRepository.save.mockResolvedValue(mockTemplate);
    });

    it('should create AI/ML template', async () => {
      const result = await service.createTemplateFromLibrary(
        'Artificial Intelligence',
        ProjectType.INDIVIDUAL,
        mockAdmin.id,
      );

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AI/ML Project',
          specialization: 'Artificial Intelligence',
          projectType: ProjectType.INDIVIDUAL,
          estimatedDurationWeeks: 16,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should create web development template', async () => {
      const result = await service.createTemplateFromLibrary(
        'Web Development',
        ProjectType.INDIVIDUAL,
        mockAdmin.id,
      );

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Web Development Project',
          specialization: 'Web Development',
          projectType: ProjectType.INDIVIDUAL,
          estimatedDurationWeeks: 14,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should create group project template', async () => {
      const result = await service.createTemplateFromLibrary(
        'Web Development',
        ProjectType.GROUP,
        mockAdmin.id,
      );

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Web Development Project (Group)',
          projectType: ProjectType.GROUP,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should create research project template', async () => {
      const result = await service.createTemplateFromLibrary(
        'AI',
        ProjectType.RESEARCH,
        mockAdmin.id,
      );

      expect(templateRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'AI/ML Project (Research)',
          projectType: ProjectType.RESEARCH,
          estimatedDurationWeeks: 20,
        }),
      );
      expect(result).toBeDefined();
    });

    it('should handle case-insensitive specialization matching', async () => {
      await service.createTemplateFromLibrary(
        'ARTIFICIAL INTELLIGENCE',
        ProjectType.INDIVIDUAL,
        mockAdmin.id,
      );
      await service.createTemplateFromLibrary(
        'web development',
        ProjectType.INDIVIDUAL,
        mockAdmin.id,
      );
      await service.createTemplateFromLibrary(
        'Mobile',
        ProjectType.INDIVIDUAL,
        mockAdmin.id,
      );

      expect(templateRepository.create).toHaveBeenCalledTimes(3);
    });

    it('should throw error for unknown specialization', async () => {
      await expect(
        service.createTemplateFromLibrary(
          'Unknown Specialization',
          ProjectType.INDIVIDUAL,
          mockAdmin.id,
        ),
      ).rejects.toThrow(
        'No template available for specialization: Unknown Specialization',
      );
    });
  });

  describe('template validation', () => {
    it('should ensure all templates have valid structure', () => {
      const allTemplateGetters = [
        () => service.getAIMLTemplates(),
        () => service.getWebDevelopmentTemplates(),
        () => service.getMobileAppTemplates(),
        () => service.getResearchProjectTemplates(),
        () => service.getGroupProjectTemplates(),
        () => service.getCybersecurityTemplates(),
        () => service.getDataScienceTemplates(),
        () => service.getGameDevelopmentTemplates(),
      ];

      allTemplateGetters.forEach((getter) => {
        const templates = getter();

        templates.forEach((template) => {
          // Validate required fields
          expect(template.title).toBeTruthy();
          expect(template.description).toBeTruthy();
          expect(template.daysFromStart).toBeGreaterThanOrEqual(0);
          expect(template.estimatedHours).toBeGreaterThan(0);
          expect(Object.values(Priority)).toContain(template.priority);
          expect(Array.isArray(template.dependencies)).toBe(true);
          expect(Array.isArray(template.tags)).toBe(true);
        });

        // Validate timeline progression
        for (let i = 1; i < templates.length; i++) {
          expect(templates[i].daysFromStart).toBeGreaterThanOrEqual(
            templates[i - 1].daysFromStart,
          );
        }
      });
    });

    it('should have reasonable time estimates', () => {
      const allTemplateGetters = [
        () => service.getAIMLTemplates(),
        () => service.getWebDevelopmentTemplates(),
        () => service.getMobileAppTemplates(),
        () => service.getResearchProjectTemplates(),
        () => service.getGroupProjectTemplates(),
        () => service.getCybersecurityTemplates(),
        () => service.getDataScienceTemplates(),
        () => service.getGameDevelopmentTemplates(),
      ];

      allTemplateGetters.forEach((getter) => {
        const templates = getter();

        templates.forEach((template) => {
          // Reasonable hour estimates (between 5 and 100 hours per milestone)
          expect(template.estimatedHours).toBeGreaterThanOrEqual(5);
          expect(template.estimatedHours).toBeLessThanOrEqual(100);

          // Reasonable timeline (within 1 year)
          expect(template.daysFromStart).toBeLessThanOrEqual(365);
        });
      });
    });
  });
});
