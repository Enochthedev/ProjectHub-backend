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
     * Generate response using OpenRouter
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

        // Make request to OpenRouter
        const openRouterResponse = await this.openRouterService.routeRequest(
            openRouterRequest,
            modelSelection,
            request.userId
        );

        // Get budget status
        const budgetStatus = await this.openRouterService.getBudgetStatus(request.userId);

        // Extract response content
        const responseContent = openRouterResponse.choices[0]?.message?.content || '';

        // Calculate confidence score (OpenRouter doesn't provide this, so we estimate)
        const confidenceScore = this.estimateConfidenceScore(responseContent, processedQuery);

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
            response: this.enhanceResponseWithContext(responseContent, enhancedContext, request.userId),
            confidenceScore,
            sources: this.determineSources(enhancedContext, processedQuery, modelSelection.provider),
            metadata,
            processedQuery,
            contextUsed: metadata.contextUsed,
            suggestedFollowUps: followUps,
            requiresHumanReview: metadata.requiresHumanReview,
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
     * Generate response using Hugging Face (fallback)
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
        const qaResponse = await this.huggingFaceService.questionAnswering(qaRequest, request.userId);

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
            response: this.enhanceResponseWithContext(qaResponse.answer, enhancedContext, request.userId),
            confidenceScore: qaResponse.score,
            sources: this.determineSources(enhancedContext, processedQuery, 'Hugging Face'),
            metadata,
            processedQuery,
            contextUsed: metadata.contextUsed,
            suggestedFollowUps: followUps,
            requiresHumanReview: metadata.requiresHumanReview,
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
     * Build system prompt for OpenRouter
     */
    private buildSystemPrompt(processedQuery: ProcessedQuery, context: any): string {
        let systemPrompt = `You are an intelligent AI assistant specialized in helping final year project students. 
You provide clear, accurate, and helpful guidance on academic projects, research, and development.

Context about the user's query:
- Category: ${processedQuery.category}
- Intent: ${processedQuery.intent}
- Academic Level: ${processedQuery.metadata.academicLevel}
- Complexity: ${processedQuery.metadata.complexity}`;

        if (context.projectContext) {
            systemPrompt += `\n\nProject Context: ${context.projectContext}`;
        }

        if (context.milestoneContext) {
            systemPrompt += `\n\nMilestone Status: ${context.milestoneContext}`;
        }

        if (context.conversationSummary) {
            systemPrompt += `\n\nPrevious Discussion: ${context.conversationSummary}`;
        }

        if (context.knowledgeBaseContext) {
            systemPrompt += `\n\nRelevant Guidelines: ${context.knowledgeBaseContext}`;
        }

        systemPrompt += `\n\nPlease provide a helpful, accurate response that:
1. Directly addresses the user's question
2. Considers their project context and current phase
3. Provides actionable guidance
4. Uses clear, academic language appropriate for final year students
5. Suggests next steps when relevant`;

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
     * Estimate confidence score for OpenRouter responses
     */
    private estimateConfidenceScore(response: string, processedQuery: ProcessedQuery): number {
        let confidence = 0.8; // Base confidence for OpenRouter models

        // Adjust based on response length and quality indicators
        if (response.length < 50) confidence -= 0.2; // Very short responses
        if (response.includes('I don\'t know') || response.includes('I\'m not sure')) confidence -= 0.3;
        if (response.includes('However') || response.includes('Additionally')) confidence += 0.1; // Nuanced responses

        // Adjust based on query complexity
        if (processedQuery.metadata.complexity === 'complex') confidence -= 0.1;
        if (processedQuery.metadata.academicLevel === 'research') confidence += 0.1;

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