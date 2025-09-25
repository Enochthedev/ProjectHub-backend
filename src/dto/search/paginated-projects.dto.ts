import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectSummaryDto } from './project-summary.dto';
import type { AlternativeSearchOptions } from '../../services/suggestion.service';

export class PaginatedProjectsDto {
  @ApiProperty({
    description: 'Array of project summaries for the current page',
    type: [ProjectSummaryDto],
  })
  @Expose()
  projects: ProjectSummaryDto[];

  @ApiProperty({
    description: 'Total number of projects matching the search criteria',
    example: 150,
  })
  @Expose()
  total: number;

  @ApiProperty({
    description: 'Number of projects per page',
    example: 20,
  })
  @Expose()
  limit: number;

  @ApiProperty({
    description: 'Number of projects skipped',
    example: 0,
  })
  @Expose()
  offset: number;

  @ApiProperty({
    description: 'Whether there are more projects available',
    example: true,
  })
  @Expose()
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there are previous projects available',
    example: false,
  })
  @Expose()
  hasPrevious: boolean;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  @Expose()
  totalPages: number;

  @ApiProperty({
    description: 'Current page number (1-based)',
    example: 1,
  })
  @Expose()
  currentPage: number;

  @ApiPropertyOptional({
    description: 'Alternative search suggestions when no results found',
    type: 'object',
    properties: {
      alternativeQueries: {
        type: 'array',
        items: { type: 'string' },
        description: 'Suggested alternative search queries',
      },
      relatedTags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Related tags that might yield results',
      },
      popularProjects: {
        type: 'array',
        items: { $ref: '#/components/schemas/ProjectSummaryDto' },
        description: 'Popular projects as fallback suggestions',
      },
    },
  })
  @Expose()
  suggestions?: AlternativeSearchOptions;

  constructor(
    projects: ProjectSummaryDto[],
    total: number,
    limit: number,
    offset: number,
    suggestions?: AlternativeSearchOptions,
  ) {
    this.projects = projects;
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.hasNext = offset + limit < total;
    this.hasPrevious = offset > 0;
    this.totalPages = Math.ceil(total / limit);
    this.currentPage = Math.floor(offset / limit) + 1;
    this.suggestions = suggestions;
  }
}
