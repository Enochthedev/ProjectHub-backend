# AI Assistant Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the AI Assistant system. It covers both user-facing problems and technical issues that developers and administrators might encounter.

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

1. **System Health**: Check `/ai-assistant/monitoring/dashboard/metrics` endpoint
2. **Authentication**: Verify JWT token is valid and has correct roles
3. **Conversation Status**: Ensure conversation exists and is accessible
4. **AI Service**: Check Hugging Face API connectivity and rate limits
5. **Knowledge Base**: Verify knowledge base content is available and searchable

## Common User Issues

### 1. AI Assistant Not Responding

#### Symptoms

- Questions submitted but no response received
- Loading indicators stuck or spinning indefinitely
- "AI service unavailable" error messages

#### Possible Causes & Solutions

**AI Service Connectivity Issues**

\`\`\`bash
# Check AI service health
GET /ai-assistant/monitoring/dashboard/metrics

# Expected healthy response:
{
  "overview": {
    "systemHealth": "healthy",
    "uptime": 99.8,
    "averageResponseTime": 2340
  },
  "realTime": {
    "errorRate": 0.02,
    "activeUsers": 23
  }
}
\`\`\`

**Solution**: If unhealthy, check Hugging Face API status and connectivity.

**Rate Limiting**

\`\`\`bash
# Check rate limit status
GET /ai-assistant/monitoring/dashboard/metrics

# Look for high error rates or rate limit indicators
\`\`\`

**Solution**: Wait for rate limit reset or implement request queuing.

**Conversation Issues**

\`\`\`bash
# Verify conversation exists and is accessible
GET /ai-assistant/conversations/{conversationId}

# Check conversation status
{
  "status": "active", // Should not be "archived" or "escalated"
  "studentId": "user-uuid" // Should match current user
}
\`\`\`

**Solution**: Create new conversation or check conversation permissions.

### 2. Low Quality or Irrelevant Responses

#### Symptoms

- AI responses don't match the question asked
- Very low confidence scores (< 30%)
- Generic or template responses instead of AI-generated content

#### Diagnostic Steps

**Check Question Quality**

\`\`\`typescript
// Analyze question characteristics
const questionAnalysis = {
  length: question.length, // Should be 10-500 characters
  specificity: calculateSpecificity(question), // Should be > 0.3
  academicTerms: countAcademicTerms(question), // Should be > 0
  context: hasProjectContext(question), // Improves response quality
};
\`\`\`

**Review Response Metadata**

\`\`\`bash
# Check response details
POST /ai-assistant/ask
{
  "query": "How do I write a literature review?",
  "conversationId": "conv-uuid",
  "includeProjectContext": true
}

# Response should include:
{
  "confidenceScore": 0.85, // Should be > 0.5 for good responses
  "sources": ["knowledge-base-entry-1"], // Should have relevant sources
  "fromAI": true, // Should be true for AI responses
  "metadata": {
    "category": "methodology", // Should match question topic
    "requiresHumanReview": false
  }
}
\`\`\`

#### Solutions

**Improve Question Formulation**

1. **Be more specific**: "How do I structure a literature review for computer science research?" vs "How do I write?"
2. **Add context**: Include project details, field of study, specific requirements
3. **Use academic terminology**: Use proper research and academic terms
4. **Break down complex questions**: Ask one focused question at a time

**Enhance Conversation Context**

\`\`\`bash
# Link conversation to project for better context
POST /ai-assistant/conversations
{
  "title": "Literature Review Questions",
  "projectId": "project-uuid", // Important for context
  "language": "en"
}
\`\`\`

**Check Knowledge Base Coverage**

\`\`\`bash
# Search knowledge base for topic coverage
GET /ai-assistant/knowledge/search?query=literature review&category=methodology

# If no results, the topic may not be covered
\`\`\`

### 3. Conversation Management Issues

#### Symptoms

- Cannot create new conversations
- Conversations not loading or displaying incorrectly
- Messages not appearing in conversation history

#### Diagnostic Steps

**Check Conversation Limits**

\`\`\`bash
# Verify user hasn't exceeded conversation limits
GET /ai-assistant/conversations

# Check total count against limits:
// CONVERSATION_LIMITS.MAX_CONVERSATIONS_PER_USER = 50
\`\`\`

**Verify Conversation Access**

\`\`\`bash
# Ensure user has access to conversation
GET /ai-assistant/conversations/{conversationId}

# Should return conversation data, not 403 Forbidden
\`\`\`

**Check Message History**

\`\`\`bash
# Verify messages are being stored
GET /ai-assistant/conversations/{conversationId}/messages

# Should return message array with proper timestamps
\`\`\`

#### Solutions

**Conversation Limit Exceeded**

\`\`\`bash
# Archive old conversations
PUT /ai-assistant/conversations/{oldConversationId}
{
  "status": "archived"
}
\`\`\`

**Permission Issues**

- Verify user is authenticated with valid JWT token
- Check that conversation belongs to the current user
- Ensure user has appropriate role permissions

**Message Storage Issues**

- Check database connectivity and storage
- Verify message validation is passing
- Review application logs for storage errors

### 4. Bookmarking and Rating Problems

#### Symptoms

- Cannot bookmark important responses
- Rating submissions fail or don't persist
- Bookmarked messages not appearing in saved list

#### Diagnostic Steps

**Test Bookmark Functionality**

\`\`\`bash
# Try bookmarking a message
POST /ai-assistant/messages/{messageId}/bookmark
{
  "note": "Helpful methodology explanation"
}

# Should return success response
\`\`\`

**Check Saved Messages**

\`\`\`bash
# Verify bookmarks are saved
GET /ai-assistant/messages/bookmarked

# Should return array of bookmarked messages
\`\`\`

**Test Rating System**

\`\`\`bash
# Submit a rating
POST /ai-assistant/messages/{messageId}/rate
{
  "rating": 5,
  "feedback": "Very helpful response"
}
\`\`\`

#### Solutions

**Message Not Found**

- Verify message ID is correct and exists
- Check that message belongs to user's conversation
- Ensure message is not deleted or archived

**Database Issues**

- Check database connectivity
- Verify bookmark/rating tables are accessible
- Review foreign key constraints

**Validation Errors**

- Ensure rating is between 1-5
- Check that bookmark note length is within limits
- Verify message ID format is valid UUID

### 5. Search and Knowledge Base Issues

#### Symptoms

- Knowledge base search returns no results
- Search results are irrelevant or outdated
- Cannot access knowledge base content

#### Diagnostic Steps

**Test Knowledge Base Search**

\`\`\`bash
# Test basic search functionality
GET /ai-assistant/knowledge/search?query=methodology&limit=10

# Should return relevant knowledge entries
\`\`\`

**Check Search Parameters**

\`\`\`bash
# Test with different parameters
GET /ai-assistant/knowledge/search?query=literature review&category=methodology&language=en

# Verify category and language filters work
\`\`\`

**Verify Content Availability**

\`\`\`bash
# Check if knowledge base has content
GET /admin/knowledge?limit=5

# Should return knowledge entries (admin access required)
\`\`\`

#### Solutions

**No Search Results**

1. **Broaden search terms**: Use more general keywords
2. **Check spelling**: Verify search terms are spelled correctly
3. **Try different categories**: Search across multiple categories
4. **Use synonyms**: Try alternative terms for the same concept

**Outdated Content**

- Contact administrators to update knowledge base
- Report outdated content through feedback system
- Suggest new content additions

**Access Issues**

- Verify user authentication and permissions
- Check if knowledge base service is running
- Review network connectivity to knowledge base

## Technical Issues

### 1. Hugging Face API Integration Problems

#### Symptoms

- "AI service unavailable" errors consistently
- Very slow response times (> 30 seconds)
- Circuit breaker in OPEN state

#### Diagnostic Commands

**Check Hugging Face API Health**

\`\`\`bash
# Test direct API connectivity
curl -X POST \
  "https://api-inference.huggingface.co/models/distilbert-base-cased-distilled-squad" \
  -H "Authorization: Bearer $HUGGING_FACE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"question": "What is AI?", "context": "Artificial Intelligence is..."}}'
\`\`\`

**Monitor Circuit Breaker Status**

\`\`\`bash
# Check circuit breaker state
GET /ai-assistant/monitoring/dashboard/metrics

# Look for circuit breaker information in response
\`\`\`

**Review API Usage**

\`\`\`bash
# Check API usage patterns
GET /ai-assistant/monitoring/performance/report?startDate=2024-01-01&endDate=2024-01-31

# Monitor for rate limiting or quota issues
\`\`\`

#### Solutions

**API Key Issues**

\`\`\`bash
# Verify API key is set and valid
echo $HUGGING_FACE_API_KEY

# Test key with simple request
curl -H "Authorization: Bearer $HUGGING_FACE_API_KEY" \
  "https://api-inference.huggingface.co/models/distilbert-base-cased-distilled-squad"
\`\`\`

**Rate Limiting**

\`\`\`typescript
// Implement proper rate limiting
class HuggingFaceRateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 100; // per hour
  private readonly timeWindow = 3600000; // 1 hour in ms

  async canMakeRequest(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(
      (time) => now - time < this.timeWindow,
    );
    return this.requests.length < this.maxRequests;
  }

  async makeRequest(): Promise<any> {
    if (await this.canMakeRequest()) {
      this.requests.push(Date.now());
      return this.actualApiCall();
    } else {
      throw new Error('Rate limit exceeded');
    }
  }
}
\`\`\`

**Circuit Breaker Reset**

\`\`\`bash
# Manual circuit breaker reset (if endpoint exists)
POST /ai-assistant/admin/circuit-breaker/reset

# Or restart the service
pm2 restart ai-assistant-service
\`\`\`

### 2. Database Performance Issues

#### Symptoms

- Slow conversation loading
- Message history takes long to load
- Database connection timeouts

#### Diagnostic Queries

**Check Query Performance**

\`\`\`sql
-- PostgreSQL: Check slow queries related to AI Assistant
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE query LIKE '%conversations%' OR query LIKE '%conversation_messages%'
  AND mean_time > 1000
ORDER BY mean_time DESC;

-- Check index usage for AI Assistant tables
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('conversations', 'conversation_messages', 'knowledge_base_entries');
\`\`\`

**Monitor Connection Pool**

\`\`\`bash
# Check database connections
GET /health

# Look for database-related metrics
\`\`\`

#### Solutions

**Add Missing Indexes**

\`\`\`sql
-- Optimize conversation queries
CREATE INDEX CONCURRENTLY idx_conversations_student_updated
ON conversations(student_id, updated_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_conversation_created
ON conversation_messages(conversation_id, created_at ASC);

-- Optimize knowledge base search
CREATE INDEX CONCURRENTLY idx_knowledge_active_category
ON knowledge_base_entries(is_active, category) WHERE is_active = true;

-- Full-text search optimization
CREATE INDEX CONCURRENTLY idx_knowledge_search_vector
ON knowledge_base_entries USING GIN(search_vector);
\`\`\`

**Query Optimization**

\`\`\`typescript
// Implement pagination for large result sets
class ConversationService {
  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<PaginatedResult<ConversationMessage>> {
    const [messages, total] = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'ASC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    return {
      messages,
      total,
      hasMore: offset + messages.length < total,
    };
  }
}
\`\`\`

### 3. Caching and Performance Issues

#### Symptoms

- Repeated identical questions take same time to process
- High memory usage
- Inconsistent response times

#### Diagnostic Steps

**Check Cache Performance**

\`\`\`bash
# Monitor Redis cache
redis-cli info memory
redis-cli info stats

# Check cache hit rates
redis-cli info stats | grep keyspace_hits
\`\`\`

**Memory Analysis**

\`\`\`bash
# Check Node.js memory usage
GET /ai-assistant/monitoring/dashboard/metrics

# Look for memory-related metrics
\`\`\`

#### Solutions

**Implement Response Caching**

\`\`\`typescript
class ResponseCacheService {
  private readonly redis: Redis;
  private readonly CACHE_TTL = 3600; // 1 hour

  async getCachedResponse(
    queryHash: string,
  ): Promise<AssistantResponse | null> {
    const cached = await this.redis.get(`response:${queryHash}`);
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedResponse(
    queryHash: string,
    response: AssistantResponse,
  ): Promise<void> {
    await this.redis.setex(
      `response:${queryHash}`,
      this.CACHE_TTL,
      JSON.stringify(response),
    );
  }

  generateQueryHash(query: string, context: ConversationContext): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({ query, context }))
      .digest('hex');
  }
}
\`\`\`

**Context Caching**

\`\`\`typescript
class ContextCacheService {
  private readonly CONTEXT_CACHE_TTL = 1800; // 30 minutes

  async getCachedContext(
    conversationId: string,
  ): Promise<ConversationContext | null> {
    const cacheKey = `context:${conversationId}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedContext(
    conversationId: string,
    context: ConversationContext,
  ): Promise<void> {
    const cacheKey = `context:${conversationId}`;
    await this.redis.setex(
      cacheKey,
      this.CONTEXT_CACHE_TTL,
      JSON.stringify(context),
    );
  }
}
\`\`\`

### 4. Knowledge Base Management Issues

#### Symptoms

- Cannot create or update knowledge base entries
- Search results are outdated
- Content not appearing in AI responses

#### Diagnostic Steps

**Test Knowledge Base CRUD Operations**

\`\`\`bash
# Test creating knowledge entry (admin required)
POST /ai-assistant/admin/knowledge
{
  "title": "Test Entry",
  "content": "Test content for troubleshooting",
  "category": "test",
  "tags": ["test"],
  "keywords": ["test", "troubleshooting"],
  "contentType": "guideline"
}
\`\`\`

**Check Search Vector Updates**

\`\`\`sql
-- Verify search vectors are being updated
SELECT id, title, search_vector IS NOT NULL as has_search_vector
FROM knowledge_base_entries
WHERE created_at > NOW() - INTERVAL '1 day';
\`\`\`

**Test Full-Text Search**

\`\`\`sql
-- Test PostgreSQL full-text search directly
SELECT id, title, ts_rank(search_vector, plainto_tsquery('english', 'methodology')) as rank
FROM knowledge_base_entries
WHERE search_vector @@ plainto_tsquery('english', 'methodology')
ORDER BY rank DESC;
\`\`\`

#### Solutions

**Search Vector Issues**

\`\`\`sql
-- Manually update search vectors
UPDATE knowledge_base_entries
SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(keywords, ' '), '')), 'C')
WHERE search_vector IS NULL;

-- Recreate search vector trigger if needed
CREATE OR REPLACE FUNCTION update_knowledge_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
\`\`\`

**Content Synchronization**

\`\`\`typescript
// Implement knowledge base refresh
class KnowledgeBaseService {
  @Cron('0 */6 * * *') // Every 6 hours
  async refreshKnowledgeBase(): Promise<void> {
    // Clear cache
    await this.redis.del('knowledge:*');

    // Reindex content
    await this.reindexAllEntries();

    // Update usage statistics
    await this.updateUsageStatistics();
  }

  private async reindexAllEntries(): Promise<void> {
    const entries = await this.knowledgeRepository.find();
    for (const entry of entries) {
      await this.updateSearchVector(entry.id);
    }
  }
}
\`\`\`

## Error Code Reference

### HTTP Status Codes

| Code | Error                 | Cause                          | Solution                         |
| ---- | --------------------- | ------------------------------ | -------------------------------- |
| 400  | Bad Request           | Invalid query, malformed input | Validate input parameters        |
| 401  | Unauthorized          | Invalid/expired JWT token      | Refresh authentication           |
| 403  | Forbidden             | Insufficient permissions       | Check user roles and permissions |
| 404  | Not Found             | Conversation/message not found | Verify resource IDs              |
| 429  | Too Many Requests     | Rate limit exceeded            | Implement backoff, use caching   |
| 500  | Internal Server Error | Server-side error              | Check logs, contact support      |
| 503  | Service Unavailable   | AI service down                | Use fallback, retry later        |

### Custom Error Codes

| Code                        | Error                  | Description                      | Action                                |
| --------------------------- | ---------------------- | -------------------------------- | ------------------------------------- |
| CONVERSATION_NOT_FOUND      | Conversation Not Found | Invalid conversation ID          | Verify conversation exists            |
| AI_SERVICE_UNAVAILABLE      | AI Service Down        | Hugging Face API issues          | Check API status, use fallback        |
| LOW_CONFIDENCE_RESPONSE     | Low Confidence         | AI uncertain about answer        | Rephrase question, consult supervisor |
| CONVERSATION_LIMIT_EXCEEDED | Too Many Conversations | User exceeded conversation limit | Archive old conversations             |
| KNOWLEDGE_BASE_ERROR        | Knowledge Base Issue   | Search or retrieval failed       | Check knowledge base service          |

## Monitoring and Alerting

### Key Metrics to Monitor

**Performance Metrics**

- Average response time (< 15 seconds for AI responses)
- Request throughput (requests/minute)
- Error rate (< 5%)
- Cache hit rate (> 70%)

**AI Service Metrics**

- Hugging Face API success rate (> 95%)
- Average confidence score (> 0.6)
- Fallback response rate (< 20%)
- Circuit breaker state (CLOSED)

**User Experience Metrics**

- Conversation creation rate
- Message bookmark rate
- Response rating average (> 3.5/5)
- User satisfaction score

### Alert Thresholds

\`\`\`yaml
alerts:
  critical:
    - error_rate > 10%
    - response_time > 30s
    - ai_service_down
    - circuit_breaker_open

  warning:
    - error_rate > 5%
    - response_time > 15s
    - confidence_score < 0.4
    - fallback_rate > 30%

  info:
    - new_conversation_created
    - knowledge_base_updated
    - cache_cleared
\`\`\`

## Recovery Procedures

### Service Recovery Steps

1. **Identify the Issue**

   \`\`\`bash
   # Check overall system health
   GET /ai-assistant/monitoring/dashboard/metrics

   # Check specific service health
   GET /health
   \`\`\`

2. **Immediate Actions**

   \`\`\`bash
   # Clear problematic cache entries
   redis-cli flushdb

   # Reset circuit breakers
   POST /ai-assistant/admin/circuit-breaker/reset
   \`\`\`

3. **Service Restart**

   \`\`\`bash
   # Graceful restart
   pm2 restart ai-assistant

   # Or with Docker
   docker-compose restart backend
   \`\`\`

### Data Recovery

1. **Conversation Recovery**

   \`\`\`sql
   -- Restore conversations from backup
   pg_restore -t conversations -t conversation_messages backup.sql
   \`\`\`

2. **Knowledge Base Recovery**

   \`\`\`sql
   -- Restore knowledge base
   pg_restore -t knowledge_base_entries backup.sql

   -- Rebuild search vectors
   UPDATE knowledge_base_entries SET updated_at = NOW();
   \`\`\`

## Prevention Strategies

### Proactive Measures

1. **Health Monitoring**: Implement comprehensive health checks
2. **Caching Strategy**: Aggressive caching for common queries
3. **Fallback Systems**: Robust fallback mechanisms
4. **Rate Limiting**: Proper rate limiting implementation

### Code Quality

1. **Error Handling**: Comprehensive error handling and logging
2. **Testing**: Unit and integration tests for all components
3. **Validation**: Input validation and sanitization
4. **Documentation**: Keep troubleshooting guides updated

### Infrastructure

1. **Redundancy**: Multiple AI service providers if possible
2. **Monitoring**: Real-time monitoring and alerting
3. **Backups**: Regular automated backups
4. **Security**: Regular security updates and patches

## Getting Help

### Internal Resources

1. **Documentation**: Check API documentation and user guides
2. **Logs**: Review application logs for error details
3. **Monitoring**: Check monitoring dashboards
4. **Team**: Consult with development team

### External Resources

1. **Hugging Face Status**: Check https://status.huggingface.co/
2. **Dependencies**: Review third-party service status
3. **Community**: Check NestJS and AI community forums
4. **Support**: Contact technical support

### Escalation Process

1. **Level 1**: Self-service using this guide
2. **Level 2**: Development team or technical lead
3. **Level 3**: Architecture team or senior engineers
4. **Level 4**: External vendor support or emergency response

## Frequently Asked Questions

### Q: Why are AI responses sometimes slow?

A: Response time depends on question complexity, Hugging Face API load, and whether responses are cached. Complex questions requiring context building take longer.

### Q: How can I improve response quality?

A: Be specific in questions, provide context, use proper academic terminology, and link conversations to your project for better context.

### Q: What should I do if the AI gives incorrect information?

A: Rate the response poorly, provide feedback, and consult your supervisor. The system learns from feedback to improve future responses.

### Q: Can I recover deleted conversations?

A: Conversations cannot be recovered once deleted. Use the archive feature instead of deletion for conversations you might need later.

### Q: Why do some questions get template responses instead of AI responses?

A: When the AI has low confidence in its response (< 30%), the system provides template responses and suggests human consultation for accuracy.

Remember to document any new issues and solutions discovered to help improve this troubleshooting guide and the overall system reliability.
