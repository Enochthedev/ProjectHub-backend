import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseTemplate } from '../entities/response-template.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { TemplateManagementService } from './template-management.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { ConversationContext } from '../entities/interfaces/conversation.interface';
import {
  AIServiceUnavailableException,
  LowConfidenceResponseException,
  KnowledgeBaseUnavailableException,
  TemplateProcessingException,
  EscalationRequiredException,
} from '../common/exceptions/ai-assistant.exception';

export interface FallbackRequest {
  query: string;
  conversationId: string;
  userId: string;
  context?: ConversationContext;
  language?: string;
  category?: string;
  confidenceScore?: number;
  originalError?: any;
}

export interface FallbackResponse {
  response: string;
  confidenceScore: number;
  sources: string[];
  fromAI: boolean;
  fallbackMethod: 'template' | 'knowledge_base' | 'default' | 'escalation';
  escalationSuggestion?: string;
  suggestedFollowUps: string[];
  metadata: {
    processingTime: number;
    fallbackReason: string;
    templateUsed?: string;
    knowledgeEntriesFound?: number;
    requiresHumanReview: boolean;
  };
}

export interface FallbackOptions {
  enableTemplateMatching?: boolean;
  enableKnowledgeBaseSearch?: boolean;
  minTemplateScore?: number;
  maxKnowledgeEntries?: number;
  includeEscalationSuggestion?: boolean;
  customSubstitutions?: Record<string, string>;
}

@Injectable()
export class AIAssistantFallbackService {
  private readonly logger = new Logger(AIAssistantFallbackService.name);

  private readonly defaultOptions: Required<FallbackOptions> = {
    enableTemplateMatching: true,
    enableKnowledgeBaseSearch: true,
    minTemplateScore: 0.3,
    maxKnowledgeEntries: 3,
    includeEscalationSuggestion: true,
    customSubstitutions: {},
  };

  constructor(
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    private readonly templateService: TemplateManagementService,
    private readonly knowledgeService: KnowledgeBaseService,
  ) {}

