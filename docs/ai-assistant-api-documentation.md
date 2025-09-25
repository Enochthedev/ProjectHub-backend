# AI Assistant API Documentation

## Overview

The AI Assistant API provides intelligent Q&A support for Final Year Project students using advanced natural language processing. The system integrates with Hugging Face models to deliver contextual responses, maintains conversation history, and provides comprehensive monitoring and analytics capabilities.

## Base URL

\`\`\`
https://api.fyp-platform.com/ai-assistant
\`\`\`

## Authentication

All API endpoints require JWT authentication. Include the JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

- **Students**: 100 requests per hour
- **Supervisors**: 500 requests per hour
- **Admins**: 1000 requests per hour

Rate limit headers are included in all responses:

- `X-RateLimit-Limit`: Request limit per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when rate limit resets (Unix timestamp)

## Error Handling

The API uses standard HTTP status codes and returns detailed error information:

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": {
    "field": "query",
    "constraint": "Query must be between 3 and 1000 characters"
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/ai-assistant/ask"
}
\`\`\`

### Common Error Codes

- `400` - Bad Request (validation errors, malformed input)
- `401` - Unauthorized (missing or invalid JWT token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (system error)
- `503` - Service Unavailable (AI service temporarily down)

## Core Endpoints

### 1. Conversation Management

#### Create Conversation

Creates a new AI assistant conversation.

\`\`\`http
POST /conversations
\`\`\`

**Request Body:**

\`\`\`json
{
  "title": "Literature Review Questions",
  "projectId": "uuid-string",
  "language": "en",
  "initialQuery": "How do I start my literature review?"
}
\`\`\`

**Response:**

\`\`\`json
{
  "id": "conv-uuid",
  "studentId": "user-uuid",
  "title": "Literature Review Questions",
  "status": "active",
  "projectId": "project-uuid",
  "language": "en",
  "messageCount": 1,
  "messages": [
    {
      "id": "msg-uuid",
      "type": "ai_response",
      "content": "To start your literature review...",
      "confidenceScore": 0.85,
      "sources": ["knowledge-base-entry-1"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
\`\`\`

#### Get Conversations

Retrieves user's conversations with optional filtering.

\`\`\`http
GET /conversations?status=active&limit=20&offset=0
\`\`\`

**Query Parameters:**

- `status` (optional): Filter by conversation status (`active`, `archived`, `escalated`)
- `projectId` (optional): Filter by project ID
- `language` (optional): Filter by language
- `search` (optional): Search in conversation titles and messages
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

\`\`\`json
{
  "conversations": [
    {
      "id": "conv-uuid",
      "title": "Literature Review Questions",
      "status": "active",
      "messageCount": 5,
      "lastMessageAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "hasMore": false
}
\`\`\`

#### Get Conversation Messages

Retrieves message history for a specific conversation.

\`\`\`http
GET /conversations/{conversationId}/messages?limit=50&offset=0
\`\`\`

**Response:**

\`\`\`json
{
  "messages": [
    {
      "id": "msg-uuid",
      "conversationId": "conv-uuid",
      "type": "user_query",
      "content": "How do I write a methodology section?",
      "createdAt": "2024-01-15T10:25:00.000Z"
    },
    {
      "id": "msg-uuid-2",
      "conversationId": "conv-uuid",
      "type": "ai_response",
      "content": "The methodology section should describe...",
      "confidenceScore": 0.92,
      "sources": ["methodology-guide"],
      "isBookmarked": false,
      "averageRating": 4.5,
      "ratingCount": 2,
      "createdAt": "2024-01-15T10:25:05.000Z"
    }
  ],
  "total": 2,
  "hasMore": false
}
\`\`\`

### 2. Q&A Interaction

#### Ask Question

Submits a question to the AI assistant and receives an intelligent response.

\`\`\`http
POST /ask
\`\`\`

**Request Body:**

\`\`\`json
{
  "query": "What is the difference between qualitative and quantitative research?",
  "conversationId": "conv-uuid",
  "language": "en",
  "includeProjectContext": true
}
\`\`\`

**Response:**

\`\`\`json
{
  "response": "Qualitative and quantitative research differ in several key ways...",
  "confidenceScore": 0.88,
  "sources": ["research-methods-guide", "methodology-handbook"],
  "conversationId": "conv-uuid",
  "messageId": "msg-uuid",
  "fromAI": true,
  "suggestedFollowUps": [
    "Can you give examples of qualitative research methods?",
    "How do I choose between qualitative and quantitative approaches?",
    "What are mixed methods in research?"
  ],
  "escalationSuggestion": null,
  "metadata": {
    "processingTime": 1250,
    "language": "en",
    "category": "methodology",
    "requiresHumanReview": false
  }
}
\`\`\`

**Low Confidence Response Example:**

\`\`\`json
{
  "response": "I'm not entirely certain about this specific question. Based on available information, it seems that...",
  "confidenceScore": 0.35,
  "sources": ["general-guidelines"],
  "fromAI": false,
  "escalationSuggestion": "This question may benefit from supervisor guidance. Consider contacting your project supervisor for detailed clarification.",
  "suggestedFollowUps": [
    "Can you rephrase your question more specifically?",
    "Would you like me to search our knowledge base?",
    "Should I help you contact your supervisor?"
  ]
}
\`\`\`

### 3. Message Management

#### Bookmark Message

Saves an important AI response for future reference.

\`\`\`http
POST /messages/{messageId}/bookmark
\`\`\`

**Request Body:**

\`\`\`json
{
  "note": "Great explanation of research methodology differences"
}
\`\`\`

**Response:**

\`\`\`json
{
  "id": "msg-uuid",
  "isBookmarked": true,
  "bookmarkNote": "Great explanation of research methodology differences",
  "bookmarkedAt": "2024-01-15T10:30:00.000Z"
}
\`\`\`

#### Rate Message

Provides quality feedback on an AI response.

\`\`\`http
POST /messages/{messageId}/rate
\`\`\`

**Request Body:**

\`\`\`json
{
  "rating": 5,
  "feedback": "Very helpful and comprehensive explanation"
}
\`\`\`

**Response:**

\`\`\`json
{
  "id": "msg-uuid",
  "averageRating": 4.7,
  "ratingCount": 3,
  "userRating": 5,
  "ratedAt": "2024-01-15T10:30:00.000Z"
}
\`\`\`

#### Get Bookmarked Messages

Retrieves all bookmarked messages for the user.

\`\`\`http
GET /messages/bookmarked?limit=50&offset=0
\`\`\`

**Response:**

\`\`\`json
{
  "messages": [
    {
      "id": "msg-uuid",
      "content": "Qualitative and quantitative research differ...",
      "confidenceScore": 0.88,
      "bookmarkNote": "Great methodology explanation",
      "bookmarkedAt": "2024-01-15T10:30:00.000Z",
      "conversationId": "conv-uuid",
      "conversationTitle": "Research Methods Discussion"
    }
  ],
  "total": 1,
  "hasMore": false
}
\`\`\`

### 4. Knowledge Base Search

#### Search Knowledge Base

Searches the knowledge base for relevant content.

\`\`\`http
GET /knowledge/search?query=literature review&category=methodology&limit=10
\`\`\`

**Query Parameters:**

- `query` (required): Search query
- `category` (optional): Filter by content category
- `language` (optional): Filter by language (default: en)
- `limit` (optional): Number of results (default: 10, max: 50)

**Response:**

\`\`\`json
{
  "results": [
    {
      "id": "kb-uuid",
      "title": "How to Conduct a Literature Review",
      "content": "A literature review is a comprehensive survey...",
      "category": "methodology",
      "tags": ["literature-review", "research", "academic-writing"],
      "relevanceScore": 0.95,
      "usageCount": 156,
      "averageRating": 4.6
    }
  ],
  "total": 1,
  "query": "literature review",
  "processingTime": 45
}
\`\`\`

## Supervisor Endpoints

### Monitor Student Interactions

Provides overview of AI assistant interactions for supervised students.

\`\`\`http
GET /supervisor/student-interactions?studentId=user-uuid&startDate=2024-01-01&endDate=2024-01-31
\`\`\`

**Query Parameters:**

- `studentId` (optional): Filter by specific student
- `projectId` (optional): Filter by project
- `startDate` (optional): Start date for analysis
- `endDate` (optional): End date for analysis
- `escalatedOnly` (optional): Show only escalated conversations
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response:**

\`\`\`json
{
  "summary": {
    "totalStudents": 25,
    "totalConversations": 156,
    "totalQuestions": 423,
    "averageConfidence": 0.78,
    "escalationRate": 0.05
  },
  "students": [
    {
      "studentId": "user-uuid",
      "studentName": "John Doe",
      "conversationCount": 8,
      "questionCount": 24,
      "averageConfidence": 0.82,
      "lastActivity": "2024-01-15T10:30:00.000Z",
      "needsAttention": false
    }
  ],
  "recentEscalations": [
    {
      "conversationId": "conv-uuid",
      "studentName": "Jane Smith",
      "question": "Complex statistical analysis question",
      "escalatedAt": "2024-01-15T09:00:00.000Z",
      "reason": "Low confidence response"
    }
  ]
}
\`\`\`

### Common Questions Analysis

Analyzes common questions to identify support needs and knowledge gaps.

\`\`\`http
GET /supervisor/common-questions?minConfidence=0.5&lowRatedOnly=true
\`\`\`

**Response:**

\`\`\`json
{
  "analysis": {
    "totalQuestions": 1250,
    "uniqueQuestions": 340,
    "averageConfidence": 0.76,
    "lowConfidenceQuestions": 85
  },
  "commonQuestions": [
    {
      "question": "How do I write a literature review?",
      "frequency": 45,
      "averageConfidence": 0.85,
      "category": "methodology",
      "needsImprovement": false
    },
    {
      "question": "What statistical test should I use?",
      "frequency": 32,
      "averageConfidence": 0.42,
      "category": "analysis",
      "needsImprovement": true
    }
  ],
  "knowledgeGaps": [
    {
      "topic": "Advanced Statistical Analysis",
      "questionCount": 28,
      "averageConfidence": 0.38,
      "priority": "high"
    }
  ]
}
\`\`\`

## Admin Endpoints

### Knowledge Base Management

#### Create Knowledge Entry

Creates a new knowledge base entry.

\`\`\`http
POST /admin/knowledge
\`\`\`

**Request Body:**

\`\`\`json
{
  "title": "Writing an Effective Literature Review",
  "content": "A literature review is a comprehensive analysis...",
  "category": "methodology",
  "tags": ["literature-review", "academic-writing", "research"],
  "keywords": ["literature", "review", "sources", "analysis"],
  "contentType": "guideline",
  "language": "en"
}
\`\`\`

**Response:**

\`\`\`json
{
  "id": "kb-uuid",
  "title": "Writing an Effective Literature Review",
  "category": "methodology",
  "contentType": "guideline",
  "language": "en",
  "isActive": true,
  "usageCount": 0,
  "averageRating": 0,
  "createdBy": "admin-uuid",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
\`\`\`

#### Update Knowledge Entry

Updates an existing knowledge base entry.

\`\`\`http
PUT /admin/knowledge/{entryId}
\`\`\`

**Request Body:**

\`\`\`json
{
  "title": "Updated: Writing an Effective Literature Review",
  "content": "Updated content with new guidelines...",
  "tags": ["literature-review", "academic-writing", "research", "updated"]
}
\`\`\`

### Response Template Management

#### Create Response Template

Creates a fallback response template.

\`\`\`http
POST /admin/templates
\`\`\`

**Request Body:**

\`\`\`json
{
  "name": "Methodology Guidance Template",
  "template": "For questions about {{topic}}, I recommend consulting your supervisor or referring to the methodology guidelines in our knowledge base.",
  "category": "methodology",
  "triggerKeywords": ["methodology", "research methods", "data collection"],
  "variables": {
    "topic": "string"
  },
  "language": "en"
}
\`\`\`

### Content Analytics

Retrieves comprehensive analytics about knowledge base and template usage.

\`\`\`http
GET /admin/analytics
\`\`\`

**Response:**

\`\`\`json
{
  "knowledgeBase": {
    "totalEntries": 156,
    "activeEntries": 142,
    "averageUsage": 23.5,
    "topCategories": [
      { "category": "methodology", "count": 45 },
      { "category": "writing", "count": 38 }
    ],
    "underutilizedContent": [
      {
        "id": "kb-uuid",
        "title": "Advanced Statistics Guide",
        "usageCount": 2,
        "lastUsed": "2024-01-10T15:00:00.000Z"
      }
    ]
  },
  "templates": {
    "totalTemplates": 28,
    "activeTemplates": 25,
    "averageUsage": 12.3,
    "effectiveness": {
      "high": 18,
      "medium": 7,
      "low": 3
    }
  },
  "contentGaps": [
    {
      "topic": "Data Visualization",
      "requestCount": 15,
      "priority": "medium",
      "suggestedAction": "Create new knowledge base entries"
    }
  ]
}
\`\`\`

## Monitoring Endpoints

### Dashboard Metrics

Retrieves comprehensive dashboard metrics for monitoring.

\`\`\`http
GET /monitoring/dashboard/metrics
\`\`\`

**Response:**

\`\`\`json
{
  "overview": {
    "totalUsers": 1250,
    "activeConversations": 89,
    "dailyQuestions": 156,
    "averageResponseTime": 2340,
    "systemHealth": "healthy",
    "uptime": 99.8
  },
  "realTime": {
    "currentLoad": 12,
    "requestsPerMinute": 8.5,
    "errorRate": 0.02,
    "averageConfidence": 0.78,
    "activeUsers": 23
  },
  "quality": {
    "userSatisfaction": 4.2,
    "responseAccuracy": 0.78,
    "fallbackRate": 0.15,
    "escalationRate": 0.05
  },
  "alerts": {
    "critical": 0,
    "warning": 2,
    "info": 1,
    "recent": []
  }
}
\`\`\`

### Performance Report

Generates comprehensive performance report.

\`\`\`http
GET /monitoring/performance/report?startDate=2024-01-01&endDate=2024-01-31
\`\`\`

**Response:**

\`\`\`json
{
  "period": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.000Z",
    "duration": "31 days"
  },
  "summary": {
    "totalRequests": 12450,
    "successRate": 0.978,
    "averageResponseTime": 2150,
    "peakLoad": 45,
    "uptime": 99.85
  },
  "trends": {
    "responseTime": [
      { "timestamp": "2024-01-01T00:00:00.000Z", "value": 2100 },
      { "timestamp": "2024-01-02T00:00:00.000Z", "value": 2200 }
    ]
  },
  "insights": [
    {
      "type": "improvement",
      "metric": "Response Time",
      "description": "Response times improved by 15% compared to previous month",
      "impact": "medium",
      "recommendations": ["Continue current optimization efforts"]
    }
  ]
}
\`\`\`

## WebSocket Events

The AI Assistant supports real-time updates via WebSocket connections.

### Connection

\`\`\`javascript
const socket = io('/ai-assistant', {
  auth: {
    token: 'your-jwt-token',
  },
});
\`\`\`

### Events

#### Conversation Updates

\`\`\`javascript
socket.on('conversation:updated', (data) => {
  console.log('Conversation updated:', data);
  // {
  //   conversationId: 'conv-uuid',
  //   type: 'new_message',
  //   message: { ... }
  // }
});
\`\`\`

#### Response Processing

\`\`\`javascript
socket.on('response:processing', (data) => {
  console.log('AI processing response:', data);
  // {
  //   conversationId: 'conv-uuid',
  //   status: 'processing',
  //   estimatedTime: 3000
  // }
});

socket.on('response:complete', (data) => {
  console.log('Response ready:', data);
  // {
  //   conversationId: 'conv-uuid',
  //   messageId: 'msg-uuid',
  //   response: { ... }
  // }
});
\`\`\`

#### System Alerts

\`\`\`javascript
socket.on('system:alert', (data) => {
  console.log('System alert:', data);
  // {
  //   type: 'maintenance',
  //   message: 'AI service will be temporarily unavailable',
  //   severity: 'warning',
  //   estimatedDuration: 300000
  // }
});
\`\`\`

## SDKs and Libraries

### JavaScript/TypeScript SDK

\`\`\`bash
npm install @fyp-platform/ai-assistant-sdk
\`\`\`

\`\`\`javascript
import { AIAssistantClient } from '@fyp-platform/ai-assistant-sdk';

const client = new AIAssistantClient({
  baseURL: 'https://api.fyp-platform.com',
  token: 'your-jwt-token',
});

// Ask a question
const response = await client.ask({
  query: 'How do I write a literature review?',
  conversationId: 'conv-uuid',
});

// Create conversation
const conversation = await client.createConversation({
  title: 'My Research Questions',
  projectId: 'project-uuid',
});
\`\`\`

### Python SDK

\`\`\`bash
pip install fyp-ai-assistant
\`\`\`

\`\`\`python
from fyp_ai_assistant import AIAssistantClient

client = AIAssistantClient(
    base_url='https://api.fyp-platform.com',
    token='your-jwt-token'
)

# Ask a question
response = client.ask(
    query='How do I write a literature review?',
    conversation_id='conv-uuid'
)

# Get conversations
conversations = client.get_conversations(limit=10)
\`\`\`

## Best Practices

### 1. Conversation Management

- **Create focused conversations**: Use separate conversations for different topics or project phases
- **Use descriptive titles**: Help organize and find conversations later
- **Include project context**: Link conversations to projects for better contextual responses

### 2. Question Formulation

- **Be specific**: "How do I analyze survey data using SPSS?" vs "How do I analyze data?"
- **Provide context**: Include relevant background information about your project
- **Use proper terminology**: Use academic and technical terms when appropriate

### 3. Response Handling

- **Check confidence scores**: Low confidence responses may need human verification
- **Bookmark useful responses**: Save important guidance for future reference
- **Rate responses**: Help improve the system by providing feedback

### 4. Error Handling

- **Implement retry logic**: Handle temporary service unavailability
- **Graceful degradation**: Provide fallback options when AI is unavailable
- **User feedback**: Inform users about system status and expected wait times

### 5. Performance Optimization

- **Cache responses**: Cache frequently asked questions locally
- **Batch requests**: Group multiple operations when possible
- **Monitor usage**: Track API usage to stay within rate limits

## Troubleshooting

### Common Issues

#### 1. Low Confidence Responses

**Problem**: AI returns responses with confidence scores below 0.5

**Solutions**:

- Rephrase the question more specifically
- Provide additional context about your project
- Check if the topic is covered in the knowledge base
- Consider contacting your supervisor for complex questions

#### 2. Rate Limit Exceeded

**Problem**: Receiving 429 status codes

**Solutions**:

- Implement exponential backoff in retry logic
- Cache responses to reduce API calls
- Upgrade to a higher rate limit tier if needed
- Distribute requests across time

#### 3. Service Unavailable

**Problem**: Receiving 503 status codes

**Solutions**:

- Check system status page
- Implement fallback to cached responses
- Retry after the suggested delay
- Use template responses for common questions

#### 4. Authentication Errors

**Problem**: Receiving 401 status codes

**Solutions**:

- Verify JWT token is valid and not expired
- Check token format in Authorization header
- Refresh token if using refresh token flow
- Contact support if persistent issues

### Getting Help

1. **Documentation**: Check this API documentation and user guides
2. **Status Page**: Monitor system status at status.fyp-platform.com
3. **Support**: Contact support@fyp-platform.com for technical issues
4. **Community**: Join the developer community forum
5. **Supervisor**: Consult your project supervisor for academic guidance

## Changelog

### Version 1.2.0 (2024-01-15)

- Added real-time WebSocket support
- Enhanced monitoring and analytics endpoints
- Improved error handling and response formats
- Added conversation context management

### Version 1.1.0 (2023-12-01)

- Added supervisor monitoring endpoints
- Enhanced knowledge base search capabilities
- Implemented response templates
- Added multilingual support

### Version 1.0.0 (2023-10-01)

- Initial API release
- Core Q&A functionality
- Basic conversation management
- Knowledge base integration
