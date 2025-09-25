import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SPECIALIZATIONS } from '../../common/constants';
import { IsValidSpecialization } from '../../common/validators';

export class UpdateSupervisorProfileDto {
  @ApiPropertyOptional({
    description: 'Supervisor full name',
    example: 'Dr. Jane Smith',
    minLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Areas of specialization for project supervision',
    type: [String],
    enum: SPECIALIZATIONS,
    example: [
      'Artificial Intelligence & Machine Learning',
      'Data Science & Analytics',
    ],
  })
  @IsOptional()
  @IsArray({ message: 'Specializations must be an array' })
  @ArrayNotEmpty({ message: 'Must have at least one specialization' })
  @IsValidSpecialization({ message: 'Invalid specialization selected' })
  specializations?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of students that can be supervised',
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Maximum students must be a number' })
  @Min(1, { message: 'Maximum students must be at least 1' })
  @Max(20, { message: 'Maximum students must be at most 20' })
  maxStudents?: number;

  @ApiPropertyOptional({
    description:
      'Whether the supervisor is currently available for new students',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Availability status must be a boolean' })
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Physical office location',
    example: 'Room 201, Computer Science Building',
    minLength: 2,
  })
  @IsOptional()
  @IsString({ message: 'Office location must be a string' })
  @MinLength(2, {
    message: 'Office location must be at least 2 characters long',
  })
  officeLocation?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+234-xxx-xxx-xxxx',
    minLength: 10,
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @MinLength(10, {
    message: 'Phone number must be at least 10 characters long',
  })
  phoneNumber?: string;
}
