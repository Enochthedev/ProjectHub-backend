import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ProcessedQuery {
  originalQuery: string;
  normalizedQuery: string;
  detectedLanguage: string;
  languageConfidence: number;
  intent: QueryIntent;
  category: QueryCategory;
  keywords: string[];
  entities: QueryEntity[];
  isValid: boolean;
  validationIssues: string[];
  metadata: QueryMetadata;
}

export interface QueryEntity {
  type: EntityType;
  value: string;
  confidence: number;
  position: {
    start: number;
    end: number;
  };
}

export interface QueryMetadata {
  wordCount: number;
  characterCount: number;
  complexity: QueryComplexity;
  urgency: QueryUrgency;
  academicLevel: AcademicLevel;
  processedAt: Date;
  processingTimeMs: number;
}

export enum QueryIntent {
  QUESTION = 'question',
  REQUEST_GUIDANCE = 'request_guidance',
  CLARIFICATION = 'clarification',
  EXAMPLE_REQUEST = 'example_request',
  DEFINITION = 'definition',
  COMPARISON = 'comparison',
  PROCEDURE = 'procedure',
  TROUBLESHOOTING = 'troubleshooting',
  FEEDBACK = 'feedback',
  GREETING = 'greeting',
  UNKNOWN = 'unknown',
}

export enum QueryCategory {
  LITERATURE_REVIEW = 'literature_review',
  METHODOLOGY = 'methodology',
  PROPOSAL_WRITING = 'proposal_writing',
  DATA_ANALYSIS = 'data_analysis',
  IMPLEMENTATION = 'implementation',
  DOCUMENTATION = 'documentation',
  PRESENTATION = 'presentation',
  TIMELINE = 'timeline',
  SUPERVISION = 'supervision',
  TECHNICAL = 'technical',
  ACADEMIC_WRITING = 'academic_writing',
  RESEARCH_ETHICS = 'research_ethics',
  GENERAL = 'general',
}

export enum EntityType {
  PROJECT_PHASE = 'project_phase',
  METHODOLOGY = 'methodology',
  TECHNOLOGY = 'technology',
  ACADEMIC_TERM = 'academic_term',
  DEADLINE = 'deadline',
  PERSON = 'person',
  DOCUMENT_TYPE = 'document_type',
  RESEARCH_AREA = 'research_area',
}

export enum QueryComplexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
}

export enum QueryUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum AcademicLevel {
  UNDERGRADUATE = 'undergraduate',
  GRADUATE = 'graduate',
  RESEARCH = 'research',
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  alternatives: Array<{
    language: string;
    confidence: number;
  }>;
}

@Injectable()
export class QueryProcessingService {
  private readonly logger = new Logger(QueryProcessingService.name);

  private readonly config: {
    maxQueryLength: number;
    minQueryLength: number;
    supportedLanguages: string[];
    defaultLanguage: string;
    languageConfidenceThreshold: number;
  };

  // Language detection patterns
  private readonly languagePatterns = new Map<string, RegExp[]>([
    [
      'en',
      [
        /\b(what|how|why|when|where|who|which|can|could|should|would|will|is|are|am|do|does|did)\b/i,
        /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/i,
        /\b(project|research|methodology|literature|analysis|implementation)\b/i,
      ],
    ],
    [
      'es',
      [
        /\b(qué|que|cómo|como|por qué|porque|cuándo|cuando|dónde|donde|quién|quien|cuál|cual|puede|podría|debería|será|es|son|soy|hacer|hace|hizo)\b/i,
        /\b(el|la|los|las|y|o|pero|en|sobre|a|para|de|con|por|del|al|una|un)\b/i,
        /\b(proyecto|investigación|investigacion|metodología|metodologia|literatura|análisis|analisis|implementación|implementacion|revisión|revision)\b/i,
      ],
    ],
    [
      'fr',
      [
        /\b(quoi|comment|pourquoi|quand|où|ou|qui|quel|quelle|peut|pourrait|devrait|sera|est|sont|suis|faire|fait)\b/i,
        /\b(le|la|les|et|ou|mais|dans|sur|à|pour|de|avec|par|du|des|une|un)\b/i,
        /\b(projet|recherche|méthodologie|methodologie|littérature|litterature|analyse|implémentation|implementation)\b/i,
      ],
    ],
    [
      'de',
      [
        /\b(was|wie|warum|wann|wo|wer|welche|kann|könnte|sollte|wird|ist|sind|bin|machen|macht|machte)\b/i,
        /\b(der|die|das|und|oder|aber|in|auf|zu|für|von|mit|durch|ein|eine)\b/i,
        /\b(projekt|forschung|methodologie|literatur|analyse|implementierung)\b/i,
      ],
    ],
    [
      'pt',
      [
        /\b(o que|como|por que|quando|onde|quem|qual|pode|poderia|deveria|será|é|são|sou|fazer|faz|fez)\b/i,
        /\b(o|a|os|as|e|ou|mas|em|sobre|para|de|com|por|do|da|dos|das|uma|um)\b/i,
        /\b(projeto|pesquisa|metodologia|literatura|análise|implementação)\b/i,
      ],
    ],
  ]);

