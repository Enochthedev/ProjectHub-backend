# AI Recommendations Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the AI-Powered Recommendations system. It covers both user-facing problems and technical issues that developers and administrators might encounter.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

1. **System Health**: Check `/ai-health/status` endpoint
2. **Authentication**: Verify JWT token is valid and has correct roles
3. **Profile Completeness**: Ensure user profile has required fields
4. **API Limits**: Check if rate limits have been exceeded
5. **Service Status**: Verify AI services are operational

## Common User Issues

### 1. No Recommendations Generated

#### Symptoms

- Empty recommendation list
- "No recommendations available" message
- API returns empty array

#### Possible Causes & Solutions

**Incomplete User Profile**

\`\`\`bash
# Check profile completeness
GET /users/profile

# Required fields:
- skills (at least 3)
- interests (at least 2)
- specialization preferences
- academic level
\`\`\`

**Solution**: Guide user to complete their profile with detailed information.

**Overly Restrictive Filters**

\`\`\`bash
# Check if filters are too narrow
GET /recommendations?minSimilarityScore=0.9&includeSpecializations=VeryNiche
\`\`\`

**Solution**: Relax filter criteria or remove some filters.

**No Matching Projects**

\`\`\`bash
# Check available projects
GET /projects?specialization=UserSpecialization&difficultyLevel=UserLevel
\`\`\`

**Solution**: Expand search criteria or add more projects to the database.

**System Issues**

\`\`\`bash
# Check system health
GET /ai-health/status

# Expected response:
{
  "status": "healthy",
  "circuitBreakerState": "CLOSED",
  "rateLimitStatus": "ok"
}
\`\`\`

**Solution**: If unhealthy, check AI service connectivity and logs.

### 2. Poor Quality Recommendations

#### Symptoms

- Low similarity scores (< 50%)
- Irrelevant project suggestions
- Recommendations don't match stated interests

#### Diagnostic Steps

**Profile Analysis**

\`\`\`typescript
// Check profile quality
const profileQuality = {
  skillsCount: profile.skills?.length || 0,
  interestsCount: profile.interests?.length || 0,
  skillsSpecificity: calculateSpecificity(profile.skills),
  interestsDetail: calculateDetail(profile.interests),
};

// Quality thresholds:
// - Skills: >= 5 specific skills
// - Interests: >= 3 detailed interests
// - Specialization: clearly defined
\`\`\`

**Recommendation Analysis**

\`\`\`bash
# Get detailed explanation
GET /recommendations/{id}/explanation?projectId={projectId}

# Check explanation quality:
- Matching skills count
- Interest alignment score
- Specialization fit
- Reasoning clarity
\`\`\`

#### Solutions

**Improve Profile Quality**

1. Add more specific technical skills
2. Include detailed interest descriptions
3. Update specialization preferences
4. Add career goals and objectives

**Provide Feedback**

\`\`\`bash
# Submit feedback to improve future recommendations
POST /recommendations/{id}/feedback
{
  "projectId": "uuid",
  "feedbackType": "dislike",
  "comment": "Project doesn't match my AI/ML interests"
}
\`\`\`

**Adjust Parameters**

\`\`\`bash
# Try different parameters
GET /recommendations?includeDiversityBoost=false&minSimilarityScore=0.3
\`\`\`

### 3. Slow Recommendation Generation

#### Symptoms

- Long loading times (> 10 seconds)
- Timeout errors
- Progress indicators stuck

#### Diagnostic Steps

**Check System Load**

\`\`\`bash
# Monitor AI service metrics
GET /ai-health/metrics

# Key metrics to check:
- averageResponseTime
- requestsPerMinute
- circuitBreakerState
\`\`\`

**Network Analysis**

\`\`\`bash
# Test API connectivity
curl -w "@curl-format.txt" -o /dev/null -s "http://api/recommendations"

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer: %{time_pretransfer}\n
time_redirect:    %{time_redirect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
\`\`\`

#### Solutions

**Use Progressive Loading**

\`\`\`bash
# Start generation with progress tracking
POST /recommendations/generate-with-progress

# Monitor progress
GET /recommendations/progress/{requestId}
\`\`\`

**Leverage Caching**

\`\`\`bash
# Use cached results when available
GET /recommendations  # Uses cache by default

# Force refresh only when necessary
POST /recommendations/refresh
\`\`\`

**Optimize Parameters**

\`\`\`bash
# Reduce complexity
GET /recommendations?limit=5&includeDiversityBoost=false
\`\`\`

### 4. Rate Limiting Issues

#### Symptoms

- HTTP 429 "Too Many Requests" errors
- "Rate limit exceeded" messages
- Temporary service unavailability

#### Diagnostic Steps

**Check Rate Limit Status**

\`\`\`bash
# Monitor rate limit metrics
GET /ai-health/metrics

# Check rateLimitHits and requestsPerMinute
\`\`\`

**Review Request Patterns**

\`\`\`bash
# Analyze request frequency
GET /ai-health/diagnostics

# Look for:
- Burst request patterns
- Excessive refresh calls
- Automated/bot traffic
\`\`\`

#### Solutions

**Implement Client-Side Rate Limiting**

\`\`\`typescript
class RateLimitedService {
  private lastRequest = 0;
  private readonly minInterval = 1000; // 1 second between requests

  async getRecommendations(): Promise<RecommendationResult> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;

    if (timeSinceLastRequest < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - timeSinceLastRequest),
      );
    }

    this.lastRequest = Date.now();
    return this.makeRequest();
  }
}
\`\`\`

**Use Exponential Backoff**

\`\`\`typescript
class BackoffService {
  async requestWithBackoff(attempt = 1): Promise<any> {
    try {
      return await this.makeRequest();
    } catch (error) {
      if (error.status === 429 && attempt < 5) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.requestWithBackoff(attempt + 1);
      }
      throw error;
    }
  }
}
\`\`\`

**Cache Aggressively**

\`\`\`typescript
// Implement longer cache periods during rate limiting
const cacheService = new CacheService({
  defaultTTL: 300000, // 5 minutes
  rateLimitTTL: 1800000, // 30 minutes during rate limiting
});
\`\`\`

## Technical Issues

### 1. AI Service Connectivity Problems

#### Symptoms

- "AI service unavailable" errors
- Circuit breaker in OPEN state
- Fallback recommendations being served

#### Diagnostic Commands

**Check AI Service Health**

\`\`\`bash
# Manual health check
POST /ai-health/health-check

# Check circuit breaker status
GET /ai-health/circuit-breakers

# Review recent errors
GET /ai-health/diagnostics
\`\`\`

**Test Hugging Face API**

\`\`\`bash
# Direct API test (replace with actual API key)
curl -X POST \
  "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs": "test sentence"}'
\`\`\`

#### Solutions

**API Key Issues**

\`\`\`bash
# Verify API key configuration
echo $HUGGING_FACE_API_KEY

# Test key validity
curl -H "Authorization: Bearer $HUGGING_FACE_API_KEY" \
  "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2"
\`\`\`

**Network Connectivity**

\`\`\`bash
# Test network connectivity
ping api-inference.huggingface.co
nslookup api-inference.huggingface.co

# Check firewall rules
telnet api-inference.huggingface.co 443
\`\`\`

**Reset Circuit Breaker**

\`\`\`bash
# Manual circuit breaker reset
POST /ai-health/circuit-breaker/hugging-face-api/reset
\`\`\`

### 2. Database Performance Issues

#### Symptoms

- Slow query responses
- Database connection timeouts
- High CPU usage on database server

#### Diagnostic Queries

**Check Query Performance**

\`\`\`sql
-- PostgreSQL: Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('recommendations', 'ai_api_usage', 'recommendation_feedback');
\`\`\`

**Monitor Connection Pool**

\`\`\`bash
# Check database connections
GET /health/metrics

# Look for:
- Active connections
- Connection pool utilization
- Query response times
\`\`\`

#### Solutions

**Optimize Queries**

\`\`\`sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_recommendations_student_created
ON recommendations(student_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_ai_api_usage_created_success
ON ai_api_usage(created_at, success);

-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM recommendations
WHERE student_id = 'uuid'
ORDER BY created_at DESC LIMIT 10;
\`\`\`

**Connection Pool Tuning**

\`\`\`typescript
// Optimize TypeORM configuration
{
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  extra: {
    max: 20, // Maximum connections
    min: 5,  // Minimum connections
    acquire: 30000, // Connection timeout
    idle: 10000,    // Idle timeout
  }
}
\`\`\`

### 3. Memory and Performance Issues

#### Symptoms

- High memory usage
- Slow response times
- Application crashes or restarts

#### Diagnostic Tools

**Memory Analysis**

\`\`\`bash
# Check Node.js memory usage
GET /health/metrics/system

# Monitor heap usage
node --inspect app.js
# Then connect Chrome DevTools for heap analysis
\`\`\`

**Performance Profiling**

\`\`\`typescript
// Add performance monitoring
import { performance } from 'perf_hooks';

class PerformanceMonitor {
  measureRecommendationGeneration(fn: Function) {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    console.log(`Recommendation generation took ${end - start} milliseconds`);
    return result;
  }
}
\`\`\`

#### Solutions

**Memory Optimization**

\`\`\`typescript
// Implement proper cleanup
class RecommendationService {
  private cache = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  addToCache(key: string, value: any): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
\`\`\`

**Garbage Collection Tuning**

\`\`\`bash
# Node.js GC optimization
node --max-old-space-size=4096 --gc-interval=100 app.js
\`\`\`

### 4. Caching Issues

#### Symptoms

- Stale recommendations
- Cache misses despite recent requests
- Inconsistent recommendation results

#### Diagnostic Steps

**Check Cache Status**

\`\`\`bash
# Monitor cache performance
GET /health/metrics

# Check Redis connectivity
redis-cli ping
redis-cli info memory
\`\`\`

**Cache Analysis**

\`\`\`bash
# Check cache keys
redis-cli keys "recommendations:*"

# Check TTL values
redis-cli ttl "recommendations:user-uuid"

# Monitor cache hit/miss ratio
redis-cli info stats | grep keyspace
\`\`\`

#### Solutions

**Cache Invalidation**

\`\`\`typescript
// Implement proper cache invalidation
class CacheInvalidationService {
  async invalidateUserRecommendations(userId: string): Promise<void> {
    const pattern = `recommendations:${userId}*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateOnProfileUpdate(userId: string): Promise<void> {
    await this.invalidateUserRecommendations(userId);
    // Also invalidate related caches
    await this.invalidateUserAnalytics(userId);
  }
}
\`\`\`

**Cache Warming**

\`\`\`typescript
// Implement cache warming for popular requests
class CacheWarmingService {
  @Cron('0 */6 * * *') // Every 6 hours
  async warmPopularCaches(): Promise<void> {
    const activeUsers = await this.getActiveUsers();

    for (const user of activeUsers) {
      try {
        await this.recommendationService.getRecommendations(user.id);
      } catch (error) {
        this.logger.warn(
          `Failed to warm cache for user ${user.id}: ${error.message}`,
        );
      }
    }
  }
}
\`\`\`

## Error Code Reference

### HTTP Status Codes

| Code | Error                 | Cause                                  | Solution                         |
| ---- | --------------------- | -------------------------------------- | -------------------------------- |
| 400  | Bad Request           | Invalid parameters, incomplete profile | Validate input, complete profile |
| 401  | Unauthorized          | Invalid/expired JWT token              | Refresh authentication           |
| 403  | Forbidden             | Insufficient permissions               | Check user roles                 |
| 404  | Not Found             | Recommendation/project not found       | Verify IDs exist                 |
| 429  | Too Many Requests     | Rate limit exceeded                    | Implement backoff, use cache     |
| 500  | Internal Server Error | Server-side error                      | Check logs, contact support      |
| 503  | Service Unavailable   | AI service down                        | Use fallback, retry later        |

### Custom Error Codes

| Code                      | Error                  | Description                     | Action                          |
| ------------------------- | ---------------------- | ------------------------------- | ------------------------------- |
| AI_SERVICE_ERROR          | AI Service Unavailable | Hugging Face API issues         | Check connectivity, API key     |
| RATE_LIMIT_EXCEEDED       | Rate Limit Hit         | Too many API calls              | Implement rate limiting         |
| INSUFFICIENT_PROFILE_DATA | Incomplete Profile     | Missing required profile fields | Guide user to complete profile  |
| CIRCUIT_BREAKER_OPEN      | Circuit Breaker Open   | Service protection activated    | Wait for recovery, check health |
| CACHE_ERROR               | Cache Operation Failed | Redis connectivity issues       | Check Redis status              |

## Monitoring and Alerting

### Key Metrics to Monitor

**Performance Metrics**

- Average response time (< 5 seconds)
- Request throughput (requests/minute)
- Error rate (< 5%)
- Cache hit rate (> 80%)

**AI Service Metrics**

- API call success rate (> 95%)
- Token usage (< 90% of limit)
- Circuit breaker state (CLOSED)
- Rate limit hits (< 10/hour)

**System Metrics**

- Memory usage (< 80%)
- CPU usage (< 70%)
- Database connections (< 80% of pool)
- Disk space (< 85%)

### Alert Thresholds

\`\`\`yaml
alerts:
  critical:
    - error_rate > 10%
    - response_time > 10s
    - circuit_breaker_open
    - memory_usage > 90%

  warning:
    - error_rate > 5%
    - response_time > 5s
    - cache_hit_rate < 70%
    - token_usage > 80%

  info:
    - new_deployment
    - cache_cleared
    - maintenance_mode
\`\`\`

## Debugging Tools and Commands

### API Testing

\`\`\`bash
# Test basic functionality
curl -X GET "http://localhost:3000/recommendations" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Test with parameters
curl -X GET "http://localhost:3000/recommendations?limit=5&forceRefresh=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test feedback submission
curl -X POST "http://localhost:3000/recommendations/uuid/feedback" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"uuid","feedbackType":"like"}'
\`\`\`

### Database Queries

\`\`\`sql
-- Check recent recommendations
SELECT r.id, r.student_id, r.created_at, r.average_similarity_score,
       jsonb_array_length(r.project_suggestions) as suggestion_count
FROM recommendations r
WHERE r.created_at > NOW() - INTERVAL '1 day'
ORDER BY r.created_at DESC;

-- Check AI API usage patterns
SELECT DATE_TRUNC('hour', created_at) as hour,
       COUNT(*) as total_calls,
       COUNT(*) FILTER (WHERE success = true) as successful_calls,
       AVG(response_time_ms) as avg_response_time,
       SUM(tokens_used) as total_tokens
FROM ai_api_usage
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Check feedback patterns
SELECT feedback_type, COUNT(*) as count,
       AVG(rating) as avg_rating
FROM recommendation_feedback
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY feedback_type;
\`\`\`

### Log Analysis

\`\`\`bash
# Search for errors in logs
grep -i "error" /var/log/app.log | tail -20

# Monitor AI API calls
grep "AI API call" /var/log/app.log | grep "failed" | tail -10

# Check recommendation generation
grep "Recommendation generation" /var/log/app.log | tail -5

# Monitor performance
grep "responseTimeMs" /var/log/app.log | awk '{print $NF}' | sort -n | tail -10
\`\`\`

## Recovery Procedures

### Service Recovery

1. **Identify the Issue**

   \`\`\`bash
   # Check system health
   GET /ai-health/status
   GET /health
   \`\`\`

2. **Immediate Actions**

   \`\`\`bash
   # Reset circuit breakers if needed
   POST /ai-health/circuit-breaker/hugging-face-api/reset

   # Clear problematic cache entries
   redis-cli flushdb
   \`\`\`

3. **Service Restart**

   \`\`\`bash
   # Graceful restart
   pm2 restart app

   # Or with Docker
   docker-compose restart backend
   \`\`\`

### Data Recovery

1. **Backup Verification**

   \`\`\`bash
   # Check recent backups
   ls -la /backups/ | head -5

   # Verify backup integrity
   pg_restore --list backup.sql | head -10
   \`\`\`

2. **Selective Recovery**
   \`\`\`sql
   -- Restore specific tables if needed
   pg_restore -t recommendations backup.sql
   pg_restore -t ai_api_usage backup.sql
   \`\`\`

## Prevention Strategies

### Proactive Monitoring

1. **Health Checks**: Implement comprehensive health checks
2. **Alerting**: Set up proper alerting thresholds
3. **Logging**: Ensure detailed logging for debugging
4. **Metrics**: Track key performance indicators

### Code Quality

1. **Error Handling**: Implement robust error handling
2. **Testing**: Comprehensive unit and integration tests
3. **Code Reviews**: Regular code review process
4. **Documentation**: Keep documentation up to date

### Infrastructure

1. **Redundancy**: Implement service redundancy
2. **Scaling**: Auto-scaling based on load
3. **Backups**: Regular automated backups
4. **Security**: Regular security updates and patches

## Getting Help

### Internal Resources

1. **Documentation**: Check latest API documentation
2. **Logs**: Review application and system logs
3. **Monitoring**: Check monitoring dashboards
4. **Team**: Consult with development team

### External Resources

1. **Hugging Face Status**: Check https://status.huggingface.co/
2. **Dependencies**: Review third-party service status
3. **Community**: Check relevant community forums
4. **Support**: Contact vendor support if needed

### Escalation Process

1. **Level 1**: Developer/Administrator self-service
2. **Level 2**: Team lead or senior developer
3. **Level 3**: Architecture team or external support
4. **Level 4**: Vendor escalation or emergency response

Remember to document any issues and solutions for future reference and to improve the system's reliability.
