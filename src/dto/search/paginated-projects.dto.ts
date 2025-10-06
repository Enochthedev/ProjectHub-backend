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
    description: 'Pagination information',
    type: 'object',
    properties: {
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 20 },
      total: { type: 'number', example: 150 },
      totalPages: { type: 'number', example: 8 },
    },
  })
  @Expose()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

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
    this.pagination = {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
    this.suggestions = suggestions;
  }
}
