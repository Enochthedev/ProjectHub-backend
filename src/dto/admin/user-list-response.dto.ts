import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';

export class UserSummaryDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'student@ui.edu.ng',
    format: 'email',
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
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last account update timestamp',
    example: '2024-01-20T14:45:00Z',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'User display name from profile',
    example: 'John Doe',
  })
  name?: string;
}

export class UserListResponseDto {
  @ApiProperty({
    description: 'Array of user summaries',
    type: [UserSummaryDto],
  })
  users: UserSummaryDto[];

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
    example: 10,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 15,
  })
  totalPages: number;
}
