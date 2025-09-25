import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, ApprovalStatus } from '../../common/enums';

export class ProjectDetailDto {
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
    description: 'Complete project abstract with detailed description',
    example:
      'This project aims to develop an intelligent dashboard that analyzes student performance data using machine learning algorithms. The system will provide insights into learning patterns, identify at-risk students, and suggest personalized interventions. The dashboard will feature real-time analytics, predictive modeling, and interactive visualizations to help educators make data-driven decisions.',
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
    example: [
      'machine-learning',
      'dashboard',
      'analytics',
      'education',
      'python',
    ],
    type: [String],
  })
  @Expose()
  tags: string[];

  @ApiProperty({
    description: 'Complete technology stack used in the project',
    example: [
      'Python',
      'TensorFlow',
      'React',
      'Node.js',
      'PostgreSQL',
      'Docker',
    ],
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

  @ApiPropertyOptional({
    description: 'GitHub repository URL',
    example: 'https://github.com/username/student-analytics-dashboard',
    format: 'uri',
    nullable: true,
  })
  @Expose()
  githubUrl: string | null;

  @ApiPropertyOptional({
    description: 'Live demo URL',
    example: 'https://student-analytics.example.com',
    format: 'uri',
    nullable: true,
  })
  @Expose()
  demoUrl: string | null;

  @ApiPropertyOptional({
    description: 'Additional project notes and requirements',
    example:
      'This project requires access to student data and should comply with GDPR regulations. Recommended for students with prior experience in data science.',
    nullable: true,
  })
  @Expose()
  notes: string | null;

  @ApiProperty({
    description: 'Detailed supervisor information',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      email: { type: 'string', format: 'email' },
      specializations: { type: 'array', items: { type: 'string' } },
    },
    example: {
      id: '456e7890-e89b-12d3-a456-426614174001',
      firstName: 'Dr. Jane',
      lastName: 'Smith',
      email: 'jane.smith@university.edu',
      specializations: [
        'Machine Learning',
        'Data Science',
        'Educational Technology',
      ],
    },
  })
  @Expose()
  @Transform(({ obj }) => {
    const supervisorName = obj.supervisor?.supervisorProfile?.name || obj.supervisor?.email || 'Unknown';
    const nameParts = supervisorName.split(' ');
    return {
      id: obj.supervisor?.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: obj.supervisor?.email,
      specializations: obj.supervisor?.supervisorProfile?.specializations || [],
    };
  })
  supervisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    specializations: string[];
  };

  @ApiProperty({
    description: 'Project creation timestamp',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-16T09:15:00Z',
    format: 'date-time',
  })
  @Expose()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Project approval timestamp',
    example: '2024-01-16T14:20:00Z',
    format: 'date-time',
    nullable: true,
  })
  @Expose()
  approvedAt: Date | null;

  @ApiPropertyOptional({
    description: 'ID of the admin who approved the project',
    example: '789e0123-e89b-12d3-a456-426614174002',
    format: 'uuid',
    nullable: true,
  })
  @Expose()
  approvedBy: string | null;

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
}
