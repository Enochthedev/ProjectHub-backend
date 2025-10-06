import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenRouterService, OpenRouterRequest, ModelSelection, ConversationContext } from './openrouter.service';
import { HuggingFaceService, QARequest, QAResponse } from './hugging-face.service';
import { ContextService } from './context.service';
import { QueryProcessingService, ProcessedQuery } from './query-processing.service';
import { ProjectContextIntegrationService } from './project-context-integration.service';
import { MilestoneGuidanceService } from './milestone-guidance.service';
import { AIResponseRequest, AIResponseResult } from './ai-response-generation.service';
import { MessageMetadata } from '../entities/interfaces/conversation.interface';

export interface EnhancedAIRequest extends AIResponseRequest {
    useOpenRouter?: boolean;
    modelPreferences?: {
        prioritizeSpeed?: boolean;
        prioritizeQuality?: boolean;
        maxCost?: number;
        requiredCapabilities?: string[];
    };
}

export interface EnhancedAIResponse extends AIResponseResult {
    modelUsed: string;
    provider: string;
    actualCost?: number;
    budgetImpact?: {
        remainingBudget: number;
        budgetUtilization: number;
    };
}

@Injectable()
export class EnhancedAIResponseService {
    private readonly logger = new Logger(EnhancedAIResponseService.name);

    private readonly config: {
        useOpenRouterByDefault: boolean;
        fallbackToHuggingFace: boolean;
        confidenceThreshold: number;
        maxRetries: number;
    };

    constructor(
        private readonly configService: ConfigService,
        private readonly openRouterService: OpenRouterService,
        private readonly huggingFaceService: HuggingFaceService,
        private readonly contextService: ContextService,
        private readonly queryProcessingService: QueryProcessingService,
        private readonly projectContextService: ProjectContextIntegrationService,
        private readonly milestoneGuidanceService: MilestoneGuidanceService,
    ) {
        this.config = {
            useOpenRouterByDefault: this.configService.get<boolean>('ai.useOpenRouterByDefault') ?? true,
            fallbackToHuggingFace: this.configService.get<boolean>('ai.fallbackToHuggingFace') ?? true,
            confidenceThreshold: this.configService.get<number>('ai.confidenceThreshold') || 0.7,
            maxRetries: this.configService.get<number>('ai.maxRetries') || 2,
        };

        this.logger.log('Enhanced AI Response service initialized');
    }

