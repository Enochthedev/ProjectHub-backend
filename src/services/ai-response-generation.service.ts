import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HuggingFaceService,
  QARequest,
  QAResponse,
} from './hugging-face.service';
import { ContextService } from './context.service';
import {
  QueryProcessingService,
  ProcessedQuery,
} from './query-processing.service';
import {
  ProjectContextIntegrationService,
  EnhancedProjectContext,
  MilestoneAwareGuidance,
} from './project-context-integration.service';
import {
  MilestoneGuidanceService,
  MilestoneDeadlineAwareness,
  PriorityGuidance,
  ProactiveSuggestion,
} from './milestone-guidance.service';
import {
  ConversationContext,
  MessageMetadata,
} from '../entities/interfaces/conversation.interface';

export interface AIResponseRequest {
  query: string;
  conversationId: string;
  userId: string;
  projectId?: string;
  language?: string;
  includeProjectContext?: boolean;
  includeConversationHistory?: boolean;
}

export interface AIResponseResult {
  response: string;
  confidenceScore: number;
  sources: string[];
  metadata: MessageMetadata;
  processedQuery: ProcessedQuery;
  contextUsed: {
    projectInfo: boolean;
    conversationHistory: boolean;
    knowledgeBase: boolean;
  };
  suggestedFollowUps?: string[];
  requiresHumanReview: boolean;
}

export interface ContextualizedRequest {
  originalQuery: string;
  enhancedContext: string;
  projectContext?: string;
  conversationSummary?: string;
  relevantHistory?: string[];
  knowledgeBaseContext?: string;
}

@Injectable()
export class AIResponseGenerationService {
  private readonly logger = new Logger(AIResponseGenerationService.name);

  private readonly config: {
    maxContextLength: number;
    maxResponseLength: number;
    confidenceThreshold: number;
    includeProjectContextByDefault: boolean;
    includeConversationHistoryByDefault: boolean;
    maxHistoryMessages: number;
    contextWeights: {
      query: number;
      project: number;
      conversation: number;
      knowledgeBase: number;
    };
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly huggingFaceService: HuggingFaceService,
    private readonly contextService: ContextService,
    private readonly queryProcessingService: QueryProcessingService,
    private readonly projectContextService: ProjectContextIntegrationService,
    private readonly milestoneGuidanceService: MilestoneGuidanceService,
  ) {
    this.config = {
      maxContextLength:
        this.configService.get<number>('huggingFace.qaMaxContextLength') || 512,
      maxResponseLength:
        this.configService.get<number>('huggingFace.qaMaxAnswerLength') || 200,
      confidenceThreshold:
        this.configService.get<number>('huggingFace.qaConfidenceThreshold') ||
        0.3,
      includeProjectContextByDefault:
        this.configService.get<boolean>('ai.includeProjectContext') ?? true,
      includeConversationHistoryByDefault:
        this.configService.get<boolean>('ai.includeConversationHistory') ??
        true,
      maxHistoryMessages:
        this.configService.get<number>('ai.maxHistoryMessages') || 5,
      contextWeights: {
        query: this.configService.get<number>('ai.contextWeights.query') || 0.4,
        project:
          this.configService.get<number>('ai.contextWeights.project') || 0.25,
        conversation:
          this.configService.get<number>('ai.contextWeights.conversation') ||
          0.2,
        knowledgeBase:
          this.configService.get<number>('ai.contextWeights.knowledgeBase') ||
          0.15,
      },
    };

    this.logger.log('AI Response Generation service initialized');
  }

