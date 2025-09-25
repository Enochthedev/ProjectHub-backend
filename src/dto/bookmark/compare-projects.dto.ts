import { IsArray, IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ProjectDetailDto } from '../project/project-detail.dto';

export class CompareProjectsDto {
  @IsArray()
  @IsUUID(4, { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  projectIds: string[];
}

export class ProjectComparisonDto {
  projects: ProjectDetailDto[];
  comparisonMatrix: ComparisonField[];
}

export interface ComparisonField {
  field: string;
  label: string;
  values: { [projectId: string]: any };
}
