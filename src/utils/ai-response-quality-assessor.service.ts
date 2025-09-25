import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMessage, KnowledgeBaseEntry } from '@/entities';
import { MessageType } from '@/common/enums';

export interface QualityAssessmentResult {
  messageId: string;
  overallScore: number;
  dimensions: QualityDimensions;
  issues: QualityIssue[];
  recommendations: string[];
  metadata: AssessmentMetadata;
}

export interface QualityDimensions {
  relevance: number; // 0-10: How relevant is the response to the query
  accuracy: number; // 0-10: How accurate is the information
  completeness: number; // 0-10: How complete is the response
  clarity: number; // 0-10: How clear and understandable
  helpfulness: number; // 0-10: How helpful for the student
  appropriateness: number; // 0-10: How appropriate for academic context
}

export interface QualityIssue {
  type: 'critical' | 'major' | 'minor' | 'suggestion';
  category: string;
  description: string;
  severity: number; // 1-10
  suggestion?: string;
}

export interface AssessmentMetadata {
  assessmentTime: Date;
  queryLength: number;
  responseLength: number;
  messageType: MessageType;
  confidenceScore?: number;
  processingTime?: number;
}

export interface BatchAssessmentReport {
  totalMessages: number;
  averageQuality: number;
  qualityDistribution: {
    excellent: number; // 8-10
    good: number; // 6-8
    fair: number; // 4-6
    poor: number; // 0-4
  };
  commonIssues: { issue: string; frequency: number }[];
  recommendations: string[];
  dimensionAverages: QualityDimensions;
}

@Injectable()
export class AIResponseQualityAssessorService {
  private readonly logger = new Logger(AIResponseQualityAssessorService.name);

  constructor(
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
  ) {}

