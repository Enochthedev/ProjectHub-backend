import { ContentType } from '../../common/enums';

export class KnowledgeEntryResponseDto {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  keywords: string[];
  contentType: ContentType;
  language: string;
  isActive: boolean;
  usageCount: number;
  averageRating: number;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
  relevanceScore?: number;
}

export class KnowledgeSearchResultDto {
  entries: KnowledgeEntryResponseDto[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
