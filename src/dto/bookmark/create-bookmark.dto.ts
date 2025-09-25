import { IsUUID, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookmarkDto {
  @ApiProperty({
    description: 'UUID of the project to bookmark',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    type: String,
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({
    description: 'UUID of the bookmark category (optional)',
    example: '456e7890-e89b-12d3-a456-426614174001',
    format: 'uuid',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;
}
