# Complete Frontend Screen Mapping & Routes

## 🎯 Route Structure Overview

```
/                           - Landing/Dashboard (role-based redirect)
/auth/*                     - Authentication flows
/projects/*                 - Project discovery & management
/bookmarks/*                - Bookmark management
/ai-assistant/*             - AI chat & conversations
/milestones/*               - Milestone tracking
/recommendations/*          - AI recommendations
/profile/*                  - User profile management
/supervisor/*               - Supervisor-specific screens
/admin/*                    - Admin-specific screens
/settings/*                 - User settings
```

---

## 📱 Complete Screen Definitions

### **🔐 Authentication Screens**

#### `/auth/login`
- **Purpose**: User login
- **API**: `POST /auth/login`
- **Components**: LoginForm, ForgotPasswordLink
- **Redirects**: Role-based dashboard after login

#### `/auth/register`
- **Purpose**: New user registration
- **API**: `POST /auth/register`
- **Components**: RegisterForm, RoleSelector
- **Flow**: Register → Email verification → Profile setup

#### `/auth/forgot-password`
- **Purpose**: Password reset request
- **API**: `POST /auth/forgot-password`
- **Components**: ForgotPasswordForm

#### `/auth/reset-password`
- **Purpose**: Password reset with token
- **API**: `POST /auth/reset-password`
- **Components**: ResetPasswordForm

#### `/auth/verify-email`
- **Purpose**: Email verification
- **API**: `GET /auth/verify-email`
- **Components**: VerificationStatus

---

### **🏠 Dashboard Screens (Role-Based)**

#### `/` (Root - Redirects based on role)
- **Student** → `/dashboard/student`
- **Supervisor** → `/dashboard/supervisor` 
- **Admin** → `/dashboard/admin`

#### `/dashboard/student`
- **Purpose**: Student main dashboard
- **APIs**: 
  - `GET /milestones` (upcoming)
  - `GET /recommendations`
  - `GET /ai-assistant/conversations` (recent)
  - `GET /projects/popular`
- **Components**: 
  - UpcomingMilestones
  - RecommendedProjects
  - RecentAIConversations
  - QuickActions
  - ProgressOverview

#### `/dashboard/supervisor`
- **Purpose**: Supervisor main dashboard
- **APIs**:
  - `GET /supervisor/dashboard`
  - `GET /supervisor/students/progress`
  - `GET /supervisor/alerts`
  - `GET /projects/my-projects`
- **Components**:
  - StudentProgressOverview
  - AtRiskStudentAlerts
  - ProjectStatusSummary
  - AIEscalationAlerts
  - SupervisorAnalytics

#### `/dashboard/admin`
- **Purpose**: Admin main dashboard
- **APIs**:
  - `GET /admin/analytics/dashboard`
  - `GET /admin/users` (summary)
  - `GET /admin/projects` (pending approval)
  - `GET /ai-health/status`
- **Components**:
  - SystemHealthOverview
  - PendingApprovals
  - UserActivitySummary
  - AISystemStatus
  - PlatformAnalytics

---

### **🔍 Project Discovery & Management**

#### `/projects`
- **Purpose**: Main project search & discovery
- **APIs**: 
  - `GET /projects` (with filters)
  - `GET /projects/popular`
- **Components**: 
  - ProjectSearchBar
  - FilterSidebar
  - ProjectGrid/List
  - Pagination
  - SortControls

#### `/projects/:id`
- **Purpose**: Project detail view
- **APIs**:
  - `GET /projects/:id`
  - `GET /projects/:id/suggestions`
  - `GET /bookmarks/check/:projectId`
- **Components**:
  - ProjectHeader
  - ProjectDetails
  - TechnologyStack
  - RelatedProjects
  - BookmarkButton
  - SupervisorInfo

#### `/projects/new` (Supervisor only)
- **Purpose**: Create new project
- **API**: `POST /projects`
- **Components**: 
  - ProjectForm
  - TagSuggestions
  - TechnologySuggestions
  - PreviewMode

#### `/projects/my-projects` (Supervisor only)
- **Purpose**: Supervisor's project management
- **APIs**:
  - `GET /projects/my-projects`
  - `GET /projects/my-projects/analytics`
- **Components**:
  - ProjectTable
  - StatusFilters
  - ProjectAnalytics
  - BulkActions

