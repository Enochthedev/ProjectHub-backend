import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  normalizedScore: number;
  qualityScore: number;
  issues: ValidationIssue[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: ValidationIssueType;
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: any;
}

export enum ValidationIssueType {
  LOW_CONFIDENCE = 'low_confidence',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  ACADEMIC_INTEGRITY = 'academic_integrity',
  INCOMPLETE_ANSWER = 'incomplete_answer',
  FACTUAL_INCONSISTENCY = 'factual_inconsistency',
  LANGUAGE_QUALITY = 'language_quality',
  RELEVANCE = 'relevance',
}

export interface ResponseQualityMetrics {
  confidence: number;
  relevance: number;
  completeness: number;
  clarity: number;
  academicAppropriate: number;
  overall: number;
}

@Injectable()
export class AIResponseValidatorService {
  private readonly logger = new Logger(AIResponseValidatorService.name);
  private readonly config: {
    confidenceThreshold: number;
    qualityThreshold: number;
    maxAnswerLength: number;
    minAnswerLength: number;
    inappropriateKeywords: string[];
    academicIntegrityKeywords: string[];
  };

  constructor(private readonly configService: ConfigService) {
    this.config = {
      confidenceThreshold:
        this.configService.get<number>('huggingFace.qaConfidenceThreshold') ||
        0.3,
      qualityThreshold: 0.6,
      maxAnswerLength:
        this.configService.get<number>('huggingFace.qaMaxAnswerLength') || 200,
      minAnswerLength: 10,
      inappropriateKeywords: [
        'hack',
        'cheat',
        'plagiarize',
        'copy',
        'steal',
        'illegal',
        'unethical',
        'inappropriate',
      ],
      academicIntegrityKeywords: [
        'do my homework',
        'write my assignment',
        'complete my project',
        'give me the answer',
        'solve this for me',
      ],
    };
  }

  /**
   * Validate AI response with comprehensive quality assessment
   */
  async validateResponse(
    answer: string,
    question: string,
    context: string,
    rawConfidence: number,
  ): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Normalize confidence score
    const normalizedScore = this.normalizeConfidenceScore(rawConfidence);

    // Check confidence threshold
    if (normalizedScore < this.config.confidenceThreshold) {
      issues.push({
        type: ValidationIssueType.LOW_CONFIDENCE,
        severity: 'high',
        message: `Response confidence (${normalizedScore.toFixed(2)}) below threshold (${this.config.confidenceThreshold})`,
        details: {
          confidence: normalizedScore,
          threshold: this.config.confidenceThreshold,
        },
      });
      recommendations.push(
        'Consider using fallback templates or requesting human assistance',
      );
    }

    // Validate answer content
    const contentValidation = this.validateAnswerContent(answer, question);
    issues.push(...contentValidation.issues);
    recommendations.push(...contentValidation.recommendations);

    // Check for inappropriate content
    const inappropriateCheck = this.checkInappropriateContent(answer, question);
    if (inappropriateCheck.hasIssues) {
      issues.push(...inappropriateCheck.issues);
      recommendations.push(...inappropriateCheck.recommendations);
    }

    // Check academic integrity
    const academicCheck = this.checkAcademicIntegrity(answer, question);
    if (academicCheck.hasIssues) {
      issues.push(...academicCheck.issues);
      recommendations.push(...academicCheck.recommendations);
    }

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(
      answer,
      question,
      context,
      normalizedScore,
    );

    // Determine overall validity
    const isValid = this.determineValidity(
      normalizedScore,
      qualityMetrics,
      issues,
    );

