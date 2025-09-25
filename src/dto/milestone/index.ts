export { CreateMilestoneDto } from './create-milestone.dto';
export { UpdateMilestoneDto } from './update-milestone.dto';
export { UpdateMilestoneStatusDto } from './update-milestone-status.dto';
export {
  CreateSharedMilestoneDto,
  TaskAssignmentDto,
} from './create-shared-milestone.dto';
export {
  UpdateSharedMilestoneDto,
  UpdateSharedMilestoneStatusDto,
  UpdateAssignmentStatusDto,
} from './update-shared-milestone.dto';
export {
  SharedMilestoneResponseDto,
  AssignmentResponseDto,
} from './shared-milestone-response.dto';

// Discussion DTOs
export {
  CreateDiscussionDto,
  UpdateDiscussionDto,
  ResolveDiscussionDto,
  CreateDiscussionReplyDto,
  UpdateDiscussionReplyDto,
  DiscussionFiltersDto,
} from './milestone-discussion.dto';
export {
  DiscussionResponseDto,
  DiscussionReplyResponseDto,
  PaginatedDiscussionResponseDto,
} from './milestone-discussion-response.dto';

// Team Notification DTOs
export {
  CreateTeamNotificationDto,
  NotificationFiltersDto,
  TeamNotificationResponseDto,
  PaginatedNotificationResponseDto,
} from './team-notification.dto';
export { MilestoneFiltersDto } from './milestone-filters.dto';
export { CreateMilestoneNoteDto } from './create-milestone-note.dto';
export {
  ProjectProgressDto,
  MilestoneProgressDto,
} from './project-progress.dto';

// Progress and Time Tracking DTOs
export { MilestoneProgressUpdateDto } from './milestone-progress-update.dto';
export {
  CreateMilestoneTimeLogDto,
  MilestoneTimeLogResponseDto,
  TimeLogType,
} from './milestone-time-log.dto';

// Template DTOs
export {
  CreateTemplateDto,
  CreateTemplateMilestoneDto,
  CreateTemplateConfigurationDto,
} from './create-template.dto';
export { UpdateTemplateDto } from './update-template.dto';
export { TemplateFiltersDto } from './template-filters.dto';
export { TemplateUsageStatsDto } from './template-usage-stats.dto';
export {
  ApplyTemplateDto,
  TemplateMilestoneCustomizationDto,
} from './apply-template.dto';
export { TemplateSearchDto } from './template-search.dto';
export {
  TemplateResponseDto,
  TemplateMilestoneResponseDto,
  TemplateConfigurationResponseDto,
  PaginatedTemplateResponseDto,
} from './template-response.dto';

// Visualization DTOs
export {
  GanttChartDataDto,
  CalendarViewDataDto,
  WorkloadDistributionDto,
  TimelineVisualizationDto,
  MilestoneTimelineItemDto,
  CalendarEventDto,
  WorkloadPeriodDto,
  TimelineEventDto,
} from './visualization.dto';

// Analytics DTOs
export {
  CompletionVelocityDto,
  TrendAnalysisDto,
  CriticalPathAnalysisDto,
  ProgressComparisonDto,
  TemplateBenchmarkDto,
  AnalyticsMetricsDto,
  VelocityTrendDto,
  ProgressPredictionDto,
  MilestoneAnalyticsDto,
  CriticalMilestoneDto,
} from './analytics.dto';

// Supervisor Reporting DTOs
export {
  SupervisorDashboardDto,
  StudentProgressSummaryDto,
  AtRiskStudentDto,
  SupervisorReportDto,
  ProgressReportFiltersDto,
  ExportableReportDto,
  StudentMilestoneOverviewDto,
  SupervisorAnalyticsDto,
  ReportMetricsDto,
} from './supervisor-reporting.dto';

// iCal Export DTOs
export {
  ICalExportOptionsDto,
  BulkICalExportDto,
  ICalExportResponseDto,
} from './ical-export.dto';

// Calendar Sync DTOs
export {
  CreateCalendarSyncDto,
  UpdateCalendarSyncDto,
  CalendarSyncResponseDto,
  SyncResultDto,
  TriggerSyncDto,
} from './calendar-sync.dto';

// Academic Calendar DTOs
export {
  ImportAcademicCalendarDto,
  CreateAcademicEventDto,
  UpdateAcademicEventDto,
  AcademicEventResponseDto,
  MilestoneConflictCheckDto,
  MilestoneAdjustmentResponseDto,
  AcademicCalendarQueryDto,
} from './academic-calendar.dto';
