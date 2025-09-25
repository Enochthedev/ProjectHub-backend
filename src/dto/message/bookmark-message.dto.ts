import { IsUUID, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookmarkMessageDto {
  @ApiProperty({
    description: 'UUID of the message to bookmark',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  messageId: string;

  @ApiPropertyOptional({
    description: 'Optional note about why this message was bookmarked',
    example: 'Great explanation of literature review methodology',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
