# Supervisor API Documentation

This document provides comprehensive documentation for the enhanced Supervisor API endpoints that enable supervisors to manage their availability, monitor AI interactions, and communicate with students.

## Overview

The Supervisor API provides the following key functionalities:
- **Dashboard & Analytics**: Comprehensive overview of supervised students and their progress
- **Availability Management**: Schedule and manage office hours and meeting slots
- **AI Interaction Monitoring**: Review and oversee AI assistant conversations with students
- **Student Communication**: Send messages and schedule meetings with students
- **Report Generation**: Create and export progress reports

## Authentication

All supervisor endpoints require JWT authentication with supervisor role permissions.

```
Authorization: Bearer <jwt_token>
```

## Base URL

```
/supervisor
```

## Endpoints

### Dashboard & Analytics

#### Get Supervisor Dashboard
```http
GET /supervisor/dashboard
```

Returns comprehensive dashboard with student overview and recent activities.

**Response:**
```json
{
  "supervisorId": "supervisor-1",
  "supervisorName": "Dr. Jane Smith",
  "totalStudents": 8,
  "metrics": {
    "totalMilestones": 45,
    "completedMilestones": 30,
    "overdueMilestones": 5,
    "blockedMilestones": 2,
    "overallCompletionRate": 66.67,
    "averageProgressVelocity": 1.5,
    "atRiskStudentCount": 3
  },
  "studentSummaries": [...],
  "atRiskStudents": [...],
  "recentActivity": [...],
  "upcomingDeadlines": [...],
  "lastUpdated": "2024-03-15T10:30:00Z"
}
```

#### Get Supervisor Analytics
```http
GET /supervisor/analytics
```

Returns comprehensive analytics including trends, benchmarks, and performance insights.

### Availability Management

#### Get Supervisor Availability
```http
GET /supervisor/availability
```

Returns all availability slots for the supervisor.

**Response:**
```json
{
  "supervisorId": "supervisor-1",
  "supervisorName": "Dr. Jane Smith",
  "availabilitySlots": [
    {
      "id": "slot-1",
      "type": "office_hours",
      "dayOfWeek": 1,
      "startTime": "09:00",
      "endTime": "17:00",
      "location": "Office 123, Building A",
      "notes": "Available for project consultations",
      "maxCapacity": 3,
      "isActive": true,
      "effectiveFrom": "2024-01-01",
      "effectiveUntil": "2024-12-31",
      "createdAt": "2024-03-15T10:30:00Z",
      "updatedAt": "2024-03-15T10:30:00Z"
    }
  ],
  "totalWeeklyCapacity": 24,
  "utilizationRate": 75.5,
  "nextAvailableSlot": {
    "dayOfWeek": 2,
    "startTime": "14:00",
    "endTime": "15:00",
    "location": "Office 123"
  },
  "lastUpdated": "2024-03-15T10:30:00Z"
}
```

#### Create Availability Slot
```http
POST /supervisor/availability
```

**Request Body:**
```json
{
  "type": "office_hours",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "location": "Office 123, Building A",
  "notes": "Available for project consultations",
  "maxCapacity": 3,
  "effectiveFrom": "2024-01-01",
  "effectiveUntil": "2024-12-31"
}
```

**Validation Rules:**
- `type`: Must be one of `office_hours`, `meeting_slots`, `unavailable`
- `dayOfWeek`: Integer 0-6 (Monday=0, Sunday=6)
- `startTime`/`endTime`: Must be in HH:MM format
- `maxCapacity`: Integer 1-20
- Time slots cannot overlap with existing active slots

#### Update Availability Slot
```http
PUT /supervisor/availability/{availabilityId}
```

**Request Body:** (All fields optional)
```json
{
  "startTime": "10:00",
  "endTime": "16:00",
  "maxCapacity": 5,
  "isActive": true
}
```

#### Delete Availability Slot
```http
DELETE /supervisor/availability/{availabilityId}
```

Returns `204 No Content` on success.

### AI Interaction Monitoring

#### Get AI Interaction Overview
```http
GET /supervisor/ai-interactions
```

Returns overview of AI interactions requiring supervisor attention.

**Response:**
```json
{
  "supervisorId": "supervisor-1",
  "stats": {
    "totalReviewed": 45,
    "pendingReviews": 8,
    "escalatedConversations": 3,
    "flaggedConversations": 2,
    "averageConfidenceScore": 0.82,
    "commonCategories": [
      {"category": "accuracy", "count": 15},
      {"category": "appropriateness", "count": 12}
    ],
    "reviewTrends": [
      {"date": "2024-03-01", "approved": 5, "escalated": 1, "flagged": 0}
    ]
  },
  "recentReviews": [...],
  "priorityReviews": [...],
  "lastUpdated": "2024-03-15T10:30:00Z"
}
```

