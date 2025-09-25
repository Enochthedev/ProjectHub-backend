import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SPECIALIZATIONS } from '../../common/constants';
import { IsValidSpecialization } from '../../common/validators';

export class UpdateStudentProfileDto {
  @ApiPropertyOptional({
    description: 'Student full name',
    example: 'John Doe',
    minLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Student technical skills',
    type: [String],
    example: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
  })
  @IsOptional()
  @IsArray({ message: 'Skills must be an array' })
  @IsString({ each: true, message: 'Each skill must be a string' })
  skills?: string[];

  @ApiPropertyOptional({
    description: 'Student academic and professional interests',
    type: [String],
    example: [
      'Web Development',
      'Machine Learning',
      'Mobile Apps',
      'Data Science',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Interests must be an array' })
  @IsString({ each: true, message: 'Each interest must be a string' })
  interests?: string[];

  @ApiPropertyOptional({
    description: 'Preferred project specializations',
    type: [String],
    enum: SPECIALIZATIONS,
    example: [
      'Web Development & Full Stack',
      'Artificial Intelligence & Machine Learning',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Preferred specializations must be an array' })
  @IsValidSpecialization({ message: 'Invalid specialization selected' })
  preferredSpecializations?: string[];

  @ApiPropertyOptional({
    description: 'Current academic year',
    example: 4,
    minimum: 1,
    maximum: 6,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Current year must be a number' })
  @Min(1, { message: 'Current year must be at least 1' })
  @Max(6, { message: 'Current year must be at most 6' })
  currentYear?: number;

  @ApiPropertyOptional({
    description: 'Current Grade Point Average',
    example: 3.8,
    minimum: 0.0,
    maximum: 5.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'GPA must be a number' })
  @Min(0.0, { message: 'GPA must be at least 0.0' })
  @Max(5.0, { message: 'GPA must be at most 5.0' })
  gpa?: number;
}
