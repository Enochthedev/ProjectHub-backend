# ProjectHub Frontend API Documentation

## Overview
This is a comprehensive guide for building the frontend for the ProjectHub platform - a Final Year Project (FYP) management system with AI-powered assistance. The backend provides a robust REST API with authentication, project management, AI assistant, bookmarks, milestones, and administrative features.

## Base Configuration

### API Base URL
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### Authentication Headers
```typescript
const authHeaders = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## Core User Flows

### 1. Authentication Flow

#### Registration
```typescript
// POST /auth/register
interface RegisterRequest {
  email: string;
  password: string;
  role: 'student' | 'supervisor' | 'admin';
  name: string;
  // Additional fields based on role
}

interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
```

#### Login
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
```

#### Token Refresh
```typescript
// POST /auth/refresh
interface RefreshRequest {
  refreshToken: string;
}
```

### 2. Project Discovery & Search Flow

#### Main Project Search
```typescript
// GET /projects
interface ProjectSearchParams {
  query?: string;                    // Full-text search
  specializations?: string[];        // Filter by specializations
  difficultyLevels?: string[];      // 'beginner' | 'intermediate' | 'advanced'
  yearFrom?: number;                // Filter from year
  yearTo?: number;                  // Filter to year
  tags?: string[];                  // Filter by tags
  isGroupProject?: boolean;         // Group project filter
  limit?: number;                   // Max 100
  offset?: number;                  // Pagination
  sortBy?: 'relevance' | 'date' | 'title' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

interface ProjectSearchResponse {
  projects: ProjectSummary[];
  total: number;
  hasMore: boolean;
  filters: {
    availableSpecializations: string[];
    availableTags: string[];
    yearRange: { min: number; max: number; };
  };
}
```

#### Popular Projects
```typescript
// GET /projects/popular?limit=10
interface PopularProjectsResponse {
  projects: ProjectSummary[];
}
```

#### Project Details
```typescript
// GET /projects/:id
interface ProjectDetail {
  id: string;
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
```

#### Related Projects
```typescript
// GET /projects/:id/suggestions?limit=5
interface RelatedProjectsResponse {
  projects: ProjectSummary[];
}
```

### 3. Bookmark Management Flow

#### Create Bookmark
```typescript
// POST /bookmarks
interface CreateBookmarkRequest {
  projectId: string;
  notes?: string;
  categoryId?: string;
}

interface BookmarkResponse {
  id: string;
  projectId: string;
  notes?: string;
  category?: BookmarkCategory;
  createdAt: string;
  project: ProjectSummary;
}
```

#### Get User Bookmarks
```typescript
// GET /bookmarks
interface BookmarkQueryParams {
  categoryId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'title' | 'category';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

interface BookmarksResponse {
  bookmarks: BookmarkResponse[];
  total: number;
  hasMore: boolean;
  categories: BookmarkCategory[];
}
```

#### Check Bookmark Status
```typescript
// GET /bookmarks/check/:projectId
interface BookmarkStatusResponse {
  isBookmarked: boolean;
}
```

#### Bookmark Categories
```typescript
// POST /bookmarks/categories
interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

// GET /bookmarks/categories
interface BookmarkCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  bookmarkCount: number;
}
```

#### Compare Projects
```typescript
// POST /bookmarks/compare
interface CompareProjectsRequest {
  projectIds: string[]; // Max 3-4 projects
}

interface ProjectComparisonResponse {
  projects: ProjectDetail[];
  comparison: {
    similarities: string[];
    differences: {
      field: string;
      values: { [projectId: string]: any };
    }[];
  };
}
```

### 4. AI Assistant Flow

#### Create Conversation
```typescript
// POST /ai-assistant/conversations
interface CreateConversationRequest {
  title?: string;
  projectId?: string;
  language?: string;
  initialQuery?: string;
}

interface ConversationResponse {
  id: string;
  studentId: string;
  title: string;
  status: 'active' | 'archived' | 'escalated';
  projectId?: string;
  language: string;
  messageCount: number;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}
```

#### Get Conversations
```typescript
// GET /ai-assistant/conversations
interface ConversationListParams {
  status?: 'active' | 'archived' | 'escalated';
  projectId?: string;
  language?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
```

#### Ask AI Assistant
```typescript
// POST /ai-assistant/ask
interface AskQuestionRequest {
  query: string;
  conversationId?: string;
  language?: string;
  includeProjectContext?: boolean;
}

interface AssistantResponse {
  response: string;
  confidenceScore: number;
  sources: {
    type: 'knowledge_base' | 'template' | 'project';
    title: string;
    url?: string;
    relevance: number;
  }[];
  conversationId: string;
  messageId: string;
  fromAI: boolean;
  suggestedFollowUps?: string[];
  escalationSuggestion?: string;
  metadata: {
    processingTime: number;
    language: string;
    category: string;
    requiresHumanReview: boolean;
  };
}

// Frontend Implementation with Typing Indicators
const sendMessage = async (query: string) => {
  // 1. Show user message immediately
  addUserMessage(query);
  
  // 2. Show AI typing indicator
  setIsAITyping(true);
  
  try {
    const response = await fetch('/ai-assistant/ask', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversationId, language: 'en' })
    });
    
    const aiResponse: AssistantResponse = await response.json();
    
    // 3. Calculate realistic typing delay (15ms per character, 1-5 second range)
    const typingDelay = Math.min(Math.max(aiResponse.response.length * 15, 1000), 5000);
    
    // 4. Show response after delay
    setTimeout(() => {
      setIsAITyping(false);
      addAIMessage(aiResponse);
    }, typingDelay);
    
  } catch (error) {
    setIsAITyping(false);
    showErrorMessage('Sorry, I encountered an error. Please try again.');
  }
};
```

