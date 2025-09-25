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
import { Priority, MilestoneStatus } from '../../common/enums';
import { TaskAssignmentDto } from './create-shared-milestone.dto';

export class UpdateSharedMilestoneDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  assigneeIds?: string[];

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

export class UpdateSharedMilestoneStatusDto {
  @IsEnum(MilestoneStatus)
  status: MilestoneStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  actualHours?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  blockingReason?: string;
}

export class UpdateAssignmentStatusDto {
  @IsEnum(MilestoneStatus)
  status: MilestoneStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  actualHours?: number;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  blockingReason?: string;
}
