import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIRateLimiterService } from './ai-rate-limiter.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AIModelConfigService } from './ai-model-config.service';
import { AIApiUsage } from '../entities/ai-api-usage.entity';

export interface ModelSelection {
    modelId: string;
    provider: string;
    estimatedCost: number;
    estimatedLatency: number;
    confidenceThreshold: number;
    maxTokens: number;
    costPerToken: number;
}

export interface BudgetStatus {
    currentSpend: number;
    monthlyLimit: number;
    remainingBudget: number;
    recommendedModel: string;
    budgetUtilization: number;
    daysRemaining: number;
}

export interface OpenRouterRequest {
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    model?: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stream?: boolean;
}

export interface OpenRouterResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finishReason: string;
    }>;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost?: number;
}

export interface ModelInfo {
    id: string;
    name: string;
    provider: string;
    costPerToken: number;
    maxTokens: number;
    averageLatency: number;
    qualityScore: number;
    isAvailable: boolean;
    capabilities: string[];
}

export interface ConversationContext {
    userId: string;
    conversationId: string;
    messageCount: number;
    averageResponseTime: number;
    userPreferences?: {
        preferredProvider?: string;
        maxCostPerRequest?: number;
        prioritizeSpeed?: boolean;
        prioritizeQuality?: boolean;
    };
}

@Injectable()
export class OpenRouterService {
    private readonly logger = new Logger(OpenRouterService.name);
    private readonly baseUrl = 'https://openrouter.ai/api/v1';

    private readonly config: {
        apiKey: string;
        defaultModel: string;
        monthlyBudget: number;
        maxCostPerRequest: number;
        maxTokens: number;
        timeout: number;
        retryAttempts: number;
        retryDelayMs: number;
        fallbackModel: string;
        budgetWarningThreshold: number;
        qualityThreshold: number;
        appDomain: string;
        appName: string;
    };

    // Models are now loaded from database via AIModelConfigService
    // This eliminates hardcoded pricing and allows dynamic updates

    constructor(
        private readonly configService: ConfigService,
        private readonly rateLimiterService: AIRateLimiterService,
        private readonly circuitBreakerService: CircuitBreakerService,
        private readonly modelConfigService: AIModelConfigService,
        @InjectRepository(AIApiUsage)
        private readonly apiUsageRepo: Repository<AIApiUsage>,
    ) {
        this.config = {
            apiKey: this.configService.get<string>('openRouter.apiKey') || '',
            defaultModel: this.configService.get<string>('openRouter.defaultModel') || 'anthropic/claude-opus-4.5',
            monthlyBudget: this.configService.get<number>('openRouter.monthlyBudget') || 100,
            maxCostPerRequest: this.configService.get<number>('openRouter.maxCostPerRequest') || 0.50,
            maxTokens: this.configService.get<number>('openRouter.maxTokens') || 4096,
            timeout: this.configService.get<number>('openRouter.timeout') || 30000,
            retryAttempts: this.configService.get<number>('openRouter.retryAttempts') || 3,
            retryDelayMs: this.configService.get<number>('openRouter.retryDelayMs') || 1000,
            fallbackModel: this.configService.get<string>('openRouter.fallbackModel') || 'anthropic/claude-3.5-sonnet',
            budgetWarningThreshold: this.configService.get<number>('openRouter.budgetWarningThreshold') || 0.8,
            qualityThreshold: this.configService.get<number>('openRouter.qualityThreshold') || 0.7,
            appDomain: this.configService.get<string>('openRouter.appDomain') || 'https://projecthub.ai',
            appName: this.configService.get<string>('openRouter.appName') || 'ProjectHub AI Assistant',
        };

        if (!this.config.apiKey) {
            this.logger.warn('OpenRouter API key not configured. Service will use fallback responses.');
        }

        this.logger.log('OpenRouter service initialized with database-backed budget tracking and model selection');
    }