#### `/projects/:id/edit` (Supervisor only)
- **Purpose**: Edit existing project
- **API**: `PUT /projects/:id`
- **Components**: 
  - ProjectEditForm
  - VersionHistory
  - ApprovalStatus

---

### **📚 Bookmark Management**

#### `/bookmarks`
- **Purpose**: Bookmark management hub
- **APIs**:
  - `GET /bookmarks`
  - `GET /bookmarks/categories`
- **Components**:
  - BookmarkGrid
  - CategorySidebar
  - SearchBookmarks
  - SortOptions
  - BulkActions

#### `/bookmarks/categories`
- **Purpose**: Category management
- **APIs**:
  - `GET /bookmarks/categories`
  - `POST /bookmarks/categories`
  - `PUT /bookmarks/categories/:id`
  - `DELETE /bookmarks/categories/:id`
- **Components**:
  - CategoryList
  - CategoryForm
  - CategoryStats

#### `/bookmarks/compare`
- **Purpose**: Side-by-side project comparison
- **API**: `POST /bookmarks/compare`
- **Components**:
  - ProjectSelector
  - ComparisonTable
  - SimilarityAnalysis
  - ExportOptions

---

### **🤖 AI Assistant**

#### `/ai-assistant`
- **Purpose**: Main AI chat interface with real-time typing indicators
- **APIs**:
  - `GET /ai-assistant/conversations`
  - `POST /ai-assistant/ask`
  - `POST /ai-assistant/conversations`
- **Components**:
  - ChatInterface (with typing state management)
  - ConversationSidebar
  - MessageHistory
  - TypingIndicator (animated dots)
  - QuickActions
- **Real-Time Features**:
  - AI typing indicator with animated dots
  - Progressive message streaming
  - Realistic typing delays based on response length
  - Disabled input during AI processing
- **Implementation Details**:
  ```typescript
  // Frontend handles typing animation
  const [isAITyping, setIsAITyping] = useState(false);
  
  // Show typing indicator during API call
  const sendMessage = async (query: string) => {
    setIsAITyping(true);
    const response = await fetch('/ai-assistant/ask', { ... });
    
    // Simulate realistic typing delay
    const typingDelay = Math.min(response.length * 20, 5000);
    setTimeout(() => {
      setIsAITyping(false);
      addMessage(response);
    }, typingDelay);
  };
  ```

#### `/ai-assistant/conversations/:id`
- **Purpose**: Specific conversation view with enhanced chat features
- **APIs**:
  - `GET /ai-assistant/conversations/:id/messages`
  - `GET /ai-assistant/conversations/:id/context`
  - `POST /ai-assistant/ask` (for continuing conversation)
- **Components**:
  - ConversationHeader
  - MessageThread (with typing indicators)
  - ContextPanel
  - MessageActions (bookmark, rate, copy)
  - TypingIndicator
- **Enhanced Features**:
  - Message status indicators (sent, delivered, read)
  - Real-time typing animation
  - Message timestamps and metadata
  - Confidence score display
  - Source attribution links

#### `/ai-assistant/bookmarks`
- **Purpose**: Bookmarked AI responses
- **API**: `GET /ai-assistant/messages/bookmarked`
- **Components**:
  - BookmarkedMessages
  - SearchBookmarks
  - CategoryFilters

#### `/ai-assistant/milestone-guidance`
- **Purpose**: AI milestone guidance hub
- **APIs**:
  - `GET /ai-assistant/milestone-guidance/deadline-awareness`
  - `GET /ai-assistant/milestone-guidance/priority-guidance`
  - `GET /ai-assistant/milestone-guidance/proactive-suggestions`
- **Components**:
  - DeadlineAlerts
  - PriorityGuidance
  - ProactiveSuggestions
  - TimelineAnalysis

---

### **🎯 Milestone Management**

#### `/milestones`
- **Purpose**: Milestone dashboard
- **API**: `GET /milestones`
- **Components**:
  - MilestoneCalendar
  - MilestoneList
  - ProgressOverview
  - FilterControls
  - QuickAdd

#### `/milestones/new`
- **Purpose**: Create new milestone
- **API**: `POST /milestones`
- **Components**:
  - MilestoneForm
  - DatePicker
  - PrioritySelector
  - ProjectLinker