#### Get Conversation Messages
```typescript
// GET /ai-assistant/conversations/:id/messages
interface ConversationMessagesResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

interface Message {
  id: string;
  conversationId: string;
  type: 'user' | 'assistant';
  content: string;
  metadata?: any;
  confidenceScore?: number;
  sources?: Source[];
  isBookmarked: boolean;
  status: 'sent' | 'delivered' | 'read';
  averageRating: number;
  ratingCount: number;
  createdAt: string;
}
```

#### Bookmark & Rate Messages
```typescript
// POST /ai-assistant/messages/:id/bookmark
interface BookmarkMessageRequest {
  note?: string;
}

// POST /ai-assistant/messages/:id/rate
interface RateMessageRequest {
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
}
```

#### Search Knowledge Base
```typescript
// GET /ai-assistant/knowledge/search
interface KnowledgeSearchParams {
  query: string;
  category?: string;
  language?: string;
  limit?: number;
}
```

#### Milestone Guidance
```typescript
// GET /ai-assistant/milestone-guidance/deadline-awareness
interface MilestoneDeadlineAwareness {
  milestoneId: string;
  title: string;
  dueDate: string;
  daysUntilDue: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  guidance: string;
  suggestedActions: string[];
}

// GET /ai-assistant/milestone-guidance/priority-guidance
interface PriorityGuidance {
  milestoneId: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  guidance: string;
  actionItems: string[];
}

// GET /ai-assistant/milestone-guidance/proactive-suggestions
interface ProactiveSuggestion {
  type: 'milestone' | 'project' | 'resource';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
}
```

### 5. Milestone Management Flow

#### Create Milestone
```typescript
// POST /milestones
interface CreateMilestoneRequest {
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  projectId?: string;
  tags?: string[];
}

interface MilestoneResponse {
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
```

#### Get User Milestones
```typescript
// GET /milestones
interface MilestoneQueryParams {
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority?: 'low' | 'medium' | 'high';
  projectId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  limit?: number;
  offset?: number;
}
```

#### Update Milestone Status
```typescript
// PATCH /milestones/:id/status
interface UpdateMilestoneStatusRequest {
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  progress?: number;
  notes?: string;
}
```

#### Milestone Templates
```typescript
// GET /templates
interface MilestoneTemplate {
  id: string;
  name: string;
  description: string;
  projectType: string;
  milestones: {
    title: string;
    description: string;
    estimatedDuration: number;
    dependencies: string[];
  }[];
  tags: string[];
  usageCount: number;
}

// POST /milestones/apply-template
interface ApplyTemplateRequest {
  templateId: string;
  projectId?: string;
  startDate: string;
  customizations?: {
    milestoneId: string;
    title?: string;
    dueDate?: string;
  }[];
}
```

### 6. Recommendations Flow

#### Get Recommendations
```typescript
// GET /recommendations
interface RecommendationParams {
  type?: 'project' | 'milestone' | 'resource';
  limit?: number;
  includeExplanation?: boolean;
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  total: number;
  refreshedAt: string;
  nextRefreshAt: string;
}

interface Recommendation {
  id: string;
  type: 'project' | 'milestone' | 'resource';
  title: string;
  description: string;
  confidenceScore: number;
  reasoning: string[];
  targetItem: {
    id: string;
    type: string;
    title: string;
    url?: string;
  };
  metadata: {
    algorithm: string;
    factors: string[];
    createdAt: string;
  };
}
```

#### Recommendation Feedback
```typescript
// POST /recommendations/:id/feedback
interface RecommendationFeedbackRequest {
  feedbackType: 'helpful' | 'not_helpful' | 'irrelevant' | 'already_known';
  rating?: 1 | 2 | 3 | 4 | 5;
  comments?: string;
}
```

#### Refresh Recommendations
```typescript
// POST /recommendations/refresh
interface RefreshRecommendationsRequest {
  forceRefresh?: boolean;
  types?: ('project' | 'milestone' | 'resource')[];
}
```

## Component Architecture Suggestions

### 1. Layout Components
```typescript
// Layout wrapper with navigation
interface LayoutProps {
  children: React.ReactNode;
  user: User;
  currentPath: string;
}

// Navigation with role-based menu items
interface NavigationProps {
  user: User;
  onLogout: () => void;
}
```

