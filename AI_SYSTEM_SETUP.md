# AI System Setup Guide

## Overview

The AI system has been completely overhauled to:
- Use OpenRouter with the best available models (Claude Opus 4.5)
- Store all configuration in the database instead of hardcoded values
- Persist budget tracking and model performance stats
- Support dynamic model pricing updates without code changes

## Changes Made

### 1. Database Schema Updates

**New Tables:**
- `ai_model_pricing` - Stores model pricing and capabilities
- `ai_model_performance` - Tracks model performance metrics
- `ai_api_usage` - Enhanced with `cost` column for budget tracking

**Migrations:**
- `1704300000000-AddCostToAIApiUsage.ts` - Adds cost tracking
- `1704310000000-CreateAIModelPricingTable.ts` - Model pricing
- `1704320000000-CreateAIModelPerformanceTable.ts` - Performance tracking

### 2. New Services

- **AIModelConfigService** - Manages model configuration from database
  - Caches model pricing for performance
  - Tracks budget usage per user/month from database
  - Records model performance metrics

### 3. Updated Configuration

**Environment Variables (.env):**
```bash
# OpenRouter Configuration
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_DEFAULT_MODEL=anthropic/claude-opus-4.5  # Best model
OPENROUTER_FALLBACK_MODEL=anthropic/claude-3.5-sonnet  # Cost-effective fallback
OPENROUTER_MONTHLY_BUDGET=100
OPENROUTER_MAX_COST_PER_REQUEST=0.50
OPENROUTER_MAX_TOKENS=4096
OPENROUTER_TIMEOUT=30000
OPENROUTER_RETRY_ATTEMPTS=3
OPENROUTER_RETRY_DELAY_MS=1000
OPENROUTER_BUDGET_WARNING_THRESHOLD=0.8
OPENROUTER_QUALITY_THRESHOLD=0.7

# Application Configuration (replaces hardcoded values)
APP_DOMAIN=https://projecthub.ai
APP_NAME=ProjectHub AI Assistant

# Hugging Face Configuration
HUGGING_FACE_API_KEY=your-hugging-face-api-key
HUGGING_FACE_MODEL=sentence-transformers/all-MiniLM-L6-v2
HUGGING_FACE_QA_MODEL=distilbert-base-cased-distilled-squad

# Qdrant Vector Database
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
VECTOR_DIMENSIONS=384
```

## Setup Instructions

### 1. Run Migrations

The migrations will run automatically when you start the application, or you can run them manually:

```bash
npm run migration:run
```

### 2. Seed AI Models

Populate the database with default AI models (15 models from Anthropic, OpenAI, Meta, Google, Mistral, and Perplexity):

```bash
npm run seed:ai-models
```

This will seed:
- **Anthropic**: Claude Opus 4.5 (best), Claude 3.5 Sonnet (recommended), Claude 3 Haiku (fast)
- **OpenAI**: GPT-4 Turbo, GPT-4o, GPT-4o Mini, GPT-3.5 Turbo
- **Meta**: Llama 3.3 70B, Llama 3.1 8B
- **Google**: Gemini 2.0 Flash (experimental, free), Gemini Pro 1.5, Gemini Flash 1.5
- **Mistral**: Mistral Large, Mistral Medium
- **Perplexity**: Sonar Large with online search

### 3. Update Environment Variables

Copy `.env.example` to `.env` and update with your API keys:

```bash
cp .env.example .env
```

### 4. Start the Application

```bash
npm run start:dev
```

## Key Features

### 1. Database-Driven Model Selection

Models are now selected from the database based on:
- **Cost** - Stays within budget constraints
- **Quality** - Prioritizes high-quality models
- **Speed** - Considers average latency
- **Performance** - Uses historical success rates
- **Capabilities** - Matches required features (chat, code, multimodal, etc.)

### 2. Budget Tracking

- **Persistent**: Budget usage is stored in `ai_api_usage` table
- **Monthly Limits**: Automatically tracks per user and globally
- **Warnings**: Alerts when budget threshold is reached (default 80%)
- **Auto-Fallback**: Switches to cheaper models when budget is low

### 3. Dynamic Pricing

Update model pricing without code changes:

```sql
UPDATE ai_model_pricing
SET cost_per_token = 0.000015, is_available = true
WHERE model_id = 'anthropic/claude-opus-4.5';
```

### 4. Performance Tracking

All API calls are tracked:
- Response times
- Success/failure rates
- Token usage
- Actual costs

Query performance:
```sql
SELECT
  model_id,
  total_requests,
  successful_requests,
  ROUND(successful_requests::numeric / NULLIF(total_requests, 0) * 100, 2) as success_rate,
  ROUND(average_latency, 0) as avg_latency_ms,
  ROUND(total_cost, 4) as total_cost_usd
FROM ai_model_performance
ORDER BY total_requests DESC;
```

## API Usage

### Get Available Models

```typescript
GET /ai-assistant/models
```

### Get Budget Status

```typescript
GET /ai-assistant/budget/:userId
```

### Chat Completion

```typescript
POST /ai-assistant/ask
{
  "query": "How do I implement authentication in NestJS?",
  "projectId": "uuid",
  "requirements": {
    "prioritizeQuality": true,  // Use best model
    "prioritizeSpeed": false,   // Don't prioritize speed
    "maxCost": 0.10            // Max $0.10 per request
  }
}
```

## Model Recommendations

### For Most Use Cases (Recommended)
- **Default**: `anthropic/claude-3.5-sonnet`
- Balance of quality, speed, and cost
- $3 per 1M input tokens, $15 per 1M output tokens

### For Complex Tasks (Best Quality)
- **Model**: `anthropic/claude-opus-4.5`
- Highest quality reasoning and analysis
- $15 per 1M input tokens, $75 per 1M output tokens

### For Simple/Fast Tasks (Budget-Friendly)
- **Model**: `anthropic/claude-3-haiku`
- Fast responses, lower cost
- $0.25 per 1M tokens

### For Free Tier (Experimental)
- **Model**: `google/gemini-2.0-flash-exp`
- Free while in experimental phase
- Large context window (1M tokens)

## Troubleshooting

### Budget Exceeded
If you see "Budget exceeded" errors:
1. Check current spend: Query `ai_api_usage` table
2. Increase monthly budget in `.env`: `OPENROUTER_MONTHLY_BUDGET=200`
3. Wait for next month (budget resets automatically)

### Model Unavailable
If a specific model is unavailable:
1. The system automatically falls back to `OPENROUTER_FALLBACK_MODEL`
2. Check model availability in database:
   ```sql
   SELECT model_id, name, is_available
   FROM ai_model_pricing
   WHERE is_active = true;
   ```
3. Manually disable/enable models:
   ```sql
   UPDATE ai_model_pricing
   SET is_available = false
   WHERE model_id = 'model-id';
   ```

### API Key Issues
Ensure your OpenRouter API key is set:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Get your API key at: https://openrouter.ai/keys

## Migration from Old System

If you have existing AI usage data:

1. **Backup**: Backup your database before running migrations
2. **Migrations**: Run all new migrations
3. **Seed**: Populate model pricing data
4. **Verify**: Check that models are loaded: `SELECT COUNT(*) FROM ai_model_pricing;`

## Monitoring

### Check Monthly Costs

```sql
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_requests,
  SUM(tokens_used) as total_tokens,
  ROUND(SUM(cost), 2) as total_cost_usd
FROM ai_api_usage
WHERE success = true
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### Check Model Usage

```sql
SELECT
  model,
  COUNT(*) as requests,
  ROUND(AVG(response_time_ms), 0) as avg_response_ms,
  ROUND(SUM(cost), 4) as total_cost
FROM ai_api_usage
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY model
ORDER BY requests DESC;
```

### Check Failed Requests

```sql
SELECT
  model,
  error_message,
  COUNT(*) as failures
FROM ai_api_usage
WHERE success = false
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY model, error_message
ORDER BY failures DESC;
```

## Support

For issues or questions:
1. Check this guide
2. Review error logs
3. Check database for configuration issues
4. Verify environment variables are set correctly

## Future Enhancements

Planned features:
- [ ] Web UI for model management
- [ ] Real-time budget alerts
- [ ] A/B testing between models
- [ ] Cost optimization suggestions
- [ ] Custom model training integration
- [ ] Multi-provider fallback chains