    /**
     * Select the optimal model based on query requirements and budget constraints
     */
    async selectOptimalModel(
        query: string,
        context: ConversationContext,
        requirements?: {
            maxCost?: number;
            prioritizeSpeed?: boolean;
            prioritizeQuality?: boolean;
            requiredCapabilities?: string[];
        }
    ): Promise<ModelSelection> {
        try {
            const budgetStatus = await this.getBudgetStatus(context.userId);

            // Get available models from database
            const allModels = await this.modelConfigService.getAvailableModels();

            // Filter available models based on budget and requirements
            let candidateModels = allModels.filter(model => {
                // Check availability
                if (!model.isAvailable) return false;

                // Check budget constraints
                const estimatedCost = this.estimateRequestCost(query, model);
                if (estimatedCost > budgetStatus.remainingBudget) return false;
                if (requirements?.maxCost && estimatedCost > requirements.maxCost) return false;

                // Check capability requirements
                if (requirements?.requiredCapabilities) {
                    const hasAllCapabilities = requirements.requiredCapabilities.every(
                        cap => model.capabilities.includes(cap)
                    );
                    if (!hasAllCapabilities) return false;
                }

                return true;
            });

            if (candidateModels.length === 0) {
                this.logger.warn('No models available within budget constraints, using fallback');
                candidateModels = allModels.filter(m => m.id === this.config.fallbackModel);
            }

            // Score models based on requirements
            const scoredModels = candidateModels.map(model => {
                let score = 0;

                // Base quality score (40% weight)
                score += model.qualityScore * 0.4;

                // Cost efficiency (30% weight) - lower cost is better
                const maxCost = Math.max(...candidateModels.map(m => m.costPerToken));
                const costScore = maxCost > 0 ? 1 - (model.costPerToken / maxCost) : 0;
                score += costScore * 0.3;

                // Speed score (20% weight) - lower latency is better
                const maxLatency = Math.max(...candidateModels.map(m => m.averageLatency));
                const speedScore = maxLatency > 0 ? 1 - (model.averageLatency / maxLatency) : 0;
                score += speedScore * 0.2;

                // Performance history (10% weight) - loaded from database
                // This is now part of the model's averageLatency from the database
                score += 0.05; // Base performance score

                // Apply user preferences
                if (requirements?.prioritizeSpeed) {
                    score += speedScore * 0.2; // Boost speed importance
                }
                if (requirements?.prioritizeQuality) {
                    score += model.qualityScore * 0.2; // Boost quality importance
                }

                return { model, score };
            });

            // Select the highest scoring model
            scoredModels.sort((a, b) => b.score - a.score);
            const selectedModel = scoredModels[0].model;

            const estimatedCost = this.estimateRequestCost(query, selectedModel);

            this.logger.debug(`Selected model: ${selectedModel.name} (score: ${scoredModels[0].score.toFixed(3)}, cost: $${estimatedCost.toFixed(4)})`);

            return {
                modelId: selectedModel.id,
                provider: selectedModel.provider,
                estimatedCost,
                estimatedLatency: selectedModel.averageLatency,
                confidenceThreshold: this.config.qualityThreshold,
                maxTokens: selectedModel.maxTokens,
                costPerToken: selectedModel.costPerToken
            };
        } catch (error) {
            this.logger.error(`Error selecting optimal model: ${error.message}`);
            // Return fallback model from database or config
            const allModels = await this.modelConfigService.getAvailableModels();
            const fallbackModel = allModels.find(m => m.id === this.config.fallbackModel);
            if (fallbackModel) {
                return {
                    modelId: fallbackModel.id,
                    provider: fallbackModel.provider,
                    estimatedCost: this.estimateRequestCost(query, fallbackModel),
                    estimatedLatency: fallbackModel.averageLatency,
                    confidenceThreshold: this.config.qualityThreshold,
                    maxTokens: fallbackModel.maxTokens,
                    costPerToken: fallbackModel.costPerToken
                };
            }
            throw error;
        }
    }

