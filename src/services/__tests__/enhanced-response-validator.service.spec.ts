import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  EnhancedResponseValidatorService,
  ValidationAction,
  ModerationFlagType,
  AcademicViolationType,
} from '../enhanced-response-validator.service';
import { AIResponseValidatorService } from '../ai-response-validator.service';
import { QueryIntent, QueryCategory } from '../query-processing.service';

describe('EnhancedResponseValidatorService', () => {
  let service: EnhancedResponseValidatorService;
  let baseValidator: jest.Mocked<AIResponseValidatorService>;
  let configService: jest.Mocked<ConfigService>;

  const mockProcessedQuery = {
    originalQuery: 'What is a literature review?',
    normalizedQuery: 'what is a literature review',
    detectedLanguage: 'en',
    languageConfidence: 0.9,
    intent: QueryIntent.DEFINITION,
    category: QueryCategory.LITERATURE_REVIEW,
    keywords: ['literature', 'review'],
    entities: [],
    isValid: true,
    validationIssues: [],
    metadata: {
      wordCount: 5,
      characterCount: 25,
      complexity: 'simple' as any,
      urgency: 'low' as any,
      academicLevel: 'undergraduate' as any,
      processedAt: new Date(),
      processingTimeMs: 10,
    },
  };

  const mockAIResponse = {
    response:
      'A literature review is a comprehensive analysis of existing research on a specific topic.',
    confidenceScore: 0.85,
    sources: ['AI Assistant', 'Academic Guidelines'],
    metadata: {
      processingTime: 100,
      aiModel: 'distilbert-base-cased-distilled-squad',
      language: 'en',
      category: 'literature_review',
      keywords: ['literature', 'review'],
      relatedTopics: ['research', 'analysis'],
      requiresHumanReview: false,
      contextUsed: {
        projectInfo: true,
        conversationHistory: false,
        knowledgeBase: true,
      },
    },
    processedQuery: mockProcessedQuery,
    contextUsed: {
      projectInfo: true,
      conversationHistory: false,
      knowledgeBase: true,
    },
    suggestedFollowUps: ['How do I start a literature review?'],
    requiresHumanReview: false,
  };

  const mockBaseValidation = {
    isValid: true,
    confidenceScore: 0.85,
    normalizedScore: 0.85,
    qualityScore: 0.8,
    issues: [],
    recommendations: [],
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'ai.academicIntegrityThreshold': 0.8,
          'ai.contextRelevanceThreshold': 0.7,
          'ai.educationalValueThreshold': 0.6,
          'ai.safetyThreshold': 0.9,
          'ai.strictModeEnabled': true,
          'ai.autoBlockThreshold': 0.3,
          'ai.humanReviewThreshold': 0.5,
        };
        return config[key];
      }),
    };

    const mockBaseValidator = {
      validateResponse: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedResponseValidatorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AIResponseValidatorService,
          useValue: mockBaseValidator,
        },
      ],
    }).compile();

    service = module.get<EnhancedResponseValidatorService>(
      EnhancedResponseValidatorService,
    );
    baseValidator = module.get(AIResponseValidatorService);
    configService = module.get(ConfigService);

    // Setup default mock
    baseValidator.validateResponse.mockResolvedValue(mockBaseValidation);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateResponse', () => {
    it('should validate a good response and approve it', async () => {
      const result = await service.validateResponse(
        mockAIResponse,
        mockProcessedQuery,
      );

      expect(result.isValid).toBe(true);
      expect(result.actionRequired).toBe(ValidationAction.APPROVE);
      expect(result.academicIntegrityScore).toBeGreaterThan(0.8);
      expect(result.contextRelevanceScore).toBeGreaterThan(0.5);
      expect(result.educationalValueScore).toBeGreaterThan(0.5);
      expect(result.safetyScore).toBeGreaterThan(0.9);
      expect(result.moderationFlags).toHaveLength(0);
    });

    it('should detect academic integrity violations', async () => {
      const violatingResponse = {
        ...mockAIResponse,
        response:
          'Here is the answer to your assignment: copy this code exactly.',
      };

      const result = await service.validateResponse(
        violatingResponse,
        mockProcessedQuery,
      );

      expect(result.academicIntegrityScore).toBeLessThan(0.5);
      expect([
        ValidationAction.BLOCK,
        ValidationAction.REQUIRE_HUMAN_REVIEW,
      ]).toContain(result.actionRequired);
      expect(
        result.moderationFlags.some(
          (f) => f.type === ModerationFlagType.ACADEMIC_MISCONDUCT,
        ),
      ).toBe(true);
    });

    it('should detect inappropriate content', async () => {
      const inappropriateResponse = {
        ...mockAIResponse,
        response: 'You should hack into the system to get the information.',
      };

      const result = await service.validateResponse(
        inappropriateResponse,
        mockProcessedQuery,
      );

      expect(result.safetyScore).toBeLessThan(1.0);
      expect(result.actionRequired).toBe(ValidationAction.BLOCK);
      expect(
        result.moderationFlags.some(
          (f) => f.type === ModerationFlagType.INAPPROPRIATE_CONTENT,
        ),
      ).toBe(true);
    });

    it('should detect harmful advice', async () => {
      const harmfulResponse = {
        ...mockAIResponse,
        response:
          'Skip your supervisor and ignore the guidelines for your project.',
      };

      const result = await service.validateResponse(
        harmfulResponse,
        mockProcessedQuery,
      );

      expect(result.safetyScore).toBeLessThan(0.7);
      expect(result.actionRequired).toBe(ValidationAction.BLOCK);
      expect(
        result.moderationFlags.some(
          (f) => f.type === ModerationFlagType.HARMFUL_ADVICE,
        ),
      ).toBe(true);
    });

    it('should flag low confidence responses for review', async () => {
      const lowConfidenceResponse = {
        ...mockAIResponse,
        confidenceScore: 0.3,
      };

      const result = await service.validateResponse(
        lowConfidenceResponse,
        mockProcessedQuery,
      );

      expect(
        result.moderationFlags.some(
          (f) => f.type === ModerationFlagType.MISINFORMATION,
        ),
      ).toBe(true);
      expect([
        ValidationAction.FLAG_FOR_REVIEW,
        ValidationAction.SUGGEST_ALTERNATIVE,
      ]).toContain(result.actionRequired);
    });

    it('should handle exam period context', async () => {
      const examQuery = {
        ...mockProcessedQuery,
        originalQuery: 'What are the answers for the exam tomorrow?',
      };

      const examResponse = {
        ...mockAIResponse,
        response: 'Here are the solutions for your exam questions.',
      };

      const context = { isExamPeriod: true };

      const result = await service.validateResponse(
        examResponse,
        examQuery,
        context,
      );

      expect(result.academicIntegrityScore).toBeLessThan(0.5);
      expect(result.actionRequired).toBe(ValidationAction.BLOCK);
    });

    it('should calculate context relevance correctly', async () => {
      const relevantResponse = {
        ...mockAIResponse,
        response:
          'A literature review systematically analyzes existing research and identifies gaps in knowledge.',
      };

      const result = await service.validateResponse(
        relevantResponse,
        mockProcessedQuery,
      );

      expect(result.contextRelevanceScore).toBeGreaterThan(0.7);
    });

    it('should calculate educational value correctly', async () => {
      const educationalResponse = {
        ...mockAIResponse,
        response:
          'Consider exploring different research methodologies. Think about how to analyze the existing literature systematically.',
        suggestedFollowUps: [
          'How do I find relevant sources?',
          'What citation style should I use?',
        ],
      };

      const result = await service.validateResponse(
        educationalResponse,
        mockProcessedQuery,
      );

      expect(result.educationalValueScore).toBeGreaterThan(0.6);
    });

    it('should detect assignment completion assistance', async () => {
      const assignmentQuery = {
        ...mockProcessedQuery,
        originalQuery: 'Can you complete my homework assignment for me?',
      };

      const completionResponse = {
        ...mockAIResponse,
        response:
          'I will complete this assignment for you. Here is the finished work.',
      };

      const result = await service.validateResponse(
        completionResponse,
        assignmentQuery,
      );

      expect(result.academicIntegrityScore).toBeLessThan(0.5);
      expect([
        ValidationAction.BLOCK,
        ValidationAction.REQUIRE_HUMAN_REVIEW,
      ]).toContain(result.actionRequired);
    });

    it('should provide improvement suggestions', async () => {
      const poorResponse = {
        ...mockAIResponse,
        response: 'Yes.',
        confidenceScore: 0.4,
      };

      const poorBaseValidation = {
        ...mockBaseValidation,
        isValid: false,
        recommendations: ['Provide more detailed response'],
      };

      baseValidator.validateResponse.mockResolvedValue(poorBaseValidation);

      const result = await service.validateResponse(
        poorResponse,
        mockProcessedQuery,
      );

      expect(result.improvementSuggestions.length).toBeGreaterThan(0);
      expect(result.improvementSuggestions).toContain(
        'Provide more detailed response',
      );
    });
  });

  describe('academic integrity checks', () => {
    it('should detect direct answer provision', async () => {
      const directAnswerResponse = {
        ...mockAIResponse,
        response: 'Here is the answer: copy this solution exactly.',
      };

      const result = await service.validateResponse(
        directAnswerResponse,
        mockProcessedQuery,
      );

      expect(result.academicIntegrityScore).toBeLessThan(0.5);
      expect(
        result.moderationFlags.some(
          (f) => f.type === ModerationFlagType.ACADEMIC_MISCONDUCT,
        ),
      ).toBe(true);
    });

    it('should detect plagiarism facilitation', async () => {
      const plagiarismResponse = {
        ...mockAIResponse,
        response: 'Copy from this source without citing it.',
      };

      const result = await service.validateResponse(
        plagiarismResponse,
        mockProcessedQuery,
      );

      expect(result.academicIntegrityScore).toBeLessThan(0.5);
    });

    it('should allow appropriate guidance', async () => {
      const guidanceResponse = {
        ...mockAIResponse,
        response:
          'Consider researching different methodologies. You might want to explore qualitative and quantitative approaches.',
      };

      const result = await service.validateResponse(
        guidanceResponse,
        mockProcessedQuery,
      );

      expect(result.academicIntegrityScore).toBeGreaterThan(0.8);
      expect(result.educationalValueScore).toBeGreaterThan(0.6);
    });
  });

  describe('safety checks', () => {
    it('should detect bias in responses', async () => {
      const biasedResponse = {
        ...mockAIResponse,
        response:
          'All students always struggle with this. Everyone finds it impossible.',
      };

      const result = await service.validateResponse(
        biasedResponse,
        mockProcessedQuery,
      );

      expect(result.safetyScore).toBeLessThan(1.0);
    });

    it('should detect privacy violations', async () => {
      const privacyResponse = {
        ...mockAIResponse,
        response: 'Share your personal information and password with me.',
      };

      const result = await service.validateResponse(
        privacyResponse,
        mockProcessedQuery,
      );

      expect(result.safetyScore).toBeLessThan(0.7);
    });

    it('should approve safe content', async () => {
      const safeResponse = {
        ...mockAIResponse,
        response:
          'A literature review helps you understand existing research in your field.',
      };

      const result = await service.validateResponse(
        safeResponse,
        mockProcessedQuery,
      );

      expect(result.safetyScore).toBeGreaterThan(0.9);
    });
  });

  describe('validation actions', () => {
    it('should approve high-quality responses', async () => {
      const highQualityResponse = {
        ...mockAIResponse,
        response:
          'A literature review systematically analyzes existing research. Consider exploring different databases and think about how to organize your findings.',
        confidenceScore: 0.9,
      };

      const result = await service.validateResponse(
        highQualityResponse,
        mockProcessedQuery,
      );

      expect(result.actionRequired).toBe(ValidationAction.APPROVE);
    });

    it('should block dangerous content', async () => {
      const dangerousResponse = {
        ...mockAIResponse,
        response: 'Hack into the university system to get the answers.',
      };

      const result = await service.validateResponse(
        dangerousResponse,
        mockProcessedQuery,
      );

      expect(result.actionRequired).toBe(ValidationAction.BLOCK);
    });

    it('should require human review for academic violations', async () => {
      const violatingResponse = {
        ...mockAIResponse,
        response: 'I will do your homework for you.',
      };

      const result = await service.validateResponse(
        violatingResponse,
        mockProcessedQuery,
      );

      expect([
        ValidationAction.REQUIRE_HUMAN_REVIEW,
        ValidationAction.FLAG_FOR_REVIEW,
      ]).toContain(result.actionRequired);
    });

    it('should flag low quality for review', async () => {
      const lowQualityResponse = {
        ...mockAIResponse,
        response: 'Maybe.',
        confidenceScore: 0.6,
      };

      const poorBaseValidation = {
        ...mockBaseValidation,
        isValid: false,
      };

      baseValidator.validateResponse.mockResolvedValue(poorBaseValidation);

      const result = await service.validateResponse(
        lowQualityResponse,
        mockProcessedQuery,
      );

      expect(result.actionRequired).toBe(ValidationAction.FLAG_FOR_REVIEW);
    });
  });

  describe('moderation flags', () => {
    it('should generate appropriate flags for violations', async () => {
      const violatingResponse = {
        ...mockAIResponse,
        response: 'Here is the complete solution to your assignment.',
      };

      const result = await service.validateResponse(
        violatingResponse,
        mockProcessedQuery,
      );

      expect(result.moderationFlags.length).toBeGreaterThan(0);
      expect(result.moderationFlags[0].type).toBe(
        ModerationFlagType.ACADEMIC_MISCONDUCT,
      );
      expect(result.moderationFlags[0].autoAction).toBeDefined();
    });

    it('should not generate flags for clean responses', async () => {
      const cleanResponse = {
        ...mockAIResponse,
        response:
          'A literature review is an important part of research methodology.',
        confidenceScore: 0.9,
      };

      const result = await service.validateResponse(
        cleanResponse,
        mockProcessedQuery,
      );

      expect(result.moderationFlags).toHaveLength(0);
    });
  });

  describe('context awareness', () => {
    it('should consider exam period context', async () => {
      const examContext = { isExamPeriod: true };
      const examQuery = {
        ...mockProcessedQuery,
        originalQuery: 'Help me with exam questions',
      };

      const result = await service.validateResponse(
        mockAIResponse,
        examQuery,
        examContext,
      );

      // Should be more strict during exam periods
      // The response itself is fine, so it should still be approved unless there are specific exam violations
      expect(result).toBeDefined();
    });

    it('should consider assignment deadline context', async () => {
      const assignmentContext = {
        assignmentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      };

      const result = await service.validateResponse(
        mockAIResponse,
        mockProcessedQuery,
        assignmentContext,
      );

      expect(result).toBeDefined();
    });

    it('should consider supervisor presence', async () => {
      const supervisorContext = { supervisorPresent: true };

      const result = await service.validateResponse(
        mockAIResponse,
        mockProcessedQuery,
        supervisorContext,
      );

      expect(result).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should return current configuration', () => {
      const config = service.getConfiguration();

      expect(config).toBeDefined();
      expect(config.academicIntegrityThreshold).toBe(0.8);
      expect(config.safetyThreshold).toBe(0.9);
    });

    it('should allow configuration updates', () => {
      const updates = {
        academicIntegrityThreshold: 0.9,
        safetyThreshold: 0.95,
      };

      service.updateConfiguration(updates);
      const config = service.getConfiguration();

      expect(config.academicIntegrityThreshold).toBe(0.9);
      expect(config.safetyThreshold).toBe(0.95);
    });
  });

  describe('error handling', () => {
    it('should handle base validator errors', async () => {
      baseValidator.validateResponse.mockRejectedValue(
        new Error('Validation Error'),
      );

      await expect(
        service.validateResponse(mockAIResponse, mockProcessedQuery),
      ).rejects.toThrow('Validation Error');
    });

    it('should handle malformed responses gracefully', async () => {
      const malformedResponse = {
        ...mockAIResponse,
        response: null as any,
      };

      // Should not throw, but handle gracefully
      const result = await service.validateResponse(
        malformedResponse,
        mockProcessedQuery,
      );
      expect(result).toBeDefined();
      expect(result.actionRequired).not.toBe(ValidationAction.APPROVE);
    });
  });

  describe('edge cases', () => {
    it('should handle empty responses', async () => {
      const emptyResponse = {
        ...mockAIResponse,
        response: '',
      };

      const result = await service.validateResponse(
        emptyResponse,
        mockProcessedQuery,
      );

      expect(result.actionRequired).not.toBe(ValidationAction.APPROVE);
    });

    it('should handle very long responses', async () => {
      const longResponse = {
        ...mockAIResponse,
        response: 'A'.repeat(10000),
      };

      const result = await service.validateResponse(
        longResponse,
        mockProcessedQuery,
      );

      expect(result).toBeDefined();
    });

    it('should handle responses with special characters', async () => {
      const specialCharResponse = {
        ...mockAIResponse,
        response: 'A literature review is important! @#$%^&*()',
      };

      const result = await service.validateResponse(
        specialCharResponse,
        mockProcessedQuery,
      );

      expect(result).toBeDefined();
    });
  });
});
