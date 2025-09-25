import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'CurrentPass123!',
  })
  @IsString({ message: 'Current password must be a string' })
  @MinLength(1, { message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password with complexity requirements',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'New password must be a string' })
  @IsStrongPassword({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    allowedSpecialChars: '@$!%*?&',
  })
  newPassword: string;
}
