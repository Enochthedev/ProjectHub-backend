import {
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TimeLogType {
  RESEARCH = 'research',
  DEVELOPMENT = 'development',
  WRITING = 'writing',
  TESTING = 'testing',
  MEETING = 'meeting',
  REVIEW = 'review',
  OTHER = 'other',
}

export class CreateMilestoneTimeLogDto {
  @ApiProperty({
    description: 'Date when the work was performed',
    example: '2024-03-15',
    type: String,
    format: 'date',
  })
  @IsDateString({}, { message: 'Work date must be a valid date string' })
  workDate: string;

  @ApiProperty({
    description: 'Hours spent on this work session',
    example: 3.5,
    minimum: 0.25,
    maximum: 12,
    type: Number,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Hours must be a number' })
  @Min(0.25, { message: 'Hours must be at least 0.25 (15 minutes)' })
  @Max(12, { message: 'Hours must not exceed 12 per session' })
  hours: number;

  @ApiProperty({
    description: 'Type of work performed',
    example: TimeLogType.RESEARCH,
    enum: TimeLogType,
  })
  @IsEnum(TimeLogType, {
    message: `Work type must be one of: ${Object.values(TimeLogType).join(', ')}`,
  })
  workType: TimeLogType;

  @ApiProperty({
    description: 'Description of work performed',
    example:
      'Conducted literature review on machine learning algorithms for educational data mining',
    minLength: 10,
    maxLength: 500,
    type: String,
  })
  @IsString({ message: 'Description must be a string' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description: string;

  @ApiPropertyOptional({
    description: 'Specific achievements or deliverables from this session',
    example:
      'Identified 5 key papers, created summary document with main findings',
    minLength: 10,
    maxLength: 300,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Achievements must be a string' })
  @MinLength(10, {
    message: 'Achievements must be at least 10 characters long',
  })
  @MaxLength(300, { message: 'Achievements must not exceed 300 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  achievements?: string;

  @ApiPropertyOptional({
    description: 'Challenges or issues encountered during this session',
    example:
      'Some papers were behind paywalls, had to find alternative sources',
    minLength: 10,
    maxLength: 300,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Challenges must be a string' })
  @MinLength(10, { message: 'Challenges must be at least 10 characters long' })
  @MaxLength(300, { message: 'Challenges must not exceed 300 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  challenges?: string;
}

export class MilestoneTimeLogResponseDto {
  @ApiProperty({
    description: 'Time log entry ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Milestone ID',
    example: 'uuid-string',
  })
  milestoneId: string;

  @ApiProperty({
    description: 'Date when the work was performed',
    example: '2024-03-15',
  })
  workDate: string;

  @ApiProperty({
    description: 'Hours spent on this work session',
    example: 3.5,
  })
  hours: number;

  @ApiProperty({
    description: 'Type of work performed',
    example: TimeLogType.RESEARCH,
    enum: TimeLogType,
  })
  workType: TimeLogType;

  @ApiProperty({
    description: 'Description of work performed',
    example: 'Conducted literature review on machine learning algorithms',
  })
  description: string;

  @ApiProperty({
    description: 'Achievements from this session',
    example: 'Identified 5 key papers, created summary document',
    nullable: true,
  })
  achievements: string | null;

  @ApiProperty({
    description: 'Challenges encountered',
    example: 'Some papers were behind paywalls',
    nullable: true,
  })
  challenges: string | null;

  @ApiProperty({
    description: 'When this log entry was created',
    example: '2024-03-15T10:30:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Author of the time log entry',
    example: 'John Doe',
  })
  authorName: string;
}