    /**
     * Generate enhanced AI response using OpenRouter or fallback to Hugging Face
     */
    async generateEnhancedResponse(request: EnhancedAIRequest): Promise<EnhancedAIResponse> {
        const startTime = Date.now();

        try {
            this.logger.debug(`Generating enhanced AI response for query: "${request.query}"`);

            // Step 1: Process the query
            const processedQuery = await this.queryProcessingService.processQuery(
                request.query,
                {
                    userLanguage: request.language,
                    conversationHistory: [],
                },
            );

            if (!processedQuery.isValid) {
                throw new Error(`Invalid query: ${processedQuery.validationIssues.join(', ')}`);
            }

            // Step 2: Determine which AI service to use
            const useOpenRouter = request.useOpenRouter ?? this.config.useOpenRouterByDefault;

            let response: EnhancedAIResponse;

            if (useOpenRouter) {
                try {
                    response = await this.generateOpenRouterResponse(request, processedQuery, startTime);
                } catch (error) {
                    this.logger.warn(`OpenRouter failed: ${error.message}`);

                    if (this.config.fallbackToHuggingFace) {
                        this.logger.log('Falling back to Hugging Face');
                        response = await this.generateHuggingFaceResponse(request, processedQuery, startTime);
                    } else {
                        throw error;
                    }
                }
            } else {
                response = await this.generateHuggingFaceResponse(request, processedQuery, startTime);
            }

            this.logger.debug(
                `Enhanced AI response generated successfully with confidence: ${response.confidenceScore}`
            );

            return response;
        } catch (error) {
            this.logger.error(`Error generating enhanced AI response: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Generate intelligent fallback response when AI fails or produces low-quality output
     */
    private async generateFallbackResponse(
        request: EnhancedAIRequest,
        processedQuery: ProcessedQuery,
        reason: string
    ): Promise<string> {
        this.logger.warn(`Generating fallback response due to: ${reason}`);

        // Build a helpful fallback based on query category and intent
        const fallbackParts: string[] = [];

        // Acknowledge the query
        fallbackParts.push(`I understand you're asking about ${processedQuery.category.replace(/_/g, ' ')}.`);

        // Provide category-specific guidance
        const categoryGuidance = this.getCategorySpecificGuidance(processedQuery.category);
        if (categoryGuidance) {
            fallbackParts.push(categoryGuidance);
        }

        // Add intent-specific suggestions
        switch (processedQuery.intent) {
            case 'definition':
                fallbackParts.push('For detailed definitions, I recommend consulting your course materials or academic resources.');
                break;
            case 'question':
                fallbackParts.push('This is a great question that might benefit from discussion with your supervisor.');
                break;
            case 'request_guidance':
                fallbackParts.push('For specific guidance on this topic, consider scheduling a meeting with your project supervisor.');
                break;
            case 'example_request':
                fallbackParts.push('You can find relevant examples in academic journals, past project repositories, or your course materials.');
                break;
        }

        // Add helpful next steps
        fallbackParts.push('In the meantime, you might want to:');
        fallbackParts.push('• Review your project documentation and requirements');
        fallbackParts.push('• Check your course materials for related information');
        fallbackParts.push('• Discuss this with your supervisor or peers');

        // Add project-specific context if available
        try {
            const milestoneGuidance = await this.projectContextService.generateMilestoneAwareGuidance(request.userId);
            if (milestoneGuidance.urgentMilestones.length > 0) {
                fallbackParts.push(`\n⚠️ Note: You have ${milestoneGuidance.urgentMilestones.length} urgent milestone(s) that may need attention.`);
            }
        } catch (error) {
            // Silently fail if we can't get milestone context
        }

        return fallbackParts.join('\n\n');
    }

    /**
     * Generate response using OpenRouter with quality validation and fallback
     */
    private async generateOpenRouterResponse(
        request: EnhancedAIRequest,
        processedQuery: ProcessedQuery,
        startTime: number
    ): Promise<EnhancedAIResponse> {
        // Build conversation context
        const conversationContext: ConversationContext = {
            userId: request.userId,
            conversationId: request.conversationId,
            messageCount: 0, // This would be populated from actual conversation
            averageResponseTime: 1500,
            userPreferences: {
                preferredProvider: request.modelPreferences?.prioritizeSpeed ? 'Google' : 'OpenAI',
                maxCostPerRequest: request.modelPreferences?.maxCost,
                prioritizeSpeed: request.modelPreferences?.prioritizeSpeed,
                prioritizeQuality: request.modelPreferences?.prioritizeQuality,
            },
        };

        // Select optimal model
        const modelSelection = await this.openRouterService.selectOptimalModel(
            request.query,
            conversationContext,
            {
                maxCost: request.modelPreferences?.maxCost,
                prioritizeSpeed: request.modelPreferences?.prioritizeSpeed,
                prioritizeQuality: request.modelPreferences?.prioritizeQuality,
                requiredCapabilities: request.modelPreferences?.requiredCapabilities,
            }
        );

        // Build enhanced context
        const enhancedContext = await this.buildEnhancedContext(request, processedQuery);

        // Create OpenRouter request
        const openRouterRequest: OpenRouterRequest = {
            messages: [
                {
                    role: 'system',
                    content: this.buildSystemPrompt(processedQuery, enhancedContext),
                },
                {
                    role: 'user',
                    content: request.query,
                },
            ],
            maxTokens: Math.min(1000, modelSelection.maxTokens * 0.3), // Limit response length
            temperature: 0.7,
            topP: 0.9,
        };

        // Make request to OpenRouter with retry logic
        let openRouterResponse;
        let responseContent = '';
        let confidenceScore = 0;
        let retryCount = 0;
        const maxRetries = this.config.maxRetries;

        while (retryCount < maxRetries) {
            try {
                openRouterResponse = await this.openRouterService.routeRequest(
                    openRouterRequest,
                    modelSelection,
                    request.userId
                );

                // Extract response content
                responseContent = openRouterResponse.choices[0]?.message?.content || '';

                // Calculate confidence score
                confidenceScore = this.estimateConfidenceScore(responseContent, processedQuery);

                // Validate response quality
                const validation = this.validateResponseQuality(responseContent, confidenceScore, processedQuery);

                if (validation.isValid) {
                    // Response is good, break out of retry loop
                    break;
                } else if (validation.shouldUseFallback) {
                    // Quality issues that warrant fallback
                    this.logger.warn(`Response quality issues: ${validation.issues.join(', ')}`);
                    responseContent = await this.generateFallbackResponse(request, processedQuery, validation.issues.join(', '));
                    confidenceScore = 0.6; // Fallback responses have moderate confidence
                    break;
                } else if (validation.shouldRetry && retryCount < maxRetries - 1) {
                    // Retry with adjusted parameters
                    this.logger.debug(`Retrying due to: ${validation.issues.join(', ')}`);
                    retryCount++;

                    // Adjust temperature for retry (make it more focused)
                    openRouterRequest.temperature = Math.max(0.5, (openRouterRequest.temperature || 0.7) - 0.1);
                    continue;
                } else {
                    // Max retries reached or no retry needed
                    this.logger.warn(`Using response despite issues: ${validation.issues.join(', ')}`);
                    break;
                }
            } catch (error) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    throw error;
                }
                this.logger.warn(`OpenRouter request failed, retry ${retryCount}/${maxRetries}: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
            }
        }

        // Get budget status
        const budgetStatus = await this.openRouterService.getBudgetStatus(request.userId);

        // Generate follow-up suggestions
        const followUps = await this.generateFollowUpSuggestions(processedQuery, responseContent, request.userId);

        // Build metadata
        const metadata: MessageMetadata = {
            processingTime: Date.now() - startTime,
            aiModel: modelSelection.modelId,
            language: processedQuery.detectedLanguage,
            category: processedQuery.category,
            keywords: processedQuery.keywords,
            relatedTopics: this.extractRelatedTopics(processedQuery, responseContent),
            requiresHumanReview: this.shouldRequireHumanReview(confidenceScore, processedQuery),
            contextUsed: {
                projectInfo: !!enhancedContext.projectContext,
                conversationHistory: !!enhancedContext.conversationSummary,
                knowledgeBase: !!enhancedContext.knowledgeBaseContext,
            },
        };

        return {
            response: await this.enhanceResponseWithContext(responseContent, enhancedContext, request.userId),
            confidenceScore,
            sources: this.determineSources(enhancedContext, processedQuery, modelSelection.provider),
            metadata,
            processedQuery,
            contextUsed: {
                projectInfo: metadata.contextUsed?.projectInfo || false,
                conversationHistory: metadata.contextUsed?.conversationHistory || false,
                knowledgeBase: metadata.contextUsed?.knowledgeBase || false,
            },
            suggestedFollowUps: followUps,
            requiresHumanReview: metadata.requiresHumanReview || false,
            modelUsed: modelSelection.modelId,
            provider: modelSelection.provider,
            actualCost: openRouterResponse.cost,
            budgetImpact: {
                remainingBudget: budgetStatus.remainingBudget,
                budgetUtilization: budgetStatus.budgetUtilization,
            },
        };
    }

    /**
     * Generate response using Hugging Face (fallback) with quality validation
     */
    private async generateHuggingFaceResponse(
        request: EnhancedAIRequest,
        processedQuery: ProcessedQuery,
        startTime: number
    ): Promise<EnhancedAIResponse> {
        // Build enhanced context
        const enhancedContext = await this.buildEnhancedContext(request, processedQuery);

        // Create Hugging Face Q&A request
        const qaRequest: QARequest = {
            question: request.query,
            context: this.combineContextForHuggingFace(enhancedContext, request.query),
        };

        // Make request to Hugging Face
        let qaResponse = await this.huggingFaceService.questionAnswering(qaRequest, request.userId);

        // Validate response quality
        const validation = this.validateResponseQuality(qaResponse.answer, qaResponse.score, processedQuery);

        if (!validation.isValid && validation.shouldUseFallback) {
            // Use intelligent fallback if quality is too low
            this.logger.warn(`Hugging Face response quality issues: ${validation.issues.join(', ')}`);
            const fallbackResponse = await this.generateFallbackResponse(request, processedQuery, validation.issues.join(', '));
            qaResponse = {
                answer: fallbackResponse,
                score: 0.6, // Moderate confidence for fallback
                start: 0,
                end: fallbackResponse.length
            };
        }

        // Generate follow-up suggestions
        const followUps = await this.generateFollowUpSuggestions(processedQuery, qaResponse.answer, request.userId);

        // Build metadata
        const metadata: MessageMetadata = {
            processingTime: Date.now() - startTime,
            aiModel: this.huggingFaceService.getQAModelInfo().name,
            language: processedQuery.detectedLanguage,
            category: processedQuery.category,
            keywords: processedQuery.keywords,
            relatedTopics: this.extractRelatedTopics(processedQuery, qaResponse.answer),
            requiresHumanReview: this.shouldRequireHumanReview(qaResponse.score, processedQuery),
            contextUsed: {
                projectInfo: !!enhancedContext.projectContext,
                conversationHistory: !!enhancedContext.conversationSummary,
                knowledgeBase: !!enhancedContext.knowledgeBaseContext,
            },
        };

        return {
            response: await this.enhanceResponseWithContext(qaResponse.answer, enhancedContext, request.userId),
            confidenceScore: qaResponse.score,
            sources: this.determineSources(enhancedContext, processedQuery, 'Hugging Face'),
            metadata,
            processedQuery,
            contextUsed: {
                projectInfo: metadata.contextUsed?.projectInfo || false,
                conversationHistory: metadata.contextUsed?.conversationHistory || false,
                knowledgeBase: metadata.contextUsed?.knowledgeBase || false,
            },
            suggestedFollowUps: followUps,
            requiresHumanReview: metadata.requiresHumanReview || false,
            modelUsed: this.huggingFaceService.getQAModelInfo().name,
            provider: 'Hugging Face',
        };
    }

    /**
     * Build enhanced context for AI request
     */
    private async buildEnhancedContext(
        request: EnhancedAIRequest,
        processedQuery: ProcessedQuery
    ): Promise<{
        projectContext?: string;
        conversationSummary?: string;
        knowledgeBaseContext?: string;
        milestoneContext?: string;
    }> {
        const context: any = {};

        // Get conversation context
        const conversationContext = await this.contextService.buildConversationContext(
            request.conversationId
        );

        // Add project context if requested
        if (request.includeProjectContext) {
            try {
                const enhancedProjectContext = await this.projectContextService.getEnhancedProjectContext(
                    request.userId,
                    request.projectId
                );
                if (enhancedProjectContext) {
                    context.projectContext = this.formatProjectContext(enhancedProjectContext);
                }
            } catch (error) {
                this.logger.warn(`Failed to get project context: ${error.message}`);
            }
        }

        // Add conversation history if requested
        if (request.includeConversationHistory && conversationContext?.recentTopics) {
            context.conversationSummary = this.formatConversationSummary(conversationContext);
        }

        // Add knowledge base context
        context.knowledgeBaseContext = this.getCategorySpecificGuidance(processedQuery.category);

        // Add milestone context
        try {
            const milestoneGuidance = await this.projectContextService.generateMilestoneAwareGuidance(
                request.userId
            );
            context.milestoneContext = this.formatMilestoneGuidance(milestoneGuidance);
        } catch (error) {
            this.logger.warn(`Failed to get milestone context: ${error.message}`);
        }

        return context;
    }

    /**
     * Build system prompt for OpenRouter (conversational AI approach)
     */
    private buildSystemPrompt(processedQuery: ProcessedQuery, context: any): string {
        let systemPrompt = `You are an intelligent, conversational AI assistant specialized in mentoring final year project students. 
You engage in natural dialogue, provide thoughtful guidance, and adapt your responses to the student's needs and context.

Your role is to:
- Act as a knowledgeable mentor who understands academic project challenges
- Provide clear, structured, and actionable advice
- Consider the student's current situation and progress
- Encourage critical thinking and independent problem-solving
- Offer specific examples and practical suggestions when helpful
- Maintain an encouraging and supportive tone

Current conversation context:
- Topic Category: ${processedQuery.category.replace(/_/g, ' ')}
- Student's Intent: ${processedQuery.intent.replace(/_/g, ' ')}
- Academic Level: ${processedQuery.metadata.academicLevel}
- Query Complexity: ${processedQuery.metadata.complexity}`;

        if (context.projectContext) {
            systemPrompt += `\n\nStudent's Project Context:\n${context.projectContext}`;
        }

        if (context.milestoneContext) {
            systemPrompt += `\n\nCurrent Milestone Status:\n${context.milestoneContext}`;
        }

        if (context.conversationSummary) {
            systemPrompt += `\n\nPrevious Discussion Topics:\n${context.conversationSummary}`;
        }

        if (context.knowledgeBaseContext) {
            systemPrompt += `\n\nRelevant Academic Guidelines:\n${context.knowledgeBaseContext}`;
        }

        systemPrompt += `\n\nResponse Guidelines:
1. Directly address the student's question with relevant, specific information
2. Reference their project context and current phase when applicable
3. Provide structured, actionable guidance with clear next steps
4. Use examples or analogies to clarify complex concepts
5. Maintain academic rigor while being conversational and approachable
6. If the question is complex, break down your response into clear sections
7. Suggest follow-up actions or resources when appropriate
8. Be honest about limitations - if you're uncertain, acknowledge it and suggest alternatives

Keep your response focused, practical, and helpful. Aim for 2-4 well-structured paragraphs unless more detail is clearly needed.`;

        return systemPrompt;
    }

    /**
     * Combine context for Hugging Face Q&A format
     */
    private combineContextForHuggingFace(context: any, query: string): string {
        const contextParts: string[] = [`Question: ${query}`];

        if (context.projectContext) {
            contextParts.push(`Project Context: ${context.projectContext}`);
        }

        if (context.milestoneContext) {
            contextParts.push(`Milestone Status: ${context.milestoneContext}`);
        }

        if (context.conversationSummary) {
            contextParts.push(`Previous Discussion: ${context.conversationSummary}`);
        }

        if (context.knowledgeBaseContext) {
            contextParts.push(`Guidelines: ${context.knowledgeBaseContext}`);
        }

        return contextParts.join('\n\n');
    }

    /**
     * Enhance response with contextual information
     */
    private async enhanceResponseWithContext(
        response: string,
        context: any,
        userId: string
    ): Promise<string> {
        let enhancedResponse = response;

        // Add contextual enhancements if project context is available
        if (context.projectContext) {
            try {
                const enhancedProjectContext = await this.projectContextService.getEnhancedProjectContext(userId);
                const milestoneGuidance = await this.projectContextService.generateMilestoneAwareGuidance(userId);

                if (enhancedProjectContext && milestoneGuidance) {
                    const enhancements = this.projectContextService.generateContextualResponseEnhancements(
                        enhancedProjectContext,
                        milestoneGuidance,
                        response
                    );

                    // Add priority alerts at the beginning if any
                    if (enhancements.priorityAlerts.length > 0) {
                        enhancedResponse = `${enhancements.priorityAlerts.join(' ')}\n\n${enhancedResponse}`;
                    }

                    // Add contextual suggestions at the end
                    if (enhancements.contextualSuggestions.length > 0) {
                        enhancedResponse += `\n\n💡 ${enhancements.contextualSuggestions.join(' ')}`;
                    }

                    // Add phase-specific tips if relevant
                    if (enhancements.phaseSpecificTips.length > 0) {
                        enhancedResponse += `\n\n📚 Tips for your current phase: ${enhancements.phaseSpecificTips.join(' ')}`;
                    }

                    // Add timeline concerns if any
                    if (enhancements.timelineConcerns.length > 0) {
                        enhancedResponse += `\n\n⏰ Timeline note: ${enhancements.timelineConcerns.join(' ')}`;
                    }
                }
            } catch (error) {
                this.logger.warn(`Failed to add contextual enhancements: ${error.message}`);
            }
        }

        return enhancedResponse;
    }

    /**
     * Estimate confidence score for OpenRouter responses with improved heuristics
     */
    private estimateConfidenceScore(response: string, processedQuery: ProcessedQuery): number {
        let confidence = 0.85; // Base confidence for conversational AI models (higher than Q&A)

        // Response quality indicators
        const qualityIndicators = {
            veryShort: response.length < 50,
            short: response.length < 100,
            adequate: response.length >= 100 && response.length <= 500,
            detailed: response.length > 500,
            hasUncertainty: /I don't know|I'm not sure|I cannot|unclear|uncertain/i.test(response),
            hasHedging: /might|may|could|possibly|perhaps/i.test(response),
            hasNuance: /however|additionally|furthermore|moreover|on the other hand/i.test(response),
            hasStructure: /first|second|third|finally|in conclusion|\d\./i.test(response),
            hasExamples: /for example|for instance|such as|e\.g\./i.test(response),
            hasReferences: /according to|research shows|studies indicate/i.test(response),
            isGeneric: /general|typically|usually|often|common/gi.test(response) && response.length < 150,
            hasSpecifics: /specifically|particularly|precisely|exactly/i.test(response),
        };

        // Length-based adjustments
        if (qualityIndicators.veryShort) confidence -= 0.25;
        else if (qualityIndicators.short) confidence -= 0.15;
        else if (qualityIndicators.adequate) confidence += 0.05;
        else if (qualityIndicators.detailed) confidence += 0.10;

        // Uncertainty indicators (strong negative impact)
        if (qualityIndicators.hasUncertainty) confidence -= 0.35;
        else if (qualityIndicators.hasHedging) confidence -= 0.10;

        // Quality indicators (positive impact)
        if (qualityIndicators.hasNuance) confidence += 0.08;
        if (qualityIndicators.hasStructure) confidence += 0.07;
        if (qualityIndicators.hasExamples) confidence += 0.10;
        if (qualityIndicators.hasReferences) confidence += 0.12;
        if (qualityIndicators.hasSpecifics) confidence += 0.08;

        // Generic response penalty
        if (qualityIndicators.isGeneric) confidence -= 0.20;

        // Query complexity adjustments
        if (processedQuery.metadata.complexity === 'complex') {
            // Complex queries need more detailed responses
            if (qualityIndicators.detailed && qualityIndicators.hasStructure) {
                confidence += 0.05;
            } else {
                confidence -= 0.12;
            }
        }

        // Academic level adjustments
        if (processedQuery.metadata.academicLevel === 'research') {
            if (qualityIndicators.hasReferences || qualityIndicators.hasSpecifics) {
                confidence += 0.10;
            } else {
                confidence -= 0.08;
            }
        }

        // Intent-based adjustments
        if (processedQuery.intent === 'definition' && qualityIndicators.short && !qualityIndicators.hasExamples) {
            confidence -= 0.10; // Definitions should include examples
        }

        if (processedQuery.intent === 'request_guidance' && !qualityIndicators.hasStructure) {
            confidence -= 0.12; // Guidance should be structured
        }

        // Ensure confidence is within valid range
        return Math.max(0.1, Math.min(1.0, confidence));
    }

    /**
     * Generate follow-up suggestions
     */
    private async generateFollowUpSuggestions(
        processedQuery: ProcessedQuery,
        response: string,
        userId?: string
    ): Promise<string[]> {
        const suggestions: string[] = [];

        // Add suggestions based on intent
        switch (processedQuery.intent) {
            case 'definition':
                suggestions.push('Can you provide an example?');
                suggestions.push('How does this apply to my project?');
                break;
            case 'question':
                suggestions.push('What are the next steps?');
                suggestions.push('Are there any common pitfalls to avoid?');
                break;
            case 'request_guidance':
                suggestions.push('Can you provide more specific guidance?');
                suggestions.push('What resources would you recommend?');
                break;
        }

        // Add milestone-specific suggestions if user context is available
        if (userId) {
            try {
                const milestoneGuidance = await this.projectContextService.generateMilestoneAwareGuidance(userId);

                if (milestoneGuidance.urgentMilestones.length > 0) {
                    suggestions.push('How can I prioritize my urgent milestones?');
                }

                if (milestoneGuidance.overdueMilestones.length > 0) {
                    suggestions.push('What should I do about overdue milestones?');
                }
            } catch (error) {
                this.logger.warn(`Failed to generate milestone-specific suggestions: ${error.message}`);
            }
        }

        return suggestions.slice(0, 3);
    }

    /**
     * Determine sources for the response
     */
    private determineSources(context: any, processedQuery: ProcessedQuery, provider: string): string[] {
        const sources: string[] = [provider];

        if (context.projectContext) sources.push('Project Context');
        if (context.conversationSummary) sources.push('Conversation History');
        if (context.knowledgeBaseContext) sources.push('FYP Guidelines');
        if (context.milestoneContext) sources.push('Milestone Status');

        return sources;
    }

    /**
     * Extract related topics from query and response
     */
    private extractRelatedTopics(processedQuery: ProcessedQuery, response: string): string[] {
        const topics: string[] = [];

        // Add topics from processed query
        processedQuery.entities.forEach((entity) => {
            if (entity.type === 'research_area' || entity.type === 'academic_term') {
                topics.push(entity.value);
            }
        });

        // Add category-related topics
        const categoryTopics = this.getCategoryRelatedTopics(processedQuery.category);
        topics.push(...categoryTopics);

        return [...new Set(topics)].slice(0, 5);
    }

    /**
     * Validate response quality before returning to user
     */
    private validateResponseQuality(
        response: string,
        confidenceScore: number,
        processedQuery: ProcessedQuery
    ): {
        isValid: boolean;
        issues: string[];
        shouldRetry: boolean;
        shouldUseFallback: boolean;
    } {
        const issues: string[] = [];
        let shouldRetry = false;
        let shouldUseFallback = false;

        // Check minimum length
        if (response.length < 20) {
            issues.push('Response too short');
            shouldRetry = true;
        }

        // Check for empty or meaningless responses
        if (!response.trim() || response.trim() === '.' || response.trim() === 'N/A') {
            issues.push('Empty or meaningless response');
            shouldRetry = true;
        }

        // Check for error messages in response
        const errorPatterns = [
            /error|exception|failed|unable to process/i,
            /I cannot answer|I don't have access|I'm unable to/i,
            /invalid|malformed|corrupted/i
        ];
        if (errorPatterns.some(pattern => pattern.test(response))) {
            issues.push('Response contains error indicators');
            shouldUseFallback = true;
        }

        // Check confidence threshold
        if (confidenceScore < this.config.confidenceThreshold) {
            issues.push(`Low confidence score: ${confidenceScore.toFixed(2)}`);
            shouldUseFallback = true;
        }

        // Check for inappropriate content
        const inappropriatePatterns = [
            /\b(hate|violence|explicit)\b/i,
            /\b(offensive|discriminatory)\b/i
        ];
        if (inappropriatePatterns.some(pattern => pattern.test(response))) {
            issues.push('Potentially inappropriate content detected');
            shouldUseFallback = true;
        }

        // Check relevance to query
        const queryKeywords = processedQuery.keywords.map(k => k.toLowerCase());
        const responseWords = response.toLowerCase().split(/\s+/);
        const keywordMatches = queryKeywords.filter(keyword =>
            responseWords.some(word => word.includes(keyword) || keyword.includes(word))
        );

        if (queryKeywords.length > 0 && keywordMatches.length === 0) {
            issues.push('Response may not be relevant to query');
            shouldRetry = true;
        }

        // Check for completeness (no abrupt endings)
        if (response.length > 50 && !response.match(/[.!?]$/)) {
            issues.push('Response appears incomplete');
            shouldRetry = true;
        }

        // Check for repetition
        const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const uniqueSentences = new Set(sentences.map(s => s.trim().toLowerCase()));
        if (sentences.length > 2 && uniqueSentences.size < sentences.length * 0.7) {
            issues.push('Response contains excessive repetition');
            shouldRetry = true;
        }

        const isValid = issues.length === 0;

        return {
            isValid,
            issues,
            shouldRetry: shouldRetry && !shouldUseFallback,
            shouldUseFallback
        };
    }

    /**
     * Determine if response requires human review
     */
    private shouldRequireHumanReview(confidenceScore: number, processedQuery: ProcessedQuery): boolean {
        if (confidenceScore < this.config.confidenceThreshold) return true;
        if (processedQuery.metadata.urgency === 'urgent') return true;
        if (processedQuery.metadata.academicLevel === 'research' && processedQuery.metadata.complexity === 'complex') return true;
        return false;
    }

    // Helper methods (reused from original service)
    private formatProjectContext(projectContext: any): string {
        // Implementation from original service
        return `Project: ${projectContext.title}, Phase: ${projectContext.currentPhase}`;
    }

    private formatConversationSummary(context: any): string {
        // Implementation from original service
        return `Recent topics: ${context.recentTopics?.join(', ') || 'None'}`;
    }

    private formatMilestoneGuidance(guidance: any): string {
        // Implementation from original service
        const parts: string[] = [];
        if (guidance.overdueMilestones?.length > 0) {
            parts.push(`${guidance.overdueMilestones.length} overdue milestone(s)`);
        }
        if (guidance.urgentMilestones?.length > 0) {
            parts.push(`${guidance.urgentMilestones.length} urgent milestone(s)`);
        }
        return parts.join(', ') || 'No urgent milestones';
    }

    private getCategorySpecificGuidance(category: string): string {
        const guidance = {
            literature_review: 'A literature review should systematically analyze existing research, identify gaps, and establish theoretical foundations.',
            methodology: 'Choose research methods that align with your research questions and objectives.',
            proposal_writing: 'A research proposal should clearly state the problem, objectives, methodology, and expected outcomes.',
            data_analysis: 'Ensure your analysis methods match your data type and research questions.',
            implementation: 'Follow software engineering best practices: version control, testing, documentation.',
            documentation: 'Academic writing should be clear, structured, and properly referenced.',
            presentation: 'Prepare clear slides, practice your delivery, and anticipate questions.',
            general: 'For Final Year Projects, maintain regular communication with your supervisor.',
        };

        return guidance[category] || guidance.general;
    }

    private getCategoryRelatedTopics(category: string): string[] {
        const topics = {
            literature_review: ['systematic review', 'citation analysis', 'theoretical framework'],
            methodology: ['research design', 'data collection', 'validity'],
            proposal_writing: ['research objectives', 'timeline', 'budget'],
            data_analysis: ['statistical methods', 'visualization', 'interpretation'],
            implementation: ['software architecture', 'testing', 'deployment'],
            documentation: ['academic writing', 'referencing', 'structure'],
            presentation: ['visual design', 'public speaking', 'Q&A preparation'],
        };

        return topics[category] || [];
    }
}