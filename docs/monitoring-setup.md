# AI Recommendations Monitoring Setup Guide

## Overview

This document provides comprehensive setup instructions for monitoring the AI-Powered Recommendations system, including logging, alerting, and performance monitoring.

## Architecture

The monitoring system consists of several components:

- **AI Monitoring Service**: Tracks AI API usage, performance metrics, and health status
- **AI Logging Service**: Provides structured logging for AI operations and debugging
- **AI Alerting Service**: Monitors thresholds and sends alerts when issues are detected
- **Health Endpoints**: Provides health checks and diagnostic information
- **Circuit Breaker**: Prevents cascading failures and provides resilience

## Health Endpoints

### Basic Health Checks

\`\`\`bash
# General application health
GET /health

# Readiness probe (for Kubernetes)
GET /health/ready

# Liveness probe (for Kubernetes)
GET /health/live

# Application metrics
GET /health/metrics
\`\`\`

### AI-Specific Health Endpoints

\`\`\`bash
# AI service health status
GET /ai-health/status

# AI service metrics (requires admin/supervisor role)
GET /ai-health/metrics

# Active alerts (requires admin role)
GET /ai-health/alerts

# Comprehensive diagnostics (requires admin role)
GET /ai-health/diagnostics

# Circuit breaker status (requires admin/supervisor role)
GET /ai-health/circuit-breakers
\`\`\`

### Administrative Endpoints

\`\`\`bash
# Resolve an alert (requires admin role)
POST /ai-health/alerts/{alertId}/resolve

# Reset circuit breaker (requires admin role)
POST /ai-health/circuit-breaker/{serviceName}/reset

# Manual health check (requires admin role)
POST /ai-health/health-check

# Reset metrics (requires admin role)
POST /ai-health/metrics/reset
\`\`\`

## Monitoring Configuration

### Environment Variables

Add these environment variables to your `.env` file:

\`\`\`bash
# Logging Configuration
LOG_LEVEL=info                    # debug, info, warn, error
AI_LOG_RETENTION_DAYS=30         # Days to keep AI logs
ENABLE_PERFORMANCE_LOGGING=true   # Enable detailed performance logging

# Monitoring Configuration
AI_MONITORING_ENABLED=true        # Enable AI monitoring
METRICS_COLLECTION_INTERVAL=60    # Seconds between metric collections
HEALTH_CHECK_INTERVAL=300         # Seconds between health checks

# Alerting Configuration
ENABLE_EMAIL_ALERTS=true          # Enable email alerts
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
WEBHOOK_ALERT_URL=https://your-monitoring-system.com/webhook

# AI Service Thresholds
AI_ERROR_RATE_THRESHOLD=10        # Percentage (10%)
AI_RESPONSE_TIME_THRESHOLD=5000   # Milliseconds (5 seconds)
AI_RATE_LIMIT_WARNING=80          # Percentage of rate limit (80%)
AI_TOKEN_USAGE_WARNING=90         # Percentage of monthly limit (90%)

# Circuit Breaker Configuration
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5     # Failures before opening
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=60000  # Milliseconds (1 minute)
CIRCUIT_BREAKER_MONITORING_PERIOD=300000 # Milliseconds (5 minutes)
\`\`\`

### Database Configuration

The monitoring system uses the following database tables:

- `ai_api_usage`: Tracks all AI API calls with performance metrics
- `recommendations`: Stores recommendation generation logs
- `recommendation_feedback`: Tracks user feedback for learning

Ensure these tables are created by running migrations:

\`\`\`bash
npm run migration:run
\`\`\`

## Alert Rules Configuration

### Default Alert Rules

The system comes with pre-configured alert rules:

1. **High Error Rate**: Triggers when AI API error rate exceeds 10%
2. **Slow Response Time**: Triggers when average response time exceeds 5 seconds
3. **Rate Limit Exceeded**: Triggers when rate limit hits exceed threshold
4. **Circuit Breaker Open**: Triggers immediately when circuit breaker opens
5. **High Token Usage**: Triggers when monthly token usage exceeds 90%

### Custom Alert Rules

You can add custom alert rules programmatically:

\`\`\`typescript
import { AIAlertingService } from './services/ai-alerting.service';

const customRule: AlertRule = {
  id: 'custom_rule',
  name: 'Custom Alert Rule',
  description: 'Custom alert for specific conditions',
  condition: {
    type: 'error_rate',
    threshold: 15,
    operator: 'gt',
    timeWindow: 30,
    minimumSamples: 10,
  },
  severity: 'medium',
  enabled: true,
  cooldownMinutes: 60,
  actions: [
    { type: 'log', config: { level: 'warn' } },
    { type: 'email', config: { recipients: ['team@example.com'] } },
  ],
};

alertingService.addAlertRule(customRule);
\`\`\`

## Logging Configuration

### Log Levels

Configure logging levels based on your environment:

- **Production**: `info` or `warn`
- **Staging**: `debug`
- **Development**: `debug` or `verbose`

### Log Formats

The system provides structured logging with the following fields:

\`\`\`json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "context": "AILoggingService",
  "message": "AI API call successful: /embeddings",
  "requestId": "ai_1705312200000_abc123",
  "userId": "user-uuid",
  "endpoint": "/embeddings",
  "model": "sentence-transformers/all-MiniLM-L6-v2",
  "tokensUsed": 150,
  "responseTimeMs": 1250,
  "success": true
}
\`\`\`

### Log Aggregation

For production environments, consider using log aggregation tools:

#### ELK Stack (Elasticsearch, Logstash, Kibana)

\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - '9200:9200'

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - '5044:5044'

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - '5601:5601'
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
\`\`\`

#### Grafana + Loki

\`\`\`yaml
# docker-compose.yml
version: '3.8'
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - '3100:3100'
    command: -config.file=/etc/loki/local-config.yaml

  grafana:
    image: grafana/grafana:10.2.0
    ports:
      - '3000:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
\`\`\`

## Performance Monitoring

### Metrics Collection

The system automatically collects the following metrics:

- **Request Metrics**: Total requests, success rate, error rate
- **Performance Metrics**: Response times, throughput, latency percentiles
- **Resource Metrics**: Token usage, rate limit hits, circuit breaker trips
- **Business Metrics**: Recommendation quality, user satisfaction, cache hit rates

### Prometheus Integration

To integrate with Prometheus, add the following endpoint:

\`\`\`typescript
// Add to health controller
@Get('metrics/prometheus')
@Public()
async prometheusMetrics() {
  const metrics = this.aiMonitoringService.getMetrics();

  return `
