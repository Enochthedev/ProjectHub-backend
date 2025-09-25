import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectSummaryDto } from '../search/project-summary.dto';

export class BookmarkResponseDto {
  @ApiProperty({
    description: 'Unique bookmark identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'ID of the bookmarked project',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  projectId: string;

  @ApiProperty({
    description: 'Bookmark creation timestamp',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Project details (included when requested)',
    type: ProjectSummaryDto,
  })
  project?: ProjectSummaryDto;
}

export class PaginatedBookmarksDto {
  @ApiProperty({
    description: 'Array of user bookmarks',
    type: [BookmarkResponseDto],
  })
  bookmarks: BookmarkResponseDto[];

  @ApiProperty({
    description: 'Total number of bookmarks',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of bookmarks per page',
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number;
}
