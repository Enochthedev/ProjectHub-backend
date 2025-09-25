import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseEntry, ResponseTemplate } from '@/entities';

export interface ContentValidationResult {
  isValid: boolean;
  score: number;
  issues: ContentIssue[];
  suggestions: string[];
}

export interface ContentIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  severity: number; // 1-10, 10 being most severe
}

export interface ContentQualityMetrics {
  readabilityScore: number;
  completenessScore: number;
  accuracyScore: number;
  relevanceScore: number;
  overallScore: number;
}

@Injectable()
export class KnowledgeContentValidatorService {
  private readonly logger = new Logger(KnowledgeContentValidatorService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
  ) {}

  /**
   * Validate knowledge base entry content
   */
  async validateKnowledgeEntry(
    entry: KnowledgeBaseEntry,
  ): Promise<ContentValidationResult> {
    const issues: ContentIssue[] = [];
    const suggestions: string[] = [];

    // Content length validation
    this.validateContentLength(entry, issues, suggestions);

    // Structure validation
    this.validateContentStructure(entry, issues, suggestions);

    // Language and readability validation
    this.validateReadability(entry, issues, suggestions);

    // Keyword and tag validation
    this.validateMetadata(entry, issues, suggestions);

    // Academic quality validation
    this.validateAcademicQuality(entry, issues, suggestions);

    // Calculate overall score
    const score = this.calculateValidationScore(issues);

    return {
      isValid: issues.filter((i) => i.type === 'error').length === 0,
      score,
      issues,
      suggestions,
    };
  }

  /**
   * Validate response template content
   */
  async validateResponseTemplate(
    template: ResponseTemplate,
  ): Promise<ContentValidationResult> {
    const issues: ContentIssue[] = [];
    const suggestions: string[] = [];

    // Template syntax validation
    this.validateTemplateSyntax(template, issues, suggestions);

    // Content appropriateness validation
    this.validateTemplateContent(template, issues, suggestions);

    // Keyword relevance validation
    this.validateTemplateKeywords(template, issues, suggestions);

    // Variable validation
    this.validateTemplateVariables(template, issues, suggestions);

    const score = this.calculateValidationScore(issues);

    return {
      isValid: issues.filter((i) => i.type === 'error').length === 0,
      score,
      issues,
      suggestions,
    };
  }

  /**
   * Assess content quality metrics
   */
  async assessContentQuality(
    entry: KnowledgeBaseEntry,
  ): Promise<ContentQualityMetrics> {
    const readabilityScore = this.calculateReadabilityScore(entry.content);
    const completenessScore = this.calculateCompletenessScore(entry);
    const accuracyScore = this.calculateAccuracyScore(entry);
    const relevanceScore = this.calculateRelevanceScore(entry);

    const overallScore =
      readabilityScore * 0.25 +
      completenessScore * 0.25 +
      accuracyScore * 0.25 +
      relevanceScore * 0.25;

    return {
      readabilityScore,
      completenessScore,
      accuracyScore,
      relevanceScore,
      overallScore,
    };
  }

  /**
   * Generate content improvement suggestions
   */
  async generateImprovementSuggestions(
    entry: KnowledgeBaseEntry,
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const qualityMetrics = await this.assessContentQuality(entry);

    if (qualityMetrics.readabilityScore < 7) {
      suggestions.push(
        'Consider simplifying complex sentences and using more common vocabulary',
      );
      suggestions.push(
        'Add more headings and bullet points to improve structure',
      );
      suggestions.push(
        'Break long paragraphs into shorter, more digestible sections',
      );
    }

    if (qualityMetrics.completenessScore < 7) {
      suggestions.push('Add more detailed examples and use cases');
      suggestions.push('Include step-by-step instructions where applicable');
      suggestions.push('Consider adding visual aids or diagrams');
    }

    if (qualityMetrics.relevanceScore < 7) {
      suggestions.push(
        'Ensure content directly addresses common student questions',
      );
      suggestions.push(
        'Update examples to reflect current technologies and practices',
      );
      suggestions.push(
        'Add more context about when and how to apply the information',
      );
    }

    if (entry.keywords.length < 5) {
      suggestions.push('Add more relevant keywords to improve searchability');
    }

    if (entry.tags.length < 3) {
      suggestions.push('Add more descriptive tags for better categorization');
    }

    return suggestions;
  }

