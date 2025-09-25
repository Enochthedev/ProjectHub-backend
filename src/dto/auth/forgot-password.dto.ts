import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsUniversityEmail } from '../../common/validators';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'University of Ibadan email address for password reset',
    example: 'student@ui.edu.ng',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsUniversityEmail({
    message: 'Must use University of Ibadan email (@ui.edu.ng)',
  })
  email: string;
}
