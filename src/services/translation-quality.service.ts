import { Injectable, Logger } from '@nestjs/common';

export interface TranslationQualityMetrics {
  overallScore: number;
  completeness: number;
  accuracy: number;
  fluency: number;
  consistency: number;
  culturalAdaptation: number;
}

export interface TranslationIssue {
  type: 'completeness' | 'accuracy' | 'fluency' | 'consistency' | 'cultural';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
  location?: {
    start: number;
    end: number;
  };
}

export interface TranslationQualityReport {
  metrics: TranslationQualityMetrics;
  issues: TranslationIssue[];
  recommendations: string[];
  isAcceptable: boolean;
  requiresReview: boolean;
}

export interface TranslationValidationOptions {
  strictMode?: boolean;
  checkCulturalAdaptation?: boolean;
  preserveFormatting?: boolean;
  academicContext?: boolean;
  minAcceptableScore?: number;
}

@Injectable()
export class TranslationQualityService {
  private readonly logger = new Logger(TranslationQualityService.name);

  // Academic terminology that should be preserved across languages
  private readonly academicTerms = {
    en: [
      'literature review',
      'methodology',
      'research question',
      'hypothesis',
      'data analysis',
      'conclusion',
      'bibliography',
      'abstract',
      'introduction',
      'supervisor',
    ],
    es: [
      'revisión de literatura',
      'metodología',
      'pregunta de investigación',
      'hipótesis',
      'análisis de datos',
      'conclusión',
      'bibliografía',
      'resumen',
      'introducción',
      'supervisor',
    ],
    fr: [
      'revue de littérature',
      'méthodologie',
      'question de recherche',
      'hypothèse',
      'analyse de données',
      'conclusion',
      'bibliographie',
      'résumé',
      'introduction',
      'superviseur',
    ],
    de: [
      'literaturübersicht',
      'methodik',
      'forschungsfrage',
      'hypothese',
      'datenanalyse',
      'schlussfolgerung',
      'bibliographie',
      'zusammenfassung',
      'einleitung',
      'betreuer',
    ],
    pt: [
      'revisão de literatura',
      'metodologia',
      'questão de pesquisa',
      'hipótese',
      'análise de dados',
      'conclusão',
      'bibliografia',
      'resumo',
      'introdução',
      'orientador',
    ],
    it: [
      'revisione della letteratura',
      'metodologia',
      'domanda di ricerca',
      'ipotesi',
      'analisi dei dati',
      'conclusione',
      'bibliografia',
      'riassunto',
      'introduzione',
      'supervisore',
    ],
  };

