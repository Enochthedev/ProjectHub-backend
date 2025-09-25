import { Injectable, Logger } from '@nestjs/common';
import { StudentProfile } from '../entities/student-profile.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { Project } from '../entities/project.entity';

export interface ProcessedText {
  text: string;
  tokens: string[];
  wordCount: number;
  characterCount: number;
  processedAt: Date;
}

export interface StudentProfileText {
  combined: ProcessedText;
  skills: ProcessedText;
  interests: ProcessedText;
  specializations: ProcessedText;
  metadata: {
    profileId: string;
    currentYear?: number;
    gpa?: number;
  };
}

export interface ProjectText {
  combined: ProcessedText;
  title: ProcessedText;
  abstract: ProcessedText;
  tags: ProcessedText;
  technologyStack: ProcessedText;
  metadata: {
    projectId: string;
    specialization: string;
    difficultyLevel: string;
    year: number;
    isGroupProject: boolean;
  };
}

export interface SupervisorText {
  combined: ProcessedText;
  specializations: ProcessedText;
  metadata: {
    supervisorId: string;
    maxStudents: number;
    isAvailable: boolean;
  };
}

export interface TextProcessingOptions {
  removeStopWords?: boolean;
  stemWords?: boolean;
  normalizeCase?: boolean;
  removeSpecialChars?: boolean;
  minWordLength?: number;
  maxWordLength?: number;
  includeMetadata?: boolean;
}

@Injectable()
export class TextProcessingService {
  private readonly logger = new Logger(TextProcessingService.name);