#### `/milestones/:id`
- **Purpose**: Milestone detail & progress
- **APIs**:
  - `GET /milestones/:id`
  - `GET /milestones/:id/progress`
  - `POST /milestones/:id/notes`
- **Components**:
  - MilestoneHeader
  - ProgressTracker
  - NotesSection
  - TimeTracking
  - StatusUpdater

#### `/milestones/:id/edit`
- **Purpose**: Edit milestone
- **API**: `PUT /milestones/:id`
- **Components**:
  - MilestoneEditForm
  - HistoryLog
  - DependencyManager

#### `/milestones/templates`
- **Purpose**: Milestone template browser
- **APIs**:
  - `GET /templates`
  - `POST /milestones/apply-template`
  - `POST /milestones/preview-template`
- **Components**:
  - TemplateGallery
  - TemplatePreview
  - CustomizationOptions
  - ConflictDetector

#### `/milestones/progress/overview`
- **Purpose**: Overall progress tracking
- **API**: `GET /milestones/progress/overview`
- **Components**:
  - ProgressCharts
  - CompletionStats
  - TimelineView
  - PerformanceMetrics

---

### **💡 Recommendations**

#### `/recommendations`
- **Purpose**: AI-powered recommendations
- **APIs**:
  - `GET /recommendations`
  - `POST /recommendations/refresh`
- **Components**:
  - RecommendationCards
  - ExplanationModal
  - FeedbackButtons
  - RefreshControls

#### `/recommendations/history`
- **Purpose**: Past recommendations
- **API**: `GET /recommendations/history`
- **Components**:
  - RecommendationHistory
  - FeedbackSummary
  - TrendAnalysis

#### `/recommendations/:id/explanation`
- **Purpose**: Detailed recommendation explanation
- **APIs**:
  - `GET /recommendations/:id/explanation`
  - `GET /recommendations/:id/accessible-explanation`
- **Components**:
  - ExplanationDetails
  - VisualFactors
  - AccessibleView
  - TechnicalDetails

---

### **👤 Profile Management**

#### `/profile`
- **Purpose**: User profile hub
- **API**: `GET /users/profile`
- **Components**:
  - ProfileHeader
  - RoleSpecificInfo
  - ActivitySummary
  - SettingsLink

#### `/profile/edit`
- **Purpose**: Edit profile information
- **API**: `PUT /users/profile`
- **Components**:
  - StudentProfileForm (students)
  - SupervisorProfileForm (supervisors)
  - SkillsSelector
  - InterestsManager

#### `/profile/availability` (Supervisor only)
- **Purpose**: Manage availability settings
- **APIs**:
  - `PUT /users/profile/toggle-availability`
  - `PUT /users/profile/capacity`
- **Components**:
  - AvailabilityToggle
  - CapacitySlider
  - ScheduleCalendar

---

### **👨‍🏫 Supervisor Screens**

#### `/supervisor/students`
- **Purpose**: Student management & monitoring
- **APIs**:
  - `GET /supervisor/students/progress`
  - `GET /supervisor/students/:id/overview`
- **Components**:
  - StudentList
  - ProgressCards
  - DetailedView
  - CommunicationTools

#### `/supervisor/ai-monitoring`
- **Purpose**: AI interaction monitoring
- **APIs**:
  - `GET /ai-assistant/supervisor/student-interactions`
  - `GET /ai-assistant/supervisor/common-questions`
  - `GET /ai-assistant/supervisor/escalations`
- **Components**:
  - InteractionOverview
  - CommonQuestions
  - EscalationAlerts
  - ResponseQuality

#### `/supervisor/reports`
- **Purpose**: Generate & export reports
- **APIs**:
  - `GET /supervisor/reports`
  - `GET /supervisor/reports/export`
- **Components**:
  - ReportBuilder
  - FilterOptions
  - ExportControls
  - ReportPreview

#### `/supervisor/analytics`
- **Purpose**: Supervisor analytics dashboard
- **API**: `GET /supervisor/analytics`
- **Components**:
  - PerformanceMetrics
  - TrendAnalysis
  - BenchmarkComparison
  - InsightCards

---

### **⚙️ Admin Screens**

#### `/admin/users`
- **Purpose**: User management
- **APIs**:
  - `GET /admin/users`
  - `POST /admin/users`
  - `PUT /admin/users/:id`
  - `PATCH /admin/users/:id/status`
