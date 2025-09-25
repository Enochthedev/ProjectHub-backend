import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import { Project } from '../entities/project.entity';
import { ProjectSortBy, SortOrder } from '../common/enums/project-sort-by.enum';

export interface SortCriteria {
  sortBy: ProjectSortBy;
  sortOrder: SortOrder;
  hasSearchQuery?: boolean;
}

@Injectable()
export class SortingService {
  /**
   * Apply sorting to a query builder
   */
  applySorting(
    queryBuilder: SelectQueryBuilder<Project>,
    criteria: SortCriteria,
  ): SelectQueryBuilder<Project> {
    const { sortBy, sortOrder, hasSearchQuery } = criteria;
    const orderDirection = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    switch (sortBy) {
      case ProjectSortBy.RELEVANCE:
        this.applySortByRelevance(queryBuilder, orderDirection, hasSearchQuery);
        break;

      case ProjectSortBy.DATE:
        this.applySortByDate(queryBuilder, orderDirection);
        break;

      case ProjectSortBy.TITLE:
        this.applySortByTitle(queryBuilder, orderDirection);
        break;

      case ProjectSortBy.POPULARITY:
        this.applySortByPopularity(queryBuilder, orderDirection);
        break;

      default:
        // Default to date sorting
        this.applySortByDate(queryBuilder, orderDirection);
    }

    // Add secondary sort by ID for consistent pagination
    queryBuilder.addOrderBy('project.id', 'ASC');

    return queryBuilder;
  }

  /**
   * Sort by relevance (only meaningful with search queries)
   */
  private applySortByRelevance(
    queryBuilder: SelectQueryBuilder<Project>,
    orderDirection: 'ASC' | 'DESC',
    hasSearchQuery?: boolean,
  ): void {
    if (hasSearchQuery) {
      // Sort by relevance score when search query is present
      queryBuilder.orderBy('relevance_score', orderDirection);
      // Add tie-breaker by date
      queryBuilder.addOrderBy('project.approvedAt', 'DESC');
    } else {
      // Default to date sorting when no search query
      queryBuilder.orderBy('project.approvedAt', 'DESC');
    }
  }

  /**
   * Sort by date (approved date)
   */
  private applySortByDate(
    queryBuilder: SelectQueryBuilder<Project>,
    orderDirection: 'ASC' | 'DESC',
  ): void {
    queryBuilder.orderBy('project.approvedAt', orderDirection);
    // Add tie-breaker by creation date
    queryBuilder.addOrderBy('project.createdAt', orderDirection);
  }

  /**
   * Sort by title (alphabetical)
   */
  private applySortByTitle(
    queryBuilder: SelectQueryBuilder<Project>,
    orderDirection: 'ASC' | 'DESC',
  ): void {
    queryBuilder.orderBy('LOWER(project.title)', orderDirection);
    // Add tie-breaker by date
    queryBuilder.addOrderBy('project.approvedAt', 'DESC');
  }

  /**
   * Sort by popularity (views + bookmarks with weighted scoring)
   */
  private applySortByPopularity(
    queryBuilder: SelectQueryBuilder<Project>,
    orderDirection: 'ASC' | 'DESC',
  ): void {
    // Join with views and bookmarks for popularity calculation
    queryBuilder
      .leftJoin('project.views', 'popularity_views')
      .leftJoin('project.bookmarks', 'popularity_bookmarks')
      .addSelect('COUNT(DISTINCT popularity_views.id)', 'view_count')
      .addSelect('COUNT(DISTINCT popularity_bookmarks.id)', 'bookmark_count')
      .addSelect(
        '(COUNT(DISTINCT popularity_views.id) + COUNT(DISTINCT popularity_bookmarks.id) * 3)',
        'popularity_score',
      )
      .groupBy('project.id')
      .addGroupBy('supervisor.id') // Include supervisor in GROUP BY if it's selected
      .orderBy('popularity_score', orderDirection);

    // Add tie-breaker by date for projects with same popularity
    queryBuilder.addOrderBy('project.approvedAt', 'DESC');
  }

  /**
   * Apply composite sorting with multiple criteria
   */
  applyCompositeSorting(
    queryBuilder: SelectQueryBuilder<Project>,
    primaryCriteria: SortCriteria,
    secondaryCriteria?: SortCriteria,
  ): SelectQueryBuilder<Project> {
    // Apply primary sorting
    this.applySorting(queryBuilder, primaryCriteria);

    // Apply secondary sorting if provided and different from primary
    if (
      secondaryCriteria &&
      secondaryCriteria.sortBy !== primaryCriteria.sortBy
    ) {
      const secondaryDirection =
        secondaryCriteria.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

      switch (secondaryCriteria.sortBy) {
        case ProjectSortBy.DATE:
          queryBuilder.addOrderBy('project.approvedAt', secondaryDirection);
          break;
        case ProjectSortBy.TITLE:
          queryBuilder.addOrderBy('LOWER(project.title)', secondaryDirection);
          break;
        // Note: Popularity and relevance are complex and not suitable as secondary sorts
      }
    }

    return queryBuilder;
  }

  /**
   * Get sorting options for frontend
   */
  getSortingOptions(): Array<{
    value: ProjectSortBy;
    label: string;
    description: string;
  }> {
    return [
      {
        value: ProjectSortBy.RELEVANCE,
        label: 'Relevance',
        description: 'Most relevant to search query (default for searches)',
      },
      {
        value: ProjectSortBy.DATE,
        label: 'Date',
        description: 'Most recently approved projects first',
      },
      {
        value: ProjectSortBy.TITLE,
        label: 'Title',
        description: 'Alphabetical order by project title',
      },
      {
        value: ProjectSortBy.POPULARITY,
        label: 'Popularity',
        description: 'Most viewed and bookmarked projects first',
      },
    ];
  }

  /**
   * Get default sort criteria based on context
   */
  getDefaultSortCriteria(hasSearchQuery: boolean = false): SortCriteria {
    return {
      sortBy: hasSearchQuery ? ProjectSortBy.RELEVANCE : ProjectSortBy.DATE,
      sortOrder: SortOrder.DESC,
      hasSearchQuery,
    };
  }

  /**
   * Validate sort criteria
   */
  validateSortCriteria(criteria: Partial<SortCriteria>): SortCriteria {
    const validSortBy = Object.values(ProjectSortBy).includes(
      criteria.sortBy as ProjectSortBy,
    )
      ? (criteria.sortBy as ProjectSortBy)
      : ProjectSortBy.DATE;

    const validSortOrder = Object.values(SortOrder).includes(
      criteria.sortOrder as SortOrder,
    )
      ? (criteria.sortOrder as SortOrder)
      : SortOrder.DESC;

    return {
      sortBy: validSortBy,
      sortOrder: validSortOrder,
      hasSearchQuery: criteria.hasSearchQuery || false,
    };
  }

  /**
   * Create sort criteria from search DTO
   */
  createSortCriteriaFromSearch(
    sortBy?: ProjectSortBy,
    sortOrder?: SortOrder,
    hasSearchQuery: boolean = false,
  ): SortCriteria {
    return this.validateSortCriteria({
      sortBy:
        sortBy ||
        (hasSearchQuery ? ProjectSortBy.RELEVANCE : ProjectSortBy.DATE),
      sortOrder: sortOrder || SortOrder.DESC,
      hasSearchQuery,
    });
  }
}
