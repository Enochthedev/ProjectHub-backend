# AI Recommendations Alert Configuration Guide

## Overview

This document provides detailed configuration instructions for setting up alerts in the AI-Powered Recommendations system. The alerting system monitors various metrics and conditions to ensure system reliability and performance.

## Alert Types

### 1. Error Rate Alerts

Monitor the percentage of failed AI API requests.

\`\`\`typescript
{
  id: 'high_error_rate',
  name: 'High Error Rate',
  description: 'Alert when AI API error rate exceeds threshold',
  condition: {
    type: 'error_rate',
    threshold: 10, // 10%
    operator: 'gt',
    timeWindow: 15, // 15 minutes
    minimumSamples: 5,
  },
  severity: 'high',
  enabled: true,
  cooldownMinutes: 30,
  actions: [
    { type: 'log', config: { level: 'error' } },
    { type: 'email', config: { recipients: ['admin@example.com'] } },
    { type: 'slack', config: { webhookUrl: process.env.SLACK_WEBHOOK_URL } },
  ],
}
\`\`\`

**Triggers when**: Error rate > 10% over 15 minutes with at least 5 samples
**Recommended action**: Check API connectivity, validate API keys, review error logs

### 2. Response Time Alerts

Monitor AI API response times for performance degradation.

\`\`\`typescript
{
  id: 'slow_response_time',
  name: 'Slow Response Time',
  description: 'Alert when AI API response time is consistently slow',
  condition: {
    type: 'response_time',
    threshold: 5000, // 5 seconds
    operator: 'gt',
    timeWindow: 10, // 10 minutes
    minimumSamples: 3,
  },
  severity: 'medium',
  enabled: true,
  cooldownMinutes: 15,
  actions: [
    { type: 'log', config: { level: 'warn' } },
    { type: 'email', config: { recipients: ['ops@example.com'] } },
  ],
}
\`\`\`

**Triggers when**: Average response time > 5 seconds over 10 minutes
**Recommended action**: Check network latency, review API status, consider caching

### 3. Rate Limit Alerts

Monitor rate limit hits to prevent service disruption.

\`\`\`typescript
{
  id: 'rate_limit_exceeded',
  name: 'Rate Limit Exceeded',
  description: 'Alert when rate limit is frequently exceeded',
  condition: {
    type: 'rate_limit',
    threshold: 5, // 5 rate limit hits
    operator: 'gte',
    timeWindow: 60, // 1 hour
  },
  severity: 'high',
  enabled: true,
  cooldownMinutes: 60,
  actions: [
    { type: 'log', config: { level: 'error' } },
    { type: 'email', config: { recipients: ['admin@example.com'] } },
    { type: 'webhook', config: { url: process.env.WEBHOOK_ALERT_URL } },
  ],
}
\`\`\`

**Triggers when**: 5 or more rate limit hits in 1 hour
**Recommended action**: Implement request queuing, upgrade API plan, optimize usage

### 4. Circuit Breaker Alerts

Monitor circuit breaker state changes for service reliability.

\`\`\`typescript
{
  id: 'circuit_breaker_open',
  name: 'Circuit Breaker Open',
  description: 'Alert when circuit breaker opens',
  condition: {
    type: 'circuit_breaker',
    threshold: 1,
    operator: 'gte',
    timeWindow: 1,
  },
  severity: 'critical',
  enabled: true,
  cooldownMinutes: 5,
  actions: [
    { type: 'log', config: { level: 'error' } },
    { type: 'email', config: { recipients: ['admin@example.com', 'oncall@example.com'] } },
    { type: 'slack', config: { webhookUrl: process.env.SLACK_WEBHOOK_URL } },
    { type: 'pagerduty', config: { integrationKey: process.env.PAGERDUTY_KEY } },
  ],
}
\`\`\`

**Triggers when**: Circuit breaker opens (immediate)
**Recommended action**: Check service health, review error patterns, manual intervention may be required

### 5. Token Usage Alerts

Monitor monthly token consumption to prevent service interruption.

\`\`\`typescript
{
  id: 'high_token_usage',
  name: 'High Token Usage',
  description: 'Alert when monthly token usage approaches limit',
  condition: {
    type: 'token_usage',
    threshold: 90, // 90% of monthly limit
    operator: 'gt',
    timeWindow: 60, // 1 hour
  },
  severity: 'medium',
  enabled: true,
  cooldownMinutes: 240, // 4 hours
  actions: [
    { type: 'log', config: { level: 'warn' } },
    { type: 'email', config: { recipients: ['admin@example.com', 'billing@example.com'] } },
  ],
}
\`\`\`

**Triggers when**: Token usage > 90% of monthly limit
**Recommended action**: Review usage patterns, consider plan upgrade, optimize token consumption

## Alert Severity Levels

### Critical

- **Impact**: Service completely unavailable or severely degraded
- **Response Time**: Immediate (< 5 minutes)
- **Actions**: Page on-call engineer, send to all channels
- **Examples**: Circuit breaker open, complete API failure

### High

- **Impact**: Service degraded, user experience affected
- **Response Time**: Within 15 minutes
- **Actions**: Email + Slack notification
- **Examples**: High error rate, frequent rate limiting

### Medium

- **Impact**: Performance issues, potential future problems
- **Response Time**: Within 1 hour
- **Actions**: Email notification, log for review
- **Examples**: Slow response times, high token usage

### Low

- **Impact**: Minor issues, informational
- **Response Time**: Next business day
- **Actions**: Log only, include in daily reports
- **Examples**: Occasional errors, minor performance variations

## Alert Actions

### 1. Log Action

Writes alert information to application logs.

\`\`\`typescript
{
  type: 'log',
  config: {
    level: 'error', // debug, info, warn, error
    includeMetadata: true,
    includeStackTrace: false,
  }
}
\`\`\`

### 2. Email Action

Sends email notifications to specified recipients.

\`\`\`typescript
{
  type: 'email',
  config: {
    recipients: ['admin@example.com', 'ops@example.com'],
    subject: 'AI Service Alert: {{alertName}}',
    template: 'ai-alert', // Email template name
    includeMetrics: true,
    includeDiagnostics: true,
  }
}
\`\`\`

**Email Template Variables**:

- `{{alertName}}`: Alert rule name
- `{{severity}}`: Alert severity level
- `{{message}}`: Alert message
- `{{currentValue}}`: Current metric value
- `{{threshold}}`: Alert threshold
- `{{timestamp}}`: Alert timestamp
- `{{diagnosticsUrl}}`: Link to diagnostics page

### 3. Slack Action

Sends notifications to Slack channels via webhooks.

\`\`\`typescript
{
  type: 'slack',
  config: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    channel: '#alerts', // Optional, overrides webhook default
    username: 'AI Monitor', // Optional
    iconEmoji: ':warning:', // Optional
    includeMetrics: true,
    mentionUsers: ['@oncall'], // For critical alerts
  }
}
\`\`\`

### 4. Webhook Action

Sends HTTP POST requests to external monitoring systems.

\`\`\`typescript
{
  type: 'webhook',
  config: {
    url: 'https://monitoring-system.com/webhook',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer {{token}}',
      'Content-Type': 'application/json',
    },
    timeout: 5000, // milliseconds
    retries: 3,
  }
}
\`\`\`

**Webhook Payload**:

\`\`\`json
{
  "alert": {
    "id": "alert-id",
    "rule": "High Error Rate",
    "severity": "high",
    "message": "Error rate is 15%, exceeds threshold of 10%",
    "currentValue": 15,
    "threshold": 10,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "service": "ai-recommendations",
  "environment": "production",
  "metadata": {
    "metrics": {...},
    "health": {...}
  }
}
\`\`\`

### 5. PagerDuty Action

Integrates with PagerDuty for incident management.

\`\`\`typescript
{
  type: 'pagerduty',
  config: {
    integrationKey: 'your-integration-key',
    severity: 'error', // info, warning, error, critical
    component: 'ai-api',
    group: 'ai-services',
    class: 'performance',
  }
}
\`\`\`

## Environment-Specific Configuration

### Development Environment

\`\`\`typescript
const developmentAlerts = {
  errorRateThreshold: 20, // Higher threshold for dev
  responseTimeThreshold: 10000, // 10 seconds
  rateLimitThreshold: 10,
  tokenUsageThreshold: 95,
  cooldownMinutes: 5, // Shorter cooldown
  actions: [
    { type: 'log', config: { level: 'warn' } }, // Log only
  ],
};
\`\`\`

### Staging Environment

\`\`\`typescript
const stagingAlerts = {
  errorRateThreshold: 15,
  responseTimeThreshold: 7500,
  rateLimitThreshold: 8,
  tokenUsageThreshold: 92,
  cooldownMinutes: 15,
  actions: [
    { type: 'log', config: { level: 'error' } },
    { type: 'slack', config: { channel: '#staging-alerts' } },
  ],
};
\`\`\`

### Production Environment

\`\`\`typescript
const productionAlerts = {
  errorRateThreshold: 10,
  responseTimeThreshold: 5000,
  rateLimitThreshold: 5,
  tokenUsageThreshold: 90,
  cooldownMinutes: 30,
  actions: [
    { type: 'log', config: { level: 'error' } },
    { type: 'email', config: { recipients: ['admin@example.com'] } },
    { type: 'slack', config: { channel: '#production-alerts' } },
    { type: 'pagerduty', config: { integrationKey: 'prod-key' } },
  ],
};
\`\`\`

## Dynamic Alert Configuration

### Runtime Configuration

Alerts can be configured at runtime through the API:

\`\`\`typescript
// Add new alert rule
POST /ai-health/alerts/rules
{
  "id": "custom_alert",
  "name": "Custom Alert",
  "description": "Custom alert rule",
  "condition": {
    "type": "error_rate",
    "threshold": 15,
    "operator": "gt",
    "timeWindow": 20,
    "minimumSamples": 3
  },
  "severity": "medium",
  "enabled": true,
  "cooldownMinutes": 30,
  "actions": [
    { "type": "log", "config": { "level": "warn" } }
  ]
}

// Update existing rule
PUT /ai-health/alerts/rules/{ruleId}
{
  "threshold": 12,
  "enabled": false
}

// Delete rule
DELETE /ai-health/alerts/rules/{ruleId}
\`\`\`

### Configuration from Environment

\`\`\`bash
# Alert thresholds
AI_ERROR_RATE_THRESHOLD=10
AI_RESPONSE_TIME_THRESHOLD=5000
AI_RATE_LIMIT_THRESHOLD=5
AI_TOKEN_USAGE_THRESHOLD=90

# Cooldown periods (minutes)
ERROR_RATE_COOLDOWN=30
RESPONSE_TIME_COOLDOWN=15
RATE_LIMIT_COOLDOWN=60
CIRCUIT_BREAKER_COOLDOWN=5
TOKEN_USAGE_COOLDOWN=240

# Action configuration
ENABLE_EMAIL_ALERTS=true
ENABLE_SLACK_ALERTS=true
ENABLE_WEBHOOK_ALERTS=false
ENABLE_PAGERDUTY_ALERTS=true

# Contact information
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PAGERDUTY_INTEGRATION_KEY=your-integration-key
WEBHOOK_ALERT_URL=https://monitoring.example.com/webhook
\`\`\`

## Alert Testing

### Manual Testing

\`\`\`bash
# Test alert rule evaluation
POST /ai-health/alerts/rules/{ruleId}/test

# Force trigger alert
POST /ai-health/alerts/rules/{ruleId}/trigger

# Test specific action
POST /ai-health/alerts/actions/test
{
  "type": "email",
  "config": {
    "recipients": ["test@example.com"]
  },
  "testMessage": "This is a test alert"
}
\`\`\`

### Automated Testing

\`\`\`typescript
describe('Alert System', () => {
  it('should trigger error rate alert', async () => {
    // Simulate high error rate
    for (let i = 0; i < 10; i++) {
      aiMonitoringService.recordAPIRequest(
        '/embeddings',
        'model',
        100,
        1000,
        false,
        'Test error',
      );
    }

    // Wait for alert evaluation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const alerts = aiAlertingService.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].rule.id).toBe('high_error_rate');
  });
});
\`\`\`

## Alert Maintenance

### Regular Review Tasks

1. **Weekly Review**
   - Analyze alert frequency and patterns
   - Adjust thresholds based on normal operating ranges
   - Review false positive rates

2. **Monthly Review**
   - Update contact information
   - Review alert effectiveness
   - Optimize alert rules based on incidents

3. **Quarterly Review**
   - Comprehensive alert system audit
   - Update documentation
   - Review integration configurations

### Alert Tuning

#### Reducing False Positives

\`\`\`typescript
// Increase minimum samples
condition: {
  type: 'error_rate',
  threshold: 10,
  operator: 'gt',
  timeWindow: 15,
  minimumSamples: 10, // Increased from 5
}

// Add hysteresis (different thresholds for trigger/resolve)
condition: {
  type: 'response_time',
  threshold: 5000,
  resolveThreshold: 4000, // Resolves at lower threshold
  operator: 'gt',
  timeWindow: 10,
}
\`\`\`

#### Handling Alert Storms

\`\`\`typescript
// Implement alert grouping
{
  id: 'grouped_errors',
  name: 'Multiple Error Conditions',
  description: 'Groups related error alerts',
  grouping: {
    enabled: true,
    timeWindow: 300, // 5 minutes
    maxAlerts: 5,
    groupBy: ['severity', 'component'],
  },
}
\`\`\`

### Alert Metrics

Track alert system performance:

- **Alert Frequency**: Number of alerts per day/week
- **False Positive Rate**: Percentage of alerts that were not actionable
- **Response Time**: Time from alert to acknowledgment
- **Resolution Time**: Time from alert to issue resolution
- **Alert Effectiveness**: Percentage of real issues caught by alerts

## Troubleshooting

### Common Issues

1. **Alerts Not Triggering**
   - Check alert rule configuration
   - Verify monitoring service is running
   - Review metric collection
   - Check alert rule enabled status

2. **Too Many False Positives**
   - Increase thresholds
   - Add minimum sample requirements
   - Implement hysteresis
   - Review time windows

3. **Email/Slack Not Working**
   - Verify configuration settings
   - Check network connectivity
   - Review authentication credentials
   - Test with simple alert

4. **Alert Delays**
   - Check monitoring service performance
   - Review alert evaluation frequency
   - Optimize alert rule complexity
   - Monitor system resources

### Debug Commands

\`\`\`bash
# Check alert service status
curl -X GET http://localhost:3000/ai-health/alerts/status

# Get alert rule details
curl -X GET http://localhost:3000/ai-health/alerts/rules/{ruleId}

# Test alert rule
curl -X POST http://localhost:3000/ai-health/alerts/rules/{ruleId}/test

# View alert history
curl -X GET http://localhost:3000/ai-health/alerts/history?limit=50
\`\`\`

## Best Practices

1. **Start Conservative**: Begin with higher thresholds and adjust down
2. **Use Appropriate Severity**: Don't over-escalate minor issues
3. **Implement Cooldowns**: Prevent alert spam during incidents
4. **Test Regularly**: Verify alert delivery and response procedures
5. **Document Actions**: Include clear remediation steps in alerts
6. **Monitor the Monitor**: Alert on monitoring system failures
7. **Regular Reviews**: Continuously improve alert effectiveness
8. **Environment Specific**: Use different thresholds per environment
9. **Actionable Alerts**: Every alert should have a clear action
10. **Alert Fatigue**: Balance coverage with noise reduction