- **Components**:
  - UserTable
  - UserForm
  - BulkActions
  - ActivityLogs

#### `/admin/users/:id`
- **Purpose**: Detailed user management
- **APIs**:
  - `GET /admin/users/:id`
  - `GET /admin/users/:id/activity`
  - `POST /admin/users/:id/reset-password`
- **Components**:
  - UserProfile
  - ActivityTimeline
  - PermissionManager
  - ActionButtons

#### `/admin/projects`
- **Purpose**: Project approval & management
- **APIs**:
  - `GET /admin/projects` (pending approval)
  - `PATCH /admin/projects/:id/approve`
  - `PATCH /admin/projects/:id/reject`
- **Components**:
  - ApprovalQueue
  - ProjectReviewer
  - BulkApproval
  - RejectionReasons

#### `/admin/ai-management`
- **Purpose**: AI system management
- **APIs**:
  - `GET /ai-assistant/admin/knowledge`
  - `POST /ai-assistant/admin/knowledge`
  - `GET /ai-assistant/admin/templates`
  - `GET /ai-health/status`
- **Components**:
  - KnowledgeBaseManager
  - TemplateEditor
  - SystemHealth
  - ConfigurationPanel

#### `/admin/analytics`
- **Purpose**: Platform analytics
- **APIs**:
  - `GET /admin/analytics/growth`
  - `GET /admin/analytics/activity`
  - `GET /admin/analytics/engagement`
- **Components**:
  - GrowthCharts
  - ActivityMetrics
  - EngagementAnalysis
  - ExportTools

#### `/admin/bulk-operations`
- **Purpose**: Bulk operations management
- **APIs**:
  - `POST /admin/bulk/import`
  - `GET /admin/bulk/export`
  - `POST /admin/bulk/migrate`
- **Components**:
  - ImportWizard
  - ExportBuilder
  - MigrationTools
  - OperationHistory

#### `/admin/system`
- **Purpose**: System configuration
- **APIs**:
  - `GET /health/metrics/system`
  - `GET /ai-health/circuit-breakers`
  - System configuration endpoints
- **Components**:
  - SystemStatus
  - ConfigurationEditor
  - MaintenanceMode
  - BackupManager

---

### **⚙️ Settings & Preferences**

#### `/settings`
- **Purpose**: User settings hub
- **Components**:
  - GeneralSettings
  - NotificationPreferences
  - PrivacySettings
  - AccountSecurity

#### `/settings/notifications`
- **Purpose**: Notification preferences
- **Components**:
  - NotificationTypes
  - DeliveryMethods
  - FrequencySettings
  - TestNotifications

#### `/settings/privacy`
- **Purpose**: Privacy & data settings
- **Components**:
  - DataVisibility
  - ProfilePrivacy
  - DataExport
  - AccountDeletion

---

### **🔧 Utility Screens**

#### `/search`
- **Purpose**: Global search results
- **APIs**: Various search endpoints
- **Components**:
  - UnifiedSearchResults
  - FilterTabs
  - SearchSuggestions

#### `/notifications`
- **Purpose**: Notification center
- **Components**:
  - NotificationList
  - MarkAsRead
  - FilterByType
  - NotificationSettings

#### `/help`
- **Purpose**: Help & documentation
- **Components**:
  - HelpArticles
  - FAQSection
  - ContactSupport
  - VideoTutorials

#### `/404`
- **Purpose**: Page not found
- **Components**:
  - ErrorMessage
  - NavigationSuggestions
  - SearchBox

#### `/500`
- **Purpose**: Server error
- **Components**:
  - ErrorDetails
  - RetryButton
  - SupportContact

---

## 🗺️ Route Protection & Access Control

### **Public Routes** (No authentication required)
```typescript
const publicRoutes = [
  '/auth/login',
  '/auth/register', 
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/projects', // Browse projects
  '/projects/:id', // View project details
  '/help',
  '/404',
  '/500'
];
```

### **Student Routes**
```typescript
const studentRoutes = [
  '/',
  '/dashboard/student',
  '/projects/*',
  '/bookmarks/*',
  '/ai-assistant/*',
  '/milestones/*',
  '/recommendations/*',
  '/profile/*',
  '/settings/*',
  '/notifications',
  '/search'
];
```

