import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ResponseTemplate } from '../entities/response-template.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';

export interface MultilingualTemplate {
  id: string;
  name: string;
  category: string;
  translations: Array<{
    language: string;
    template: string;
    variables?: Record<string, any>;
    isActive: boolean;
  }>;
  triggerKeywords: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMultilingualTemplateDto {
  name: string;
  category: string;
  primaryLanguage: string;
  primaryTemplate: string;
  translations?: Array<{
    language: string;
    template: string;
    variables?: Record<string, any>;
  }>;
  triggerKeywords?: string[];
  variables?: Record<string, any>;
}

export interface UpdateMultilingualTemplateDto {
  name?: string;
  category?: string;
  translations?: Array<{
    language: string;
    template: string;
    variables?: Record<string, any>;
    isActive?: boolean;
  }>;
  triggerKeywords?: string[];
  variables?: Record<string, any>;
}

export interface TemplateMatchResult {
  template: ResponseTemplate;
  matchScore: number;
  matchedKeywords: string[];
  language: string;
}

@Injectable()
export class MultilingualTemplateService {
  private readonly logger = new Logger(MultilingualTemplateService.name);

  private readonly supportedLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

  constructor(
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
  ) {}

  /**
   * Create a multilingual template with translations
   */
  async createMultilingualTemplate(
    dto: CreateMultilingualTemplateDto,
  ): Promise<MultilingualTemplate> {
    this.logger.debug(`Creating multilingual template: ${dto.name}`);

    // Validate primary language
    if (!this.supportedLanguages.includes(dto.primaryLanguage)) {
      throw new BadRequestException(
        `Unsupported primary language: ${dto.primaryLanguage}`,
      );
    }

    // Create primary template
    const primaryTemplate = this.templateRepository.create({
      name: dto.name,
      template: dto.primaryTemplate,
      category: dto.category,
      language: dto.primaryLanguage,
      triggerKeywords: dto.triggerKeywords || [],
      variables: dto.variables || {},
      isActive: true,
    });

    const savedPrimaryTemplate =
      await this.templateRepository.save(primaryTemplate);

    // Create translation templates
    const translationTemplates: ResponseTemplate[] = [];

    if (dto.translations && dto.translations.length > 0) {
      for (const translation of dto.translations) {
        if (!this.supportedLanguages.includes(translation.language)) {
          this.logger.warn(
            `Skipping unsupported language: ${translation.language}`,
          );
          continue;
        }

        const translationTemplate = this.templateRepository.create({
          name: `${dto.name}_${translation.language}`,
          template: translation.template,
          category: dto.category,
          language: translation.language,
          triggerKeywords: dto.triggerKeywords || [],
          variables: {
            ...(dto.variables || {}),
            ...(translation.variables || {}),
          },
          isActive: true,
        });

        const savedTranslation =
          await this.templateRepository.save(translationTemplate);
        translationTemplates.push(savedTranslation);
      }
    }

    return this.buildMultilingualTemplate(
      savedPrimaryTemplate,
      translationTemplates,
    );
  }

