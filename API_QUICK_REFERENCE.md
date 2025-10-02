# ProjectHub API Quick Reference

## Authentication Endpoints
```
POST /auth/register          - User registration
POST /auth/login             - User login
POST /auth/refresh           - Refresh access token
POST /auth/logout            - Logout user
POST /auth/logout-all        - Logout from all devices
GET  /auth/verify-email      - Verify email address
POST /auth/forgot-password   - Request password reset
POST /auth/reset-password    - Reset password
```

## Project Endpoints
```
GET  /projects               - Search/browse projects (public)
GET  /projects/popular       - Get popular projects (public)
GET  /projects/:id           - Get project details (auth required)
GET  /projects/:id/suggestions - Get related projects (public)

POST /projects               - Create project (supervisor)
PUT  /projects/:id           - Update project (supervisor)
GET  /projects/my-projects   - Get supervisor's projects
```

## Bookmark Endpoints
```
POST   /bookmarks            - Create bookmark
DELETE /bookmarks/:id        - Remove bookmark
GET    /bookmarks            - Get user bookmarks
GET    /bookmarks/check/:projectId - Check if bookmarked
POST   /bookmarks/compare    - Compare projects

POST   /bookmarks/categories - Create category
GET    /bookmarks/categories - Get categories
PUT    /bookmarks/categories/:id - Update category
DELETE /bookmarks/categories/:id - Delete category
PATCH  /bookmarks/assign-category - Assign bookmark to category
```

## AI Assistant Endpoints
```
POST   /ai-assistant/conversations     - Create conversation
GET    /ai-assistant/conversations     - Get user conversations
GET    /ai-assistant/conversations/:id/messages - Get messages
DELETE /ai-assistant/conversations/:id - Delete conversation
POST   /ai-assistant/ask               - Ask AI question (with typing indicators)

POST /ai-assistant/messages/:id/bookmark - Bookmark message
POST /ai-assistant/messages/:id/rate     - Rate message
GET  /ai-assistant/messages/bookmarked   - Get bookmarked messages

GET  /ai-assistant/knowledge/search      - Search knowledge base

# AI Milestone Guidance
GET  /ai-assistant/milestone-guidance/deadline-awareness
GET  /ai-assistant/milestone-guidance/priority-guidance
GET  /ai-assistant/milestone-guidance/proactive-suggestions
GET  /ai-assistant/milestone-guidance/timeline-analysis
```

### AI Chat Implementation Notes
```typescript
// Frontend typing indicator flow:
// 1. User sends message → Show immediately
// 2. Call POST /ai-assistant/ask → Show typing indicator
// 3. Calculate delay: Math.min(Math.max(response.length * 15, 1000), 5000)
// 4. Hide typing indicator → Show AI response

// Response includes metadata for realistic timing:
{
  "response": "Here's how to...",
  "metadata": {
    "processingTime": 2500, // Use for typing delay calculation
    "requiresHumanReview": false
  }
}
```

## Milestone Endpoints
```
POST   /milestones          - Create milestone
GET    /milestones          - Get user milestones
GET    /milestones/:id      - Get milestone details
PUT    /milestones/:id      - Update milestone
DELETE /milestones/:id      - Delete milestone
PATCH  /milestones/:id/status - Update milestone status

GET    /templates           - Get milestone templates
POST   /milestones/apply-template - Apply template
```

## Recommendation Endpoints
```
GET  /recommendations       - Get recommendations
POST /recommendations/refresh - Refresh recommendations
POST /recommendations/:id/feedback - Provide feedback
GET  /recommendations/history - Get recommendation history
```

## User Profile Endpoints
```
GET /users/profile          - Get user profile
PUT /users/profile          - Update profile
PUT /users/profile/toggle-availability - Toggle availability
PUT /users/profile/capacity - Update capacity
```

## Health Check
```
GET /health                 - Basic health check
GET /health/ready           - Readiness check
GET /health/live            - Liveness check
```

## Key Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  role: 'student' | 'supervisor' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  profile: StudentProfile | SupervisorProfile;
  createdAt: string;
  updatedAt: string;
}
```

### Project
```typescript
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
  supervisor: User;
  createdAt: string;
  updatedAt: string;
}
```

### Milestone
```typescript
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
```

### Conversation
```typescript
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
```

### Message
```typescript
interface Message {
  id: string;
  conversationId: string;
  type: 'user' | 'assistant';
  content: string;
  confidenceScore?: number;
  sources?: Source[];
  isBookmarked: boolean;
  averageRating: number;
  createdAt: string;
}
```

## Common Query Parameters

### Pagination
```
limit: number (default: 20, max: 100)
offset: number (default: 0)
```

### Sorting
```
sortBy: string (varies by endpoint)
sortOrder: 'asc' | 'desc' (default: 'desc')
```

### Filtering
```
search: string (full-text search)
startDate: string (ISO date)
endDate: string (ISO date)
status: string (varies by resource)
```

## HTTP Status Codes
```
200 - OK
201 - Created
204 - No Content
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
409 - Conflict
429 - Too Many Requests
500 - Internal Server Error
```

## Rate Limits
```
Authentication: 5 requests/minute
Search: 30 requests/minute
Bookmarks: 20 requests/minute
AI Assistant: 10 requests/minute
General: 100 requests/minute
```

## Required Headers
```
Authorization: Bearer <token>
Content-Type: application/json
```

## Environment Variables for Frontend
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=ProjectHub
```