### 2. Project Components
```typescript
// Project search with filters
interface ProjectSearchProps {
  onSearch: (params: ProjectSearchParams) => void;
  loading: boolean;
  filters: SearchFilters;
}

// Project card for listings
interface ProjectCardProps {
  project: ProjectSummary;
  isBookmarked: boolean;
  onBookmark: (projectId: string) => void;
  onView: (projectId: string) => void;
}

// Project detail view
interface ProjectDetailProps {
  project: ProjectDetail;
  relatedProjects: ProjectSummary[];
  isBookmarked: boolean;
  onBookmark: () => void;
}
```

### 3. AI Assistant Components
```typescript
// Enhanced chat interface with typing indicators
interface ChatInterfaceProps {
  conversationId?: string;
  onSendMessage: (message: string) => void;
  messages: Message[];
  loading: boolean;
  isAITyping: boolean;
  onBookmark: (messageId: string) => void;
  onRate: (messageId: string, rating: number) => void;
}

// Message component with enhanced features
interface MessageProps {
  message: Message;
  onBookmark: (messageId: string) => void;
  onRate: (messageId: string, rating: number) => void;
  onFollowUp?: (question: string) => void;
}

// Typing indicator component
interface TypingIndicatorProps {
  avatar?: string;
  text?: string;
  animated?: boolean;
}

// Conversation sidebar with unread indicators
interface ConversationSidebarProps {
  conversations: ConversationResponse[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  unreadCounts: { [conversationId: string]: number };
}

// Enhanced message interface
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
```

### 4. Bookmark Components
```typescript
// Bookmark manager
interface BookmarkManagerProps {
  bookmarks: BookmarkResponse[];
  categories: BookmarkCategory[];
  onCategoryChange: (bookmarkId: string, categoryId: string) => void;
  onRemove: (bookmarkId: string) => void;
}

// Project comparison
interface ProjectComparisonProps {
  projects: ProjectDetail[];
  comparison: ProjectComparisonResponse['comparison'];
}
```

### 5. Milestone Components
```typescript
// Milestone dashboard
interface MilestoneDashboardProps {
  milestones: MilestoneResponse[];
  upcomingDeadlines: MilestoneDeadlineAwareness[];
  priorityGuidance: PriorityGuidance[];
}

// Milestone card
interface MilestoneCardProps {
  milestone: MilestoneResponse;
  onStatusUpdate: (id: string, status: string) => void;
  onEdit: (id: string) => void;
}
```

## State Management Suggestions

### 1. Authentication State
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;
}

const authActions = {
  login: (credentials: LoginRequest) => void;
  logout: () => void;
  refreshToken: () => void;
  updateProfile: (updates: Partial<User>) => void;
};
```

### 2. Project State
```typescript
interface ProjectState {
  searchResults: ProjectSearchResponse | null;
  currentProject: ProjectDetail | null;
  popularProjects: ProjectSummary[];
  searchFilters: ProjectSearchParams;
  loading: boolean;
  error: string | null;
}
```

### 3. AI Assistant State
```typescript
interface AIAssistantState {
  conversations: ConversationResponse[];
  activeConversation: ConversationResponse | null;
  messages: Message[];
  isTyping: boolean;
  error: string | null;
}
```

### 4. Bookmark State
```typescript
interface BookmarkState {
  bookmarks: BookmarkResponse[];
  categories: BookmarkCategory[];
  bookmarkedProjectIds: Set<string>;
  loading: boolean;
  error: string | null;
}
```

## Error Handling

### Standard Error Response
```typescript
interface APIError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}
```

### Error Handling Patterns
```typescript
// API client with error handling
class APIClient {
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...authHeaders,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error: APIError = await response.json();
        throw new APIError(error.message, error.statusCode);
      }

      return response.json();
    } catch (error) {
      // Handle network errors, token expiry, etc.
      throw error;
    }
  }
}
```

## Real-time Features

### WebSocket Events (if implemented)
```typescript
interface WebSocketEvents {
  'new_message': { conversationId: string; message: Message };
  'milestone_reminder': { milestone: MilestoneResponse };
  'recommendation_update': { recommendations: Recommendation[] };
  'project_view_update': { projectId: string; viewCount: number };
}
```

## Security Considerations

### 1. Token Management
- Store tokens securely (httpOnly cookies or secure storage)
- Implement automatic token refresh
- Handle token expiry gracefully

### 2. Input Validation
- Sanitize all user inputs
- Validate data on both client and server
- Implement rate limiting awareness

### 3. Route Protection
```typescript
// Protected route wrapper
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  fallback?: React.ReactNode;
}
```

## Performance Optimization

### 1. Pagination
- Implement infinite scroll for project listings
- Use cursor-based pagination for real-time data
- Cache search results appropriately

### 2. Caching Strategy
- Cache project details and search results
- Implement stale-while-revalidate for bookmarks
- Use optimistic updates for user interactions

### 3. Code Splitting
- Lazy load AI assistant components
- Split admin features into separate bundles
- Implement route-based code splitting

## Accessibility

### 1. ARIA Labels
- Proper labeling for search filters
- Screen reader support for chat interface
- Keyboard navigation for all components

### 2. Color and Contrast
- High contrast mode support
- Color-blind friendly design
- Focus indicators for all interactive elements

This documentation provides a comprehensive foundation for building the ProjectHub frontend with proper integration to all backend endpoints and features.