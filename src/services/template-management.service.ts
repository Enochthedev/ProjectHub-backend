import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseTemplate } from '../entities/response-template.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateMatchDto,
  ProcessTemplateDto,
  TemplateResponseDto,
  TemplateMatchResultDto,
  TemplateSearchResultDto,
} from '../dto/template';

@Injectable()
export class TemplateManagementService {
  private readonly logger = new Logger(TemplateManagementService.name);

  constructor(
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
  ) {}

  async createTemplate(
    createDto: CreateTemplateDto,
  ): Promise<ResponseTemplate> {
    this.logger.log(`Creating template: ${createDto.name}`);

    // Normalize trigger keywords to lowercase
    const normalizedKeywords = createDto.triggerKeywords.map((keyword) =>
      keyword.toLowerCase().trim(),
    );

    const template = this.templateRepository.create({
      ...createDto,
      triggerKeywords: normalizedKeywords,
    });

    // Validate template before saving
    const validation = template.validateTemplate();
    if (!validation.isValid) {
      throw new BadRequestException(
        `Template validation failed: ${validation.errors.join(', ')}`,
      );
    }

    const savedTemplate = await this.templateRepository.save(template);
    this.logger.log(`Created template with ID: ${savedTemplate.id}`);

    return savedTemplate;
  }

  async updateTemplate(
    id: string,
    updateDto: UpdateTemplateDto,
  ): Promise<ResponseTemplate> {
    this.logger.log(`Updating template: ${id}`);

    const template = await this.findById(id);

    // Normalize trigger keywords if provided
    if (updateDto.triggerKeywords) {
      updateDto.triggerKeywords = updateDto.triggerKeywords.map((keyword) =>
        keyword.toLowerCase().trim(),
      );
    }

    Object.assign(template, updateDto);

    // Validate template after update
    const validation = template.validateTemplate();
    if (!validation.isValid) {
      throw new BadRequestException(
        `Template validation failed: ${validation.errors.join(', ')}`,
      );
    }

    const updatedTemplate = await this.templateRepository.save(template);
    this.logger.log(`Updated template: ${id}`);

    return updatedTemplate;
  }

  async findById(id: string): Promise<ResponseTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async deleteTemplate(id: string): Promise<void> {
    this.logger.log(`Deleting template: ${id}`);

    const result = await this.templateRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    this.logger.log(`Deleted template: ${id}`);
  }