# HELP ai_requests_total Total number of AI API requests
# TYPE ai_requests_total counter
ai_requests_total{status="success"} ${metrics.successfulRequests}
ai_requests_total{status="error"} ${metrics.failedRequests}

# HELP ai_response_time_seconds AI API response time in seconds
# TYPE ai_response_time_seconds histogram
ai_response_time_seconds_sum ${metrics.averageResponseTime / 1000}
ai_response_time_seconds_count ${metrics.totalRequests}

# HELP ai_tokens_used_total Total tokens used
# TYPE ai_tokens_used_total counter
ai_tokens_used_total ${metrics.totalTokensUsed}

# HELP ai_rate_limit_hits_total Total rate limit hits
# TYPE ai_rate_limit_hits_total counter
ai_rate_limit_hits_total ${metrics.rateLimitHits}
  `.trim();
}
\`\`\`

### Grafana Dashboards

Create Grafana dashboards to visualize AI service metrics:

\`\`\`json
{
  "dashboard": {
    "title": "AI Recommendations Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(ai_requests_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "ai_response_time_seconds",
            "legendFormat": "Response Time"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(ai_requests_total{status=\"error\"}[5m]) / rate(ai_requests_total[5m]) * 100"
          }
        ]
      }
    ]
  }
}
\`\`\`

## Alerting Setup

### Email Alerts

Configure email alerts using the existing email service:

\`\`\`typescript
// In ai-alerting.service.ts
private async executeEmailAction(action: AlertAction, notification: AlertNotification): Promise<void> {
  const emailService = this.moduleRef.get(EmailService);

  await emailService.sendAlert({
    to: action.config.recipients,
    subject: `AI Service Alert: ${notification.rule.name}`,
    template: 'ai-alert',
    context: {
      alertName: notification.rule.name,
      severity: notification.rule.severity,
      message: notification.message,
      currentValue: notification.currentValue,
      threshold: notification.threshold,
      timestamp: notification.timestamp,
      diagnosticsUrl: `${process.env.APP_URL}/ai-health/diagnostics`,
    },
  });
}
\`\`\`

### Slack Integration

Set up Slack webhooks for real-time alerts:

\`\`\`bash
# Environment variable
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_WEBHOOK_TOKEN
\`\`\`

### PagerDuty Integration

For critical alerts, integrate with PagerDuty:

\`\`\`typescript
private async executePagerDutyAction(action: AlertAction, notification: AlertNotification): Promise<void> {
  const pagerDutyClient = new PagerDutyClient(action.config.integrationKey);

  await pagerDutyClient.trigger({
    summary: notification.message,
    severity: notification.rule.severity,
    source: 'ai-recommendations-service',
    component: 'ai-api',
    group: 'ai-services',
    class: notification.rule.condition.type,
    customDetails: {
      currentValue: notification.currentValue,
      threshold: notification.threshold,
      metadata: notification.metadata,
    },
  });
}
\`\`\`

## Troubleshooting

### Common Issues

1. **High Error Rate**
   - Check Hugging Face API key validity
   - Verify network connectivity
   - Review rate limiting configuration
   - Check circuit breaker status

2. **Slow Response Times**
   - Monitor Hugging Face API status
   - Check network latency
   - Review batch processing configuration
   - Consider caching optimization

3. **Rate Limit Issues**
   - Review API usage patterns
   - Implement request queuing
   - Consider upgrading API plan
   - Optimize batch processing

4. **Circuit Breaker Trips**
   - Check underlying service health
   - Review failure thresholds
   - Monitor error patterns
   - Verify recovery timeout settings

### Diagnostic Commands

\`\`\`bash
# Check AI service health
curl -X GET http://localhost:3000/ai-health/status

# Get detailed diagnostics
curl -X GET http://localhost:3000/ai-health/diagnostics \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Force health check
curl -X POST http://localhost:3000/ai-health/health-check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Reset circuit breaker
curl -X POST http://localhost:3000/ai-health/circuit-breaker/hugging-face-api/reset \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
\`\`\`

### Log Analysis

Use these queries to analyze logs:

\`\`\`bash
# Find all AI API errors in the last hour
grep "AI API call failed" /var/log/app.log | grep "$(date -d '1 hour ago' '+%Y-%m-%d %H')"

# Count errors by type
grep "AI API call failed" /var/log/app.log | grep -o '"errorMessage":"[^"]*"' | sort | uniq -c

# Monitor response times
grep "AI API call successful" /var/log/app.log | grep -o '"responseTimeMs":[0-9]*' | cut -d: -f2 | sort -n
\`\`\`

## Maintenance

### Regular Tasks

1. **Daily**
   - Review alert notifications
   - Check error rates and response times
   - Monitor token usage

2. **Weekly**
   - Analyze performance trends
   - Review and update alert thresholds
   - Clean up old logs and metrics

3. **Monthly**
   - Review monitoring configuration
   - Update alert rules based on patterns
   - Optimize performance based on metrics

### Backup and Recovery

Ensure monitoring data is backed up:

\`\`\`bash
# Backup monitoring configuration
pg_dump -t ai_api_usage -t recommendations -t recommendation_feedback > monitoring_backup.sql

# Export metrics for analysis
curl -X GET http://localhost:3000/ai-health/diagnostics > diagnostics_$(date +%Y%m%d).json
\`\`\`

## Security Considerations

1. **Access Control**: Ensure monitoring endpoints are properly secured
2. **Data Privacy**: Avoid logging sensitive user data
3. **API Keys**: Secure storage of monitoring service API keys
4. **Network Security**: Use HTTPS for all monitoring communications
5. **Audit Logging**: Log all administrative actions on monitoring system

## Performance Impact

The monitoring system is designed to have minimal performance impact:

- **Memory Usage**: ~10MB for in-memory metrics
- **CPU Overhead**: <1% for metric collection
- **Network Overhead**: Minimal for health checks
- **Storage**: ~1GB per month for detailed logs

Monitor the monitoring system itself to ensure it doesn't impact application performance.
