import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Project } from '../entities/project.entity';
import { SearchProjectsDto } from '../dto/search/search-projects.dto';
import { DifficultyLevel } from '../common/enums/difficulty-level.enum';

export interface FilterCriteria {
  specializations?: string[];
  difficultyLevels?: DifficultyLevel[];
  yearFrom?: number;
  yearTo?: number;
  tags?: string[];
  isGroupProject?: boolean;
  technologyStack?: string[];
}

@Injectable()
export class FilterService {
  /**
   * Apply multiple filters to a query builder with AND logic
   */
  applyFilters(
    queryBuilder: SelectQueryBuilder<Project>,
    criteria: FilterCriteria,
  ): SelectQueryBuilder<Project> {
    // Specialization filter
    if (criteria.specializations?.length) {
      this.applySpecializationFilter(queryBuilder, criteria.specializations);
    }

    // Difficulty level filter
    if (criteria.difficultyLevels?.length) {
      this.applyDifficultyFilter(queryBuilder, criteria.difficultyLevels);
    }

    // Year range filters
    if (criteria.yearFrom !== undefined) {
      this.applyYearFromFilter(queryBuilder, criteria.yearFrom);
    }

    if (criteria.yearTo !== undefined) {
      this.applyYearToFilter(queryBuilder, criteria.yearTo);
    }

    // Tags filter (array intersection)
    if (criteria.tags?.length) {
      this.applyTagsFilter(queryBuilder, criteria.tags);
    }

    // Technology stack filter (array intersection)
    if (criteria.technologyStack?.length) {
      this.applyTechnologyStackFilter(queryBuilder, criteria.technologyStack);
    }

    // Group project filter
    if (typeof criteria.isGroupProject === 'boolean') {
      this.applyGroupProjectFilter(queryBuilder, criteria.isGroupProject);
    }

    return queryBuilder;
  }

  /**
   * Apply filters from SearchProjectsDto
   */
  applySearchFilters(
    queryBuilder: SelectQueryBuilder<Project>,
    searchDto: SearchProjectsDto,
  ): SelectQueryBuilder<Project> {
    const criteria: FilterCriteria = {
      specializations: searchDto.specializations,
      difficultyLevels: searchDto.difficultyLevels,
      yearFrom: searchDto.yearFrom,
      yearTo: searchDto.yearTo,
      tags: searchDto.tags,
      isGroupProject: searchDto.isGroupProject,
    };

    return this.applyFilters(queryBuilder, criteria);
  }

  /**
   * Filter by specializations (exact match)
   */
  private applySpecializationFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    specializations: string[],
  ): void {
    const sanitizedSpecs = specializations
      .map((spec) => this.sanitizeInput(spec))
      .filter(Boolean);

    if (sanitizedSpecs.length) {
      queryBuilder.andWhere('project.specialization IN (:...specializations)', {
        specializations: sanitizedSpecs,
      });
    }
  }

  /**
   * Filter by difficulty levels
   */
  private applyDifficultyFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    difficultyLevels: DifficultyLevel[],
  ): void {
    queryBuilder.andWhere('project.difficultyLevel IN (:...difficultyLevels)', {
      difficultyLevels,
    });
  }

  /**
   * Filter by minimum year
   */
  private applyYearFromFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    yearFrom: number,
  ): void {
    queryBuilder.andWhere('project.year >= :yearFrom', { yearFrom });
  }

  /**
   * Filter by maximum year
   */
  private applyYearToFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    yearTo: number,
  ): void {
    queryBuilder.andWhere('project.year <= :yearTo', { yearTo });
  }

  /**
   * Filter by tags using array intersection (project must have ALL specified tags)
   */
  private applyTagsFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    tags: string[],
  ): void {
    const sanitizedTags = tags
      .map((tag) => this.sanitizeInput(tag))
      .filter(Boolean);

    if (sanitizedTags.length) {
      // Use array contains operator for PostgreSQL
      queryBuilder.andWhere('project.tags @> :tags', {
        tags: sanitizedTags,
      });
    }
  }

  /**
   * Filter by technology stack using array intersection
   */
  private applyTechnologyStackFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    technologyStack: string[],
  ): void {
    const sanitizedTech = technologyStack
      .map((tech) => this.sanitizeInput(tech))
      .filter(Boolean);

    if (sanitizedTech.length) {
      // Use array overlap operator for PostgreSQL (project has ANY of the specified technologies)
      queryBuilder.andWhere('project.technologyStack && :technologyStack', {
        technologyStack: sanitizedTech,
      });
    }
  }

  /**
   * Filter by group project status
   */
  private applyGroupProjectFilter(
    queryBuilder: SelectQueryBuilder<Project>,
    isGroupProject: boolean,
  ): void {
    queryBuilder.andWhere('project.isGroupProject = :isGroupProject', {
      isGroupProject,
    });
  }

  /**
   * Get count of projects matching the filters
   */
  async getFilteredCount(
    queryBuilder: SelectQueryBuilder<Project>,
    criteria: FilterCriteria,
  ): Promise<number> {
    const countQuery = queryBuilder.clone();
    this.applyFilters(countQuery, criteria);
    return countQuery.getCount();
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(criteria: FilterCriteria): boolean {
    return !!(
      criteria.specializations?.length ||
      criteria.difficultyLevels?.length ||
      criteria.yearFrom !== undefined ||
      criteria.yearTo !== undefined ||
      criteria.tags?.length ||
      criteria.technologyStack?.length ||
      typeof criteria.isGroupProject === 'boolean'
    );
  }

  /**
   * Clear all filters (return empty criteria)
   */
  clearFilters(): FilterCriteria {
    return {};
  }

  /**
   * Combine multiple filter criteria with AND logic
   */
  combineFilters(...criteriaList: FilterCriteria[]): FilterCriteria {
    const combined: FilterCriteria = {};

    criteriaList.forEach((criteria) => {
      // Combine arrays
      if (criteria.specializations?.length) {
        combined.specializations = [
          ...(combined.specializations || []),
          ...criteria.specializations,
        ];
      }

      if (criteria.difficultyLevels?.length) {
        combined.difficultyLevels = [
          ...(combined.difficultyLevels || []),
          ...criteria.difficultyLevels,
        ];
      }

      if (criteria.tags?.length) {
        combined.tags = [...(combined.tags || []), ...criteria.tags];
      }

      if (criteria.technologyStack?.length) {
        combined.technologyStack = [
          ...(combined.technologyStack || []),
          ...criteria.technologyStack,
        ];
      }

      // For numeric and boolean values, use the most restrictive
      if (criteria.yearFrom !== undefined) {
        combined.yearFrom = Math.max(
          combined.yearFrom || criteria.yearFrom,
          criteria.yearFrom,
        );
      }

      if (criteria.yearTo !== undefined) {
        combined.yearTo = Math.min(
          combined.yearTo || criteria.yearTo,
          criteria.yearTo,
        );
      }

      if (typeof criteria.isGroupProject === 'boolean') {
        combined.isGroupProject = criteria.isGroupProject;
      }
    });

    return combined;
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
