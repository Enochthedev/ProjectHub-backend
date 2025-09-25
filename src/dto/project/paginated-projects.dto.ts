import { ApiProperty } from '@nestjs/swagger';
import { ProjectSummaryDto } from './project-summary.dto';

export class PaginatedProjectsDto {
  @ApiProperty({
    description: 'Array of project summaries',
    type: [ProjectSummaryDto],
  })
  projects: ProjectSummaryDto[];

  @ApiProperty({
    description: 'Total number of projects matching the criteria',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of results per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPrevious: boolean;
}
