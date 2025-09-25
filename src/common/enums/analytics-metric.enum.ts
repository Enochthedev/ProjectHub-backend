export enum AnalyticsMetric {
  // User metrics
  USER_REGISTRATIONS = 'user_registrations',
  USER_LOGINS = 'user_logins',
  ACTIVE_USERS = 'active_users',
  USER_RETENTION = 'user_retention',

  // Project metrics
  PROJECT_SUBMISSIONS = 'project_submissions',
  PROJECT_APPROVALS = 'project_approvals',
  PROJECT_REJECTIONS = 'project_rejections',
  PROJECT_VIEWS = 'project_views',

  // Supervisor metrics
  SUPERVISOR_ASSIGNMENTS = 'supervisor_assignments',
  SUPERVISOR_WORKLOAD = 'supervisor_workload',
  SUPERVISOR_RATINGS = 'supervisor_ratings',

  // AI metrics
  AI_QUERIES = 'ai_queries',
  AI_RESPONSE_TIME = 'ai_response_time',
  AI_SATISFACTION = 'ai_satisfaction',

  // System metrics
  SYSTEM_UPTIME = 'system_uptime',
  API_RESPONSE_TIME = 'api_response_time',
  ERROR_RATE = 'error_rate',

  // Milestone metrics
  MILESTONE_COMPLETIONS = 'milestone_completions',
  MILESTONE_DELAYS = 'milestone_delays',

  // Recommendation metrics
  RECOMMENDATION_CLICKS = 'recommendation_clicks',
  RECOMMENDATION_BOOKMARKS = 'recommendation_bookmarks',
}
