import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { ContentType } from '../common/enums';

export interface MultilingualKnowledgeEntry {
  id: string;
  title: string;
  category: string;
  contentType: ContentType;
  translations: Array<{
    language: string;
    title: string;
    content: string;
    keywords: string[];
    isActive: boolean;
  }>;
  tags: string[];
  usageCount: number;
  averageRating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMultilingualKnowledgeDto {
  category: string;
  contentType: ContentType;
  primaryLanguage: string;
  primaryTitle: string;
  primaryContent: string;
  primaryKeywords?: string[];
  translations?: Array<{
    language: string;
    title: string;
    content: string;
    keywords?: string[];
  }>;
  tags?: string[];
}

export interface UpdateMultilingualKnowledgeDto {
  category?: string;
  contentType?: ContentType;
  translations?: Array<{
    language: string;
    title: string;
    content: string;
    keywords?: string[];
    isActive?: boolean;
  }>;
  tags?: string[];
}

export interface KnowledgeSearchResult {
  entry: KnowledgeBaseEntry;
  relevanceScore: number;
  matchedKeywords: string[];
  language: string;
}

export interface TranslationQualityAssessment {
  score: number;
  issues: string[];
  suggestions: string[];
  completeness: number;
  accuracy: number;
  fluency: number;
}

@Injectable()
export class MultilingualKnowledgeBaseService {
  private readonly logger = new Logger(MultilingualKnowledgeBaseService.name);

  private readonly supportedLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

  constructor(
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
  ) {}

  /**
   * Create multilingual knowledge base entry
   */
  async createMultilingualKnowledge(
    dto: CreateMultilingualKnowledgeDto,
  ): Promise<MultilingualKnowledgeEntry> {
    this.logger.debug(
      `Creating multilingual knowledge entry: ${dto.primaryTitle}`,
    );

    // Validate primary language
    if (!this.supportedLanguages.includes(dto.primaryLanguage)) {
      throw new BadRequestException(
        `Unsupported primary language: ${dto.primaryLanguage}`,
      );
    }

    // Create primary entry
    const primaryEntry = this.knowledgeRepository.create({
      title: dto.primaryTitle,
      content: dto.primaryContent,
      category: dto.category,
      contentType: dto.contentType,
      language: dto.primaryLanguage,
      keywords: dto.primaryKeywords || [],
      tags: dto.tags || [],
      isActive: true,
      usageCount: 0,
      averageRating: 0,
    });

    const savedPrimaryEntry = await this.knowledgeRepository.save(primaryEntry);

    // Create translation entries
    const translationEntries: KnowledgeBaseEntry[] = [];

    if (dto.translations && dto.translations.length > 0) {
      for (const translation of dto.translations) {
        if (!this.supportedLanguages.includes(translation.language)) {
          this.logger.warn(
            `Skipping unsupported language: ${translation.language}`,
          );
          continue;
        }

        const translationEntry = this.knowledgeRepository.create({
          title: translation.title,
          content: translation.content,
          category: dto.category,
          contentType: dto.contentType,
          language: translation.language,
          keywords: translation.keywords || [],
          tags: dto.tags || [],
          isActive: true,
          usageCount: 0,
          averageRating: 0,
        });

        const savedTranslation =
          await this.knowledgeRepository.save(translationEntry);
        translationEntries.push(savedTranslation);
      }
    }

    return this.buildMultilingualKnowledgeEntry(
      savedPrimaryEntry,
      translationEntries,
    );
  }

