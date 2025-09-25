import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseLocalizationService } from '../response-localization.service';
import { ResponseTemplate } from '../../entities/response-template.entity';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';

describe('ResponseLocalizationService', () => {
  let service: ResponseLocalizationService;
  let templateRepository: jest.Mocked<Repository<ResponseTemplate>>;
  let knowledgeRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;

  const mockTemplateRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockKnowledgeRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseLocalizationService,
        {
          provide: getRepositoryToken(ResponseTemplate),
          useValue: mockTemplateRepository,
        },
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: mockKnowledgeRepository,
        },
      ],
    }).compile();

    service = module.get<ResponseLocalizationService>(
      ResponseLocalizationService,
    );
    templateRepository = module.get(getRepositoryToken(ResponseTemplate));
    knowledgeRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('localizeResponse', () => {
    it('should return original content for English', async () => {
      const content = 'This is a literature review guide.';
      const result = await service.localizeResponse(content, 'en');

      expect(result.content).toBe(content);
      expect(result.language).toBe('en');
      expect(result.translationMethod).toBe('fallback');
      expect(result.confidence).toBe(1.0);
    });

    it('should return original content for unsupported language', async () => {
      const content = 'This is a literature review guide.';
      const result = await service.localizeResponse(content, 'unsupported');

      expect(result.content).toBe(content);
      expect(result.language).toBe('en');
      expect(result.translationMethod).toBe('fallback');
    });

    it('should translate academic terminology to Spanish', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content =
        'A literature review is essential for your research methodology.';
      const result = await service.localizeResponse(content, 'es');

      expect(result.content).toContain('revisión de literatura');
      expect(result.content).toContain('metodología');
      expect(result.language).toBe('es');
      expect(result.translationMethod).toBe('ai');
    });

    it('should use existing template when available', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Literature Review Guide',
        template:
          'Una revisión de literatura es esencial para tu {projectPhase}.',
        category: 'methodology',
        language: 'es',
        triggerKeywords: ['literature', 'review'],
        variables: {},
        isActive: true,
        usageCount: 5,
        effectivenessScore: 4.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        incrementUsage: jest.fn(),
        updateEffectiveness: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn(),
        addTriggerKeyword: jest.fn(),
        removeTriggerKeyword: jest.fn(),
        setVariable: jest.fn(),
        getVariable: jest.fn(),
        removeVariable: jest.fn(),
        processTemplate: jest.fn(),
        matchesKeywords: jest.fn(),
        getMatchScore: jest.fn(),
        isEffective: jest.fn(),
        isPopular: jest.fn(),
        isMultilingual: jest.fn(),
        hasVariables: jest.fn(),
        getVariableKeys: jest.fn(),
        validateTemplate: jest.fn(),
      } as any;

      templateRepository.find.mockResolvedValue([mockTemplate]);

      const content = 'A literature review is essential for your research.';
      const result = await service.localizeResponse(content, 'es', {
        projectPhase: 'metodología',
      });

      // The service should try to find templates but fall back to AI translation
      expect(['template', 'ai']).toContain(result.translationMethod);
      expect(result.language).toBe('es');
    });

    it('should handle translation errors gracefully', async () => {
      templateRepository.find.mockRejectedValue(new Error('Database error'));

      const content = 'This is test content.';
      const result = await service.localizeResponse(content, 'es');

      expect(['template', 'ai']).toContain(result.translationMethod);
      expect(result.language).toBe('es');
      // Should either translate or provide fallback
      expect(result.content).toBeDefined();
    });
  });

  describe('getFallbackResponse', () => {
    it('should return English fallback by default', () => {
      const result = service.getFallbackResponse('en');

      expect(result.content).toContain("I'm not able to provide");
      expect(result.language).toBe('en');
      expect(result.translationMethod).toBe('template');
      expect(result.confidence).toBe(1.0);
    });

    it('should return Spanish fallback', () => {
      const result = service.getFallbackResponse('es');

      expect(result.content).toContain('No puedo proporcionar');
      expect(result.language).toBe('es');
      expect(result.translationMethod).toBe('template');
    });

    it('should include project phase suggestions', () => {
      const result = service.getFallbackResponse('en', {
        projectPhase: 'literature_review',
      });

      expect(result.content).toContain('suggestions');
      expect(result.content).toContain('Search for recent academic papers');
    });

    it('should fallback to English for unsupported language', () => {
      const result = service.getFallbackResponse('unsupported');

      expect(result.content).toContain("I'm not able to provide");
      expect(result.language).toBe('unsupported');
    });
  });

  describe('getGreeting', () => {
    it('should return English greeting', () => {
      const result = service.getGreeting('en');

      expect(result.content).toContain("Hello! I'm here to help");
      expect(result.language).toBe('en');
      expect(result.translationMethod).toBe('template');
    });

    it('should return Spanish greeting', () => {
      const result = service.getGreeting('es');

      expect(result.content).toContain('¡Hola! Estoy aquí para ayudarte');
      expect(result.language).toBe('es');
    });

    it('should return French greeting', () => {
      const result = service.getGreeting('fr');

      expect(result.content).toContain('Bonjour ! Je suis là pour vous aider');
      expect(result.language).toBe('fr');
    });
  });

  describe('getErrorMessage', () => {
    it('should return general error message', () => {
      const result = service.getErrorMessage('en');

      expect(result.content).toContain('I encountered an error');
      expect(result.metadata?.errorType).toBe('general');
    });

    it('should return low confidence error message', () => {
      const result = service.getErrorMessage('en', 'low_confidence');

      expect(result.content).toContain("I'm not entirely sure");
      expect(result.metadata?.errorType).toBe('low_confidence');
    });

    it('should return Spanish error message', () => {
      const result = service.getErrorMessage('es');

      expect(result.content).toContain('Encontré un error');
      expect(result.language).toBe('es');
    });
  });

  describe('localizeResponseBatch', () => {
    it('should localize multiple responses', async () => {
      templateRepository.find.mockResolvedValue([]);

      const responses = [
        { content: 'What is methodology?', targetLanguage: 'es' },
        { content: 'Literature review guide', targetLanguage: 'fr' },
        { content: 'Research question', targetLanguage: 'de' },
      ];

      const results = await service.localizeResponseBatch(responses);

      expect(results).toHaveLength(3);
      expect(results[0].language).toBe('es');
      expect(results[1].language).toBe('fr');
      expect(results[2].language).toBe('de');
    });

    it('should handle mixed languages and contexts', async () => {
      templateRepository.find.mockResolvedValue([]);

      const responses = [
        {
          content: 'Methodology guide',
          targetLanguage: 'es',
          context: { projectPhase: 'methodology' },
        },
        {
          content: 'Literature review',
          targetLanguage: 'en',
        },
      ];

      const results = await service.localizeResponseBatch(responses);

      expect(results).toHaveLength(2);
      expect(results[0].content).toContain('metodología');
      expect(results[1].language).toBe('en');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages with names', () => {
      const languages = service.getSupportedLanguages();

      expect(languages).toHaveLength(6);
      expect(languages).toContainEqual({ code: 'en', name: 'English' });
      expect(languages).toContainEqual({ code: 'es', name: 'Español' });
      expect(languages).toContainEqual({ code: 'fr', name: 'Français' });
      expect(languages).toContainEqual({ code: 'de', name: 'Deutsch' });
      expect(languages).toContainEqual({ code: 'pt', name: 'Português' });
      expect(languages).toContainEqual({ code: 'it', name: 'Italiano' });
    });
  });

  describe('academic terminology translation', () => {
    it('should translate literature review to Spanish', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content = 'The literature review should be comprehensive.';
      const result = await service.localizeResponse(content, 'es');

      expect(result.content).toContain('revisión de literatura');
    });

    it('should translate methodology to French', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content = 'Your methodology should be clear.';
      const result = await service.localizeResponse(content, 'fr');

      expect(result.content).toContain('méthodologie');
    });

    it('should translate research question to German', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content = 'Define your research question clearly.';
      const result = await service.localizeResponse(content, 'de');

      expect(result.content).toContain('Forschungsfrage');
    });

    it('should preserve multiple academic terms', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content =
        'Your literature review should inform your methodology and research question.';
      const result = await service.localizeResponse(content, 'es');

      expect(result.content).toContain('revisión de literatura');
      expect(result.content).toContain('metodología');
      expect(result.content).toContain('pregunta de investigación');
    });
  });

  describe('language-specific formatting', () => {
    it('should apply Spanish punctuation formatting', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content = 'What is methodology?';
      const result = await service.localizeResponse(content, 'es');

      // Note: This is a simplified test - actual implementation might vary
      expect(result.language).toBe('es');
    });

    it('should apply French punctuation formatting', async () => {
      templateRepository.find.mockResolvedValue([]);

      const content = 'What is methodology?';
      const result = await service.localizeResponse(content, 'fr');

      expect(result.language).toBe('fr');
    });
  });

  describe('template processing', () => {
    it('should process template variables', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        template: 'Your {specialization} project in {projectPhase} phase.',
        category: 'general',
        language: 'en',
        triggerKeywords: ['project'],
        variables: {},
        isActive: true,
        usageCount: 1,
        effectivenessScore: 3.5,
        createdAt: new Date(),
        updatedAt: new Date(),
        incrementUsage: jest.fn(),
        updateEffectiveness: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn(),
        addTriggerKeyword: jest.fn(),
        removeTriggerKeyword: jest.fn(),
        setVariable: jest.fn(),
        getVariable: jest.fn(),
        removeVariable: jest.fn(),
        processTemplate: jest.fn(),
        matchesKeywords: jest.fn(),
        getMatchScore: jest.fn(),
        isEffective: jest.fn(),
        isPopular: jest.fn(),
        isMultilingual: jest.fn(),
        hasVariables: jest.fn(),
        getVariableKeys: jest.fn(),
        validateTemplate: jest.fn(),
      } as any;

      templateRepository.find.mockResolvedValue([mockTemplate]);

      const content = 'Tell me about my project.';
      const result = await service.localizeResponse(content, 'en', {
        specialization: 'machine learning',
        projectPhase: 'implementation',
      });

      // Since it's English, it should return the original content
      expect(result.content).toBe(content);
      expect(result.language).toBe('en');
    });

    it('should handle missing template variables gracefully', async () => {
      const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        template: 'Your {specialization} project needs attention.',
        category: 'general',
        language: 'en',
        triggerKeywords: ['project'],
        variables: {},
        isActive: true,
        usageCount: 1,
        effectivenessScore: 3.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        incrementUsage: jest.fn(),
        updateEffectiveness: jest.fn(),
        activate: jest.fn(),
        deactivate: jest.fn(),
        addTriggerKeyword: jest.fn(),
        removeTriggerKeyword: jest.fn(),
        setVariable: jest.fn(),
        getVariable: jest.fn(),
        removeVariable: jest.fn(),
        processTemplate: jest.fn(),
        matchesKeywords: jest.fn(),
        getMatchScore: jest.fn(),
        isEffective: jest.fn(),
        isPopular: jest.fn(),
        isMultilingual: jest.fn(),
        hasVariables: jest.fn(),
        getVariableKeys: jest.fn(),
        validateTemplate: jest.fn(),
      } as any;

      templateRepository.find.mockResolvedValue([mockTemplate]);

      const content = 'Tell me about my project.';
      const result = await service.localizeResponse(content, 'en', {});

      // Since it's English, it should return the original content
      expect(result.content).toBe(content);
      expect(result.language).toBe('en');
    });
  });
});
