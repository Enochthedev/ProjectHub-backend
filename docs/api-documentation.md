# AI Recommendations API Documentation

## Overview

The AI-Powered Recommendations API provides intelligent project recommendations for students based on their profiles, skills, and interests. The system uses advanced machine learning algorithms to match students with suitable final year projects.

## Base URL

\`\`\`
Production: https://api.yourapp.com
Staging: https://staging-api.yourapp.com
Development: http://localhost:3000
\`\`\`

## Authentication

All API endpoints require JWT authentication. Include the token in the Authorization header:

\`\`\`http
Authorization: Bearer <your_jwt_token>
\`\`\`

### Getting an Authentication Token

\`\`\`http
POST /auth/login
Content-Type: application/json

{
  "email": "student@university.edu",
  "password": "your_password"
}
\`\`\`

**Response:**

\`\`\`json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "user-uuid",
    "email": "student@university.edu",
    "role": "student"
  }
}
\`\`\`

## Core Endpoints

### 1. Generate Recommendations

Get personalized project recommendations based on your profile.

\`\`\`http
GET /recommendations
\`\`\`

#### Query Parameters

| Parameter                | Type     | Required | Default | Description                                     |
| ------------------------ | -------- | -------- | ------- | ----------------------------------------------- |
| `limit`                  | integer  | No       | 10      | Number of recommendations (1-20)                |
| `excludeSpecializations` | string[] | No       | -       | Specializations to exclude                      |
| `includeSpecializations` | string[] | No       | -       | Specializations to include only                 |
| `maxDifficulty`          | string   | No       | -       | Maximum difficulty level                        |
| `forceRefresh`           | boolean  | No       | false   | Bypass cache and generate fresh recommendations |
| `minSimilarityScore`     | number   | No       | 0.3     | Minimum similarity threshold (0.0-1.0)          |
| `includeDiversityBoost`  | boolean  | No       | true    | Include diversity algorithm                     |

#### Example Request

\`\`\`http
GET /recommendations?limit=5&includeSpecializations=AI,DataScience&maxDifficulty=advanced&minSimilarityScore=0.7
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

#### Response

\`\`\`json
{
  "recommendations": [
    {
      "projectId": "123e4567-e89b-12d3-a456-426614174000",
      "title": "AI-Powered Healthcare Diagnosis System",
      "abstract": "Develop a machine learning system that can assist medical professionals in diagnosing diseases from medical imaging data using deep learning techniques.",
      "specialization": "AI",
      "difficultyLevel": "advanced",
      "similarityScore": 0.87,
      "matchingSkills": [
        "Python",
        "TensorFlow",
        "Computer Vision",
        "Deep Learning"
      ],
      "matchingInterests": [
        "Healthcare Technology",
        "Machine Learning",
        "Medical Imaging"
      ],
      "reasoning": "This project aligns perfectly with your expertise in Python and machine learning, while offering opportunities to apply AI in healthcare - an area you expressed strong interest in.",
      "supervisor": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Dr. Sarah Johnson",
        "specialization": "Artificial Intelligence"
      },
      "diversityBoost": 0.15
    }
  ],
  "reasoning": "Based on your strong background in Python and machine learning, these recommendations focus on AI projects with real-world impact.",
  "averageSimilarityScore": 0.78,
  "fromCache": false,
  "generatedAt": "2024-01-15T14:30:00.000Z",
  "expiresAt": "2024-01-15T15:30:00.000Z",
  "metadata": {
    "method": "ai",
    "fallback": false,
    "projectsAnalyzed": 156,
    "cacheHitRate": 0.73,
    "processingTimeMs": 2847
  }
}
\`\`\`

#### Status Codes

| Code | Description                                                               |
| ---- | ------------------------------------------------------------------------- |
| 200  | Recommendations generated successfully                                    |
| 400  | Invalid request parameters or incomplete profile                          |
| 401  | Unauthorized - invalid or expired token                                   |
| 403  | Forbidden - insufficient permissions                                      |
| 429  | Too many requests - rate limit exceeded                                   |
| 503  | Service unavailable - AI service down (fallback recommendations provided) |

### 2. Refresh Recommendations

Force regeneration of recommendations, bypassing cache.

\`\`\`http
POST /recommendations/refresh
Authorization: Bearer <token>
\`\`\`

#### Response

Same format as GET /recommendations, but always `fromCache: false`.

### 3. Get Recommendation History

Retrieve past recommendation sets for analysis and comparison.

\`\`\`http
GET /recommendations/history
Authorization: Bearer <token>
\`\`\`

#### Query Parameters

| Parameter | Type    | Required | Default | Description                         |
| --------- | ------- | -------- | ------- | ----------------------------------- |
| `limit`   | integer | No       | 10      | Number of historical sets to return |
| `offset`  | integer | No       | 0       | Pagination offset                   |

#### Response

\`\`\`json
{
  "history": [
    {
      "id": "rec-uuid-1",
      "generatedAt": "2024-01-15T14:30:00.000Z",
      "recommendationCount": 10,
      "averageSimilarityScore": 0.78,
      "method": "ai",
      "fromCache": false
    }
  ],
  "total": 25,
  "hasMore": true
}
\`\`\`

### 4. Submit Feedback

Provide feedback on recommendations to improve future suggestions.

\`\`\`http
POST /recommendations/{recommendationId}/feedback
Content-Type: application/json
Authorization: Bearer <token>
\`\`\`

#### Path Parameters

| Parameter          | Type   | Required | Description                    |
| ------------------ | ------ | -------- | ------------------------------ |
| `recommendationId` | string | Yes      | UUID of the recommendation set |

#### Request Body

\`\`\`json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "feedbackType": "like",
  "rating": 4.5,
  "comment": "Great match for my interests in AI and healthcare"
}
\`\`\`

#### Feedback Types

| Type       | Description         | Additional Fields        |
| ---------- | ------------------- | ------------------------ |
| `like`     | Positive feedback   | `comment` (optional)     |
| `dislike`  | Negative feedback   | `comment` (optional)     |
| `rating`   | Numerical rating    | `rating` (1-5, required) |
| `bookmark` | Save for later      | -                        |
| `view`     | Track project views | -                        |

#### Response

\`\`\`json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "feedbackId": "feedback-uuid"
}
\`\`\`

### 5. Get Detailed Explanation

Get comprehensive explanation for why a specific project was recommended.

\`\`\`http
GET /recommendations/{recommendationId}/explanation?projectId={projectId}
Authorization: Bearer <token>
\`\`\`

#### Query Parameters

| Parameter   | Type   | Required | Description                    |
| ----------- | ------ | -------- | ------------------------------ |
| `projectId` | string | Yes      | UUID of the project to explain |

#### Response

\`\`\`json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "similarityScore": 0.87,
  "explanation": {
    "skillAnalysis": {
      "matchingSkills": ["Python", "TensorFlow", "Computer Vision"],
      "skillGaps": ["Medical Imaging Processing", "DICOM Standards"],
      "skillOverlap": 0.75,
      "learningOpportunities": [
        "Advanced CNN Architectures",
        "Medical Data Ethics"
      ]
    },
    "interestAlignment": {
      "directMatches": ["Healthcare Technology", "Machine Learning"],
      "relatedAreas": ["Biomedical Engineering", "Data Ethics"],
      "interestScore": 0.82,
      "explorationPotential": [
        "Medical Device Integration",
        "Clinical Workflow"
      ]
    },
    "careerRelevance": {
      "industryConnections": ["Healthcare AI", "Medical Technology"],
      "skillDevelopment": ["Domain Expertise", "Regulatory Knowledge"],
      "portfolioValue": "High - demonstrates real-world AI application",
      "marketDemand": "Very High - growing field with strong job prospects"
    },
    "confidenceLevel": "high",
    "reasoning": "This project offers an excellent opportunity to apply your machine learning expertise in a high-impact domain..."
  }
}
\`\`\`

### 6. Get Accessible Explanation

Get user-friendly explanation with visual elements and plain language.

\`\`\`http
GET /recommendations/{recommendationId}/accessible-explanation?projectId={projectId}
Authorization: Bearer <token>
\`\`\`

#### Response

\`\`\`json
{
  "projectId": "123e4567-e89b-12d3-a456-426614174000",
  "accessibleExplanation": {
    "summary": "This project is a 87% match for your profile",
    "visualElements": {
      "similarityBar": {
        "percentage": 87,
        "color": "green",
        "label": "Excellent Match"
      },
      "skillsChart": {
        "matching": 6,
        "total": 8,
        "percentage": 75
      }
    },
    "plainLanguage": {
      "whyRecommended": "We recommended this project because you have strong skills in Python and machine learning, and you've shown interest in healthcare applications.",
      "whatYoullLearn": "You'll learn about medical imaging, healthcare data standards, and how to build AI systems for clinical use.",
      "challenges": "The main challenges will be understanding medical terminology and working with sensitive healthcare data.",
      "opportunities": "This project could lead to careers in healthcare technology, medical AI, or biomedical engineering."
    },
    "definitions": {
      "Computer Vision": "A field of AI that teaches computers to interpret and understand visual information from images and videos",
      "DICOM": "A standard format for storing and sharing medical images like X-rays and MRI scans"
    }
  }
}
\`\`\`

## Advanced Features

### 7. Progressive Loading

Start recommendation generation with real-time progress updates.

\`\`\`http
POST /recommendations/generate-with-progress
Content-Type: application/json
Authorization: Bearer <token>
\`\`\`

#### Request Body

\`\`\`json
{
  "limit": 10,
  "includeSpecializations": ["AI", "DataScience"],
  "minSimilarityScore": 0.6
}
\`\`\`

#### Response

\`\`\`json
{
  "requestId": "progress-uuid",
  "message": "Recommendation generation started",
  "estimatedTimeMs": 5000
}
\`\`\`

### 8. Monitor Progress

Get real-time updates on recommendation generation progress.

\`\`\`http
GET /recommendations/progress/{requestId}
Authorization: Bearer <token>
\`\`\`

#### Response

\`\`\`json
{
  "requestId": "progress-uuid",
  "progress": 65,
  "stage": "Calculating similarity scores",
  "estimatedTimeRemaining": 2000,
  "completed": false,
  "result": null,
  "error": null
}
\`\`\`

When completed:

\`\`\`json
{
  "requestId": "progress-uuid",
  "progress": 100,
  "stage": "Complete",
  "estimatedTimeRemaining": 0,
  "completed": true,
  "result": {
    // Full RecommendationResultDto
  },
  "error": null
}
\`\`\`

### 9. Batch Processing (Admin Only)

Generate recommendations for multiple students (requires admin role).

\`\`\`http
POST /recommendations/batch
Content-Type: application/json
Authorization: Bearer <admin_token>
\`\`\`

#### Request Body

\`\`\`json
{
  "studentIds": ["student-uuid-1", "student-uuid-2", "student-uuid-3"],
  "options": {
    "limit": 10,
    "includeSpecializations": ["AI", "WebDev"],
    "minSimilarityScore": 0.5
  }
}
\`\`\`

#### Response

\`\`\`json
{
  "batchId": "batch-uuid",
  "message": "Batch processing started",
  "studentCount": 3,
  "estimatedCompletionTime": "2024-01-15T14:45:00.000Z"
}
\`\`\`

### 10. Get Batch Status

Monitor batch processing progress (admin only).

\`\`\`http
GET /recommendations/batch/{batchId}
Authorization: Bearer <admin_token>
\`\`\`

#### Response

\`\`\`json
{
  "batchId": "batch-uuid",
  "status": "processing",
  "progress": {
    "completed": 2,
    "total": 3,
    "percentage": 67
  },
  "results": {
    "student-uuid-1": {
      "status": "completed",
      "recommendationCount": 10,
      "averageScore": 0.78
    },
    "student-uuid-2": {
      "status": "completed",
      "recommendationCount": 8,
      "averageScore": 0.65
    },
    "student-uuid-3": {
      "status": "processing",
      "progress": 45
    }
  },
  "errors": [],
  "startedAt": "2024-01-15T14:30:00.000Z",
  "estimatedCompletion": "2024-01-15T14:45:00.000Z"
}
\`\`\`

## Health and Monitoring Endpoints

### 11. AI Service Health

Check the health status of AI services (public endpoint).

\`\`\`http
GET /ai-health/status
\`\`\`

#### Response

\`\`\`json
{
  "status": "healthy",
  "circuitBreakerState": "CLOSED",
  "rateLimitStatus": "ok",
  "responseTimeStatus": "fast",
  "errorRateStatus": "low",
  "lastHealthCheck": "2024-01-15T14:30:00.000Z",
  "issues": [],
  "recommendations": []
}
\`\`\`

### 12. AI Service Metrics (Admin/Supervisor Only)

Get detailed AI service metrics.

\`\`\`http
GET /ai-health/metrics
Authorization: Bearer <admin_token>
\`\`\`

#### Response

\`\`\`json
{
  "totalRequests": 1250,
  "successfulRequests": 1198,
  "failedRequests": 52,
  "averageResponseTime": 2847,
  "totalTokensUsed": 45230,
  "rateLimitHits": 3,
  "circuitBreakerTrips": 1,
  "successRate": 95.84,
  "requestsPerMinute": 12.5,
  "lastRequestTime": "2024-01-15T14:29:45.000Z"
}
\`\`\`

## Error Handling

### Error Response Format

All errors follow a consistent format:

\`\`\`json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "path": "/recommendations",
  "details": {
    "code": "VALIDATION_ERROR",
    "context": {
      "field": "limit",
      "value": 25,
      "constraint": "max value is 20"
    }
  }
}
\`\`\`

### Common Error Codes

| HTTP Code | Error Code                | Description                | Solution                                   |
| --------- | ------------------------- | -------------------------- | ------------------------------------------ |
| 400       | VALIDATION_ERROR          | Invalid request parameters | Check parameter values and types           |
| 400       | INSUFFICIENT_PROFILE_DATA | User profile incomplete    | Complete profile with skills and interests |
| 401       | UNAUTHORIZED              | Invalid or expired token   | Refresh authentication token               |
| 403       | FORBIDDEN                 | Insufficient permissions   | Check user role requirements               |
| 404       | NOT_FOUND                 | Resource not found         | Verify IDs exist and are accessible        |
| 429       | RATE_LIMIT_EXCEEDED       | Too many requests          | Implement rate limiting, use cache         |
| 503       | AI_SERVICE_UNAVAILABLE    | AI service down            | Fallback recommendations provided          |
| 500       | INTERNAL_SERVER_ERROR     | Server error               | Contact support with error details         |

### Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Students**: 60 requests per minute, 1000 requests per hour
- **Supervisors**: 120 requests per minute, 2000 requests per hour
- **Admins**: 300 requests per minute, 5000 requests per hour

Rate limit headers are included in responses:

\`\`\`http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248600
Retry-After: 60
\`\`\`

## SDK and Client Libraries

### JavaScript/TypeScript

\`\`\`bash
npm install @yourapp/recommendations-sdk
\`\`\`

\`\`\`typescript
import { RecommendationsClient } from '@yourapp/recommendations-sdk';

const client = new RecommendationsClient({
  baseURL: 'https://api.yourapp.com',
  apiKey: 'your-api-key',
});

// Get recommendations
const recommendations = await client.getRecommendations({
  limit: 10,
  includeSpecializations: ['AI', 'WebDev'],
});

// Submit feedback
await client.submitFeedback('recommendation-id', {
  projectId: 'project-id',
  feedbackType: 'like',
  comment: 'Great match!',
});
\`\`\`

### Python

\`\`\`bash
pip install yourapp-recommendations-sdk
\`\`\`

\`\`\`python
from yourapp_recommendations import RecommendationsClient

client = RecommendationsClient(
    base_url='https://api.yourapp.com',
    api_key='your-api-key'
)

# Get recommendations
recommendations = client.get_recommendations(
    limit=10,
    include_specializations=['AI', 'WebDev']
)

# Submit feedback
client.submit_feedback(
    recommendation_id='recommendation-id',
    project_id='project-id',
    feedback_type='like',
    comment='Great match!'
)
\`\`\`

## Testing

### Postman Collection

Import the Postman collection for easy API testing:

\`\`\`json
{
  "info": {
    "name": "AI Recommendations API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{auth_token}}",
        "type": "string"
      }
    ]
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "auth_token",
      "value": ""
    }
  ]
}
\`\`\`

### cURL Examples

\`\`\`bash
# Get recommendations
curl -X GET "http://localhost:3000/recommendations?limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Submit feedback
curl -X POST "http://localhost:3000/recommendations/rec-id/feedback" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-id",
    "feedbackType": "like",
    "comment": "Perfect match!"
  }'

# Check health
curl -X GET "http://localhost:3000/ai-health/status"
\`\`\`

## Webhooks (Coming Soon)

Subscribe to recommendation events:

- `recommendation.generated` - New recommendations created
- `recommendation.feedback` - Feedback submitted
- `recommendation.expired` - Recommendations expired
- `system.health_changed` - AI service health status changed

## Changelog

### v1.2.0 (2024-01-15)

- Added progressive loading for long-running requests
- Enhanced accessibility explanations
- Improved error handling and recovery
- Added batch processing for admins

### v1.1.0 (2024-01-01)

- Added detailed explanation endpoints
- Implemented feedback learning system
- Enhanced monitoring and health checks
- Added rate limiting and circuit breaker

### v1.0.0 (2023-12-01)

- Initial release
- Basic recommendation generation
- Authentication and authorization
- Caching and fallback mechanisms

## Support

- **Documentation**: https://docs.yourapp.com/api
- **Status Page**: https://status.yourapp.com
- **Support Email**: api-support@yourapp.com
- **Developer Forum**: https://forum.yourapp.com/api

For technical issues, include:

- Request/response examples
- Error messages and codes
- Timestamp of the issue
- Your user ID (for account-specific issues)
