import {
  IsString,
  IsEnum,
  IsInt,
  IsArray,
  IsBoolean,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export class UpdateProjectDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  @MinLength(10, { message: 'Title must be at least 10 characters long' })
  @MaxLength(200, { message: 'Title must not exceed 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @IsOptional()
  @IsString({ message: 'Abstract must be a string' })
  @MinLength(100, { message: 'Abstract must be at least 100 characters long' })
  @MaxLength(2000, { message: 'Abstract must not exceed 2000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  abstract?: string;

  @IsOptional()
  @IsString({ message: 'Specialization must be a string' })
  @IsIn(SPECIALIZATIONS, {
    message: `Specialization must be one of: ${SPECIALIZATIONS.join(', ')}`,
  })
  specialization?: string;

  @IsOptional()
  @IsEnum(DifficultyLevel, {
    message: `Difficulty level must be one of: ${Object.values(DifficultyLevel).join(', ')}`,
  })
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Year must be an integer' })
  @Min(2020, { message: 'Year must be at least 2020' })
  @Max(new Date().getFullYear(), { message: 'Year cannot be in the future' })
  year?: number;

  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  @ArrayMaxSize(10, { message: 'Maximum 10 tags allowed' })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((tag: any) => (typeof tag === 'string' ? tag.trim() : ''))
          .filter(Boolean)
      : [],
  )
  tags?: string[];

  @IsOptional()
  @IsArray({ message: 'Technology stack must be an array' })
  @IsString({ each: true, message: 'Each technology must be a string' })
  @ArrayMaxSize(15, { message: 'Maximum 15 technologies allowed' })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
          .map((tech: any) => (typeof tech === 'string' ? tech.trim() : ''))
          .filter(Boolean)
      : [],
  )
  technologyStack?: string[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isGroupProject must be a boolean' })
  isGroupProject?: boolean;

  @IsOptional()
  @IsUrl({}, { message: 'GitHub URL must be a valid URL' })
  @MaxLength(500, { message: 'GitHub URL must not exceed 500 characters' })
  githubUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Demo URL must be a valid URL' })
  @MaxLength(500, { message: 'Demo URL must not exceed 500 characters' })
  demoUrl?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(1000, { message: 'Notes must not exceed 1000 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  notes?: string;
}
