import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { DiscussionType, DiscussionStatus } from '../../entities';

export class CreateDiscussionDto {
  @IsUUID()
  milestoneId: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content: string;

  @IsEnum(DiscussionType)
  type: DiscussionType;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class UpdateDiscussionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsEnum(DiscussionType)
  type?: DiscussionType;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;
}

export class ResolveDiscussionDto {
  @IsEnum(DiscussionStatus)
  status: DiscussionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolutionNotes?: string;
}

export class CreateDiscussionReplyDto {
  @IsUUID()
  discussionId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentReplyId?: string;
}

export class UpdateDiscussionReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class DiscussionFiltersDto {
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsEnum(DiscussionType)
  type?: DiscussionType;

  @IsOptional()
  @IsEnum(DiscussionStatus)
  status?: DiscussionStatus;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}