### **Supervisor Routes** (Includes student routes +)
```typescript
const supervisorRoutes = [
  '/dashboard/supervisor',
  '/supervisor/*',
  '/projects/new',
  '/projects/my-projects',
  '/projects/:id/edit'
];
```

### **Admin Routes** (Full access)
```typescript
const adminRoutes = [
  '/dashboard/admin',
  '/admin/*',
  // All other routes
];
```

---

## 📱 Mobile-Specific Considerations

### **Mobile-Optimized Screens**
- `/m/projects` - Mobile project browser
- `/m/ai-assistant` - Mobile chat interface
- `/m/milestones` - Mobile milestone tracker
- `/m/bookmarks` - Mobile bookmark manager

### **Progressive Web App (PWA) Features**
- Offline project browsing
- Push notifications for milestones
- Background sync for AI conversations
- Installable app experience

---

## 🔄 State Management Mapping

### **Global State**
- Authentication state
- User profile
- Theme preferences
- Notification settings

### **Feature-Specific State**
- Project search filters & results
- AI conversation history
- Milestone progress tracking
- Bookmark organization
- Recommendation preferences

---

## 🤖 **AI Chat Implementation Guide**

### **Real-Time Typing Indicators**

#### **Frontend Implementation**
```typescript
// Main Chat Interface Component
const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState<string>();

  const sendMessage = async (query: string) => {
    // 1. Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date(),
      status: 'sent'
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // 2. Show AI typing indicator
    setIsAITyping(true);
    
    try {
      // 3. Call backend API
      const response = await fetch('/ai-assistant/ask', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          conversationId,
          language: 'en',
          includeProjectContext: true
        })
      });
      
      const aiResponse: AssistantResponse = await response.json();
      
      // 4. Calculate realistic typing delay
      const baseDelay = 1000; // Minimum 1 second
      const charDelay = aiResponse.response.length * 15; // 15ms per character
      const maxDelay = 5000; // Maximum 5 seconds
      const typingDelay = Math.min(Math.max(baseDelay, charDelay), maxDelay);
      
      // 5. Simulate typing delay then show response
      setTimeout(() => {
        setIsAITyping(false);
        
        const aiMessage: Message = {
          id: aiResponse.messageId || `ai-${Date.now()}`,
          type: 'assistant',
          content: aiResponse.response,
          timestamp: new Date(),
          status: 'delivered',
          confidenceScore: aiResponse.confidenceScore,
          sources: aiResponse.sources,
          suggestedFollowUps: aiResponse.suggestedFollowUps,
          metadata: aiResponse.metadata
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setConversationId(aiResponse.conversationId);
      }, typingDelay);
      
    } catch (error) {
      setIsAITyping(false);
      // Show error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        status: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map(message => (
          <MessageBubble 
            key={message.id} 
            message={message}
            onBookmark={handleBookmark}
            onRate={handleRate}
          />
        ))}
        
        {/* AI Typing Indicator */}
        {isAITyping && <TypingIndicator />}
        
        {/* Auto-scroll to bottom */}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput 
        value={inputValue}
        onChange={setInputValue}
        onSend={sendMessage}
        disabled={isAITyping}
        placeholder={isAITyping ? "AI is thinking..." : "Ask me anything..."}
      />
    </div>
  );
};
```

#### **Typing Indicator Component**
```typescript
const TypingIndicator: React.FC = () => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="message ai-message typing-message">
      <div className="message-avatar">
        <img src="/ai-avatar.png" alt="AI Assistant" className="avatar" />
      </div>
      <div className="message-content">
        <div className="typing-indicator">
          <div className="typing-dots">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </div>
          <span className="typing-text">AI is thinking{dots}</span>
        </div>
      </div>
    </div>
  );
};
```