#### Get AI Interaction Reviews
```http
GET /supervisor/ai-interactions/reviews?status=pending&category=accuracy&limit=50&offset=0
```

**Query Parameters:**
- `status`: Filter by review status (`pending`, `approved`, `escalated`, `flagged`, `resolved`)
- `category`: Filter by review category (`accuracy`, `appropriateness`, `completeness`, `safety`, `policy_violation`)
- `limit`: Number of reviews to return (default: 50)
- `offset`: Number of reviews to skip (default: 0)

#### Create AI Interaction Review
```http
POST /supervisor/ai-interactions/reviews
```

**Request Body:**
```json
{
  "conversationId": "conversation-1",
  "status": "pending",
  "categories": ["accuracy", "appropriateness"],
  "confidenceScore": 0.85,
  "reviewNotes": "AI response was accurate but could be more detailed",
  "supervisorFeedback": "Student needs additional guidance on this topic",
  "requiresFollowUp": true
}
```

#### Update AI Interaction Review
```http
PUT /supervisor/ai-interactions/reviews/{reviewId}
```

#### Approve AI Interaction
```http
POST /supervisor/ai-interactions/reviews/{reviewId}/approve
```

#### Escalate AI Interaction
```http
POST /supervisor/ai-interactions/reviews/{reviewId}/escalate
```

**Request Body:**
```json
{
  "reason": "Needs human review for complex technical question"
}
```

#### Flag AI Interaction
```http
POST /supervisor/ai-interactions/reviews/{reviewId}/flag
```

**Request Body:**
```json
{
  "reason": "Inappropriate response detected"
}
```

### Student Communication

#### Get Communication Overview
```http
GET /supervisor/communication
```

Returns overview of messages and meetings with students.

**Response:**
```json
{
  "supervisorId": "supervisor-1",
  "recentMessages": [...],
  "upcomingMeetings": [...],
  "pendingMeetings": [...],
  "stats": {
    "totalMessagesSent": 45,
    "totalMeetingsScheduled": 12,
    "averageResponseTime": "2.5 hours",
    "mostActiveStudent": "John Doe"
  },
  "lastUpdated": "2024-03-15T10:30:00Z"
}
```

#### Send Message to Student
```http
POST /supervisor/communication/messages
```

**Request Body:**
```json
{
  "studentId": "student-1",
  "subject": "Milestone Review Feedback",
  "content": "Your latest milestone submission looks good. Please address the following points...",
  "type": "milestone_feedback",
  "priority": "normal",
  "milestoneId": "milestone-1",
  "projectId": "project-1"
}
```

**Message Types:**
- `general`: General communication
- `milestone_feedback`: Feedback on milestone submissions
- `project_guidance`: Project-related guidance
- `meeting_request`: Meeting scheduling requests
- `urgent`: Urgent communications

**Priority Levels:**
- `low`: Low priority
- `normal`: Normal priority
- `high`: High priority
- `urgent`: Urgent priority

#### Get Messages
```http
GET /supervisor/communication/messages?studentId=student-1&limit=50&offset=0
```

#### Schedule Meeting with Student
```http
POST /supervisor/communication/meetings
```

**Request Body:**
```json
{
  "studentId": "student-1",
  "title": "Project Progress Review",
  "description": "Discuss current progress and next steps",
  "proposedDateTime": "2024-03-20T14:00:00Z",
  "duration": "60",
  "location": "Office 123, Building A",
  "agenda": [
    "Review milestone progress",
    "Discuss challenges",
    "Plan next steps"
  ],
  "isVirtual": false,
  "meetingLink": "https://zoom.us/j/123456789"
}
```

#### Get Meetings
```http
GET /supervisor/communication/meetings?studentId=student-1&status=requested&limit=50&offset=0
```

**Meeting Statuses:**
- `requested`: Meeting requested, awaiting confirmation
- `confirmed`: Meeting confirmed by both parties
- `cancelled`: Meeting cancelled
- `completed`: Meeting completed

