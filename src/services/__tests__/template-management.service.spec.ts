import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TemplateManagementService } from '../template-management.service';
import { ResponseTemplate } from '../../entities/response-template.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateMatchDto,
  ProcessTemplateDto,
} from '../../dto/template';

describe('TemplateManagementService', () => {
  let service: TemplateManagementService;
  let repository: jest.Mocked<Repository<ResponseTemplate>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<ResponseTemplate>>;

  const mockTemplate: ResponseTemplate = {
    id: 'template-id',
    name: 'Test Template',
    template: 'Hello {{name}}, welcome to {{platform}}!',
    category: 'greeting',
    triggerKeywords: ['hello', 'welcome', 'greeting'],
    variables: { platform: 'FYP Platform' },
    language: 'en',
    isActive: true,
    usageCount: 10,
    effectivenessScore: 4.2,
    createdAt: new Date(),
    updatedAt: new Date(),
    incrementUsage: jest.fn(),
    updateEffectiveness: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    addTriggerKeyword: jest.fn(),
    removeTriggerKeyword: jest.fn(),
    setVariable: jest.fn(),
    getVariable: jest.fn(),
    removeVariable: jest.fn(),
    processTemplate: jest
      .fn()
      .mockReturnValue('Hello John, welcome to FYP Platform!'),
    matchesKeywords: jest.fn().mockReturnValue(true),
    getMatchScore: jest.fn().mockReturnValue(0.8),
    isEffective: jest.fn().mockReturnValue(true),
    isPopular: jest.fn().mockReturnValue(true),
    isMultilingual: jest.fn().mockReturnValue(false),
    hasVariables: jest.fn().mockReturnValue(true),
    getVariableKeys: jest.fn().mockReturnValue(['platform']),
    validateTemplate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  };

  beforeEach(async () => {
    // Create mock query builder
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    } as any;

    // Create mock repository
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateManagementService,
        {
          provide: getRepositoryToken(ResponseTemplate),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TemplateManagementService>(TemplateManagementService);
    repository = module.get(getRepositoryToken(ResponseTemplate));
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const createDto: CreateTemplateDto = {
        name: 'Test Template',
        template: 'Hello {{name}}, welcome to {{platform}}!',
        category: 'greeting',
        triggerKeywords: ['Hello', 'Welcome', 'Greeting'],
        variables: { platform: 'FYP Platform' },
        language: 'en',
      };

      repository.create.mockReturnValue(mockTemplate);
      repository.save.mockResolvedValue(mockTemplate);

      const result = await service.createTemplate(createDto);

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        triggerKeywords: ['hello', 'welcome', 'greeting'], // normalized to lowercase
      });
      expect(repository.save).toHaveBeenCalledWith(mockTemplate);
      expect(result).toEqual(mockTemplate);
    });

    it('should throw BadRequestException for invalid template', async () => {
      const createDto: CreateTemplateDto = {
        name: '',
        template: 'Invalid {{template',
        category: 'test',
        triggerKeywords: ['test'],
      };

      const invalidTemplate = {
        ...mockTemplate,
        validateTemplate: jest.fn().mockReturnValue({
          isValid: false,
          errors: [
            'Template name cannot be empty',
            'Template contains unclosed variable placeholders',
          ],
        }),
      };

      repository.create.mockReturnValue(invalidTemplate as any);

      await expect(service.createTemplate(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updateDto: UpdateTemplateDto = {
        name: 'Updated Template',
        isActive: false,
      };

      repository.findOne.mockResolvedValue(mockTemplate);
      const updatedTemplate = Object.assign({}, mockTemplate, updateDto);
      repository.save.mockResolvedValue(updatedTemplate);

      const result = await service.updateTemplate('template-id', updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-id' },
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Template');
    });

    it('should throw NotFoundException when template not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateTemplate('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('should return template by id', async () => {
      repository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findById('template-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'template-id' },
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException when template not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      repository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteTemplate('template-id');

      expect(repository.delete).toHaveBeenCalledWith('template-id');
    });

    it('should throw NotFoundException when template not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.deleteTemplate('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMatchingTemplates', () => {
    it('should find matching templates with scores', async () => {
      const matchDto: TemplateMatchDto = {
        query: 'hello there',
        category: 'greeting',
        limit: 3,
        minMatchScore: 0.5,
      };

      queryBuilder.getMany.mockResolvedValue([mockTemplate]);

      const result = await service.findMatchingTemplates(matchDto);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        {
          isActive: true,
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'template.category = :category',
        {
          category: 'greeting',
        },
      );
      expect(result).toHaveLength(1);
      expect(result[0].matchScore).toBe(0.8);
      expect(result[0].processedContent).toBe(
        'Hello John, welcome to FYP Platform!',
      );
    });

    it('should filter out templates with low match scores', async () => {
      const matchDto: TemplateMatchDto = {
        query: 'unrelated query',
        minMatchScore: 0.5,
      };

      const lowScoreTemplate = Object.assign({}, mockTemplate);
      lowScoreTemplate.getMatchScore = jest.fn().mockReturnValue(0.2);

      queryBuilder.getMany.mockResolvedValue([lowScoreTemplate]);

      const result = await service.findMatchingTemplates(matchDto);

      expect(result).toHaveLength(0);
    });
  });

  describe('getBestMatchingTemplate', () => {
    it('should return the best matching template', async () => {
      queryBuilder.getMany.mockResolvedValue([mockTemplate]);

      const result = await service.getBestMatchingTemplate(
        'hello there',
        'greeting',
      );

      expect(result).toBeDefined();
      expect(result?.matchScore).toBe(0.8);
    });

    it('should return null when no templates match', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getBestMatchingTemplate('unrelated query');

      expect(result).toBeNull();
    });
  });

  describe('processTemplate', () => {
    it('should process template with substitutions', async () => {
      const processDto: ProcessTemplateDto = {
        templateId: 'template-id',
        substitutions: { name: 'John' },
      };

      repository.findOne.mockResolvedValue(mockTemplate);
      repository.increment.mockResolvedValue({ affected: 1, raw: {} } as any);

      const result = await service.processTemplate(processDto);

      expect(repository.increment).toHaveBeenCalledWith(
        { id: 'template-id' },
        'usageCount',
        1,
      );
      expect(mockTemplate.processTemplate).toHaveBeenCalledWith({
        name: 'John',
      });
      expect(result).toBe('Hello John, welcome to FYP Platform!');
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      repository.increment.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.incrementUsage('template-id');

      expect(repository.increment).toHaveBeenCalledWith(
        { id: 'template-id' },
        'usageCount',
        1,
      );
    });
  });

  describe('updateEffectiveness', () => {
    it('should update effectiveness score', async () => {
      repository.findOne.mockResolvedValue(mockTemplate);
      repository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.updateEffectiveness('template-id', 5);

      expect(repository.update).toHaveBeenCalledWith('template-id', {
        effectivenessScore: expect.any(Number),
      });
    });
  });

  describe('getTemplatesByCategory', () => {
    it('should return templates by category', async () => {
      repository.find.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplatesByCategory('greeting');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          category: 'greeting',
          isActive: true,
        },
        order: {
          effectivenessScore: 'DESC',
          usageCount: 'DESC',
        },
      });
      expect(result.templates).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getTemplatesByLanguage', () => {
    it('should return templates by language', async () => {
      repository.find.mockResolvedValue([mockTemplate]);

      const result = await service.getTemplatesByLanguage('en');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          language: 'en',
          isActive: true,
        },
        order: {
          effectivenessScore: 'DESC',
          usageCount: 'DESC',
        },
      });
      expect(result.templates).toHaveLength(1);
    });
  });

  describe('getPopularTemplates', () => {
    it('should return popular templates', async () => {
      repository.find.mockResolvedValue([mockTemplate]);

      const result = await service.getPopularTemplates(5);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: {
          usageCount: 'DESC',
          effectivenessScore: 'DESC',
        },
        take: 5,
      });
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe('searchTemplatesByKeyword', () => {
    it('should search templates by keyword', async () => {
      queryBuilder.getMany.mockResolvedValue([mockTemplate]);

      const result = await service.searchTemplatesByKeyword('hello');

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'template.isActive = :isActive',
        {
          isActive: true,
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        ':keyword = ANY(template.triggerKeywords)',
        { keyword: 'hello' },
      );
      expect(result).toEqual([mockTemplate]);
    });
  });

  describe('getTemplateAnalytics', () => {
    it('should return template analytics', async () => {
      repository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.getTemplateAnalytics('template-id');

      expect(result.template.id).toBe('template-id');
      expect(result.analytics.usageCount).toBe(10);
      expect(result.analytics.effectivenessScore).toBe(4.2);
      expect(result.analytics.isPopular).toBe(true);
      expect(result.analytics.isEffective).toBe(true);
    });
  });

  describe('optimizeTemplateKeywords', () => {
    it('should suggest keyword optimizations', async () => {
      repository.findOne.mockResolvedValue(mockTemplate);

      const result = await service.optimizeTemplateKeywords('template-id');

      expect(result.currentKeywords).toEqual(['hello', 'welcome', 'greeting']);
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });
});
