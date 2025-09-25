import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  IsString,
  IsEnum,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';

export class GenerateRecommendationsDto {
  @ApiProperty({
    description: 'Maximum number of recommendations to return',
    minimum: 1,
    maximum: 20,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({
    description: 'Specializations to exclude from recommendations',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeSpecializations?: string[];

  @ApiProperty({
    description: 'Specializations to include in recommendations',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeSpecializations?: string[];

  @ApiProperty({
    description: 'Maximum difficulty level for recommendations',
    enum: DifficultyLevel,
    required: false,
  })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  maxDifficulty?: DifficultyLevel;

  @ApiProperty({
    description: 'Force refresh of recommendations (bypass cache)',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean = false;

  @ApiProperty({
    description: 'Minimum similarity score threshold (0.0 to 1.0)',
    minimum: 0.0,
    maximum: 1.0,
    default: 0.3,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  @Type(() => Number)
  minSimilarityScore?: number = 0.3;

  @ApiProperty({
    description: 'Include diversity boost to prevent echo chambers',
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeDiversityBoost?: boolean = true;
}
