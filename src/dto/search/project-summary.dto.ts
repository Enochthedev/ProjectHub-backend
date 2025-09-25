import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, ApprovalStatus } from '../../common/enums';

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
    description: 'Project abstract (truncated to 200 characters for summary)',
    example:
      'This project aims to develop an intelligent dashboard that analyzes student performance data using machine learning algorithms. The system will provide insights into learning patterns...',
  })
  @Expose()
  @Transform(
    ({ value }) =>
      value?.substring(0, 200) + (value?.length > 200 ? '...' : ''),
  )
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
    description: 'Technologies used in the project',
    example: ['Python', 'TensorFlow', 'React', 'Node.js'],
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
    description: 'Project approval status',
    example: ApprovalStatus.APPROVED,
    enum: ApprovalStatus,
  })
  @Expose()
  approvalStatus: ApprovalStatus;

  @ApiProperty({
    description: 'Project supervisor information',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      email: 'jane.smith@university.edu',
    },
  })
  @Expose()
  @Transform(({ obj }) => ({
    id: obj.supervisor?.id,
    firstName: obj.supervisor?.firstName,
    lastName: obj.supervisor?.lastName,
    email: obj.supervisor?.email,
  }))
  supervisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Project creation timestamp',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Project approval timestamp',
    example: '2024-01-16T14:20:00Z',
    format: 'date-time',
    nullable: true,
  })
  @Expose()
  approvedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Search relevance score (only present in search results)',
    example: 0.85,
    minimum: 0,
    maximum: 1,
  })
  @Expose()
  relevanceScore?: number;

  @ApiPropertyOptional({
    description:
      'Project title with search terms highlighted (only present in search results)',
    example: 'AI-Powered <mark>Student</mark> Performance Analytics Dashboard',
  })
  @Expose()
  highlightedTitle?: string;

  @ApiPropertyOptional({
    description:
      'Project abstract with search terms highlighted (only present in search results)',
    example:
      'This project aims to develop an intelligent dashboard that analyzes <mark>student</mark> performance data...',
  })
  @Expose()
  highlightedAbstract?: string;
}