    return {
      isValid,
      confidenceScore: rawConfidence,
      normalizedScore,
      qualityScore: qualityMetrics.overall,
      issues,
      recommendations: [...new Set(recommendations)], // Remove duplicates
    };
  }

  /**
   * Normalize confidence score to 0-1 range
   */
  normalizeConfidenceScore(rawScore: number): number {
    // Ensure score is between 0 and 1
    const normalized = Math.max(0, Math.min(1, rawScore));

    // Apply sigmoid-like transformation for better distribution
    // This helps distinguish between very low and moderate confidence scores
    return 1 / (1 + Math.exp(-10 * (normalized - 0.5)));
  }

  /**
   * Calculate comprehensive quality metrics
   */
  calculateQualityMetrics(
    answer: string,
    question: string,
    context: string,
    confidence: number,
  ): ResponseQualityMetrics {
    const relevance = this.calculateRelevanceScore(answer, question);
    const completeness = this.calculateCompletenessScore(answer, question);
    const clarity = this.calculateClarityScore(answer);
    const academicAppropriate =
      this.calculateAcademicAppropriatenessScore(answer);

    // Weighted average for overall score
    const overall =
      confidence * 0.3 +
      relevance * 0.25 +
      completeness * 0.2 +
      clarity * 0.15 +
      academicAppropriate * 0.1;

    return {
      confidence,
      relevance,
      completeness,
      clarity,
      academicAppropriate,
      overall,
    };
  }

  /**
   * Validate answer content structure and quality
   */
  private validateAnswerContent(
    answer: string,
    question: string,
  ): {
    issues: ValidationIssue[];
    recommendations: string[];
  } {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Check answer length
    if (answer.length < this.config.minAnswerLength) {
      issues.push({
        type: ValidationIssueType.INCOMPLETE_ANSWER,
        severity: 'high',
        message: `Answer too short (${answer.length} characters, minimum ${this.config.minAnswerLength})`,
        details: {
          length: answer.length,
          minimum: this.config.minAnswerLength,
        },
      });
      recommendations.push(
        'Provide more detailed explanation or use fallback content',
      );
    }

    if (answer.length > this.config.maxAnswerLength) {
      issues.push({
        type: ValidationIssueType.INCOMPLETE_ANSWER,
        severity: 'medium',
        message: `Answer too long (${answer.length} characters, maximum ${this.config.maxAnswerLength})`,
        details: {
          length: answer.length,
          maximum: this.config.maxAnswerLength,
        },
      });
      recommendations.push(
        'Consider summarizing the response or breaking it into parts',
      );
    }

    // Check for empty or meaningless responses
    const meaningfulWords = answer
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 &&
          !['the', 'and', 'but', 'for', 'are', 'with'].includes(
            word.toLowerCase(),
          ),
      );

    if (meaningfulWords.length < 3) {
      issues.push({
        type: ValidationIssueType.INCOMPLETE_ANSWER,
        severity: 'high',
        message: 'Answer lacks meaningful content',
        details: { meaningfulWords: meaningfulWords.length },
      });
      recommendations.push(
        'Use fallback templates or request human assistance',
      );
    }

    return { issues, recommendations };
  }

  /**
   * Check for inappropriate content
   */
  private checkInappropriateContent(
    answer: string,
    question: string,
  ): {
    hasIssues: boolean;
    issues: ValidationIssue[];
    recommendations: string[];
  } {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    const lowerAnswer = answer.toLowerCase();
    const lowerQuestion = question.toLowerCase();

    // Check for inappropriate keywords
    const foundKeywords = this.config.inappropriateKeywords.filter(
      (keyword) =>
        lowerAnswer.includes(keyword) || lowerQuestion.includes(keyword),
    );

    if (foundKeywords.length > 0) {
      issues.push({
        type: ValidationIssueType.INAPPROPRIATE_CONTENT,
        severity: 'high',
        message: 'Response contains inappropriate content',
        details: { keywords: foundKeywords },
      });
      recommendations.push(
        'Block response and use appropriate fallback content',
      );
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      recommendations,
    };
  }

  /**
   * Check academic integrity concerns
   */
  private checkAcademicIntegrity(
    answer: string,
    question: string,
  ): {
    hasIssues: boolean;
    issues: ValidationIssue[];
    recommendations: string[];
  } {
    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];
    const lowerAnswer = answer.toLowerCase();
    const lowerQuestion = question.toLowerCase();

    // Check for academic integrity violations
    const foundViolations = this.config.academicIntegrityKeywords.filter(
      (keyword) => lowerQuestion.includes(keyword),
    );

    if (foundViolations.length > 0) {
      issues.push({
        type: ValidationIssueType.ACADEMIC_INTEGRITY,
        severity: 'high',
        message: 'Question may violate academic integrity policies',
        details: { violations: foundViolations },
      });
      recommendations.push(
        'Provide guidance on academic integrity instead of direct answers',
      );
    }

    // Check if answer provides direct solutions instead of guidance
    const directSolutionIndicators = [
      'here is the answer',
      'the solution is',
      'copy this code',
      'use this exactly',
      'here is your assignment',
    ];

    const foundIndicators = directSolutionIndicators.filter((indicator) =>
      lowerAnswer.includes(indicator),
    );

    if (foundIndicators.length > 0) {
      issues.push({
        type: ValidationIssueType.ACADEMIC_INTEGRITY,
        severity: 'medium',
        message: 'Response may provide direct solutions instead of guidance',
        details: { indicators: foundIndicators },
      });
      recommendations.push(
        'Modify response to provide guidance rather than direct solutions',
      );
    }

    return {
      hasIssues: issues.length > 0,
      issues,
      recommendations,
    };
  }

  /**
   * Calculate relevance score based on keyword overlap
   */
  private calculateRelevanceScore(answer: string, question: string): number {
    const questionWords = this.extractKeywords(question);
    const answerWords = this.extractKeywords(answer);

    if (questionWords.length === 0) return 0.5; // Default for empty question

    const overlap = questionWords.filter((word) =>
      answerWords.includes(word),
    ).length;
    return Math.min(1, overlap / questionWords.length);
  }

  /**
   * Calculate completeness score based on answer structure
   */
  private calculateCompletenessScore(answer: string, question: string): number {
    let score = 0.5; // Base score

    // Check for structured elements
    if (answer.includes('.') || answer.includes('!') || answer.includes('?')) {
      score += 0.2; // Has proper punctuation
    }

    // Check for explanatory elements
    if (
      answer.includes('because') ||
      answer.includes('therefore') ||
      answer.includes('however')
    ) {
      score += 0.2; // Has explanatory connectors
    }

    // Check for examples or elaboration
    if (
      answer.includes('example') ||
      answer.includes('such as') ||
      answer.includes('for instance')
    ) {
      score += 0.1; // Provides examples
    }

    return Math.min(1, score);
  }

  /**
   * Calculate clarity score based on readability
   */
  private calculateClarityScore(answer: string): number {
    const sentences = answer.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    if (sentences.length === 0) return 0;

    // Average sentence length (optimal around 15-20 words)
    const avgSentenceLength = answer.split(/\s+/).length / sentences.length;
    const lengthScore =
      avgSentenceLength > 30 ? 0.3 : avgSentenceLength < 5 ? 0.5 : 0.8;

    // Check for clear structure
    const structureScore = sentences.length > 1 ? 0.2 : 0.1;

    return Math.min(1, lengthScore + structureScore);
  }

  /**
   * Calculate academic appropriateness score
   */
  private calculateAcademicAppropriatenessScore(answer: string): number {
    let score = 0.7; // Base score

    // Check for academic language
    const academicIndicators = [
      'research',
      'study',
      'analysis',
      'methodology',
      'literature',
      'evidence',
      'findings',
      'conclusion',
      'hypothesis',
      'theory',
    ];

    const foundIndicators = academicIndicators.filter((indicator) =>
      answer.toLowerCase().includes(indicator),
    ).length;

    score += Math.min(0.3, foundIndicators * 0.05);

    return Math.min(1, score);
  }

  /**
   * Extract meaningful keywords from text
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Determine overall validity based on all factors
   */
  private determineValidity(
    confidence: number,
    quality: ResponseQualityMetrics,
    issues: ValidationIssue[],
  ): boolean {
    // High severity issues make response invalid
    const hasHighSeverityIssues = issues.some(
      (issue) => issue.severity === 'high',
    );
    if (hasHighSeverityIssues) {
      return false;
    }

    // Check minimum thresholds
    const meetsConfidenceThreshold =
      confidence >= this.config.confidenceThreshold;
    const meetsQualityThreshold =
      quality.overall >= this.config.qualityThreshold;

    return meetsConfidenceThreshold && meetsQualityThreshold;
  }

  /**
   * Get validation configuration
   */
  getValidationConfig() {
    return { ...this.config };
  }

  /**
   * Update validation thresholds (for testing or admin configuration)
   */
  updateThresholds(confidenceThreshold?: number, qualityThreshold?: number) {
    if (confidenceThreshold !== undefined) {
      this.config.confidenceThreshold = Math.max(
        0,
        Math.min(1, confidenceThreshold),
      );
    }
    if (qualityThreshold !== undefined) {
      this.config.qualityThreshold = Math.max(0, Math.min(1, qualityThreshold));
    }

    this.logger.log(
      `Updated validation thresholds: confidence=${this.config.confidenceThreshold}, quality=${this.config.qualityThreshold}`,
    );
  }
}
