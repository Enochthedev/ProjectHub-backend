import {
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class MilestoneProgressUpdateDto {
  @ApiPropertyOptional({
    description: 'Progress notes or update description',
    example:
      'Completed literature review section. Found 20 relevant papers and summarized key findings.',
    minLength: 10,
    maxLength: 1000,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Progress notes must be a string' })
  @MinLength(10, {
    message: 'Progress notes must be at least 10 characters long',
  })
  @MaxLength(1000, {
    message: 'Progress notes must not exceed 1000 characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  progressNotes?: string;

  @ApiPropertyOptional({
    description: 'Hours worked on this milestone since last update',
    example: 8,
    minimum: 0,
    maximum: 24,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Hours worked must be a number' })
  @Min(0, { message: 'Hours worked must be at least 0' })
  @Max(24, { message: 'Hours worked must not exceed 24 hours per day' })
  hoursWorked?: number;

  @ApiPropertyOptional({
    description: 'Estimated progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Progress percentage must be an integer' })
  @Min(0, { message: 'Progress percentage must be at least 0' })
  @Max(100, { message: 'Progress percentage must not exceed 100' })
  progressPercentage?: number;

  @ApiPropertyOptional({
    description: 'Challenges or blockers encountered',
    example:
      'Difficulty accessing some research papers due to paywall restrictions',
    minLength: 10,
    maxLength: 500,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Challenges must be a string' })
  @MinLength(10, {
    message: 'Challenges description must be at least 10 characters long',
  })
  @MaxLength(500, {
    message: 'Challenges description must not exceed 500 characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  challenges?: string;

  @ApiPropertyOptional({
    description: 'Next steps or planned activities',
    example:
      'Start writing methodology section and prepare research proposal draft',
    minLength: 10,
    maxLength: 500,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Next steps must be a string' })
  @MinLength(10, {
    message: 'Next steps description must be at least 10 characters long',
  })
  @MaxLength(500, {
    message: 'Next steps description must not exceed 500 characters',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nextSteps?: string;

  @ApiPropertyOptional({
    description:
      'Revised estimated hours to completion (if different from original)',
    example: 15,
    minimum: 0,
    maximum: 1000,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Revised estimated hours must be an integer' })
  @Min(0, { message: 'Revised estimated hours must be at least 0' })
  @Max(1000, { message: 'Revised estimated hours must not exceed 1000' })
  revisedEstimatedHours?: number;

  @ApiPropertyOptional({
    description: 'Quality assessment of work completed (1-5 scale)',
    example: 4,
    minimum: 1,
    maximum: 5,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quality assessment must be an integer' })
  @Min(1, { message: 'Quality assessment must be at least 1' })
  @Max(5, { message: 'Quality assessment must not exceed 5' })
  qualityAssessment?: number;
}
