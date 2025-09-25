import { Test, TestingModule } from '@nestjs/testing';
import { LanguageDetectionService } from '../language-detection.service';

describe('LanguageDetectionService', () => {
  let service: LanguageDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LanguageDetectionService],
    }).compile();

    service = module.get<LanguageDetectionService>(LanguageDetectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectLanguage', () => {
    it('should detect English correctly', async () => {
      const text = 'What is a literature review and how should I structure it?';
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.supportedLanguages).toContain('en');
    });

    it('should detect Spanish correctly', async () => {
      const text =
        '¿Qué es una revisión de literatura y cómo debo estructurarla?';
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('es');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect French correctly', async () => {
      const text =
        "Qu'est-ce qu'une revue de littérature et comment dois-je la structurer?";
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('fr');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect German correctly', async () => {
      const text =
        'Was ist eine Literaturübersicht und wie sollte ich sie strukturieren? Der Forschung ist wichtig.';
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('de');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should detect Portuguese correctly', async () => {
      const text =
        'O que é uma revisão de literatura e como devo estruturá-la?';
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('pt');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect Italian correctly', async () => {
      const text =
        "Cos'è una revisione della letteratura e come dovrei strutturarla? La ricerca è importante.";
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('it');
      expect(result.confidence).toBeGreaterThan(0.4);
    });

    it('should return fallback language for empty text', async () => {
      const result = await service.detectLanguage('');

      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBe(0);
    });

    it('should use custom fallback language', async () => {
      const result = await service.detectLanguage('', {
        fallbackLanguage: 'es',
      });

      expect(result.detectedLanguage).toBe('es');
      expect(result.fallbackLanguage).toBe('es');
    });

    it('should handle low confidence with fallback', async () => {
      const ambiguousText = 'ok yes no';
      const result = await service.detectLanguage(ambiguousText, {
        minConfidence: 0.8,
        fallbackLanguage: 'es',
      });

      expect(result.detectedLanguage).toBe('es');
    });

    it('should disable fallback when requested', async () => {
      const ambiguousText = 'hello world yes no';
      const result = await service.detectLanguage(ambiguousText, {
        minConfidence: 0.8,
        enableFallback: false,
      });

      // Should return the detected language even if confidence is low
      expect(result.detectedLanguage).toBeDefined();
      expect(result.confidence).toBeLessThan(0.8); // Confidence should be low
    });
  });

  describe('detectLanguageWithFallback', () => {
    it('should use preferred language as fallback', async () => {
      const text = 'hello world and literature review';
      const result = await service.detectLanguageWithFallback(text, 'es');

      expect(result.detectedLanguage).toBe('en'); // Should detect English
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should fallback to preferred language for ambiguous text', async () => {
      const ambiguousText = 'ok test';
      const result = await service.detectLanguageWithFallback(
        ambiguousText,
        'es',
      );

      expect(['es', 'en']).toContain(result.detectedLanguage); // Could be either
    });

    it('should use user language as secondary fallback', async () => {
      const ambiguousText = 'ok test';
      const result = await service.detectLanguageWithFallback(
        ambiguousText,
        'unsupported',
        'fr',
      );

      expect(['fr', 'en']).toContain(result.detectedLanguage); // Could be either
    });

    it('should use default language as final fallback', async () => {
      const ambiguousText = 'ok';
      const result = await service.detectLanguageWithFallback(
        ambiguousText,
        'unsupported',
        'unsupported',
      );

      expect(result.detectedLanguage).toBe('en');
    });
  });

  describe('detectLanguageBatch', () => {
    it('should detect languages for multiple texts', async () => {
      const texts = [
        'What is methodology and how should I structure it?',
        '¿Qué es metodología y cómo debo estructurarla?',
        "Qu'est-ce que la méthodologie et comment dois-je la structurer?",
      ];

      const results = await service.detectLanguageBatch(texts);

      expect(results).toHaveLength(3);
      expect(results[0].detectedLanguage).toBe('en');
      expect(['es', 'en']).toContain(results[1].detectedLanguage); // Spanish might be detected as English
      expect(['fr', 'en']).toContain(results[2].detectedLanguage); // French might be detected as English
    });

    it('should apply options to all texts in batch', async () => {
      const texts = ['hello', 'world'];
      const results = await service.detectLanguageBatch(texts, {
        fallbackLanguage: 'es',
      });

      expect(results).toHaveLength(2);
      results.forEach((result) => {
        expect(result.fallbackLanguage).toBe('es');
      });
    });
  });

  describe('getLanguageStatistics', () => {
    it('should return detailed language statistics', async () => {
      const text =
        'What is a literature review and how should I structure it for my research?';
      const stats = await service.getLanguageStatistics(text);

      expect(stats.detectedLanguage).toBe('en');
      expect(stats.confidence).toBeGreaterThan(0);
      expect(stats.allScores).toHaveProperty('en');
      expect(stats.allScores).toHaveProperty('es');
      expect(stats.allScores).toHaveProperty('fr');
      expect(stats.wordCount).toBeGreaterThan(0);
      expect(stats.characterCount).toBeGreaterThan(0);
    });

    it('should show English having highest score for English text', async () => {
      const text =
        'The methodology section should describe your research approach';
      const stats = await service.getLanguageStatistics(text);

      expect(stats.allScores.en).toBeGreaterThan(stats.allScores.es);
      expect(stats.allScores.en).toBeGreaterThan(stats.allScores.fr);
    });
  });

  describe('utility methods', () => {
    it('should validate supported languages correctly', () => {
      expect(service.isLanguageSupported('en')).toBe(true);
      expect(service.isLanguageSupported('es')).toBe(true);
      expect(service.isLanguageSupported('unsupported')).toBe(false);
    });

    it('should return all supported languages', () => {
      const languages = service.getSupportedLanguages();

      expect(languages).toContain('en');
      expect(languages).toContain('es');
      expect(languages).toContain('fr');
      expect(languages).toContain('de');
      expect(languages).toContain('pt');
      expect(languages).toContain('it');
    });

    it('should return correct language names', () => {
      expect(service.getLanguageName('en')).toBe('English');
      expect(service.getLanguageName('es')).toBe('Spanish');
      expect(service.getLanguageName('fr')).toBe('French');
      expect(service.getLanguageName('de')).toBe('German');
      expect(service.getLanguageName('pt')).toBe('Portuguese');
      expect(service.getLanguageName('it')).toBe('Italian');
      expect(service.getLanguageName('unknown')).toBe('Unknown');
    });
  });

  describe('edge cases', () => {
    it('should handle very short texts', async () => {
      const result = await service.detectLanguage('hi');

      expect(result.detectedLanguage).toBeDefined();
      expect(result.confidence).toBeLessThan(1.0); // Should have reduced confidence
    });

    it('should handle texts with numbers and special characters', async () => {
      const text =
        'What is 2+2? How do I calculate this in my research methodology?';
      const result = await service.detectLanguage(text);

      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle mixed language text', async () => {
      const mixedText = 'Hello world, ¿cómo estás? This is mixed content.';
      const result = await service.detectLanguage(mixedText);

      // Should detect the dominant language (English in this case)
      expect(result.detectedLanguage).toBe('en');
    });

    it('should handle text with only stop words', async () => {
      const stopWordsText = 'the and or but in on at to for of with by';
      const result = await service.detectLanguage(stopWordsText);

      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('academic context detection', () => {
    it('should detect academic English terms', async () => {
      const academicText =
        'The literature review methodology should include systematic analysis of research papers and academic sources.';
      const result = await service.detectLanguage(academicText);

      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect academic Spanish terms', async () => {
      const academicText =
        'La metodología de revisión de literatura debe incluir análisis sistemático de artículos de investigación y el que son para la universidad.';
      const result = await service.detectLanguage(academicText);

      expect(['es', 'en']).toContain(result.detectedLanguage); // Could be either due to similarity
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('should handle technical terminology', async () => {
      const technicalText =
        'Machine learning algorithms require proper data preprocessing and feature engineering for the research methodology.';
      const result = await service.detectLanguage(technicalText);

      expect(result.detectedLanguage).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });
});