  /**
   * Validate content length
   */
  private validateContentLength(
    entry: KnowledgeBaseEntry,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const contentLength = entry.content.length;
    const wordCount = entry.content.split(/\s+/).length;

    if (contentLength < 200) {
      issues.push({
        type: 'error',
        category: 'Content Length',
        message: 'Content is too short to be useful',
        severity: 8,
      });
      suggestions.push(
        'Expand content with more detailed explanations and examples',
      );
    } else if (contentLength < 500) {
      issues.push({
        type: 'warning',
        category: 'Content Length',
        message: 'Content might benefit from more detail',
        severity: 4,
      });
    }

    if (wordCount > 2000) {
      issues.push({
        type: 'warning',
        category: 'Content Length',
        message:
          'Content is very long, consider breaking into multiple entries',
        severity: 5,
      });
      suggestions.push('Consider splitting into multiple focused entries');
    }
  }

  /**
   * Validate content structure
   */
  private validateContentStructure(
    entry: KnowledgeBaseEntry,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const content = entry.content;

    // Check for headings
    const headingCount = (content.match(/^#+\s/gm) || []).length;
    if (headingCount === 0 && content.length > 500) {
      issues.push({
        type: 'warning',
        category: 'Structure',
        message: 'Long content should include headings for better organization',
        severity: 6,
      });
      suggestions.push(
        'Add headings to organize content into logical sections',
      );
    }

    // Check for lists
    const listCount = (content.match(/^[\*\-\+]\s/gm) || []).length;
    const numberedListCount = (content.match(/^\d+\.\s/gm) || []).length;

    if (listCount === 0 && numberedListCount === 0 && content.length > 800) {
      issues.push({
        type: 'info',
        category: 'Structure',
        message: 'Consider using lists to improve readability',
        severity: 3,
      });
      suggestions.push(
        'Use bullet points or numbered lists for step-by-step information',
      );
    }

    // Check for code blocks
    if (
      entry.category.toLowerCase().includes('technical') ||
      entry.tags.some((tag) =>
        ['programming', 'code', 'development'].includes(tag.toLowerCase()),
      )
    ) {
      const codeBlockCount = (content.match(/```/g) || []).length / 2;
      if (codeBlockCount === 0) {
        issues.push({
          type: 'info',
          category: 'Structure',
          message: 'Technical content might benefit from code examples',
          severity: 2,
        });
      }
    }
  }

  /**
   * Validate readability
   */
  private validateReadability(
    entry: KnowledgeBaseEntry,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const content = entry.content;
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    // Average sentence length
    const avgSentenceLength =
      sentences.reduce((sum, sentence) => {
        return sum + sentence.split(/\s+/).length;
      }, 0) / sentences.length;

    if (avgSentenceLength > 25) {
      issues.push({
        type: 'warning',
        category: 'Readability',
        message: 'Sentences are too long on average',
        severity: 5,
      });
      suggestions.push('Break long sentences into shorter, clearer statements');
    }

    // Check for passive voice (simple heuristic)
    const passiveIndicators = [
      'is being',
      'was being',
      'has been',
      'have been',
      'will be',
    ];
    const passiveCount = passiveIndicators.reduce((count, indicator) => {
      return (
        count +
        (content.toLowerCase().match(new RegExp(indicator, 'g')) || []).length
      );
    }, 0);

    if (passiveCount > sentences.length * 0.3) {
      issues.push({
        type: 'info',
        category: 'Readability',
        message: 'Consider using more active voice',
        severity: 3,
      });
      suggestions.push(
        'Use active voice to make content more engaging and direct',
      );
    }
  }

  /**
   * Validate metadata (keywords and tags)
   */
  private validateMetadata(
    entry: KnowledgeBaseEntry,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    // Keywords validation
    if (entry.keywords.length < 3) {
      issues.push({
        type: 'warning',
        category: 'Metadata',
        message: 'Insufficient keywords for good searchability',
        severity: 6,
      });
      suggestions.push(
        'Add more relevant keywords to improve search discoverability',
      );
    }

    if (entry.keywords.length > 20) {
      issues.push({
        type: 'warning',
        category: 'Metadata',
        message: 'Too many keywords may dilute search relevance',
        severity: 4,
      });
    }

    // Tags validation
    if (entry.tags.length < 2) {
      issues.push({
        type: 'warning',
        category: 'Metadata',
        message: 'More tags would improve content categorization',
        severity: 5,
      });
    }

    // Check keyword relevance to content
    const contentLower = entry.content.toLowerCase();
    const irrelevantKeywords = entry.keywords.filter(
      (keyword) => !contentLower.includes(keyword.toLowerCase()),
    );

    if (irrelevantKeywords.length > 0) {
      issues.push({
        type: 'warning',
        category: 'Metadata',
        message: `Some keywords don't appear in content: ${irrelevantKeywords.join(', ')}`,
        severity: 5,
      });
    }
  }

  /**
   * Validate academic quality
   */
  private validateAcademicQuality(
    entry: KnowledgeBaseEntry,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const content = entry.content;

    // Check for references or citations
    const citationPattern = /\[\d+\]|\([A-Za-z]+,?\s*\d{4}\)/g;
    const citations = content.match(citationPattern) || [];

    if (
      entry.contentType === 'guideline' &&
      citations.length === 0 &&
      content.length > 1000
    ) {
      issues.push({
        type: 'info',
        category: 'Academic Quality',
        message: 'Consider adding references to support guidelines',
        severity: 3,
      });
    }

    // Check for examples
    const exampleIndicators = ['example', 'for instance', 'such as', 'e.g.'];
    const hasExamples = exampleIndicators.some((indicator) =>
      content.toLowerCase().includes(indicator),
    );

    if (!hasExamples && content.length > 800) {
      issues.push({
        type: 'info',
        category: 'Academic Quality',
        message: 'Adding examples would improve understanding',
        severity: 2,
      });
      suggestions.push('Include concrete examples to illustrate key points');
    }

    // Check for actionable content
    const actionWords = [
      'should',
      'must',
      'need to',
      'follow these steps',
      'how to',
    ];
    const hasActionableContent = actionWords.some((word) =>
      content.toLowerCase().includes(word),
    );

    if (!hasActionableContent && entry.contentType === 'guideline') {
      issues.push({
        type: 'warning',
        category: 'Academic Quality',
        message: 'Guidelines should include actionable instructions',
        severity: 6,
      });
    }
  }

  /**
   * Validate template syntax
   */
  private validateTemplateSyntax(
    template: ResponseTemplate,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const templateContent = template.template;

    // Check for unclosed template variables
    const openBraces = (templateContent.match(/\{\{/g) || []).length;
    const closeBraces = (templateContent.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      issues.push({
        type: 'error',
        category: 'Template Syntax',
        message: 'Mismatched template variable braces',
        severity: 9,
      });
    }

    // Check for valid variable names
    const variablePattern = /\{\{([^}]+)\}\}/g;
    let match;
    while ((match = variablePattern.exec(templateContent)) !== null) {
      const variableName = match[1].trim();
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variableName)) {
        issues.push({
          type: 'error',
          category: 'Template Syntax',
          message: `Invalid variable name: ${variableName}`,
          severity: 8,
        });
      }
    }
  }

  /**
   * Validate template content appropriateness
   */
  private validateTemplateContent(
    template: ResponseTemplate,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const content = template.template;

    if (content.length < 50) {
      issues.push({
        type: 'warning',
        category: 'Template Content',
        message: 'Template content is very short',
        severity: 6,
      });
    }

    // Check for helpful structure
    const hasGreeting = /^(hello|hi|greetings)/i.test(content);
    const hasClosing = /(help|questions|assistance)/i.test(content);

    if (!hasGreeting && template.category !== 'System') {
      suggestions.push('Consider adding a friendly greeting to the template');
    }

    if (!hasClosing) {
      suggestions.push('Consider ending with an offer for further assistance');
    }
  }

  /**
   * Validate template keywords
   */
  private validateTemplateKeywords(
    template: ResponseTemplate,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    if (template.triggerKeywords.length < 2) {
      issues.push({
        type: 'warning',
        category: 'Template Keywords',
        message: 'Template needs more trigger keywords',
        severity: 6,
      });
    }

    // Check if keywords are relevant to content
    const contentLower = template.template.toLowerCase();
    const irrelevantKeywords = template.triggerKeywords.filter(
      (keyword) =>
        !contentLower.includes(keyword.toLowerCase()) &&
        !template.name.toLowerCase().includes(keyword.toLowerCase()),
    );

    if (irrelevantKeywords.length > 0) {
      issues.push({
        type: 'info',
        category: 'Template Keywords',
        message: `Some keywords may not be relevant: ${irrelevantKeywords.join(', ')}`,
        severity: 3,
      });
    }
  }

  /**
   * Validate template variables
   */
  private validateTemplateVariables(
    template: ResponseTemplate,
    issues: ContentIssue[],
    suggestions: string[],
  ): void {
    const templateContent = template.template;
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const usedVariables = new Set<string>();

    let match;
    while ((match = variablePattern.exec(templateContent)) !== null) {
      usedVariables.add(match[1].trim());
    }

    // Check if all used variables have default values
    usedVariables.forEach((variable) => {
      if (!template.variables || !(variable in template.variables)) {
        issues.push({
          type: 'warning',
          category: 'Template Variables',
          message: `Variable '${variable}' has no default value`,
          severity: 5,
        });
      }
    });

    // Check for unused variables in the variables object
    if (template.variables) {
      Object.keys(template.variables).forEach((variable) => {
        if (!usedVariables.has(variable)) {
          issues.push({
            type: 'info',
            category: 'Template Variables',
            message: `Variable '${variable}' is defined but not used`,
            severity: 2,
          });
        }
      });
    }
  }

  /**
   * Calculate validation score based on issues
   */
  private calculateValidationScore(issues: ContentIssue[]): number {
    let totalDeduction = 0;

    issues.forEach((issue) => {
      switch (issue.type) {
        case 'error':
          totalDeduction += issue.severity * 2;
          break;
        case 'warning':
          totalDeduction += issue.severity;
          break;
        case 'info':
          totalDeduction += issue.severity * 0.5;
          break;
      }
    });

    return Math.max(0, 100 - totalDeduction);
  }

  /**
   * Calculate readability score
   */
  private calculateReadabilityScore(content: string): number {
    const sentences = content
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const syllables = words.reduce(
      (count, word) => count + this.countSyllables(word),
      0,
    );

    // Flesch Reading Ease Score
    const avgSentenceLength = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const fleschScore =
      206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    // Convert to 0-10 scale
    return Math.max(0, Math.min(10, fleschScore / 10));
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(entry: KnowledgeBaseEntry): number {
    let score = 0;

    // Content length (0-3 points)
    if (entry.content.length > 1000) score += 3;
    else if (entry.content.length > 500) score += 2;
    else if (entry.content.length > 200) score += 1;

    // Structure elements (0-3 points)
    const hasHeadings = /^#+\s/m.test(entry.content);
    const hasLists = /^[\*\-\+\d+\.]\s/m.test(entry.content);
    const hasExamples = /example|for instance|such as|e\.g\./i.test(
      entry.content,
    );

    if (hasHeadings) score += 1;
    if (hasLists) score += 1;
    if (hasExamples) score += 1;

    // Metadata completeness (0-4 points)
    if (entry.keywords.length >= 5) score += 2;
    else if (entry.keywords.length >= 3) score += 1;

    if (entry.tags.length >= 3) score += 2;
    else if (entry.tags.length >= 2) score += 1;

    return score; // 0-10 scale
  }

  /**
   * Calculate accuracy score (placeholder - would need domain expertise)
   */
  private calculateAccuracyScore(entry: KnowledgeBaseEntry): number {
    // This is a simplified accuracy assessment
    // In a real implementation, this might involve:
    // - Fact-checking against authoritative sources
    // - Consistency with university guidelines
    // - Technical accuracy validation

    let score = 8; // Default high score

    // Check for outdated information indicators
    const currentYear = new Date().getFullYear();
    const yearMatches = entry.content.match(/\b(19|20)\d{2}\b/g);

    if (yearMatches) {
      const oldYears = yearMatches.filter(
        (year) => parseInt(year) < currentYear - 5,
      );
      if (oldYears.length > 0) {
        score -= 2; // Deduct for potentially outdated information
      }
    }

    // Check for uncertainty indicators
    const uncertaintyWords = [
      'might',
      'maybe',
      'possibly',
      'probably',
      'unclear',
    ];
    const uncertaintyCount = uncertaintyWords.reduce((count, word) => {
      return (
        count +
        (
          entry.content.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) ||
          []
        ).length
      );
    }, 0);

    if (uncertaintyCount > 3) {
      score -= 1;
    }

    return Math.max(0, score);
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(entry: KnowledgeBaseEntry): number {
    let score = 5; // Base score

    // Check relevance to FYP context
    const fypKeywords = [
      'fyp',
      'final year project',
      'thesis',
      'dissertation',
      'student',
      'supervisor',
    ];
    const fypMentions = fypKeywords.reduce((count, keyword) => {
      return (
        count +
        (
          entry.content
            .toLowerCase()
            .match(new RegExp(`\\b${keyword}\\b`, 'g')) || []
        ).length
      );
    }, 0);

    score += Math.min(3, fypMentions); // Up to 3 bonus points

    // Check for actionable content
    const actionWords = [
      'how to',
      'steps',
      'guide',
      'tutorial',
      'instructions',
    ];
    const hasActionableContent = actionWords.some((word) =>
      entry.content.toLowerCase().includes(word),
    );

    if (hasActionableContent) {
      score += 2;
    }

    return Math.min(10, score);
  }

  /**
   * Validate all knowledge base content
   */
  async validateAllContent(): Promise<void> {
    this.logger.log('Validating all knowledge base content...');

    const entries = await this.knowledgeRepository.find();
    const templates = await this.templateRepository.find();

    let totalIssues = 0;
    let validEntries = 0;
    let validTemplates = 0;

    this.logger.log(`Validating ${entries.length} knowledge base entries...`);
    for (const entry of entries) {
      const validation = await this.validateKnowledgeEntry(entry);
      const quality = await this.assessContentQuality(entry);

      this.logger.log(
        `${entry.title}: Score ${validation.score.toFixed(1)}/100, Quality ${quality.overallScore.toFixed(1)}/10`,
      );

      if (validation.isValid) {
        validEntries++;
      } else {
        validation.issues.forEach((issue) => {
          this.logger.warn(`${issue.category}: ${issue.message}`);
        });
        totalIssues += validation.issues.length;
      }
    }

    this.logger.log(`Validating ${templates.length} response templates...`);
    for (const template of templates) {
      const validation = await this.validateResponseTemplate(template);

      this.logger.log(
        `${template.name}: Score ${validation.score.toFixed(1)}/100`,
      );

      if (validation.isValid) {
        validTemplates++;
      } else {
        validation.issues.forEach((issue) => {
          this.logger.warn(`${issue.category}: ${issue.message}`);
        });
        totalIssues += validation.issues.length;
      }
    }

    this.logger.log(
      `Validation Summary: Knowledge Entries ${validEntries}/${entries.length}, Templates ${validTemplates}/${templates.length}, Total Issues: ${totalIssues}`,
    );
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    const vowels = 'aeiouy';
    let syllableCount = 0;
    let previousWasVowel = false;

    for (let i = 0; i < word.length; i++) {
      const isVowel = vowels.includes(word[i]);
      if (isVowel && !previousWasVowel) {
        syllableCount++;
      }
      previousWasVowel = isVowel;
    }

    // Handle silent 'e'
    if (word.endsWith('e')) {
      syllableCount--;
    }

    return Math.max(1, syllableCount);
  }
}
