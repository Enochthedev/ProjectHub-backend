import {
  IsString,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class UserFiltersDto {
  @ApiPropertyOptional({
    description: 'Search term for filtering users by email or name',
    example: 'john',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

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

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: ['createdAt', 'updatedAt', 'email', 'name'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'email' | 'name' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'newuser@ui.edu.ng',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether to send welcome email with temporary password',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  sendWelcomeEmail?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether the user account should be active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Additional profile data based on user role',
    example: {
      skills: ['JavaScript', 'Python'],
      interests: ['Web Development', 'AI'],
      specializations: ['Computer Science'],
    },
  })
  @IsOptional()
  profileData?: Record<string, any>;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'updated@ui.edu.ng',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Whether the user account should be active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user email is verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'User display name',
    example: 'John Doe Updated',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Additional profile data to update',
    example: {
      skills: ['JavaScript', 'Python', 'React'],
      currentYear: 4,
    },
  })
  @IsOptional()
  profileData?: Record<string, any>;
}

export class BulkUpdateUserDto {
  @ApiPropertyOptional({
    description: 'Whether the user accounts should be active',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'New role for the users',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Whether the user emails should be marked as verified',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Reason for the bulk update',
    example: 'Semester cleanup - deactivating inactive students',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UserStatusChangeDto {
  @ApiProperty({
    description: 'Whether the user account should be active',
    example: false,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Reason for the status change',
    example: 'Account suspended due to policy violation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional({
    description: 'Whether to notify the user about the status change',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyUser?: boolean = true;
}

export class BulkUserOperationDto {
  @ApiProperty({
    description: 'Array of user IDs to operate on',
    example: ['uuid1', 'uuid2', 'uuid3'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];

  @ApiProperty({
    description: 'Bulk update data to apply',
    type: BulkUpdateUserDto,
  })
  @ValidateNested()
  @Type(() => BulkUpdateUserDto)
  updateData: BulkUpdateUserDto;
}

export class StudentProfileDto {
  @ApiProperty({
    description: 'Student profile ID',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Student name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Student skills',
    example: ['JavaScript', 'Python', 'React'],
  })
  skills: string[];

  @ApiProperty({
    description: 'Student interests',
    example: ['Web Development', 'AI'],
  })
  interests: string[];

  @ApiProperty({
    description: 'Preferred specializations',
    example: ['Web Development & Full Stack'],
  })
  preferredSpecializations: string[];

  @ApiPropertyOptional({
    description: 'Current academic year',
    example: 4,
  })
  currentYear?: number;

  @ApiPropertyOptional({
    description: 'Grade Point Average',
    example: 3.8,
  })
  gpa?: number;

  @ApiProperty({
    description: 'Profile last updated timestamp',
    example: '2024-01-20T14:45:00Z',
  })
  profileUpdatedAt: Date;
}

export class SupervisorProfileDto {
  @ApiProperty({
    description: 'Supervisor profile ID',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Supervisor name',
    example: 'Dr. Jane Smith',
  })
  name: string;

  @ApiProperty({
    description: 'Supervisor specializations',
    example: ['Artificial Intelligence & Machine Learning'],
  })
  specializations: string[];

  @ApiProperty({
    description: 'Maximum number of students',
    example: 5,
  })
  maxStudents: number;

  @ApiProperty({
    description: 'Current number of assigned students',
    example: 3,
  })
  currentStudents: number;

  @ApiProperty({
    description: 'Whether supervisor is available for new students',
    example: true,
  })
  isAvailable: boolean;

  @ApiPropertyOptional({
    description: 'Office location',
    example: 'Room 201, CS Building',
  })
  officeLocation?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+234-xxx-xxx-xxxx',
  })
  phoneNumber?: string;
}

export class UserDetailDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'student@ui.edu.ng',
  })
  email: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Whether the user account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the user email is verified',
    example: true,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last account update timestamp',
    example: '2024-01-20T14:45:00Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User display name from profile',
    example: 'John Doe',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-20T09:30:00Z',
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Profile completeness percentage',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  profileCompleteness: number;

  @ApiPropertyOptional({
    description: 'Student profile data',
    type: StudentProfileDto,
  })
  studentProfile?: StudentProfileDto;

  @ApiPropertyOptional({
    description: 'Supervisor profile data',
    type: SupervisorProfileDto,
  })
  supervisorProfile?: SupervisorProfileDto;
}

export class PaginatedUsersDto {
  @ApiProperty({
    description: 'Array of user details',
    type: [UserDetailDto],
  })
  users: UserDetailDto[];

  @ApiProperty({
    description: 'Total number of users matching the query',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;
}

export class BulkOperationResultDto {
  @ApiProperty({
    description: 'Number of successfully processed users',
    example: 15,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed operations',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Array of error details for failed operations',
    example: [
      { userId: 'uuid1', error: 'User not found' },
      { userId: 'uuid2', error: 'Cannot deactivate admin user' },
    ],
  })
  errors: Array<{
    userId: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Array of successfully processed user IDs',
    example: ['uuid3', 'uuid4', 'uuid5'],
  })
  processedIds: string[];
}

export class UserActivitySummaryDto {
  @ApiPropertyOptional({
    description: 'Last login timestamp',
    example: '2024-01-20T09:30:00Z',
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Total number of logins',
    example: 45,
  })
  loginCount: number;

  @ApiPropertyOptional({
    description: 'Profile last updated timestamp',
    example: '2024-01-18T16:20:00Z',
  })
  profileUpdatedAt?: Date;

  @ApiProperty({
    description: 'Account age in days',
    example: 120,
  })
  accountAge: number;

  @ApiProperty({
    description: 'Whether the profile is considered complete',
    example: true,
  })
  isProfileComplete: boolean;

  @ApiProperty({
    description: 'Profile completeness percentage',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  profileCompleteness: number;
}

export class PasswordResetResultDto {
  @ApiProperty({
    description: 'Temporary password generated for the user',
    example: 'TempPass123!',
  })
  temporaryPassword: string;

  @ApiProperty({
    description: 'Success message',
    example:
      'Password reset successfully. Temporary password sent to user email.',
  })
  message: string;
}
