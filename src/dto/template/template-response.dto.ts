export class TemplateResponseDto {
  id: string;
  name: string;
  template: string;
  category: string;
  triggerKeywords: string[];
  variables: Record<string, any> | null;
  language: string;
  isActive: boolean;
  usageCount: number;
  effectivenessScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateMatchResultDto {
  template: TemplateResponseDto;
  matchScore: number;
  processedContent: string;
}

export class TemplateSearchResultDto {
  templates: TemplateResponseDto[];
  total: number;
  hasMore: boolean;
}