    /**
     * Route request to the selected model
     */
    async routeRequest(
        request: OpenRouterRequest,
        modelSelection: ModelSelection,
        userId?: string
    ): Promise<OpenRouterResponse> {
        if (!this.config.apiKey) {
            throw new HttpException(
                'OpenRouter API key not configured',
                HttpStatus.SERVICE_UNAVAILABLE
            );
        }

        // Check rate limits
        const rateLimitResult = await this.rateLimiterService.checkRateLimit(userId);
        if (!rateLimitResult.allowed) {
            throw new HttpException(
                {
                    message: 'Rate limit exceeded',
                    remainingRequests: rateLimitResult.remainingRequests,
                    resetTime: rateLimitResult.resetTime,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const startTime = Date.now();
        let lastError: Error = new Error('Unknown error');

        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                const response = await this.circuitBreakerService.execute(
                    `openrouter-${modelSelection.modelId}`,
                    () => this.makeOpenRouterRequest(request, modelSelection),
                    {
                        failureThreshold: 3,
                        recoveryTimeout: 30000,
                        halfOpenMaxCalls: 2,
                    }
                );

                const endTime = Date.now();
                const responseTime = endTime - startTime;
                const actualCost = response.cost || modelSelection.estimatedCost;
                const totalTokens = response.usage?.totalTokens || 0;

                // Track successful usage in database
                await this.trackUsage(modelSelection.modelId, totalTokens, actualCost, responseTime, userId, true);
                await this.modelConfigService.recordModelUsage(
                    modelSelection.modelId,
                    responseTime,
                    actualCost,
                    totalTokens,
                    true
                );

                this.logger.debug(
                    `Request completed successfully in ${responseTime}ms, cost: $${actualCost.toFixed(4)}`
                );

                return response;
            } catch (error) {
                lastError = error;
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                await this.modelConfigService.recordModelUsage(
                    modelSelection.modelId,
                    responseTime,
                    0,
                    0,
                    false
                );

                this.logger.warn(
                    `Request attempt ${attempt} failed: ${error.message}`
                );

                if (attempt < this.config.retryAttempts) {
                    const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1);
                    await this.delay(delay);
                }
            }
        }

        throw lastError;
    }

    /**
     * Handle model failure with intelligent fallback
     */
    async handleModelFailure(
        originalModel: string,
        request: OpenRouterRequest,
        context: ConversationContext
    ): Promise<OpenRouterResponse> {
        this.logger.warn(`Model ${originalModel} failed, attempting fallback`);

        // Try to select an alternative model
        const query = request.messages[request.messages.length - 1]?.content || '';
        const fallbackSelection = await this.selectOptimalModel(query, context, {
            maxCost: this.config.maxCostPerRequest * 0.5, // Use cheaper fallback
            prioritizeSpeed: true
        });

        // Ensure we don't use the same failed model
        if (fallbackSelection.modelId === originalModel) {
            // Force use of the configured fallback model
            const allModels = await this.modelConfigService.getAvailableModels();
            const fallbackModel = allModels.find(m => m.id === this.config.fallbackModel);
            if (fallbackModel) {
                fallbackSelection.modelId = fallbackModel.id;
                fallbackSelection.provider = fallbackModel.provider;
                fallbackSelection.costPerToken = fallbackModel.costPerToken;
            }
        }

        return this.routeRequest(request, fallbackSelection, context.userId);
    }