  /**
   * Get multilingual knowledge entry by ID
   */
  async getMultilingualKnowledge(
    entryId: string,
  ): Promise<MultilingualKnowledgeEntry> {
    const entry = await this.knowledgeRepository.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge entry with ID ${entryId} not found`,
      );
    }

    // Find related entries (same category and similar content)
    const relatedEntries = await this.findRelatedEntries(entry);

    return this.buildMultilingualKnowledgeEntry(entry, relatedEntries);
  }

  /**
   * Update multilingual knowledge entry
   */
  async updateMultilingualKnowledge(
    entryId: string,
    dto: UpdateMultilingualKnowledgeDto,
  ): Promise<MultilingualKnowledgeEntry> {
    const existingEntry = await this.knowledgeRepository.findOne({
      where: { id: entryId },
    });

    if (!existingEntry) {
      throw new NotFoundException(
        `Knowledge entry with ID ${entryId} not found`,
      );
    }

    // Update primary entry
    const updateData: Partial<KnowledgeBaseEntry> = {};
    if (dto.category) updateData.category = dto.category;
    if (dto.contentType) updateData.contentType = dto.contentType;
    if (dto.tags) updateData.tags = dto.tags;

    if (Object.keys(updateData).length > 0) {
      await this.knowledgeRepository.update(entryId, updateData);
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
        const existingTranslation = await this.knowledgeRepository.findOne({
          where: {
            category: existingEntry.category,
            language: translation.language,
            contentType: existingEntry.contentType,
          },
        });

        if (existingTranslation) {
          // Update existing translation
          await this.knowledgeRepository.update(existingTranslation.id, {
            title: translation.title,
            content: translation.content,
            keywords: translation.keywords || existingTranslation.keywords,
            isActive:
              translation.isActive !== undefined ? translation.isActive : true,
          });
        } else {
          // Create new translation
          const newTranslation = this.knowledgeRepository.create({
            title: translation.title,
            content: translation.content,
            category: existingEntry.category,
            contentType: existingEntry.contentType,
            language: translation.language,
            keywords: translation.keywords || [],
            tags: dto.tags || existingEntry.tags,
            isActive:
              translation.isActive !== undefined ? translation.isActive : true,
            usageCount: 0,
            averageRating: 0,
          });

          await this.knowledgeRepository.save(newTranslation);
        }
      }
    }

    return this.getMultilingualKnowledge(entryId);
  }

  /**
   * Search knowledge base in specific language
   */
  async searchKnowledgeByLanguage(
    query: string,
    language: string,
    category?: string,
    contentType?: ContentType,
    limit: number = 10,
  ): Promise<KnowledgeSearchResult[]> {
    this.logger.debug(`Searching knowledge base in ${language} for: ${query}`);

    const whereConditions: any = {
      language,
      isActive: true,
    };

    if (category) {
      whereConditions.category = category;
    }

    if (contentType) {
      whereConditions.contentType = contentType;
    }

    const entries = await this.knowledgeRepository.find({
      where: whereConditions,
    });

    const results = entries
      .map((entry) => this.calculateKnowledgeRelevance(query, entry))
      .filter((result) => result.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Get knowledge entries by language
   */
  async getKnowledgeByLanguage(
    language: string,
    category?: string,
    contentType?: ContentType,
    isActive?: boolean,
  ): Promise<KnowledgeBaseEntry[]> {
    const whereConditions: any = { language };

    if (category) {
      whereConditions.category = category;
    }

    if (contentType) {
      whereConditions.contentType = contentType;
    }

    if (isActive !== undefined) {
      whereConditions.isActive = isActive;
    }

    return this.knowledgeRepository.find({
      where: whereConditions,
      order: { usageCount: 'DESC', averageRating: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Assess translation quality
   */
  async assessTranslationQuality(
    originalEntryId: string,
    translatedEntryId: string,
  ): Promise<TranslationQualityAssessment> {
    const originalEntry = await this.knowledgeRepository.findOne({
      where: { id: originalEntryId },
    });

    const translatedEntry = await this.knowledgeRepository.findOne({
      where: { id: translatedEntryId },
    });

    if (!originalEntry || !translatedEntry) {
      throw new NotFoundException('One or both entries not found');
    }

    return this.performQualityAssessment(originalEntry, translatedEntry);
  }

  /**
   * Get knowledge base statistics by language
   */
  async getKnowledgeStatsByLanguage(): Promise<
    Array<{
      language: string;
      totalEntries: number;
      activeEntries: number;
      categories: string[];
      contentTypes: ContentType[];
      averageRating: number;
      totalUsage: number;
    }>
  > {
    const allEntries = await this.knowledgeRepository.find();
    const languageStats = new Map<string, any>();

    for (const entry of allEntries) {
      if (!languageStats.has(entry.language)) {
        languageStats.set(entry.language, {
          language: entry.language,
          totalEntries: 0,
          activeEntries: 0,
          categories: new Set<string>(),
          contentTypes: new Set<ContentType>(),
          totalRating: 0,
          ratedEntries: 0,
          totalUsage: 0,
        });
      }

      const stats = languageStats.get(entry.language);
      stats.totalEntries++;

      if (entry.isActive) {
        stats.activeEntries++;
      }

      stats.categories.add(entry.category);
      stats.contentTypes.add(entry.contentType);
      stats.totalUsage += entry.usageCount;

      if (entry.averageRating > 0) {
        stats.totalRating += entry.averageRating;
        stats.ratedEntries++;
      }
    }

    return Array.from(languageStats.values()).map((stats) => ({
      language: stats.language,
      totalEntries: stats.totalEntries,
      activeEntries: stats.activeEntries,
      categories: Array.from(stats.categories),
      contentTypes: Array.from(stats.contentTypes),
      averageRating:
        stats.ratedEntries > 0 ? stats.totalRating / stats.ratedEntries : 0,
      totalUsage: stats.totalUsage,
    }));
  }

  /**
   * Find missing translations
   */
  async findMissingTranslations(
    category?: string,
    contentType?: ContentType,
  ): Promise<
    Array<{
      primaryEntry: KnowledgeBaseEntry;
      missingLanguages: string[];
      existingLanguages: string[];
    }>
  > {
    const whereConditions: any = { isActive: true };

    if (category) {
      whereConditions.category = category;
    }

    if (contentType) {
      whereConditions.contentType = contentType;
    }

    const entries = await this.knowledgeRepository.find({
      where: whereConditions,
    });

    // Group entries by category and content similarity
    const entryGroups = this.groupRelatedEntries(entries);
    const missingTranslations: Array<{
      primaryEntry: KnowledgeBaseEntry;
      missingLanguages: string[];
      existingLanguages: string[];
    }> = [];

    for (const group of entryGroups) {
      const existingLanguages = group.map((entry) => entry.language);
      const missingLanguages = this.supportedLanguages.filter(
        (lang) => !existingLanguages.includes(lang),
      );

      if (missingLanguages.length > 0) {
        // Use the entry with the highest rating as primary
        const primaryEntry = group.sort(
          (a, b) =>
            b.averageRating - a.averageRating || b.usageCount - a.usageCount,
        )[0];

        missingTranslations.push({
          primaryEntry,
          missingLanguages,
          existingLanguages,
        });
      }
    }

    return missingTranslations;
  }

  /**
   * Increment knowledge entry usage
   */
  async incrementKnowledgeUsage(entryId: string): Promise<void> {
    await this.knowledgeRepository.increment({ id: entryId }, 'usageCount', 1);
  }

  /**
   * Rate knowledge entry
   */
  async rateKnowledgeEntry(entryId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const entry = await this.knowledgeRepository.findOne({
      where: { id: entryId },
    });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge entry with ID ${entryId} not found`,
      );
    }