  // Common translation issues patterns
  private readonly issuePatterns = {
    untranslated: /\[UNTRANSLATED\]|\?\?\?|TODO|FIXME/gi,
    mixedLanguages:
      /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b[\s\w]*\b(el|la|de|que|y|a|en|un|es|se)\b|\b(el|la|de|que|y|a|en|un|es|se)\b[\s\w]*\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi,
    formatting: /\{\{[^}]*\}\}|\{[^}]*\}|\[[^\]]*\]|\([^)]*\)/g,
    academicInconsistency: /\b(lit review|lit\. review|literature rev\.)\b/gi,
    repetitiveWords: /\b(\w+)\s+\1\b/gi,
  };

  /**
   * Assess the quality of a translation
   */
  async assessTranslationQuality(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslationValidationOptions = {},
  ): Promise<TranslationQualityReport> {
    this.logger.debug(
      `Assessing translation quality from ${sourceLanguage} to ${targetLanguage}`,
    );

    const {
      strictMode = false,
      checkCulturalAdaptation = true,
      preserveFormatting = true,
      academicContext = true,
      minAcceptableScore = 0.7,
    } = options;

    const issues: TranslationIssue[] = [];
    const recommendations: string[] = [];

    // Calculate individual metrics
    const completeness = this.assessCompleteness(
      originalText,
      translatedText,
      issues,
    );
    const accuracy = this.assessAccuracy(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      issues,
      academicContext,
    );
    const fluency = this.assessFluency(translatedText, targetLanguage, issues);
    const consistency = this.assessConsistency(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      issues,
    );
    const culturalAdaptation = checkCulturalAdaptation
      ? this.assessCulturalAdaptation(
          originalText,
          translatedText,
          sourceLanguage,
          targetLanguage,
          issues,
        )
      : 1.0;

    // Calculate overall score with weights
    const weights = {
      completeness: 0.25,
      accuracy: 0.3,
      fluency: 0.25,
      consistency: 0.15,
      culturalAdaptation: 0.05,
    };

    const overallScore =
      completeness * weights.completeness +
      accuracy * weights.accuracy +
      fluency * weights.fluency +
      consistency * weights.consistency +
      culturalAdaptation * weights.culturalAdaptation;

    const metrics: TranslationQualityMetrics = {
      overallScore,
      completeness,
      accuracy,
      fluency,
      consistency,
      culturalAdaptation,
    };

    // Generate recommendations
    this.generateRecommendations(metrics, issues, recommendations, strictMode);

    const isAcceptable = overallScore >= minAcceptableScore;
    const requiresReview =
      overallScore < 0.8 ||
      issues.some((issue) => issue.severity === 'critical');

    return {
      metrics,
      issues,
      recommendations,
      isAcceptable,
      requiresReview,
    };
  }

  /**
   * Assess completeness of translation
   */
  private assessCompleteness(
    originalText: string,
    translatedText: string,
    issues: TranslationIssue[],
  ): number {
    const originalLength = originalText.trim().length;
    const translatedLength = translatedText.trim().length;

    if (originalLength === 0) {
      return translatedLength === 0 ? 1.0 : 0.0;
    }

    const lengthRatio = translatedLength / originalLength;

    // Check for significant length discrepancies
    if (lengthRatio < 0.5) {
      issues.push({
        type: 'completeness',
        severity: 'high',
        description: 'Translation appears significantly shorter than original',
        suggestion: 'Review for missing content or sections',
      });
      return 0.4;
    } else if (lengthRatio > 2.0) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: 'Translation appears significantly longer than original',
        suggestion: 'Review for unnecessary additions or verbosity',
      });
      return 0.7;
    }

    // Check for untranslated sections
    const untranslatedMatches = translatedText.match(
      this.issuePatterns.untranslated,
    );
    if (untranslatedMatches && untranslatedMatches.length > 0) {
      issues.push({
        type: 'completeness',
        severity: 'critical',
        description: 'Untranslated sections detected',
        suggestion: 'Complete all translations',
      });
      return 0.2;
    }

    // Calculate completeness score based on length ratio
    if (lengthRatio >= 0.7 && lengthRatio <= 1.5) {
      return 1.0;
    } else if (lengthRatio >= 0.6 && lengthRatio <= 1.8) {
      return 0.8;
    } else {
      return 0.6;
    }
  }

  /**
   * Assess accuracy of translation
   */
  private assessAccuracy(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    issues: TranslationIssue[],
    academicContext: boolean,
  ): number {
    let accuracyScore = 1.0;

    // Check for mixed languages
    const mixedLanguageMatches = translatedText.match(
      this.issuePatterns.mixedLanguages,
    );
    if (mixedLanguageMatches && mixedLanguageMatches.length > 0) {
      issues.push({
        type: 'accuracy',
        severity: 'high',
        description: 'Mixed languages detected in translation',
        suggestion: 'Ensure consistent use of target language',
      });
      accuracyScore -= 0.3;
    }

    // Check academic terminology preservation if in academic context
    if (academicContext) {
      const academicScore = this.checkAcademicTerminology(
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        issues,
      );
      accuracyScore = Math.min(accuracyScore, academicScore);
    }

    // Check for formatting preservation
    const originalFormatting =
      originalText.match(this.issuePatterns.formatting) || [];
    const translatedFormatting =
      translatedText.match(this.issuePatterns.formatting) || [];

    if (originalFormatting.length !== translatedFormatting.length) {
      issues.push({
        type: 'accuracy',
        severity: 'medium',
        description: 'Formatting elements not preserved in translation',
        suggestion: 'Ensure all placeholders and formatting are maintained',
      });
      accuracyScore -= 0.2;
    }

    return Math.max(accuracyScore, 0.0);
  }

  /**
   * Assess fluency of translation
   */
  private assessFluency(
    translatedText: string,
    targetLanguage: string,
    issues: TranslationIssue[],
  ): number {
    let fluencyScore = 1.0;

    // Check for obvious fluency issues using the pattern
    const repetitiveMatches = translatedText.match(
      this.issuePatterns.repetitiveWords,
    );
    if (repetitiveMatches && repetitiveMatches.length > 0) {
      issues.push({
        type: 'fluency',
        severity: 'medium',
        description: 'Repetitive word patterns detected',
        suggestion: 'Review for natural language flow',
      });
      fluencyScore -= 0.2;
    }

    // Check for very short sentences (might indicate poor fluency)
    const sentences = translatedText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const shortSentences = sentences.filter(
      (s) => s.trim().split(/\s+/).length < 3,
    );

    if (
      sentences.length > 0 &&
      shortSentences.length > sentences.length * 0.5
    ) {
      issues.push({
        type: 'fluency',
        severity: 'low',
        description: 'Many very short sentences detected',
        suggestion: 'Consider combining sentences for better flow',
      });
      fluencyScore -= 0.1;
    }

    // Check for excessive punctuation
    const punctuationDensity =
      translatedText.length > 0
        ? (translatedText.match(/[.,;:!?]/g) || []).length /
          translatedText.length
        : 0;
    if (punctuationDensity > 0.1) {
      issues.push({
        type: 'fluency',
        severity: 'low',
        description: 'High punctuation density detected',
        suggestion: 'Review punctuation usage for natural flow',
      });
      fluencyScore -= 0.1;
    }

    return Math.max(fluencyScore, 0.0);
  }

  /**
   * Assess consistency of translation
   */
  private assessConsistency(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    issues: TranslationIssue[],
  ): number {
    let consistencyScore = 1.0;

    // Check for inconsistent terminology
    const inconsistentTerms = this.findInconsistentTerminology(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
    );
    if (inconsistentTerms.length > 0) {
      issues.push({
        type: 'consistency',
        severity: 'medium',
        description: `Inconsistent terminology found: ${inconsistentTerms.join(', ')}`,
        suggestion: 'Use consistent translations for technical terms',
      });
      consistencyScore -= 0.3;
    }

    // Check for style consistency
    const originalStyle = this.analyzeTextStyle(originalText);
    const translatedStyle = this.analyzeTextStyle(translatedText);

    if (
      Math.abs(originalStyle.formalityScore - translatedStyle.formalityScore) >
      0.3
    ) {
      issues.push({
        type: 'consistency',
        severity: 'low',
        description: 'Style inconsistency between original and translation',
        suggestion: 'Maintain consistent formality level',
      });
      consistencyScore -= 0.2;
    }

    return Math.max(consistencyScore, 0.0);
  }

  /**
   * Assess cultural adaptation of translation
   */
  private assessCulturalAdaptation(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    issues: TranslationIssue[],
  ): number {
    let adaptationScore = 1.0;

    // Check for cultural references that might need adaptation
    const culturalReferences = this.findCulturalReferences(
      originalText,
      sourceLanguage,
    );
    if (culturalReferences.length > 0) {
      const adaptedReferences = this.checkCulturalAdaptation(
        translatedText,
        targetLanguage,
        culturalReferences,
      );

      if (adaptedReferences < culturalReferences.length * 0.5) {
        issues.push({
          type: 'cultural',
          severity: 'low',
          description: 'Some cultural references may need adaptation',
          suggestion:
            'Consider adapting cultural references for target audience',
        });
        adaptationScore -= 0.3;
      }
    }

    return Math.max(adaptationScore, 0.0);
  }

  /**
   * Check academic terminology preservation
   */
  private checkAcademicTerminology(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    issues: TranslationIssue[],
  ): number {
    const sourceTerms = this.academicTerms[sourceLanguage] || [];
    const targetTerms = this.academicTerms[targetLanguage] || [];

    if (sourceTerms.length === 0 || targetTerms.length === 0) {
      return 1.0; // No academic terms to check
    }

    let preservedTerms = 0;
    let totalTerms = 0;

    for (let i = 0; i < Math.min(sourceTerms.length, targetTerms.length); i++) {
      const sourceTerm = sourceTerms[i];
      const targetTerm = targetTerms[i];

      if (originalText.toLowerCase().includes(sourceTerm.toLowerCase())) {
        totalTerms++;
        if (translatedText.toLowerCase().includes(targetTerm.toLowerCase())) {
          preservedTerms++;
        }
      }
    }

    if (totalTerms === 0) {
      return 1.0;
    }

    const preservationRatio = preservedTerms / totalTerms;

    if (preservationRatio < 0.7) {
      issues.push({
        type: 'accuracy',
        severity: 'high',
        description: 'Academic terminology not properly preserved',
        suggestion: 'Ensure technical terms are correctly translated',
      });
    }

    return preservationRatio;
  }

  /**
   * Find inconsistent terminology
   */
  private findInconsistentTerminology(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): string[] {
    const inconsistentTerms: string[] = [];

    // Check for academic inconsistencies
    const academicInconsistencies = translatedText.match(
      this.issuePatterns.academicInconsistency,
    );
    if (academicInconsistencies) {
      inconsistentTerms.push(...academicInconsistencies);
    }

    return inconsistentTerms;
  }

  /**
   * Analyze text style
   */
  private analyzeTextStyle(text: string): {
    formalityScore: number;
    complexity: number;
  } {
    const words = text.toLowerCase().split(/\s+/);
    const totalWords = words.length;

    // Simple formality indicators
    const formalWords = [
      'therefore',
      'furthermore',
      'consequently',
      'moreover',
      'however',
      'nevertheless',
    ];
    const informalWords = [
      'really',
      'pretty',
      'quite',
      'very',
      'just',
      'actually',
    ];

    const formalCount = words.filter((word) =>
      formalWords.includes(word),
    ).length;
    const informalCount = words.filter((word) =>
      informalWords.includes(word),
    ).length;

    const formalityScore =
      totalWords > 0 ? (formalCount - informalCount) / totalWords + 0.5 : 0.5;

    // Simple complexity measure (average word length)
    const avgWordLength =
      words.reduce((sum, word) => sum + word.length, 0) / totalWords;
    const complexity = Math.min(avgWordLength / 10, 1.0);

    return {
      formalityScore: Math.max(0, Math.min(1, formalityScore)),
      complexity,
    };
  }

  /**
   * Find cultural references
   */
  private findCulturalReferences(text: string, language: string): string[] {
    // Simplified cultural reference detection
    const culturalPatterns = {
      en: /\b(university|college|semester|grade|GPA|professor|department)\b/gi,
      es: /\b(universidad|colegio|semestre|nota|profesor|departamento)\b/gi,
      fr: /\b(université|collège|semestre|note|professeur|département)\b/gi,
    };

    const pattern = culturalPatterns[language];
    if (!pattern) {
      return [];
    }

    return text.match(pattern) || [];
  }

  /**
   * Check cultural adaptation
   */
  private checkCulturalAdaptation(
    text: string,
    language: string,
    references: string[],
  ): number {
    // Simplified check - count how many references are adapted
    let adaptedCount = 0;

    for (const reference of references) {
      // Simple check if the reference appears to be adapted
      if (text.toLowerCase().includes(reference.toLowerCase())) {
        adaptedCount++;
      }
    }

    return adaptedCount;
  }

  /**
   * Generate recommendations based on assessment
   */
  private generateRecommendations(
    metrics: TranslationQualityMetrics,
    issues: TranslationIssue[],
    recommendations: string[],
    strictMode: boolean,
  ): void {
    const threshold = strictMode ? 0.9 : 0.7;

    if (metrics.completeness < threshold) {
      recommendations.push(
        'Review translation for completeness and missing content',
      );
    }

    if (metrics.accuracy < threshold) {
      recommendations.push(
        'Verify accuracy of technical terms and key concepts',
      );
    }

    if (metrics.fluency < threshold) {
      recommendations.push('Improve natural language flow and readability');
    }

    if (metrics.consistency < threshold) {
      recommendations.push(
        'Ensure consistent terminology throughout the translation',
      );
    }

    if (metrics.culturalAdaptation < threshold) {
      recommendations.push('Consider cultural adaptation for target audience');
    }

    // Add specific recommendations based on critical issues
    const criticalIssues = issues.filter(
      (issue) => issue.severity === 'critical',
    );
    if (criticalIssues.length > 0) {
      recommendations.push('Address critical issues before publication');
    }

    // Add general recommendations
    if (metrics.overallScore < 0.8) {
      recommendations.push('Consider professional review before publication');
    }

    if (issues.length > 5) {
      recommendations.push(
        'Multiple issues detected - comprehensive review recommended',
      );
    }
  }

  /**
   * Validate translation against quality standards
   */
  async validateTranslation(
    originalText: string,
    translatedText: string,
    sourceLanguage: string,
    targetLanguage: string,
    options: TranslationValidationOptions = {},
  ): Promise<{ isValid: boolean; report: TranslationQualityReport }> {
    const report = await this.assessTranslationQuality(
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      options,
    );

    const isValid =
      report.isAcceptable &&
      !report.issues.some((issue) => issue.severity === 'critical');

    return { isValid, report };
  }

  /**
   * Get supported languages for quality assessment
   */
  getSupportedLanguages(): string[] {
    return Object.keys(this.academicTerms);
  }

  /**
   * Check if language pair is supported
   */
  isLanguagePairSupported(
    sourceLanguage: string,
    targetLanguage: string,
  ): boolean {
    return (
      this.getSupportedLanguages().includes(sourceLanguage) &&
      this.getSupportedLanguages().includes(targetLanguage)
    );
  }
}
