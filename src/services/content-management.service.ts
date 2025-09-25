import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { ResponseTemplate } from '../entities/response-template.entity';
import {
  CreateTranslationDto,
  UpdateTranslationDto,
  ContentQualityAssessmentDto,
  ContentReviewDto,
  ContentUsageAnalyticsDto,
  ContentPerformanceDto,
  ContentOptimizationRecommendationDto,
  MultilingualContentStatsDto,
  QualityMetric,
  ReviewStatus,
} from '../dto/content';

@Injectable()
export class ContentManagementService {
  private readonly logger = new Logger(ContentManagementService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
  ) {}

  // Translation Management
  async createTranslation(
    translationDto: CreateTranslationDto,
    contentType: 'knowledge' | 'template',
  ): Promise<KnowledgeBaseEntry | ResponseTemplate> {
    this.logger.log(
      `Creating translation for ${contentType} ${translationDto.sourceId} to ${translationDto.targetLanguage}`,
    );

    const sourceContent = await this.getContentById(
      translationDto.sourceId,
      contentType,
    );

    if (contentType === 'knowledge') {
      const knowledgeEntry = sourceContent as KnowledgeBaseEntry;
      const translatedEntry = this.knowledgeRepository.create({
        title: translationDto.translatedTitle,
        content: translationDto.translatedContent,
        category: knowledgeEntry.category,
        tags: translationDto.translatedTags || knowledgeEntry.tags,
        keywords: translationDto.translatedKeywords || knowledgeEntry.keywords,
        contentType: knowledgeEntry.contentType,
        language: translationDto.targetLanguage,
        createdById: knowledgeEntry.createdById,
      });

      return this.knowledgeRepository.save(translatedEntry);
    } else {
      const template = sourceContent as ResponseTemplate;
      const translatedTemplate = this.templateRepository.create({
        name: translationDto.translatedTitle,
        template: translationDto.translatedContent,
        category: template.category,
        triggerKeywords:
          translationDto.translatedKeywords || template.triggerKeywords,
        variables: template.variables,
        language: translationDto.targetLanguage,
      });

      return this.templateRepository.save(translatedTemplate);
    }
  }

  async updateTranslation(
    contentId: string,
    contentType: 'knowledge' | 'template',
    updateDto: UpdateTranslationDto,
  ): Promise<KnowledgeBaseEntry | ResponseTemplate> {
    this.logger.log(`Updating translation for ${contentType} ${contentId}`);

    const content = await this.getContentById(contentId, contentType);

    if (contentType === 'knowledge') {
      const knowledgeEntry = content as KnowledgeBaseEntry;
      if (updateDto.translatedTitle)
        knowledgeEntry.title = updateDto.translatedTitle;
      if (updateDto.translatedContent)
        knowledgeEntry.content = updateDto.translatedContent;
      if (updateDto.translatedTags)
        knowledgeEntry.tags = updateDto.translatedTags;
      if (updateDto.translatedKeywords)
        knowledgeEntry.keywords = updateDto.translatedKeywords;

      return this.knowledgeRepository.save(knowledgeEntry);
    } else {
      const template = content as ResponseTemplate;
      if (updateDto.translatedTitle) template.name = updateDto.translatedTitle;
      if (updateDto.translatedContent)
        template.template = updateDto.translatedContent;
      if (updateDto.translatedKeywords)
        template.triggerKeywords = updateDto.translatedKeywords;

      return this.templateRepository.save(template);
    }
  }

  // Quality Assessment
  async assessContentQuality(
    assessmentDto: ContentQualityAssessmentDto,
  ): Promise<{
    contentId: string;
    metric: QualityMetric;
    score: number;
    feedback?: string;
    timestamp: Date;
  }> {
    this.logger.log(
      `Assessing quality for ${assessmentDto.contentType} ${assessmentDto.contentId}`,
    );

    // Verify content exists
    await this.getContentById(
      assessmentDto.contentId,
      assessmentDto.contentType,
    );

    // In a real implementation, you'd store this in a separate quality_assessments table
    // For now, we'll return the assessment data
    return {
      contentId: assessmentDto.contentId,
      metric: assessmentDto.metric,
      score: assessmentDto.score,
      feedback: assessmentDto.feedback,
      timestamp: new Date(),
    };
  }

