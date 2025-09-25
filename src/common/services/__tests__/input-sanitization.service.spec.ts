import { Test, TestingModule } from '@nestjs/testing';
import { InputSanitizationService } from '../input-sanitization.service';
import {
  MalformedSearchQueryException,
  SearchQueryException,
} from '../../exceptions/project.exception';

describe('InputSanitizationService', () => {
  let service: InputSanitizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InputSanitizationService],
    }).compile();

    service = module.get<InputSanitizationService>(InputSanitizationService);
  });

  describe('sanitizeSearchQuery', () => {
    it('should return empty string for null or undefined input', () => {
      expect(service.sanitizeSearchQuery(null as any)).toBe('');
      expect(service.sanitizeSearchQuery(undefined as any)).toBe('');
    });

    it('should sanitize normal search queries', () => {
      expect(service.sanitizeSearchQuery('machine learning')).toBe(
        'machine learning',
      );
      expect(service.sanitizeSearchQuery('  web   development  ')).toBe(
        'web development',
      );
    });

    it('should throw exception for queries that are too long', () => {
      const longQuery = 'a'.repeat(501);
      expect(() => service.sanitizeSearchQuery(longQuery)).toThrow(
        SearchQueryException,
      );
    });

    it('should detect and block SQL injection attempts', () => {
      const sqlInjections = [
        'SELECT * FROM projects',
        'UNION SELECT password FROM users',
        'INSERT INTO projects VALUES',
        'DROP TABLE projects',
      ];

      sqlInjections.forEach((injection) => {
        expect(() => service.sanitizeSearchQuery(injection)).toThrow(
          MalformedSearchQueryException,
        );
      });
    });

    it('should remove dangerous characters', () => {
      expect(
        service.sanitizeSearchQuery('test<script>alert("xss")</script>'),
      ).toBe('testscriptalert("xss")/script');
      expect(service.sanitizeSearchQuery('search"term\'with&quotes')).toBe(
        'search"term\'with&quotes',
      );
    });

    it('should throw exception if only invalid characters remain', () => {
      expect(() => service.sanitizeSearchQuery('<>')).toThrow(
        MalformedSearchQueryException,
      );
    });
  });

  describe('sanitizeProjectContent', () => {
    it('should sanitize project titles', () => {
      const title = 'AI Chatbot <script>alert("xss")</script>';
      const result = service.sanitizeProjectContent(title, 'title');
      expect(result).toBe('AI Chatbot');
    });

    it('should sanitize project abstracts', () => {
      const abstract =
        'This project involves <iframe src="malicious.com"></iframe> development';
      const result = service.sanitizeProjectContent(abstract, 'abstract');
      expect(result).toBe('This project involves development');
    });

    it('should throw exception for content that is too long', () => {
      const longTitle = 'a'.repeat(201);
      expect(() => service.sanitizeProjectContent(longTitle, 'title')).toThrow(
        SearchQueryException,
      );
    });

    it('should escape HTML entities properly', () => {
      const content = 'Test & "quotes" and <tags>';
      const result = service.sanitizeProjectContent(content, 'title');
      expect(result).toBe('Test &amp; &quot;quotes&quot; and &lt;tags&gt;');
    });

    it('should remove XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("xss")</script>',
        '<iframe src="malicious.com"></iframe>',
        '<object data="malicious.swf"></object>',
        'javascript:alert("xss")',
        'onload="alert(\'xss\')"',
      ];

      xssPatterns.forEach((pattern) => {
        const result = service.sanitizeProjectContent(
          `Test ${pattern} content`,
          'abstract',
        );
        expect(result).not.toContain(pattern);
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should validate and return valid HTTP URLs', () => {
      const validUrls = [
        {
          input: 'https://github.com/user/repo',
          expected: 'https://github.com/user/repo',
        },
        { input: 'http://example.com', expected: 'http://example.com/' },
        {
          input: 'https://demo.example.com/path?param=value',
          expected: 'https://demo.example.com/path?param=value',
        },
      ];

      validUrls.forEach(({ input, expected }) => {
        expect(service.sanitizeUrl(input)).toBe(expected);
      });
    });

    it('should throw exception for invalid protocols', () => {
      const invalidUrls = [
        'ftp://example.com',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
      ];

      invalidUrls.forEach((url) => {
        expect(() => service.sanitizeUrl(url)).toThrow(SearchQueryException);
      });
    });

    it('should throw exception for malformed URLs', () => {
      const malformedUrls = ['not-a-url', 'http://', 'https://[invalid-host]'];

      malformedUrls.forEach((url) => {
        expect(() => service.sanitizeUrl(url)).toThrow(SearchQueryException);
      });
    });

    it('should throw exception for URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      expect(() => service.sanitizeUrl(longUrl)).toThrow(SearchQueryException);
    });

    it('should detect XSS patterns in URLs', () => {
      const xssUrl = 'https://example.com/<script>alert("xss")</script>';
      expect(() => service.sanitizeUrl(xssUrl)).toThrow(SearchQueryException);
    });
  });

  describe('sanitizeTags', () => {
    it('should sanitize array of tags', () => {
      const tags = [
        '  Machine Learning  ',
        'Web<script>Dev</script>',
        'AI & ML',
      ];
      const result = service.sanitizeTags(tags);
      expect(result).toEqual([
        'machine learning',
        'webscriptdev/script',
        'ai & ml',
      ]);
    });

    it('should filter out empty tags', () => {
      const tags = ['valid', '', '   ', 'another'];
      const result = service.sanitizeTags(tags);
      expect(result).toEqual(['valid', 'another']);
    });

    it('should limit number of tags', () => {
      const tags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
      const result = service.sanitizeTags(tags);
      expect(result).toHaveLength(10);
    });

    it('should throw exception for tags that are too long', () => {
      const longTag = 'a'.repeat(51);
      expect(() => service.sanitizeTags([longTag])).toThrow(
        SearchQueryException,
      );
    });

    it('should handle non-array input', () => {
      expect(service.sanitizeTags(null as any)).toEqual([]);
      expect(service.sanitizeTags('not-array' as any)).toEqual([]);
    });
  });

  describe('validateSpecialization', () => {
    const allowedSpecializations = [
      'Artificial Intelligence & Machine Learning',
      'Web Development & Full Stack',
      'Mobile Application Development',
    ];

    it('should validate allowed specializations', () => {
      const result = service.validateSpecialization(
        'Web Development & Full Stack',
        allowedSpecializations,
      );
      expect(result).toBe('Web Development & Full Stack');
    });

    it('should throw exception for invalid specializations', () => {
      expect(() =>
        service.validateSpecialization(
          'Invalid Specialization',
          allowedSpecializations,
        ),
      ).toThrow(SearchQueryException);

      try {
        service.validateSpecialization(
          'Invalid Specialization',
          allowedSpecializations,
        );
      } catch (error) {
        expect(error.message).toContain(
          'Invalid specialization: Invalid Specialization',
        );
      }
    });

    it('should throw exception for empty specialization', () => {
      expect(() =>
        service.validateSpecialization('', allowedSpecializations),
      ).toThrow(SearchQueryException);
    });

    it('should trim whitespace', () => {
      const result = service.validateSpecialization(
        '  Web Development & Full Stack  ',
        allowedSpecializations,
      );
      expect(result).toBe('Web Development & Full Stack');
    });
  });

  describe('validatePaginationParams', () => {
    it('should return default values for undefined params', () => {
      const result = service.validatePaginationParams();
      expect(result).toEqual({ limit: 20, offset: 0 });
    });

    it('should enforce minimum and maximum limits', () => {
      expect(service.validatePaginationParams(0, -5)).toEqual({
        limit: 1,
        offset: 0,
      });
      expect(service.validatePaginationParams(150, 10)).toEqual({
        limit: 100,
        offset: 10,
      });
    });

    it('should handle valid parameters', () => {
      expect(service.validatePaginationParams(50, 100)).toEqual({
        limit: 50,
        offset: 100,
      });
    });

    it('should handle non-numeric inputs', () => {
      expect(
        service.validatePaginationParams('abc' as any, 'def' as any),
      ).toEqual({
        limit: 20,
        offset: 0,
      });
    });
  });

  describe('validateSortParams', () => {
    it('should return default values for undefined params', () => {
      const result = service.validateSortParams();
      expect(result).toEqual({ sortBy: 'relevance', sortOrder: 'desc' });
    });

    it('should validate allowed sort fields', () => {
      const result = service.validateSortParams('date', 'asc');
      expect(result).toEqual({ sortBy: 'date', sortOrder: 'asc' });
    });

    it('should use defaults for invalid values', () => {
      const result = service.validateSortParams('invalid', 'invalid');
      expect(result).toEqual({ sortBy: 'relevance', sortOrder: 'desc' });
    });

    it('should handle custom allowed fields', () => {
      const result = service.validateSortParams('custom', 'asc', [
        'custom',
        'field',
      ]);
      expect(result).toEqual({ sortBy: 'custom', sortOrder: 'asc' });
    });
  });

  describe('containsSecurityThreats', () => {
    it('should detect SQL injection patterns', () => {
      expect(service.containsSecurityThreats('SELECT * FROM projects')).toBe(
        true,
      );
      expect(
        service.containsSecurityThreats('UNION SELECT password FROM users'),
      ).toBe(true);
      expect(
        service.containsSecurityThreats('INSERT INTO projects VALUES'),
      ).toBe(true);
    });

    it('should detect XSS patterns', () => {
      expect(
        service.containsSecurityThreats('<script>alert("xss")</script>'),
      ).toBe(true);
      expect(
        service.containsSecurityThreats('<iframe src="malicious.com">'),
      ).toBe(true);
      expect(service.containsSecurityThreats('javascript:alert("xss")')).toBe(
        true,
      );
    });

    it('should return false for safe content', () => {
      expect(service.containsSecurityThreats('machine learning project')).toBe(
        false,
      );
      expect(service.containsSecurityThreats('web development tutorial')).toBe(
        false,
      );
    });

    it('should handle null and undefined input', () => {
      expect(service.containsSecurityThreats(null as any)).toBe(false);
      expect(service.containsSecurityThreats(undefined as any)).toBe(false);
    });
  });

  describe('generateSafeCacheKey', () => {
    it('should generate safe cache keys', () => {
      const result = service.generateSafeCacheKey(
        'search',
        'machine learning',
        'ai',
        2024,
      );
      expect(result).toBe('search_machine_learning_ai_2024');
    });

    it('should sanitize dangerous characters', () => {
      const result = service.generateSafeCacheKey(
        'test',
        'key<script>',
        'value"with\'quotes',
      );
      expect(result).toBe('test_key_script__value_with_quotes');
    });

    it('should handle various input types', () => {
      const result = service.generateSafeCacheKey(
        'prefix',
        123,
        true,
        'string',
      );
      expect(result).toBe('prefix_123_true_string');
    });
  });
});
