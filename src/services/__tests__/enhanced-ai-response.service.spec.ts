import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnhancedAIResponseService } from '../enhanced-ai-response.service';
import { OpenRouterService } from '../openrouter.service';
import { HuggingFaceService } from '../hugging-face.service';
import { ContextService } from '../context.service';
import { QueryProcessingService } from '../query-processing.service';
import { ProjectContextIntegrationService } from '../project-context-integration.service';
import { MilestoneGuidanceService } from '../milestone-guidance.service';

describe('EnhancedAIResponseService', () => {
    let service: EnhancedAIResponseService;
    let openRouterService: jest.Mocked<OpenRouterService>;
    let huggingFaceService: jest.Mocked<HuggingFaceService>;
    let queryProcessingService: jest.Mocked<QueryProcessingService>;
    let projectContextService: jest.Mocked<ProjectContextIntegrationService>;

    const mockProcessedQuery = {
        originalQuery: 'How do I write a literature review?',
        normalizedQuery: 'how do i write a literature review',
        detectedLanguage: 'en',
        category: 'literature_review',
        intent: 'request_guidance',
        keywords: ['write', 'literature', 'review'],
        entities: [],
        isValid: true,
        validationIssues: [],
        metadata: {
            academicLevel: 'undergraduate',
            complexity: 'moderate',
            urgency: 'normal',
        },
    };

    beforeEach(async () => {
        const mockOpenRouterService = {
            selectOptimalModel: jest.fn(),
            routeRequest: jest.fn(),
            getBudgetStatus: jest.fn(),
            handleModelFailure: jest.fn(),
        };

        const mockHuggingFaceService = {
            questionAnswering: jest.fn(),
            getQAModelInfo: jest.fn().mockReturnValue({ name: 'Test Model' }),
        };

        const mockContextService = {
            buildConversationContext: jest.fn(),
        };

        const mockQueryProcessingService = {
            processQuery: jest.fn(),
        };

        const mockProjectContextService = {
            getEnhancedProjectContext: jest.fn(),
            generateMilestoneAwareGuidance: jest.fn(),
            generateContextualResponseEnhancements: jest.fn(),
        };

        const mockMilestoneGuidanceService = {
            generateMilestoneDeadlineAwareness: jest.fn(),
            generateProactiveSuggestions: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn((key: string) => {
                const config = {
                    'ai.useOpenRouterByDefault': true,
                    'ai.fallbackToHuggingFace': true,
                    'ai.confidenceThreshold': 0.7,
                    'ai.maxRetries': 2,
                };
                return config[key];
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EnhancedAIResponseService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: OpenRouterService, useValue: mockOpenRouterService },
                { provide: HuggingFaceService, useValue: mockHuggingFaceService },
                { provide: ContextService, useValue: mockContextService },
                { provide: QueryProcessingService, useValue: mockQueryProcessingService },
                { provide: ProjectContextIntegrationService, useValue: mockProjectContextService },
                { provide: MilestoneGuidanceService, useValue: mockMilestoneGuidanceService },
            ],
        }).compile();

        service = module.get<EnhancedAIResponseService>(EnhancedAIResponseService);
        openRouterService = module.get(OpenRouterService);
        huggingFaceService = module.get(HuggingFaceService);
        queryProcessingService = module.get(QueryProcessingService);
        projectContextService = module.get(ProjectContextIntegrationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateEnhancedResponse', () => {
        it('should generate response using OpenRouter with high confidence', async () => {
            const request = {
                query: 'How do I write a literature review?',
                conversationId: 'conv-123',
                userId: 'user-123',
                useOpenRouter: true,
            };

            queryProcessingService.processQuery.mockResolvedValue(mockProcessedQuery);

            openRouterService.selectOptimalModel.mockResolvedValue({
                modelId: 'openai/gpt-3.5-turbo',
                provider: 'OpenAI',
                estimatedCost: 0.002,
                estimatedLatency: 1500,
                confidenceThreshold: 0.7,
                maxTokens: 4096,
                costPerToken: 0.000002,
            });

            openRouterService.routeRequest.mockResolvedValue({
                id: 'resp-123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'openai/gpt-3.5-turbo',
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'A literature review is a comprehensive analysis of existing research on a topic. To write an effective literature review, you should: First, identify relevant sources through academic databases. Second, critically analyze each source for its contribution to your field. Third, synthesize the findings to identify gaps and trends. Finally, organize your review thematically or chronologically to provide clear structure.',
                        },
                        finishReason: 'stop',
                    },
                ],
                usage: {
                    promptTokens: 100,
                    completionTokens: 150,
                    totalTokens: 250,
                },
                cost: 0.0005,
            });

            openRouterService.getBudgetStatus.mockResolvedValue({
                currentSpend: 5.0,
                monthlyLimit: 100.0,
                remainingBudget: 95.0,
                recommendedModel: 'openai/gpt-3.5-turbo',
                budgetUtilization: 0.05,
                daysRemaining: 20,
            });

            projectContextService.getEnhancedProjectContext.mockResolvedValue(null);
            projectContextService.generateMilestoneAwareGuidance.mockResolvedValue({
                overdueMilestones: [],
                urgentMilestones: [],
                blockedMilestones: [],
                phaseSpecificGuidance: { currentPhase: 'planning', keyActivities: [] },
            });

            const result = await service.generateEnhancedResponse(request);

            expect(result).toBeDefined();
            expect(result.response).toContain('literature review');
            expect(result.confidenceScore).toBeGreaterThan(0.7);
            expect(result.modelUsed).toBe('openai/gpt-3.5-turbo');
            expect(result.provider).toBe('OpenAI');
            expect(queryProcessingService.processQuery).toHaveBeenCalledWith(
                request.query,
                expect.any(Object)
            );
        });

        it('should use fallback response for low quality output', async () => {
            const request = {
                query: 'What is machine learning?',
                conversationId: 'conv-123',
                userId: 'user-123',
                useOpenRouter: true,
            };

            queryProcessingService.processQuery.mockResolvedValue({
                ...mockProcessedQuery,
                originalQuery: 'What is machine learning?',
                category: 'general',
            });

            openRouterService.selectOptimalModel.mockResolvedValue({
                modelId: 'openai/gpt-3.5-turbo',
                provider: 'OpenAI',
                estimatedCost: 0.002,
                estimatedLatency: 1500,
                confidenceThreshold: 0.7,
                maxTokens: 4096,
                costPerToken: 0.000002,
            });

            // Simulate a very short, low-quality response
            openRouterService.routeRequest.mockResolvedValue({
                id: 'resp-123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'openai/gpt-3.5-turbo',
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'ML is AI.',
                        },
                        finishReason: 'stop',
                    },
                ],
                usage: {
                    promptTokens: 50,
                    completionTokens: 10,
                    totalTokens: 60,
                },
                cost: 0.0001,
            });

            openRouterService.getBudgetStatus.mockResolvedValue({
                currentSpend: 5.0,
                monthlyLimit: 100.0,
                remainingBudget: 95.0,
                recommendedModel: 'openai/gpt-3.5-turbo',
                budgetUtilization: 0.05,
                daysRemaining: 20,
            });

            projectContextService.getEnhancedProjectContext.mockResolvedValue(null);
            projectContextService.generateMilestoneAwareGuidance.mockResolvedValue({
                overdueMilestones: [],
                urgentMilestones: [],
                blockedMilestones: [],
                phaseSpecificGuidance: { currentPhase: 'planning', keyActivities: [] },
            });

            const result = await service.generateEnhancedResponse(request);

            expect(result).toBeDefined();
            // Should use fallback response instead of the low-quality "ML is AI."
            expect(result.response.length).toBeGreaterThan(50);
            expect(result.response).toContain('understand');
        });

        it('should fallback to Hugging Face when OpenRouter fails', async () => {
            const request = {
                query: 'How do I analyze data?',
                conversationId: 'conv-123',
                userId: 'user-123',
                useOpenRouter: true,
            };

            queryProcessingService.processQuery.mockResolvedValue({
                ...mockProcessedQuery,
                originalQuery: 'How do I analyze data?',
                category: 'data_analysis',
            });

            openRouterService.selectOptimalModel.mockResolvedValue({
                modelId: 'openai/gpt-3.5-turbo',
                provider: 'OpenAI',
                estimatedCost: 0.002,
                estimatedLatency: 1500,
                confidenceThreshold: 0.7,
                maxTokens: 4096,
                costPerToken: 0.000002,
            });

            // Simulate OpenRouter failure
            openRouterService.routeRequest.mockRejectedValue(new Error('API timeout'));

            // Hugging Face should be called as fallback
            huggingFaceService.questionAnswering.mockResolvedValue({
                answer: 'Data analysis involves collecting, processing, and interpreting data to extract meaningful insights. Start by cleaning your data, then apply appropriate statistical methods based on your research questions.',
                score: 0.75,
                start: 0,
                end: 150,
            });

            projectContextService.getEnhancedProjectContext.mockResolvedValue(null);
            projectContextService.generateMilestoneAwareGuidance.mockResolvedValue({
                overdueMilestones: [],
                urgentMilestones: [],
                blockedMilestones: [],
                phaseSpecificGuidance: { currentPhase: 'implementation', keyActivities: [] },
            });

            const result = await service.generateEnhancedResponse(request);

            expect(result).toBeDefined();
            expect(result.response).toContain('data');
            expect(result.provider).toBe('Hugging Face');
            expect(huggingFaceService.questionAnswering).toHaveBeenCalled();
        });

        it('should include project context in response when available', async () => {
            const request = {
                query: 'What should I do next?',
                conversationId: 'conv-123',
                userId: 'user-123',
                projectId: 'proj-123',
                includeProjectContext: true,
                useOpenRouter: true,
            };

            queryProcessingService.processQuery.mockResolvedValue({
                ...mockProcessedQuery,
                originalQuery: 'What should I do next?',
                category: 'general',
                intent: 'request_guidance',
            });

            openRouterService.selectOptimalModel.mockResolvedValue({
                modelId: 'openai/gpt-3.5-turbo',
                provider: 'OpenAI',
                estimatedCost: 0.002,
                estimatedLatency: 1500,
                confidenceThreshold: 0.7,
                maxTokens: 4096,
                costPerToken: 0.000002,
            });

            openRouterService.routeRequest.mockResolvedValue({
                id: 'resp-123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'openai/gpt-3.5-turbo',
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Based on your project phase, you should focus on completing your literature review and defining your research methodology.',
                        },
                        finishReason: 'stop',
                    },
                ],
                usage: {
                    promptTokens: 150,
                    completionTokens: 100,
                    totalTokens: 250,
                },
                cost: 0.0005,
            });

            openRouterService.getBudgetStatus.mockResolvedValue({
                currentSpend: 5.0,
                monthlyLimit: 100.0,
                remainingBudget: 95.0,
                recommendedModel: 'openai/gpt-3.5-turbo',
                budgetUtilization: 0.05,
                daysRemaining: 20,
            });

            projectContextService.getEnhancedProjectContext.mockResolvedValue({
                title: 'AI-Powered Recommendation System',
                specialization: 'Machine Learning',
                currentPhase: 'planning',
                phaseProgress: 60,
                riskLevel: 'medium',
                milestonesSummary: {
                    total: 10,
                    completed: 3,
                    inProgress: 2,
                    upcoming: 3,
                    overdue: 2,
                },
                recommendations: ['Complete literature review', 'Define methodology'],
            });

            projectContextService.generateMilestoneAwareGuidance.mockResolvedValue({
                overdueMilestones: [
                    { title: 'Literature Review', daysPastDue: 3, daysUntilDue: -3 },
                ],
                urgentMilestones: [],
                blockedMilestones: [],
                phaseSpecificGuidance: {
                    currentPhase: 'planning',
                    keyActivities: ['Research', 'Planning'],
                },
            });

            projectContextService.generateContextualResponseEnhancements.mockReturnValue({
                priorityAlerts: ['⚠️ You have 2 overdue milestones that need attention.'],
                contextualSuggestions: ['Focus on completing your literature review first.'],
                phaseSpecificTips: ['In the planning phase, ensure your methodology is well-defined.'],
                timelineConcerns: [],
            });

            const result = await service.generateEnhancedResponse(request);

            expect(result).toBeDefined();
            expect(result.contextUsed.projectInfo).toBe(true);
            expect(result.response).toContain('literature review');
            expect(projectContextService.getEnhancedProjectContext).toHaveBeenCalledWith(
                request.userId,
                request.projectId
            );
        });

        it('should calculate improved confidence scores', async () => {
            const request = {
                query: 'Explain neural networks',
                conversationId: 'conv-123',
                userId: 'user-123',
                useOpenRouter: true,
            };

            queryProcessingService.processQuery.mockResolvedValue({
                ...mockProcessedQuery,
                originalQuery: 'Explain neural networks',
                category: 'implementation',
                metadata: {
                    academicLevel: 'research',
                    complexity: 'complex',
                    urgency: 'normal',
                },
            });

            openRouterService.selectOptimalModel.mockResolvedValue({
                modelId: 'openai/gpt-4o-mini',
                provider: 'OpenAI',
                estimatedCost: 0.003,
                estimatedLatency: 2000,
                confidenceThreshold: 0.7,
                maxTokens: 128000,
                costPerToken: 0.00015,
            });

            // High-quality detailed response with structure and examples
            openRouterService.routeRequest.mockResolvedValue({
                id: 'resp-123',
                object: 'chat.completion',
                created: Date.now(),
                model: 'openai/gpt-4o-mini',
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Neural networks are computational models inspired by biological neural systems. First, they consist of interconnected nodes (neurons) organized in layers. Second, each connection has a weight that adjusts during training. Third, they use activation functions to introduce non-linearity. For example, a simple feedforward network processes input through hidden layers to produce output. Research shows that deep neural networks excel at pattern recognition tasks. Specifically, convolutional neural networks are particularly effective for image processing.',
                        },
                        finishReason: 'stop',
                    },
                ],
                usage: {
                    promptTokens: 100,
                    completionTokens: 200,
                    totalTokens: 300,
                },
                cost: 0.00045,
            });

            openRouterService.getBudgetStatus.mockResolvedValue({
                currentSpend: 5.0,
                monthlyLimit: 100.0,
                remainingBudget: 95.0,
                recommendedModel: 'openai/gpt-4o-mini',
                budgetUtilization: 0.05,
                daysRemaining: 20,
            });

            projectContextService.getEnhancedProjectContext.mockResolvedValue(null);
            projectContextService.generateMilestoneAwareGuidance.mockResolvedValue({
                overdueMilestones: [],
                urgentMilestones: [],
                blockedMilestones: [],
                phaseSpecificGuidance: { currentPhase: 'implementation', keyActivities: [] },
            });

            const result = await service.generateEnhancedResponse(request);

            expect(result).toBeDefined();
            // High-quality response with structure, examples, and references should have high confidence
            expect(result.confidenceScore).toBeGreaterThan(0.85);
            expect(result.response).toContain('neural networks');
        });
    });
});
