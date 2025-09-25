# AI Service Integration Developer Guide

## Overview

This guide provides comprehensive documentation for developers working with the AI-Powered Recommendations system. It covers integration patterns, API usage, error handling, and best practices for building applications that leverage the AI recommendation engine.

## Architecture Overview

### System Components

\`\`\`mermaid
graph TB
    Client[Client Application] --> API[Recommendation API]
    API --> Service[Recommendation Service]
    Service --> AI[AI Service Layer]
    Service --> Cache[Cache Service]
    Service --> Fallback[Fallback Service]

    AI --> HF[Hugging Face API]
    AI --> CB[Circuit Breaker]
    AI --> RL[Rate Limiter]

    Service --> DB[(Database)]
    Cache --> Redis[(Redis)]

    Monitor[Monitoring Service] --> API
    Monitor --> AI
    Monitor --> Service
\`\`\`

### Key Services

1. **RecommendationService**: Main orchestration service
2. **AIService**: Handles AI API interactions
3. **HuggingFaceService**: Manages Hugging Face API calls
4. **FallbackRecommendationService**: Provides rule-based recommendations
5. **CircuitBreakerService**: Prevents cascading failures
6. **AIMonitoringService**: Tracks performance and health
7. **AILoggingService**: Provides structured logging

## API Reference

### Authentication

All recommendation endpoints require JWT authentication with appropriate roles:

\`\`\`typescript
// Headers required for all requests
{
  "Authorization": "Bearer <jwt_token>",
  "Content-Type": "application/json"
}
\`\`\`

### Core Endpoints

#### Generate Recommendations

\`\`\`http
GET /recommendations?limit=10&includeSpecializations=AI,WebDev
\`\`\`

**Parameters**:

- `limit` (optional): Number of recommendations (1-20, default: 10)
- `excludeSpecializations` (optional): Array of specializations to exclude
- `includeSpecializations` (optional): Array of specializations to include
- `maxDifficulty` (optional): Maximum difficulty level
- `forceRefresh` (optional): Bypass cache (default: false)
- `minSimilarityScore` (optional): Minimum similarity threshold (0.0-1.0)
- `includeDiversityBoost` (optional): Include diversity algorithm (default: true)

**Response**:

\`\`\`typescript
interface RecommendationResult {
  recommendations: ProjectRecommendation[];
  reasoning: string;
  averageSimilarityScore: number;
  fromCache: boolean;
  generatedAt: Date;
  expiresAt?: Date;
  metadata: {
    method: 'ai' | 'fallback' | 'cached';
    processingTime: number;
    aiApiCalls: number;
    tokensUsed: number;
  };
}

interface ProjectRecommendation {
  projectId: string;
  title: string;
  abstract: string;
  specialization: string;
  difficultyLevel: DifficultyLevel;
  similarityScore: number;
  matchingSkills: string[];
  matchingInterests: string[];
  reasoning: string;
  supervisor: SupervisorSummary;
  diversityBoost?: number;
}
\`\`\`

#### Refresh Recommendations

\`\`\`http
POST /recommendations/refresh
\`\`\`

Forces regeneration of recommendations, bypassing cache. Useful after profile updates.

#### Get Recommendation History

\`\`\`http
GET /recommendations/history
\`\`\`

Returns past recommendation sets for the authenticated user.

#### Submit Feedback

\`\`\`http
POST /recommendations/{recommendationId}/feedback
Content-Type: application/json

{
  "projectId": "uuid",
  "feedbackType": "like" | "dislike" | "rating" | "bookmark" | "view",
  "rating": 4.5,
  "comment": "Optional feedback comment"
}
\`\`\`

#### Get Explanation

\`\`\`http
GET /recommendations/{recommendationId}/explanation?projectId={projectId}
\`\`\`

Returns detailed explanation of why a project was recommended.

### Progressive Loading

For long-running recommendation generation:

\`\`\`http
POST /recommendations/generate-with-progress
\`\`\`

Returns a request ID for tracking progress:

\`\`\`http
GET /recommendations/progress/{requestId}
\`\`\`

### Batch Processing (Admin Only)

\`\`\`http
POST /recommendations/batch
Content-Type: application/json

{
  "studentIds": ["uuid1", "uuid2"],
  "options": {
    "limit": 10,
    "includeSpecializations": ["AI"]
  }
}
\`\`\`

## Integration Patterns

### Basic Integration

\`\`\`typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable()
export class RecommendationService {
  constructor(private http: HttpClient) {}

  getRecommendations(
    options?: RecommendationOptions,
  ): Observable<RecommendationResult> {
    const params = new HttpParams();

    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.includeSpecializations) {
      params.set(
        'includeSpecializations',
        options.includeSpecializations.join(','),
      );
    }

    return this.http.get<RecommendationResult>('/api/recommendations', {
      params,
    });
  }

  submitFeedback(
    recommendationId: string,
    feedback: FeedbackData,
  ): Observable<void> {
    return this.http.post<void>(
      `/api/recommendations/${recommendationId}/feedback`,
      feedback,
    );
  }
}
\`\`\`

### Error Handling

\`\`\`typescript
import { catchError, retry, timeout } from 'rxjs/operators';
import { of, throwError } from 'rxjs';

@Injectable()
export class RecommendationService {
  getRecommendations(
    options?: RecommendationOptions,
  ): Observable<RecommendationResult> {
    return this.http
      .get<RecommendationResult>('/api/recommendations', { params })
      .pipe(
        timeout(30000), // 30 second timeout
        retry(2), // Retry up to 2 times
        catchError(this.handleError),
      );
  }

  private handleError(error: any): Observable<RecommendationResult> {
    if (error.status === 429) {
      // Rate limit exceeded
      return throwError('Too many requests. Please try again later.');
    } else if (error.status === 503) {
      // Service unavailable - fallback recommendations provided
      return of(error.error); // Return fallback recommendations
    } else if (error.status === 400) {
      // Bad request - likely incomplete profile
      return throwError('Please complete your profile to get recommendations.');
    }

    return throwError('Unable to get recommendations. Please try again.');
  }
}
\`\`\`

### Caching Strategy

\`\`\`typescript
@Injectable()
export class RecommendationCacheService {
  private cache = new Map<
    string,
    { data: RecommendationResult; timestamp: number }
  >();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  getRecommendations(
    options?: RecommendationOptions,
  ): Observable<RecommendationResult> {
    const cacheKey = this.generateCacheKey(options);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return of({ ...cached.data, fromCache: true });
    }

    return this.recommendationService.getRecommendations(options).pipe(
      tap((result) => {
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      }),
    );
  }

  invalidateCache(): void {
    this.cache.clear();
  }
}
\`\`\`

### Progressive Loading Implementation

\`\`\`typescript
@Injectable()
export class ProgressiveRecommendationService {
  generateWithProgress(
    options?: RecommendationOptions,
  ): Observable<ProgressUpdate> {
    return this.http
      .post<{
        requestId: string;
      }>('/api/recommendations/generate-with-progress', options)
      .pipe(switchMap((response) => this.pollProgress(response.requestId)));
  }

  private pollProgress(requestId: string): Observable<ProgressUpdate> {
    return interval(1000) // Poll every second
      .pipe(
        switchMap(() =>
          this.http.get<ProgressUpdate>(
            `/api/recommendations/progress/${requestId}`,
          ),
        ),
        takeWhile((update) => !update.completed, true), // Include final update
        distinctUntilChanged((a, b) => a.progress === b.progress),
      );
  }
}

interface ProgressUpdate {
  requestId: string;
  progress: number; // 0-100
  stage: string;
  estimatedTimeRemaining?: number;
  completed: boolean;
  result?: RecommendationResult;
  error?: string;
}
\`\`\`

## Error Handling

### HTTP Status Codes

| Code | Meaning             | Action                                     |
| ---- | ------------------- | ------------------------------------------ |
| 200  | Success             | Process recommendations normally           |
| 400  | Bad Request         | Check request parameters, complete profile |
| 401  | Unauthorized        | Refresh authentication token               |
| 403  | Forbidden           | Check user role permissions                |
| 404  | Not Found           | Verify recommendation/project IDs          |
| 429  | Rate Limited        | Implement backoff, show cached results     |
| 503  | Service Unavailable | Use fallback recommendations, retry later  |
| 500  | Server Error        | Log error, show generic error message      |

### Error Response Format

\`\`\`typescript
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
  details?: {
    code: string;
    context?: any;
  };
}
\`\`\`

### Specific Error Handling

#### Rate Limiting

\`\`\`typescript
class RateLimitHandler {
  private retryAfter: number = 0;

  handleRateLimit(error: HttpErrorResponse): Observable<any> {
    this.retryAfter = parseInt(error.headers.get('Retry-After') || '60');

    return timer(this.retryAfter * 1000).pipe(
      switchMap(() => {
        // Retry the original request
        return this.originalRequest();
      }),
    );
  }
}
\`\`\`

#### Circuit Breaker Pattern

\`\`\`typescript
class ClientCircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  execute<T>(operation: () => Observable<T>): Observable<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        return throwError('Service temporarily unavailable');
      }
    }

    return operation().pipe(
      tap(() => this.onSuccess()),
      catchError((error) => {
        this.onFailure();
        return throwError(error);
      }),
    );
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
\`\`\`

## Performance Optimization

### Request Optimization

\`\`\`typescript
// Batch multiple requests
class BatchRequestService {
  private pendingRequests = new Map<string, Observable<any>>();

  getRecommendations(
    studentId: string,
    options?: RecommendationOptions,
  ): Observable<RecommendationResult> {
    const key = `${studentId}_${JSON.stringify(options)}`;

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const request = this.http
      .get<RecommendationResult>('/api/recommendations', { params })
      .pipe(
        finalize(() => this.pendingRequests.delete(key)),
        share(), // Share the observable among multiple subscribers
      );

    this.pendingRequests.set(key, request);
    return request;
  }
}
\`\`\`

### Lazy Loading

\`\`\`typescript
// Lazy load recommendation details
@Component({
  template: `
    <div *ngFor="let rec of recommendations">
      <recommendation-card
        [recommendation]="rec"
        (loadDetails)="loadDetails(rec.projectId)"
      >
      </recommendation-card>
    </div>
  `,
})
export class RecommendationListComponent {
  loadDetails(projectId: string): void {
    // Only load detailed explanation when requested
    this.recommendationService
      .getExplanation(this.recommendationId, projectId)
      .subscribe((explanation) => {
        // Update UI with detailed explanation
      });
  }
}
\`\`\`

### Pagination

\`\`\`typescript
class PaginatedRecommendationService {
  getRecommendations(
    page: number = 1,
    pageSize: number = 10,
  ): Observable<PaginatedResult> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', pageSize.toString());

    return this.http.get<PaginatedResult>('/api/recommendations', { params });
  }
}

interface PaginatedResult {
  recommendations: ProjectRecommendation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
\`\`\`

## Testing

### Unit Testing

\`\`\`typescript
describe('RecommendationService', () => {
  let service: RecommendationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecommendationService],
    });

    service = TestBed.inject(RecommendationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should get recommendations', () => {
    const mockResponse: RecommendationResult = {
      recommendations: [
        {
          projectId: 'test-id',
          title: 'Test Project',
          similarityScore: 0.85,
          // ... other properties
        },
      ],
      reasoning: 'Test reasoning',
      averageSimilarityScore: 0.85,
      fromCache: false,
      generatedAt: new Date(),
      metadata: {
        method: 'ai',
        processingTime: 1000,
        aiApiCalls: 2,
        tokensUsed: 150,
      },
    };

    service.getRecommendations().subscribe((result) => {
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].title).toBe('Test Project');
    });

    const req = httpMock.expectOne('/api/recommendations');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should handle rate limiting', () => {
    service.getRecommendations().subscribe(
      () => fail('Should have failed'),
      (error) =>
        expect(error).toBe('Too many requests. Please try again later.'),
    );

    const req = httpMock.expectOne('/api/recommendations');
    req.flush({}, { status: 429, statusText: 'Too Many Requests' });
  });
});
\`\`\`

### Integration Testing

\`\`\`typescript
describe('Recommendation Integration', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for testing
    authToken = await getTestAuthToken();
  });

  it('should generate recommendations for student', async () => {
    const response = await request(app.getHttpServer())
      .get('/recommendations')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.recommendations).toBeDefined();
    expect(response.body.recommendations.length).toBeGreaterThan(0);
    expect(response.body.averageSimilarityScore).toBeGreaterThan(0);
  });

  it('should handle invalid parameters', async () => {
    await request(app.getHttpServer())
      .get('/recommendations?limit=25') // Exceeds maximum
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);
  });
});
\`\`\`

## Monitoring and Debugging

### Client-Side Monitoring

\`\`\`typescript
@Injectable()
export class RecommendationMonitoringService {
  private metrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    cacheHitRate: 0,
  };

  trackRequest(startTime: number, success: boolean, fromCache: boolean): void {
    this.metrics.requestCount++;

    if (!success) {
      this.metrics.errorCount++;
    }

    if (fromCache) {
      this.metrics.cacheHitRate =
        (this.metrics.cacheHitRate * (this.metrics.requestCount - 1) + 1) /
        this.metrics.requestCount;
    }

    const responseTime = Date.now() - startTime;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (this.metrics.requestCount - 1) +
        responseTime) /
      this.metrics.requestCount;
  }

  getMetrics(): any {
    return { ...this.metrics };
  }
}
\`\`\`

### Logging

\`\`\`typescript
@Injectable()
export class RecommendationLogger {
  logRequest(
    options: RecommendationOptions,
    result: RecommendationResult,
  ): void {
    console.log('Recommendation Request', {
      timestamp: new Date().toISOString(),
      options,
      resultCount: result.recommendations.length,
      averageScore: result.averageSimilarityScore,
      fromCache: result.fromCache,
      processingTime: result.metadata.processingTime,
    });
  }

  logError(error: any, context: string): void {
    console.error('Recommendation Error', {
      timestamp: new Date().toISOString(),
      context,
      error: error.message,
      stack: error.stack,
    });
  }
}
\`\`\`

## Security Considerations

### Input Validation

\`\`\`typescript
class RecommendationValidator {
  validateOptions(options: RecommendationOptions): ValidationResult {
    const errors: string[] = [];

    if (options.limit && (options.limit < 1 || options.limit > 20)) {
      errors.push('Limit must be between 1 and 20');
    }

    if (
      options.minSimilarityScore &&
      (options.minSimilarityScore < 0 || options.minSimilarityScore > 1)
    ) {
      errors.push('Minimum similarity score must be between 0 and 1');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
\`\`\`

### Data Sanitization

\`\`\`typescript
class DataSanitizer {
  sanitizeFeedback(feedback: FeedbackData): FeedbackData {
    return {
      ...feedback,
      comment: this.sanitizeString(feedback.comment),
      rating: this.clampRating(feedback.rating),
    };
  }

  private sanitizeString(input?: string): string | undefined {
    if (!input) return undefined;

    // Remove HTML tags and limit length
    return input
      .replace(/<[^>]*>/g, '')
      .substring(0, 1000)
      .trim();
  }

  private clampRating(rating?: number): number | undefined {
    if (rating === undefined) return undefined;
    return Math.max(1, Math.min(5, rating));
  }
}
\`\`\`

## Best Practices

### 1. Error Handling

- Always implement proper error handling for all API calls
- Provide meaningful error messages to users
- Implement retry logic with exponential backoff
- Use circuit breaker pattern for resilience

### 2. Performance

- Implement client-side caching for frequently accessed data
- Use pagination for large result sets
- Implement lazy loading for detailed information
- Batch requests when possible

### 3. User Experience

- Show loading indicators for long-running operations
- Provide progress updates for complex operations
- Implement offline support with cached data
- Use optimistic updates where appropriate

### 4. Security

- Always validate input parameters
- Sanitize user-provided data
- Implement proper authentication and authorization
- Use HTTPS for all API communications

### 5. Monitoring

- Track API usage and performance metrics
- Log errors and exceptions for debugging
- Monitor cache hit rates and effectiveness
- Set up alerts for critical failures

## Troubleshooting

### Common Issues

1. **Recommendations not loading**
   - Check authentication token validity
   - Verify user profile completeness
   - Check network connectivity
   - Review browser console for errors

2. **Poor recommendation quality**
   - Ensure user profile is detailed and current
   - Check if diversity boost is affecting results
   - Verify feedback is being submitted correctly
   - Consider adjusting similarity thresholds

3. **Slow performance**
   - Check if requests are being cached properly
   - Monitor API response times
   - Verify efficient request batching
   - Check for memory leaks in client code

4. **Rate limiting issues**
   - Implement proper backoff strategies
   - Use cached results when available
   - Consider request queuing for high-volume applications
   - Monitor request patterns and optimize

### Debug Tools

\`\`\`typescript
// Debug helper for recommendation analysis
class RecommendationDebugger {
  analyzeRecommendations(result: RecommendationResult): DebugInfo {
    return {
      totalRecommendations: result.recommendations.length,
      scoreDistribution: this.calculateScoreDistribution(
        result.recommendations,
      ),
      specializationCoverage: this.calculateSpecializationCoverage(
        result.recommendations,
      ),
      averageScore: result.averageSimilarityScore,
      cacheStatus: result.fromCache,
      processingMetrics: result.metadata,
    };
  }

  private calculateScoreDistribution(
    recommendations: ProjectRecommendation[],
  ): any {
    const buckets = { high: 0, medium: 0, low: 0 };

    recommendations.forEach((rec) => {
      if (rec.similarityScore >= 0.8) buckets.high++;
      else if (rec.similarityScore >= 0.6) buckets.medium++;
      else buckets.low++;
    });

    return buckets;
  }
}
\`\`\`

This developer guide provides comprehensive information for integrating with the AI-Powered Recommendations system. For the most up-to-date API documentation, always refer to the Swagger/OpenAPI documentation available at `/api/docs` when the application is running.
