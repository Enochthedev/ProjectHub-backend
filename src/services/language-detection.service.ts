import { Injectable, Logger } from '@nestjs/common';

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  supportedLanguages: string[];
  fallbackLanguage: string;
}

export interface LanguageDetectionOptions {
  fallbackLanguage?: string;
  minConfidence?: number;
  enableFallback?: boolean;
}

@Injectable()
export class LanguageDetectionService {
  private readonly logger = new Logger(LanguageDetectionService.name);

  // Supported languages with their common patterns
  private readonly supportedLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];
  private readonly defaultLanguage = 'en';
  private readonly minConfidenceThreshold = 0.6;

  // Language-specific patterns and keywords
  private readonly languagePatterns = {
    en: {
      commonWords: [
        'the',
        'and',
        'is',
        'in',
        'to',
        'of',
        'a',
        'that',
        'it',
        'with',
        'for',
        'as',
        'was',
        'on',
        'are',
        'you',
        'this',
        'be',
        'at',
        'have',
        'what',
        'how',
        'when',
        'where',
        'why',
        'who',
        'can',
        'will',
        'would',
        'should',
      ],
      patterns: [
        /\b(what|how|when|where|why|who)\b/i,
        /\b(is|are|am|was|were)\b/i,
        /\b(can|could|would|should|will)\b/i,
        /\b(the|and|or|but)\b/i,
      ],
      stopWords: [
        'the',
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
      ],
      uniqueWords: [
        'literature',
        'review',
        'methodology',
        'research',
        'analysis',
        'should',
        'structure',
      ],
    },
    es: {
      commonWords: [
        'el',
        'la',
        'de',
        'que',
        'y',
        'a',
        'en',
        'un',
        'es',
        'se',
        'no',
        'te',
        'lo',
        'le',
        'da',
        'su',
        'por',
        'son',
        'con',
        'para',
        'qué',
        'cómo',
        'cuándo',
        'dónde',
        'quién',
        'puede',
        'será',
      ],
      patterns: [
        /\b(qué|cómo|cuándo|dónde|por qué|quién)\b/i,
        /\b(es|son|está|están|era|fueron)\b/i,
        /\b(puede|podría|debería|será)\b/i,
        /\b(el|la|de|que)\b/i,
      ],
      stopWords: [
        'el',
        'la',
        'de',
        'que',
        'y',
        'a',
        'en',
        'un',
        'es',
        'se',
        'no',
        'te',
        'lo',
        'le',
      ],
      uniqueWords: [
        'literatura',
        'revisión',
        'metodología',
        'investigación',
        'análisis',
        'debe',
        'estructura',
      ],
    },
    fr: {
      commonWords: [
        'le',
        'de',
        'et',
        'à',
        'un',
        'il',
        'être',
        'en',
        'avoir',
        'que',
        'pour',
        'dans',
        'ce',
        'son',
        'une',
        'sur',
        'avec',
        'ne',
        'se',
        'comment',
        'quand',
        'où',
        'pourquoi',
        'qui',
        'peut',
        'sera',
      ],
      patterns: [
        /\b(qu'est-ce que|comment|quand|où|pourquoi|qui)\b/i,
        /\b(est|sont|était|étaient)\b/i,
        /\b(peut|pourrait|devrait|sera)\b/i,
        /\b(le|de|et|à)\b/i,
      ],
      stopWords: [
        'le',
        'de',
        'et',
        'à',
        'un',
        'il',
        'être',
        'en',
        'avoir',
        'que',
        'pour',
        'dans',
        'ce',
        'son',
      ],
      uniqueWords: [
        'littérature',
        'revue',
        'méthodologie',
        'recherche',
        'analyse',
        'devrait',
        'structure',
      ],
    },
    de: {
      commonWords: [
        'der',
        'die',
        'und',
        'in',
        'den',
        'von',
        'zu',
        'das',
        'mit',
        'sich',
        'des',
        'auf',
        'für',
        'ist',
        'im',
        'dem',
        'nicht',
        'ein',
        'eine',
        'als',
        'was',
        'wie',
        'wann',
        'wo',
        'warum',
        'wer',
        'kann',
        'wird',
      ],
      patterns: [
        /\b(was|wie|wann|wo|warum|wer)\b/i,
        /\b(ist|sind|war|waren)\b/i,
        /\b(kann|könnte|sollte|wird)\b/i,
        /\b(der|die|und|das)\b/i,
      ],
      stopWords: [
        'der',
        'die',
        'und',
        'in',
        'den',
        'von',
        'zu',
        'das',
        'mit',
        'sich',
        'des',
        'auf',
        'für',
      ],
      uniqueWords: [
        'literatur',
        'übersicht',
        'methodik',
        'forschung',
        'analyse',
        'sollte',
        'struktur',
      ],
    },
    pt: {
      commonWords: [
        'o',
        'de',
        'a',
        'e',
        'do',
        'da',
        'em',
        'um',
        'para',
        'é',
        'com',
        'não',
        'uma',
        'os',
        'no',
        'se',
        'na',
        'por',
        'mais',
        'as',
        'que',
        'como',
        'quando',
        'onde',
        'quem',
        'pode',
        'será',
      ],
      patterns: [
        /\b(o que|como|quando|onde|por que|quem)\b/i,
        /\b(é|são|estava|estavam)\b/i,
        /\b(pode|poderia|deveria|será)\b/i,
        /\b(o|de|a|e)\b/i,
      ],
      stopWords: [
        'o',
        'de',
        'a',
        'e',
        'do',
        'da',
        'em',
        'um',
        'para',
        'é',
        'com',
        'não',
        'uma',
        'os',
      ],
      uniqueWords: [
        'literatura',
        'revisão',
        'metodologia',
        'pesquisa',
        'análise',
        'deve',
        'estrutura',
      ],
    },
    it: {
      commonWords: [
        'il',
        'di',
        'che',
        'e',
        'la',
        'a',
        'per',
        'in',
        'un',
        'è',
        'sono',
        'si',
        'da',
        'con',
        'le',
        'su',
        'del',
        'al',
        'una',
        'nel',
        'cosa',
        'come',
        'quando',
        'dove',
        'perché',
        'chi',
        'può',
        'sarà',
      ],
      patterns: [
        /\b(cosa|come|quando|dove|perché|chi)\b/i,
        /\b(è|sono|era|erano)\b/i,
        /\b(può|potrebbe|dovrebbe|sarà)\b/i,
        /\b(il|di|che|e)\b/i,
      ],
      stopWords: [
        'il',
        'di',
        'che',
        'e',
        'la',
        'a',
        'per',
        'in',
        'un',
        'è',
        'sono',
        'si',
        'da',
        'con',
      ],
      uniqueWords: [
        'letteratura',
        'revisione',
        'metodologia',
        'ricerca',
        'analisi',
        'dovrebbe',
        'struttura',
      ],
    },
  };

  /**
   * Detect the language of the given text
   */
  async detectLanguage(
    text: string,
    options: LanguageDetectionOptions = {},
  ): Promise<LanguageDetectionResult> {
    const {
      fallbackLanguage = this.defaultLanguage,
      minConfidence = this.minConfidenceThreshold,
      enableFallback = true,
    } = options;

    this.logger.debug(
      `Detecting language for text: "${text.substring(0, 100)}..."`,
    );

    if (!text || text.trim().length === 0) {
      return {
        detectedLanguage: fallbackLanguage,
        confidence: 0,
        supportedLanguages: this.supportedLanguages,
        fallbackLanguage,
      };
    }

    // Normalize text for analysis
    const normalizedText = this.normalizeText(text);

    // Calculate scores for each supported language
    const languageScores = new Map<string, number>();

    for (const language of this.supportedLanguages) {
      const score = this.calculateLanguageScore(normalizedText, language);
      languageScores.set(language, score);
    }

    // Find the language with the highest score
    const sortedScores = Array.from(languageScores.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const [topLanguage, topScore] = sortedScores[0];

    // Determine if confidence is sufficient
    const confidence = Math.min(topScore, 1.0);
    const detectedLanguage =
      confidence >= minConfidence
        ? topLanguage
        : enableFallback
          ? fallbackLanguage
          : topLanguage;

    this.logger.debug(
      `Language detection result: ${detectedLanguage} (confidence: ${confidence.toFixed(2)})`,
    );

    return {
      detectedLanguage,
      confidence,
      supportedLanguages: this.supportedLanguages,
      fallbackLanguage,
    };
  }

  /**
   * Validate if a language code is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    return this.supportedLanguages.includes(languageCode.toLowerCase());
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.supportedLanguages];
  }

  /**
   * Get language name from code
   */
  getLanguageName(languageCode: string): string {
    const languageNames = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      pt: 'Portuguese',
      it: 'Italian',
    };

    return languageNames[languageCode.toLowerCase()] || 'Unknown';
  }

  /**
   * Normalize text for language detection
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate language score based on patterns and common words
   */
  private calculateLanguageScore(text: string, language: string): number {
    const patterns = this.languagePatterns[language];
    if (!patterns) {
      return 0;
    }

    const words = text.split(/\s+/);
    const totalWords = words.length;

    if (totalWords === 0) {
      return 0;
    }

    let score = 0;
    let matches = 0;

    // Score based on common words (higher weight)
    const commonWordMatches = words.filter((word) =>
      patterns.commonWords.includes(word),
    ).length;

    const commonWordScore = (commonWordMatches / totalWords) * 0.5;
    score += commonWordScore;

    // Score based on language-specific patterns
    let patternMatches = 0;
    for (const pattern of patterns.patterns) {
      const patternMatchCount = (text.match(pattern) || []).length;
      patternMatches += patternMatchCount;
    }

    const patternScore = Math.min(
      (patternMatches / Math.max(totalWords * 0.1, 1)) * 0.3,
      0.3,
    );
    score += patternScore;

    // Bonus for stop words (very language-specific)
    const stopWordMatches = words.filter((word) =>
      patterns.stopWords.includes(word),
    ).length;

    const stopWordScore = Math.min((stopWordMatches / totalWords) * 0.2, 0.2);
    score += stopWordScore;

    // Bonus for unique language words
    if (patterns.uniqueWords) {
      const uniqueWordMatches = words.filter((word) =>
        patterns.uniqueWords.some(
          (unique) =>
            word.toLowerCase().includes(unique.toLowerCase()) ||
            unique.toLowerCase().includes(word.toLowerCase()),
        ),
      ).length;

      const uniqueWordScore = Math.min(
        (uniqueWordMatches / totalWords) * 0.4,
        0.4,
      );
      score += uniqueWordScore;
    }

    // Penalty for very short texts (less reliable)
    if (totalWords < 5) {
      score *= 0.8;
    }

    // Boost for longer texts with consistent patterns
    if (totalWords > 10 && commonWordMatches > 2) {
      score *= 1.1;
    }

    this.logger.debug(
      `Language ${language} score: ${score.toFixed(3)} (common: ${commonWordScore.toFixed(3)}, pattern: ${patternScore.toFixed(3)}, stop: ${stopWordScore.toFixed(3)})`,
    );

    return Math.min(score, 1.0);
  }

  /**
   * Detect language with fallback chain
   */
  async detectLanguageWithFallback(
    text: string,
    preferredLanguage?: string,
    userLanguage?: string,
  ): Promise<LanguageDetectionResult> {
    // Try detection with preferred language as fallback
    if (preferredLanguage && this.isLanguageSupported(preferredLanguage)) {
      const result = await this.detectLanguage(text, {
        fallbackLanguage: preferredLanguage,
        minConfidence: 0.5,
      });

      if (result.confidence >= 0.5) {
        return result;
      }
    }

    // Try detection with user's language as fallback
    if (userLanguage && this.isLanguageSupported(userLanguage)) {
      const result = await this.detectLanguage(text, {
        fallbackLanguage: userLanguage,
        minConfidence: 0.4,
      });

      if (result.confidence >= 0.4) {
        return result;
      }
    }

    // Final fallback to default language
    return this.detectLanguage(text, {
      fallbackLanguage: this.defaultLanguage,
      minConfidence: 0.3,
    });
  }

  /**
   * Batch language detection for multiple texts
   */
  async detectLanguageBatch(
    texts: string[],
    options: LanguageDetectionOptions = {},
  ): Promise<LanguageDetectionResult[]> {
    const results: LanguageDetectionResult[] = [];

    for (const text of texts) {
      const result = await this.detectLanguage(text, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Get language statistics for a text
   */
  async getLanguageStatistics(text: string): Promise<{
    detectedLanguage: string;
    confidence: number;
    allScores: Record<string, number>;
    wordCount: number;
    characterCount: number;
  }> {
    const normalizedText = this.normalizeText(text);
    const words = normalizedText.split(/\s+/);

    const allScores: Record<string, number> = {};

    for (const language of this.supportedLanguages) {
      allScores[language] = this.calculateLanguageScore(
        normalizedText,
        language,
      );
    }

    const detectionResult = await this.detectLanguage(text);

    return {
      detectedLanguage: detectionResult.detectedLanguage,
      confidence: detectionResult.confidence,
      allScores,
      wordCount: words.length,
      characterCount: text.length,
    };
  }
}