  /**
   * Generate AI response with comprehensive context integration
   */
  async generateResponse(
    request: AIResponseRequest,
  ): Promise<AIResponseResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Generating AI response for query: "${request.query}"`);

      // Step 1: Process the query
      const processedQuery = await this.queryProcessingService.processQuery(
        request.query,
        {
          userLanguage: request.language,
          conversationHistory: [], // Will be populated from context
        },
      );

      if (!processedQuery.isValid) {
        throw new Error(
          `Invalid query: ${processedQuery.validationIssues.join(', ')}`,
        );
      }

      // Step 2: Build contextual request
      const contextualRequest = await this.buildContextualRequest(
        request,
        processedQuery,
      );

      // Step 3: Generate AI response
      const qaResponse = await this.generateQAResponse(
        contextualRequest,
        request.userId,
      );

      // Step 4: Post-process and format response
      const formattedResponse = await this.postProcessResponse(
        qaResponse,
        processedQuery,
        contextualRequest,
        startTime,
        request.userId,
      );

      // Step 5: Generate follow-up suggestions
      const followUps = await this.generateFollowUpSuggestions(
        processedQuery,
        qaResponse,
        request.userId,
      );

      const result: AIResponseResult = {
        response: formattedResponse.response,
        confidenceScore: qaResponse.score,
        sources: formattedResponse.sources,
        metadata: formattedResponse.metadata,
        processedQuery,
        contextUsed: {
          projectInfo: !!contextualRequest.projectContext,
          conversationHistory: !!contextualRequest.conversationSummary,
          knowledgeBase: !!contextualRequest.knowledgeBaseContext,
        },
        suggestedFollowUps: followUps,
        requiresHumanReview: this.shouldRequireHumanReview(
          qaResponse,
          processedQuery,
        ),
      };

      this.logger.debug(
        `AI response generated successfully with confidence: ${qaResponse.score}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error generating AI response: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Build contextualized request with project and conversation context
   */
  private async buildContextualRequest(
    request: AIResponseRequest,
    processedQuery: ProcessedQuery,
  ): Promise<ContextualizedRequest> {
    const contextParts: string[] = [];
    let projectContext: string | undefined;
    let conversationSummary: string | undefined;
    let knowledgeBaseContext: string | undefined;

    // Get conversation context
    const conversationContext =
      await this.contextService.buildConversationContext(
        request.conversationId,
      );

    // Add enhanced project context if requested and available
    if (
      request.includeProjectContext ??
      this.config.includeProjectContextByDefault
    ) {
      try {
        const enhancedProjectContext =
          await this.projectContextService.getEnhancedProjectContext(
            request.userId,
            request.projectId,
          );
        if (enhancedProjectContext) {
          projectContext = this.formatEnhancedProjectContext(
            enhancedProjectContext,
          );
          contextParts.push(`Project Context: ${projectContext}`);

          // Add milestone-aware guidance
          const milestoneGuidance =
            await this.projectContextService.generateMilestoneAwareGuidance(
              request.userId,
            );
          const milestoneContext =
            this.formatMilestoneGuidance(milestoneGuidance);
          if (milestoneContext) {
            contextParts.push(`Milestone Status: ${milestoneContext}`);
          }

          // Add deadline awareness for urgent milestones
          const deadlineAwareness =
            await this.milestoneGuidanceService.generateMilestoneDeadlineAwareness(
              request.userId,
            );
          const urgentMilestones = deadlineAwareness.filter(
            (m) => m.urgencyLevel === 'critical' || m.urgencyLevel === 'urgent',
          );
          if (urgentMilestones.length > 0) {
            const urgentContext = this.formatUrgentMilestones(urgentMilestones);
            contextParts.push(`Urgent Milestones: ${urgentContext}`);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get enhanced project context: ${error.message}`,
        );
      }
    }

    // Add conversation history if requested
    if (
      request.includeConversationHistory ??
      this.config.includeConversationHistoryByDefault
    ) {
      if (
        conversationContext?.recentTopics &&
        conversationContext.recentTopics.length > 0
      ) {
        conversationSummary =
          this.formatConversationSummary(conversationContext);
        contextParts.push(`Previous Discussion: ${conversationSummary}`);
      }
    }

    // Add knowledge base context based on query category
    knowledgeBaseContext =
      await this.getRelevantKnowledgeContext(processedQuery);
    if (knowledgeBaseContext) {
      contextParts.push(`Relevant Guidelines: ${knowledgeBaseContext}`);
    }

    // Combine all context with appropriate weighting
    const enhancedContext = this.combineContextParts(
      contextParts,
      processedQuery.originalQuery,
    );

    return {
      originalQuery: request.query,
      enhancedContext,
      projectContext,
      conversationSummary,
      knowledgeBaseContext,
    };
  }

  /**
   * Generate Q&A response using Hugging Face service
   */
  private async generateQAResponse(
    contextualRequest: ContextualizedRequest,
    userId: string,
  ): Promise<QAResponse> {
    const qaRequest: QARequest = {
      question: contextualRequest.originalQuery,
      context: contextualRequest.enhancedContext,
    };

    return await this.huggingFaceService.questionAnswering(qaRequest, userId);
  }

  /**
   * Post-process and format the AI response
   */
  private async postProcessResponse(
    qaResponse: QAResponse,
    processedQuery: ProcessedQuery,
    contextualRequest: ContextualizedRequest,
    startTime: number,
    userId?: string,
  ): Promise<{
    response: string;
    sources: string[];
    metadata: MessageMetadata;
  }> {
    // Clean and format the response
    let formattedResponse = this.cleanResponse(qaResponse.answer);

    // Add academic context if appropriate
    if (processedQuery.metadata.academicLevel !== 'undergraduate') {
      formattedResponse = this.enhanceAcademicResponse(
        formattedResponse,
        processedQuery,
      );
    }

    // Add contextual response enhancements if project context is available
    if (contextualRequest.projectContext && userId) {
      try {
        const enhancedProjectContext =
          await this.projectContextService.getEnhancedProjectContext(userId);
        const milestoneGuidance =
          await this.projectContextService.generateMilestoneAwareGuidance(
            userId,
          );

        if (enhancedProjectContext && milestoneGuidance) {
          const enhancements =
            this.projectContextService.generateContextualResponseEnhancements(
              enhancedProjectContext,
              milestoneGuidance,
              processedQuery.originalQuery,
            );

          // Add priority alerts at the beginning if any
          if (enhancements.priorityAlerts.length > 0) {
            formattedResponse = `${enhancements.priorityAlerts.join(' ')}\n\n${formattedResponse}`;
          }

          // Add contextual suggestions at the end
          if (enhancements.contextualSuggestions.length > 0) {
            formattedResponse += `\n\n💡 ${enhancements.contextualSuggestions.join(' ')}`;
          }

          // Add phase-specific tips if relevant
          if (enhancements.phaseSpecificTips.length > 0) {
            formattedResponse += `\n\n📚 Tips for your current phase: ${enhancements.phaseSpecificTips.join(' ')}`;
          }

          // Add timeline concerns if any
          if (enhancements.timelineConcerns.length > 0) {
            formattedResponse += `\n\n⏰ Timeline note: ${enhancements.timelineConcerns.join(' ')}`;
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to add contextual enhancements: ${error.message}`,
        );
      }
    }

    // Determine sources
    const sources = this.determineSources(contextualRequest, processedQuery);

    // Build metadata
    const metadata: MessageMetadata = {
      processingTime: Date.now() - startTime,
      aiModel: this.huggingFaceService.getQAModelInfo().name,
      language: processedQuery.detectedLanguage,
      category: processedQuery.category,
      keywords: processedQuery.keywords,
      relatedTopics: this.extractRelatedTopics(processedQuery, qaResponse),
      requiresHumanReview: this.shouldRequireHumanReview(
        qaResponse,
        processedQuery,
      ),
      contextUsed: {
        projectInfo: !!contextualRequest.projectContext,
        conversationHistory: !!contextualRequest.conversationSummary,
        knowledgeBase: !!contextualRequest.knowledgeBaseContext,
      },
    };

    return {
      response: formattedResponse,
      sources,
      metadata,
    };
  }

  /**
   * Format enhanced project context for inclusion in AI request
   */
  private formatEnhancedProjectContext(
    projectContext: EnhancedProjectContext,
  ): string {
    const parts: string[] = [];

    parts.push(`Project: ${projectContext.title}`);
    parts.push(`Specialization: ${projectContext.specialization}`);
    parts.push(
      `Current Phase: ${projectContext.currentPhase} (${projectContext.phaseProgress}% complete)`,
    );

    if (projectContext.riskLevel !== 'low') {
      parts.push(`Risk Level: ${projectContext.riskLevel}`);
    }

    if (projectContext.milestonesSummary.overdue > 0) {
      parts.push(
        `${projectContext.milestonesSummary.overdue} overdue milestone(s)`,
      );
    }

    if (projectContext.milestonesSummary.upcoming > 0) {
      parts.push(
        `${projectContext.milestonesSummary.upcoming} upcoming milestone(s)`,
      );
    }

    if (projectContext.recommendations.length > 0) {
      parts.push(
        `Key recommendations: ${projectContext.recommendations.slice(0, 2).join('; ')}`,
      );
    }

    return parts.join('. ');
  }

  /**
   * Format milestone guidance for AI context
   */
  private formatMilestoneGuidance(
    guidance: MilestoneAwareGuidance,
  ): string | undefined {
    const parts: string[] = [];

    if (guidance.overdueMilestones.length > 0) {
      const overdueList = guidance.overdueMilestones
        .slice(0, 2)
        .map((m) => `${m.title} (${m.daysPastDue} days overdue)`)
        .join(', ');
      parts.push(`Overdue: ${overdueList}`);
    }

    if (guidance.urgentMilestones.length > 0) {
      const urgentList = guidance.urgentMilestones
        .slice(0, 2)
        .map((m) => `${m.title} (due in ${m.daysUntilDue} days)`)
        .join(', ');
      parts.push(`Urgent: ${urgentList}`);
    }

    if (guidance.blockedMilestones.length > 0) {
      const blockedList = guidance.blockedMilestones
        .slice(0, 2)
        .map((m) => `${m.title} (blocked: ${m.blockingReason})`)
        .join(', ');
      parts.push(`Blocked: ${blockedList}`);
    }

    if (guidance.phaseSpecificGuidance.currentPhase) {
      parts.push(
        `Phase focus: ${guidance.phaseSpecificGuidance.keyActivities.slice(0, 2).join(', ')}`,
      );
    }

    return parts.length > 0 ? parts.join('. ') : undefined;
  }

  /**
   * Format urgent milestones for immediate attention
   */
  private formatUrgentMilestones(
    urgentMilestones: MilestoneDeadlineAwareness[],
  ): string {
    return urgentMilestones
      .map((m) => {
        const urgencyIndicator = m.urgencyLevel === 'critical' ? '🚨' : '⚠️';
        return `${urgencyIndicator} ${m.title} (${m.daysUntilDue} days remaining)`;
      })
      .join(', ');
  }

  /**
   * Format project context for inclusion in AI request
   */
  private formatProjectContext(projectInfo: any): string {
    const parts: string[] = [];

    if (projectInfo.title) {
      parts.push(`Project: ${projectInfo.title}`);
    }

    if (projectInfo.specialization) {
      parts.push(`Specialization: ${projectInfo.specialization}`);
    }

    if (projectInfo.phase) {
      parts.push(`Current Phase: ${projectInfo.phase}`);
    }

    if (projectInfo.technologyStack && projectInfo.technologyStack.length > 0) {
      parts.push(`Technologies: ${projectInfo.technologyStack.join(', ')}`);
    }

    if (projectInfo.methodology) {
      parts.push(`Methodology: ${projectInfo.methodology}`);
    }

    return parts.join('. ');
  }

  /**
   * Format conversation summary for context
   */
  private formatConversationSummary(context: ConversationContext): string {
    const parts: string[] = [];

    if (context.recentTopics && context.recentTopics.length > 0) {
      parts.push(
        `Recent topics discussed: ${context.recentTopics.slice(0, 3).join(', ')}`,
      );
    }

    if (context.keyTerms && context.keyTerms.length > 0) {
      parts.push(`Key terms: ${context.keyTerms.slice(0, 5).join(', ')}`);
    }

    if (context.conversationSummary) {
      parts.push(`Summary: ${context.conversationSummary}`);
    }

    return parts.join('. ');
  }

  /**
   * Get relevant knowledge base context based on query
   */
  private async getRelevantKnowledgeContext(
    processedQuery: ProcessedQuery,
  ): Promise<string | undefined> {
    // This would integrate with knowledge base service when implemented
    // For now, return category-specific guidance
    const categoryGuidance = this.getCategorySpecificGuidance(
      processedQuery.category,
    );
    return categoryGuidance;
  }

  /**
   * Get category-specific guidance
   */
  private getCategorySpecificGuidance(category: string): string {
    const guidance = {
      literature_review:
        'A literature review should systematically analyze existing research, identify gaps, and establish theoretical foundations for your study.',
      methodology:
        'Choose research methods that align with your research questions and objectives. Consider validity, reliability, and ethical implications.',
      proposal_writing:
        'A research proposal should clearly state the problem, objectives, methodology, timeline, and expected outcomes.',
      data_analysis:
        'Ensure your analysis methods match your data type and research questions. Document your process for reproducibility.',
      implementation:
        'Follow software engineering best practices: version control, testing, documentation, and iterative development.',
      documentation:
        "Academic writing should be clear, structured, and properly referenced. Follow your institution's formatting guidelines.",
      presentation:
        'Prepare clear slides, practice your delivery, and anticipate questions from your audience.',
      general:
        'For Final Year Projects, maintain regular communication with your supervisor and follow institutional guidelines.',
    };

    return guidance[category] || guidance.general;
  }

  /**
   * Combine context parts with appropriate weighting
   */
  private combineContextParts(
    contextParts: string[],
    originalQuery: string,
  ): string {
    const maxLength = this.config.maxContextLength;

    // Start with the original query (highest weight)
    let context = `Question: ${originalQuery}`;

    if (contextParts.length === 0) {
      return context;
    }

    // Add context parts in order of importance
    const availableLength = maxLength - context.length - 50; // Reserve space for formatting
    let remainingLength = availableLength;

    for (const part of contextParts) {
      if (remainingLength <= 0) break;

      const partToAdd =
        part.length > remainingLength
          ? part.substring(0, remainingLength - 3) + '...'
          : part;

      context += `\n\n${partToAdd}`;
      remainingLength -= partToAdd.length + 2; // +2 for newlines
    }

    return context;
  }

  /**
   * Clean and format AI response
   */
  private cleanResponse(response: string): string {
    let cleaned = response
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\w/, (match) => match.toUpperCase()); // Capitalize first letter

    // Add period if no ending punctuation
    if (!/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  }

  /**
   * Enhance response for advanced academic levels
   */
  private enhanceAcademicResponse(
    response: string,
    processedQuery: ProcessedQuery,
  ): string {
    // Add academic context for graduate/research level queries
    if (processedQuery.metadata.academicLevel === 'research') {
      if (!response.includes('research') && !response.includes('study')) {
        response +=
          ' Consider reviewing recent literature and established research methodologies in this area.';
      }
    }

    return response;
  }

  /**
   * Determine sources for the response
   */
  private determineSources(
    contextualRequest: ContextualizedRequest,
    processedQuery: ProcessedQuery,
  ): string[] {
    const sources: string[] = ['AI Assistant'];

    if (contextualRequest.projectContext) {
      sources.push('Project Context');
    }

    if (contextualRequest.conversationSummary) {
      sources.push('Conversation History');
    }

    if (contextualRequest.knowledgeBaseContext) {
      sources.push('FYP Guidelines');
    }

    // Add category-specific sources
    const categorySource = this.getCategorySource(processedQuery.category);
    if (categorySource) {
      sources.push(categorySource);
    }

    return sources;
  }

  /**
   * Get category-specific source
   */
  private getCategorySource(category: string): string | undefined {
    const sources = {
      literature_review: 'Academic Research Guidelines',
      methodology: 'Research Methods Handbook',
      proposal_writing: 'Proposal Writing Guidelines',
      data_analysis: 'Statistical Analysis Guidelines',
      implementation: 'Software Development Best Practices',
      documentation: 'Academic Writing Standards',
      presentation: 'Presentation Guidelines',
    };

    return sources[category];
  }

  /**
   * Extract related topics from query and response
   */
  private extractRelatedTopics(
    processedQuery: ProcessedQuery,
    qaResponse: QAResponse,
  ): string[] {
    const topics: string[] = [];

    // Add topics based on entities found in query
    processedQuery.entities.forEach((entity) => {
      if (entity.type === 'research_area' || entity.type === 'academic_term') {
        topics.push(entity.value);
      }
    });

    // Add category-related topics
    const categoryTopics = this.getCategoryRelatedTopics(
      processedQuery.category,
    );
    topics.push(...categoryTopics);

    // Remove duplicates and limit
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * Get related topics for a category
   */
  private getCategoryRelatedTopics(category: string): string[] {
    const topics = {
      literature_review: [
        'systematic review',
        'citation analysis',
        'theoretical framework',
      ],
      methodology: ['research design', 'data collection', 'validity'],
      proposal_writing: ['research objectives', 'timeline', 'budget'],
      data_analysis: ['statistical methods', 'visualization', 'interpretation'],
      implementation: ['software architecture', 'testing', 'deployment'],
      documentation: ['academic writing', 'referencing', 'structure'],
      presentation: ['visual design', 'public speaking', 'Q&A preparation'],
    };

    return topics[category] || [];
  }

  /**
   * Generate follow-up suggestions
   */
  private async generateFollowUpSuggestions(
    processedQuery: ProcessedQuery,
    qaResponse: QAResponse,
    userId?: string,
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
      case 'example_request':
        suggestions.push('Can you explain this example further?');
        suggestions.push('How can I adapt this to my project?');
        break;
    }

    // Add milestone-specific suggestions if user context is available
    if (userId) {
      try {
        const milestoneGuidance =
          await this.projectContextService.generateMilestoneAwareGuidance(
            userId,
          );

        if (milestoneGuidance.urgentMilestones.length > 0) {
          suggestions.push('How can I prioritize my urgent milestones?');
        }

        if (milestoneGuidance.overdueMilestones.length > 0) {
          suggestions.push('What should I do about overdue milestones?');
        }

        if (milestoneGuidance.blockedMilestones.length > 0) {
          suggestions.push('How can I resolve blocked milestones?');
        }

        // Add proactive suggestions
        const proactiveSuggestions =
          await this.milestoneGuidanceService.generateProactiveSuggestions(
            userId,
          );
        const highPrioritySuggestions = proactiveSuggestions
          .filter((s) => s.priority === 'high' && s.timeframe === 'immediate')
          .slice(0, 1);

        if (highPrioritySuggestions.length > 0) {
          suggestions.push(
            `Should I ${highPrioritySuggestions[0].title.toLowerCase()}?`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to generate milestone-specific suggestions: ${error.message}`,
        );
      }
    }

    // Add category-specific suggestions
    const categorysuggestions = this.getCategorySuggestions(
      processedQuery.category,
    );
    suggestions.push(...categorysuggestions);

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Get category-specific follow-up suggestions
   */
  private getCategorySuggestions(category: string): string[] {
    const suggestions = {
      literature_review: [
        'How do I find relevant sources?',
        'What citation style should I use?',
      ],
      methodology: [
        'How do I validate my approach?',
        'What sample size do I need?',
      ],
      proposal_writing: [
        'How long should my proposal be?',
        'What timeline is realistic?',
      ],
      data_analysis: [
        'How do I interpret these results?',
        'What visualization would work best?',
      ],
      implementation: [
        'How do I test this properly?',
        'What documentation do I need?',
      ],
      documentation: [
        'How do I structure my chapters?',
        'What referencing style to use?',
      ],
      presentation: [
        'How long should my presentation be?',
        'How do I handle difficult questions?',
      ],
    };

    return (
      suggestions[category] || [
        'What should I do next?',
        'Can you provide more details?',
      ]
    );
  }

  /**
   * Determine if response requires human review
   */
  private shouldRequireHumanReview(
    qaResponse: QAResponse,
    processedQuery: ProcessedQuery,
  ): boolean {
    // Low confidence responses need review
    if (qaResponse.score < this.config.confidenceThreshold) {
      return true;
    }

    // High urgency queries might need review
    if (processedQuery.metadata.urgency === 'urgent') {
      return true;
    }

    // Complex academic queries might need review
    if (
      processedQuery.metadata.academicLevel === 'research' &&
      processedQuery.metadata.complexity === 'complex'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get service configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateConfiguration(updates: Partial<typeof this.config>): void {
    Object.assign(this.config, updates);
    this.logger.log('AI Response Generation configuration updated');
  }
}
