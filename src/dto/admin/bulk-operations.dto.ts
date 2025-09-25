import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  Max,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class BulkImportOptionsDto {
  @ApiProperty({
    description: 'CSV data containing user information',
    example:
      'email,role,name,isActive\nstudent1@ui.edu.ng,student,John Doe,true\nstudent2@ui.edu.ng,student,Jane Smith,true',
  })
  @IsString()
  csvData: string;

  @ApiPropertyOptional({
    description: 'Whether to send welcome emails to imported users',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmails?: boolean = false;
}

export class BulkExportOptionsDto {
  @ApiPropertyOptional({
    description: 'Filter users by role',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter users by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter users by email verification status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  })
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Include user profile data in export',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeProfiles?: boolean = true;

  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['csv', 'json'],
    default: 'csv',
  })
  @IsOptional()
  @IsIn(['csv', 'json'])
  format?: 'csv' | 'json' = 'csv';

  @ApiPropertyOptional({
    description: 'Filter users created after this date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter users created before this date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  createdBefore?: string;
}

export class UserMigrationOptionsDto {
  @ApiProperty({
    description: 'Array of user IDs to migrate',
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiPropertyOptional({
    description: 'Source role to migrate from (optional filter)',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  fromRole?: UserRole;

  @ApiProperty({
    description: 'Target role to migrate to',
    enum: UserRole,
    example: UserRole.SUPERVISOR,
  })
  @IsEnum(UserRole)
  toRole: UserRole;

  @ApiPropertyOptional({
    description: 'Whether to preserve existing profiles during migration',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  preserveProfiles?: boolean = false;

  @ApiPropertyOptional({
    description: 'Perform a dry run without making actual changes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @ApiPropertyOptional({
    description: 'Batch size for processing users',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  batchSize?: number = 50;
}

export class CleanupOptionsDto {
  @ApiPropertyOptional({
    description: 'Delete users inactive for this many days',
    default: 365,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  inactiveForDays?: number = 365;

  @ApiPropertyOptional({
    description: 'Delete users unverified for this many days',
    default: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  unverifiedForDays?: number = 30;

  @ApiPropertyOptional({
    description: 'Whether to delete user profiles along with users',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  deleteProfiles?: boolean = true;

  @ApiPropertyOptional({
    description: 'Perform a dry run without making actual changes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;

  @ApiPropertyOptional({
    description: 'Batch size for processing users',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  batchSize?: number = 50;
}

export class BulkImportResultDto {
  @ApiProperty({
    description: 'Total number of users processed',
    example: 100,
  })
  totalProcessed: number;

  @ApiProperty({
    description: 'Number of users successfully created',
    example: 85,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of users that failed to be created',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of error details for failed imports',
    example: [
      { row: 15, email: 'invalid@email', error: 'Invalid email format' },
      { row: 23, email: 'duplicate@ui.edu.ng', error: 'Email already exists' },
    ],
  })
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Array of successfully created user IDs',
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  createdUsers: string[];

  @ApiProperty({
    description: 'Array of emails that were skipped (already exist)',
    example: ['existing1@ui.edu.ng', 'existing2@ui.edu.ng'],
  })
  skippedUsers: string[];
}

export class MigrationResultDto {
  @ApiProperty({
    description: 'Total number of users to migrate',
    example: 50,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Number of users successfully migrated',
    example: 45,
  })
  migratedCount: number;

  @ApiProperty({
    description: 'Number of users that failed to migrate',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of error details for failed migrations',
    example: [
      { userId: 'uuid1', email: 'user1@ui.edu.ng', error: 'User not found' },
      { userId: 'uuid2', email: 'user2@ui.edu.ng', error: 'Role mismatch' },
    ],
  })
  errors: Array<{
    userId: string;
    email: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Whether this was a dry run',
    example: false,
  })
  dryRun: boolean;
}

export class CleanupResultDto {
  @ApiProperty({
    description: 'Total number of users identified for cleanup',
    example: 25,
  })
  totalCandidates: number;

  @ApiProperty({
    description: 'Number of users successfully deleted',
    example: 20,
  })
  deletedCount: number;

  @ApiProperty({
    description: 'Number of users that failed to be deleted',
    example: 5,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of error details for failed deletions',
    example: [
      {
        userId: 'uuid1',
        email: 'user1@ui.edu.ng',
        error: 'Cannot delete admin user',
      },
      {
        userId: 'uuid2',
        email: 'user2@ui.edu.ng',
        error: 'User has active projects',
      },
    ],
  })
  errors: Array<{
    userId: string;
    email: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Whether this was a dry run',
    example: false,
  })
  dryRun: boolean;
}

export class BulkOperationStatusDto {
  @ApiProperty({
    description: 'Operation ID for tracking',
    example: 'bulk-op-uuid',
  })
  operationId: string;

  @ApiProperty({
    description: 'Operation type',
    example: 'import',
    enum: ['import', 'export', 'migration', 'cleanup'],
  })
  operationType: 'import' | 'export' | 'migration' | 'cleanup';

  @ApiProperty({
    description: 'Current status of the operation',
    example: 'in_progress',
    enum: ['pending', 'in_progress', 'completed', 'failed'],
  })
  status: 'pending' | 'in_progress' | 'completed' | 'failed';

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  progress: number;

  @ApiProperty({
    description: 'Operation start timestamp',
    example: '2024-01-20T10:30:00Z',
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: 'Operation completion timestamp',
    example: '2024-01-20T10:35:00Z',
  })
  completedAt?: Date;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
    example: 'Invalid CSV format',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Operation result data',
  })
  result?: any;
}
