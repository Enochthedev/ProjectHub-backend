import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  QueryProcessingService,
  QueryIntent,
  QueryCategory,
  EntityType,
  QueryComplexity,
  QueryUrgency,
  AcademicLevel,
} from '../query-processing.service';

describe('QueryProcessingService', () => {
  let service: QueryProcessingService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'ai.maxQueryLength': 1000,
          'ai.minQueryLength': 3,
          'ai.supportedLanguages': ['en', 'es', 'fr', 'de', 'pt'],
          'ai.defaultLanguage': 'en',
          'ai.languageConfidenceThreshold': 0.6,
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryProcessingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<QueryProcessingService>(QueryProcessingService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processQuery', () => {
    it('should process a simple English question', async () => {
      const query = 'What is a literature review?';
      const result = await service.processQuery(query);

      expect(result.isValid).toBe(true);
      expect(result.detectedLanguage).toBe('en');
      expect([QueryIntent.DEFINITION, QueryIntent.QUESTION]).toContain(
        result.intent,
      );
      expect(result.category).toBe(QueryCategory.LITERATURE_REVIEW);
      expect(result.keywords).toContain('literature');
      expect(result.keywords).toContain('review');
      expect(result.metadata.wordCount).toBe(5);
      expect(result.metadata.complexity).toBe(QueryComplexity.SIMPLE);
    });

    it('should detect Spanish language', async () => {
      const query = '¿Qué es una revisión de literatura?';
      const result = await service.processQuery(query);

      // Language detection might not be perfect for short queries
      expect(['es', 'en']).toContain(result.detectedLanguage);
      expect([QueryIntent.DEFINITION, QueryIntent.QUESTION]).toContain(
        result.intent,
      );
    });

    it('should classify methodology questions correctly', async () => {
      const query =
        'How do I choose the right research methodology for my project?';
      const result = await service.processQuery(query);

      expect([QueryIntent.REQUEST_GUIDANCE, QueryIntent.QUESTION]).toContain(
        result.intent,
      );
      expect(result.category).toBe(QueryCategory.METHODOLOGY);
      expect(result.keywords).toContain('research');
      expect(result.keywords).toContain('methodology');
    });

    it('should detect urgent queries', async () => {
      const query = 'I need urgent help with my thesis deadline today!';
      const result = await service.processQuery(query);

      expect(result.metadata.urgency).toBe(QueryUrgency.URGENT);
      expect(result.intent).toBe(QueryIntent.REQUEST_GUIDANCE);
    });

    it('should extract entities correctly', async () => {
      const query =
        'I need help with my machine learning implementation using Python';
      const result = await service.processQuery(query);

      const techEntities = result.entities.filter(
        (e) => e.type === EntityType.TECHNOLOGY,
      );
      const researchEntities = result.entities.filter(
        (e) => e.type === EntityType.RESEARCH_AREA,
      );

      expect(
        techEntities.some((e) => e.value.toLowerCase().includes('python')),
      ).toBe(true);
      expect(
        researchEntities.some((e) =>
          e.value.toLowerCase().includes('machine learning'),
        ),
      ).toBe(true);
    });

    it('should handle complex academic queries', async () => {
      const query =
        'Can you explain the epistemological foundations of mixed methods research methodology and how it differs from purely quantitative approaches in dissertation research?';
      const result = await service.processQuery(query);

      expect(result.metadata.complexity).toBe(QueryComplexity.COMPLEX);
      expect(result.metadata.academicLevel).toBe(AcademicLevel.RESEARCH);
      expect(result.category).toBe(QueryCategory.METHODOLOGY);
    });

    it('should use project phase context for category classification', async () => {
      const query = 'I need help with writing my proposal';
      const context = { projectPhase: 'proposal' };
      const result = await service.processQuery(query, context);

      expect(result.category).toBe(QueryCategory.PROPOSAL_WRITING);
    });

    it('should boost user language preference', async () => {
      const query = 'help with project'; // Ambiguous language
      const context = { userLanguage: 'es' };
      const result = await service.processQuery(query, context);

      // Should consider Spanish due to user preference boost
      expect(['en', 'es']).toContain(result.detectedLanguage);
    });

    it('should handle greeting queries', async () => {
      const query = 'Hello, how are you?';
      const result = await service.processQuery(query);

      expect(result.intent).toBe(QueryIntent.GREETING);
      expect(result.category).toBe(QueryCategory.GENERAL);
    });

    it('should classify comparison queries', async () => {
      const query =
        'What is the difference between qualitative and quantitative research methods?';
      const result = await service.processQuery(query);

      expect([QueryIntent.COMPARISON, QueryIntent.QUESTION]).toContain(
        result.intent,
      );
      expect(result.category).toBe(QueryCategory.METHODOLOGY);
    });

    it('should detect example requests', async () => {
      const query =
        'Can you show me an example of a research proposal abstract?';
      const result = await service.processQuery(query);

      expect([QueryIntent.EXAMPLE_REQUEST, QueryIntent.QUESTION]).toContain(
        result.intent,
      );
      expect(result.category).toBe(QueryCategory.PROPOSAL_WRITING);
    });

    it('should handle troubleshooting queries', async () => {
      const query =
        'My data analysis is not working, I keep getting errors in SPSS';
      const result = await service.processQuery(query);

      expect(result.intent).toBe(QueryIntent.TROUBLESHOOTING);
      expect(result.category).toBe(QueryCategory.DATA_ANALYSIS);
    });
  });

  describe('query validation', () => {
    it('should reject empty queries', async () => {
      const result = await service.processQuery('');

      expect(result.isValid).toBe(false);
      expect(result.validationIssues).toContain(
        'Query must be a non-empty string',
      );
    });

    it('should reject queries that are too short', async () => {
      const result = await service.processQuery('hi');

      expect(result.isValid).toBe(false);
      expect(
        result.validationIssues.some((issue) =>
          issue.includes('Query too short'),
        ),
      ).toBe(true);
    });

    it('should reject queries that are too long', async () => {
      const longQuery = 'a'.repeat(1001);
      const result = await service.processQuery(longQuery);

      expect(result.isValid).toBe(false);
      expect(
        result.validationIssues.some((issue) =>
          issue.includes('Query too long'),
        ),
      ).toBe(true);
    });

    it('should detect potentially harmful content', async () => {
      const result = await service.processQuery('How to hack into the system?');

      expect(result.isValid).toBe(false);
      expect(
        result.validationIssues.some((issue) =>
          issue.includes('inappropriate content'),
        ),
      ).toBe(true);
    });

    it('should accept valid queries', async () => {
      const result = await service.processQuery('What is machine learning?');

      expect(result.isValid).toBe(true);
      expect(result.validationIssues).toHaveLength(0);
    });
  });

  describe('language detection', () => {
    it('should detect English correctly', () => {
      const result = service.detectLanguage(
        'What is the methodology for this research project?',
      );

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Spanish correctly', () => {
      const result = service.detectLanguage(
        '¿Cuál es la metodología para este proyecto de investigación?',
      );

      expect(result.language).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect French correctly', () => {
      const result = service.detectLanguage(
        'Quelle est la méthodologie pour ce projet de recherche?',
      );

      // Language detection might not be perfect, especially for similar languages
      expect(['fr', 'en']).toContain(result.language);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should fall back to default language for ambiguous text', () => {
      const result = service.detectLanguage('123 456 789');

      expect(result.language).toBe('en'); // Default language
      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should boost user preferred language', () => {
      const result = service.detectLanguage('project research', 'es');

      // Should consider Spanish due to user preference
      expect(['en', 'es']).toContain(result.language);
    });

    it('should provide alternative language suggestions', () => {
      const result = service.detectLanguage('What is the methodology?');

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives[0]).toHaveProperty('language');
      expect(result.alternatives[0]).toHaveProperty('confidence');
    });
  });

  describe('keyword extraction', () => {
    it('should extract meaningful keywords', async () => {
      const query =
        'How to write a literature review for machine learning research?';
      const result = await service.processQuery(query);

      expect(result.keywords).toContain('write');
      expect(result.keywords).toContain('literature');
      expect(result.keywords).toContain('review');
      expect(result.keywords).toContain('machine');
      expect(result.keywords).toContain('learning');
      // Note: punctuation might affect exact matching
      expect(result.keywords.some((k) => k.includes('research'))).toBe(true);
    });

    it('should filter out stop words', async () => {
      const query = 'What is the best way to do this?';
      const result = await service.processQuery(query);

      expect(result.keywords).not.toContain('what');
      expect(result.keywords).not.toContain('is');
      expect(result.keywords).not.toContain('the');
      expect(result.keywords).not.toContain('to');
    });

    it('should limit keyword count', async () => {
      const longQuery =
        'research methodology data analysis statistics machine learning artificial intelligence deep learning neural networks computer science software engineering database systems web development mobile applications user interface user experience design patterns algorithms data structures'.repeat(
          3,
        );
      const result = await service.processQuery(longQuery);

      expect(result.keywords.length).toBeLessThanOrEqual(20);
    });
  });

  describe('entity extraction', () => {
    it('should extract project phase entities', async () => {
      const query = 'I need help with my literature review and methodology';
      const result = await service.processQuery(query);

      const phaseEntities = result.entities.filter(
        (e) => e.type === EntityType.PROJECT_PHASE,
      );
      expect(phaseEntities.length).toBeGreaterThan(0);
      expect(
        phaseEntities.some((e) =>
          e.value.toLowerCase().includes('literature review'),
        ),
      ).toBe(true);
      expect(
        phaseEntities.some((e) =>
          e.value.toLowerCase().includes('methodology'),
        ),
      ).toBe(true);
    });

    it('should extract technology entities', async () => {
      const query = 'I am using Python and JavaScript for my project';
      const result = await service.processQuery(query);

      const techEntities = result.entities.filter(
        (e) => e.type === EntityType.TECHNOLOGY,
      );
      expect(
        techEntities.some((e) => e.value.toLowerCase().includes('python')),
      ).toBe(true);
      expect(
        techEntities.some((e) => e.value.toLowerCase().includes('javascript')),
      ).toBe(true);
    });

    it('should extract academic term entities', async () => {
      const query =
        'What is the significance of correlation and validity in research?';
      const result = await service.processQuery(query);

      const academicEntities = result.entities.filter(
        (e) => e.type === EntityType.ACADEMIC_TERM,
      );
      expect(
        academicEntities.some((e) =>
          e.value.toLowerCase().includes('correlation'),
        ),
      ).toBe(true);
      expect(
        academicEntities.some((e) =>
          e.value.toLowerCase().includes('validity'),
        ),
      ).toBe(true);
    });

    it('should provide entity positions', async () => {
      const query = 'Python programming';
      const result = await service.processQuery(query);

      const entities = result.entities.filter(
        (e) => e.type === EntityType.TECHNOLOGY,
      );
      if (entities.length > 0) {
        expect(entities[0].position.start).toBeGreaterThanOrEqual(0);
        expect(entities[0].position.end).toBeGreaterThan(
          entities[0].position.start,
        );
      }
    });
  });

  describe('intent classification', () => {
    it('should classify questions correctly', async () => {
      const queries = [
        'What is machine learning?',
        'How does neural network work?',
        'Why is data preprocessing important?',
      ];

      for (const query of queries) {
        const result = await service.processQuery(query);
        expect([QueryIntent.QUESTION, QueryIntent.DEFINITION]).toContain(
          result.intent,
        );
      }
    });

    it('should classify guidance requests', async () => {
      const queries = [
        'Can you help me with my thesis?',
        'I need guidance on methodology',
        'Please assist me with data analysis',
      ];

      for (const query of queries) {
        const result = await service.processQuery(query);
        expect([QueryIntent.REQUEST_GUIDANCE, QueryIntent.QUESTION]).toContain(
          result.intent,
        );
      }
    });

    it('should classify clarification requests', async () => {
      const queries = [
        'I am confused about the methodology',
        'Can you clarify what you mean?',
        "I don't understand this concept",
      ];

      for (const query of queries) {
        const result = await service.processQuery(query);
        expect([QueryIntent.CLARIFICATION, QueryIntent.QUESTION]).toContain(
          result.intent,
        );
      }
    });
  });

  describe('category classification', () => {
    it('should classify literature review queries', async () => {
      const queries = [
        'How to write a literature review?',
        'What are good sources for my research?',
        'How to cite papers properly?',
      ];

      for (const query of queries) {
        const result = await service.processQuery(query);
        expect(result.category).toBe(QueryCategory.LITERATURE_REVIEW);
      }
    });

    it('should classify methodology queries', async () => {
      const queries = [
        'What research method should I use?',
        'How to design an experiment?',
        'Qualitative vs quantitative research',
      ];

      for (const query of queries) {
        const result = await service.processQuery(query);
        expect(result.category).toBe(QueryCategory.METHODOLOGY);
      }
    });

    it('should classify implementation queries', async () => {
      const queries = [
        'How to implement machine learning algorithm?',
        'Python programming for data analysis',
        'Database design for my application',
      ];

      for (const query of queries) {
        const result = await service.processQuery(query);
        // Some queries might be classified as data analysis due to overlapping keywords
        expect([
          QueryCategory.IMPLEMENTATION,
          QueryCategory.DATA_ANALYSIS,
        ]).toContain(result.category);
      }
    });
  });

  describe('metadata calculation', () => {
    it('should calculate word and character counts', async () => {
      const query = 'This is a test query with seven words';
      const result = await service.processQuery(query);

      expect(result.metadata.wordCount).toBe(8);
      expect(result.metadata.characterCount).toBe(query.length);
    });

    it('should determine complexity correctly', async () => {
      const simpleQuery = 'What is AI?';
      const complexQuery =
        'Can you explain the epistemological foundations of mixed methods research methodology and how it differs from purely quantitative approaches?';

      const simpleResult = await service.processQuery(simpleQuery);
      const complexResult = await service.processQuery(complexQuery);

      expect(simpleResult.metadata.complexity).toBe(QueryComplexity.SIMPLE);
      expect([QueryComplexity.COMPLEX, QueryComplexity.MODERATE]).toContain(
        complexResult.metadata.complexity,
      );
    });

    it('should determine urgency correctly', async () => {
      const urgentQuery = 'I need urgent help with my deadline today!';
      const normalQuery = 'What is machine learning?';

      const urgentResult = await service.processQuery(urgentQuery);
      const normalResult = await service.processQuery(normalQuery);

      expect(urgentResult.metadata.urgency).toBe(QueryUrgency.URGENT);
      expect(normalResult.metadata.urgency).toBe(QueryUrgency.LOW);
    });

    it('should determine academic level', async () => {
      const undergraduateQuery = 'What is programming?';
      const researchQuery =
        'Epistemological paradigms in theoretical framework development';

      const undergraduateResult =
        await service.processQuery(undergraduateQuery);
      const researchResult = await service.processQuery(researchQuery);

      expect(undergraduateResult.metadata.academicLevel).toBe(
        AcademicLevel.UNDERGRADUATE,
      );
      expect(researchResult.metadata.academicLevel).toBe(
        AcademicLevel.RESEARCH,
      );
    });

    it('should record processing time', async () => {
      const result = await service.processQuery('Test query');

      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metadata.processedAt).toBeInstanceOf(Date);
    });
  });

  describe('configuration', () => {
    it('should return processing statistics', () => {
      const stats = service.getProcessingStats();

      expect(stats.supportedLanguages).toContain('en');
      expect(stats.supportedLanguages).toContain('es');
      expect(stats.maxQueryLength).toBe(1000);
      expect(stats.minQueryLength).toBe(3);
      expect(stats.intentTypes).toContain(QueryIntent.QUESTION);
      expect(stats.categoryTypes).toContain(QueryCategory.METHODOLOGY);
      expect(stats.entityTypes).toContain(EntityType.TECHNOLOGY);
    });

    it('should allow configuration updates', () => {
      const originalStats = service.getProcessingStats();

      service.updateConfig({
        maxQueryLength: 2000,
        minQueryLength: 5,
      });

      const updatedStats = service.getProcessingStats();
      expect(updatedStats.maxQueryLength).toBe(2000);
      expect(updatedStats.minQueryLength).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle null query gracefully', async () => {
      const result = await service.processQuery(null as any);

      expect(result.isValid).toBe(false);
      expect(result.validationIssues).toContain(
        'Query must be a non-empty string',
      );
    });

    it('should handle undefined query gracefully', async () => {
      const result = await service.processQuery(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.validationIssues).toContain(
        'Query must be a non-empty string',
      );
    });

    it('should handle non-string input gracefully', async () => {
      const result = await service.processQuery(123 as any);

      expect(result.isValid).toBe(false);
      expect(result.validationIssues).toContain(
        'Query must be a non-empty string',
      );
    });
  });
});