  async reviewContent(reviewDto: ContentReviewDto): Promise<{
    contentId: string;
    status: ReviewStatus;
    reviewNotes?: string;
    overallScore?: number;
    reviewedAt: Date;
    reviewerId: string;
  }> {
    this.logger.log(
      `Reviewing ${reviewDto.contentType} ${reviewDto.contentId}`,
    );

    const content = await this.getContentById(
      reviewDto.contentId,
      reviewDto.contentType,
    );

    // Update content based on review status
    if (reviewDto.status === ReviewStatus.APPROVED) {
      if (reviewDto.contentType === 'knowledge') {
        await this.knowledgeRepository.update(reviewDto.contentId, {
          isActive: true,
        });
      } else {
        await this.templateRepository.update(reviewDto.contentId, {
          isActive: true,
        });
      }
    } else if (reviewDto.status === ReviewStatus.REJECTED) {
      if (reviewDto.contentType === 'knowledge') {
        await this.knowledgeRepository.update(reviewDto.contentId, {
          isActive: false,
        });
      } else {
        await this.templateRepository.update(reviewDto.contentId, {
          isActive: false,
        });
      }
    }

    return {
      contentId: reviewDto.contentId,
      status: reviewDto.status,
      reviewNotes: reviewDto.reviewNotes,
      overallScore: reviewDto.overallScore,
      reviewedAt: new Date(),
      reviewerId: reviewDto.reviewerId,
    };
  }

  // Analytics and Optimization
  async getContentUsageAnalytics(
    analyticsDto: ContentUsageAnalyticsDto,
  ): Promise<ContentPerformanceDto[]> {
    this.logger.log('Generating content usage analytics');

    const results: ContentPerformanceDto[] = [];

    // Get knowledge base analytics
    if (!analyticsDto.contentType || analyticsDto.contentType === 'knowledge') {
      const knowledgeQuery = this.knowledgeRepository
        .createQueryBuilder('kb')
        .where('kb.isActive = :isActive', { isActive: true });

      if (analyticsDto.language) {
        knowledgeQuery.andWhere('kb.language = :language', {
          language: analyticsDto.language,
        });
      }

      if (analyticsDto.category) {
        knowledgeQuery.andWhere('kb.category = :category', {
          category: analyticsDto.category,
        });
      }

      if (analyticsDto.startDate && analyticsDto.endDate) {
        knowledgeQuery.andWhere(
          'kb.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate: analyticsDto.startDate,
            endDate: analyticsDto.endDate,
          },
        );
      }

      const knowledgeEntries = await knowledgeQuery
        .orderBy('kb.usageCount', 'DESC')
        .limit(analyticsDto.limit || 50)
        .getMany();

      results.push(
        ...knowledgeEntries.map((entry) => ({
          id: entry.id,
          title: entry.title,
          contentType: 'knowledge' as const,
          language: entry.language,
          category: entry.category,
          usageCount: entry.usageCount,
          averageRating: entry.averageRating,
          lastUsed: entry.updatedAt, // Approximation
          createdAt: entry.createdAt,
          isPopular: entry.isPopular(),
          isEffective: entry.hasHighRating(),
        })),
      );
    }

