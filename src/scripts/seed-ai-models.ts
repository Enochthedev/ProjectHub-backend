import { DataSource } from 'typeorm';
import { AIModelPricing } from '../entities/ai-model-pricing.entity';

/**
 * Seed script to populate AI model pricing data
 * Run with: npm run seed:ai-models
 */

const models: Partial<AIModelPricing>[] = [
  {
    modelId: 'anthropic/claude-opus-4.5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    costPerToken: 0.000015, // $15 per 1M tokens (input), $75 per 1M (output) - using average
    maxTokens: 200000,
    averageLatency: 3000,
    qualityScore: 0.98,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'analysis', 'writing', 'code', 'multimodal'],
    description: 'Most capable model - best for complex reasoning and analysis',
    isActive: true,
  },
  {
    modelId: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    costPerToken: 0.000003, // $3 per 1M tokens (input), $15 per 1M (output) - using average
    maxTokens: 200000,
    averageLatency: 2000,
    qualityScore: 0.95,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'analysis', 'writing', 'code'],
    description: 'Balanced performance and cost - recommended for most use cases',
    isActive: true,
  },
  {
    modelId: 'anthropic/claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    costPerToken: 0.00025, // $0.25 per 1M tokens
    maxTokens: 200000,
    averageLatency: 1500,
    qualityScore: 0.88,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'analysis', 'writing'],
    description: 'Fast and cost-effective for simple tasks',
    isActive: true,
  },
  {
    modelId: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    costPerToken: 0.00001, // $10 per 1M tokens (input), $30 per 1M (output) - using average
    maxTokens: 128000,
    averageLatency: 2500,
    qualityScore: 0.94,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code', 'analysis', 'multimodal'],
    description: 'Advanced GPT-4 with vision capabilities',
    isActive: true,
  },
  {
    modelId: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    costPerToken: 0.000005, // $5 per 1M tokens (input), $15 per 1M (output) - using average
    maxTokens: 128000,
    averageLatency: 2000,
    qualityScore: 0.93,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code', 'analysis', 'multimodal'],
    description: 'Optimized GPT-4 with multimodal capabilities',
    isActive: true,
  },
  {
    modelId: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    costPerToken: 0.00015, // $0.15 per 1M tokens
    maxTokens: 128000,
    averageLatency: 1800,
    qualityScore: 0.90,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code', 'analysis'],
    description: 'Smaller, faster GPT-4o variant',
    isActive: true,
  },
  {
    modelId: 'openai/gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    costPerToken: 0.000002, // $0.002 per 1K tokens
    maxTokens: 16385,
    averageLatency: 1500,
    qualityScore: 0.85,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code'],
    description: 'Fast and economical for simple tasks',
    isActive: true,
  },
  {
    modelId: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct',
    provider: 'Meta',
    costPerToken: 0.0000008, // $0.80 per 1M tokens
    maxTokens: 131072,
    averageLatency: 2200,
    qualityScore: 0.91,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code', 'analysis'],
    description: 'Latest Llama model with strong performance',
    isActive: true,
  },
  {
    modelId: 'meta-llama/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B Instruct',
    provider: 'Meta',
    costPerToken: 0.00005, // $0.05 per 1M tokens
    maxTokens: 131072,
    averageLatency: 1200,
    qualityScore: 0.78,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code'],
    description: 'Budget-friendly open source model',
    isActive: true,
  },
  {
    modelId: 'google/gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash Experimental',
    provider: 'Google',
    costPerToken: 0, // Free while in experimental
    maxTokens: 1048576,
    averageLatency: 1500,
    qualityScore: 0.89,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'multimodal', 'code'],
    description: 'Latest experimental Gemini with massive context window',
    isActive: true,
  },
  {
    modelId: 'google/gemini-flash-1.5',
    name: 'Gemini Flash 1.5',
    provider: 'Google',
    costPerToken: 0.000075, // $0.075 per 1M tokens
    maxTokens: 1048576,
    averageLatency: 1000,
    qualityScore: 0.82,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'multimodal'],
    description: 'Fast with large context window',
    isActive: true,
  },
  {
    modelId: 'google/gemini-pro-1.5',
    name: 'Gemini Pro 1.5',
    provider: 'Google',
    costPerToken: 0.00125, // $1.25 per 1M tokens (input), $5 per 1M (output) - using average
    maxTokens: 2097152,
    averageLatency: 2500,
    qualityScore: 0.92,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'multimodal', 'analysis', 'code'],
    description: 'Most capable Gemini with 2M context window',
    isActive: true,
  },
  {
    modelId: 'mistralai/mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    costPerToken: 0.000004, // $4 per 1M tokens
    maxTokens: 128000,
    averageLatency: 2000,
    qualityScore: 0.90,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code', 'analysis'],
    description: 'Flagship Mistral model for complex tasks',
    isActive: true,
  },
  {
    modelId: 'mistralai/mistral-medium',
    name: 'Mistral Medium',
    provider: 'Mistral AI',
    costPerToken: 0.0000027, // $2.7 per 1M tokens
    maxTokens: 32000,
    averageLatency: 1500,
    qualityScore: 0.85,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'code'],
    description: 'Balanced Mistral model',
    isActive: true,
  },
  {
    modelId: 'perplexity/llama-3.1-sonar-large-128k-online',
    name: 'Perplexity Sonar Large (Online)',
    provider: 'Perplexity',
    costPerToken: 0.000001, // $1 per 1M tokens
    maxTokens: 127072,
    averageLatency: 3000,
    qualityScore: 0.87,
    isAvailable: true,
    capabilities: ['chat', 'reasoning', 'search', 'analysis'],
    description: 'Online model with web search capabilities',
    isActive: true,
  },
];

async function seedAIModels() {
  console.log('Starting AI models seed...');

  // Create a connection to the database
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'projecthub',
    entities: [AIModelPricing],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const modelRepo = dataSource.getRepository(AIModelPricing);

    let created = 0;
    let updated = 0;

    for (const modelData of models) {
      const existing = await modelRepo.findOne({
        where: { modelId: modelData.modelId! },
      });

      if (existing) {
        // Update existing model
        Object.assign(existing, modelData);
        await modelRepo.save(existing);
        updated++;
        console.log(`✓ Updated: ${modelData.name}`);
      } else {
        // Create new model
        const model = modelRepo.create(modelData);
        await modelRepo.save(model);
        created++;
        console.log(`✓ Created: ${modelData.name}`);
      }
    }

    console.log('\n=================================');
    console.log('AI Models Seed Completed!');
    console.log(`Created: ${created} models`);
    console.log(`Updated: ${updated} models`);
    console.log(`Total: ${models.length} models`);
    console.log('=================================\n');

    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding AI models:', error);
    process.exit(1);
  }
}

// Run the seed function
seedAIModels();