    /**
     * Get current budget status for a user (now using database)
     */
    async getBudgetStatus(userId?: string): Promise<BudgetStatus> {
        // Get actual spend from database
        const currentSpend = await this.modelConfigService.getMonthlyUsage(userId);
        const monthlyLimit = this.config.monthlyBudget;
        const remainingBudget = Math.max(0, monthlyLimit - currentSpend);
        const budgetUtilization = monthlyLimit > 0 ? currentSpend / monthlyLimit : 0;

        // Calculate days remaining in month
        const now = new Date();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysRemaining = Math.ceil((lastDayOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Recommend model based on budget status
        let recommendedModel = this.config.defaultModel;
        if (budgetUtilization > this.config.budgetWarningThreshold) {
            // Recommend cheaper model when budget is running low
            const allModels = await this.modelConfigService.getAvailableModels();
            const cheapestModel = allModels
                .filter(m => m.isAvailable)
                .sort((a, b) => a.costPerToken - b.costPerToken)[0];
            if (cheapestModel) {
                recommendedModel = cheapestModel.id;
            }
        }

        return {
            currentSpend,
            monthlyLimit,
            remainingBudget,
            recommendedModel,
            budgetUtilization,
            daysRemaining
        };
    }

    /**
     * Track usage for budget management (now persisted to database)
     */
    async trackUsage(
        modelId: string,
        tokens: number,
        cost: number,
        responseTime: number,
        userId?: string,
        success: boolean = true
    ): Promise<void> {
        // Save to database
        const usage = this.apiUsageRepo.create({
            endpoint: '/chat/completions',
            model: modelId,
            tokensUsed: tokens,
            responseTimeMs: responseTime,
            cost,
            success,
            userId: userId || null,
        });
        await this.apiUsageRepo.save(usage);

        // Track usage with rate limiter service
        await this.rateLimiterService.trackUsage({
            endpoint: '/chat/completions',
            model: modelId,
            tokensUsed: tokens,
            responseTimeMs: responseTime,
            success,
            userId
        });

        // Log budget warnings
        const budgetStatus = await this.getBudgetStatus(userId);
        if (budgetStatus.budgetUtilization > this.config.budgetWarningThreshold) {
            this.logger.warn(
                `Budget utilization at ${(budgetStatus.budgetUtilization * 100).toFixed(1)}% for ${userId || 'global'}`
            );
        }
    }

    /**
     * Get available models with current status (from database)
     */
    async getAvailableModels(): Promise<ModelInfo[]> {
        return await this.modelConfigService.getAvailableModels();
    }

    /**
     * Update model configuration (delegates to database service)
     */
    async updateModelAvailability(modelId: string, isAvailable: boolean): Promise<void> {
        await this.modelConfigService.updateModelAvailability(modelId, isAvailable);
    }

    /**
     * Get model performance statistics (from database)
     */
    async getModelPerformanceStats(): Promise<Map<string, any>> {
        return await this.modelConfigService.getAllModelPerformance();
    }

    /**
     * Health check for OpenRouter service
     */
    async healthCheck(): Promise<boolean> {
        if (!this.config.apiKey) {
            return false;
        }

        try {
            const testRequest: OpenRouterRequest = {
                messages: [
                    { role: 'user', content: 'Hello, this is a health check.' }
                ],
                model: this.config.fallbackModel,
                maxTokens: 10
            };

            const allModels = await this.modelConfigService.getAvailableModels();
            const fallbackModel = allModels.find(m => m.id === this.config.fallbackModel);
            if (!fallbackModel) {
                return false;
            }

            const modelSelection: ModelSelection = {
                modelId: fallbackModel.id,
                provider: fallbackModel.provider,
                estimatedCost: 0.001,
                estimatedLatency: fallbackModel.averageLatency,
                confidenceThreshold: this.config.qualityThreshold,
                maxTokens: fallbackModel.maxTokens,
                costPerToken: fallbackModel.costPerToken
            };

            await this.makeOpenRouterRequest(testRequest, modelSelection);
            return true;
        } catch (error) {
            this.logger.error(`Health check failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Make actual request to OpenRouter API
     */
    private async makeOpenRouterRequest(
        request: OpenRouterRequest,
        modelSelection: ModelSelection
    ): Promise<OpenRouterResponse> {
        const requestBody = {
            ...request,
            model: modelSelection.modelId,
            maxTokens: request.maxTokens || Math.min(this.config.maxTokens, modelSelection.maxTokens)
        };


        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': this.config.appDomain,
                'X-Title': this.config.appName
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // Calculate actual cost if not provided
        if (!data.cost && data.usage) {
            data.cost = data.usage.totalTokens * modelSelection.costPerToken;
        }

        return data;
    }

    /**
     * Estimate request cost based on query and model
     */
    private estimateRequestCost(query: string, model: ModelInfo): number {
        // Rough estimation: input tokens + expected output tokens
        const inputTokens = Math.ceil(query.length / 4); // ~4 chars per token
        const expectedOutputTokens = Math.min(500, model.maxTokens * 0.1); // Assume 10% of max or 500 tokens
        const totalTokens = inputTokens + expectedOutputTokens;

        return totalTokens * model.costPerToken;
    }

    // updateModelPerformanceStats method removed - now handled by AIModelConfigService

    /**
     * Delay execution for specified milliseconds
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}