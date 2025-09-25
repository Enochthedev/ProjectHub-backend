import {
  IsEnum,
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CalendarProvider,
  SyncStatus,
} from '../../entities/calendar-sync.entity';

export class CreateCalendarSyncDto {
  @ApiProperty({
    description: 'Calendar provider',
    enum: CalendarProvider,
    example: CalendarProvider.GOOGLE,
  })
  @IsEnum(CalendarProvider)
  provider: CalendarProvider;

  @ApiProperty({
    description: 'Calendar ID or name',
    example: 'primary',
  })
  @IsString()
  calendarId: string;

  @ApiPropertyOptional({
    description: 'Access token for OAuth providers',
    example: 'ya29.a0AfH6SMC...',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Refresh token for OAuth providers',
    example: '1//04...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Server URL for CalDAV providers',
    example: 'https://caldav.icloud.com',
  })
  @IsOptional()
  @IsUrl()
  serverUrl?: string;

  @ApiPropertyOptional({
    description: 'Username for CalDAV providers',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Password for CalDAV providers',
    example: 'app-specific-password',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'Sync interval in minutes',
    minimum: 15,
    maximum: 1440,
    default: 60,
  })
  @IsNumber()
  @Min(15)
  @Max(1440)
  syncInterval: number = 60;

  @ApiProperty({
    description: 'Enable automatic synchronization',
    default: false,
  })
  @IsBoolean()
  autoSync: boolean = false;
}

export class UpdateCalendarSyncDto {
  @ApiPropertyOptional({
    description: 'Calendar ID or name',
    example: 'primary',
  })
  @IsOptional()
  @IsString()
  calendarId?: string;

  @ApiPropertyOptional({
    description: 'Access token for OAuth providers',
    example: 'ya29.a0AfH6SMC...',
  })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Refresh token for OAuth providers',
    example: '1//04...',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Server URL for CalDAV providers',
    example: 'https://caldav.icloud.com',
  })
  @IsOptional()
  @IsUrl()
  serverUrl?: string;

  @ApiPropertyOptional({
    description: 'Username for CalDAV providers',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Password for CalDAV providers',
    example: 'app-specific-password',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    description: 'Sync interval in minutes',
    minimum: 15,
    maximum: 1440,
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(1440)
  syncInterval?: number;

  @ApiPropertyOptional({
    description: 'Enable automatic synchronization',
  })
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;
}

export class CalendarSyncResponseDto {
  @ApiProperty({
    description: 'Sync configuration ID',
    example: 'uuid-sync-id',
  })
  id: string;

  @ApiProperty({
    description: 'Calendar provider',
    enum: CalendarProvider,
    example: CalendarProvider.GOOGLE,
  })
  provider: CalendarProvider;

  @ApiProperty({
    description: 'Calendar ID or name',
    example: 'primary',
  })
  calendarId: string;

  @ApiProperty({
    description: 'Sync interval in minutes',
    example: 60,
  })
  syncInterval: number;

  @ApiProperty({
    description: 'Automatic synchronization enabled',
    example: true,
  })
  autoSync: boolean;

  @ApiProperty({
    description: 'Current sync status',
    enum: SyncStatus,
    example: SyncStatus.COMPLETED,
  })
  status: SyncStatus;

  @ApiPropertyOptional({
    description: 'Last successful sync timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastSyncAt: string | null;

  @ApiProperty({
    description: 'Total number of sync attempts',
    example: 25,
  })
  totalSyncs: number;

  @ApiProperty({
    description: 'Number of successful syncs',
    example: 23,
  })
  successfulSyncs: number;

  @ApiProperty({
    description: 'Number of failed syncs',
    example: 2,
  })
  failedSyncs: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 92.0,
  })
  successRate: number;

  @ApiProperty({
    description: 'Sync configuration is healthy',
    example: true,
  })
  isHealthy: boolean;

  @ApiProperty({
    description: 'Sync configuration needs attention',
    example: false,
  })
  needsAttention: boolean;

  @ApiPropertyOptional({
    description: 'Next scheduled sync time',
    example: '2024-01-15T11:30:00Z',
  })
  nextSyncTime: string | null;

  @ApiProperty({
    description: 'Recent sync errors',
    type: [String],
    example: [],
  })
  syncErrors: string[];

  @ApiProperty({
    description: 'Configuration created timestamp',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Configuration updated timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: string;
}

export class SyncResultDto {
  @ApiProperty({
    description: 'Sync configuration ID',
    example: 'uuid-sync-id',
  })
  syncId: string;

  @ApiProperty({
    description: 'Sync operation status',
    enum: SyncStatus,
    example: SyncStatus.COMPLETED,
  })
  status: SyncStatus;

  @ApiProperty({
    description: 'Number of milestones successfully synced',
    example: 8,
  })
  syncedCount: number;

  @ApiProperty({
    description: 'Number of milestones that failed to sync',
    example: 1,
  })
  failedCount: number;

  @ApiProperty({
    description: 'Sync errors encountered',
    type: [String],
    example: ['Failed to sync milestone abc-123: Network timeout'],
  })
  errors: string[];

  @ApiProperty({
    description: 'Sync completion timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastSyncAt: string;
}

export class TriggerSyncDto {
  @ApiPropertyOptional({
    description: 'Force sync even if recently synced',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}