  // Common stop words to remove
  private readonly stopWords = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'for',
    'from',
    'has',
    'he',
    'in',
    'is',
    'it',
    'its',
    'of',
    'on',
    'that',
    'the',
    'to',
    'was',
    'will',
    'with',
    'would',
    'could',
    'should',
    'may',
    'might',
    'can',
    'must',
    'shall',
    'this',
    'these',
    'those',
    'they',
    'them',
    'their',
    'there',
    'where',
    'when',
    'what',
    'who',
    'how',
    'why',
    'which',
    'while',
    'during',
    'before',
    'after',
    'above',
    'below',
    'up',
    'down',
    'out',
    'off',
    'over',
    'under',
    'again',
    'further',
    'then',
    'once',
  ]);

  // Default processing options
  private readonly defaultOptions: TextProcessingOptions = {
    removeStopWords: true,
    stemWords: false,
    normalizeCase: true,
    removeSpecialChars: true,
    minWordLength: 2,
    maxWordLength: 50,
    includeMetadata: true,
  };

  /**
   * Process student profile for embedding generation
   */
  processStudentProfile(
    profile: StudentProfile,
    options: TextProcessingOptions = {},
  ): StudentProfileText {
    const opts = { ...this.defaultOptions, ...options };

    this.logger.debug(`Processing student profile: ${profile.id}`);

    // Process individual components
    const skills = this.processTextArray(profile.skills || [], opts);
    const interests = this.processTextArray(profile.interests || [], opts);
    const specializations = this.processTextArray(
      profile.preferredSpecializations || [],
      opts,
    );

    // Create weighted combined text
    const combinedText = this.createWeightedStudentText(profile, opts);
    const combined = this.processText(combinedText, opts);

    return {
      combined,
      skills,
      interests,
      specializations,
      metadata: {
        profileId: profile.id,
        currentYear: profile.currentYear || undefined,
        gpa: profile.gpa ? Number(profile.gpa) : undefined,
      },
    };
  }

  /**
   * Process project for embedding generation
   */
  processProject(
    project: Project,
    options: TextProcessingOptions = {},
  ): ProjectText {
    const opts = { ...this.defaultOptions, ...options };

    this.logger.debug(`Processing project: ${project.id}`);

    // Process individual components
    const title = this.processText(project.title || '', opts);
    const abstract = this.processText(project.abstract || '', opts);
    const tags = this.processTextArray(project.tags || [], opts);
    const technologyStack = this.processTextArray(
      project.technologyStack || [],
      opts,
    );

    // Create weighted combined text
    const combinedText = this.createWeightedProjectText(project, opts);
    const combined = this.processText(combinedText, opts);

    return {
      combined,
      title,
      abstract,
      tags,
      technologyStack,
      metadata: {
        projectId: project.id,
        specialization: project.specialization,
        difficultyLevel: project.difficultyLevel,
        year: project.year,
        isGroupProject: project.isGroupProject,
      },
    };
  }

  /**
   * Process supervisor profile for embedding generation
   */
  processSupervisorProfile(
    profile: SupervisorProfile,
    options: TextProcessingOptions = {},
  ): SupervisorText {
    const opts = { ...this.defaultOptions, ...options };

    this.logger.debug(`Processing supervisor profile: ${profile.id}`);

    // Process specializations
    const specializations = this.processTextArray(
      profile.specializations || [],
      opts,
    );

    // Create combined text (mainly specializations for supervisors)
    const combinedText = (profile.specializations || []).join(' ');
    const combined = this.processText(combinedText, opts);

    return {
      combined,
      specializations,
      metadata: {
        supervisorId: profile.id,
        maxStudents: profile.maxStudents,
        isAvailable: profile.isAvailable,
      },
    };
  }

  /**
   * Process a single text string
   */
  processText(
    text: string,
    options: TextProcessingOptions = {},
  ): ProcessedText {
    const opts = { ...this.defaultOptions, ...options };

    if (!text || typeof text !== 'string') {
      return this.createEmptyProcessedText();
    }

    let processedText = text;

    // Normalize case
    if (opts.normalizeCase) {
      processedText = processedText.toLowerCase();
    }

    // Remove special characters
    if (opts.removeSpecialChars) {
      processedText = processedText.replace(/[^\w\s.-]/g, ' ');
    }

    // Normalize whitespace
    processedText = processedText.replace(/\s+/g, ' ').trim();

    // Tokenize
    let tokens = processedText.split(/\s+/).filter((token) => token.length > 0);

    // Apply word length filters
    if (opts.minWordLength || opts.maxWordLength) {
      tokens = tokens.filter((token) => {
        const length = token.length;
        const minOk = !opts.minWordLength || length >= opts.minWordLength;
        const maxOk = !opts.maxWordLength || length <= opts.maxWordLength;
        return minOk && maxOk;
      });
    }

    // Remove stop words
    if (opts.removeStopWords) {
      tokens = tokens.filter((token) => !this.stopWords.has(token));
    }

    // Stem words (simple stemming)
    if (opts.stemWords) {
      tokens = tokens.map((token) => this.simpleStem(token));
    }

    // Reconstruct text from processed tokens
    const finalText = tokens.join(' ');

    return {
      text: finalText,
      tokens,
      wordCount: tokens.length,
      characterCount: finalText.length,
      processedAt: new Date(),
    };
  }

  /**
   * Process an array of text strings
   */
  processTextArray(
    textArray: string[],
    options: TextProcessingOptions = {},
  ): ProcessedText {
    if (!textArray || textArray.length === 0) {
      return this.createEmptyProcessedText();
    }

    const combinedText = textArray.join(' ');
    return this.processText(combinedText, options);
  }

  /**
   * Create weighted text for student profile
   */
  private createWeightedStudentText(
    profile: StudentProfile,
    options: TextProcessingOptions,
  ): string {
    const parts: string[] = [];

    // Skills (high weight - repeat 3 times)
    if (profile.skills && profile.skills.length > 0) {
      const skillsText = profile.skills.join(' ');
      parts.push(skillsText, skillsText, skillsText);
    }

    // Interests (medium weight - repeat 2 times)
    if (profile.interests && profile.interests.length > 0) {
      const interestsText = profile.interests.join(' ');
      parts.push(interestsText, interestsText);
    }

    // Preferred specializations (high weight - repeat 3 times)
    if (
      profile.preferredSpecializations &&
      profile.preferredSpecializations.length > 0
    ) {
      const specializationsText = profile.preferredSpecializations.join(' ');
      parts.push(specializationsText, specializationsText, specializationsText);
    }

    // Add metadata context if enabled
    if (options.includeMetadata) {
      if (profile.currentYear) {
        parts.push(`year ${profile.currentYear}`);
      }
      if (profile.gpa && profile.gpa > 0) {
        const gpaCategory =
          Number(profile.gpa) >= 3.5 ? 'high achiever' : 'student';
        parts.push(gpaCategory);
      }
    }

    return parts.join(' ');
  }

  /**
   * Create weighted text for project
   */
  private createWeightedProjectText(
    project: Project,
    options: TextProcessingOptions,
  ): string {
    const parts: string[] = [];

    // Title (highest weight - repeat 4 times)
    if (project.title) {
      parts.push(project.title, project.title, project.title, project.title);
    }

    // Abstract (high weight - repeat 2 times)
    if (project.abstract) {
      parts.push(project.abstract, project.abstract);
    }

    // Specialization (high weight - repeat 3 times)
    if (project.specialization) {
      parts.push(
        project.specialization,
        project.specialization,
        project.specialization,
      );
    }

    // Tags (medium weight - repeat 2 times)
    if (project.tags && project.tags.length > 0) {
      const tagsText = project.tags.join(' ');
      parts.push(tagsText, tagsText);
    }

    // Technology stack (medium weight - repeat 2 times)
    if (project.technologyStack && project.technologyStack.length > 0) {
      const techText = project.technologyStack.join(' ');
      parts.push(techText, techText);
    }

    // Add metadata context if enabled
    if (options.includeMetadata) {
      parts.push(project.difficultyLevel);
      if (project.isGroupProject) {
        parts.push('group project team collaboration');
      } else {
        parts.push('individual project');
      }
    }

    return parts.join(' ');
  }

  /**
   * Simple stemming algorithm (removes common suffixes)
   */
  private simpleStem(word: string): string {
    if (word.length <= 3) {
      return word;
    }

    // Common suffixes to remove
    const suffixes = [
      'ing',
      'ed',
      'er',
      'est',
      'ly',
      'ion',
      'tion',
      'ness',
      'ment',
    ];

    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }

    return word;
  }

  /**
   * Create empty processed text object
   */
  private createEmptyProcessedText(): ProcessedText {
    return {
      text: '',
      tokens: [],
      wordCount: 0,
      characterCount: 0,
      processedAt: new Date(),
    };
  }

  /**
   * Extract keywords from processed text
   */
  extractKeywords(
    processedText: ProcessedText,
    maxKeywords: number = 10,
  ): string[] {
    if (!processedText.tokens || processedText.tokens.length === 0) {
      return [];
    }

    // Count word frequencies
    const wordFreq = new Map<string, number>();
    for (const token of processedText.tokens) {
      wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    }

    // Sort by frequency and return top keywords
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Calculate text similarity based on keyword overlap
   */
  calculateKeywordSimilarity(
    text1: ProcessedText,
    text2: ProcessedText,
  ): number {
    const keywords1 = new Set(this.extractKeywords(text1, 20));
    const keywords2 = new Set(this.extractKeywords(text2, 20));

    if (keywords1.size === 0 && keywords2.size === 0) {
      return 1.0;
    }

    if (keywords1.size === 0 || keywords2.size === 0) {
      return 0.0;
    }

    // Calculate Jaccard similarity
    const intersection = new Set(
      [...keywords1].filter((x) => keywords2.has(x)),
    );
    const union = new Set([...keywords1, ...keywords2]);

    return intersection.size / union.size;
  }

  /**
   * Validate processed text quality
   */
  validateProcessedText(processedText: ProcessedText): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check if text is too short
    if (processedText.wordCount < 3) {
      issues.push('Text is too short (less than 3 words)');
      suggestions.push('Add more descriptive content');
    }

    // Check if text is too long
    if (processedText.wordCount > 200) {
      issues.push('Text is very long (more than 200 words)');
      suggestions.push('Consider summarizing or splitting the content');
    }

    // Check for repeated words
    const uniqueWords = new Set(processedText.tokens);
    const repetitionRatio = uniqueWords.size / processedText.tokens.length;
    if (repetitionRatio < 0.5) {
      issues.push('High word repetition detected');
      suggestions.push('Add more diverse vocabulary');
    }

    // Check for very short words
    const shortWords = processedText.tokens.filter(
      (token) => token.length <= 2,
    );
    if (shortWords.length > processedText.tokens.length * 0.3) {
      issues.push('Many very short words detected');
      suggestions.push('Use more descriptive terms');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Get text processing statistics
   */
  getProcessingStats(processedTexts: ProcessedText[]): {
    totalTexts: number;
    averageWordCount: number;
    averageCharCount: number;
    totalTokens: number;
    uniqueTokens: number;
    mostCommonTokens: Array<{ token: string; count: number }>;
  } {
    if (processedTexts.length === 0) {
      return {
        totalTexts: 0,
        averageWordCount: 0,
        averageCharCount: 0,
        totalTokens: 0,
        uniqueTokens: 0,
        mostCommonTokens: [],
      };
    }

    const totalWordCount = processedTexts.reduce(
      (sum, text) => sum + text.wordCount,
      0,
    );
    const totalCharCount = processedTexts.reduce(
      (sum, text) => sum + text.characterCount,
      0,
    );

    // Count all tokens
    const tokenFreq = new Map<string, number>();
    let totalTokens = 0;

    for (const text of processedTexts) {
      for (const token of text.tokens) {
        tokenFreq.set(token, (tokenFreq.get(token) || 0) + 1);
        totalTokens++;
      }
    }

    const mostCommonTokens = Array.from(tokenFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([token, count]) => ({ token, count }));

    return {
      totalTexts: processedTexts.length,
      averageWordCount: totalWordCount / processedTexts.length,
      averageCharCount: totalCharCount / processedTexts.length,
      totalTokens,
      uniqueTokens: tokenFreq.size,
      mostCommonTokens,
    };
  }
}