#### Update Meeting Status
```http
PUT /supervisor/communication/meetings/{meetingId}/status
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

### Student Progress Management

#### Get Students Progress Overview
```http
GET /supervisor/students/progress
```

Returns progress summaries for all supervised students.

#### Get Student Milestone Overview
```http
GET /supervisor/students/{studentId}/overview
```

Returns comprehensive overview of a specific student's milestones and progress.

### Report Generation

#### Generate Progress Report
```http
GET /supervisor/reports?studentIds[]=student-1&startDate=2024-01-01&endDate=2024-03-31&status=completed&priority=high
```

**Query Parameters:**
- `studentIds[]`: Array of student IDs to include
- `startDate`: Start date for milestone filtering (YYYY-MM-DD)
- `endDate`: End date for milestone filtering (YYYY-MM-DD)
- `status`: Filter by milestone status
- `priority`: Filter by milestone priority

#### Export Progress Report
```http
GET /supervisor/reports/export?format=pdf&studentIds[]=student-1&startDate=2024-01-01&endDate=2024-03-31
```

**Query Parameters:**
- `format`: Export format (`pdf` or `csv`)
- Additional filtering parameters same as generate report

**Response:**
```json
{
  "reportId": "report-1710504600000",
  "format": "pdf",
  "filename": "supervisor-report-1710504600000.pdf",
  "content": "JVBERi0xLjQKJcOkw7zDtsO...",
  "mimeType": "application/pdf",
  "size": 2048,
  "generatedAt": "2024-03-15T10:30:00Z"
}
```

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid request parameters",
  "error": "Bad Request"
}
```

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Only supervisors and admins can access this endpoint",
  "error": "Forbidden"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

#### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Availability slot conflicts with existing office_hours slot",
  "error": "Conflict"
}
```

### Validation Errors

#### Time Format Validation
```json
{
  "statusCode": 400,
  "message": ["Start time must be in HH:MM format"],
  "error": "Bad Request"
}
```

#### Date Range Validation
```json
{
  "statusCode": 400,
  "message": "Start date cannot be after end date",
  "error": "Bad Request"
}
```

## Rate Limiting

All supervisor endpoints are subject to rate limiting:
- **Standard endpoints**: 100 requests per minute
- **Report generation**: 10 requests per minute
- **Bulk operations**: 5 requests per minute

## Data Models

### AvailabilityType Enum
- `office_hours`: Regular office hours
- `meeting_slots`: Specific meeting time slots
- `unavailable`: Unavailable periods

### DayOfWeek Enum
- `0`: Monday
- `1`: Tuesday
- `2`: Wednesday
- `3`: Thursday
- `4`: Friday
- `5`: Saturday
- `6`: Sunday

### ReviewStatus Enum
- `pending`: Review pending
- `approved`: Review approved
- `escalated`: Review escalated for further attention
- `flagged`: Review flagged as problematic
- `resolved`: Review resolved

### ReviewCategory Enum
- `accuracy`: Response accuracy
- `appropriateness`: Response appropriateness
- `completeness`: Response completeness
- `safety`: Safety concerns
- `policy_violation`: Policy violations

## Best Practices

### Availability Management
1. **Avoid Overlapping Slots**: The system prevents overlapping availability slots
2. **Reasonable Time Ranges**: Availability slots cannot exceed 12 hours
3. **Capacity Planning**: Set appropriate `maxCapacity` based on meeting type
4. **Effective Dates**: Use `effectiveFrom` and `effectiveUntil` for temporary schedules

### AI Interaction Monitoring
1. **Regular Reviews**: Review AI interactions regularly to maintain quality
2. **Categorization**: Use appropriate categories for better tracking
3. **Follow-up Actions**: Mark interactions requiring follow-up for proper attention
4. **Confidence Scores**: Use confidence scores to prioritize reviews

### Student Communication
1. **Clear Subjects**: Use descriptive subjects for messages
2. **Appropriate Types**: Choose correct message types for better organization
3. **Meeting Agendas**: Always include agendas for scheduled meetings
4. **Timely Responses**: Maintain reasonable response times for student communications

### Report Generation
1. **Specific Filters**: Use appropriate filters to generate focused reports
2. **Regular Exports**: Export reports regularly for record keeping
3. **Format Selection**: Choose appropriate format (PDF for formal reports, CSV for data analysis)
4. **Date Ranges**: Use meaningful date ranges for report periods

## Integration Examples

### JavaScript/TypeScript
```typescript
// Get supervisor availability
const response = await fetch('/supervisor/availability', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const availability = await response.json();

// Create availability slot
const newSlot = await fetch('/supervisor/availability', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'office_hours',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    location: 'Office 123',
    maxCapacity: 3
  })
});
```

### Python
```python
import requests

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# Send message to student
message_data = {
    'studentId': 'student-1',
    'subject': 'Project Update',
    'content': 'Please provide project status update',
    'type': 'general',
    'priority': 'normal'
}

response = requests.post(
    '/supervisor/communication/messages',
    headers=headers,
    json=message_data
)
```

This documentation provides comprehensive coverage of all supervisor API endpoints with examples, validation rules, and best practices for integration.