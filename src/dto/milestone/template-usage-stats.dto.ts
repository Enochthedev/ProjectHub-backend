export class TemplateUsageStatsDto {
  templateId: string;
  templateName: string;
  totalUsages: number;
  averageRating: number;
  ratingCount: number;
  successfulApplications: number;
  averageCompletionTime: number | null; // in days
  mostCommonCustomizations: string[];
  recentUsages: {
    studentId: string;
    studentName: string;
    appliedAt: Date;
    projectName?: string;
    completionStatus: 'completed' | 'in_progress' | 'abandoned';
  }[];
}
