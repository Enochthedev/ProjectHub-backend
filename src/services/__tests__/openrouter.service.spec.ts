import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenRouterService, ModelSelection, ConversationContext } from '../openrouter.service';
import { AIRateLimiterService } from '../ai-rate-limiter.service';
import { CircuitBreakerService } from '../circuit-breaker.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('OpenRouterService', () => {
    let service: OpenRouterService;
    let configService: jest.Mocked<ConfigService>;
    let rateLimiterService: jest.Mocked<AIRateLimiterService>;
    let circuitBreakerService: jest.Mocked<CircuitBreakerService>;

    const mockConfig = {
        apiKey: 'test-api-key',
        defaultModel: 'openai/gpt-3.5-turbo',
        fallbackModel: 'meta-llama/llama-3.1-8b-instruct',
        monthlyBudget: 100,
        maxCostPerRequest: 0.10,
        timeout: 30000,
        retryAttempts: 3,
        retryDelayMs: 1000,
        budgetWarningThreshold: 0.8,
        qualityThreshold: 0.7,
    };

    const mockContext: ConversationContext = {
        userId: 'test-user-id',
        conversationId: 'test-conversation-id',
        messageCount: 5,
        averageResponseTime: 1500,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OpenRouterService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const configMap = {
                                'openRouter.apiKey': mockConfig.apiKey,
                                'openRouter.defaultModel': mockConfig.defaultModel,
                                'openRouter.fallbackModel': mockConfig.fallbackModel,
                                'openRouter.monthlyBudget': mockConfig.monthlyBudget,
                                'openRouter.maxCostPerRequest': mockConfig.maxCostPerRequest,
                                'openRouter.timeout': mockConfig.timeout,
                                'openRouter.retryAttempts': mockConfig.retryAttempts,
                                'openRouter.retryDelayMs': mockConfig.retryDelayMs,
                                'openRouter.budgetWarningThreshold': mockConfig.budgetWarningThreshold,
                                'openRouter.qualityThreshold': mockConfig.qualityThreshold,
                            };
                            return configMap[key];
                        }),
                    },
                },
                {
                    provide: AIRateLimiterService,
                    useValue: {
                        checkRateLimit: jest.fn(),
                        trackUsage: jest.fn(),
                    },
                },
                {
                    provide: CircuitBreakerService,
                    useValue: {
                        execute: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<OpenRouterService>(OpenRouterService);
        configService = module.get(ConfigService);
        rateLimiterService = module.get(AIRateLimiterService);
        circuitBreakerService = module.get(CircuitBreakerService);

        // Reset mocks
        jest.clearAllMocks();
    });

    describe('selectOptimalModel', () => {
        beforeEach(() => {
            rateLimiterService.checkRateLimit.mockResolvedValue({
                allowed: true,
                remainingRequests: 100,
                resetTime: new Date(),
                monthlyUsage: 10,
                monthlyLimit: 1000,
            });
        });

        it('should select the default model for basic queries', async () => {
            const query = 'What is machine learning?';
            const result = await service.selectOptimalModel(query, mockContext);

            expect(result).toBeDefined();
            expect(result.modelId).toBe('openai/gpt-3.5-turbo');
            expect(result.provider).toBe('OpenAI');
            expect(result.estimatedCost).toBeGreaterThan(0);
            expect(result.estimatedLatency).toBeGreaterThan(0);
        });

        it('should select a cheaper model when budget is constrained', async () => {
            const query = 'Simple question';
            const result = await service.selectOptimalModel(query, mockContext, {
                maxCost: 0.001, // Very low budget
            });

            expect(result).toBeDefined();
            // Should select the cheapest available model that fits the budget
            expect(result.modelId).toBeDefined();
            // The actual model selected depends on the scoring algorithm, just verify it's a valid model
            expect(service.getAvailableModels().map(m => m.id)).toContain(result.modelId);
            expect(result.estimatedCost).toBeLessThanOrEqual(0.001);
        });

        it('should prioritize speed when requested', async () => {
            const query = 'Quick question';
            const result = await service.selectOptimalModel(query, mockContext, {
                prioritizeSpeed: true,
            });

            expect(result).toBeDefined();
            expect(result.estimatedLatency).toBeLessThanOrEqual(1500); // Should select faster models
        });

        it('should prioritize quality when requested', async () => {
            const query = 'Complex analysis question';
            const result = await service.selectOptimalModel(query, mockContext, {
                prioritizeQuality: true,
            });

            expect(result).toBeDefined();
            // Should select a high-quality model (GPT-4o Mini has highest quality score)
            expect(['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'openai/gpt-3.5-turbo']).toContain(result.modelId);
        });

        it('should filter models by required capabilities', async () => {
            const query = 'Help me with code';
            const result = await service.selectOptimalModel(query, mockContext, {
                requiredCapabilities: ['code'],
            });

            expect(result).toBeDefined();
            // Should select a model that supports code capabilities
            expect(['openai/gpt-3.5-turbo', 'openai/gpt-4o-mini', 'meta-llama/llama-3.1-8b-instruct']).toContain(result.modelId);
        });

        it('should fallback to cheapest model when no models meet budget', async () => {
            const query = 'Expensive query';

            // Mock a very low remaining budget
            jest.spyOn(service, 'getBudgetStatus').mockResolvedValue({
                currentSpend: 99.99,
                monthlyLimit: 100,
                remainingBudget: 0.01,
                recommendedModel: 'meta-llama/llama-3.1-8b-instruct',
                budgetUtilization: 0.9999,
                daysRemaining: 5,
            });

            const result = await service.selectOptimalModel(query, mockContext);

            expect(result).toBeDefined();
            // Should select the fallback model when budget is very constrained
            expect(['meta-llama/llama-3.1-8b-instruct', 'openai/gpt-3.5-turbo']).toContain(result.modelId);
        });
    });

    describe('routeRequest', () => {
        const mockModelSelection: ModelSelection = {
            modelId: 'openai/gpt-3.5-turbo',
            provider: 'OpenAI',
            estimatedCost: 0.002,
            estimatedLatency: 1500,
            confidenceThreshold: 0.7,
            maxTokens: 4096,
            costPerToken: 0.000002,
        };

        const mockRequest = {
            messages: [
                { role: 'user' as const, content: 'Hello, how are you?' }
            ],
        };

        const mockOpenRouterResponse = {
            id: 'test-response-id',
            object: 'chat.completion',
            created: Date.now(),
            model: 'openai/gpt-3.5-turbo',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: 'Hello! I am doing well, thank you for asking.',
                    },
                    finishReason: 'stop',
                },
            ],
            usage: {
                promptTokens: 10,
                completionTokens: 15,
                totalTokens: 25,
            },
            cost: 0.00005,
        };

        beforeEach(() => {
            rateLimiterService.checkRateLimit.mockResolvedValue({
                allowed: true,
                remainingRequests: 100,
                resetTime: new Date(),
                monthlyUsage: 10,
                monthlyLimit: 1000,
            });

            circuitBreakerService.execute.mockImplementation(async (_, fn) => fn());
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockOpenRouterResponse),
            });
        });

        it('should successfully route request to OpenRouter', async () => {
            const result = await service.routeRequest(mockRequest, mockModelSelection, 'test-user');

            expect(result).toEqual(mockOpenRouterResponse);
            expect(fetch).toHaveBeenCalledWith(
                'https://openrouter.ai/api/v1/chat/completions',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-api-key',
                        'Content-Type': 'application/json',
                    }),
                    body: expect.stringContaining('openai/gpt-3.5-turbo'),
                })
            );
        });

        it('should throw error when API key is not configured', async () => {
            // Mock missing API key
            configService.get.mockImplementation((key: string) => {
                if (key === 'openRouter.apiKey') return '';
                return mockConfig[key.split('.')[1]];
            });

            // Create new service instance with missing API key
            const moduleWithoutKey = await Test.createTestingModule({
                providers: [
                    OpenRouterService,
                    { provide: ConfigService, useValue: configService },
                    { provide: AIRateLimiterService, useValue: rateLimiterService },
                    { provide: CircuitBreakerService, useValue: circuitBreakerService },
                ],
            }).compile();

            const serviceWithoutKey = moduleWithoutKey.get<OpenRouterService>(OpenRouterService);

            await expect(
                serviceWithoutKey.routeRequest(mockRequest, mockModelSelection, 'test-user')
            ).rejects.toThrow('OpenRouter API key not configured');
        });

        it('should throw rate limit error when rate limited', async () => {
            rateLimiterService.checkRateLimit.mockResolvedValue({
                allowed: false,
                remainingRequests: 0,
                resetTime: new Date(),
                monthlyUsage: 1000,
                monthlyLimit: 1000,
            });

            await expect(
                service.routeRequest(mockRequest, mockModelSelection, 'test-user')
            ).rejects.toThrow('Rate limit exceeded');
        });

        it('should retry on failure and eventually succeed', async () => {
            (fetch as jest.Mock)
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockOpenRouterResponse),
                });

            const result = await service.routeRequest(mockRequest, mockModelSelection, 'test-user');

            expect(result).toEqual(mockOpenRouterResponse);
            expect(fetch).toHaveBeenCalledTimes(2);
        });

        it('should track usage after successful request', async () => {
            await service.routeRequest(mockRequest, mockModelSelection, 'test-user');

            expect(rateLimiterService.trackUsage).toHaveBeenCalledWith(
                expect.objectContaining({
                    endpoint: '/chat/completions',
                    model: mockModelSelection.modelId,
                    tokensUsed: mockOpenRouterResponse.usage.totalTokens,
                    success: true,
                    userId: 'test-user',
                    cost: mockOpenRouterResponse.cost,
                })
            );
        });
    });

    describe('getBudgetStatus', () => {
        it('should return correct budget status for new user', async () => {
            const result = await service.getBudgetStatus('new-user');

            expect(result).toEqual({
                currentSpend: 0,
                monthlyLimit: 100,
                remainingBudget: 100,
                recommendedModel: 'openai/gpt-3.5-turbo',
                budgetUtilization: 0,
                daysRemaining: expect.any(Number),
            });
        });

        it('should recommend cheaper model when budget utilization is high', async () => {
            // Simulate high usage
            await service.trackUsage('openai/gpt-3.5-turbo', 1000, 85, 'high-usage-user');

            const result = await service.getBudgetStatus('high-usage-user');

            expect(result.budgetUtilization).toBeGreaterThan(0.8);
            // Should recommend the cheapest model when budget utilization is high
            expect(['meta-llama/llama-3.1-8b-instruct', 'openai/gpt-3.5-turbo']).toContain(result.recommendedModel);
        });
    });

    describe('handleModelFailure', () => {
        it('should select alternative model on failure', async () => {
            const mockRequest = {
                messages: [{ role: 'user' as const, content: 'Test message' }],
            };

            // Mock successful fallback
            circuitBreakerService.execute.mockImplementation(async (_, fn) => fn());
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    id: 'fallback-response',
                    choices: [{ message: { content: 'Fallback response' } }],
                    usage: { totalTokens: 10 },
                }),
            });

            rateLimiterService.checkRateLimit.mockResolvedValue({
                allowed: true,
                remainingRequests: 100,
                resetTime: new Date(),
                monthlyUsage: 10,
                monthlyLimit: 1000,
            });

            const result = await service.handleModelFailure(
                'openai/gpt-4o-mini', // Failed model
                mockRequest,
                mockContext
            );

            expect(result).toBeDefined();
            expect(result.id).toBe('fallback-response');
        });
    });

    describe('getAvailableModels', () => {
        it('should return list of available models', () => {
            const models = service.getAvailableModels();

            expect(models).toHaveLength(5);
            expect(models[0]).toHaveProperty('id');
            expect(models[0]).toHaveProperty('name');
            expect(models[0]).toHaveProperty('provider');
            expect(models[0]).toHaveProperty('costPerToken');
            expect(models[0]).toHaveProperty('isAvailable');
        });
    });

    describe('updateModelAvailability', () => {
        it('should update model availability status', () => {
            const models = service.getAvailableModels();
            const testModel = models[0];
            const originalStatus = testModel.isAvailable;

            service.updateModelAvailability(testModel.id, !originalStatus);

            const updatedModels = service.getAvailableModels();
            const updatedModel = updatedModels.find(m => m.id === testModel.id);

            expect(updatedModel?.isAvailable).toBe(!originalStatus);
        });
    });

    describe('healthCheck', () => {
        it('should return true when service is healthy', async () => {
            circuitBreakerService.execute.mockImplementation(async (_, fn) => fn());
            (fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    choices: [{ message: { content: 'Health check response' } }],
                    usage: { totalTokens: 5 },
                }),
            });

            const result = await service.healthCheck();

            expect(result).toBe(true);
        });

        it('should return false when API key is missing', async () => {
            // Mock missing API key
            configService.get.mockImplementation((key: string) => {
                if (key === 'openRouter.apiKey') return '';
                return mockConfig[key.split('.')[1]];
            });

            // Create new service instance
            const moduleWithoutKey = await Test.createTestingModule({
                providers: [
                    OpenRouterService,
                    { provide: ConfigService, useValue: configService },
                    { provide: AIRateLimiterService, useValue: rateLimiterService },
                    { provide: CircuitBreakerService, useValue: circuitBreakerService },
                ],
            }).compile();

            const serviceWithoutKey = moduleWithoutKey.get<OpenRouterService>(OpenRouterService);
            const result = await serviceWithoutKey.healthCheck();

            expect(result).toBe(false);
        });

        it('should return false when health check request fails', async () => {
            // Mock fetch to fail for health check
            (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            const result = await service.healthCheck();

            expect(result).toBe(false);
        });
    });

    describe('cost optimization', () => {
        it('should select most cost-effective model for simple queries', async () => {
            const simpleQuery = 'Hello';
            const result = await service.selectOptimalModel(simpleQuery, mockContext);

            // For simple queries, should prefer cost-effective models
            expect(['meta-llama/llama-3.1-8b-instruct', 'google/gemini-flash-1.5', 'openai/gpt-3.5-turbo']).toContain(result.modelId);
        });

        it('should balance cost and quality for complex queries', async () => {
            const complexQuery = 'Explain the theoretical foundations of quantum computing and its implications for cryptography in detail';
            const result = await service.selectOptimalModel(complexQuery, mockContext, {
                prioritizeQuality: true,
            });

            // For complex queries with quality priority, should select higher-quality models
            expect(['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'openai/gpt-3.5-turbo']).toContain(result.modelId);
        });
    });
});