  /**
   * Assess the quality of a single AI response
   */
  async assessResponse(messageId: string): Promise<QualityAssessmentResult> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new Error(`Message with ID ${messageId} not found`);
    }

    // Get the user query that prompted this response
    const userQuery = await this.getPreviousUserQuery(message);

    return this.performQualityAssessment(message, userQuery);
  }

  /**
   * Assess quality of multiple responses
   */
  async assessBatchResponses(
    messageIds: string[],
  ): Promise<QualityAssessmentResult[]> {
    const results: QualityAssessmentResult[] = [];

    for (const messageId of messageIds) {
      try {
        const result = await this.assessResponse(messageId);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to assess message ${messageId}:`, error);
      }
    }

    return results;
  }

  /**
   * Generate a comprehensive quality report
   */
  async generateQualityReport(
    startDate?: Date,
    endDate?: Date,
    messageType?: MessageType,
  ): Promise<BatchAssessmentReport> {
    this.logger.log('Generating AI response quality report...');

    // Build query conditions
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation');

    if (startDate) {
      queryBuilder.andWhere('message.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('message.createdAt <= :endDate', { endDate });
    }

    if (messageType) {
      queryBuilder.andWhere('message.type = :messageType', { messageType });
    } else {
      // Only assess AI and template responses
      queryBuilder.andWhere('message.type IN (:...types)', {
        types: [MessageType.AI_RESPONSE, MessageType.TEMPLATE_RESPONSE],
      });
    }

    const messages = await queryBuilder.getMany();

    if (messages.length === 0) {
      return this.createEmptyReport();
    }

    // Assess all messages
    const assessments: QualityAssessmentResult[] = [];
    for (const message of messages) {
      try {
        const userQuery = await this.getPreviousUserQuery(message);
        const assessment = await this.performQualityAssessment(
          message,
          userQuery,
        );
        assessments.push(assessment);
      } catch (error) {
        this.logger.error(`Failed to assess message ${message.id}:`, error);
      }
    }

    return this.generateBatchReport(assessments);
  }

  /**
   * Perform quality assessment on a message
   */
  private async performQualityAssessment(
    message: ConversationMessage,
    userQuery?: ConversationMessage,
  ): Promise<QualityAssessmentResult> {
    const issues: QualityIssue[] = [];
    const recommendations: string[] = [];

    // Assess each quality dimension
    const dimensions: QualityDimensions = {
      relevance: await this.assessRelevance(message, userQuery, issues),
      accuracy: await this.assessAccuracy(message, issues),
      completeness: await this.assessCompleteness(message, userQuery, issues),
      clarity: await this.assessClarity(message, issues),
      helpfulness: await this.assessHelpfulness(message, userQuery, issues),
      appropriateness: await this.assessAppropriateness(message, issues),
    };

    // Calculate overall score
    const overallScore = this.calculateOverallScore(dimensions);

    // Generate recommendations based on issues
    this.generateRecommendations(dimensions, issues, recommendations);

    const metadata: AssessmentMetadata = {
      assessmentTime: new Date(),
      queryLength: userQuery?.content.length || 0,
      responseLength: message.content.length,
      messageType: message.type,
      confidenceScore: message.confidenceScore || undefined,
      processingTime: message.metadata?.processingTime,
    };

    return {
      messageId: message.id,
      overallScore,
      dimensions,
      issues,
      recommendations,
      metadata,
    };
  }

  /**
   * Assess relevance of response to query
   */
  private async assessRelevance(
    message: ConversationMessage,
    userQuery?: ConversationMessage,
    issues: QualityIssue[] = [],
  ): Promise<number> {
    if (!userQuery) {
      issues.push({
        type: 'minor',
        category: 'Relevance',
        description: 'Cannot assess relevance without user query',
        severity: 3,
      });
      return 5; // Neutral score
    }

    const queryWords = this.extractKeywords(userQuery.content);
    const responseWords = this.extractKeywords(message.content);

    // Calculate keyword overlap
    const overlap = queryWords.filter((word) =>
      responseWords.some(
        (rWord) => rWord.includes(word) || word.includes(rWord),
      ),
    );

    const relevanceRatio = overlap.length / Math.max(queryWords.length, 1);
    let score = relevanceRatio * 10;

    // Check for direct question answering
    if (
      this.isDirectQuestion(userQuery.content) &&
      !this.providesDirectAnswer(message.content)
    ) {
      score -= 2;
      issues.push({
        type: 'major',
        category: 'Relevance',
        description: 'Response does not directly answer the question',
        severity: 7,
        suggestion:
          'Provide a more direct answer to the specific question asked',
      });
    }

    // Check for topic drift
    if (relevanceRatio < 0.2) {
      issues.push({
        type: 'critical',
        category: 'Relevance',
        description: 'Response appears unrelated to the query',
        severity: 9,
        suggestion: 'Ensure response addresses the main topic of the query',
      });
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Assess accuracy of information
   */
  private async assessAccuracy(
    message: ConversationMessage,
    issues: QualityIssue[] = [],
  ): Promise<number> {
    let score = 8; // Default high score for accuracy

    // Check for factual inconsistencies (basic heuristics)
    const content = message.content.toLowerCase();

    // Check for uncertainty indicators
    const uncertaintyWords = [
      'might',
      'maybe',
      'possibly',
      'probably',
      'not sure',
      'unclear',
    ];
    const uncertaintyCount = uncertaintyWords.reduce((count, word) => {
      return (
        count + (content.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
      );
    }, 0);

    if (uncertaintyCount > 2) {
      score -= 2;
      issues.push({
        type: 'minor',
        category: 'Accuracy',
        description: 'Response contains multiple uncertainty indicators',
        severity: 4,
        suggestion:
          'Provide more confident and definitive guidance where appropriate',
      });
    }

    // Check for contradictory statements
    const contradictionPatterns = [
      /but.*however/i,
      /yes.*but.*no/i,
      /should.*shouldn't/i,
    ];

    contradictionPatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        score -= 3;
        issues.push({
          type: 'major',
          category: 'Accuracy',
          description: 'Response contains contradictory statements',
          severity: 7,
          suggestion: 'Review response for internal consistency',
        });
      }
    });

    // Check against knowledge base for consistency
    const knowledgeConsistency = await this.checkKnowledgeConsistency(
      message.content,
    );
    if (!knowledgeConsistency.isConsistent) {
      score -= knowledgeConsistency.severityDeduction;
      issues.push({
        type: 'major',
        category: 'Accuracy',
        description: 'Response may conflict with established guidelines',
        severity: 8,
        suggestion: 'Verify information against official FYP guidelines',
      });
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Assess completeness of response
   */
  private async assessCompleteness(
    message: ConversationMessage,
    userQuery?: ConversationMessage,
    issues: QualityIssue[] = [],
  ): Promise<number> {
    let score = 5; // Base score

    const contentLength = message.content.length;
    const wordCount = message.content.split(/\s+/).length;

    // Length-based assessment
    if (contentLength < 50) {
      score = 2;
      issues.push({
        type: 'critical',
        category: 'Completeness',
        description: 'Response is too short to be helpful',
        severity: 8,
        suggestion: 'Provide more detailed and comprehensive information',
      });
    } else if (contentLength < 150) {
      score = 4;
      issues.push({
        type: 'major',
        category: 'Completeness',
        description: 'Response could be more detailed',
        severity: 6,
        suggestion: 'Add more explanation and examples',
      });
    } else if (contentLength > 200) {
      score = 7;
    }

    // Structure assessment
    const hasStructure = this.hasGoodStructure(message.content);
    if (hasStructure.hasList) score += 1;
    if (hasStructure.hasHeadings) score += 1;
    if (hasStructure.hasExamples) score += 1;

    // Check for actionable content
    const hasActionableContent = this.hasActionableContent(message.content);
    if (hasActionableContent) {
      score += 1;
    } else if (
      userQuery &&
      this.requiresActionableResponse(userQuery.content)
    ) {
      issues.push({
        type: 'major',
        category: 'Completeness',
        description:
          'Query requires actionable guidance but response lacks specific steps',
        severity: 7,
        suggestion: 'Include specific steps or actions the student can take',
      });
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Assess clarity and readability
   */
  private async assessClarity(
    message: ConversationMessage,
    issues: QualityIssue[] = [],
  ): Promise<number> {
    const content = message.content;
    let score = 8; // Start with high score

    // Sentence length analysis
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const avgSentenceLength =
      sentences.reduce((sum, sentence) => {
        return sum + sentence.split(/\s+/).length;
      }, 0) / sentences.length;

    if (avgSentenceLength > 30) {
      score -= 2;
      issues.push({
        type: 'minor',
        category: 'Clarity',
        description: 'Sentences are too long on average',
        severity: 4,
        suggestion: 'Break long sentences into shorter, clearer statements',
      });
    }

    // Technical jargon assessment
    const jargonCount = this.countTechnicalJargon(content);
    if (jargonCount > 5) {
      score -= 1;
      issues.push({
        type: 'minor',
        category: 'Clarity',
        description: 'Response contains significant technical jargon',
        severity: 3,
        suggestion:
          'Explain technical terms or use simpler language where possible',
      });
    }

    // Structure and formatting
    const structure = this.hasGoodStructure(content);
    if (!structure.hasList && !structure.hasHeadings && content.length > 300) {
      score -= 1;
      issues.push({
        type: 'suggestion',
        category: 'Clarity',
        description: 'Long response could benefit from better structure',
        severity: 2,
        suggestion: 'Use bullet points or headings to organize information',
      });
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Assess helpfulness for student
   */
  private async assessHelpfulness(
    message: ConversationMessage,
    userQuery?: ConversationMessage,
    issues: QualityIssue[] = [],
  ): Promise<number> {
    let score = 5; // Base score

    // Check for helpful elements
    const content = message.content.toLowerCase();

    // Examples and illustrations
    if (this.containsExamples(content)) {
      score += 2;
    }

    // Step-by-step guidance
    if (this.containsStepByStep(content)) {
      score += 2;
    }

    // Resources and references
    if (this.containsResources(content)) {
      score += 1;
    }

    // Encouragement and support
    if (this.containsEncouragement(content)) {
      score += 1;
    }

    // Follow-up suggestions
    if (this.containsFollowUp(content)) {
      score += 1;
    }

    // Check for unhelpful patterns
    if (content.includes("i don't know") || content.includes('not sure')) {
      score -= 2;
      issues.push({
        type: 'major',
        category: 'Helpfulness',
        description:
          'Response expresses uncertainty without providing alternatives',
        severity: 6,
        suggestion:
          'Provide alternative resources or suggest next steps when uncertain',
      });
    }

    // Generic responses
    if (this.isGenericResponse(content)) {
      score -= 1;
      issues.push({
        type: 'minor',
        category: 'Helpfulness',
        description:
          'Response appears generic and not tailored to the specific query',
        severity: 4,
        suggestion: 'Provide more specific and personalized guidance',
      });
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Assess appropriateness for academic context
   */
  private async assessAppropriateness(
    message: ConversationMessage,
    issues: QualityIssue[] = [],
  ): Promise<number> {
    let score = 9; // Start high, deduct for issues

    const content = message.content.toLowerCase();

    // Check for inappropriate content
    const inappropriatePatterns = [
      /\b(stupid|dumb|idiot)\b/i,
      /\b(easy|simple|obvious)\b.*\b(just|simply|merely)\b/i,
    ];

    inappropriatePatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        score -= 3;
        issues.push({
          type: 'major',
          category: 'Appropriateness',
          description: 'Response contains potentially dismissive language',
          severity: 7,
          suggestion: 'Use more supportive and encouraging language',
        });
      }
    });

    // Check for academic tone
    const hasAcademicTone = this.hasAcademicTone(content);
    if (!hasAcademicTone) {
      score -= 1;
      issues.push({
        type: 'minor',
        category: 'Appropriateness',
        description: 'Response could use more formal academic tone',
        severity: 3,
        suggestion: 'Maintain professional academic language',
      });
    }

    // Check for proper guidance vs doing work for student
    if (this.offersToDoWork(content)) {
      score -= 4;
      issues.push({
        type: 'critical',
        category: 'Appropriateness',
        description: 'Response offers to do work for the student',
        severity: 9,
        suggestion:
          'Provide guidance and resources instead of offering to complete tasks',
      });
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallScore(dimensions: QualityDimensions): number {
    const weights = {
      relevance: 0.25,
      accuracy: 0.2,
      completeness: 0.15,
      clarity: 0.15,
      helpfulness: 0.15,
      appropriateness: 0.1,
    };

    return (
      dimensions.relevance * weights.relevance +
      dimensions.accuracy * weights.accuracy +
      dimensions.completeness * weights.completeness +
      dimensions.clarity * weights.clarity +
      dimensions.helpfulness * weights.helpfulness +
      dimensions.appropriateness * weights.appropriateness
    );
  }

  /**
   * Generate recommendations based on assessment
   */
  private generateRecommendations(
    dimensions: QualityDimensions,
    issues: QualityIssue[],
    recommendations: string[],
  ): void {
    // Dimension-based recommendations
    if (dimensions.relevance < 6) {
      recommendations.push(
        'Improve response relevance by better understanding the query context',
      );
    }

    if (dimensions.accuracy < 7) {
      recommendations.push(
        'Verify information accuracy against authoritative sources',
      );
    }

    if (dimensions.completeness < 6) {
      recommendations.push('Provide more comprehensive and detailed responses');
    }

    if (dimensions.clarity < 7) {
      recommendations.push(
        'Improve response clarity with better structure and simpler language',
      );
    }

    if (dimensions.helpfulness < 6) {
      recommendations.push(
        'Include more practical examples and actionable guidance',
      );
    }

    if (dimensions.appropriateness < 8) {
      recommendations.push(
        'Maintain appropriate academic tone and supportive language',
      );
    }

    // Issue-based recommendations
    const criticalIssues = issues.filter((i) => i.type === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(
        'Address critical issues immediately to prevent poor user experience',
      );
    }

    const majorIssues = issues.filter((i) => i.type === 'major');
    if (majorIssues.length > 2) {
      recommendations.push(
        'Multiple major issues detected - consider reviewing response generation process',
      );
    }
  }

  /**
   * Generate batch assessment report
   */
  private generateBatchReport(
    assessments: QualityAssessmentResult[],
  ): BatchAssessmentReport {
    if (assessments.length === 0) {
      return this.createEmptyReport();
    }

    const totalMessages = assessments.length;
    const averageQuality =
      assessments.reduce((sum, a) => sum + a.overallScore, 0) / totalMessages;

    // Quality distribution
    const qualityDistribution = {
      excellent: assessments.filter((a) => a.overallScore >= 8).length,
      good: assessments.filter((a) => a.overallScore >= 6 && a.overallScore < 8)
        .length,
      fair: assessments.filter((a) => a.overallScore >= 4 && a.overallScore < 6)
        .length,
      poor: assessments.filter((a) => a.overallScore < 4).length,
    };

    // Common issues
    const issueMap = new Map<string, number>();
    assessments.forEach((assessment) => {
      assessment.issues.forEach((issue) => {
        const key = `${issue.category}: ${issue.description}`;
        issueMap.set(key, (issueMap.get(key) || 0) + 1);
      });
    });

    const commonIssues = Array.from(issueMap.entries())
      .map(([issue, frequency]) => ({ issue, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Dimension averages
    const dimensionAverages: QualityDimensions = {
      relevance:
        assessments.reduce((sum, a) => sum + a.dimensions.relevance, 0) /
        totalMessages,
      accuracy:
        assessments.reduce((sum, a) => sum + a.dimensions.accuracy, 0) /
        totalMessages,
      completeness:
        assessments.reduce((sum, a) => sum + a.dimensions.completeness, 0) /
        totalMessages,
      clarity:
        assessments.reduce((sum, a) => sum + a.dimensions.clarity, 0) /
        totalMessages,
      helpfulness:
        assessments.reduce((sum, a) => sum + a.dimensions.helpfulness, 0) /
        totalMessages,
      appropriateness:
        assessments.reduce((sum, a) => sum + a.dimensions.appropriateness, 0) /
        totalMessages,
    };

    // Generate recommendations
    const recommendations: string[] = [];
    if (averageQuality < 6) {
      recommendations.push(
        'Overall response quality needs significant improvement',
      );
    }

    if (qualityDistribution.poor > totalMessages * 0.2) {
      recommendations.push(
        'High number of poor quality responses - review AI training data',
      );
    }

    if (
      commonIssues.length > 0 &&
      commonIssues[0].frequency > totalMessages * 0.3
    ) {
      recommendations.push(
        `Address most common issue: ${commonIssues[0].issue}`,
      );
    }

    return {
      totalMessages,
      averageQuality,
      qualityDistribution,
      commonIssues,
      recommendations,
      dimensionAverages,
    };
  }

  /**
   * Create empty report for no data scenarios
   */
  private createEmptyReport(): BatchAssessmentReport {
    return {
      totalMessages: 0,
      averageQuality: 0,
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      commonIssues: [],
      recommendations: ['No messages found for assessment'],
      dimensionAverages: {
        relevance: 0,
        accuracy: 0,
        completeness: 0,
        clarity: 0,
        helpfulness: 0,
        appropriateness: 0,
      },
    };
  }

  // Helper methods for content analysis

  private async getPreviousUserQuery(
    message: ConversationMessage,
  ): Promise<ConversationMessage | undefined> {
    return (
      (await this.messageRepository.findOne({
        where: {
          conversationId: message.conversationId,
          type: MessageType.USER_QUERY,
        },
        order: { createdAt: 'DESC' },
      })) || undefined
    );
  }

  private extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            'this',
            'that',
            'with',
            'from',
            'they',
            'have',
            'been',
            'were',
            'said',
            'each',
            'which',
            'their',
            'time',
            'will',
            'about',
            'would',
            'there',
            'could',
            'other',
          ].includes(word),
      );
  }

  private isDirectQuestion(text: string): boolean {
    const questionWords = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
    ];
    const lowerText = text.toLowerCase();
    return (
      questionWords.some((word) => lowerText.includes(word)) ||
      text.includes('?')
    );
  }

  private providesDirectAnswer(text: string): boolean {
    const answerIndicators = [
      'here is',
      'the answer is',
      'you should',
      'you can',
      'to do this',
      'follow these',
    ];
    const lowerText = text.toLowerCase();
    return answerIndicators.some((indicator) => lowerText.includes(indicator));
  }

  private async checkKnowledgeConsistency(
    content: string,
  ): Promise<{ isConsistent: boolean; severityDeduction: number }> {
    // This would check against knowledge base entries for consistency
    // For now, return a default consistent result
    return { isConsistent: true, severityDeduction: 0 };
  }

  private hasGoodStructure(content: string): {
    hasList: boolean;
    hasHeadings: boolean;
    hasExamples: boolean;
  } {
    return {
      hasList: /^[\*\-\+\d+\.]\s/m.test(content),
      hasHeadings: /^#+\s/m.test(content) || /\*\*.*\*\*/.test(content),
      hasExamples: /example|for instance|such as|e\.g\./i.test(content),
    };
  }

  private hasActionableContent(content: string): boolean {
    const actionWords = [
      'should',
      'need to',
      'follow these steps',
      'you can',
      'try',
      'consider',
      'start by',
    ];
    const lowerContent = content.toLowerCase();
    return actionWords.some((word) => lowerContent.includes(word));
  }

  private requiresActionableResponse(query: string): boolean {
    const actionQueries = [
      'how to',
      'how do i',
      'what should i',
      'help me',
      'guide me',
    ];
    const lowerQuery = query.toLowerCase();
    return actionQueries.some((phrase) => lowerQuery.includes(phrase));
  }

  private countTechnicalJargon(content: string): number {
    const technicalTerms = [
      'algorithm',
      'framework',
      'methodology',
      'implementation',
      'architecture',
      'optimization',
      'scalability',
      'integration',
      'deployment',
      'configuration',
    ];
    const lowerContent = content.toLowerCase();
    return technicalTerms.reduce((count, term) => {
      return (
        count +
        (lowerContent.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length
      );
    }, 0);
  }

  private containsExamples(content: string): boolean {
    return /example|for instance|such as|e\.g\.|for example/i.test(content);
  }

  private containsStepByStep(content: string): boolean {
    return /step|steps|first|second|third|next|then|finally|\d+\./i.test(
      content,
    );
  }

  private containsResources(content: string): boolean {
    return /resource|link|reference|documentation|guide|tutorial|website/i.test(
      content,
    );
  }

  private containsEncouragement(content: string): boolean {
    return /good|great|excellent|well done|keep up|you can do|don't worry|it's normal/i.test(
      content,
    );
  }

  private containsFollowUp(content: string): boolean {
    return /would you like|need more|any questions|feel free|let me know|anything else/i.test(
      content,
    );
  }

  private isGenericResponse(content: string): boolean {
    const genericPhrases = [
      'i can help you with',
      'here are some general',
      'in general',
      'typically',
      'usually',
    ];
    const lowerContent = content.toLowerCase();
    return genericPhrases.some((phrase) => lowerContent.includes(phrase));
  }

  private hasAcademicTone(content: string): boolean {
    const academicIndicators = [
      'research',
      'analysis',
      'methodology',
      'literature',
      'academic',
      'scholarly',
      'peer-reviewed',
      'citation',
      'reference',
    ];
    const lowerContent = content.toLowerCase();
    return academicIndicators.some((indicator) =>
      lowerContent.includes(indicator),
    );
  }

  private offersToDoWork(content: string): boolean {
    const workOffers = [
      'i will write',
      'i can write',
      'let me write',
      "i'll do",
      'i can do',
      'i will complete',
      'i can complete',
    ];
    const lowerContent = content.toLowerCase();
    return workOffers.some((offer) => lowerContent.includes(offer));
  }
}
