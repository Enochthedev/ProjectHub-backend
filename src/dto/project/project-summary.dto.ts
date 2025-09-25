import { Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel } from '../../common/enums';

export class ProjectSummaryDto {
  @ApiProperty({
    description: 'Unique project identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @Expose()
  id: string;

  @ApiProperty({
    description: 'Project title',
    example: 'AI-Powered Student Performance Analytics Dashboard',
  })
  @Expose()
  title: string;

  @ApiProperty({
    description: 'Project abstract (truncated for summary)',
    example:
      'This project aims to develop an intelligent dashboard that analyzes student performance data...',
  })
  @Expose()
  abstract: string;

  @ApiProperty({
    description: 'Project specialization area',
    example: 'Artificial Intelligence & Machine Learning',
  })
  @Expose()
  specialization: string;

  @ApiProperty({
    description: 'Project difficulty level',
    example: DifficultyLevel.INTERMEDIATE,
    enum: DifficultyLevel,
  })
  @Expose()
  difficultyLevel: DifficultyLevel;

  @ApiProperty({
    description: 'Academic year of the project',
    example: 2024,
  })
  @Expose()
  year: number;

  @ApiProperty({
    description: 'Project tags for categorization',
    example: ['machine-learning', 'dashboard', 'analytics'],
    type: [String],
  })
  @Expose()
  tags: string[];

  @ApiProperty({
    description: 'Technology stack used in the project',
    example: ['Python', 'TensorFlow', 'React'],
    type: [String],
  })
  @Expose()
  technologyStack: string[];

  @ApiProperty({
    description: 'Whether this is a group project',
    example: false,
  })
  @Expose()
  isGroupProject: boolean;

  @ApiProperty({
    description: 'Supervisor name',
    example: 'Dr. Jane Smith',
  })
  @Expose()
  supervisorName: string;

  @ApiPropertyOptional({
    description: 'Total number of views for this project',
    example: 45,
    minimum: 0,
  })
  @Expose()
  viewCount?: number;

  @ApiPropertyOptional({
    description: 'Total number of bookmarks for this project',
    example: 12,
    minimum: 0,
  })
  @Expose()
  bookmarkCount?: number;

  @ApiProperty({
    description: 'Project creation timestamp',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Expose()
  createdAt: Date;
}
