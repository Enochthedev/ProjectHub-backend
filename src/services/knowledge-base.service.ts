import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import {
  CreateKnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
  SearchKnowledgeDto,
  KnowledgeEntryResponseDto,
  KnowledgeSearchResultDto,
} from '../dto/knowledge';
import { ContentType } from '../common/enums';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
  ) {}

  async createEntry(
    createDto: CreateKnowledgeEntryDto,
    createdById?: string,
  ): Promise<KnowledgeBaseEntry> {
    this.logger.log(`Creating knowledge base entry: ${createDto.title}`);

    const entry = this.knowledgeRepository.create({
      ...createDto,
      createdById,
    });

    const savedEntry = await this.knowledgeRepository.save(entry);
    this.logger.log(`Created knowledge base entry with ID: ${savedEntry.id}`);

    return savedEntry;
  }

  async updateEntry(
    id: string,
    updateDto: UpdateKnowledgeEntryDto,
  ): Promise<KnowledgeBaseEntry> {
    this.logger.log(`Updating knowledge base entry: ${id}`);

    const entry = await this.findById(id);
    Object.assign(entry, updateDto);

    const updatedEntry = await this.knowledgeRepository.save(entry);
    this.logger.log(`Updated knowledge base entry: ${id}`);

    return updatedEntry;
  }

  async findById(id: string): Promise<KnowledgeBaseEntry> {
    const entry = await this.knowledgeRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    return entry;
  }

  async deleteEntry(id: string): Promise<void> {
    this.logger.log(`Deleting knowledge base entry: ${id}`);

    const result = await this.knowledgeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    this.logger.log(`Deleted knowledge base entry: ${id}`);
  }

  async searchKnowledge(
    searchDto: SearchKnowledgeDto,
  ): Promise<KnowledgeSearchResultDto> {
    this.logger.log(`Searching knowledge base with query: ${searchDto.query}`);

    const queryBuilder = this.createSearchQueryBuilder(searchDto);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and get results
    const entries = await queryBuilder
      .limit(searchDto.limit)
      .offset(searchDto.offset)
      .getMany();

    const responseEntries = entries.map((entry) =>
      this.mapToResponseDto(entry),
    );

    return {
      entries: responseEntries,
      total,
      limit: searchDto.limit || 20,
      offset: searchDto.offset || 0,
      hasMore: (searchDto.offset || 0) + (searchDto.limit || 20) < total,
    };
  }

  async searchByQuery(
    query: string,
    category?: string,
    limit: number = 10,
  ): Promise<KnowledgeBaseEntry[]> {
    this.logger.log(`Full-text search for: ${query}`);

    const queryBuilder = this.knowledgeRepository
      .createQueryBuilder('kb')
      .where('kb.isActive = :isActive', { isActive: true });

    if (query && query.trim()) {
      // Use PostgreSQL full-text search
      queryBuilder
        .addSelect(
          `ts_rank(kb.searchVector, plainto_tsquery('english', :query))`,
          'relevance_score',
        )
        .andWhere(`kb.searchVector @@ plainto_tsquery('english', :query)`, {
          query: query.trim(),
        })
        .orderBy('relevance_score', 'DESC');
    } else {
      queryBuilder
        .orderBy('kb.averageRating', 'DESC')
        .addOrderBy('kb.usageCount', 'DESC');
    }

    if (category) {
      queryBuilder.andWhere('kb.category = :category', { category });
    }

    return queryBuilder.limit(limit).getMany();
  }

  async getRelevantContent(query: string, context?: any): Promise<string> {
    this.logger.log(`Getting relevant content for query: ${query}`);

    const entries = await this.searchByQuery(query, undefined, 3);

    if (entries.length === 0) {
      return '';
    }

    // Combine the most relevant content
    return entries
      .map((entry) => `${entry.title}: ${entry.content}`)
      .join('\n\n');
  }

  async incrementUsage(id: string): Promise<void> {
    await this.knowledgeRepository.increment({ id }, 'usageCount', 1);
    this.logger.log(`Incremented usage count for entry: ${id}`);
  }

  async updateRating(id: string, rating: number): Promise<void> {
    const entry = await this.findById(id);

    // Simple rating update - in production, you'd want to track individual ratings
    const newRating = (entry.averageRating + rating) / 2;

    await this.knowledgeRepository.update(id, {
      averageRating: Math.round(newRating * 100) / 100,
    });

    this.logger.log(`Updated rating for entry ${id} to ${newRating}`);
  }

  async getByCategory(category: string): Promise<KnowledgeBaseEntry[]> {
    return this.knowledgeRepository.find({
      where: {
        category,
        isActive: true,
      },
      order: {
        averageRating: 'DESC',
        usageCount: 'DESC',
      },
    });
  }

  async getByContentType(
    contentType: ContentType,
  ): Promise<KnowledgeBaseEntry[]> {
    return this.knowledgeRepository.find({
      where: {
        contentType,
        isActive: true,
      },
      order: {
        averageRating: 'DESC',
        usageCount: 'DESC',
      },
    });
  }

  async getPopularEntries(limit: number = 10): Promise<KnowledgeBaseEntry[]> {
    return this.knowledgeRepository.find({
      where: { isActive: true },
      order: {
        usageCount: 'DESC',
        averageRating: 'DESC',
      },
      take: limit,
    });
  }

  async getRecentEntries(limit: number = 10): Promise<KnowledgeBaseEntry[]> {
    return this.knowledgeRepository.find({
      where: { isActive: true },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  async getEntriesByLanguage(language: string): Promise<KnowledgeBaseEntry[]> {
    return this.knowledgeRepository.find({
      where: {
        language,
        isActive: true,
      },
      order: {
        averageRating: 'DESC',
        usageCount: 'DESC',
      },
    });
  }

  private createSearchQueryBuilder(
    searchDto: SearchKnowledgeDto,
  ): SelectQueryBuilder<KnowledgeBaseEntry> {
    const queryBuilder = this.knowledgeRepository
      .createQueryBuilder('kb')
      .where('kb.isActive = :isActive', { isActive: true });

    // Full-text search
    if (searchDto.query && searchDto.query.trim()) {
      queryBuilder
        .addSelect(
          `ts_rank(kb.searchVector, plainto_tsquery('english', :query))`,
          'relevance_score',
        )
        .andWhere(`kb.searchVector @@ plainto_tsquery('english', :query)`, {
          query: searchDto.query.trim(),
        });
    }

    // Category filter
    if (searchDto.category) {
      queryBuilder.andWhere('kb.category = :category', {
        category: searchDto.category,
      });
    }

    // Content type filter
    if (searchDto.contentType) {
      queryBuilder.andWhere('kb.contentType = :contentType', {
        contentType: searchDto.contentType,
      });
    }

    // Language filter
    if (searchDto.language) {
      queryBuilder.andWhere('kb.language = :language', {
        language: searchDto.language,
      });
    }

    // Tags filter
    if (searchDto.tags && searchDto.tags.length > 0) {
      queryBuilder.andWhere('kb.tags && :tags', { tags: searchDto.tags });
    }

    // Apply sorting
    this.applySorting(queryBuilder, searchDto);

    return queryBuilder;
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<KnowledgeBaseEntry>,
    searchDto: SearchKnowledgeDto,
  ): void {
    const { sortBy = 'relevance', sortOrder = 'DESC' } = searchDto;

    switch (sortBy) {
      case 'relevance':
        if (searchDto.query && searchDto.query.trim()) {
          queryBuilder.orderBy('relevance_score', sortOrder);
        } else {
          queryBuilder
            .orderBy('kb.averageRating', sortOrder)
            .addOrderBy('kb.usageCount', sortOrder);
        }
        break;
      case 'rating':
        queryBuilder.orderBy('kb.averageRating', sortOrder);
        break;
      case 'usage':
        queryBuilder.orderBy('kb.usageCount', sortOrder);
        break;
      case 'created_at':
        queryBuilder.orderBy('kb.createdAt', sortOrder);
        break;
      case 'updated_at':
        queryBuilder.orderBy('kb.updatedAt', sortOrder);
        break;
      default:
        queryBuilder
          .orderBy('kb.averageRating', 'DESC')
          .addOrderBy('kb.usageCount', 'DESC');
    }
  }

  private mapToResponseDto(
    entry: KnowledgeBaseEntry,
  ): KnowledgeEntryResponseDto {
    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags,
      keywords: entry.keywords,
      contentType: entry.contentType,
      language: entry.language,
      isActive: entry.isActive,
      usageCount: entry.usageCount,
      averageRating: entry.averageRating,
      createdById: entry.createdById,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
