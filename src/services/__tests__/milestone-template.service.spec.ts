import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneTemplateService } from '../milestone-template.service';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { User } from '../../entities/user.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateFiltersDto,
} from '../../dto/milestone';
import { ProjectType } from '../../common/enums/project-type.enum';
import { Priority } from '../../common/enums/priority.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  TemplateNotFoundException,
  TemplateValidationException,
  TemplatePermissionException,
} from '../../common/exceptions';

describe('MilestoneTemplateService', () => {
  let service: MilestoneTemplateService;
  let templateRepository: Repository<MilestoneTemplate>;
  let userRepository: Repository<User>;

  const mockSupervisor: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'supervisor@test.com',
    name: 'Test Supervisor',
    role: UserRole.SUPERVISOR,
    isEmailVerified: true,
    isActive: true,
    password: 'hashedPassword',
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplate: MilestoneTemplate = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    name: 'Computer Science Individual Project',
    description: 'Standard template for individual CS projects',
    specialization: 'Computer Science',
    projectType: ProjectType.INDIVIDUAL,
    estimatedDurationWeeks: 16,
    isActive: true,
    usageCount: 5,
    createdById: mockSupervisor.id,
    createdBy: mockSupervisor,
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
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTemplateRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    increment: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneTemplateService,
        {
          provide: getRepositoryToken(MilestoneTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<MilestoneTemplateService>(MilestoneTemplateService);
    templateRepository = module.get<Repository<MilestoneTemplate>>(
      getRepositoryToken(MilestoneTemplate),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    const validCreateDto: CreateTemplateDto = {
      name: 'New Template',
      description: 'A new template for testing',
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
      ],
    };

    it('should successfully create a template', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockSupervisor);
      mockTemplateRepository.create.mockReturnValue(mockTemplate);
      mockTemplateRepository.save.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.createTemplate(
        validCreateDto,
        mockSupervisor.id,
      );

      // Assert
      expect(result).toEqual(mockTemplate);
      expect(mockTemplateRepository.create).toHaveBeenCalledWith({
        ...validCreateDto,
        createdById: mockSupervisor.id,
        isActive: true,
        usageCount: 0,
      });
      expect(mockTemplateRepository.save).toHaveBeenCalled();
    });

    it('should throw TemplateValidationException for non-existent creator', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createTemplate(validCreateDto, 'invalid-id'),
      ).rejects.toThrow(TemplateValidationException);
    });

    it('should validate milestone items structure', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateDto,
        milestoneItems: [
          {
            title: '', // Invalid: empty title
            description: 'Test',
            daysFromStart: 14,
            priority: Priority.HIGH,
            estimatedHours: 40,
            tags: [],
          },
        ],
      };
      mockUserRepository.findOne.mockResolvedValue(mockSupervisor);

      // Act & Assert
      await expect(
        service.createTemplate(invalidDto, mockSupervisor.id),
      ).rejects.toThrow(TemplateValidationException);
    });

    it('should validate milestone items ordering', async () => {
      // Arrange
      const invalidDto = {
        ...validCreateDto,
        milestoneItems: [
          {
            title: 'Second Milestone',
            description: 'This comes after first',
            daysFromStart: 28,
            priority: Priority.HIGH,
            estimatedHours: 40,
            tags: [],
          },
          {
            title: 'First Milestone',
            description: 'This should come first',
            daysFromStart: 14, // Earlier than previous
            priority: Priority.HIGH,
            estimatedHours: 40,
            tags: [],
          },
        ],
      };
      mockUserRepository.findOne.mockResolvedValue(mockSupervisor);

      // Act & Assert
      await expect(
        service.createTemplate(invalidDto, mockSupervisor.id),
      ).rejects.toThrow(TemplateValidationException);
    });
  });

  describe('updateTemplate', () => {
    const validUpdateDto: UpdateTemplateDto = {
      name: 'Updated Template Name',
      description: 'Updated description',
    };

    it('should successfully update a template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.save.mockResolvedValue({
        ...mockTemplate,
        ...validUpdateDto,
      });

      // Act
      const result = await service.updateTemplate(
        mockTemplate.id,
        validUpdateDto,
        mockSupervisor.id,
      );

      // Assert
      expect(mockTemplateRepository.save).toHaveBeenCalled();
    });

    it('should throw TemplateNotFoundException for non-existent template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateTemplate('invalid-id', validUpdateDto, mockSupervisor.id),
      ).rejects.toThrow(TemplateNotFoundException);
    });

    it('should throw TemplatePermissionException for non-creator', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        service.updateTemplate(
          mockTemplate.id,
          validUpdateDto,
          'other-user-id',
        ),
      ).rejects.toThrow(TemplatePermissionException);
    });

    it('should validate milestone items if provided in update', async () => {
      // Arrange
      const updateWithInvalidItems = {
        ...validUpdateDto,
        milestoneItems: [
          {
            title: '', // Invalid
            description: 'Test',
            daysFromStart: 14,
            priority: Priority.HIGH,
            estimatedHours: 40,
            tags: [],
          },
        ],
      };
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        service.updateTemplate(
          mockTemplate.id,
          updateWithInvalidItems,
          mockSupervisor.id,
        ),
      ).rejects.toThrow(TemplateValidationException);
    });
  });

  describe('getTemplates', () => {
    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockTemplateRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
    });

    it('should get templates with default filters', async () => {
      // Arrange
      const templates = [mockTemplate];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(templates);

      // Act
      const result = await service.getTemplates();

      // Assert
      expect(result).toEqual({ templates, total: 1 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        {
          isActive: true,
        },
      );
    });

    it('should apply specialization filter', async () => {
      // Arrange
      const filters: TemplateFiltersDto = {
        specialization: 'Computer Science',
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getTemplates(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'template.specialization = :specialization',
        { specialization: 'Computer Science' },
      );
    });

    it('should apply project type filter', async () => {
      // Arrange
      const filters: TemplateFiltersDto = { projectType: ProjectType.GROUP };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getTemplates(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'template.projectType = :projectType',
        { projectType: ProjectType.GROUP },
      );
    });

    it('should apply search filter', async () => {
      // Arrange
      const filters: TemplateFiltersDto = { search: 'computer science' };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getTemplates(filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(template.name ILIKE :search OR template.description ILIKE :search OR template.specialization ILIKE :search)',
        { search: '%computer science%' },
      );
    });

    it('should include inactive templates when requested', async () => {
      // Arrange
      const filters: TemplateFiltersDto = { includeInactive: true };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getTemplates(filters);

      // Assert
      expect(mockQueryBuilder.where).not.toHaveBeenCalledWith(
        'template.isActive = :isActive',
        expect.any(Object),
      );
    });
  });

  describe('getTemplateById', () => {
    it('should return template by id', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      // Act
      const result = await service.getTemplateById(mockTemplate.id);

      // Assert
      expect(result).toEqual(mockTemplate);
      expect(mockTemplateRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTemplate.id },
        relations: ['createdBy'],
      });
    });

    it('should throw TemplateNotFoundException for non-existent template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTemplateById('invalid-id')).rejects.toThrow(
        TemplateNotFoundException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should successfully delete a template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.remove.mockResolvedValue(mockTemplate);

      // Act
      await service.deleteTemplate(mockTemplate.id, mockSupervisor.id);

      // Assert
      expect(mockTemplateRepository.remove).toHaveBeenCalledWith(mockTemplate);
    });

    it('should throw TemplateNotFoundException for non-existent template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteTemplate('invalid-id', mockSupervisor.id),
      ).rejects.toThrow(TemplateNotFoundException);
    });

    it('should throw TemplatePermissionException for non-creator', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);

      // Act & Assert
      await expect(
        service.deleteTemplate(mockTemplate.id, 'other-user-id'),
      ).rejects.toThrow(TemplatePermissionException);
    });
  });

  describe('archiveTemplate', () => {
    it('should successfully archive a template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
      mockTemplateRepository.save.mockResolvedValue({
        ...mockTemplate,
        isActive: false,
      });

      // Act
      const result = await service.archiveTemplate(
        mockTemplate.id,
        mockSupervisor.id,
      );

      // Assert
      expect(result.isActive).toBe(false);
      expect(mockTemplateRepository.save).toHaveBeenCalled();
    });

    it('should throw TemplateNotFoundException for non-existent template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.archiveTemplate('invalid-id', mockSupervisor.id),
      ).rejects.toThrow(TemplateNotFoundException);
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment template usage count', async () => {
      // Arrange
      mockTemplateRepository.increment.mockResolvedValue({ affected: 1 });

      // Act
      await service.incrementUsageCount(mockTemplate.id);

      // Assert
      expect(mockTemplateRepository.increment).toHaveBeenCalledWith(
        { id: mockTemplate.id },
        'usageCount',
        1,
      );
    });
  });

  describe('getTemplateUsageStats', () => {
    it('should return template usage statistics', async () => {
      // Arrange
      const templateWithStats = {
        ...mockTemplate,
        usageCount: 10,
      };
      mockTemplateRepository.findOne.mockResolvedValue(templateWithStats);

      // Act
      const result = await service.getTemplateUsageStats(mockTemplate.id);

      // Assert
      expect(result).toEqual({
        templateId: mockTemplate.id,
        templateName: mockTemplate.name,
        totalUsages: 10,
        averageUsagesPerMonth: expect.any(Number),
        lastUsed: expect.any(Date),
        popularityRank: expect.any(Number),
      });
    });

    it('should throw TemplateNotFoundException for non-existent template', async () => {
      // Arrange
      mockTemplateRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTemplateUsageStats('invalid-id')).rejects.toThrow(
        TemplateNotFoundException,
      );
    });
  });

  describe('validateMilestoneItems', () => {
    it('should validate milestone items successfully', () => {
      // Arrange
      const validItems = [
        {
          title: 'First Milestone',
          description: 'First milestone description',
          daysFromStart: 7,
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: ['research'],
        },
        {
          title: 'Second Milestone',
          description: 'Second milestone description',
          daysFromStart: 14,
          priority: Priority.MEDIUM,
          estimatedHours: 30,
          tags: ['development'],
        },
      ];

      // Act & Assert
      expect(() => service.validateMilestoneItems(validItems)).not.toThrow();
    });

    it('should throw error for empty title', () => {
      // Arrange
      const invalidItems = [
        {
          title: '', // Invalid
          description: 'Description',
          daysFromStart: 7,
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: [],
        },
      ];

      // Act & Assert
      expect(() => service.validateMilestoneItems(invalidItems)).toThrow(
        TemplateValidationException,
      );
    });

    it('should throw error for negative days from start', () => {
      // Arrange
      const invalidItems = [
        {
          title: 'Milestone',
          description: 'Description',
          daysFromStart: -1, // Invalid
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: [],
        },
      ];

      // Act & Assert
      expect(() => service.validateMilestoneItems(invalidItems)).toThrow(
        TemplateValidationException,
      );
    });

    it('should throw error for unordered milestones', () => {
      // Arrange
      const invalidItems = [
        {
          title: 'Second Milestone',
          description: 'This should come second',
          daysFromStart: 14,
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: [],
        },
        {
          title: 'First Milestone',
          description: 'This should come first',
          daysFromStart: 7, // Earlier than previous
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: [],
        },
      ];

      // Act & Assert
      expect(() => service.validateMilestoneItems(invalidItems)).toThrow(
        TemplateValidationException,
      );
    });

    it('should throw error for duplicate days from start', () => {
      // Arrange
      const invalidItems = [
        {
          title: 'First Milestone',
          description: 'First',
          daysFromStart: 7,
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: [],
        },
        {
          title: 'Second Milestone',
          description: 'Second',
          daysFromStart: 7, // Duplicate
          priority: Priority.HIGH,
          estimatedHours: 20,
          tags: [],
        },
      ];

      // Act & Assert
      expect(() => service.validateMilestoneItems(invalidItems)).toThrow(
        TemplateValidationException,
      );
    });
  });
});
