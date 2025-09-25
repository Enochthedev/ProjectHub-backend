import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../entities/project.entity';
import { FilterCriteria } from './filter.service';
import { SearchProjectsDto } from '../dto/search/search-projects.dto';
import { ProjectSummaryDto } from '../dto/search/project-summary.dto';
import { ApprovalStatus, DifficultyLevel } from '../common/enums';
import { plainToClass } from 'class-transformer';

export interface SearchSuggestion {
  type: 'query' | 'filter' | 'specialization' | 'tag';
  value: string;
  label: string;
  description?: string;
  count?: number;
}

export interface AlternativeSearchOptions {
  suggestions: SearchSuggestion[];
  relatedProjects: ProjectSummaryDto[];
  popularFilters: FilterCriteria[];
}

@Injectable()
export class SuggestionService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Clear all filters and return empty criteria
   */
  clearAllFilters(): FilterCriteria {
    return {};
  }

  /**
   * Clear specific filter types
   */
  clearSpecificFilters(
    currentFilters: FilterCriteria,
    filterTypes: Array<keyof FilterCriteria>,
  ): FilterCriteria {
    const clearedFilters = { ...currentFilters };

    filterTypes.forEach((filterType) => {
      delete clearedFilters[filterType];
    });

    return clearedFilters;
  }

  /**
   * Get alternative search suggestions when no results are found
   */
  async getAlternativeSearchSuggestions(
    searchDto: SearchProjectsDto,
  ): Promise<AlternativeSearchOptions> {
    const suggestions: SearchSuggestion[] = [];
    const relatedProjects: ProjectSummaryDto[] = [];
    const popularFilters: FilterCriteria[] = [];

    // Generate query suggestions if search query exists
    if (searchDto.query) {
      const querySuggestions = await this.generateQuerySuggestions(
        searchDto.query,
      );
      suggestions.push(...querySuggestions);
    }

    // Generate filter suggestions
    const filterSuggestions = await this.generateFilterSuggestions(searchDto);
    suggestions.push(...filterSuggestions);

    // Get related projects based on current filters
    const related = await this.getRelatedProjects(searchDto);
    relatedProjects.push(...related);

    // Get popular filter combinations
    const popular = await this.getPopularFilterCombinations();
    popularFilters.push(...popular);

    return {
      suggestions,
      relatedProjects,
      popularFilters,
    };
  }

  /**
   * Generate query-based suggestions using fuzzy matching
   */
  private async generateQuerySuggestions(
    query: string,
  ): Promise<SearchSuggestion[]> {
    const sanitizedQuery = this.sanitizeInput(query);
    const suggestions: SearchSuggestion[] = [];

    if (sanitizedQuery.length < 2) {
      return suggestions;
    }

    // Get similar project titles
    const titleSuggestions = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.title')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .andWhere('project.title ILIKE :query', { query: `%${sanitizedQuery}%` })
      .groupBy('project.title')
      .limit(5)
      .getRawMany();

    titleSuggestions.forEach((result) => {
      suggestions.push({
        type: 'query',
        value: result.title,
        label: `Search for "${result.title}"`,
        description: 'Similar project title',
      });
    });

    // Get similar tags
    const tagSuggestions = await this.projectRepository
      .createQueryBuilder('project')
      .select('DISTINCT unnest(project.tags)', 'tag')
      .addSelect('COUNT(*)', 'count')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .andWhere(
        'EXISTS (SELECT 1 FROM unnest(project.tags) AS tag WHERE tag ILIKE :query)',
        {
          query: `%${sanitizedQuery}%`,
        },
      )
      .groupBy('tag')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    tagSuggestions.forEach((result) => {
      if (result.tag) {
        suggestions.push({
          type: 'tag',
          value: result.tag,
          label: `Filter by tag: ${result.tag}`,
          description: `${result.count} projects`,
          count: parseInt(result.count),
        });
      }
    });

    return suggestions;
  }

  /**
   * Generate filter-based suggestions
   */
  private async generateFilterSuggestions(
    searchDto: SearchProjectsDto,
  ): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];

    // Suggest removing restrictive filters if they exist
    if (searchDto.specializations?.length) {
      suggestions.push({
        type: 'filter',
        value: 'clear_specializations',
        label: 'Clear specialization filters',
        description: 'Show projects from all specializations',
      });
    }

    if (searchDto.difficultyLevels?.length) {
      suggestions.push({
        type: 'filter',
        value: 'clear_difficulty',
        label: 'Clear difficulty filters',
        description: 'Show projects of all difficulty levels',
      });
    }

    if (searchDto.yearFrom || searchDto.yearTo) {
      suggestions.push({
        type: 'filter',
        value: 'clear_year_range',
        label: 'Clear year range',
        description: 'Show projects from all years',
      });
    }

    // Suggest popular specializations if none are selected
    if (!searchDto.specializations?.length) {
      const popularSpecs = await this.getPopularSpecializations();
      popularSpecs.forEach((spec) => {
        suggestions.push({
          type: 'specialization',
          value: spec.specialization,
          label: `Filter by ${spec.specialization}`,
          description: `${spec.count} projects`,
          count: spec.count,
        });
      });
    }

    return suggestions;
  }

  /**
   * Get related projects based on current filters (with relaxed criteria)
   */
  private async getRelatedProjects(
    searchDto: SearchProjectsDto,
  ): Promise<ProjectSummaryDto[]> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      });

    // Apply relaxed filters (use OR logic instead of AND for some filters)
    let hasFilters = false;

    if (searchDto.specializations?.length) {
      queryBuilder.andWhere('project.specialization IN (:...specializations)', {
        specializations: searchDto.specializations,
      });
      hasFilters = true;
    }

    if (searchDto.tags?.length) {
      // Use overlap operator for more flexible matching
      queryBuilder.andWhere('project.tags && :tags', {
        tags: searchDto.tags,
      });
      hasFilters = true;
    }

    // If no specific filters, get popular projects
    if (!hasFilters) {
      queryBuilder
        .leftJoin('project.views', 'views')
        .leftJoin('project.bookmarks', 'bookmarks')
        .addSelect('COUNT(DISTINCT views.id)', 'view_count')
        .addSelect('COUNT(DISTINCT bookmarks.id)', 'bookmark_count')
        .groupBy('project.id')
        .addGroupBy('supervisor.id')
        .orderBy(
          '(COUNT(DISTINCT views.id) + COUNT(DISTINCT bookmarks.id) * 2)',
          'DESC',
        );
    } else {
      queryBuilder.orderBy('project.approvedAt', 'DESC');
    }

    const projects = await queryBuilder.limit(5).getMany();

    return projects.map((project) => this.transformToSummaryDto(project));
  }

  /**
   * Get popular filter combinations used by other users
   */
  private async getPopularFilterCombinations(): Promise<FilterCriteria[]> {
    // This would typically be based on user search analytics
    // For now, return some common filter combinations
    return [
      {
        specializations: ['Artificial Intelligence & Machine Learning'],
        difficultyLevels: [
          DifficultyLevel.INTERMEDIATE,
          DifficultyLevel.ADVANCED,
        ],
      },
      {
        specializations: ['Web Development & Full Stack'],
        difficultyLevels: [
          DifficultyLevel.BEGINNER,
          DifficultyLevel.INTERMEDIATE,
        ],
      },
      {
        tags: ['python', 'machine-learning'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
      },
      {
        specializations: ['Mobile Application Development'],
        isGroupProject: false,
      },
    ];
  }

  /**
   * Get popular specializations with project counts
   */
  private async getPopularSpecializations(): Promise<
    Array<{ specialization: string; count: number }>
  > {
    const results = await this.projectRepository
      .createQueryBuilder('project')
      .select('project.specialization', 'specialization')
      .addSelect('COUNT(*)', 'count')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .groupBy('project.specialization')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return results.map((result) => ({
      specialization: result.specialization,
      count: parseInt(result.count),
    }));
  }

  /**
   * Get suggested tags based on partial input
   */
  async getSuggestedTags(
    partial: string,
    limit: number = 10,
  ): Promise<SearchSuggestion[]> {
    const sanitizedPartial = this.sanitizeInput(partial);

    if (!sanitizedPartial || sanitizedPartial.length < 2) {
      return [];
    }

    const results = await this.projectRepository
      .createQueryBuilder('project')
      .select('DISTINCT unnest(project.tags)', 'tag')
      .addSelect('COUNT(*)', 'count')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .andWhere(
        'EXISTS (SELECT 1 FROM unnest(project.tags) AS tag WHERE tag ILIKE :partial)',
        {
          partial: `%${sanitizedPartial}%`,
        },
      )
      .groupBy('tag')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return results
      .filter((result) => result.tag)
      .map((result) => ({
        type: 'tag' as const,
        value: result.tag,
        label: result.tag,
        description: `${result.count} projects`,
        count: parseInt(result.count),
      }));
  }

  /**
   * Get suggested specializations
   */
  async getSuggestedSpecializations(): Promise<SearchSuggestion[]> {
    const results = await this.getPopularSpecializations();

    return results.map((result) => ({
      type: 'specialization' as const,
      value: result.specialization,
      label: result.specialization,
      description: `${result.count} projects`,
      count: result.count,
    }));
  }

  /**
   * Check if search criteria would return results
   */
  async hasResults(searchDto: SearchProjectsDto): Promise<boolean> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      });

    // Apply all filters
    if (searchDto.query) {
      queryBuilder.andWhere(
        "project.searchVector @@ plainto_tsquery('english', :query)",
        { query: this.sanitizeInput(searchDto.query) },
      );
    }

    if (searchDto.specializations?.length) {
      queryBuilder.andWhere('project.specialization IN (:...specializations)', {
        specializations: searchDto.specializations,
      });
    }

    if (searchDto.difficultyLevels?.length) {
      queryBuilder.andWhere(
        'project.difficultyLevel IN (:...difficultyLevels)',
        {
          difficultyLevels: searchDto.difficultyLevels,
        },
      );
    }

    if (searchDto.yearFrom) {
      queryBuilder.andWhere('project.year >= :yearFrom', {
        yearFrom: searchDto.yearFrom,
      });
    }

    if (searchDto.yearTo) {
      queryBuilder.andWhere('project.year <= :yearTo', {
        yearTo: searchDto.yearTo,
      });
    }

    if (searchDto.tags?.length) {
      queryBuilder.andWhere('project.tags @> :tags', { tags: searchDto.tags });
    }

    if (typeof searchDto.isGroupProject === 'boolean') {
      queryBuilder.andWhere('project.isGroupProject = :isGroupProject', {
        isGroupProject: searchDto.isGroupProject,
      });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * Transform project entity to summary DTO
   */
  private transformToSummaryDto(project: Project): ProjectSummaryDto {
    return plainToClass(ProjectSummaryDto, project, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Sanitize input to prevent injection attacks
   */
  private sanitizeInput(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>'"\\;]/g, '') // Remove dangerous characters
      .substring(0, 200); // Limit length
  }
}
