import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456ghi789',
  })
  @IsString({ message: 'Reset token must be a string' })
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({
    description: 'New password with complexity requirements',
    example: 'NewSecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Password must be a string' })
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
