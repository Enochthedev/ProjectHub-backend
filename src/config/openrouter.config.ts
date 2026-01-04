import { registerAs } from '@nestjs/config';

export default registerAs('openRouter', () => ({
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-opus-4.5',
    fallbackModel: process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-3.5-sonnet',
    monthlyBudget: parseFloat(process.env.OPENROUTER_MONTHLY_BUDGET || '100'),
    maxCostPerRequest: parseFloat(process.env.OPENROUTER_MAX_COST_PER_REQUEST || '0.50'),
    maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS || '4096', 10),
    timeout: parseInt(process.env.OPENROUTER_TIMEOUT || '30000', 10),
    retryAttempts: parseInt(process.env.OPENROUTER_RETRY_ATTEMPTS || '3', 10),
    retryDelayMs: parseInt(process.env.OPENROUTER_RETRY_DELAY_MS || '1000', 10),
    budgetWarningThreshold: parseFloat(process.env.OPENROUTER_BUDGET_WARNING_THRESHOLD || '0.8'),
    qualityThreshold: parseFloat(process.env.OPENROUTER_QUALITY_THRESHOLD || '0.7'),
    appDomain: process.env.APP_DOMAIN || 'https://projecthub.ai',
    appName: process.env.APP_NAME || 'ProjectHub AI Assistant',
}));