    // Get template analytics
    if (!analyticsDto.contentType || analyticsDto.contentType === 'template') {
      const templateQuery = this.templateRepository
        .createQueryBuilder('template')
        .where('template.isActive = :isActive', { isActive: true });

      if (analyticsDto.language) {
        templateQuery.andWhere('template.language = :language', {
          language: analyticsDto.language,
        });
      }

      if (analyticsDto.category) {
        templateQuery.andWhere('template.category = :category', {
          category: analyticsDto.category,
        });
      }

      if (analyticsDto.startDate && analyticsDto.endDate) {
        templateQuery.andWhere(
          'template.createdAt BETWEEN :startDate AND :endDate',
          {
            startDate: analyticsDto.startDate,
            endDate: analyticsDto.endDate,
          },
        );
      }

      const templates = await templateQuery
        .orderBy('template.usageCount', 'DESC')
        .limit(analyticsDto.limit || 50)
        .getMany();

      results.push(
        ...templates.map((template) => ({
          id: template.id,
          title: template.name,
          contentType: 'template' as const,
          language: template.language,
          category: template.category,
          usageCount: template.usageCount,
          averageRating: 0, // Templates don't have ratings in current schema
          effectivenessScore: template.effectivenessScore,
          lastUsed: template.updatedAt, // Approximation
          createdAt: template.createdAt,
          isPopular: template.isPopular(),
          isEffective: template.isEffective(),
        })),
      );
    }

