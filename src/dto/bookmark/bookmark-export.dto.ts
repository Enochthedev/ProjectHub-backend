import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
}

export class ExportBookmarksDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  categoryId?: string;
}

export class BookmarkExportData {
  bookmarks: BookmarkExportItem[];
  exportedAt: Date;
  totalCount: number;
  filters?: {
    fromDate?: string;
    toDate?: string;
    categoryId?: string;
  };
}

export interface BookmarkExportItem {
  id: string;
  projectId: string;
  projectTitle: string;
  projectAbstract: string;
  specialization: string;
  difficultyLevel: string;
  year: number;
  tags: string[];
  technologyStack: string[];
  supervisorName: string;
  supervisorEmail: string;
  categoryName?: string;
  bookmarkedAt: Date;
}
