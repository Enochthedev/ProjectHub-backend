/**
 * React Query client configuration with performance optimizations
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration for performance
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention time
      retry: (failureCount, error: any) => {
        // Smart retry logic
        if (error?.status === 404 || error?.status === 403) {
          return false; // Don't retry for client errors
        }
        // Don't retry on 4xx errors
        if (
          error &&
          typeof error === 'object' &&
          'response' in error &&
          error.response &&
          typeof error.response === 'object' &&
          'status' in error.response &&
          typeof error.response.status === 'number'
        ) {
          if (error.response.status >= 400 && error.response.status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      // Network mode for offline support
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

/**
 * Query keys factory for consistent caching
 */
export const queryKeys = {
  // User queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },

  // Project queries
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    search: (query: string, filters: Record<string, any>) =>
      [...queryKeys.projects.all, 'search', query, filters] as const,
    popular: () => [...queryKeys.projects.all, 'popular'] as const,
    bookmarked: () => [...queryKeys.projects.all, 'bookmarked'] as const,
  },

  // AI Assistant queries
  aiAssistant: {
    all: ['ai-assistant'] as const,
    conversations: () => [...queryKeys.aiAssistant.all, 'conversations'] as const,
    conversation: (id: string) => [...queryKeys.aiAssistant.conversations(), id] as const,
    messages: (conversationId: string) =>
      [...queryKeys.aiAssistant.conversation(conversationId), 'messages'] as const,
    bookmarkedMessages: () => [...queryKeys.aiAssistant.all, 'bookmarked-messages'] as const,
  },

  // Bookmark queries
  bookmarks: {
    all: ['bookmarks'] as const,
    lists: () => [...queryKeys.bookmarks.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.bookmarks.lists(), filters] as const,
    categories: () => [...queryKeys.bookmarks.all, 'categories'] as const,
  },

  // Milestone queries
  milestones: {
    all: ['milestones'] as const,
    lists: () => [...queryKeys.milestones.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.milestones.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.milestones.all, 'detail', id] as const,
    templates: () => [...queryKeys.milestones.all, 'templates'] as const,
  },

  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    student: () => [...queryKeys.dashboard.all, 'student'] as const,
    supervisor: () => [...queryKeys.dashboard.all, 'supervisor'] as const,
    admin: () => [...queryKeys.dashboard.all, 'admin'] as const,
    analytics: (role: string, timeRange: string) =>
      [...queryKeys.dashboard.all, 'analytics', role, timeRange] as const,
  },

  // Recommendation queries
  recommendations: {
    all: ['recommendations'] as const,
    projects: () => [...queryKeys.recommendations.all, 'projects'] as const,
    milestones: () => [...queryKeys.recommendations.all, 'milestones'] as const,
  },

  // Admin queries
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    projects: () => [...queryKeys.admin.all, 'projects'] as const,
    analytics: () => [...queryKeys.admin.all, 'analytics'] as const,
    systemHealth: () => [...queryKeys.admin.all, 'system-health'] as const,
  },

  // Supervisor queries
  supervisor: {
    all: ['supervisor'] as const,
    students: () => [...queryKeys.supervisor.all, 'students'] as const,
    projects: () => [...queryKeys.supervisor.all, 'projects'] as const,
    analytics: () => [...queryKeys.supervisor.all, 'analytics'] as const,
    aiInteractions: () => [...queryKeys.supervisor.all, 'ai-interactions'] as const,
  },
} as const;

/**
 * Cache invalidation utilities
 */
export const cacheUtils = {
  // Invalidate all user-related queries
  invalidateUser: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
  },

  // Invalidate project queries
  invalidateProjects: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  },

  // Invalidate specific project
  invalidateProject: (id: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
  },

  // Invalidate bookmarks
  invalidateBookmarks: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks.all });
  },

  // Invalidate AI assistant queries
  invalidateAIAssistant: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.aiAssistant.all });
  },

  // Invalidate dashboard queries
  invalidateDashboard: (role?: string) => {
    if (role) {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.dashboard.all, role] });
    } else {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    }
  },

  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },

  // Remove specific queries from cache
  removeQueries: (queryKey: readonly unknown[]) => {
    queryClient.removeQueries({ queryKey });
  },
};
