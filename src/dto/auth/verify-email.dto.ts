import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
    example: 'abc123def456ghi789',
  })
  @IsString({ message: 'Verification token must be a string' })
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}