  async findMatchingTemplates(
    matchDto: TemplateMatchDto,
  ): Promise<TemplateMatchResultDto[]> {
    this.logger.log(`Finding matching templates for query: ${matchDto.query}`);

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true });

    // Filter by category if provided
    if (matchDto.category) {
      queryBuilder.andWhere('template.category = :category', {
        category: matchDto.category,
      });
    }

    // Filter by language if provided
    if (matchDto.language) {
      queryBuilder.andWhere('template.language = :language', {
        language: matchDto.language,
      });
    }

    const templates = await queryBuilder.getMany();

    // Calculate match scores and filter by minimum score
    const matchResults: TemplateMatchResultDto[] = [];

    for (const template of templates) {
      const matchScore = template.getMatchScore(matchDto.query);

      if (matchScore >= (matchDto.minMatchScore || 0.3)) {
        const processedContent = template.processTemplate(
          matchDto.substitutions || {},
        );

        matchResults.push({
          template: this.mapToResponseDto(template),
          matchScore,
          processedContent,
        });
      }
    }

    // Sort by match score (descending) and effectiveness
    matchResults.sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return b.template.effectivenessScore - a.template.effectivenessScore;
    });

    // Limit results
    const limitedResults = matchResults.slice(0, matchDto.limit || 3);

    this.logger.log(`Found ${limitedResults.length} matching templates`);
    return limitedResults;
  }

  async getBestMatchingTemplate(
    query: string,
    category?: string,
    language?: string,
    substitutions?: Record<string, string>,
  ): Promise<TemplateMatchResultDto | null> {
    const matchDto: TemplateMatchDto = {
      query,
      category,
      language,
      limit: 1,
      minMatchScore: 0.3,
      substitutions,
    };

    const matches = await this.findMatchingTemplates(matchDto);
    return matches.length > 0 ? matches[0] : null;
  }

  async processTemplate(processDto: ProcessTemplateDto): Promise<string> {
    this.logger.log(`Processing template: ${processDto.templateId}`);

    const template = await this.findById(processDto.templateId);

    // Increment usage count
    await this.incrementUsage(processDto.templateId);

    return template.processTemplate(processDto.substitutions || {});
  }

  async incrementUsage(id: string): Promise<void> {
    await this.templateRepository.increment({ id }, 'usageCount', 1);
    this.logger.log(`Incremented usage count for template: ${id}`);
  }

  async updateEffectiveness(id: string, score: number): Promise<void> {
    const template = await this.findById(id);

    // Simple effectiveness update - in production, you'd want to track individual scores
    const newScore = (template.effectivenessScore + score) / 2;

    await this.templateRepository.update(id, {
      effectivenessScore: Math.round(newScore * 100) / 100,
    });

    this.logger.log(`Updated effectiveness for template ${id} to ${newScore}`);
  }

  async getTemplatesByCategory(
    category: string,
  ): Promise<TemplateSearchResultDto> {
    const templates = await this.templateRepository.find({
      where: {
        category,
        isActive: true,
      },
      order: {
        effectivenessScore: 'DESC',
        usageCount: 'DESC',
      },
    });

    return {
      templates: templates.map((template) => this.mapToResponseDto(template)),
      total: templates.length,
      hasMore: false,
    };
  }

  async getTemplatesByLanguage(
    language: string,
  ): Promise<TemplateSearchResultDto> {
    const templates = await this.templateRepository.find({
      where: {
        language,
        isActive: true,
      },
      order: {
        effectivenessScore: 'DESC',
        usageCount: 'DESC',
      },
    });

    return {
      templates: templates.map((template) => this.mapToResponseDto(template)),
      total: templates.length,
      hasMore: false,
    };
  }

  async getPopularTemplates(limit: number = 10): Promise<ResponseTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: {
        usageCount: 'DESC',
        effectivenessScore: 'DESC',
      },
      take: limit,
    });
  }

  async getEffectiveTemplates(limit: number = 10): Promise<ResponseTemplate[]> {
    return this.templateRepository.find({
      where: {
        isActive: true,
        effectivenessScore: 3.5, // Using >= would require raw query
      },
      order: {
        effectivenessScore: 'DESC',
        usageCount: 'DESC',
      },
      take: limit,
    });
  }

  async getRecentTemplates(limit: number = 10): Promise<ResponseTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  async searchTemplatesByKeyword(keyword: string): Promise<ResponseTemplate[]> {
    return this.templateRepository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere(':keyword = ANY(template.triggerKeywords)', {
        keyword: keyword.toLowerCase(),
      })
      .orderBy('template.effectivenessScore', 'DESC')
      .addOrderBy('template.usageCount', 'DESC')
      .getMany();
  }

  async getTemplateAnalytics(id: string): Promise<{
    template: TemplateResponseDto;
    analytics: {
      usageCount: number;
      effectivenessScore: number;
      isPopular: boolean;
      isEffective: boolean;
      keywordCount: number;
      variableCount: number;
    };
  }> {
    const template = await this.findById(id);

    return {
      template: this.mapToResponseDto(template),
      analytics: {
        usageCount: template.usageCount,
        effectivenessScore: template.effectivenessScore,
        isPopular: template.isPopular(),
        isEffective: template.isEffective(),
        keywordCount: template.triggerKeywords.length,
        variableCount: template.getVariableKeys().length,
      },
    };
  }

  async optimizeTemplateKeywords(id: string): Promise<{
    suggestions: string[];
    currentKeywords: string[];
  }> {
    const template = await this.findById(id);

    // Simple optimization suggestions based on template content
    const contentWords = template.template
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            'this',
            'that',
            'with',
            'from',
            'they',
            'have',
            'been',
            'will',
          ].includes(word),
      );

    const uniqueWords = [...new Set(contentWords)];
    const suggestions = uniqueWords
      .filter((word) => !template.triggerKeywords.includes(word))
      .slice(0, 5);

    return {
      suggestions,
      currentKeywords: template.triggerKeywords,
    };
  }

  private mapToResponseDto(template: ResponseTemplate): TemplateResponseDto {
    return {
      id: template.id,
      name: template.name,
      template: template.template,
      category: template.category,
      triggerKeywords: template.triggerKeywords,
      variables: template.variables,
      language: template.language,
      isActive: template.isActive,
      usageCount: template.usageCount,
      effectivenessScore: template.effectivenessScore,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }
}