    // Simple average calculation (in production, you'd want to track individual ratings)
    const newRating =
      entry.averageRating === 0 ? rating : (entry.averageRating + rating) / 2;

    await this.knowledgeRepository.update(entryId, {
      averageRating: newRating,
    });
  }

  /**
   * Build multilingual knowledge entry object
   */
  private buildMultilingualKnowledgeEntry(
    primaryEntry: KnowledgeBaseEntry,
    translations: KnowledgeBaseEntry[],
  ): MultilingualKnowledgeEntry {
    return {
      id: primaryEntry.id,
      title: primaryEntry.title,
      category: primaryEntry.category,
      contentType: primaryEntry.contentType,
      translations: [
        {
          language: primaryEntry.language,
          title: primaryEntry.title,
          content: primaryEntry.content,
          keywords: primaryEntry.keywords,
          isActive: primaryEntry.isActive,
        },
        ...translations.map((t) => ({
          language: t.language,
          title: t.title,
          content: t.content,
          keywords: t.keywords,
          isActive: t.isActive,
        })),
      ],
      tags: primaryEntry.tags,
      usageCount: primaryEntry.usageCount,
      averageRating: primaryEntry.averageRating,
      createdAt: primaryEntry.createdAt,
      updatedAt: primaryEntry.updatedAt,
    };
  }

  /**
   * Find related entries for multilingual grouping
   */
  private async findRelatedEntries(
    entry: KnowledgeBaseEntry,
  ): Promise<KnowledgeBaseEntry[]> {
    // Find entries with same category and similar keywords
    const relatedEntries = await this.knowledgeRepository.find({
      where: {
        category: entry.category,
        contentType: entry.contentType,
        isActive: true,
      },
    });

    return relatedEntries.filter(
      (related) =>
        related.id !== entry.id &&
        this.calculateContentSimilarity(entry, related) > 0.7,
    );
  }

  /**
   * Calculate content similarity between entries
   */
  private calculateContentSimilarity(
    entry1: KnowledgeBaseEntry,
    entry2: KnowledgeBaseEntry,
  ): number {
    const keywords1 = new Set(entry1.keywords.map((k) => k.toLowerCase()));
    const keywords2 = new Set(entry2.keywords.map((k) => k.toLowerCase()));

    const intersection = new Set(
      [...keywords1].filter((x) => keywords2.has(x)),
    );
    const union = new Set([...keywords1, ...keywords2]);

    const keywordSimilarity =
      union.size > 0 ? intersection.size / union.size : 0;

    // Also check title similarity
    const title1Words = new Set(entry1.title.toLowerCase().split(/\s+/));
    const title2Words = new Set(entry2.title.toLowerCase().split(/\s+/));

    const titleIntersection = new Set(
      [...title1Words].filter((x) => title2Words.has(x)),
    );
    const titleUnion = new Set([...title1Words, ...title2Words]);

    const titleSimilarity =
      titleUnion.size > 0 ? titleIntersection.size / titleUnion.size : 0;

    return keywordSimilarity * 0.6 + titleSimilarity * 0.4;
  }

  /**
   * Calculate knowledge relevance score
   */
  private calculateKnowledgeRelevance(
    query: string,
    entry: KnowledgeBaseEntry,
  ): KnowledgeSearchResult {
    const queryWords = query.toLowerCase().split(/\s+/);
    let relevanceScore = 0;
    const matchedKeywords: string[] = [];

    // Check title match
    const titleWords = entry.title.toLowerCase().split(/\s+/);
    const titleMatches = queryWords.filter((word) =>
      titleWords.some((titleWord) => titleWord.includes(word)),
    ).length;
    relevanceScore += (titleMatches / queryWords.length) * 0.4;

    // Check keyword match
    for (const keyword of entry.keywords) {
      for (const word of queryWords) {
        if (
          keyword.toLowerCase().includes(word.toLowerCase()) ||
          word.toLowerCase().includes(keyword.toLowerCase())
        ) {
          relevanceScore += 0.3;
          matchedKeywords.push(keyword);
          break;
        }
      }
    }

    // Check content match (first 200 characters)
    const contentPreview = entry.content.substring(0, 200).toLowerCase();
    const contentMatches = queryWords.filter((word) =>
      contentPreview.includes(word),
    ).length;
    relevanceScore += (contentMatches / queryWords.length) * 0.3;

    return {
      entry,
      relevanceScore: Math.min(relevanceScore, 1.0),
      matchedKeywords,
      language: entry.language,
    };
  }

  /**
   * Perform translation quality assessment
   */
  private performQualityAssessment(
    original: KnowledgeBaseEntry,
    translated: KnowledgeBaseEntry,
  ): TranslationQualityAssessment {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check completeness
    const originalLength = original.content.length;
    const translatedLength = translated.content.length;
    const lengthRatio = translatedLength / originalLength;

    let completeness = 1.0;
    if (lengthRatio < 0.7) {
      completeness = 0.6;
      issues.push('Translation appears significantly shorter than original');
      suggestions.push('Review for missing content or sections');
    } else if (lengthRatio > 1.5) {
      completeness = 0.8;
      issues.push('Translation appears significantly longer than original');
      suggestions.push('Review for unnecessary additions or verbosity');
    }

    // Check keyword preservation
    const originalKeywords = new Set(
      original.keywords.map((k) => k.toLowerCase()),
    );
    const translatedKeywords = new Set(
      translated.keywords.map((k) => k.toLowerCase()),
    );
    const keywordPreservation =
      translatedKeywords.size > 0
        ? [...originalKeywords].filter((k) => translatedKeywords.has(k))
            .length / originalKeywords.size
        : 0;

    let accuracy = keywordPreservation;
    if (keywordPreservation < 0.5) {
      issues.push('Many keywords not preserved in translation');
      suggestions.push(
        'Ensure technical terms and key concepts are properly translated',
      );
    }

    // Basic fluency check (simplified)
    let fluency = 0.8; // Default assumption
    if (
      translated.content.includes('???') ||
      translated.content.includes('[UNTRANSLATED]')
    ) {
      fluency = 0.3;
      issues.push('Untranslated sections detected');
      suggestions.push('Complete all translations');
    }

    const overallScore = (completeness + accuracy + fluency) / 3;

    return {
      score: overallScore,
      issues,
      suggestions,
      completeness,
      accuracy,
      fluency,
    };
  }

  /**
   * Group related entries for translation analysis
   */
  private groupRelatedEntries(
    entries: KnowledgeBaseEntry[],
  ): KnowledgeBaseEntry[][] {
    const groups: KnowledgeBaseEntry[][] = [];
    const processed = new Set<string>();

    for (const entry of entries) {
      if (processed.has(entry.id)) {
        continue;
      }

      const group = [entry];
      processed.add(entry.id);

      // Find similar entries
      for (const other of entries) {
        if (processed.has(other.id)) {
          continue;
        }

        if (this.calculateContentSimilarity(entry, other) > 0.7) {
          group.push(other);
          processed.add(other.id);
        }
      }

      groups.push(group);
    }

    return groups;
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
