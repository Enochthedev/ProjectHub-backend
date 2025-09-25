import {
  IsOptional,
  IsString,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectType } from '../../common/enums';

export class TemplateFiltersDto {
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsEnum(ProjectType)
  projectType?: ProjectType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  @Type(() => Number)
  minDurationWeeks?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  @Type(() => Number)
  maxDurationWeeks?: number;

  @IsOptional()
  @IsString()
  createdBy?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'createdAt' | 'usageCount' | 'averageRating' = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
