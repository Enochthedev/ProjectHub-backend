import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  MaxLength,
  MinLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';

export class UpdateMilestoneStatusDto {
  @ApiProperty({
    description: 'New status for the milestone',
    example: MilestoneStatus.IN_PROGRESS,
    enum: MilestoneStatus,
  })
  @IsEnum(MilestoneStatus, {
    message: `Status must be one of: ${Object.values(MilestoneStatus).join(', ')}`,
  })
  status: MilestoneStatus;

  @ApiPropertyOptional({
    description: 'Optional notes about the status change',
    example: 'Started working on the literature review section',
    maxLength: 500,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(500, { message: 'Notes must not exceed 500 characters' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Actual hours spent (for completion tracking)',
    example: 35,
    minimum: 0,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Actual hours must be an integer' })
  @Min(0, { message: 'Actual hours must be at least 0' })
  actualHours?: number;

  @ApiPropertyOptional({
    description: 'Reason for blocking (required when status is BLOCKED)',
    example: 'Waiting for supervisor feedback on research direction',
    minLength: 10,
    maxLength: 500,
    type: String,
  })
  @ValidateIf((o) => o.status === MilestoneStatus.BLOCKED)
  @IsString({ message: 'Blocking reason must be a string' })
  @MinLength(10, {
    message: 'Blocking reason must be at least 10 characters long',
  })
  @MaxLength(500, { message: 'Blocking reason must not exceed 500 characters' })
  blockingReason?: string;
}