  // Intent classification patterns (order matters - more specific first)
  private readonly intentPatterns = new Map<QueryIntent, RegExp[]>([
    [
      QueryIntent.GREETING,
      [
        /^(hi|hello|hey|good morning|good afternoon|good evening)\b/i,
        /\b(how are you|nice to meet)\b/i,
      ],
    ],
    [
      QueryIntent.EXAMPLE_REQUEST,
      [
        /\b(example|sample|template|format|show me)\b/i,
        /\b(give me an example|provide a sample)\b/i,
        /\b(what does.*look like)\b/i,
      ],
    ],
    [
      QueryIntent.COMPARISON,
      [
        /\b(difference|versus|vs|better|best|compare|comparison)\b/i,
        /\b(which is better|what's the difference)\b/i,
        /\b(pros and cons|advantages|disadvantages)\b/i,
      ],
    ],
    [
      QueryIntent.DEFINITION,
      [
        /\b(what is|what are|define|definition|meaning of)\b/i,
        /\b(explain what.*means)\b/i,
        /\b(terminology|glossary)\b/i,
      ],
    ],
    [
      QueryIntent.REQUEST_GUIDANCE,
      [
        /\b(help|guide|assist|advice|recommend|suggest)\b/i,
        /\b(how can I|what should I|need help|looking for guidance)\b/i,
        /\b(can you help|please help|i need)\b/i,
      ],
    ],
    [
      QueryIntent.CLARIFICATION,
      [
        /\b(clarify|clarification|confused|unclear|understand)\b/i,
        /\b(what do you mean|can you explain)\b/i,
        /\b(not sure|don't understand)\b/i,
      ],
    ],
    [
      QueryIntent.PROCEDURE,
      [
        /\b(steps|process|procedure|workflow|how to)\b/i,
        /\b(step by step|walk me through)\b/i,
        /\b(sequence|order)\b/i,
      ],
    ],
    [
      QueryIntent.TROUBLESHOOTING,
      [
        /\b(problem|issue|error|trouble|fix|solve|debug)\b/i,
        /\b(not working|doesn't work|failed|stuck)\b/i,
        /\b(help with.*problem)\b/i,
      ],
    ],
    [
      QueryIntent.QUESTION,
      [
        /^(what|how|why|when|where|who|which)\b/i,
        /\?$/,
        /\b(explain|describe|tell me about)\b/i,
      ],
    ],
  ]);

  // Category classification patterns
  private readonly categoryPatterns = new Map<QueryCategory, RegExp[]>([
    [
      QueryCategory.LITERATURE_REVIEW,
      [
        /\b(literature review|systematic review|meta-analysis|survey|bibliography)\b/i,
        /\b(sources|references|citations|papers|articles|journals)\b/i,
        /\b(related work|previous research|existing studies)\b/i,
      ],
    ],
    [
      QueryCategory.METHODOLOGY,
      [
        /\b(methodology|method|approach|technique|framework|design)\b/i,
        /\b(research method|data collection|sampling|experiment|survey)\b/i,
        /\b(qualitative|quantitative|mixed methods)\b/i,
      ],
    ],
    [
      QueryCategory.PROPOSAL_WRITING,
      [
        /\b(proposal|research proposal|project proposal|thesis proposal)\b/i,
        /\b(abstract|introduction|objectives|scope|timeline)\b/i,
        /\b(problem statement|research questions|hypothesis)\b/i,
      ],
    ],
    [
      QueryCategory.DATA_ANALYSIS,
      [
        /\b(data analysis|statistical analysis|results|findings)\b/i,
        /\b(statistics|spss|r|python|excel|visualization)\b/i,
        /\b(correlation|regression|significance|p-value)\b/i,
      ],
    ],
    [
      QueryCategory.IMPLEMENTATION,
      [
        /\b(implementation|development|coding|programming|software|implement)\b/i,
        /\b(algorithm|system|application|prototype|testing|code)\b/i,
        /\b(java|python|javascript|database|api|programming)\b/i,
      ],
    ],
    [
      QueryCategory.DOCUMENTATION,
      [
        /\b(documentation|report|thesis|dissertation|paper|write|writing)\b/i,
        /\b(format|structure|chapters|sections|document)\b/i,
        /\b(conclusion|discussion|recommendations)\b/i,
      ],
    ],
    [
      QueryCategory.PRESENTATION,
      [
        /\b(presentation|defense|viva|slides|powerpoint)\b/i,
        /\b(presenting|public speaking|audience|questions)\b/i,
      ],
    ],
    [
      QueryCategory.TIMELINE,
      [
        /\b(timeline|schedule|deadline|milestone|planning)\b/i,
        /\b(time management|project plan|gantt|calendar)\b/i,
      ],
    ],
    [
      QueryCategory.SUPERVISION,
      [
        /\b(supervisor|advisor|meeting|feedback|guidance)\b/i,
        /\b(supervision|mentoring|progress report)\b/i,
      ],
    ],
    [
      QueryCategory.TECHNICAL,
      [
        /\b(technical|technology|tool|software|hardware)\b/i,
        /\b(installation|configuration|setup|troubleshooting)\b/i,
      ],
    ],
    [
      QueryCategory.ACADEMIC_WRITING,
      [
        /\b(academic writing|citation|referencing|plagiarism|style)\b/i,
        /\b(apa|mla|harvard|ieee|grammar|proofreading)\b/i,
      ],
    ],
    [
      QueryCategory.RESEARCH_ETHICS,
      [
        /\b(ethics|ethical|consent|privacy|confidentiality)\b/i,
        /\b(irb|ethics committee|ethical approval)\b/i,
      ],
    ],
  ]);

  // Entity extraction patterns
  private readonly entityPatterns = new Map<EntityType, RegExp[]>([
    [
      EntityType.PROJECT_PHASE,
      [
        /\b(proposal|literature review|methodology|implementation|analysis|documentation|presentation|defense)\b/i,
      ],
    ],
    [
      EntityType.METHODOLOGY,
      [
        /\b(survey|interview|experiment|case study|ethnography|grounded theory|action research)\b/i,
      ],
    ],
    [
      EntityType.TECHNOLOGY,
      [
        /\b(java|python|javascript|react|node\.js|sql|mongodb|tensorflow|pytorch)\b/i,
      ],
    ],
    [
      EntityType.ACADEMIC_TERM,
      [
        /\b(hypothesis|variable|correlation|significance|validity|reliability|bias)\b/i,
      ],
    ],
    [
      EntityType.DEADLINE,
      [/\b(deadline|due date|submission|by \w+day|next week|next month)\b/i],
    ],
    [
      EntityType.DOCUMENT_TYPE,
      [/\b(thesis|dissertation|paper|report|proposal|abstract|chapter)\b/i],
    ],
    [
      EntityType.RESEARCH_AREA,
      [
        /\b(machine learning|artificial intelligence|data science|software engineering|cybersecurity|hci)\b/i,
      ],
    ],
  ]);

  // Urgency indicators
  private readonly urgencyPatterns = new Map<QueryUrgency, RegExp[]>([
    [
      QueryUrgency.URGENT,
      [
        /\b(urgent|asap|immediately|emergency|critical|deadline today)\b/i,
        /\b(due today|due tomorrow|overdue)\b/i,
      ],
    ],
    [
      QueryUrgency.HIGH,
      [
        /\b(important|priority|soon|quickly|deadline|due)\b/i,
        /\b(this week|by friday|need help)\b/i,
      ],
    ],
    [QueryUrgency.MEDIUM, [/\b(next week|upcoming|planning|prepare)\b/i]],
  ]);

  constructor(private readonly configService: ConfigService) {
    this.config = {
      maxQueryLength:
        this.configService.get<number>('ai.maxQueryLength') || 1000,
      minQueryLength: this.configService.get<number>('ai.minQueryLength') || 3,
      supportedLanguages: this.configService.get<string[]>(
        'ai.supportedLanguages',
      ) || ['en', 'es', 'fr', 'de', 'pt'],
      defaultLanguage:
        this.configService.get<string>('ai.defaultLanguage') || 'en',
      languageConfidenceThreshold:
        this.configService.get<number>('ai.languageConfidenceThreshold') || 0.6,
    };

    this.logger.log(
      `Query processing service initialized with ${this.config.supportedLanguages.length} supported languages`,
    );
  }

  /**
   * Process a user query with comprehensive analysis
   */
  async processQuery(
    query: string,
    context?: {
      conversationHistory?: string[];
      projectPhase?: string;
      userLanguage?: string;
    },
  ): Promise<ProcessedQuery> {
    const startTime = Date.now();

    try {
      // Validate query
      const validationResult = this.validateQuery(query);
      if (!validationResult.isValid) {
        return this.createInvalidQueryResult(
          query,
          validationResult.issues,
          startTime,
        );
      }

      // Normalize query
      const normalizedQuery = this.normalizeQuery(query);

      // Detect language
      const languageResult = this.detectLanguage(
        normalizedQuery,
        context?.userLanguage,
      );

      // Extract keywords
      const keywords = this.extractKeywords(normalizedQuery);

      // Classify intent
      const intent = this.classifyIntent(normalizedQuery, keywords);

      // Classify category
      const category = this.classifyCategory(
        normalizedQuery,
        keywords,
        context?.projectPhase,
      );

      // Extract entities
      const entities = this.extractEntities(normalizedQuery);

      // Calculate metadata
      const metadata = this.calculateMetadata(normalizedQuery, startTime);

      const result: ProcessedQuery = {
        originalQuery: query,
        normalizedQuery,
        detectedLanguage: languageResult.language,
        languageConfidence: languageResult.confidence,
        intent,
        category,
        keywords,
        entities,
        isValid: true,
        validationIssues: [],
        metadata,
      };

      this.logger.debug(
        `Query processed successfully: intent=${intent}, category=${category}, language=${languageResult.language}`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing query: ${error.message}`,
        error.stack,
      );
      return this.createErrorQueryResult(query, error.message, startTime);
    }
  }

  /**
   * Detect the language of the query
   */
  detectLanguage(
    query: string,
    userLanguage?: string,
  ): LanguageDetectionResult {
    const scores = new Map<string, number>();

    // Initialize scores
    for (const lang of this.config.supportedLanguages) {
      scores.set(lang, 0);
    }

    // Score based on language patterns
    for (const [language, patterns] of this.languagePatterns) {
      if (!scores.has(language)) continue;

      let langScore = 0;
      for (const pattern of patterns) {
        const matches = query.match(pattern);
        if (matches) {
          langScore += matches.length;
        }
      }
      scores.set(language, langScore);
    }

    // Boost user's preferred language if provided
    if (userLanguage && scores.has(userLanguage)) {
      const currentScore = scores.get(userLanguage) || 0;
      scores.set(userLanguage, currentScore + 2);
    }

    // Find the language with highest score
    const sortedLanguages = Array.from(scores.entries()).sort(
      (a, b) => b[1] - a[1],
    );

    const topLanguage = sortedLanguages[0];
    const totalScore = Array.from(scores.values()).reduce(
      (sum, score) => sum + score,
      0,
    );

    const confidence = totalScore > 0 ? topLanguage[1] / totalScore : 0;
    const detectedLanguage =
      confidence >= this.config.languageConfidenceThreshold
        ? topLanguage[0]
        : this.config.defaultLanguage;

    return {
      language: detectedLanguage,
      confidence,
      alternatives: sortedLanguages.slice(1, 3).map(([lang, score]) => ({
        language: lang,
        confidence: totalScore > 0 ? score / totalScore : 0,
      })),
    };
  }

  /**
   * Normalize query text
   */
  private normalizeQuery(query: string): string {
    return query
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s\-.,!?áéíóúñüç]/g, '') // Remove special characters except basic punctuation and accents
      .toLowerCase();
  }

  /**
   * Validate query input
   */
  private validateQuery(query: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!query || typeof query !== 'string') {
      issues.push('Query must be a non-empty string');
    } else {
      if (query.trim().length < this.config.minQueryLength) {
        issues.push(
          `Query too short (minimum ${this.config.minQueryLength} characters)`,
        );
      }

      if (query.length > this.config.maxQueryLength) {
        issues.push(
          `Query too long (maximum ${this.config.maxQueryLength} characters)`,
        );
      }

      // Check for potentially harmful content
      const harmfulPatterns = [
        /\b(hack|exploit|crack|pirate|illegal)\b/i,
        /\b(password|login|admin|root)\b/i,
      ];

      for (const pattern of harmfulPatterns) {
        if (pattern.test(query)) {
          issues.push('Query contains potentially inappropriate content');
          break;
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Extract keywords from normalized query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
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
      'can',
      'i',
      'you',
      'we',
      'they',
      'my',
      'your',
      'our',
      'their',
      'this',
      'these',
      'those',
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
    ]);

    return query
      .replace(/[^\w\s]/g, ' ') // Remove punctuation for keyword extraction
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 20); // Limit to top 20 keywords
  }

  /**
   * Classify query intent
   */
  private classifyIntent(query: string, keywords: string[]): QueryIntent {
    const scores = new Map<QueryIntent, number>();

    for (const [intent, patterns] of this.intentPatterns) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          score += 1;
        }
      }
      if (score > 0) {
        scores.set(intent, score);
      }
    }

    if (scores.size === 0) {
      return QueryIntent.UNKNOWN;
    }

    // Return intent with highest score
    return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Classify query category
   */
  private classifyCategory(
    query: string,
    keywords: string[],
    projectPhase?: string,
  ): QueryCategory {
    const scores = new Map<QueryCategory, number>();

    for (const [category, patterns] of this.categoryPatterns) {
      let score = 0;
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          score += 1;
        }
      }
      if (score > 0) {
        scores.set(category, score);
      }
    }

    // Boost category based on project phase context
    if (projectPhase) {
      const phaseToCategory = new Map([
        ['proposal', QueryCategory.PROPOSAL_WRITING],
        ['literature_review', QueryCategory.LITERATURE_REVIEW],
        ['methodology', QueryCategory.METHODOLOGY],
        ['implementation', QueryCategory.IMPLEMENTATION],
        ['analysis', QueryCategory.DATA_ANALYSIS],
        ['documentation', QueryCategory.DOCUMENTATION],
        ['presentation', QueryCategory.PRESENTATION],
      ]);

      const contextCategory = phaseToCategory.get(projectPhase.toLowerCase());
      if (contextCategory && scores.has(contextCategory)) {
        const currentScore = scores.get(contextCategory) || 0;
        scores.set(contextCategory, currentScore + 2);
      }
    }

    if (scores.size === 0) {
      return QueryCategory.GENERAL;
    }

    // Return category with highest score
    return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): QueryEntity[] {
    const entities: QueryEntity[] = [];

    for (const [entityType, patterns] of this.entityPatterns) {
      for (const pattern of patterns) {
        const matches = Array.from(
          query.matchAll(new RegExp(pattern.source, 'gi')),
        );

        for (const match of matches) {
          if (match.index !== undefined) {
            entities.push({
              type: entityType,
              value: match[0],
              confidence: 0.8, // Simple confidence score
              position: {
                start: match.index,
                end: match.index + match[0].length,
              },
            });
          }
        }
      }
    }

    // Remove duplicates and sort by position
    const uniqueEntities = entities.filter(
      (entity, index, arr) =>
        arr.findIndex(
          (e) => e.value === entity.value && e.type === entity.type,
        ) === index,
    );

    return uniqueEntities.sort((a, b) => a.position.start - b.position.start);
  }

  /**
   * Calculate query metadata
   */
  private calculateMetadata(query: string, startTime: number): QueryMetadata {
    const words = query.split(/\s+/).filter((word) => word.length > 0);
    const wordCount = words.length;
    const characterCount = query.length;

    // Determine complexity
    let complexity = QueryComplexity.SIMPLE;
    if (
      wordCount > 20 ||
      (query.includes('?') && query.includes(',')) ||
      query.includes('epistemological') ||
      query.includes('methodology')
    ) {
      complexity = QueryComplexity.COMPLEX;
    } else if (wordCount > 10) {
      complexity = QueryComplexity.MODERATE;
    }

    // Determine urgency
    let urgency = QueryUrgency.LOW;
    for (const [urgencyLevel, patterns] of this.urgencyPatterns) {
      for (const pattern of patterns) {
        if (pattern.test(query)) {
          urgency = urgencyLevel;
          break;
        }
      }
      if (urgency !== QueryUrgency.LOW) break;
    }

    // Determine academic level (simple heuristic)
    let academicLevel = AcademicLevel.UNDERGRADUATE;
    const advancedTerms =
      /\b(methodology|epistemology|ontology|paradigm|theoretical framework|meta-analysis)\b/i;
    if (advancedTerms.test(query)) {
      academicLevel = AcademicLevel.RESEARCH;
    } else if (
      wordCount > 15 ||
      /\b(thesis|dissertation|research)\b/i.test(query)
    ) {
      academicLevel = AcademicLevel.GRADUATE;
    }

    return {
      wordCount,
      characterCount,
      complexity,
      urgency,
      academicLevel,
      processedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Create result for invalid query
   */
  private createInvalidQueryResult(
    query: string,
    issues: string[],
    startTime: number,
  ): ProcessedQuery {
    return {
      originalQuery: query || '',
      normalizedQuery: '',
      detectedLanguage: this.config.defaultLanguage,
      languageConfidence: 0,
      intent: QueryIntent.UNKNOWN,
      category: QueryCategory.GENERAL,
      keywords: [],
      entities: [],
      isValid: false,
      validationIssues: issues,
      metadata: {
        wordCount: 0,
        characterCount: query ? query.length : 0,
        complexity: QueryComplexity.SIMPLE,
        urgency: QueryUrgency.LOW,
        academicLevel: AcademicLevel.UNDERGRADUATE,
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Create result for error case
   */
  private createErrorQueryResult(
    query: string,
    errorMessage: string,
    startTime: number,
  ): ProcessedQuery {
    return {
      originalQuery: query || '',
      normalizedQuery: '',
      detectedLanguage: this.config.defaultLanguage,
      languageConfidence: 0,
      intent: QueryIntent.UNKNOWN,
      category: QueryCategory.GENERAL,
      keywords: [],
      entities: [],
      isValid: false,
      validationIssues: [`Processing error: ${errorMessage}`],
      metadata: {
        wordCount: 0,
        characterCount: query ? query.length : 0,
        complexity: QueryComplexity.SIMPLE,
        urgency: QueryUrgency.LOW,
        academicLevel: AcademicLevel.UNDERGRADUATE,
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    supportedLanguages: string[];
    maxQueryLength: number;
    minQueryLength: number;
    intentTypes: string[];
    categoryTypes: string[];
    entityTypes: string[];
  } {
    return {
      supportedLanguages: [...this.config.supportedLanguages],
      maxQueryLength: this.config.maxQueryLength,
      minQueryLength: this.config.minQueryLength,
      intentTypes: Object.values(QueryIntent),
      categoryTypes: Object.values(QueryCategory),
      entityTypes: Object.values(EntityType),
    };
  }

  /**
   * Update processing configuration
   */
  updateConfig(updates: Partial<typeof this.config>): void {
    Object.assign(this.config, updates);
    this.logger.log('Query processing configuration updated');
  }
}
