import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MultilingualTemplateService } from '../multilingual-template.service';
import { ResponseTemplate } from '../../entities/response-template.entity';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';

describe('MultilingualTemplateService', () => {
  let service: MultilingualTemplateService;
  let templateRepository: jest.Mocked<Repository<ResponseTemplate>>;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;

  const mockTemplateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockKnowledgeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultilingualTemplateService,
        {
          provide: getRepositoryToken(ResponseTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: mockKnowledgeRepository,
        },
      ],
    }).compile();

    service = module.get<MultilingualTemplateService>(
      MultilingualTemplateService,
    );
    templateRepository = module.get(getRepositoryToken(ResponseTemplate));
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMultilingualTemplate', () => {
    it('should create a multilingual template with primary language', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Literature Review Guide',
        template: 'A literature review is essential for research.',
        category: 'methodology',
        language: 'en',
        triggerKeywords: ['literature', 'review'],
        variables: {},
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.create.mockReturnValue(mockTemplate as any);
      templateRepository.save.mockResolvedValue(mockTemplate as any);

      const dto = {
        name: 'Literature Review Guide',
        category: 'methodology',
        primaryLanguage: 'en',
        primaryTemplate: 'A literature review is essential for research.',
        triggerKeywords: ['literature', 'review'],
      };

      const result = await service.createMultilingualTemplate(dto);

      expect(result.name).toBe(dto.name);
      expect(result.category).toBe(dto.category);
      expect(result.translations).toHaveLength(1);
      expect(result.translations[0].language).toBe('en');
      expect(templateRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create template with translations', async () => {
      const mockPrimaryTemplate = {
        id: 'template-1',
        name: 'Literature Review Guide',
        template: 'A literature review is essential for research.',
        category: 'methodology',
        language: 'en',
        triggerKeywords: ['literature', 'review'],
        variables: {},
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSpanishTemplate = {
        id: 'template-2',
        name: 'Literature Review Guide_es',
        template:
          'Una revisión de literatura es esencial para la investigación.',
        category: 'methodology',
        language: 'es',
        triggerKeywords: ['literature', 'review'],
        variables: {},
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.create
        .mockReturnValueOnce(mockPrimaryTemplate as any)
        .mockReturnValueOnce(mockSpanishTemplate as any);

      templateRepository.save
        .mockResolvedValueOnce(mockPrimaryTemplate as any)
        .mockResolvedValueOnce(mockSpanishTemplate as any);

      const dto = {
        name: 'Literature Review Guide',
        category: 'methodology',
        primaryLanguage: 'en',
        primaryTemplate: 'A literature review is essential for research.',
        translations: [
          {
            language: 'es',
            template:
              'Una revisión de literatura es esencial para la investigación.',
          },
        ],
        triggerKeywords: ['literature', 'review'],
      };

      const result = await service.createMultilingualTemplate(dto);

      expect(result.translations).toHaveLength(2);
      expect(
        result.translations.find((t) => t.language === 'en'),
      ).toBeDefined();
      expect(
        result.translations.find((t) => t.language === 'es'),
      ).toBeDefined();
      expect(templateRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should reject unsupported primary language', async () => {
      const dto = {
        name: 'Test Template',
        category: 'test',
        primaryLanguage: 'unsupported',
        primaryTemplate: 'Test content',
      };

      await expect(service.createMultilingualTemplate(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip unsupported translation languages', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        template: 'Test content',
        category: 'test',
        language: 'en',
        triggerKeywords: [],
        variables: {},
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.create.mockReturnValue(mockTemplate as any);
      templateRepository.save.mockResolvedValue(mockTemplate as any);

      const dto = {
        name: 'Test Template',
        category: 'test',
        primaryLanguage: 'en',
        primaryTemplate: 'Test content',
        translations: [
          {
            language: 'unsupported',
            template: 'Unsupported content',
          },
          {
            language: 'es',
            template: 'Contenido en español',
          },
        ],
      };

      const result = await service.createMultilingualTemplate(dto);

      // Should only have primary (en) and valid translation (es)
      expect(result.translations).toHaveLength(2);
      expect(templateRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMultilingualTemplate', () => {
    it('should get template with translations', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Literature Review Guide',
        template: 'A literature review is essential.',
        category: 'methodology',
        language: 'en',
        triggerKeywords: ['literature'],
        variables: {},
        isActive: true,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTranslation = {
        id: 'template-2',
        name: 'Literature Review Guide_es',
        template: 'Una revisión de literatura es esencial.',
        category: 'methodology',
        language: 'es',
        triggerKeywords: ['literature'],
        variables: {},
        isActive: true,
        usageCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.findOne.mockResolvedValue(mockTemplate as any);
      templateRepository.find.mockResolvedValue([
        mockTemplate,
        mockTranslation,
      ] as any);

      const result = await service.getMultilingualTemplate('template-1');

      expect(result.id).toBe('template-1');
      expect(result.translations).toHaveLength(2);
      expect(
        result.translations.find((t) => t.language === 'en'),
      ).toBeDefined();
      expect(
        result.translations.find((t) => t.language === 'es'),
      ).toBeDefined();
    });

    it('should throw NotFoundException for non-existent template', async () => {
      templateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getMultilingualTemplate('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMatchingTemplate', () => {
    it('should find matching template by keywords', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Literature Review Guide',
        template: 'Una revisión de literatura es esencial.',
        category: 'methodology',
        language: 'es',
        triggerKeywords: ['literatura', 'revisión'],
        variables: {},
        isActive: true,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateRepository.find.mockResolvedValue([mockTemplate] as any);

      const result = await service.findMatchingTemplate(
        '¿Qué es una revisión de literatura?',
        'es',
      );

      expect(result).toBeDefined();
      expect(result!.template.id).toBe('template-1');
      expect(result!.language).toBe('es');
      expect(result!.matchScore).toBeGreaterThan(0.3);
    });

    it('should return null for no matches', async () => {
      templateRepository.find.mockResolvedValue([]);

      const result = await service.findMatchingTemplate(
        'completely unrelated query',
        'es',
      );

      expect(result).toBeNull();
    });

    it('should filter by category when provided', async () => {
      const result = await service.findMatchingTemplate(
        'test query',
        'en',
        'methodology',
      );

      expect(templateRepository.find).toHaveBeenCalledWith({
        where: {
          language: 'en',
          isActive: true,
          category: 'methodology',
        },
      });
    });

    it('should return best matching template', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Low Match',
          template: 'Some content',
          category: 'general',
          language: 'en',
          triggerKeywords: ['other'],
          variables: {},
          isActive: true,
          usageCount: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'template-2',
          name: 'High Match',
          template: 'Literature review content',
          category: 'methodology',
          language: 'en',
          triggerKeywords: ['literature', 'review'],
          variables: {},
          isActive: true,
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      templateRepository.find.mockResolvedValue(mockTemplates as any);

      const result = await service.findMatchingTemplate(
        'What is a literature review?',
        'en',
      );

      expect(result).toBeDefined();
      expect(result!.template.id).toBe('template-2');
    });
  });

  describe('getTemplatesByLanguage', () => {
    it('should get templates by language', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          language: 'es',
          category: 'methodology',
          isActive: true,
          usageCount: 5,
        },
        {
          id: 'template-2',
          language: 'es',
          category: 'general',
          isActive: true,
          usageCount: 3,
        },
      ];

      templateRepository.find.mockResolvedValue(mockTemplates as any);

      const result = await service.getTemplatesByLanguage('es');

      expect(result).toHaveLength(2);
      expect(templateRepository.find).toHaveBeenCalledWith({
        where: { language: 'es' },
        order: { usageCount: 'DESC', createdAt: 'DESC' },
      });
    });

    it('should filter by category and active status', async () => {
      await service.getTemplatesByLanguage('es', 'methodology', true);

      expect(templateRepository.find).toHaveBeenCalledWith({
        where: {
          language: 'es',
          category: 'methodology',
          isActive: true,
        },
        order: { usageCount: 'DESC', createdAt: 'DESC' },
      });
    });
  });

  describe('searchTemplates', () => {
    it('should search templates across languages', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Literature Review',
          template: 'Guide for literature review',
          triggerKeywords: ['literature', 'review'],
          language: 'en',
          isActive: true,
        },
        {
          id: 'template-2',
          name: 'Methodology Guide',
          template: 'Research methodology guide',
          triggerKeywords: ['methodology', 'research'],
          language: 'en',
          isActive: true,
        },
      ];

      templateRepository.find.mockResolvedValue(mockTemplates as any);

      const result = await service.searchTemplates('literature review');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].template.id).toBe('template-1');
      expect(result[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should limit results', async () => {
      const mockTemplates = Array.from({ length: 30 }, (_, i) => ({
        id: `template-${i}`,
        name: `Template ${i}`,
        template: 'literature review content',
        triggerKeywords: ['literature'],
        language: 'en',
        isActive: true,
      }));

      templateRepository.find.mockResolvedValue(mockTemplates as any);

      const result = await service.searchTemplates(
        'literature',
        undefined,
        undefined,
        5,
      );

      expect(result).toHaveLength(5);
    });
  });

  describe('getTemplateUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'Template 1',
          category: 'methodology',
          language: 'en',
          usageCount: 10,
          isActive: true,
        },
        {
          id: 'template-2',
          name: 'Template 2',
          category: 'general',
          language: 'en',
          usageCount: 5,
          isActive: false,
        },
      ];

      templateRepository.find.mockResolvedValue(mockTemplates as any);

      const result = await service.getTemplateUsageStats();

      expect(result.totalTemplates).toBe(2);
      expect(result.activeTemplates).toBe(1);
      expect(result.totalUsage).toBe(15);
      expect(result.averageUsage).toBe(7.5);
      expect(result.topTemplates).toHaveLength(2);
      expect(result.topTemplates[0].usageCount).toBe(10);
    });

    it('should filter by language and category', async () => {
      await service.getTemplateUsageStats('es', 'methodology');

      expect(templateRepository.find).toHaveBeenCalledWith({
        where: {
          language: 'es',
          category: 'methodology',
        },
      });
    });
  });

  describe('incrementTemplateUsage', () => {
    it('should increment template usage count', async () => {
      await service.incrementTemplateUsage('template-1');

      expect(templateRepository.increment).toHaveBeenCalledWith(
        { id: 'template-1' },
        'usageCount',
        1,
      );
    });
  });

  describe('utility methods', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
      expect(languages).toContain('de');
      expect(languages).toContain('pt');
      expect(languages).toContain('it');
    });

    it('should validate language support', () => {
      expect(service.isLanguageSupported('en')).toBe(true);
      expect(service.isLanguageSupported('es')).toBe(true);
      expect(service.isLanguageSupported('unsupported')).toBe(false);
    });
  });

  describe('getTemplateCategoriesWithLanguages', () => {
    it('should return categories with language support', async () => {
      const mockTemplates = [
        {
          category: 'methodology',
          language: 'en',
          isActive: true,
        },
        {
          category: 'methodology',
          language: 'es',
          isActive: true,
        },
        {
          category: 'general',
          language: 'en',
          isActive: true,
        },
      ];

      templateRepository.find.mockResolvedValue(mockTemplates as any);

      const result = await service.getTemplateCategoriesWithLanguages();

      expect(result).toHaveLength(2);

      const methodologyCategory = result.find(
        (c) => c.category === 'methodology',
      );
      expect(methodologyCategory?.languages).toContain('en');
      expect(methodologyCategory?.languages).toContain('es');
      expect(methodologyCategory?.templateCount).toBe(2);

      const generalCategory = result.find((c) => c.category === 'general');
      expect(generalCategory?.languages).toContain('en');
      expect(generalCategory?.templateCount).toBe(1);
    });
  });
});
