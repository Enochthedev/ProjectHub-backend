import { Test, TestingModule } from '@nestjs/testing';
import { TranslationQualityService } from '../translation-quality.service';

describe('TranslationQualityService', () => {
  let service: TranslationQualityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranslationQualityService],
    }).compile();

    service = module.get<TranslationQualityService>(TranslationQualityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assessTranslationQuality', () => {
    it('should assess high-quality translation', async () => {
      const originalText =
        'A literature review is a comprehensive analysis of existing research on a specific topic.';
      const translatedText =
        'Una revisión de literatura es un análisis completo de la investigación existente sobre un tema específico.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.overallScore).toBeGreaterThan(0.7);
      expect(result.isAcceptable).toBe(true);
      expect(result.metrics.completeness).toBeGreaterThan(0.8);
      expect(result.metrics.accuracy).toBeGreaterThan(0.7);
    });

    it('should detect incomplete translation', async () => {
      const originalText =
        'A literature review is a comprehensive analysis of existing research on a specific topic with detailed methodology.';
      const translatedText = 'Una revisión.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.completeness).toBeLessThan(0.5);
      expect(result.isAcceptable).toBe(false);
      expect(result.issues.some((issue) => issue.type === 'completeness')).toBe(
        true,
      );
    });

    it('should detect untranslated sections', async () => {
      const originalText = 'A literature review is essential for research.';
      const translatedText =
        'Una [UNTRANSLATED] es esencial para investigación.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.completeness).toBeLessThan(0.5);
      expect(
        result.issues.some(
          (issue) =>
            issue.type === 'completeness' && issue.severity === 'critical',
        ),
      ).toBe(true);
    });

    it('should detect mixed languages', async () => {
      const originalText = 'A literature review is essential for research.';
      const translatedText =
        'Una literature review es esencial para the research and el analysis.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.accuracy).toBeLessThan(0.8);
      expect(
        result.issues.some(
          (issue) =>
            issue.type === 'accuracy' &&
            issue.description.includes('Mixed languages'),
        ),
      ).toBe(true);
    });

    it('should preserve academic terminology', async () => {
      const originalText =
        'The literature review methodology should include systematic analysis.';
      const translatedText =
        'La metodología de revisión de literatura debe incluir análisis sistemático.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
        { academicContext: true },
      );

      expect(result.metrics.accuracy).toBeGreaterThan(0.8);
      expect(result.isAcceptable).toBe(true);
    });

    it('should detect poor academic terminology preservation', async () => {
      const originalText =
        'The literature review methodology should include systematic analysis.';
      const translatedText =
        'El análisis de libros debe incluir revisión sistemática.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
        { academicContext: true },
      );

      expect(result.metrics.accuracy).toBeLessThan(0.8);
      expect(
        result.issues.some((issue) =>
          issue.description.includes('Academic terminology'),
        ),
      ).toBe(true);
    });

    it('should detect fluency issues', async () => {
      const originalText =
        'This is a comprehensive guide to research methodology.';
      const translatedText =
        'Esto es es una guía guía completa completa a metodología metodología.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      // The algorithm should detect repetitive patterns
      expect(
        result.issues.some(
          (issue) =>
            issue.type === 'fluency' &&
            issue.description.includes('Repetitive'),
        ),
      ).toBe(true);
    });

    it('should handle formatting preservation', async () => {
      const originalText =
        'Your {specialization} project should follow guidelines.';
      const translatedText =
        'Tu proyecto de {specialization} debe seguir las pautas.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.accuracy).toBeGreaterThan(0.5);
    });

    it('should detect formatting loss', async () => {
      const originalText =
        'Your {specialization} project should follow {{methodology}} guidelines.';
      const translatedText =
        'Tu proyecto debe seguir las pautas de metodología.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.accuracy).toBeLessThan(0.9);
      expect(
        result.issues.some((issue) =>
          issue.description.includes('Formatting elements'),
        ),
      ).toBe(true);
    });

    it('should use strict mode validation', async () => {
      const originalText = 'A good literature review.';
      const translatedText = 'Una buena revisión de literatura.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
        { strictMode: true, minAcceptableScore: 0.95 },
      );

      // Even good translations might not meet strict mode requirements
      expect(result.requiresReview).toBeDefined();
    });

    it('should handle empty texts', async () => {
      const result = await service.assessTranslationQuality('', '', 'en', 'es');

      expect(result.metrics.completeness).toBe(1.0);
      expect(result.isAcceptable).toBe(true);
    });

    it('should handle very long translation', async () => {
      const originalText = 'Short text.';
      const translatedText =
        'This is a very long and verbose translation that goes on and on with unnecessary details and explanations that were not present in the original text.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.completeness).toBeLessThan(1.0);
      expect(
        result.issues.some((issue) =>
          issue.description.includes('significantly longer'),
        ),
      ).toBe(true);
    });
  });

  describe('validateTranslation', () => {
    it('should validate acceptable translation', async () => {
      const originalText = 'Research methodology is important.';
      const translatedText = 'La metodología de investigación es importante.';

      const result = await service.validateTranslation(
        originalText,
        translatedText,
        'en',
        'es',
        { minAcceptableScore: 0.5 },
      );

      expect(result.report.isAcceptable).toBe(true);
    });

    it('should reject translation with critical issues', async () => {
      const originalText = 'Research methodology is important.';
      const translatedText = 'La [UNTRANSLATED] es importante.';

      const result = await service.validateTranslation(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.isValid).toBe(false);
      expect(
        result.report.issues.some((issue) => issue.severity === 'critical'),
      ).toBe(true);
    });
  });

  describe('language support', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
      expect(languages).toContain('de');
      expect(languages).toContain('pt');
      expect(languages).toContain('it');
    });

    it('should validate language pair support', () => {
      expect(service.isLanguagePairSupported('en', 'es')).toBe(true);
      expect(service.isLanguagePairSupported('en', 'unsupported')).toBe(false);
      expect(service.isLanguagePairSupported('unsupported', 'es')).toBe(false);
    });
  });

  describe('style analysis', () => {
    it('should analyze formal text style', () => {
      const formalText =
        'Therefore, the methodology should furthermore consider the implications.';

      // Access private method for testing
      const style = (service as any).analyzeTextStyle(formalText);

      expect(style.formalityScore).toBeGreaterThan(0.5);
    });

    it('should analyze informal text style', () => {
      const informalText =
        'This is really pretty good and quite nice actually.';

      // Access private method for testing
      const style = (service as any).analyzeTextStyle(informalText);

      expect(style.formalityScore).toBeLessThan(0.5);
    });
  });

  describe('cultural adaptation', () => {
    it('should detect cultural references', () => {
      const text = 'Students at the university should maintain a good GPA.';

      // Access private method for testing
      const references = (service as any).findCulturalReferences(text, 'en');

      expect(references.length).toBeGreaterThan(0);
      expect(
        references.some((ref) => ref.toLowerCase().includes('university')),
      ).toBe(true);
    });

    it('should assess cultural adaptation', async () => {
      const originalText = 'University students need good grades.';
      const translatedText =
        'Los estudiantes universitarios necesitan buenas notas.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
        { checkCulturalAdaptation: true },
      );

      expect(result.metrics.culturalAdaptation).toBeDefined();
    });
  });

  describe('consistency checking', () => {
    it('should detect inconsistent terminology', () => {
      const originalText = 'literature review methodology';
      const translatedText = 'lit review metodología';

      // Access private method for testing
      const inconsistencies = (service as any).findInconsistentTerminology(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(inconsistencies.length).toBeGreaterThan(0);
    });

    it('should assess style consistency', async () => {
      const originalText =
        'Therefore, the research methodology should be comprehensive and furthermore detailed.';
      const translatedText = 'La metodología es buena y nice.'; // Much more informal

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      // The algorithm should detect some inconsistency
      expect(result.metrics.overallScore).toBeLessThan(1.0);
    });
  });

  describe('recommendations generation', () => {
    it('should generate appropriate recommendations', async () => {
      const originalText = 'A comprehensive literature review methodology.';
      const translatedText = 'Una [UNTRANSLATED].';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(
        result.recommendations.some((rec) => rec.includes('completeness')),
      ).toBe(true);
    });

    it('should recommend professional review for low scores', async () => {
      const originalText =
        'A comprehensive literature review methodology guide.';
      const translatedText = 'Una cosa.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(
        result.recommendations.some((rec) =>
          rec.includes('professional review'),
        ),
      ).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle texts with only punctuation', async () => {
      const originalText = '...!!!???';
      const translatedText = '...!!!???';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.overallScore).toBeDefined();
      expect(result.isAcceptable).toBeDefined();
    });

    it('should handle very short texts', async () => {
      const originalText = 'Hi.';
      const translatedText = 'Hola.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.overallScore).toBeGreaterThan(0.5);
    });

    it('should handle texts with excessive punctuation', async () => {
      const originalText = 'This is a test.';
      const translatedText =
        'Esto, es, una, prueba, con, mucha, puntuación, excesiva.';

      const result = await service.assessTranslationQuality(
        originalText,
        translatedText,
        'en',
        'es',
      );

      expect(result.metrics.fluency).toBeLessThan(1.0);
    });
  });
});
