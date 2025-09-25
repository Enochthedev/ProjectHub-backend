import {
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RateMessageDto {
  @ApiProperty({
    description: 'UUID of the message to rate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  messageId: string;

  @ApiProperty({
    description: 'Rating value from 1.0 to 5.0',
    example: 4.5,
    minimum: 1.0,
    maximum: 5.0,
  })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1.0)
  @Max(5.0)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({
    description: 'Optional feedback about the message quality',
    example: 'Very helpful and accurate response',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
