import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { CreateTemplateDto } from './create-template.dto';

export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  effectivenessScore?: number;
}