    return results.sort((a, b) => b.usageCount - a.usageCount);
  }

  async generateOptimizationRecommendations(
    contentId: string,
    contentType: 'knowledge' | 'template',
  ): Promise<ContentOptimizationRecommendationDto> {
    this.logger.log(
      `Generating optimization recommendations for ${contentType} ${contentId}`,
    );

    const content = await this.getContentById(contentId, contentType);
    const recommendations: ContentOptimizationRecommendationDto['recommendations'] =
      [];

    if (contentType === 'knowledge') {
      const knowledgeEntry = content as KnowledgeBaseEntry;

      // Check usage patterns
      if (knowledgeEntry.usageCount < 5) {
        recommendations.push({
          type: 'keyword',
          priority: 'high',
          description: 'Low usage count detected',
          suggestedAction:
            'Add more relevant keywords to improve discoverability',
        });
      }

      // Check rating
      if (knowledgeEntry.averageRating < 3.5) {
        recommendations.push({
          type: 'content',
          priority: 'high',
          description: 'Below average rating',
          suggestedAction: 'Review and improve content quality and clarity',
        });
      }

      // Check multilingual support
      const translationCount = await this.getTranslationCount(
        contentId,
        'knowledge',
      );
      if (translationCount < 2) {
        recommendations.push({
          type: 'translation',
          priority: 'medium',
          description: 'Limited language support',
          suggestedAction:
            'Create translations for major languages (Spanish, French, German)',
        });
      }

      return {
        contentId,
        contentType,
        recommendations,
        currentMetrics: {
          usageCount: knowledgeEntry.usageCount,
          averageRating: knowledgeEntry.averageRating,
          languageCount: translationCount,
        },
        potentialImpact: {
          estimatedUsageIncrease: recommendations.length * 15,
          estimatedRatingImprovement: recommendations.length * 0.3,
        },
      };
    } else {
      const template = content as ResponseTemplate;

      // Check effectiveness
      if (template.effectivenessScore < 3.5) {
        recommendations.push({
          type: 'content',
          priority: 'high',
          description: 'Low effectiveness score',
          suggestedAction: 'Improve template content and variable substitution',
        });
      }

      // Check keyword coverage
      if (template.triggerKeywords.length < 3) {
        recommendations.push({
          type: 'keyword',
          priority: 'medium',
          description: 'Limited trigger keywords',
          suggestedAction:
            'Add more trigger keywords to improve matching accuracy',
        });
      }

      const translationCount = await this.getTranslationCount(
        contentId,
        'template',
      );
      if (translationCount < 2) {
        recommendations.push({
          type: 'translation',
          priority: 'medium',
          description: 'Limited language support',
          suggestedAction: 'Create translations for major languages',
        });
      }

      return {
        contentId,
        contentType,
        recommendations,
        currentMetrics: {
          usageCount: template.usageCount,
          averageRating: 0,
          effectivenessScore: template.effectivenessScore,
          languageCount: translationCount,
        },
        potentialImpact: {
          estimatedUsageIncrease: recommendations.length * 20,
          estimatedRatingImprovement: recommendations.length * 0.4,
        },
      };
    }
  }

  async getMultilingualStats(): Promise<MultilingualContentStatsDto> {
    this.logger.log('Generating multilingual content statistics');

    // Get knowledge base language distribution
    const knowledgeStats = await this.knowledgeRepository
      .createQueryBuilder('kb')
      .select('kb.language', 'language')
      .addSelect('COUNT(*)', 'count')
      .where('kb.isActive = :isActive', { isActive: true })
      .groupBy('kb.language')
      .getRawMany();

    // Get template language distribution
    const templateStats = await this.templateRepository
      .createQueryBuilder('template')
      .select('template.language', 'language')
      .addSelect('COUNT(*)', 'count')
      .where('template.isActive = :isActive', { isActive: true })
      .groupBy('template.language')
      .getRawMany();

    // Combine statistics
    const languageMap = new Map<string, number>();

    knowledgeStats.forEach((stat) => {
      languageMap.set(
        stat.language,
        (languageMap.get(stat.language) || 0) + parseInt(stat.count),
      );
    });

    templateStats.forEach((stat) => {
      languageMap.set(
        stat.language,
        (languageMap.get(stat.language) || 0) + parseInt(stat.count),
      );
    });

    const totalContent = Array.from(languageMap.values()).reduce(
      (sum, count) => sum + count,
      0,
    );

    const languageDistribution = Array.from(languageMap.entries()).map(
      ([language, count]) => ({
        language,
        count,
        percentage: Math.round((count / totalContent) * 100),
      }),
    );

    // For simplicity, we'll create mock translation coverage data
    // In a real implementation, you'd track translation relationships
    const translationCoverage = [
      {
        sourceLanguage: 'en',
        targetLanguages: languageDistribution
          .filter((lang) => lang.language !== 'en')
          .map((lang) => ({
            language: lang.language,
            translatedCount: Math.floor(lang.count * 0.7), // Mock 70% coverage
            coveragePercentage: 70,
          })),
      },
    ];

    const qualityMetrics = languageDistribution.map((lang) => ({
      language: lang.language,
      averageQualityScore: 3.5 + Math.random() * 1.5, // Mock quality scores
      reviewedCount: Math.floor(lang.count * 0.6),
      pendingReviewCount: Math.floor(lang.count * 0.2),
    }));

    return {
      totalContent,
      languageDistribution,
      translationCoverage,
      qualityMetrics,
    };
  }

  // Helper methods
  private async getContentById(
    id: string,
    contentType: 'knowledge' | 'template',
  ): Promise<KnowledgeBaseEntry | ResponseTemplate> {
    if (contentType === 'knowledge') {
      const entry = await this.knowledgeRepository.findOne({ where: { id } });
      if (!entry) {
        throw new NotFoundException(
          `Knowledge base entry with ID ${id} not found`,
        );
      }
      return entry;
    } else {
      const template = await this.templateRepository.findOne({ where: { id } });
      if (!template) {
        throw new NotFoundException(`Template with ID ${id} not found`);
      }
      return template;
    }
  }

  private async getTranslationCount(
    sourceId: string,
    contentType: 'knowledge' | 'template',
  ): Promise<number> {
    // In a real implementation, you'd track translation relationships
    // For now, we'll return a mock count based on existing content in different languages
    if (contentType === 'knowledge') {
      const sourceEntry = await this.knowledgeRepository.findOne({
        where: { id: sourceId },
      });
      if (!sourceEntry) return 0;

      return this.knowledgeRepository.count({
        where: {
          category: sourceEntry.category,
          contentType: sourceEntry.contentType,
          isActive: true,
        },
      });
    } else {
      const sourceTemplate = await this.templateRepository.findOne({
        where: { id: sourceId },
      });
      if (!sourceTemplate) return 0;

      return this.templateRepository.count({
        where: {
          category: sourceTemplate.category,
          isActive: true,
        },
      });
    }
  }
}
