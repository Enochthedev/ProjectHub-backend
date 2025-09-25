# Milestone Tracking API Documentation

## Overview

The Milestone Tracking API provides comprehensive functionality for managing project milestones, including creation, status updates, progress tracking, and template management. This API is designed to support the Final Year Project platform's milestone tracking system.

## Base URL

\`\`\`
https://api.fyp-platform.com/v1
\`\`\`

## Authentication

All API endpoints require authentication using JWT Bearer tokens:

\`\`\`http
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Milestone Creation**: 10 requests per minute
- **Status Updates**: 20 requests per minute
- **General Queries**: 100 requests per minute

## Error Handling

The API uses standard HTTP status codes and returns detailed error information:

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "dueDate",
    "constraint": "Due date must be in the future"
  }
}
\`\`\`

## Milestone Management Endpoints

### Create Milestone

Creates a new milestone for the authenticated student.

**Endpoint:** `POST /milestones`

**Authorization:** Student role required

**Request Body:**

\`\`\`json
{
  "title": "Literature Review",
  "description": "Complete comprehensive literature review on machine learning applications",
  "dueDate": "2024-06-15",
  "priority": "high",
  "estimatedHours": 40,
  "projectId": "uuid-string" // optional
}
\`\`\`

**Response:** `201 Created`

\`\`\`json
{
  "id": "milestone-uuid",
  "title": "Literature Review",
  "description": "Complete comprehensive literature review on machine learning applications",
  "dueDate": "2024-06-15",
  "priority": "high",
  "status": "not_started",
  "estimatedHours": 40,
  "actualHours": 0,
  "student": {
    "id": "student-uuid",
    "email": "student@university.edu"
  },
  "project": {
    "id": "project-uuid",
    "title": "ML in Education"
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
\`\`\`

**Validation Rules:**

- `title`: 3-200 characters, required
- `description`: 10-1000 characters, required
- `dueDate`: Must be in future, within academic year
- `priority`: One of `low`, `medium`, `high`, `critical`
- `estimatedHours`: 1-1000, optional

### Get Milestones

Retrieves milestones for the authenticated user with filtering and pagination.

**Endpoint:** `GET /milestones`

**Authorization:** Student, Supervisor, or Admin role

**Query Parameters:**

- `status` (optional): Filter by status (`not_started`, `in_progress`, `completed`, `blocked`, `cancelled`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `critical`)
- `projectId` (optional): Filter by project UUID
- `dueDateFrom` (optional): Filter milestones due after date (YYYY-MM-DD)
- `dueDateTo` (optional): Filter milestones due before date (YYYY-MM-DD)
- `isOverdue` (optional): Filter overdue milestones (true/false)
- `search` (optional): Search in title and description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Example Request:**

\`\`\`http
GET /milestones?status=in_progress&priority=high&page=1&limit=10
\`\`\`

**Response:** `200 OK`

\`\`\`json
{
  "milestones": [
    {
      "id": "milestone-uuid",
      "title": "Literature Review",
      "status": "in_progress",
      "priority": "high",
      "dueDate": "2024-06-15",
      "progressPercentage": 50,
      "isOverdue": false,
      "student": {
        "id": "student-uuid",
        "email": "student@university.edu"
      }
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
\`\`\`

### Get Milestone by ID

Retrieves a specific milestone by its ID.

**Endpoint:** `GET /milestones/{id}`

**Authorization:** Owner, Supervisor, or Admin

**Response:** `200 OK`

\`\`\`json
{
  "id": "milestone-uuid",
  "title": "Literature Review",
  "description": "Complete comprehensive literature review",
  "dueDate": "2024-06-15",
  "status": "in_progress",
  "priority": "high",
  "estimatedHours": 40,
  "actualHours": 15,
  "blockingReason": null,
  "completedAt": null,
  "student": {
    "id": "student-uuid",
    "email": "student@university.edu"
  },
  "project": {
    "id": "project-uuid",
    "title": "ML in Education"
  },
  "notes": [
    {
      "id": "note-uuid",
      "content": "Found 15 relevant papers",
      "type": "progress",
      "author": {
        "id": "student-uuid",
        "email": "student@university.edu"
      },
      "createdAt": "2024-01-16T14:30:00Z"
    }
  ],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-16T14:30:00Z"
}
\`\`\`

### Update Milestone

Updates milestone details (students can only update their own milestones).

**Endpoint:** `PUT /milestones/{id}`

**Authorization:** Owner (Student) only

**Request Body:**

\`\`\`json
{
  "title": "Updated Literature Review",
  "description": "Updated description with more details",
  "priority": "critical",
  "estimatedHours": 50,
  "dueDate": "2024-07-01"
}
\`\`\`

**Response:** `200 OK` (same structure as Get Milestone)

### Update Milestone Status

Updates the status of a milestone with optional progress notes.

**Endpoint:** `PATCH /milestones/{id}/status`

**Authorization:** Owner (Student) only

**Request Body:**

\`\`\`json
{
  "status": "completed",
  "actualHours": 35,
  "notes": "Literature review completed successfully. Found 25 relevant papers.",
  "blockingReason": null // Required when status is 'blocked'
}
\`\`\`

**Status Transition Rules:**

- `not_started` → `in_progress`, `blocked`, `cancelled`
- `in_progress` → `completed`, `blocked`, `cancelled`
- `blocked` → `in_progress`, `cancelled`
- `completed` → `in_progress` (reopening)
- `cancelled` → `not_started`

**Response:** `200 OK` (same structure as Get Milestone)

### Delete Milestone

Deletes a milestone (only if no dependencies exist).

**Endpoint:** `DELETE /milestones/{id}`

**Authorization:** Owner (Student) only

**Response:** `204 No Content`

**Error Conditions:**

- `409 Conflict`: Milestone has notes or other dependencies

## Progress Tracking Endpoints

### Get Milestone Progress

Retrieves detailed progress information for a specific milestone.

**Endpoint:** `GET /milestones/{id}/progress`

**Authorization:** Owner, Supervisor, or Admin

**Response:** `200 OK`

\`\`\`json
{
  "milestone": {
    "id": "milestone-uuid",
    "title": "Literature Review",
    "status": "in_progress"
  },
  "progressPercentage": 50,
  "daysUntilDue": 15,
  "isOverdue": false,
  "timeSpent": 15,
  "estimatedTimeRemaining": 25,
  "recentNotes": [
    {
      "id": "note-uuid",
      "content": "Found 15 relevant papers",
      "type": "progress",
      "createdAt": "2024-01-16T14:30:00Z"
    }
  ]
}
\`\`\`

### Get Project Progress Overview

Retrieves overall project progress based on milestone completion.

**Endpoint:** `GET /milestones/progress/overview`

**Authorization:** Student, Supervisor, or Admin

**Response:** `200 OK`

\`\`\`json
{
  "overallProgress": 65.5,
  "totalMilestones": 8,
  "completedMilestones": 3,
  "inProgressMilestones": 2,
  "blockedMilestones": 1,
  "overdueMilestones": 1,
  "estimatedCompletionDate": "2024-08-15",
  "progressVelocity": 0.75,
  "milestones": [
    {
      "id": "milestone-uuid",
      "title": "Literature Review",
      "status": "completed",
      "progressPercentage": 100,
      "dueDate": "2024-06-15",
      "isOverdue": false
    }
  ],
  "nextMilestone": {
    "id": "next-milestone-uuid",
    "title": "Methodology Design",
    "status": "not_started",
    "dueDate": "2024-07-01"
  }
}
\`\`\`

## Note Management Endpoints

### Add Milestone Note

Adds a progress note to a milestone.

**Endpoint:** `POST /milestones/{id}/notes`

**Authorization:** Owner or Supervisor

**Request Body:**

\`\`\`json
{
  "content": "Found 15 relevant papers on machine learning in education. Key themes emerging around personalized learning.",
  "type": "progress"
}
\`\`\`

**Note Types:**

- `progress`: General progress update
- `issue`: Problem or obstacle
- `solution`: Solution to a problem
- `meeting`: Meeting notes
- `supervisor_feedback`: Feedback from supervisor

**Response:** `201 Created`

\`\`\`json
{
  "id": "note-uuid",
  "content": "Found 15 relevant papers on machine learning in education.",
  "type": "progress",
  "author": {
    "id": "student-uuid",
    "email": "student@university.edu"
  },
  "createdAt": "2024-01-16T14:30:00Z"
}
\`\`\`

## Template Management Endpoints

### Apply Milestone Template

Applies a predefined template to create multiple milestones.

**Endpoint:** `POST /milestones/apply-template`

**Authorization:** Student role required

**Request Body:**

\`\`\`json
{
  "templateId": "template-uuid",
  "startDate": "2024-03-01",
  "projectId": "project-uuid",
  "customizations": [
    {
      "milestoneIndex": 0,
      "title": "Custom Literature Review Title",
      "estimatedHours": 50
    }
  ]
}
\`\`\`

**Response:** `201 Created`

\`\`\`json
{
  "milestones": [
    {
      "id": "milestone-1-uuid",
      "title": "Literature Review",
      "dueDate": "2024-03-15",
      "status": "not_started"
    },
    {
      "id": "milestone-2-uuid",
      "title": "Methodology Design",
      "dueDate": "2024-03-29",
      "status": "not_started"
    }
  ],
  "templateId": "template-uuid",
  "appliedAt": "2024-02-15T10:00:00Z",
  "totalMilestones": 2
}
\`\`\`

### Preview Template Application

Previews what milestones would be created when applying a template.

**Endpoint:** `POST /milestones/preview-template`

**Authorization:** Student role required

**Request Body:**

\`\`\`json
{
  "templateId": "template-uuid",
  "startDate": "2024-03-01"
}
\`\`\`

**Response:** `200 OK`

\`\`\`json
{
  "preview": [
    {
      "title": "Literature Review",
      "description": "Complete comprehensive literature review",
      "dueDate": "2024-03-15",
      "priority": "high",
      "estimatedHours": 40
    }
  ],
  "templateId": "template-uuid",
  "conflicts": [
    "Milestone 'Literature Review' conflicts with existing deadline on 2024-03-14"
  ]
}
\`\`\`

## Supervisor Endpoints

### Get Student Progress (Supervisor)

Allows supervisors to view progress of their assigned students.

**Endpoint:** `GET /supervisor/students/{studentId}/milestones`

**Authorization:** Supervisor or Admin role

**Response:** `200 OK` (same structure as Get Milestones)

### Get All Students Progress Overview

Retrieves progress overview for all supervised students.

**Endpoint:** `GET /supervisor/students/progress`

**Authorization:** Supervisor or Admin role

**Response:** `200 OK`

\`\`\`json
{
  "students": [
    {
      "id": "student-uuid",
      "email": "student@university.edu",
      "overallProgress": 65.5,
      "totalMilestones": 8,
      "overdueMilestones": 1,
      "blockedMilestones": 0,
      "lastActivity": "2024-01-16T14:30:00Z",
      "riskLevel": "medium"
    }
  ],
  "summary": {
    "totalStudents": 15,
    "atRiskStudents": 3,
    "averageProgress": 72.3
  }
}
\`\`\`

## Error Codes

| Status Code | Description           | Common Causes                                              |
| ----------- | --------------------- | ---------------------------------------------------------- |
| 400         | Bad Request           | Invalid input data, validation errors                      |
| 401         | Unauthorized          | Missing or invalid JWT token                               |
| 403         | Forbidden             | Insufficient permissions for operation                     |
| 404         | Not Found             | Milestone, project, or template not found                  |
| 409         | Conflict              | Cannot delete milestone with dependencies                  |
| 422         | Unprocessable Entity  | Business rule violations (e.g., invalid status transition) |
| 429         | Too Many Requests     | Rate limit exceeded                                        |
| 500         | Internal Server Error | Server-side error                                          |

## Data Models

### Milestone Status Enum

- `not_started`: Milestone has not been started
- `in_progress`: Milestone is currently being worked on
- `completed`: Milestone has been completed
- `blocked`: Milestone is blocked by external factors
- `cancelled`: Milestone has been cancelled

### Priority Enum

- `low`: Low priority milestone
- `medium`: Medium priority milestone (default)
- `high`: High priority milestone
- `critical`: Critical priority milestone

### Note Type Enum

- `progress`: General progress update
- `issue`: Problem or obstacle encountered
- `solution`: Solution to a previously reported issue
- `meeting`: Notes from meetings or discussions
- `supervisor_feedback`: Feedback provided by supervisor

## Best Practices

### Creating Milestones

1. Use descriptive titles and detailed descriptions
2. Set realistic due dates within academic calendar
3. Estimate hours conservatively
4. Link milestones to projects when applicable

### Status Management

1. Update status regularly to reflect actual progress
2. Provide detailed notes when changing status
3. Use blocking status with clear reasons
4. Record actual hours when completing milestones

### Progress Tracking

1. Add regular progress notes to maintain history
2. Update estimated hours if scope changes
3. Communicate blockers immediately to supervisors
4. Use appropriate note types for different updates

### Template Usage

1. Preview templates before applying
2. Customize templates to fit specific project needs
3. Adjust dates based on project timeline
4. Review generated milestones before starting work

## Rate Limiting Details

The API implements different rate limits for different operations:

- **Milestone Creation**: 10 requests per minute per user
- **Status Updates**: 20 requests per minute per user
- **Note Creation**: 30 requests per minute per user
- **Progress Calculations**: 10 requests per minute per user
- **Template Applications**: 5 requests per minute per user
- **General Queries**: 100 requests per minute per user

Rate limit headers are included in responses:

\`\`\`http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1640995200
\`\`\`

## Webhook Support

The API supports webhooks for real-time notifications:

### Milestone Events

- `milestone.created`: New milestone created
- `milestone.updated`: Milestone details updated
- `milestone.status_changed`: Milestone status changed
- `milestone.completed`: Milestone marked as completed
- `milestone.blocked`: Milestone marked as blocked
- `milestone.overdue`: Milestone became overdue

### Webhook Payload Example

\`\`\`json
{
  "event": "milestone.status_changed",
  "timestamp": "2024-01-16T14:30:00Z",
  "data": {
    "milestone": {
      "id": "milestone-uuid",
      "title": "Literature Review",
      "oldStatus": "in_progress",
      "newStatus": "completed"
    },
    "student": {
      "id": "student-uuid",
      "email": "student@university.edu"
    }
  }
}
\`\`\`

## SDK and Client Libraries

Official SDKs are available for:

- JavaScript/TypeScript (npm: `@fyp-platform/milestone-sdk`)
- Python (pip: `fyp-milestone-client`)
- Java (Maven: `com.fyp-platform:milestone-client`)

### JavaScript SDK Example

\`\`\`javascript
import { MilestoneClient } from '@fyp-platform/milestone-sdk';

const client = new MilestoneClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.fyp-platform.com/v1',
});

// Create milestone
const milestone = await client.milestones.create({
  title: 'Literature Review',
  description: 'Complete literature review',
  dueDate: '2024-06-15',
  priority: 'high',
});

// Update status
await client.milestones.updateStatus(milestone.id, {
  status: 'completed',
  actualHours: 35,
});
\`\`\`

## Support and Resources

- **API Status**: https://status.fyp-platform.com
- **Developer Portal**: https://developers.fyp-platform.com
- **Support Email**: api-support@fyp-platform.com
- **Community Forum**: https://community.fyp-platform.com
- **GitHub Issues**: https://github.com/fyp-platform/api-issues
