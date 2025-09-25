import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ContentManagementService } from '../content-management.service';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import { ResponseTemplate } from '../../entities/response-template.entity';
import { ContentType } from '../../common/enums';
import {
  CreateTranslationDto,
  UpdateTranslationDto,
  ContentQualityAssessmentDto,
  ContentReviewDto,
  ContentUsageAnalyticsDto,
  QualityMetric,
  ReviewStatus,
} from '../../dto/content';

describe('ContentManagementService', () => {
  let service: ContentManagementService;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;
  let templateRepository: jest.Mocked<Repository<ResponseTemplate>>;
  let knowledgeQueryBuilder: jest.Mocked<
    SelectQueryBuilder<KnowledgeBaseEntry>
  >;
  let templateQueryBuilder: jest.Mocked<SelectQueryBuilder<ResponseTemplate>>;

  const mockKnowledgeEntry: KnowledgeBaseEntry = {
    id: 'knowledge-id',
    title: 'Test Knowledge',
    content: 'Test content',
    category: 'guidelines',
    tags: ['fyp', 'guidelines'],
    keywords: ['project', 'guidelines'],
    contentType: ContentType.GUIDELINE,
    language: 'en',
    isActive: true,
    usageCount: 10,
    averageRating: 4.2,
    createdById: 'user-id',
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    searchVector: null,
    incrementUsage: jest.fn(),
    updateRating: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    addKeyword: jest.fn(),
    removeKeyword: jest.fn(),
    isGuideline: jest.fn().mockReturnValue(true),
    isTemplate: jest.fn().mockReturnValue(false),
    isExample: jest.fn().mockReturnValue(false),
    isFAQ: jest.fn().mockReturnValue(false),
    isPolicy: jest.fn().mockReturnValue(false),
    hasHighRating: jest.fn().mockReturnValue(true),
    isPopular: jest.fn().mockReturnValue(true),
    isMultilingual: jest.fn().mockReturnValue(false),
  };

  const mockTemplate: ResponseTemplate = {
    id: 'template-id',
    name: 'Test Template',
    template: 'Hello {{name}}',
    category: 'greeting',
    triggerKeywords: ['hello', 'greeting'],
    variables: { name: 'User' },
    language: 'en',
    isActive: true,
    usageCount: 5,
    effectivenessScore: 4.0,
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
    processTemplate: jest.fn(),
    matchesKeywords: jest.fn(),
    getMatchScore: jest.fn(),
    isEffective: jest.fn().mockReturnValue(true),
    isPopular: jest.fn().mockReturnValue(false),
    isMultilingual: jest.fn().mockReturnValue(false),
    hasVariables: jest.fn().mockReturnValue(true),
    getVariableKeys: jest.fn().mockReturnValue(['name']),
    validateTemplate: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
  };

  beforeEach(async () => {
    // Create mock query builders
    knowledgeQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
    } as any;

    templateQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawMany: jest.fn(),
    } as any;

    // Create mock repositories
    const mockKnowledgeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(knowledgeQueryBuilder),
    };

    const mockTemplateRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(templateQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentManagementService,
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: mockKnowledgeRepository,
        },
        {
          provide: getRepositoryToken(ResponseTemplate),
          useValue: mockTemplateRepository,
        },
      ],
    }).compile();

    service = module.get<ContentManagementService>(ContentManagementService);
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
    templateRepository = module.get(getRepositoryToken(ResponseTemplate));
  });

  describe('createTranslation', () => {
    it('should create knowledge base translation', async () => {
      const translationDto: CreateTranslationDto = {
        sourceId: 'knowledge-id',
        targetLanguage: 'es',
        translatedTitle: 'Conocimiento de Prueba',
        translatedContent: 'Contenido de prueba',
        translatedKeywords: ['proyecto', 'directrices'],
        translatedTags: ['fyp', 'directrices'],
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledgeEntry);
      knowledgeRepository.create.mockReturnValue(mockKnowledgeEntry);
      knowledgeRepository.save.mockResolvedValue(mockKnowledgeEntry);

      const result = await service.createTranslation(
        translationDto,
        'knowledge',
      );

      expect(knowledgeRepository.create).toHaveBeenCalledWith({
        title: translationDto.translatedTitle,
        content: translationDto.translatedContent,
        category: mockKnowledgeEntry.category,
        tags: translationDto.translatedTags,
        keywords: translationDto.translatedKeywords,
        contentType: mockKnowledgeEntry.contentType,
        language: translationDto.targetLanguage,
        createdById: mockKnowledgeEntry.createdById,
      });
      expect(result).toEqual(mockKnowledgeEntry);
    });

    it('should create template translation', async () => {
      const translationDto: CreateTranslationDto = {
        sourceId: 'template-id',
        targetLanguage: 'es',
        translatedTitle: 'Plantilla de Prueba',
        translatedContent: 'Hola {{name}}',
        translatedKeywords: ['hola', 'saludo'],
      };

      templateRepository.findOne.mockResolvedValue(mockTemplate);
      templateRepository.create.mockReturnValue(mockTemplate);
      templateRepository.save.mockResolvedValue(mockTemplate);

      const result = await service.createTranslation(
        translationDto,
        'template',
      );

      expect(templateRepository.create).toHaveBeenCalledWith({
        name: translationDto.translatedTitle,
        template: translationDto.translatedContent,
        category: mockTemplate.category,
        triggerKeywords: translationDto.translatedKeywords,
        variables: mockTemplate.variables,
        language: translationDto.targetLanguage,
      });
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NotFoundException for non-existent source content', async () => {
      const translationDto: CreateTranslationDto = {
        sourceId: 'non-existent',
        targetLanguage: 'es',
        translatedTitle: 'Test',
        translatedContent: 'Test content',
      };

      knowledgeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createTranslation(translationDto, 'knowledge'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTranslation', () => {
    it('should update knowledge base translation', async () => {
      const updateDto: UpdateTranslationDto = {
        translatedTitle: 'Updated Title',
        translatedContent: 'Updated content',
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledgeEntry);
      knowledgeRepository.save.mockResolvedValue(mockKnowledgeEntry);

      const result = await service.updateTranslation(
        'knowledge-id',
        'knowledge',
        updateDto,
      );

      expect(knowledgeRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockKnowledgeEntry);
    });

    it('should update template translation', async () => {
      const updateDto: UpdateTranslationDto = {
        translatedTitle: 'Updated Template',
        translatedContent: 'Updated {{name}}',
      };

      templateRepository.findOne.mockResolvedValue(mockTemplate);
      templateRepository.save.mockResolvedValue(mockTemplate);

      const result = await service.updateTranslation(
        'template-id',
        'template',
        updateDto,
      );

      expect(templateRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockTemplate);
    });
  });

  describe('assessContentQuality', () => {
    it('should assess content quality', async () => {
      const assessmentDto: ContentQualityAssessmentDto = {
        contentId: 'knowledge-id',
        contentType: 'knowledge',
        metric: QualityMetric.ACCURACY,
        score: 4,
        feedback: 'Good content',
        reviewerId: 'reviewer-id',
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledgeEntry);

      const result = await service.assessContentQuality(assessmentDto);

      expect(result.contentId).toBe(assessmentDto.contentId);
      expect(result.metric).toBe(assessmentDto.metric);
      expect(result.score).toBe(assessmentDto.score);
      expect(result.feedback).toBe(assessmentDto.feedback);
    });
  });

  describe('reviewContent', () => {
    it('should approve knowledge content', async () => {
      const reviewDto: ContentReviewDto = {
        contentId: 'knowledge-id',
        contentType: 'knowledge',
        status: ReviewStatus.APPROVED,
        reviewNotes: 'Content approved',
        overallScore: 4,
        reviewerId: 'reviewer-id',
      };

      knowledgeRepository.findOne.mockResolvedValue(mockKnowledgeEntry);
      knowledgeRepository.update.mockResolvedValue({
        affected: 1,
        raw: {},
      } as any);

      const result = await service.reviewContent(reviewDto);

      expect(knowledgeRepository.update).toHaveBeenCalledWith('knowledge-id', {
        isActive: true,
      });
      expect(result.status).toBe(ReviewStatus.APPROVED);
    });

    it('should reject template content', async () => {
      const reviewDto: ContentReviewDto = {
        contentId: 'template-id',
        contentType: 'template',
        status: ReviewStatus.REJECTED,
        reviewNotes: 'Content rejected',
        reviewerId: 'reviewer-id',
      };

      templateRepository.findOne.mockResolvedValue(mockTemplate);
      templateRepository.update.mockResolvedValue({
        affected: 1,
        raw: {},
      } as any);

      const result = await service.reviewContent(reviewDto);

      expect(templateRepository.update).toHaveBeenCalledWith('template-id', {
        isActive: false,
      });
      expect(result.status).toBe(ReviewStatus.REJECTED);
    });
  });

  describe('getContentUsageAnalytics', () => {
    it('should return content usage analytics', async () => {
      const analyticsDto: ContentUsageAnalyticsDto = {
        contentType: 'knowledge',
        language: 'en',
        limit: 10,
      };

      knowledgeQueryBuilder.getMany.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.getContentUsageAnalytics(analyticsDto);

      expect(knowledgeQueryBuilder.where).toHaveBeenCalledWith(
        'kb.isActive = :isActive',
        {
          isActive: true,
        },
      );
      expect(knowledgeQueryBuilder.andWhere).toHaveBeenCalledWith(
        'kb.language = :language',
        {
          language: 'en',
        },
      );
      expect(result).toHaveLength(1);
      expect(result[0].contentType).toBe('knowledge');
    });

    it('should return both knowledge and template analytics', async () => {
      const analyticsDto: ContentUsageAnalyticsDto = {
        limit: 10,
      };

      knowledgeQueryBuilder.getMany.mockResolvedValue([mockKnowledgeEntry]);
      templateQueryBuilder.getMany.mockResolvedValue([mockTemplate]);

      const result = await service.getContentUsageAnalytics(analyticsDto);

      expect(result).toHaveLength(2);
      expect(result.some((item) => item.contentType === 'knowledge')).toBe(
        true,
      );
      expect(result.some((item) => item.contentType === 'template')).toBe(true);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate recommendations for knowledge content', async () => {
      const lowUsageEntry = Object.assign({}, mockKnowledgeEntry);
      lowUsageEntry.usageCount = 2; // Low usage
      lowUsageEntry.averageRating = 3.0; // Low rating
      knowledgeRepository.findOne.mockResolvedValue(lowUsageEntry);
      knowledgeRepository.count.mockResolvedValue(1); // Low translation count

      const result = await service.generateOptimizationRecommendations(
        'knowledge-id',
        'knowledge',
      );

      expect(result.contentId).toBe('knowledge-id');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.type === 'keyword')).toBe(
        true,
      );
      expect(result.recommendations.some((r) => r.type === 'content')).toBe(
        true,
      );
      expect(result.recommendations.some((r) => r.type === 'translation')).toBe(
        true,
      );
    });

    it('should generate recommendations for template content', async () => {
      const lowEffectivenessTemplate = Object.assign({}, mockTemplate);
      lowEffectivenessTemplate.effectivenessScore = 2.0; // Low effectiveness
      lowEffectivenessTemplate.triggerKeywords = ['hello']; // Few keywords
      templateRepository.findOne.mockResolvedValue(lowEffectivenessTemplate);
      templateRepository.count.mockResolvedValue(1); // Low translation count

      const result = await service.generateOptimizationRecommendations(
        'template-id',
        'template',
      );

      expect(result.contentId).toBe('template-id');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some((r) => r.type === 'content')).toBe(
        true,
      );
      expect(result.recommendations.some((r) => r.type === 'keyword')).toBe(
        true,
      );
    });
  });

  describe('getMultilingualStats', () => {
    it('should return multilingual statistics', async () => {
      knowledgeQueryBuilder.getRawMany.mockResolvedValue([
        { language: 'en', count: '10' },
        { language: 'es', count: '5' },
      ]);

      templateQueryBuilder.getRawMany.mockResolvedValue([
        { language: 'en', count: '8' },
        { language: 'fr', count: '3' },
      ]);

      const result = await service.getMultilingualStats();

      expect(result.totalContent).toBe(26); // 10 + 5 + 8 + 3
      expect(result.languageDistribution).toHaveLength(3); // en, es, fr
      expect(result.translationCoverage).toHaveLength(1);
      expect(result.qualityMetrics).toHaveLength(3);
    });
  });
});
