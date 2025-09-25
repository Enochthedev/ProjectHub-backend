import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIResponseValidatorService,
  ValidationResult,
  ValidationIssue,
  ValidationIssueType,
} from './ai-response-validator.service';
import {
  ProcessedQuery,
  QueryCategory,
  QueryIntent,
} from './query-processing.service';
import { AIResponseResult } from './ai-response-generation.service';

export interface EnhancedValidationResult extends ValidationResult {
  academicIntegrityScore: number;
  contextRelevanceScore: number;
  educationalValueScore: number;
  safetyScore: number;
  actionRequired: ValidationAction;
  moderationFlags: ModerationFlag[];
  improvementSuggestions: string[];
}

export interface ModerationFlag {
  type: ModerationFlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  autoAction?: 'block' | 'flag' | 'review';
}

export enum ModerationFlagType {
  ACADEMIC_MISCONDUCT = 'academic_misconduct',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HARMFUL_ADVICE = 'harmful_advice',
  PLAGIARISM_RISK = 'plagiarism_risk',
  CHEATING_ASSISTANCE = 'cheating_assistance',
  PRIVACY_VIOLATION = 'privacy_violation',
  BIAS_DETECTED = 'bias_detected',
  MISINFORMATION = 'misinformation',
}

export enum ValidationAction {
  APPROVE = 'approve',
  FLAG_FOR_REVIEW = 'flag_for_review',
  BLOCK = 'block',
  REQUIRE_HUMAN_REVIEW = 'require_human_review',
  SUGGEST_ALTERNATIVE = 'suggest_alternative',
}

export interface AcademicIntegrityCheck {
  isViolation: boolean;
  violationType: AcademicViolationType;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
  suggestions: string[];
}

export enum AcademicViolationType {
  DIRECT_ANSWER_PROVISION = 'direct_answer_provision',
  ASSIGNMENT_COMPLETION = 'assignment_completion',
  EXAM_ASSISTANCE = 'exam_assistance',
  PLAGIARISM_FACILITATION = 'plagiarism_facilitation',
  UNAUTHORIZED_COLLABORATION = 'unauthorized_collaboration',
  NONE = 'none',
}

@Injectable()
export class EnhancedResponseValidatorService {
  private readonly logger = new Logger(EnhancedResponseValidatorService.name);

  private readonly config: {
    academicIntegrityThreshold: number;
    contextRelevanceThreshold: number;
    educationalValueThreshold: number;
    safetyThreshold: number;
    strictModeEnabled: boolean;
    autoBlockThreshold: number;
    humanReviewThreshold: number;
  };

  // Academic integrity violation patterns
  private readonly academicViolationPatterns = new Map<
    AcademicViolationType,
    RegExp[]
  >([
    [
      AcademicViolationType.DIRECT_ANSWER_PROVISION,
      [
        /here is the answer/i,
        /the solution is/i,
        /copy this code/i,
        /use this exactly/i,
        /here's your assignment/i,
        /complete solution/i,
      ],
    ],
    [
      AcademicViolationType.ASSIGNMENT_COMPLETION,
      [
        /i'll do your homework/i,
        /let me complete this for you/i,
        /here's your finished assignment/i,
        /submit this as your work/i,
      ],
    ],
    [
      AcademicViolationType.EXAM_ASSISTANCE,
      [
        /during your exam/i,
        /on the test/i,
        /for your quiz/i,
        /exam answers/i,
        /test solutions/i,
      ],
    ],
    [
      AcademicViolationType.PLAGIARISM_FACILITATION,
      [
        /copy from this source/i,
        /paraphrase this without citation/i,
        /use without referencing/i,
        /don't cite this/i,
      ],
    ],
  ]);

  // Inappropriate content patterns
  private readonly inappropriatePatterns = [
    /\b(hack|crack|pirate|steal|cheat)\b/i,
    /\b(illegal|unethical|immoral)\b/i,
    /\b(password|login|admin|root)\b/i,
    /\b(discriminat|racist|sexist|homophobic)\b/i,
    /\b(violence|harm|hurt|kill)\b/i,
    /\bhack into\b/i,
  ];

  // Harmful advice patterns
  private readonly harmfulAdvicePatterns = [
    /skip your supervisor/i,
    /don't follow guidelines/i,
    /ignore the requirements/i,
    /plagiarize/i,
    /fake your data/i,
    /make up results/i,
  ];

