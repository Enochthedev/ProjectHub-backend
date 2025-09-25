import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsEmail,
  IsArray,
  ValidateNested,
  IsObject,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for notification settings
 */
export class NotificationSettingsDto {
  // Channel enablement
  @IsBoolean()
  emailEnabled: boolean;

  @IsBoolean()
  smsEnabled: boolean;

  @IsBoolean()
  pushEnabled: boolean;

  @IsBoolean()
  inAppEnabled: boolean;

  // Email configuration
  @IsString()
  emailProvider: string;

  @IsString()
  smtpHost: string;

  @IsNumber()
  smtpPort: number;

  @IsBoolean()
  smtpSecure: boolean;

  @IsString()
  smtpUser: string;

  @IsString()
  smtpPassword: string;

  @IsEmail()
  fromEmail: string;

  @IsString()
  fromName: string;

  // Timing settings
  @IsNumber()
  @Min(0)
  defaultDelay: number;

  @IsNumber()
  @Min(1)
  @Max(10)
  retryAttempts: number;

  @IsNumber()
  @Min(60)
  retryDelay: number;

  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize: number;

  // Escalation settings
  @IsBoolean()
  escalationEnabled: boolean;

  @IsNumber()
  @Min(3600) // At least 1 hour
  escalationDelay: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  escalationLevels: number;

  // Rate limiting
  @IsBoolean()
  rateLimitEnabled: boolean;

  @IsNumber()
  @Min(1)
  rateLimitPerHour: number;

  @IsNumber()
  @Min(1)
  rateLimitPerDay: number;
}

/**
 * DTO for updating notification settings
 */
export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsString()
  emailProvider?: string;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsString()
  smtpUser?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsEmail()
  fromEmail?: string;

  @IsOptional()
  @IsString()
  fromName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultDelay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  retryAttempts?: number;

  @IsOptional()
  @IsNumber()
  @Min(60)
  retryDelay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  batchSize?: number;

  @IsOptional()
  @IsBoolean()
  escalationEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(3600)
  escalationDelay?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  escalationLevels?: number;

  @IsOptional()
  @IsBoolean()
  rateLimitEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rateLimitPerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  rateLimitPerDay?: number;
}

/**
 * DTO for email templates
 */
export class EmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsArray()
  @IsString({ each: true })
  variables: string[];

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for creating email templates
 */
export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating email templates
 */
export class UpdateEmailTemplateDto {
  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for testing email templates
 */
export class TestEmailTemplateDto {
  @IsEmail()
  recipientEmail: string;

  @IsObject()
  testData: Record<string, any>;
}

/**
 * DTO for notification rules
 */
export class NotificationRuleDto {
  @IsString()
  name: string;

  @IsString()
  event: string;

  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delay?: number;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for creating notification rules
 */
export class CreateNotificationRuleDto {
  @IsString()
  name: string;

  @IsString()
  event: string;

  @IsArray()
  @IsString({ each: true })
  channels: string[];

  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delay?: number = 0;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number = 3;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating notification rules
 */
export class UpdateNotificationRuleDto {
  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  delay?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for communication channels
 */
export class CommunicationChannelDto {
  @IsString()
  name: string;

  @IsEnum(['email', 'sms', 'push', 'webhook', 'slack', 'teams'])
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsObject()
  configuration: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for creating communication channels
 */
export class CreateCommunicationChannelDto {
  @IsString()
  name: string;

  @IsEnum(['email', 'sms', 'push', 'webhook', 'slack', 'teams'])
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean = true;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number = 3;

  @IsObject()
  configuration: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * DTO for updating communication channels
 */
export class UpdateCommunicationChannelDto {
  @IsOptional()
  @IsEnum(['email', 'sms', 'push', 'webhook', 'slack', 'teams'])
  type?: 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'teams';

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Response DTOs
 */
export class EmailTemplateTestResultDto {
  @IsBoolean()
  success: boolean;

  @IsString()
  message: string;
}

export class NotificationSettingsResponseDto extends NotificationSettingsDto {}

export class EmailTemplateResponseDto extends EmailTemplateDto {}

export class NotificationRuleResponseDto extends NotificationRuleDto {}

export class CommunicationChannelResponseDto extends CommunicationChannelDto {}
