# API Integration Documentation

This document provides comprehensive documentation for API integration in the ProjectHub frontend application.

## Table of Contents

- [API Client Configuration](#api-client-configuration)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [State Management](#state-management)
- [API Endpoints](#api-endpoints)
- [Type Definitions](#type-definitions)
- [Usage Examples](#usage-examples)
- [Testing API Integration](#testing-api-integration)

## API Client Configuration

### Base Configuration

**Location**: `src/lib/api.ts`

The API client is built using Axios with interceptors for authentication and error handling.

```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Request Interceptor

Automatically adds authentication tokens to requests:

```typescript
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

### Response Interceptor

Handles token refresh and error responses:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await refreshAuthToken();
        const token = getAuthToken();
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Authentication

### Auth Service

**Location**: `src/lib/auth.ts`

Handles authentication-related API calls and token management.

```typescript
interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  role: 'student' | 'supervisor';
  profile: StudentProfileData | SupervisorProfileData;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  }

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token });
  }

  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, newPassword });
  }
}

export const authService = new AuthService();
```

### Token Management

```typescript
const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearAuthTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
```

## Error Handling

### Error Types

```typescript
interface APIError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}

interface ValidationError extends APIError {
  statusCode: 400;
  details: {
    field: string;
    message: string;
  }[];
}

interface AuthenticationError extends APIError {
  statusCode: 401;
  message: 'Unauthorized' | 'Token expired' | 'Invalid credentials';
}

interface ForbiddenError extends APIError {
  statusCode: 403;
  message: 'Forbidden' | 'Insufficient permissions';
}
```

### Error Handler Utility

```typescript
export class APIErrorHandler {
  static handle(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const apiError = error.response?.data as APIError;
      
      switch (apiError?.statusCode) {
        case 400:
          return this.handleValidationError(apiError as ValidationError);
        case 401:
          return 'Please log in to continue';
        case 403:
          return 'You don\'t have permission to perform this action';
        case 404:
          return 'The requested resource was not found';
        case 409:
          return 'This action conflicts with existing data';
        case 429:
          return 'Too many requests. Please wait and try again';
        case 500:
          return 'Server error. Please try again later';
        default:
          return apiError?.message || 'An unexpected error occurred';
      }
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }

  private static handleValidationError(error: ValidationError): string {
    if (error.details && error.details.length > 0) {
      return error.details.map(detail => detail.message).join(', ');
    }
    return error.message;
  }
}
```

## State Management

### TanStack Query Integration

**Location**: `src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
```

### Query Keys

**Location**: `src/lib/query-keys.ts`

```typescript
export const queryKeys = {
  // Authentication
  auth: {
    user: ['auth', 'user'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  
  // Projects
  projects: {
    all: ['projects'] as const,
    search: (params: ProjectSearchParams) => ['projects', 'search', params] as const,
    detail: (id: string) => ['projects', 'detail', id] as const,
    popular: ['projects', 'popular'] as const,
    supervisor: (supervisorId: string) => ['projects', 'supervisor', supervisorId] as const,
  },
  
  // AI Assistant
  ai: {
    conversations: ['ai', 'conversations'] as const,
    conversation: (id: string) => ['ai', 'conversation', id] as const,
    messages: (conversationId: string) => ['ai', 'messages', conversationId] as const,
    bookmarked: ['ai', 'bookmarked'] as const,
  },
  
  // Bookmarks
  bookmarks: {
    all: ['bookmarks'] as const,
    categories: ['bookmarks', 'categories'] as const,
    byCategory: (categoryId: string) => ['bookmarks', 'category', categoryId] as const,
  },
  
  // Milestones
  milestones: {
    all: ['milestones'] as const,
    project: (projectId: string) => ['milestones', 'project', projectId] as const,
    user: (userId: string) => ['milestones', 'user', userId] as const,
  },
  
  // Recommendations
  recommendations: {
    projects: ['recommendations', 'projects'] as const,
    milestones: ['recommendations', 'milestones'] as const,
  },
};
```

## API Endpoints

### Authentication Endpoints

```typescript
// POST /auth/login
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// POST /auth/register
interface RegisterRequest {
  email: string;
  password: string;
  role: 'student' | 'supervisor';
  profile: StudentProfileData | SupervisorProfileData;
}

// POST /auth/refresh
interface RefreshRequest {
  refreshToken: string;
}

// POST /auth/verify-email
interface VerifyEmailRequest {
  token: string;
}

// POST /auth/forgot-password
interface ForgotPasswordRequest {
  email: string;
}

// POST /auth/reset-password
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}
```

### Project Endpoints

```typescript
// GET /projects
interface ProjectSearchParams {
  query?: string;
  specialization?: string;
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
  year?: number;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

interface ProjectSearchResponse {
  projects: Project[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// GET /projects/:id
interface ProjectDetailResponse {
  project: Project;
  relatedProjects: Project[];
  isBookmarked: boolean;
}

// POST /projects (Supervisor only)
interface CreateProjectRequest {
  title: string;
  abstract: string;
  specialization: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  year: number;
  tags: string[];
  technologyStack: string[];
  isGroupProject: boolean;
  githubUrl?: string;
  demoUrl?: string;
}

// PUT /projects/:id (Supervisor only)
interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}
```

### AI Assistant Endpoints

```typescript
// GET /ai/conversations
interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
}

// POST /ai/conversations
interface CreateConversationRequest {
  title?: string;
  projectId?: string;
  language?: string;
}

// GET /ai/conversations/:id/messages
interface MessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

// POST /ai/conversations/:id/messages
interface SendMessageRequest {
  content: string;
  context?: {
    projectId?: string;
    milestoneId?: string;
  };
}

interface SendMessageResponse {
  message: Message;
  suggestedFollowUps?: string[];
}

// POST /ai/messages/:id/bookmark
interface BookmarkMessageRequest {
  category?: string;
  notes?: string;
}

// POST /ai/messages/:id/rate
interface RateMessageRequest {
  rating: number; // 1-5
  feedback?: string;
}
```

### Bookmark Endpoints

```typescript
// GET /bookmarks
interface BookmarksResponse {
  bookmarks: Bookmark[];
  categories: BookmarkCategory[];
}

// POST /bookmarks
interface CreateBookmarkRequest {
  projectId: string;
  categoryId?: string;
  notes?: string;
}

// DELETE /bookmarks/:id
// No request body required

// GET /bookmarks/categories
interface CategoriesResponse {
  categories: BookmarkCategory[];
}

// POST /bookmarks/categories
interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}
```

### Milestone Endpoints

```typescript
// GET /milestones
interface MilestonesParams {
  projectId?: string;
  status?: MilestoneStatus;
  priority?: 'low' | 'medium' | 'high';
  dueBefore?: string;
  dueAfter?: string;
}

interface MilestonesResponse {
  milestones: Milestone[];
  total: number;
}

// POST /milestones
interface CreateMilestoneRequest {
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  projectId?: string;
  tags?: string[];
}

// PUT /milestones/:id
interface UpdateMilestoneRequest extends Partial<CreateMilestoneRequest> {
  status?: MilestoneStatus;
  progress?: number;
}

// DELETE /milestones/:id
// No request body required
```

## Type Definitions

### Core Types

```typescript
interface User {
  id: string;
  email: string;
  role: 'student' | 'supervisor' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  profile: StudentProfile | SupervisorProfile | AdminProfile;
  createdAt: string;
  updatedAt: string;
}

interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  specialization: string;
  year: number;
  interests: string[];
  skills: string[];
  profileUpdatedAt: string;
}

interface SupervisorProfile {
  id: string;
  name: string;
  specializations: string[];
  isAvailable: boolean;
  capacity: number;
  profileUpdatedAt: string;
}

interface Project {
  id: string;
  title: string;
  abstract: string;
  specialization: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  year: number;
  tags: string[];
  technologyStack: string[];
  isGroupProject: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'archived';
  githubUrl?: string;
  demoUrl?: string;
  supervisor: {
    id: string;
    name: string;
    specializations: string[];
  };
  viewCount: number;
  bookmarkCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Conversation {
  id: string;
  studentId: string;
  title: string;
  status: 'active' | 'archived' | 'escalated';
  projectId?: string;
  language: string;
  messageCount: number;
  messages: Message[];
  createdAt: string;
  lastMessageAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'error';
  confidenceScore?: number;
  sources?: Source[];
  suggestedFollowUps?: string[];
  isBookmarked: boolean;
  averageRating: number;
  metadata?: {
    processingTime?: number;
    language?: string;
    category?: string;
    requiresHumanReview?: boolean;
  };
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  projectId?: string;
  tags: string[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface Bookmark {
  id: string;
  projectId: string;
  notes?: string;
  category?: BookmarkCategory;
  createdAt: string;
  project: Project;
}

interface BookmarkCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  bookmarkCount: number;
}
```

## Usage Examples

### Authentication

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { authService } from '@/lib/auth';
import { queryKeys } from '@/lib/query-keys';

// Login mutation
const loginMutation = useMutation({
  mutationFn: authService.login,
  onSuccess: (data) => {
    setAuthToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    queryClient.setQueryData(queryKeys.auth.user, data.user);
  },
  onError: (error) => {
    console.error('Login failed:', APIErrorHandler.handle(error));
  },
});

// Get current user
const { data: user, isLoading } = useQuery({
  queryKey: queryKeys.auth.user,
  queryFn: () => authService.getCurrentUser(),
  enabled: !!getAuthToken(),
});
```

### Project Search

```typescript
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/lib/projects';
import { queryKeys } from '@/lib/query-keys';

const ProjectSearch = () => {
  const [searchParams, setSearchParams] = useState<ProjectSearchParams>({
    query: '',
    page: 1,
    limit: 20,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.projects.search(searchParams),
    queryFn: () => projectService.searchProjects(searchParams),
    enabled: searchParams.query.length > 0,
  });

  return (
    <div>
      <SearchInput
        value={searchParams.query}
        onChange={(query) => setSearchParams(prev => ({ ...prev, query, page: 1 }))}
      />
      
      {isLoading && <LoadingSpinner />}
      {error && <ErrorMessage error={APIErrorHandler.handle(error)} />}
      
      {data && (
        <ProjectGrid
          projects={data.projects}
          total={data.total}
          page={data.page}
          onPageChange={(page) => setSearchParams(prev => ({ ...prev, page }))}
        />
      )}
    </div>
  );
};
```

### AI Assistant

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { aiService } from '@/lib/ai';
import { queryKeys } from '@/lib/query-keys';

const ChatInterface = ({ conversationId }: { conversationId: string }) => {
  const { data: messages, isLoading } = useQuery({
    queryKey: queryKeys.ai.messages(conversationId),
    queryFn: () => aiService.getMessages(conversationId),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => aiService.sendMessage(conversationId, content),
    onSuccess: (newMessage) => {
      queryClient.setQueryData(
        queryKeys.ai.messages(conversationId),
        (old: Message[]) => [...(old || []), newMessage]
      );
    },
  });

  const handleSendMessage = (content: string) => {
    sendMessageMutation.mutate(content);
  };

  return (
    <div>
      <MessageList messages={messages || []} loading={isLoading} />
      <MessageInput
        onSend={handleSendMessage}
        disabled={sendMessageMutation.isPending}
      />
    </div>
  );
};
```

### Error Handling with React Error Boundary

```typescript
import { ErrorBoundary } from 'react-error-boundary';
import { APIErrorHandler } from '@/lib/error-handler';

const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <div className="p-6 text-center">
    <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
    <p className="text-gray-600 mb-4">{APIErrorHandler.handle(error)}</p>
    <Button onClick={resetErrorBoundary}>Try again</Button>
  </div>
);

const App = () => (
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <YourAppContent />
  </ErrorBoundary>
);
```

## Testing API Integration

### Mock API Responses

```typescript
// __mocks__/api.ts
export const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

// Mock successful responses
mockApiClient.get.mockResolvedValue({
  data: {
    projects: [],
    total: 0,
  },
});
```

### Testing with MSW (Mock Service Worker)

```typescript
// __mocks__/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        user: { id: '1', email: 'test@example.com', role: 'student' },
        accessToken: 'mock-token',
        refreshToken: 'mock-refresh-token',
      })
    );
  }),

  rest.get('/api/projects', (req, res, ctx) => {
    return res(
      ctx.json({
        projects: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      })
    );
  }),
];
```

### Integration Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectSearch } from '@/components/features/projects/ProjectSearch';

describe('Project Search Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('searches for projects successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ProjectSearch />
      </QueryClientProvider>
    );

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'machine learning' } });

    await waitFor(() => {
      expect(screen.getByText('No projects found')).toBeInTheDocument();
    });
  });
});
```

## Best Practices

### API Client Usage

1. **Always use TypeScript interfaces** for request/response types
2. **Handle errors gracefully** with proper user feedback
3. **Implement proper loading states** for better UX
4. **Use React Query for caching** and background updates
5. **Implement optimistic updates** where appropriate
6. **Add proper retry logic** for failed requests
7. **Use proper query keys** for cache invalidation

### Security

1. **Never store sensitive data** in localStorage
2. **Implement proper token refresh** logic
3. **Validate all user inputs** before sending to API
4. **Use HTTPS** in production
5. **Implement proper CORS** configuration
6. **Add rate limiting** on the client side

### Performance

1. **Use pagination** for large datasets
2. **Implement debouncing** for search inputs
3. **Cache frequently accessed data** with React Query
4. **Use proper loading states** to prevent multiple requests
5. **Implement virtual scrolling** for large lists
6. **Optimize bundle size** by code splitting API services

For more information about the backend API, see the [Backend API Documentation](../../docs/api-documentation.md).