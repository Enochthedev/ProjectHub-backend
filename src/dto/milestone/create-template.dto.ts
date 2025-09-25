import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProjectType, Priority } from '../../common/enums';
import {
  TemplateMilestone,
  TemplateConfiguration,
} from '../../entities/interfaces/template-milestone.interface';

export class CreateTemplateMilestoneDto implements TemplateMilestone {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsInt()
  @Min(0)
  @Max(365)
  daysFromStart: number;

  @IsEnum(Priority)
  priority: Priority;

  @IsInt()
  @Min(1)
  @Max(1000)
  estimatedHours: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateTemplateConfigurationDto implements TemplateConfiguration {
  @IsBoolean()
  allowCustomization: boolean;

  @IsInt()
  @Min(1)
  @Max(52)
  minimumDurationWeeks: number;

  @IsInt()
  @Min(1)
  @Max(104)
  maximumDurationWeeks: number;

  @IsArray()
  @IsString({ each: true })
  requiredMilestones: string[];

  @IsArray()
  @IsString({ each: true })
  optionalMilestones: string[];
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  specialization: string;

  @IsEnum(ProjectType)
  projectType: ProjectType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateMilestoneDto)
  milestoneItems: CreateTemplateMilestoneDto[];

  @IsInt()
  @Min(1)
  @Max(52)
  estimatedDurationWeeks: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateTemplateConfigurationDto)
  configuration?: CreateTemplateConfigurationDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