#### **Message Bubble Component**
```typescript
interface MessageBubbleProps {
  message: Message;
  onBookmark: (messageId: string) => void;
  onRate: (messageId: string, rating: number) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onBookmark, onRate }) => {
  const isUser = message.type === 'user';
  const isAI = message.type === 'assistant';
  
  return (
    <div className={`message ${message.type}-message`}>
      {isAI && (
        <div className="message-avatar">
          <img src="/ai-avatar.png" alt="AI Assistant" className="avatar" />
        </div>
      )}
      
      <div className="message-content">
        <div className="message-bubble">
          <div className="message-text">{message.content}</div>
          
          {/* AI-specific features */}
          {isAI && (
            <>
              {message.confidenceScore && (
                <div className="confidence-score">
                  Confidence: {(message.confidenceScore * 100).toFixed(0)}%
                </div>
              )}
              
              {message.sources && message.sources.length > 0 && (
                <div className="sources">
                  <strong>Sources:</strong>
                  {message.sources.map((source, index) => (
                    <a key={index} href={source.url} className="source-link">
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
              
              {message.suggestedFollowUps && (
                <div className="follow-ups">
                  <strong>Suggested follow-ups:</strong>
                  {message.suggestedFollowUps.map((followUp, index) => (
                    <button key={index} className="follow-up-btn">
                      {followUp}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="message-meta">
          <span className="timestamp">
            {message.timestamp.toLocaleTimeString()}
          </span>
          
          {isAI && (
            <div className="message-actions">
              <button onClick={() => onBookmark(message.id)} className="action-btn">
                📚 Bookmark
              </button>
              <button onClick={() => onRate(message.id, 5)} className="action-btn">
                👍 Rate
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isUser && (
        <div className="message-avatar">
          <div className="user-avatar">You</div>
        </div>
      )}
    </div>
  );
};
```

#### **CSS Animations**
```css
/* Typing indicator animation */
.typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6b7280;
  animation: typing-bounce 1.4s infinite ease-in-out;
}

.typing-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dots .dot:nth-child(2) { animation-delay: -0.16s; }
.typing-dots .dot:nth-child(3) { animation-delay: 0s; }

@keyframes typing-bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f3f4f6;
  border-radius: 18px;
  color: #6b7280;
  font-size: 14px;
  max-width: 200px;
}

/* Message animations */
.message {
  animation: messageSlideIn 0.3s ease-out;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Confidence score styling */
.confidence-score {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}

.confidence-score::before {
  content: "🎯 ";
}

/* Sources styling */
.sources {
  margin-top: 8px;
  font-size: 12px;
}

.source-link {
  display: inline-block;
  margin: 2px 4px;
  padding: 2px 6px;
  background: #e5e7eb;
  border-radius: 4px;
  text-decoration: none;
  color: #374151;
}

.source-link:hover {
  background: #d1d5db;
}

/* Follow-up suggestions */
.follow-ups {
  margin-top: 8px;
}

.follow-up-btn {
  display: block;
  width: 100%;
  text-align: left;
  padding: 6px 8px;
  margin: 2px 0;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.follow-up-btn:hover {
  background: #f3f4f6;
}
```

### **Advanced Features**

#### **Progressive Text Streaming** (Optional Enhancement)
```typescript
// Stream response word by word for ultra-realistic effect
const streamResponse = (fullResponse: string, messageId: string) => {
  const words = fullResponse.split(' ');
  let currentText = '';
  
  words.forEach((word, index) => {
    setTimeout(() => {
      currentText += (index > 0 ? ' ' : '') + word;
      updateMessageContent(messageId, currentText);
    }, index * 80); // 80ms per word
  });
};
```

#### **WebSocket Integration** (Future Enhancement)
```typescript
// Real-time updates via WebSocket
const useAIWebSocket = (conversationId: string) => {
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3001/ai-assistant/${conversationId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ai_processing_start':
          setIsAITyping(true);
          break;
        case 'ai_processing_progress':
          // Show progress indicator
          break;
        case 'ai_response_chunk':
          // Stream response in chunks
          appendToLastMessage(data.chunk);
          break;
        case 'ai_processing_complete':
          setIsAITyping(false);
          break;
      }
    };
    
    return () => ws.close();
  }, [conversationId]);
};
```

### **Backend Integration Notes**

Your existing backend endpoints are perfect for this implementation:

- **`POST /ai-assistant/ask`** - Main AI interaction (already implemented)
- **`GET /ai-assistant/conversations`** - Load chat history
- **`POST /ai-assistant/conversations`** - Create new conversation
- **`POST /ai-assistant/messages/:id/bookmark`** - Bookmark responses
- **`POST /ai-assistant/messages/:id/rate`** - Rate responses

The frontend handles all the visual polish and user experience while your backend provides the AI intelligence and data persistence.

---

This comprehensive mapping provides the complete structure needed for frontend development, ensuring every backend endpoint has corresponding frontend screens and proper user flows.
