import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RejectProjectDto {
  @ApiProperty({
    description: 'Detailed reason for rejecting the project proposal',
    example:
      'The project scope is too broad and lacks specific technical requirements. Please provide more detailed methodology and reduce the scope to focus on core functionality.',
    minLength: 10,
    maxLength: 500,
    type: String,
  })
  @IsString({ message: 'Rejection reason must be a string' })
  @MinLength(10, {
    message: 'Rejection reason must be at least 10 characters long',
  })
  @MaxLength(500, {
    message: 'Rejection reason must not exceed 500 characters',
  })
  @Transform(({ value }) => value?.trim())
  rejectionReason: string;
}
