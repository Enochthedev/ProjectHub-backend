import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Priority } from '../../common/enums';

export class TaskAssignmentDto {
  @IsUUID()
  assigneeId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  taskTitle: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  taskDescription?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  estimatedHours?: number;
}

export class CreateSharedMilestoneDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsDateString()
  dueDate: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsUUID()
  projectId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  assigneeIds: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskAssignmentDto)
  taskAssignments?: TaskAssignmentDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  estimatedHours?: number;

  @IsOptional()
  @IsBoolean()
  requiresAllApproval?: boolean;
}
