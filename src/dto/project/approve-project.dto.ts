import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveProjectDto {
  @ApiPropertyOptional({
    description: 'Optional notes from the admin regarding the approval',
    example:
      'Excellent project proposal with clear objectives and methodology. Approved for implementation.',
    maxLength: 500,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Approval notes must be a string' })
  @MaxLength(500, { message: 'Approval notes must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  approvalNotes?: string;
}