  /**
   * Generate comprehensive fallback response when AI service fails or confidence is low
   */
  async generateFallbackResponse(
    request: FallbackRequest,
    options: FallbackOptions = {},
  ): Promise<FallbackResponse> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };

    this.logger.warn(
      `Generating fallback response for query: "${request.query}" (Reason: ${this.determineFallbackReason(request)})`,
    );

    try {
      // Step 1: Try template-based fallback
      if (mergedOptions.enableTemplateMatching) {
        const templateResponse = await this.tryTemplateBasedFallback(
          request,
          mergedOptions,
        );
        if (templateResponse) {
          return this.buildFallbackResponse(
            templateResponse.response,
            'template',
            request,
            startTime,
            {
              templateUsed: templateResponse.templateId,
              fallbackReason: this.determineFallbackReason(request),
            },
          );
        }
      }

      // Step 2: Try knowledge base search fallback
      if (mergedOptions.enableKnowledgeBaseSearch) {
        const knowledgeResponse = await this.tryKnowledgeBaseFallback(
          request,
          mergedOptions,
        );
        if (knowledgeResponse) {
          return this.buildFallbackResponse(
            knowledgeResponse.response,
            'knowledge_base',
            request,
            startTime,
            {
              knowledgeEntriesFound: knowledgeResponse.entriesUsed,
              fallbackReason: this.determineFallbackReason(request),
            },
          );
        }
      }

      // Step 3: Check if escalation is required
      if (this.shouldEscalate(request)) {
        const escalationResponse = this.generateEscalationResponse(request);
        return this.buildFallbackResponse(
          escalationResponse.response,
          'escalation',
          request,
          startTime,
          {
            fallbackReason: escalationResponse.reason,
            requiresHumanReview: true,
          },
        );
      }

      // Step 4: Generate default fallback response
      const defaultResponse = this.generateDefaultFallback(
        request,
        mergedOptions,
      );
      return this.buildFallbackResponse(
        defaultResponse.response,
        'default',
        request,
        startTime,
        {
          fallbackReason: this.determineFallbackReason(request),
        },
      );
    } catch (error) {
      this.logger.error(
        `Error in fallback response generation: ${error.message}`,
        error.stack,
      );

      // Ultimate fallback - simple error response
      const emergencyResponse = this.generateEmergencyFallback(request);
      return this.buildFallbackResponse(
        emergencyResponse,
        'default',
        request,
        startTime,
        {
          fallbackReason: `Error in fallback system: ${error.message}`,
          requiresHumanReview: true,
        },
      );
    }
  }

  /**
   * Try template-based fallback response
   */
  private async tryTemplateBasedFallback(
    request: FallbackRequest,
    options: Required<FallbackOptions>,
  ): Promise<{ response: string; templateId: string } | null> {
    try {
      const substitutions = this.buildTemplateSubstitutions(
        request,
        options.customSubstitutions,
      );

      const matchResult = await this.templateService.getBestMatchingTemplate(
        request.query,
        request.category,
        request.language || 'en',
        substitutions,
      );

      if (matchResult && matchResult.matchScore >= options.minTemplateScore) {
        await this.templateService.incrementUsage(matchResult.template.id);

        this.logger.debug(
          `Template fallback successful: ${matchResult.template.name} (score: ${matchResult.matchScore})`,
        );

        return {
          response: matchResult.processedContent,
          templateId: matchResult.template.id,
        };
      }

      return null;
    } catch (error) {
      this.logger.warn(`Template fallback failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Try knowledge base search fallback
   */
  private async tryKnowledgeBaseFallback(
    request: FallbackRequest,
    options: Required<FallbackOptions>,
  ): Promise<{ response: string; entriesUsed: number } | null> {
    try {
      const searchResult = await this.knowledgeService.searchKnowledge({
        query: request.query,
        category: request.category,
        limit: options.maxKnowledgeEntries,
        offset: 0,
      });

      if (searchResult.entries.length === 0) {
        return null;
      }

      const relevantEntries = searchResult.entries;
      const response = this.formatKnowledgeResponse(
        relevantEntries,
        request.query,
      );

      this.logger.debug(
        `Knowledge base fallback successful: ${relevantEntries.length} entries found`,
      );

      return {
        response,
        entriesUsed: relevantEntries.length,
      };
    } catch (error) {
      this.logger.warn(`Knowledge base fallback failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate escalation response when human intervention is needed
   */
  private generateEscalationResponse(request: FallbackRequest): {
    response: string;
    reason: string;
  } {
    const reasons: string[] = [];

    if (
      request.confidenceScore !== undefined &&
      request.confidenceScore < 0.1
    ) {
      reasons.push('extremely low AI confidence');
    }

    // Note: urgency is not part of ConversationContext interface,
    // but could be added in the future or passed separately
    // if (request.context?.urgency === 'urgent') {
    //     reasons.push('urgent query requiring immediate attention');
    // }

    if (this.isComplexAcademicQuery(request.query)) {
      reasons.push('complex academic query requiring expert guidance');
    }

    const reason = reasons.length > 0 ? reasons.join(', ') : 'query complexity';

    const response = `I understand you need help with "${request.query}", but this question requires personalized guidance from a human expert.

**Why escalation is needed:** ${reason}

**Next steps:**
1. **Contact your supervisor** - They can provide specific guidance for your project
2. **Visit office hours** - Get face-to-face support for complex questions  
3. **Check the help desk** - For technical or administrative issues
4. **Browse the knowledge base** - Look for related topics that might help

**In the meantime, you can:**
- Rephrase your question to be more specific
- Break down complex questions into smaller parts
- Review the FYP guidelines for general guidance

Would you like me to help you contact your supervisor or find relevant resources?`;

    return { response, reason };
  }

  /**
   * Generate default fallback response
   */
  private generateDefaultFallback(
    request: FallbackRequest,
    options: Required<FallbackOptions>,
  ): { response: string } {
    const categoryGuidance = this.getCategorySpecificGuidance(request.category);
    const contextualHelp = this.getContextualHelp(request);

    const response = `I'm having trouble providing a confident answer to your question right now, but I can still help you in several ways:

${categoryGuidance}

**Alternative ways I can assist:**
${contextualHelp}

**General FYP guidance:**
- Follow a systematic approach to your research
- Maintain regular communication with your supervisor
- Document your progress and decisions
- Seek feedback early and often

${
  options.includeEscalationSuggestion
    ? '\n**Need more specific help?** Consider contacting your supervisor or visiting office hours for personalized guidance.'
    : ''
}

Would you like me to help you with any of these alternatives, or would you prefer to rephrase your question?`;

    return { response };
  }

  /**
   * Generate emergency fallback for system errors
   */
  private generateEmergencyFallback(request: FallbackRequest): string {
    return `I apologize, but I'm experiencing technical difficulties and cannot provide a proper response to your question right now.

**Please try:**
1. Rephrasing your question and asking again
2. Contacting your supervisor for immediate assistance
3. Checking the FYP guidelines in your course materials
4. Visiting the help desk if this is a technical issue

**Your question:** "${request.query}"

I'll be back to full functionality shortly. Thank you for your patience.`;
  }

  /**
   * Build template substitutions from request context
   */
  private buildTemplateSubstitutions(
    request: FallbackRequest,
    customSubstitutions: Record<string, string>,
  ): Record<string, string> {
    const substitutions: Record<string, string> = {
      student_name: 'Student',
      query: request.query,
      language: request.language || 'en',
      ...customSubstitutions,
    };

    // Add context-based substitutions
    if (request.context) {
      if (request.context.projectId) {
        substitutions.project_id = request.context.projectId;
      }
      if (request.context.specialization) {
        substitutions.specialization = request.context.specialization;
      }
      if (request.context.projectPhase) {
        substitutions.project_phase = request.context.projectPhase;
      }
    }

    return substitutions;
  }

  /**
   * Format knowledge base entries into a coherent response
   */
  private formatKnowledgeResponse(entries: any[], query: string): string {
    if (entries.length === 1) {
      const entry = entries[0];
      return `Based on our knowledge base, here's what I found about "${query}":

**${entry.title}**

${entry.content}

*Source: ${entry.category} guidelines*

Would you like me to elaborate on any specific aspect of this information?`;
    }

    const formattedEntries = entries
      .map(
        (entry, index) =>
          `**${index + 1}. ${entry.title}**\n${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`,
      )
      .join('\n\n');

    return `I found several relevant resources in our knowledge base for "${query}":

${formattedEntries}

*Sources: FYP Guidelines and Knowledge Base*

These resources should help answer your question. Would you like me to provide more details about any specific topic?`;
  }

  /**
   * Get category-specific guidance
   */
  private getCategorySpecificGuidance(category?: string): string {
    const guidance = {
      literature_review:
        '**For literature reviews:** Start with recent systematic reviews, use academic databases, and focus on peer-reviewed sources. Organize by themes or chronologically.',
      methodology:
        '**For methodology questions:** Consider your research questions, data type, and available resources. Ensure your methods align with your objectives.',
      proposal_writing:
        "**For proposal writing:** Follow your institution's template, clearly state your problem and objectives, and include a realistic timeline.",
      data_analysis:
        '**For data analysis:** Choose methods appropriate for your data type, document your process, and interpret results in context.',
      implementation:
        '**For implementation:** Follow best practices, use version control, write tests, and document your code thoroughly.',
      documentation:
        '**For documentation:** Structure your work clearly, use proper citations, and follow academic writing conventions.',
      presentation:
        '**For presentations:** Keep slides clear and concise, practice your delivery, and prepare for questions.',
    };

    return (
      guidance[category || 'general'] ||
      "**General guidance:** Break down complex problems into smaller steps, consult multiple sources, and don't hesitate to ask for clarification."
    );
  }

  /**
   * Get contextual help suggestions
   */
  private getContextualHelp(request: FallbackRequest): string {
    const suggestions = [
      '• **Rephrase your question** - Try being more specific or breaking it into parts',
      '• **Browse similar topics** - Check our knowledge base for related information',
      "• **Review FYP guidelines** - Your institution's guidelines might have the answer",
      '• **Ask follow-up questions** - I can help clarify specific aspects',
    ];

    // Add context-specific suggestions
    if (request.context?.projectId) {
      suggestions.push(
        '• **Project-specific guidance** - I can provide advice tailored to your project type',
      );
    }

    if (request.context?.recentTopics?.length) {
      suggestions.push(
        "• **Continue previous discussions** - We can build on topics we've discussed",
      );
    }

    return suggestions.join('\n');
  }

  /**
   * Build standardized fallback response
   */
  private buildFallbackResponse(
    response: string,
    method: FallbackResponse['fallbackMethod'],
    request: FallbackRequest,
    startTime: number,
    additionalMetadata: Partial<FallbackResponse['metadata']> = {},
  ): FallbackResponse {
    const processingTime = Date.now() - startTime;

    return {
      response,
      confidenceScore: this.calculateFallbackConfidence(method, request),
      sources: this.determineFallbackSources(method),
      fromAI: false,
      fallbackMethod: method,
      escalationSuggestion:
        method === 'escalation'
          ? 'This query requires human expertise. Please contact your supervisor or visit office hours.'
          : undefined,
      suggestedFollowUps: this.generateFallbackFollowUps(method, request),
      metadata: {
        processingTime,
        fallbackReason: additionalMetadata.fallbackReason || 'Unknown reason',
        requiresHumanReview: method === 'escalation' || method === 'default',
        ...additionalMetadata,
      },
    };
  }

  /**
   * Calculate confidence score for fallback responses
   */
  private calculateFallbackConfidence(
    method: FallbackResponse['fallbackMethod'],
    request: FallbackRequest,
  ): number {
    const baseConfidence = {
      template: 0.6,
      knowledge_base: 0.5,
      escalation: 0.2,
      default: 0.1,
    };

    return baseConfidence[method];
  }

  /**
   * Determine sources for fallback response
   */
  private determineFallbackSources(
    method: FallbackResponse['fallbackMethod'],
  ): string[] {
    const sources = {
      template: ['Response Templates', 'Fallback System'],
      knowledge_base: ['Knowledge Base', 'FYP Guidelines'],
      escalation: ['Escalation System', 'Human Review Required'],
      default: ['Fallback System', 'General Guidelines'],
    };

    return sources[method];
  }

  /**
   * Generate follow-up suggestions for fallback responses
   */
  private generateFallbackFollowUps(
    method: FallbackResponse['fallbackMethod'],
    request: FallbackRequest,
  ): string[] {
    const baseFollowUps = [
      'Can you rephrase your question?',
      'Would you like to browse related topics?',
      'Should I help you contact your supervisor?',
    ];

    const methodSpecificFollowUps = {
      template: [
        'Would you like more specific guidance?',
        'Can I help with a related topic?',
      ],
      knowledge_base: [
        'Would you like more details about any of these topics?',
        'Should I search for more specific information?',
      ],
      escalation: [
        'Should I help you contact your supervisor?',
        "Would you like me to find your supervisor's contact information?",
      ],
      default: [
        'Can you break your question into smaller parts?',
        'Would you like to see the FYP guidelines?',
      ],
    };

    return [...methodSpecificFollowUps[method], ...baseFollowUps].slice(0, 3);
  }

  /**
   * Determine the reason for fallback
   */
  private determineFallbackReason(request: FallbackRequest): string {
    if (request.originalError) {
      if (request.originalError instanceof AIServiceUnavailableException) {
        return 'AI service unavailable';
      }
      return 'AI service error';
    }

    if (
      request.confidenceScore !== undefined &&
      request.confidenceScore < 0.3
    ) {
      return `Low AI confidence (${request.confidenceScore})`;
    }

    return 'Fallback requested';
  }

  /**
   * Check if escalation is required
   */
  private shouldEscalate(request: FallbackRequest): boolean {
    // Escalate for extremely low confidence
    if (
      request.confidenceScore !== undefined &&
      request.confidenceScore < 0.1
    ) {
      return true;
    }

    // Note: urgency is not part of ConversationContext interface
    // This could be added in the future or passed separately
    // if (request.context?.urgency === 'urgent') {
    //     return true;
    // }

    // Escalate for complex academic queries
    if (this.isComplexAcademicQuery(request.query)) {
      return true;
    }

    return false;
  }

  /**
   * Check if query is complex academic query requiring human expertise
   */
  private isComplexAcademicQuery(query: string): boolean {
    const complexIndicators = [
      'ethical approval',
      'institutional review board',
      'irb approval',
      'research ethics',
      'statistical significance',
      'p-value interpretation',
      'research design validation',
      'methodology critique',
      'theoretical framework development',
      'original contribution',
      'novelty assessment',
      'research gap identification',
    ];

    const queryLower = query.toLowerCase();
    return complexIndicators.some((indicator) =>
      queryLower.includes(indicator),
    );
  }

  /**
   * Get service statistics
   */
  async getFallbackStatistics(): Promise<{
    templateUsage: { templateId: string; name: string; usageCount: number }[];
    knowledgeBaseHits: number;
    escalationRate: number;
    averageProcessingTime: number;
  }> {
    // This would be implemented with proper analytics tracking
    // For now, return mock data structure
    return {
      templateUsage: [],
      knowledgeBaseHits: 0,
      escalationRate: 0,
      averageProcessingTime: 0,
    };
  }
}
