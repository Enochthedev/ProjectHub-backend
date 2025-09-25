import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'Whether the user account should be active',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;
}
