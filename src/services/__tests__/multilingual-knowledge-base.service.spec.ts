import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MultilingualKnowledgeBaseService } from '../multilingual-knowledge-base.service';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import { ContentType } from '../../common/enums';

describe('MultilingualKnowledgeBaseService', () => {
  let service: MultilingualKnowledgeBaseService;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;

  const mockKnowledgeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    increment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultilingualKnowledgeBaseService,
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: mockKnowledgeRepository,
        },
      ],
    }).compile();

    service = module.get<MultilingualKnowledgeBaseService>(
      MultilingualKnowledgeBaseService,
    );
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMultilingualKnowledge', () => {
    it('should create multilingual knowledge entry with primary language', async () => {
      const mockEntry = {
        id: 'entry-1',
        title: 'Literature Review Guide',
        content: 'A comprehensive guide to literature reviews.',
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        language: 'en',
        keywords: ['literature', 'review'],
        tags: ['research', 'academic'],
        isActive: true,
        usageCount: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      knowledgeRepository.create.mockReturnValue(mockEntry as any);
      knowledgeRepository.save.mockResolvedValue(mockEntry as any);

      const dto = {
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        primaryLanguage: 'en',
        primaryTitle: 'Literature Review Guide',
        primaryContent: 'A comprehensive guide to literature reviews.',
        primaryKeywords: ['literature', 'review'],
        tags: ['research', 'academic'],
      };

      const result = await service.createMultilingualKnowledge(dto);

      expect(result.title).toBe(dto.primaryTitle);
      expect(result.category).toBe(dto.category);
      expect(result.translations).toHaveLength(1);
      expect(result.translations[0].language).toBe('en');
      expect(knowledgeRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create knowledge entry with translations', async () => {
      const mockPrimaryEntry = {
        id: 'entry-1',
        title: 'Literature Review Guide',
        content: 'A comprehensive guide to literature reviews.',
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        language: 'en',
        keywords: ['literature', 'review'],
        tags: ['research'],
        isActive: true,
        usageCount: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSpanishEntry = {
        id: 'entry-2',
        title: 'Guía de Revisión de Literatura',
        content: 'Una guía completa para revisiones de literatura.',
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        language: 'es',
        keywords: ['literatura', 'revisión'],
        tags: ['research'],
        isActive: true,
        usageCount: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      knowledgeRepository.create
        .mockReturnValueOnce(mockPrimaryEntry as any)
        .mockReturnValueOnce(mockSpanishEntry as any);

      knowledgeRepository.save
        .mockResolvedValueOnce(mockPrimaryEntry as any)
        .mockResolvedValueOnce(mockSpanishEntry as any);

      const dto = {
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        primaryLanguage: 'en',
        primaryTitle: 'Literature Review Guide',
        primaryContent: 'A comprehensive guide to literature reviews.',
        translations: [
          {
            language: 'es',
            title: 'Guía de Revisión de Literatura',
            content: 'Una guía completa para revisiones de literatura.',
            keywords: ['literatura', 'revisión'],
          },
        ],
        tags: ['research'],
      };

      const result = await service.createMultilingualKnowledge(dto);

      expect(result.translations).toHaveLength(2);
      expect(
        result.translations.find((t) => t.language === 'en'),
      ).toBeDefined();
      expect(
        result.translations.find((t) => t.language === 'es'),
      ).toBeDefined();
      expect(knowledgeRepository.save).toHaveBeenCalledTimes(2);
    });

    it('should reject unsupported primary language', async () => {
      const dto = {
        category: 'test',
        contentType: ContentType.GUIDELINE,
        primaryLanguage: 'unsupported',
        primaryTitle: 'Test Entry',
        primaryContent: 'Test content',
      };

      await expect(service.createMultilingualKnowledge(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should skip unsupported translation languages', async () => {
      const mockEntry = {
        id: 'entry-1',
        title: 'Test Entry',
        content: 'Test content',
        category: 'test',
        contentType: ContentType.GUIDELINE,
        language: 'en',
        keywords: [],
        tags: [],
        isActive: true,
        usageCount: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      knowledgeRepository.create.mockReturnValue(mockEntry as any);
      knowledgeRepository.save.mockResolvedValue(mockEntry as any);

      const dto = {
        category: 'test',
        contentType: ContentType.GUIDELINE,
        primaryLanguage: 'en',
        primaryTitle: 'Test Entry',
        primaryContent: 'Test content',
        translations: [
          {
            language: 'unsupported',
            title: 'Unsupported Entry',
            content: 'Unsupported content',
          },
          {
            language: 'es',
            title: 'Entrada de Prueba',
            content: 'Contenido de prueba',
          },
        ],
      };

      const result = await service.createMultilingualKnowledge(dto);

      // Should only have primary (en) and valid translation (es)
      expect(result.translations).toHaveLength(2);
      expect(knowledgeRepository.save).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMultilingualKnowledge', () => {
    it('should get knowledge entry with translations', async () => {
      const mockEntry = {
        id: 'entry-1',
        title: 'Literature Review Guide',
        content: 'A comprehensive guide.',
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        language: 'en',
        keywords: ['literature'],
        tags: ['research'],
        isActive: true,
        usageCount: 5,
        averageRating: 4.5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      knowledgeRepository.findOne.mockResolvedValue(mockEntry as any);
      // Mock findRelatedEntries by returning empty array for simplicity
      jest.spyOn(service as any, 'findRelatedEntries').mockResolvedValue([]);

      const result = await service.getMultilingualKnowledge('entry-1');

      expect(result.id).toBe('entry-1');
      expect(result.title).toBe('Literature Review Guide');
      expect(result.translations).toHaveLength(1);
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getMultilingualKnowledge('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchKnowledgeByLanguage', () => {
    it('should search knowledge entries by language', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          title: 'Guía de Literatura',
          content: 'Una guía completa.',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          language: 'es',
          keywords: ['literatura', 'guía'],
          tags: ['investigación'],
          isActive: true,
          usageCount: 3,
          averageRating: 4.0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      knowledgeRepository.find.mockResolvedValue(mockEntries as any);

      const result = await service.searchKnowledgeByLanguage(
        'literatura',
        'es',
        'methodology',
      );

      expect(result).toHaveLength(1);
      expect(result[0].entry.language).toBe('es');
      expect(result[0].relevanceScore).toBeGreaterThan(0);
    });

    it('should filter by category and content type', async () => {
      await service.searchKnowledgeByLanguage(
        'test query',
        'en',
        'methodology',
        ContentType.GUIDELINE,
      );

      expect(knowledgeRepository.find).toHaveBeenCalledWith({
        where: {
          language: 'en',
          isActive: true,
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
        },
      });
    });

    it('should limit results', async () => {
      const mockEntries = Array.from({ length: 20 }, (_, i) => ({
        id: `entry-${i}`,
        title: `Entry ${i}`,
        content: 'literature content',
        category: 'methodology',
        contentType: ContentType.GUIDELINE,
        language: 'en',
        keywords: ['literature'],
        tags: [],
        isActive: true,
        usageCount: 1,
        averageRating: 3.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      knowledgeRepository.find.mockResolvedValue(mockEntries as any);

      const result = await service.searchKnowledgeByLanguage(
        'literature',
        'en',
        undefined,
        undefined,
        5,
      );

      expect(result).toHaveLength(5);
    });
  });

  describe('getKnowledgeByLanguage', () => {
    it('should get knowledge entries by language', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          language: 'es',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          isActive: true,
          usageCount: 5,
          averageRating: 4.0,
        },
      ];

      knowledgeRepository.find.mockResolvedValue(mockEntries as any);

      const result = await service.getKnowledgeByLanguage('es');

      expect(result).toHaveLength(1);
      expect(knowledgeRepository.find).toHaveBeenCalledWith({
        where: { language: 'es' },
        order: { usageCount: 'DESC', averageRating: 'DESC', createdAt: 'DESC' },
      });
    });

    it('should filter by category, content type, and active status', async () => {
      await service.getKnowledgeByLanguage(
        'es',
        'methodology',
        ContentType.GUIDELINE,
        true,
      );

      expect(knowledgeRepository.find).toHaveBeenCalledWith({
        where: {
          language: 'es',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          isActive: true,
        },
        order: { usageCount: 'DESC', averageRating: 'DESC', createdAt: 'DESC' },
      });
    });
  });

  describe('assessTranslationQuality', () => {
    it('should assess translation quality between entries', async () => {
      const originalEntry = {
        id: 'original-1',
        title: 'Literature Review Guide',
        content:
          'A comprehensive guide to conducting literature reviews in academic research.',
        keywords: ['literature', 'review', 'research'],
        language: 'en',
      };

      const translatedEntry = {
        id: 'translated-1',
        title: 'Guía de Revisión de Literatura',
        content:
          'Una guía completa para realizar revisiones de literatura en investigación académica.',
        keywords: ['literatura', 'revisión', 'investigación'],
        language: 'es',
      };

      knowledgeRepository.findOne
        .mockResolvedValueOnce(originalEntry as any)
        .mockResolvedValueOnce(translatedEntry as any);

      const result = await service.assessTranslationQuality(
        'original-1',
        'translated-1',
      );

      expect(result.score).toBeGreaterThan(0);
      expect(result.completeness).toBeDefined();
      expect(result.accuracy).toBeDefined();
      expect(result.fluency).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should throw NotFoundException for missing entries', async () => {
      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assessTranslationQuality('missing-1', 'missing-2'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getKnowledgeStatsByLanguage', () => {
    it('should return knowledge statistics by language', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          language: 'en',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          isActive: true,
          usageCount: 10,
          averageRating: 4.5,
        },
        {
          id: 'entry-2',
          language: 'en',
          category: 'general',
          contentType: ContentType.FAQ,
          isActive: false,
          usageCount: 5,
          averageRating: 3.0,
        },
        {
          id: 'entry-3',
          language: 'es',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          isActive: true,
          usageCount: 3,
          averageRating: 4.0,
        },
      ];

      knowledgeRepository.find.mockResolvedValue(mockEntries as any);

      const result = await service.getKnowledgeStatsByLanguage();

      expect(result).toHaveLength(2); // en and es

      const englishStats = result.find((s) => s.language === 'en');
      expect(englishStats?.totalEntries).toBe(2);
      expect(englishStats?.activeEntries).toBe(1);
      expect(englishStats?.totalUsage).toBe(15);

      const spanishStats = result.find((s) => s.language === 'es');
      expect(spanishStats?.totalEntries).toBe(1);
      expect(spanishStats?.activeEntries).toBe(1);
      expect(spanishStats?.totalUsage).toBe(3);
    });
  });

  describe('findMissingTranslations', () => {
    it('should find entries missing translations', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          title: 'Guide 1',
          content: 'Content 1',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          language: 'en',
          keywords: ['guide'],
          isActive: true,
          usageCount: 5,
          averageRating: 4.0,
        },
        {
          id: 'entry-2',
          title: 'Guía 1',
          content: 'Contenido 1',
          category: 'methodology',
          contentType: ContentType.GUIDELINE,
          language: 'es',
          keywords: ['guía'],
          isActive: true,
          usageCount: 3,
          averageRating: 4.0,
        },
      ];

      knowledgeRepository.find.mockResolvedValue(mockEntries as any);

      // Mock the groupRelatedEntries method
      jest
        .spyOn(service as any, 'groupRelatedEntries')
        .mockReturnValue([[mockEntries[0], mockEntries[1]]]);

      const result = await service.findMissingTranslations('methodology');

      expect(result).toHaveLength(1);
      expect(result[0].missingLanguages).toContain('fr');
      expect(result[0].missingLanguages).toContain('de');
      expect(result[0].existingLanguages).toContain('en');
      expect(result[0].existingLanguages).toContain('es');
    });
  });

  describe('incrementKnowledgeUsage', () => {
    it('should increment knowledge entry usage count', async () => {
      await service.incrementKnowledgeUsage('entry-1');

      expect(knowledgeRepository.increment).toHaveBeenCalledWith(
        { id: 'entry-1' },
        'usageCount',
        1,
      );
    });
  });

  describe('rateKnowledgeEntry', () => {
    it('should rate knowledge entry', async () => {
      const mockEntry = {
        id: 'entry-1',
        averageRating: 3.0,
      };

      knowledgeRepository.findOne.mockResolvedValue(mockEntry as any);

      await service.rateKnowledgeEntry('entry-1', 4);

      expect(knowledgeRepository.update).toHaveBeenCalledWith('entry-1', {
        averageRating: 3.5, // (3.0 + 4) / 2
      });
    });

    it('should handle first rating', async () => {
      const mockEntry = {
        id: 'entry-1',
        averageRating: 0,
      };

      knowledgeRepository.findOne.mockResolvedValue(mockEntry as any);

      await service.rateKnowledgeEntry('entry-1', 5);

      expect(knowledgeRepository.update).toHaveBeenCalledWith('entry-1', {
        averageRating: 5,
      });
    });

    it('should reject invalid ratings', async () => {
      await expect(service.rateKnowledgeEntry('entry-1', 0)).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.rateKnowledgeEntry('entry-1', 6)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent entry', async () => {
      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rateKnowledgeEntry('non-existent', 5),
      ).rejects.toThrow(NotFoundException);
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

  describe('content similarity and grouping', () => {
    it('should calculate content similarity correctly', () => {
      const entry1 = {
        title: 'Literature Review Guide',
        keywords: ['literature', 'review', 'research'],
        content: 'Guide content',
      };

      const entry2 = {
        title: 'Guía de Revisión de Literatura',
        keywords: ['literatura', 'revisión', 'investigación'],
        content: 'Contenido de guía',
      };

      // Access private method for testing
      const similarity = (service as any).calculateContentSimilarity(
        entry1,
        entry2,
      );

      expect(similarity).toBeGreaterThanOrEqual(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should group related entries correctly', () => {
      const entries = [
        {
          id: 'entry-1',
          title: 'Guide 1',
          keywords: ['guide', 'research'],
          category: 'methodology',
        },
        {
          id: 'entry-2',
          title: 'Guía 1',
          keywords: ['guía', 'investigación'],
          category: 'methodology',
        },
        {
          id: 'entry-3',
          title: 'Different Guide',
          keywords: ['different', 'topic'],
          category: 'general',
        },
      ];

      // Access private method for testing
      const groups = (service as any).groupRelatedEntries(entries);

      expect(groups.length).toBeGreaterThan(0);
      expect(Array.isArray(groups[0])).toBe(true);
    });
  });

  describe('translation quality assessment', () => {
    it('should detect length discrepancies', () => {
      const original = {
        content:
          'This is a very long and detailed explanation of the methodology.',
        keywords: ['methodology', 'explanation'],
      };

      const translated = {
        content: 'Breve explicación.',
        keywords: ['metodología'],
      };

      // Access private method for testing
      const assessment = (service as any).performQualityAssessment(
        original,
        translated,
      );

      expect(assessment.completeness).toBeLessThan(1.0);
      expect(assessment.issues).toContain(
        'Translation appears significantly shorter than original',
      );
    });

    it('should detect keyword preservation issues', () => {
      const original = {
        content: 'Research methodology guide',
        keywords: ['research', 'methodology', 'guide'],
      };

      const translated = {
        content: 'Guía simple',
        keywords: ['guía'],
      };

      // Access private method for testing
      const assessment = (service as any).performQualityAssessment(
        original,
        translated,
      );

      expect(assessment.accuracy).toBeLessThan(0.5);
      expect(assessment.issues).toContain(
        'Many keywords not preserved in translation',
      );
    });

    it('should detect untranslated sections', () => {
      const original = {
        content: 'Complete guide to research',
        keywords: ['guide', 'research'],
      };

      const translated = {
        content: 'Guía completa para [UNTRANSLATED] research',
        keywords: ['guía', 'research'],
      };

      // Access private method for testing
      const assessment = (service as any).performQualityAssessment(
        original,
        translated,
      );

      expect(assessment.fluency).toBeLessThan(0.5);
      expect(assessment.issues).toContain('Untranslated sections detected');
    });
  });
});
