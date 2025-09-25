import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';
import { NotificationType, NotificationPriority } from '../../entities';

export class CreateTeamNotificationDto {
  @IsUUID()
  recipientId: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(1000)
  message: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsUUID()
  triggeredById?: string;
}

export class NotificationFiltersDto {
  @IsOptional()
  @IsUUID()
  recipientId?: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @IsOptional()
  @IsBoolean()
  isEmailSent?: boolean;
}

export class TeamNotificationResponseDto {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  isRead: boolean;
  readAt: Date | null;
  isEmailSent: boolean;
  emailSentAt: Date | null;

  recipient: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  };

  milestone: {
    id: string;
    title: string;
    dueDate: Date;
    status: string;
  } | null;

  triggeredBy: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  } | null;

  createdAt: Date;
}

export class PaginatedNotificationResponseDto {
  notifications: TeamNotificationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}
