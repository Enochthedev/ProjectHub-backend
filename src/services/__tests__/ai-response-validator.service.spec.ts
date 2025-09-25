import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  AIResponseValidatorService,
  ValidationIssueType,
} from '../ai-response-validator.service';

describe('AIResponseValidatorService', () => {
  let service: AIResponseValidatorService;
  let configService: ConfigService;

  const mockConfig = {
    'huggingFace.qaConfidenceThreshold': 0.3,
    'huggingFace.qaMaxAnswerLength': 200,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIResponseValidatorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<AIResponseValidatorService>(
      AIResponseValidatorService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateResponse', () => {
    it('should validate a high-quality response successfully', async () => {
      const answer =
        'A literature review is a comprehensive analysis of existing research on a specific topic. It involves systematically searching and evaluating relevant academic sources.';
      const question = 'What is a literature review?';
      const context = 'Academic research methodology guidelines';
      const confidence = 0.85;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.isValid).toBe(true);
      expect(result.confidenceScore).toBe(0.85);
      expect(result.normalizedScore).toBeGreaterThan(0.5);
      expect(result.qualityScore).toBeGreaterThan(0.6);
      // May have length warning but should still be valid overall
      const highSeverityIssues = result.issues.filter(
        (issue) => issue.severity === 'high',
      );
      expect(highSeverityIssues).toHaveLength(0);
    });

    it('should reject response with low confidence', async () => {
      const answer = 'A literature review is important for research.';
      const question = 'What is a literature review?';
      const context = 'Academic research methodology';
      const confidence = 0.15; // Below threshold

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.LOW_CONFIDENCE,
          severity: 'high',
        }),
      );
      expect(result.recommendations).toContain(
        'Consider using fallback templates or requesting human assistance',
      );
    });

    it('should reject response that is too short', async () => {
      const answer = 'Yes.';
      const question = 'What is a literature review?';
      const context = 'Academic research methodology';
      const confidence = 0.8;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.INCOMPLETE_ANSWER,
          severity: 'high',
        }),
      );
    });

    it('should flag response that is too long', async () => {
      const answer = 'A'.repeat(300); // Exceeds max length
      const question = 'What is a literature review?';
      const context = 'Academic research methodology';
      const confidence = 0.8;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.INCOMPLETE_ANSWER,
          severity: 'medium',
          message: expect.stringContaining('too long'),
        }),
      );
    });

    it('should detect inappropriate content', async () => {
      const answer = 'You can hack the system to get better grades.';
      const question = 'How to improve my grades?';
      const context = 'Academic guidance';
      const confidence = 0.8;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.INAPPROPRIATE_CONTENT,
          severity: 'high',
        }),
      );
      expect(result.recommendations).toContain(
        'Block response and use appropriate fallback content',
      );
    });

    it('should detect academic integrity violations in questions', async () => {
      const answer = 'Here is the complete solution to your assignment.';
      const question = 'Do my homework for me';
      const context = 'Student request';
      const confidence = 0.8;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.ACADEMIC_INTEGRITY,
          severity: 'high',
        }),
      );
    });

    it('should detect direct solution provision', async () => {
      const answer =
        'Here is the answer: copy this code exactly and submit it.';
      const question = 'How to implement this algorithm?';
      const context = 'Programming help';
      const confidence = 0.8;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.ACADEMIC_INTEGRITY,
          severity: 'medium',
        }),
      );
    });

    it('should handle empty or meaningless responses', async () => {
      const answer = 'The and but for are with.';
      const question = 'What is methodology?';
      const context = 'Research methods';
      const confidence = 0.8;

      const result = await service.validateResponse(
        answer,
        question,
        context,
        confidence,
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: ValidationIssueType.INCOMPLETE_ANSWER,
          severity: 'high',
          message: 'Answer lacks meaningful content',
        }),
      );
    });
  });

  describe('normalizeConfidenceScore', () => {
    it('should normalize scores to 0-1 range', () => {
      expect(service.normalizeConfidenceScore(-0.5)).toBeGreaterThanOrEqual(0);
      expect(service.normalizeConfidenceScore(1.5)).toBeLessThanOrEqual(1);
      expect(service.normalizeConfidenceScore(0.5)).toBeCloseTo(0.5, 1);
    });

    it('should apply sigmoid transformation', () => {
      const lowScore = service.normalizeConfidenceScore(0.1);
      const highScore = service.normalizeConfidenceScore(0.9);

      expect(highScore).toBeGreaterThan(lowScore);
      expect(lowScore).toBeLessThan(0.3);
      expect(highScore).toBeGreaterThan(0.7);
    });
  });

  describe('calculateQualityMetrics', () => {
    it('should calculate comprehensive quality metrics', () => {
      const answer =
        'A literature review is a systematic analysis of existing research. It provides evidence and identifies gaps in knowledge.';
      const question = 'What is a literature review?';
      const context = 'Academic research';
      const confidence = 0.8;

      const metrics = service.calculateQualityMetrics(
        answer,
        question,
        context,
        confidence,
      );

      expect(metrics.confidence).toBe(0.8);
      expect(metrics.relevance).toBeGreaterThan(0);
      expect(metrics.completeness).toBeGreaterThan(0);
      expect(metrics.clarity).toBeGreaterThan(0);
      expect(metrics.academicAppropriate).toBeGreaterThan(0);
      expect(metrics.overall).toBeGreaterThan(0);
      expect(metrics.overall).toBeLessThanOrEqual(1);
    });

    it('should give higher relevance score for keyword overlap', () => {
      const answer1 =
        'Literature review is a systematic analysis of research papers and academic sources.';
      const answer2 =
        'This is about something completely different and unrelated.';
      const question = 'What is a literature review?';
      const context = 'Academic research';
      const confidence = 0.8;

      const metrics1 = service.calculateQualityMetrics(
        answer1,
        question,
        context,
        confidence,
      );
      const metrics2 = service.calculateQualityMetrics(
        answer2,
        question,
        context,
        confidence,
      );

      expect(metrics1.relevance).toBeGreaterThan(metrics2.relevance);
    });

    it('should give higher completeness score for structured answers', () => {
      const structuredAnswer =
        'A literature review serves multiple purposes. First, it analyzes existing research. Second, it identifies gaps. Therefore, it provides a foundation for new studies.';
      const simpleAnswer = 'It reviews literature.';
      const question = 'What is a literature review?';
      const context = 'Academic research';
      const confidence = 0.8;

      const structuredMetrics = service.calculateQualityMetrics(
        structuredAnswer,
        question,
        context,
        confidence,
      );
      const simpleMetrics = service.calculateQualityMetrics(
        simpleAnswer,
        question,
        context,
        confidence,
      );

      expect(structuredMetrics.completeness).toBeGreaterThanOrEqual(
        simpleMetrics.completeness,
      );
    });

    it('should give higher academic score for academic language', () => {
      const academicAnswer =
        'Research methodology involves systematic analysis of literature, hypothesis formation, and evidence-based conclusions.';
      const casualAnswer = 'You just look at stuff and write about it.';
      const question = 'What is research methodology?';
      const context = 'Academic research';
      const confidence = 0.8;

      const academicMetrics = service.calculateQualityMetrics(
        academicAnswer,
        question,
        context,
        confidence,
      );
      const casualMetrics = service.calculateQualityMetrics(
        casualAnswer,
        question,
        context,
        confidence,
      );

      expect(academicMetrics.academicAppropriate).toBeGreaterThan(
        casualMetrics.academicAppropriate,
      );
    });
  });

  describe('getValidationConfig', () => {
    it('should return current configuration', () => {
      const config = service.getValidationConfig();

      expect(config).toHaveProperty('confidenceThreshold');
      expect(config).toHaveProperty('qualityThreshold');
      expect(config).toHaveProperty('maxAnswerLength');
      expect(config).toHaveProperty('minAnswerLength');
      expect(config.confidenceThreshold).toBe(0.3);
    });
  });

  describe('updateThresholds', () => {
    it('should update confidence threshold', () => {
      service.updateThresholds(0.5);
      const config = service.getValidationConfig();
      expect(config.confidenceThreshold).toBe(0.5);
    });

    it('should update quality threshold', () => {
      service.updateThresholds(undefined, 0.8);
      const config = service.getValidationConfig();
      expect(config.qualityThreshold).toBe(0.8);
    });

    it('should clamp thresholds to valid range', () => {
      service.updateThresholds(-0.5, 1.5);
      const config = service.getValidationConfig();
      expect(config.confidenceThreshold).toBe(0);
      expect(config.qualityThreshold).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty answer', async () => {
      const result = await service.validateResponse(
        '',
        'What is this?',
        'Context',
        0.8,
      );

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should handle empty question', async () => {
      const result = await service.validateResponse(
        'This is an answer',
        '',
        'Context',
        0.8,
      );

      // Should still process but may have lower relevance
      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle special characters and formatting', async () => {
      const answer =
        'A literature review is: 1) systematic, 2) comprehensive, 3) analytical. It includes citations [1,2,3] and references (Smith, 2020).';
      const result = await service.validateResponse(
        answer,
        'What is a literature review?',
        'Academic',
        0.8,
      );

      expect(result).toBeDefined();
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });
});
