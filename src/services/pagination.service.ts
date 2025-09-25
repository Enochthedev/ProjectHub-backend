import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { Project } from '../entities/project.entity';

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CursorPaginationResult<T> {
  items: T[];
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor?: string;
  previousCursor?: string;
  totalCount?: number;
}

export interface OffsetPaginationResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrevious: boolean;
  totalPages: number;
  currentPage: number;
}

@Injectable()
export class PaginationService {
  private readonly logger = new Logger(PaginationService.name);

  private readonly DEFAULT_LIMIT = 20;
  private readonly MAX_LIMIT = 100;

  /**
   * Apply offset-based pagination to query builder
   */
  applyOffsetPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): SelectQueryBuilder<T> {
    const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const offset = Math.max(options.offset || 0, 0);

    return queryBuilder.limit(limit).offset(offset);
  }

  /**
   * Apply cursor-based pagination to query builder
   */
  applyCursorPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): SelectQueryBuilder<T> {
    const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const sortField = options.sortField || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';

    queryBuilder.limit(limit + 1); // Get one extra to check if there's a next page

    if (options.cursor) {
      const decodedCursor = this.decodeCursor(options.cursor);
      if (decodedCursor) {
        const operator = sortOrder === 'DESC' ? '<' : '>';
        queryBuilder.andWhere(
          `${queryBuilder.alias}.${sortField} ${operator} :cursor`,
          {
            cursor: decodedCursor.value,
          },
        );
      }
    }

    return queryBuilder.orderBy(
      `${queryBuilder.alias}.${sortField}`,
      sortOrder,
    );
  }

  /**
   * Execute offset-based pagination query
   */
  async executeOffsetPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<OffsetPaginationResult<T>> {
    const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const offset = Math.max(options.offset || 0, 0);

    // Clone query builder for count query
    const countQueryBuilder = queryBuilder.clone();

    // Apply pagination to main query
    this.applyOffsetPagination(queryBuilder, options);

    // Execute both queries in parallel
    const [items, total] = await Promise.all([
      queryBuilder.getMany(),
      this.getCountForQuery(countQueryBuilder),
    ]);

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      items,
      total,
      limit,
      offset,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0,
      totalPages,
      currentPage,
    };
  }

  /**
   * Execute cursor-based pagination query
   */
  async executeCursorPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<CursorPaginationResult<T>> {
    const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const sortField = options.sortField || 'createdAt';

    // Apply cursor pagination
    this.applyCursorPagination(queryBuilder, options);

    // Execute query
    const items = await queryBuilder.getMany();

    // Check if there are more items
    const hasNext = items.length > limit;
    if (hasNext) {
      items.pop(); // Remove the extra item
    }

    // Generate cursors
    let nextCursor: string | undefined;
    let previousCursor: string | undefined;

    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      const firstItem = items[0];

      if (hasNext) {
        nextCursor = this.encodeCursor({
          field: sortField,
          value: (lastItem as any)[sortField],
        });
      }

      if (options.cursor) {
        previousCursor = this.encodeCursor({
          field: sortField,
          value: (firstItem as any)[sortField],
        });
      }
    }

    return {
      items,
      hasNext,
      hasPrevious: !!options.cursor,
      nextCursor,
      previousCursor,
    };
  }

  /**
   * Get optimized count for query (avoids counting when not necessary)
   */
  private async getCountForQuery<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
  ): Promise<number> {
    try {
      // Remove any ordering, grouping, and limits for count query
      const countQuery = queryBuilder
        .clone()
        .select('COUNT(*)', 'count')
        .orderBy()
        .limit(undefined)
        .offset(undefined);

      // If query has GROUP BY, we need to count the groups
      const sql = countQuery.getSql();
      if (sql.includes('GROUP BY')) {
        const result = await queryBuilder
          .clone()
          .select('1')
          .orderBy()
          .limit(undefined)
          .offset(undefined)
          .getRawMany();
        return result.length;
      }

      const result = await countQuery.getRawOne();
      return parseInt(result.count, 10);
    } catch (error) {
      this.logger.error('Error getting count for query:', error);
      // Fallback to regular count
      return queryBuilder.getCount();
    }
  }

  /**
   * Encode cursor for pagination
   */
  private encodeCursor(cursor: { field: string; value: any }): string {
    try {
      const encoded = Buffer.from(JSON.stringify(cursor)).toString('base64');
      return encoded;
    } catch (error) {
      this.logger.error('Error encoding cursor:', error);
      return '';
    }
  }

  /**
   * Decode cursor for pagination
   */
  private decodeCursor(cursor: string): { field: string; value: any } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      this.logger.error('Error decoding cursor:', error);
      return null;
    }
  }

  /**
   * Create lazy loading query for project relationships
   */
  createLazyLoadingQuery(
    baseQuery: SelectQueryBuilder<Project>,
    relations: string[] = [],
  ): SelectQueryBuilder<Project> {
    // Only load essential fields by default
    baseQuery.select([
      'project.id',
      'project.title',
      'project.abstract',
      'project.specialization',
      'project.difficultyLevel',
      'project.year',
      'project.tags',
      'project.technologyStack',
      'project.isGroupProject',
      'project.approvalStatus',
      'project.createdAt',
      'project.approvedAt',
    ]);

    // Add supervisor basic info
    baseQuery.addSelect([
      'supervisor.id',
      'supervisor.firstName',
      'supervisor.lastName',
      'supervisor.email',
    ]);

    // Conditionally load additional relations
    relations.forEach((relation) => {
      switch (relation) {
        case 'views':
          baseQuery.leftJoinAndSelect('project.views', 'views');
          break;
        case 'bookmarks':
          baseQuery.leftJoinAndSelect('project.bookmarks', 'bookmarks');
          break;
        case 'supervisor.profile':
          baseQuery.leftJoinAndSelect(
            'supervisor.supervisorProfile',
            'supervisorProfile',
          );
          break;
        default:
          this.logger.warn(`Unknown relation for lazy loading: ${relation}`);
      }
    });

    return baseQuery;
  }

  /**
   * Optimize query for large datasets
   */
  optimizeForLargeDataset<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): SelectQueryBuilder<T> {
    const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);

    // Use cursor pagination for better performance on large datasets
    if (options.cursor || limit > 50) {
      return this.applyCursorPagination(queryBuilder, options);
    }

    // Use offset pagination for smaller datasets
    return this.applyOffsetPagination(queryBuilder, options);
  }

  /**
   * Create streaming pagination for very large datasets
   */
  async *streamPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    batchSize: number = 1000,
  ): AsyncGenerator<T[], void, unknown> {
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await queryBuilder
        .clone()
        .limit(batchSize)
        .offset(offset)
        .getMany();

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch;
        offset += batchSize;
        hasMore = batch.length === batchSize;
      }
    }
  }

  /**
   * Get pagination metadata without executing the main query
   */
  async getPaginationMetadata<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
  ): Promise<{
    total: number;
    totalPages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }> {
    const limit = Math.min(options.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const offset = Math.max(options.offset || 0, 0);

    const total = await this.getCountForQuery(queryBuilder);
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return {
      total,
      totalPages,
      currentPage,
      hasNext: offset + limit < total,
      hasPrevious: offset > 0,
    };
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationOptions(options: PaginationOptions): PaginationOptions {
    const limit =
      options.limit !== undefined ? options.limit : this.DEFAULT_LIMIT;
    return {
      ...options,
      limit: Math.min(Math.max(limit, 1), this.MAX_LIMIT),
      offset: Math.max(options.offset || 0, 0),
    };
  }

  /**
   * Create efficient pagination for search results
   */
  createSearchPagination<T extends ObjectLiteral>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions,
    useEstimatedCount: boolean = false,
  ): SelectQueryBuilder<T> {
    const validatedOptions = this.validatePaginationOptions(options);

    // For search queries, prefer cursor pagination for consistency
    if (validatedOptions.cursor) {
      return this.applyCursorPagination(queryBuilder, validatedOptions);
    }

    // Use offset pagination with optimizations
    return this.applyOffsetPagination(queryBuilder, validatedOptions);
  }
}