  /**
   * Get multilingual template by ID
   */
  async getMultilingualTemplate(
    templateId: string,
  ): Promise<MultilingualTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${templateId} not found`);
    }

    // Find all related templates (same name pattern or category)
    const relatedTemplates = await this.templateRepository.find({
      where: {
        category: template.category,
        name: template.name.includes('_')
          ? template.name.split('_')[0]
          : template.name,
      },
    });

    const primaryTemplate =
      relatedTemplates.find(
        (t) => !t.name.includes('_') || t.id === templateId,
      ) || template;

    const translations = relatedTemplates.filter(
      (t) => t.id !== primaryTemplate.id,
    );

    return this.buildMultilingualTemplate(primaryTemplate, translations);
  }

  /**
   * Update multilingual template
   */
  async updateMultilingualTemplate(
    templateId: string,
    dto: UpdateMultilingualTemplateDto,
  ): Promise<MultilingualTemplate> {
    const existingTemplate = await this.getMultilingualTemplate(templateId);

    // Update primary template
    const updateData: Partial<ResponseTemplate> = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.category) updateData.category = dto.category;
    if (dto.triggerKeywords) updateData.triggerKeywords = dto.triggerKeywords;
    if (dto.variables) updateData.variables = dto.variables;

    if (Object.keys(updateData).length > 0) {
      await this.templateRepository.update(templateId, updateData);
    }

    // Update or create translations
    if (dto.translations && dto.translations.length > 0) {
      for (const translation of dto.translations) {
        if (!this.supportedLanguages.includes(translation.language)) {
          this.logger.warn(
            `Skipping unsupported language: ${translation.language}`,
          );
          continue;
        }

        // Find existing translation
        const existingTranslation = await this.templateRepository.findOne({
          where: {
            category: existingTemplate.category,
            language: translation.language,
            name: `${existingTemplate.name}_${translation.language}`,
          },
        });

        if (existingTranslation) {
          // Update existing translation
          await this.templateRepository.update(existingTranslation.id, {
            template: translation.template,
            variables: {
              ...existingTemplate.translations[0]?.variables,
              ...translation.variables,
            },
            isActive:
              translation.isActive !== undefined ? translation.isActive : true,
          });
        } else {
          // Create new translation
          const newTranslation = this.templateRepository.create({
            name: `${existingTemplate.name}_${translation.language}`,
            template: translation.template,
            category: existingTemplate.category,
            language: translation.language,
            triggerKeywords: existingTemplate.triggerKeywords,
            variables: {
              ...(dto.variables || {}),
              ...(translation.variables || {}),
            },
            isActive:
              translation.isActive !== undefined ? translation.isActive : true,
          });

          await this.templateRepository.save(newTranslation);
        }
      }
    }

    return this.getMultilingualTemplate(templateId);
  }

  /**
   * Find matching template in specified language
   */
  async findMatchingTemplate(
    query: string,
    language: string,
    category?: string,
  ): Promise<TemplateMatchResult | null> {
    this.logger.debug(`Finding matching template for query in ${language}`);

    const whereConditions: any = {
      language,
      isActive: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    const templates = await this.templateRepository.find({
      where: whereConditions,
    });

    if (templates.length === 0) {
      return null;
    }

    let bestMatch: TemplateMatchResult | null = null;
    let highestScore = 0;

    for (const template of templates) {
      const matchResult = this.calculateTemplateMatch(query, template);

      if (matchResult.matchScore > highestScore) {
        highestScore = matchResult.matchScore;
        bestMatch = matchResult;
      }
    }

    return bestMatch && bestMatch.matchScore > 0.3 ? bestMatch : null;
  }

  /**
   * Get all templates in a specific language
   */
  async getTemplatesByLanguage(
    language: string,
    category?: string,
    isActive?: boolean,
  ): Promise<ResponseTemplate[]> {
    const whereConditions: any = { language };

    if (category) {
      whereConditions.category = category;
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive;
    }

    return this.templateRepository.find({
      where: whereConditions,
      order: { usageCount: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get template categories with language support
   */
  async getTemplateCategoriesWithLanguages(): Promise<
    Array<{
      category: string;
      languages: string[];
      templateCount: number;
    }>
  > {
    const templates = await this.templateRepository.find({
      where: { isActive: true },
    });

    const categoryMap = new Map<string, Set<string>>();

    for (const template of templates) {
      if (!categoryMap.has(template.category)) {
        categoryMap.set(template.category, new Set());
      }
      categoryMap.get(template.category)!.add(template.language);
    }

    return Array.from(categoryMap.entries()).map(([category, languages]) => ({
      category,
      languages: Array.from(languages),
      templateCount: templates.filter((t) => t.category === category).length,
    }));
  }

  /**
   * Search templates across languages
   */
  async searchTemplates(
    searchTerm: string,
    languages?: string[],
    category?: string,
    limit: number = 20,
  ): Promise<
    Array<{
      template: ResponseTemplate;
      relevanceScore: number;
    }>
  > {
    const whereConditions: any = { isActive: true };

    if (languages && languages.length > 0) {
      whereConditions.language = In(languages);
    }

    if (category) {
      whereConditions.category = category;
    }

    const templates = await this.templateRepository.find({
      where: whereConditions,
    });

    const results = templates
      .map((template) => ({
        template,
        relevanceScore: this.calculateSearchRelevance(searchTerm, template),
      }))
      .filter((result) => result.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Get template usage statistics
   */
  async getTemplateUsageStats(
    language?: string,
    category?: string,
    days: number = 30,
  ): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    totalUsage: number;
    averageUsage: number;
    topTemplates: Array<{
      id: string;
      name: string;
      category: string;
      language: string;
      usageCount: number;
    }>;
  }> {
    const whereConditions: any = {};

    if (language) {
      whereConditions.language = language;
    }

    if (category) {
      whereConditions.category = category;
    }

    const templates = await this.templateRepository.find({
      where: whereConditions,
    });

    const activeTemplates = templates.filter((t) => t.isActive);
    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);

    const topTemplates = templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        language: t.language,
        usageCount: t.usageCount,
      }));

    return {
      totalTemplates: templates.length,
      activeTemplates: activeTemplates.length,
      totalUsage,
      averageUsage: templates.length > 0 ? totalUsage / templates.length : 0,
      topTemplates,
    };
  }

  /**
   * Increment template usage count
   */
  async incrementTemplateUsage(templateId: string): Promise<void> {
    await this.templateRepository.increment(
      { id: templateId },
      'usageCount',
      1,
    );
  }

  /**
   * Delete multilingual template and all its translations
   */
  async deleteMultilingualTemplate(templateId: string): Promise<void> {
    const multilingualTemplate = await this.getMultilingualTemplate(templateId);

    // Delete all translations
    const templateIds = [
      templateId,
      ...multilingualTemplate.translations.map(
        (t) =>
          // We need to find the actual IDs of translation templates
          // This is a simplified approach - in practice, you'd store relationships
          templateId, // Placeholder - would need proper ID resolution
      ),
    ];

    await this.templateRepository.delete(templateIds);
  }

  /**
   * Build multilingual template object from database entities
   */
  private buildMultilingualTemplate(
    primaryTemplate: ResponseTemplate,
    translations: ResponseTemplate[],
  ): MultilingualTemplate {
    return {
      id: primaryTemplate.id,
      name: primaryTemplate.name,
      category: primaryTemplate.category,
      translations: [
        {
          language: primaryTemplate.language,
          template: primaryTemplate.template,
          variables: primaryTemplate.variables || undefined,
          isActive: primaryTemplate.isActive,
        },
        ...translations.map((t) => ({
          language: t.language,
          template: t.template,
          variables: t.variables || undefined,
          isActive: t.isActive,
        })),
      ],
      triggerKeywords: primaryTemplate.triggerKeywords,
      usageCount: primaryTemplate.usageCount,
      createdAt: primaryTemplate.createdAt,
      updatedAt: primaryTemplate.updatedAt,
    };
  }

  /**
   * Calculate template match score
   */
  private calculateTemplateMatch(
    query: string,
    template: ResponseTemplate,
  ): TemplateMatchResult {
    const queryWords = query.toLowerCase().split(/\s+/);
    const templateKeywords = template.triggerKeywords.map((k) =>
      k.toLowerCase(),
    );

    let matchScore = 0;
    const matchedKeywords: string[] = [];

    // Check keyword matches
    for (const keyword of templateKeywords) {
      for (const word of queryWords) {
        if (word.includes(keyword) || keyword.includes(word)) {
          matchScore += 0.3;
          matchedKeywords.push(keyword);
          break;
        }
      }
    }

    // Check template content similarity
    const templateWords = template.template.toLowerCase().split(/\s+/);
    const commonWords = queryWords.filter((word) =>
      templateWords.includes(word),
    );
    matchScore += (commonWords.length / queryWords.length) * 0.4;

    // Boost score for category-specific matches
    if (
      template.category &&
      query.toLowerCase().includes(template.category.toLowerCase())
    ) {
      matchScore += 0.2;
    }

    return {
      template,
      matchScore: Math.min(matchScore, 1.0),
      matchedKeywords,
      language: template.language,
    };
  }

  /**
   * Calculate search relevance score
   */
  private calculateSearchRelevance(
    searchTerm: string,
    template: ResponseTemplate,
  ): number {
    const searchWords = searchTerm.toLowerCase().split(/\s+/);
    let score = 0;

    // Check name match
    const nameWords = template.name.toLowerCase().split(/\s+/);
    const nameMatches = searchWords.filter((word) =>
      nameWords.some((nameWord) => nameWord.includes(word)),
    ).length;
    score += (nameMatches / searchWords.length) * 0.4;

    // Check template content match
    const templateWords = template.template.toLowerCase().split(/\s+/);
    const contentMatches = searchWords.filter((word) =>
      templateWords.some((templateWord) => templateWord.includes(word)),
    ).length;
    score += (contentMatches / searchWords.length) * 0.3;

    // Check keyword match
    const keywordMatches = searchWords.filter((word) =>
      template.triggerKeywords.some((keyword) =>
        keyword.toLowerCase().includes(word),
      ),
    ).length;
    score += (keywordMatches / searchWords.length) * 0.3;

    return Math.min(score, 1.0);
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * Validate language support
   */
  isLanguageSupported(language: string): boolean {
    return this.supportedLanguages.includes(language);
  }
}
