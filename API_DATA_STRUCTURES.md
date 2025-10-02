# API Data Structures & Response Types

## 📋 Complete Data Models for All Endpoints

---

## 🔐 **Authentication Endpoints**

### **POST /auth/register**
```typescript
// Request
interface RegisterRequest {
  email: string;
  password: string;
  role: 'student' | 'supervisor' | 'admin';
  name: string;
}

// Response
interface RegisterResponse {
  user: {
    id: string;
    email: string;
    role: 'student' | 'supervisor' | 'admin';
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}
```

### **POST /auth/login**
```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
}

// Response
interface LoginResponse {
  user: {
    id: string;
    email: string;
    role: 'student' | 'supervisor' | 'admin';
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}
```

### **POST /auth/refresh**
```typescript
// Request
interface RefreshTokenRequest {
  refreshToken: string;
}

// Response
interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}
```

---

## 🔍 **Project Discovery Endpoints**

### **GET /projects**
```typescript
// Query Parameters
interface ProjectSearchParams {
  query?: string;
  specializations?: string[];
  difficultyLevels?: ('beginner' | 'intermediate' | 'advanced')[];
  yearFrom?: number;
  yearTo?: number;
  tags?: string[];
  isGroupProject?: boolean;
  limit?: number; // max 100
  offset?: number;
  sortBy?: 'relevance' | 'date' | 'title' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

// Response
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

interface ProjectSummary {
  id: string;
  title: string;
  abstract: string; // truncated to 200 chars
  specialization: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  year: number;
  tags: string[];
  technologyStack: string[];
  isGroupProject: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'archived';
  supervisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  approvedAt: string | null;
  relevanceScore?: number; // only in search results
  highlightedTitle?: string; // only in search results
  highlightedAbstract?: string; // only in search results
}
```

### **GET /projects/popular**
```typescript
// Query Parameters
interface PopularProjectsParams {
  limit?: number; // max 50
}

// Response
interface PopularProjectsResponse {
  projects: ProjectSummary[];
}
```

### **GET /projects/:id**
```typescript
// Response
interface ProjectDetail {
  id: string;
  title: string;
  abstract: string; // full text
  specialization: string;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  year: number;
  tags: string[];
  technologyStack: string[];
  isGroupProject: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'archived';
  githubUrl: string | null;
  demoUrl: string | null;
  notes: string | null;
  supervisor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    specializations: string[];
  };
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  viewCount?: number;
  bookmarkCount?: number;
}
```

---

## 📚 **Bookmark Management Endpoints**

### **POST /bookmarks**
```typescript
// Request
interface CreateBookmarkRequest {
  projectId: string;
  notes?: string;
  categoryId?: string;
}

// Response
interface BookmarkResponse {
  id: string;
  projectId: string;
  createdAt: string;
  project?: ProjectSummary;
}
```

### **GET /bookmarks**
```typescript
// Query Parameters
interface BookmarkQueryParams {
  categoryId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'title' | 'category';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Response
interface BookmarksResponse {
  bookmarks: BookmarkResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### **GET /bookmarks/check/:projectId**
```typescript
// Response
interface BookmarkStatusResponse {
  isBookmarked: boolean;
}
```

### **POST /bookmarks/categories**
```typescript
// Request
interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

// Response
interface BookmarkCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  bookmarkCount: number;
}
```

---

## 🤖 **AI Assistant Endpoints**

### **POST /ai-assistant/conversations**
```typescript
// Request
interface CreateConversationRequest {
  title?: string;
  projectId?: string;
  language?: string;
  initialQuery?: string;
}

// Response
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

### **POST /ai-assistant/ask**
```typescript
// Request
interface AskQuestionRequest {
  query: string;
  conversationId?: string;
  language?: string;
  includeProjectContext?: boolean;
}

// Response
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
```

### **GET /ai-assistant/conversations/:id/messages**
```typescript
// Response
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

---

## 🎯 **Milestone Management Endpoints**

### **POST /milestones**
```typescript
// Request
interface CreateMilestoneRequest {
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  projectId?: string;
  tags?: string[];
  estimatedHours?: number;
}

// Response
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
  estimatedHours: number;
  actualHours: number;
  createdAt: string;
  updatedAt: string;
}
```

### **GET /milestones**
```typescript
// Response
interface MilestonesResponse {
  milestones: MilestoneResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

---

## 💡 **Recommendations Endpoints**

### **GET /recommendations**
```typescript
// Response
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

---

## 👤 **User Profile Endpoints**

### **GET /users/profile**
```typescript
// Response
interface UserProfileResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    role: 'student' | 'supervisor' | 'admin';
    isEmailVerified: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    studentProfile?: {
      id: string;
      name: string;
      skills: string[];
      interests: string[];
      preferredSpecializations: string[];
      currentYear?: number;
      gpa?: number;
      profileUpdatedAt: string;
    };
    supervisorProfile?: {
      id: string;
      name: string;
      specializations: string[];
      maxStudents: number;
      isAvailable: boolean;
      officeLocation?: string;
      phoneNumber?: string;
    };
  };
}
```

---

## 📊 **Common Data Types**

### **Pagination**
```typescript
interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}
```

### **Error Response**
```typescript
interface APIError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path: string;
}
```

### **Enums**
```typescript
enum UserRole {
  STUDENT = 'student',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin'
}

enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}

enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}
```