  // Educational value indicators
  private readonly educationalIndicators = [
    /consider/i,
    /think about/i,
    /explore/i,
    /research/i,
    /analyze/i,
    /evaluate/i,
    /compare/i,
    /understand/i,
    /learn/i,
    /study/i,
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly baseValidator: AIResponseValidatorService,
  ) {
    this.config = {
      academicIntegrityThreshold:
        this.configService.get<number>('ai.academicIntegrityThreshold') || 0.8,
      contextRelevanceThreshold:
        this.configService.get<number>('ai.contextRelevanceThreshold') || 0.7,
      educationalValueThreshold:
        this.configService.get<number>('ai.educationalValueThreshold') || 0.6,
      safetyThreshold:
        this.configService.get<number>('ai.safetyThreshold') || 0.9,
      strictModeEnabled:
        this.configService.get<boolean>('ai.strictModeEnabled') ?? true,
      autoBlockThreshold:
        this.configService.get<number>('ai.autoBlockThreshold') || 0.3,
      humanReviewThreshold:
        this.configService.get<number>('ai.humanReviewThreshold') || 0.5,
    };

    this.logger.log('Enhanced Response Validator service initialized');
  }

  /**
   * Perform comprehensive validation of AI response
   */
  async validateResponse(
    response: AIResponseResult,
    query: ProcessedQuery,
    context?: {
      isExamPeriod?: boolean;
      assignmentDeadline?: Date;
      supervisorPresent?: boolean;
    },
  ): Promise<EnhancedValidationResult> {
    try {
      this.logger.debug(
        `Validating AI response for query: "${query.originalQuery}"`,
      );

      // Get base validation from existing service
      const baseValidation = await this.baseValidator.validateResponse(
        response.response,
        query.originalQuery,
        '', // context - would be provided in real implementation
        response.confidenceScore,
      );

      // Perform enhanced validations
      const academicIntegrityCheck = this.checkAcademicIntegrity(
        response,
        query,
        context,
      );
      const contextRelevanceScore = this.calculateContextRelevance(
        response,
        query,
      );
      const educationalValueScore = this.calculateEducationalValue(
        response,
        query,
      );
      const safetyScore = this.calculateSafetyScore(response, query);
      const moderationFlags = this.generateModerationFlags(
        response,
        query,
        context,
      );

      // Calculate overall scores
      const academicIntegrityScore = academicIntegrityCheck.isViolation
        ? 0.2
        : 0.9;

      // Determine action required
      const actionRequired = this.determineValidationAction(
        baseValidation,
        academicIntegrityScore,
        contextRelevanceScore,
        educationalValueScore,
        safetyScore,
        moderationFlags,
      );

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        baseValidation,
        academicIntegrityCheck,
        contextRelevanceScore,
        educationalValueScore,
        safetyScore,
      );

      const result: EnhancedValidationResult = {
        ...baseValidation,
        academicIntegrityScore,
        contextRelevanceScore,
        educationalValueScore,
        safetyScore,
        actionRequired,
        moderationFlags,
        improvementSuggestions,
      };

      this.logger.debug(
        `Validation completed: action=${actionRequired}, flags=${moderationFlags.length}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error validating response: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Check for academic integrity violations
   */
  private checkAcademicIntegrity(
    response: AIResponseResult,
    query: ProcessedQuery,
    context?: any,
  ): AcademicIntegrityCheck {
    const responseText = (response.response || '').toLowerCase();
    const queryText = (query.originalQuery || '').toLowerCase();

    // Check for direct violation patterns
    for (const [violationType, patterns] of this.academicViolationPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(responseText) || pattern.test(queryText)) {
          return {
            isViolation: true,
            violationType,
            severity: this.getViolationSeverity(violationType, context),
            explanation: `Response contains patterns indicating ${violationType.replace('_', ' ')}`,
            suggestions: this.getAcademicIntegritySuggestions(violationType),
          };
        }
      }
    }

    // Check for context-specific violations
    if (
      context?.isExamPeriod &&
      this.isExamAssistance(responseText, queryText)
    ) {
      return {
        isViolation: true,
        violationType: AcademicViolationType.EXAM_ASSISTANCE,
        severity: 'high',
        explanation: 'Response may provide exam assistance during exam period',
        suggestions: [
          'Redirect to general study resources',
          'Suggest consulting supervisor',
        ],
      };
    }

    // Check for assignment completion assistance
    if (this.isAssignmentCompletion(queryText, responseText)) {
      return {
        isViolation: true,
        violationType: AcademicViolationType.ASSIGNMENT_COMPLETION,
        severity: 'medium',
        explanation: 'Response may complete assignment work for student',
        suggestions: [
          'Provide guidance instead of solutions',
          'Encourage independent work',
        ],
      };
    }

    return {
      isViolation: false,
      violationType: AcademicViolationType.NONE,
      severity: 'low',
      explanation: 'No academic integrity violations detected',
      suggestions: [],
    };
  }

  /**
   * Calculate context relevance score
   */
  private calculateContextRelevance(
    response: AIResponseResult,
    query: ProcessedQuery,
  ): number {
    let score = 0.5; // Base score

    // Check keyword overlap
    const responseWords = (response.response || '').toLowerCase().split(/\s+/);
    const queryKeywords = (query.keywords || []).map((k) => k.toLowerCase());
    const overlap = queryKeywords.filter((keyword) =>
      responseWords.some((word) => word.includes(keyword)),
    ).length;

    if (queryKeywords.length > 0) {
      score += (overlap / queryKeywords.length) * 0.3;
    }

    // Check category alignment
    if (this.isCategoryAligned(response, query.category)) {
      score += 0.2;
    }

    // Check intent fulfillment
    if (this.isIntentFulfilled(response, query.intent)) {
      score += 0.2;
    }

    // Check context usage
    if (
      response.contextUsed.projectInfo ||
      response.contextUsed.conversationHistory
    ) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate educational value score
   */
  private calculateEducationalValue(
    response: AIResponseResult,
    query: ProcessedQuery,
  ): number {
    let score = 0.3; // Base score

    const responseText = (response.response || '').toLowerCase();

    // Check for educational indicators
    const educationalMatches = this.educationalIndicators.filter((pattern) =>
      pattern.test(responseText),
    ).length;
    score += Math.min(0.3, educationalMatches * 0.05);

    // Check for guidance vs direct answers
    if (this.providesGuidance(responseText)) {
      score += 0.2;
    }

    // Check for learning encouragement
    if (this.encouragesLearning(responseText)) {
      score += 0.2;
    }

    // Check for follow-up suggestions
    if (response.suggestedFollowUps && response.suggestedFollowUps.length > 0) {
      score += 0.1;
    }

    // Check for source references
    if (response.sources.length > 1) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate safety score
   */
  private calculateSafetyScore(
    response: AIResponseResult,
    query: ProcessedQuery,
  ): number {
    let score = 1.0; // Start with perfect score

    const responseText = (response.response || '').toLowerCase();
    const queryText = (query.originalQuery || '').toLowerCase();

    // Check for inappropriate content
    for (const pattern of this.inappropriatePatterns) {
      if (pattern.test(responseText) || pattern.test(queryText)) {
        score -= 0.3;
      }
    }

    // Check for harmful advice
    for (const pattern of this.harmfulAdvicePatterns) {
      if (pattern.test(responseText)) {
        score -= 0.4;
      }
    }

    // Check for bias indicators
    if (this.containsBias(responseText)) {
      score -= 0.2;
    }

    // Check for privacy violations
    if (this.containsPrivacyViolation(responseText)) {
      score -= 0.3;
    }

    return Math.max(0, score);
  }

  /**
   * Generate moderation flags
   */
  private generateModerationFlags(
    response: AIResponseResult,
    query: ProcessedQuery,
    context?: any,
  ): ModerationFlag[] {
    const flags: ModerationFlag[] = [];

    // Academic misconduct check
    const academicCheck = this.checkAcademicIntegrity(response, query, context);
    if (academicCheck.isViolation) {
      flags.push({
        type: ModerationFlagType.ACADEMIC_MISCONDUCT,
        severity: academicCheck.severity as any,
        description: academicCheck.explanation,
        autoAction: academicCheck.severity === 'high' ? 'block' : 'review',
      });
    }

    // Inappropriate content check
    if (this.containsInappropriateContent(response.response)) {
      flags.push({
        type: ModerationFlagType.INAPPROPRIATE_CONTENT,
        severity: 'high',
        description: 'Response contains inappropriate content',
        autoAction: 'block',
      });
    }

    // Harmful advice check
    if (this.containsHarmfulAdvice(response.response)) {
      flags.push({
        type: ModerationFlagType.HARMFUL_ADVICE,
        severity: 'high',
        description: 'Response contains potentially harmful advice',
        autoAction: 'block',
      });
    }

    // Low confidence flag
    if (response.confidenceScore < this.config.humanReviewThreshold) {
      flags.push({
        type: ModerationFlagType.MISINFORMATION,
        severity: 'medium',
        description: 'Low confidence response may contain inaccuracies',
        autoAction: 'review',
      });
    }

    return flags;
  }

  /**
   * Determine validation action based on scores and flags
   */
  private determineValidationAction(
    baseValidation: ValidationResult,
    academicIntegrityScore: number,
    contextRelevanceScore: number,
    educationalValueScore: number,
    safetyScore: number,
    moderationFlags: ModerationFlag[],
  ): ValidationAction {
    // Critical safety issues - immediate block
    if (safetyScore < this.config.autoBlockThreshold) {
      return ValidationAction.BLOCK;
    }

    // High severity flags - block
    const criticalFlags = moderationFlags.filter(
      (f) => f.severity === 'critical' || f.severity === 'high',
    );
    if (criticalFlags.length > 0) {
      return ValidationAction.BLOCK;
    }

    // Academic integrity violations - block if severe, otherwise require review
    if (academicIntegrityScore < 0.5) {
      return ValidationAction.BLOCK;
    } else if (
      academicIntegrityScore < this.config.academicIntegrityThreshold
    ) {
      return ValidationAction.REQUIRE_HUMAN_REVIEW;
    }

    // Low quality responses - flag for review
    if (
      !baseValidation.isValid ||
      contextRelevanceScore < this.config.contextRelevanceThreshold ||
      educationalValueScore < this.config.educationalValueThreshold
    ) {
      return ValidationAction.FLAG_FOR_REVIEW;
    }

    // Medium severity flags - suggest alternative
    const mediumFlags = moderationFlags.filter((f) => f.severity === 'medium');
    if (mediumFlags.length > 0) {
      return ValidationAction.SUGGEST_ALTERNATIVE;
    }

    return ValidationAction.APPROVE;
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    baseValidation: ValidationResult,
    academicIntegrityCheck: AcademicIntegrityCheck,
    contextRelevanceScore: number,
    educationalValueScore: number,
    safetyScore: number,
  ): string[] {
    const suggestions: string[] = [];

    // Base validation suggestions
    suggestions.push(...baseValidation.recommendations);

    // Academic integrity suggestions
    if (academicIntegrityCheck.isViolation) {
      suggestions.push(...academicIntegrityCheck.suggestions);
    }

    // Context relevance suggestions
    if (contextRelevanceScore < this.config.contextRelevanceThreshold) {
      suggestions.push('Improve response relevance to the specific query');
      suggestions.push('Include more context-specific information');
    }

    // Educational value suggestions
    if (educationalValueScore < this.config.educationalValueThreshold) {
      suggestions.push('Provide guidance rather than direct answers');
      suggestions.push('Encourage critical thinking and learning');
      suggestions.push('Include follow-up questions or suggestions');
    }

    // Safety suggestions
    if (safetyScore < this.config.safetyThreshold) {
      suggestions.push('Review content for appropriateness');
      suggestions.push('Ensure advice is safe and ethical');
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  // Helper methods for specific checks

  private getViolationSeverity(
    violationType: AcademicViolationType,
    context?: any,
  ): 'low' | 'medium' | 'high' {
    if (context?.isExamPeriod) return 'high';

    switch (violationType) {
      case AcademicViolationType.EXAM_ASSISTANCE:
      case AcademicViolationType.ASSIGNMENT_COMPLETION:
        return 'high';
      case AcademicViolationType.DIRECT_ANSWER_PROVISION:
        return 'medium';
      default:
        return 'low';
    }
  }

  private getAcademicIntegritySuggestions(
    violationType: AcademicViolationType,
  ): string[] {
    const suggestions = {
      [AcademicViolationType.DIRECT_ANSWER_PROVISION]: [
        'Provide guidance and methodology instead of direct answers',
        'Encourage independent problem-solving',
      ],
      [AcademicViolationType.ASSIGNMENT_COMPLETION]: [
        'Offer learning resources and guidance',
        'Suggest consulting with supervisor or teaching assistant',
      ],
      [AcademicViolationType.EXAM_ASSISTANCE]: [
        'Redirect to general study materials',
        'Suggest proper exam preparation methods',
      ],
      [AcademicViolationType.PLAGIARISM_FACILITATION]: [
        'Emphasize proper citation and referencing',
        'Explain academic integrity policies',
      ],
      [AcademicViolationType.UNAUTHORIZED_COLLABORATION]: [
        'Clarify collaboration policies',
        'Encourage individual work where required',
      ],
    };

    return suggestions[violationType] || [];
  }

  private isExamAssistance(responseText: string, queryText: string): boolean {
    const examKeywords = ['exam', 'test', 'quiz', 'assessment', 'evaluation'];
    const assistanceKeywords = ['answer', 'solution', 'solve', 'complete'];

    return (
      examKeywords.some((keyword) => queryText.includes(keyword)) &&
      assistanceKeywords.some((keyword) => responseText.includes(keyword))
    );
  }

  private isAssignmentCompletion(
    queryText: string,
    responseText: string,
  ): boolean {
    const assignmentKeywords = ['assignment', 'homework', 'project', 'task'];
    const completionKeywords = [
      'do for me',
      'complete this',
      'finish this',
      'solve this',
    ];

    return (
      assignmentKeywords.some((keyword) => queryText.includes(keyword)) &&
      completionKeywords.some(
        (keyword) =>
          queryText.includes(keyword) || responseText.includes(keyword),
      )
    );
  }

  private isCategoryAligned(
    response: AIResponseResult,
    category: QueryCategory,
  ): boolean {
    const categoryKeywords = {
      [QueryCategory.LITERATURE_REVIEW]: [
        'literature',
        'review',
        'sources',
        'research',
      ],
      [QueryCategory.METHODOLOGY]: [
        'method',
        'approach',
        'technique',
        'procedure',
      ],
      [QueryCategory.IMPLEMENTATION]: ['implement', 'code', 'develop', 'build'],
      [QueryCategory.DATA_ANALYSIS]: [
        'data',
        'analysis',
        'statistics',
        'results',
      ],
    };

    const keywords = categoryKeywords[category] || [];
    const responseText = (response.response || '').toLowerCase();

    return keywords.some((keyword) => responseText.includes(keyword));
  }

  private isIntentFulfilled(
    response: AIResponseResult,
    intent: QueryIntent,
  ): boolean {
    const responseText = (response.response || '').toLowerCase();

    switch (intent) {
      case QueryIntent.DEFINITION:
        return (
          responseText.includes('is') ||
          responseText.includes('means') ||
          responseText.includes('refers to')
        );
      case QueryIntent.EXAMPLE_REQUEST:
        return (
          responseText.includes('example') ||
          responseText.includes('instance') ||
          responseText.includes('such as')
        );
      case QueryIntent.COMPARISON:
        return (
          responseText.includes('difference') ||
          responseText.includes('compare') ||
          responseText.includes('versus')
        );
      default:
        return true; // Assume fulfilled for other intents
    }
  }

  private providesGuidance(responseText: string): boolean {
    if (!responseText) return false;
    const guidanceIndicators = [
      'consider',
      'think about',
      'you might',
      'you could',
      'try to',
      'approach',
    ];
    return guidanceIndicators.some((indicator) =>
      responseText.includes(indicator),
    );
  }

  private encouragesLearning(responseText: string): boolean {
    if (!responseText) return false;
    const learningIndicators = [
      'learn',
      'study',
      'research',
      'explore',
      'understand',
      'analyze',
    ];
    return learningIndicators.some((indicator) =>
      responseText.includes(indicator),
    );
  }

  private containsBias(responseText: string): boolean {
    if (!responseText) return false;
    const biasIndicators = [
      'always',
      'never',
      'all',
      'none',
      'everyone',
      'no one',
    ];
    return biasIndicators.some((indicator) => responseText.includes(indicator));
  }

  private containsPrivacyViolation(responseText: string): boolean {
    if (!responseText) return false;
    const privacyIndicators = [
      'personal information',
      'private data',
      'confidential',
      'password',
    ];
    return privacyIndicators.some((indicator) =>
      responseText.includes(indicator),
    );
  }

  private containsInappropriateContent(responseText: string): boolean {
    if (!responseText) return false;
    return this.inappropriatePatterns.some((pattern) =>
      pattern.test(responseText),
    );
  }

  private containsHarmfulAdvice(responseText: string): boolean {
    if (!responseText) return false;
    return this.harmfulAdvicePatterns.some((pattern) =>
      pattern.test(responseText),
    );
  }

  /**
   * Get validation configuration
   */
  getConfiguration() {
    return { ...this.config };
  }

  /**
   * Update validation configuration
   */
  updateConfiguration(updates: Partial<typeof this.config>): void {
    Object.assign(this.config, updates);
    this.logger.log('Enhanced Response Validator configuration updated');
  }
}
