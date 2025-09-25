import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsArray,
  ArrayNotEmpty,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../common/enums/user-role.enum';
import { SPECIALIZATIONS } from '../../common/constants';
import {
  IsUniversityEmail,
  IsStrongPassword,
  IsValidSpecialization,
  IsRequiredForRole,
} from '../../common/validators';

export class RegisterDto {
  @ApiProperty({
    description: 'University of Ibadan email address',
    example: 'student@ui.edu.ng',
    format: 'email',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsUniversityEmail({
    message: 'Must use University of Ibadan email (@ui.edu.ng)',
  })
  email: string;

  @ApiProperty({
    description: 'Password with complexity requirements',
    example: 'SecurePass123!',
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
  password: string;

  @ApiProperty({
    description: 'User role in the system',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsEnum(UserRole, {
    message: 'Role must be one of: student, supervisor, admin',
  })
  role: UserRole;

  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    minLength: 2,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name: string;

  @ApiPropertyOptional({
    description: 'Specializations (required for supervisors only)',
    type: [String],
    enum: SPECIALIZATIONS,
    example: [
      'Artificial Intelligence & Machine Learning',
      'Web Development & Full Stack',
    ],
  })
  @ValidateIf((o) => o.role === UserRole.SUPERVISOR)
  @IsRequiredForRole(UserRole.SUPERVISOR, 'role', {
    message: 'Specializations are required for supervisor role',
  })
  @IsArray({ message: 'Specializations must be an array' })
  @ArrayNotEmpty({
    message: 'Supervisors must have at least one specialization',
  })
  @IsValidSpecialization({ message: 'Invalid specialization selected' })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Skills (optional for students)',
    type: [String],
    example: ['JavaScript', 'Python', 'React', 'Node.js'],
  })
  @ValidateIf((o) => o.role === UserRole.STUDENT)
  @IsOptional()
  @IsArray({ message: 'Skills must be an array' })
  @IsString({ each: true, message: 'Each skill must be a string' })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'Interests (optional for students)',
    type: [String],
    example: ['Web Development', 'Machine Learning', 'Mobile Apps'],
  })
  @ValidateIf((o) => o.role === UserRole.STUDENT)
  @IsOptional()
  @IsArray({ message: 'Interests must be an array' })
  @IsString({ each: true, message: 'Each interest must be a string' })
  interests?: string[];
}
