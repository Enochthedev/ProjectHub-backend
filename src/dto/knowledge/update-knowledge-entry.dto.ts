import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateKnowledgeEntryDto } from './create-knowledge-entry.dto';

export class UpdateKnowledgeEntryDto extends PartialType(
  CreateKnowledgeEntryDto,
) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
