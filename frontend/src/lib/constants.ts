// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile',
  },

  // Projects
  PROJECTS: {
    BASE: '/projects',
    SEARCH: '/projects/search',
    POPULAR: '/projects/popular',
    BOOKMARKS: '/projects/bookmarks',

    // Current Project Management
    CURRENT_STUDENT: '/projects/current/student',
    CURRENT_SUPERVISOR: '/projects/current/supervisor',
    ASSIGNMENTS: '/projects/assignments',
    STATUS: '/projects/status',
    COMMUNICATIONS: '/projects/communications',
    PROGRESS: '/projects/progress',
    NOTIFICATIONS: '/projects/notifications',
  },

  // AI Assistant
  AI: {
    CONVERSATIONS: '/ai-assistant/conversations',
    MESSAGES: '/ai-assistant/messages',
    ASK: '/ai-assistant/ask',
    BOOKMARKS: '/ai-assistant/messages/bookmarked',
  },

  // Milestones
  MILESTONES: {
    BASE: '/milestones',
    TEMPLATES: '/milestones/templates',
    CALENDAR: '/milestones/calendar',
    PROGRESS: '/milestones/progress',
  },

  // Recommendations
  RECOMMENDATIONS: {
    BASE: '/recommendations',
    REFRESH: '/recommendations/refresh',
    HISTORY: '/recommendations/history',
    FEEDBACK: '/recommendations/feedback',
    EXPLANATION: '/recommendations/explanation',
    PROGRESS: '/recommendations/progress',
  },
} as const;

// Application Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  AI_ASSISTANT: '/ai-assistant',
  BOOKMARKS: '/bookmarks',
  MILESTONES: '/milestones',
  PROFILE: '/profile',
  SETTINGS: '/settings',
} as const;

// User Roles
export const USER_ROLES = {
  STUDENT: 'student',
  SUPERVISOR: 'supervisor',
  ADMIN: 'admin',
} as const;

// Project Difficulty Levels
export const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const;
