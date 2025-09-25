import { Test, TestingModule } from '@nestjs/testing';
import { InputSanitizationService } from '../input-sanitization.service';
import {
  SearchQueryException,
  MalformedSearchQueryException,
} from '../../exceptions/project.exception';

describe('InputSanitizationService - Security Tests', () => {
  let service: InputSanitizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InputSanitizationService],
    }).compile();

    service = module.get<InputSanitizationService>(InputSanitizationService);
  });

  describe('SQL Injection Prevention', () => {
    it('should detect and block SQL injection in search queries', () => {
      const maliciousQueries = [
        "'; DROP TABLE projects; --",
        "' OR 1=1 --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO projects VALUES ('malicious'); --",
        "' OR 'a'='a",
        "admin'--",
        "admin' /*",
        "admin' #",
        "' OR 1=1#",
        "' OR 1=1/*",
        "') OR '1'='1--",
        "') OR ('1'='1--",
        "1' OR '1' = '1",
        "1' OR '1' = '1' --",
        "1' OR '1' = '1' /*",
        "1' OR '1' = '1' #",
        "1' EXEC sp_addlogin 'hacker'",
        "1'; EXEC master..xp_cmdshell 'ping 127.0.0.1'--",
      ];

      maliciousQueries.forEach((query) => {
        expect(() => service.sanitizeSearchQuery(query)).toThrow(
          MalformedSearchQueryException,
        );
      });
    });

    it('should allow legitimate search queries', () => {
      const legitimateQueries = [
        'machine learning',
        'web development',
        'artificial intelligence',
        'data science project',
        'mobile app development',
        'cybersecurity research',
        'blockchain technology',
        'neural networks',
        'computer vision',
        'natural language processing',
      ];

      legitimateQueries.forEach((query) => {
        expect(() => service.sanitizeSearchQuery(query)).not.toThrow();
        const result = service.sanitizeSearchQuery(query);
        expect(result).toBe(query);
      });
    });

    it('should handle edge cases in SQL injection detection', () => {
      const edgeCases = [
        'SELECT project FROM database', // Contains SQL keywords but not injection pattern
        'UPDATE my resume', // Contains SQL keyword but legitimate
        'DELETE old files', // Contains SQL keyword but legitimate
        'CREATE new project', // Contains SQL keyword but legitimate
      ];

      edgeCases.forEach((query) => {
        // These should not throw as they don't match injection patterns
        expect(() => service.sanitizeSearchQuery(query)).not.toThrow();
      });
    });
  });

  describe('XSS Prevention', () => {
    it('should detect and sanitize XSS in project content', () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>',
        '<embed src="javascript:alert(1)">',
        '<link rel="stylesheet" href="javascript:alert(1)">',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
        'javascript:alert(1)',
        'vbscript:alert(1)',
        '<div onload="alert(1)">',
        '<div onerror="alert(1)">',
        '<div onclick="alert(1)">',
        '<div onmouseover="alert(1)">',
      ];

      xssPayloads.forEach((payload) => {
        const sanitized = service.sanitizeProjectContent(payload, 'title');
        expect(sanitized).not.toContain('<script');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('vbscript:');
        expect(sanitized).not.toContain('onload');
        expect(sanitized).not.toContain('onerror');
        expect(sanitized).not.toContain('onclick');
        expect(sanitized).not.toContain('onmouseover');
      });
    });

    it('should preserve legitimate HTML entities after sanitization', () => {
      const content = 'This is a test with &amp; and &lt; and &gt;';
      const sanitized = service.sanitizeProjectContent(content, 'abstract');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
    });

    it('should handle nested XSS attempts', () => {
      const nestedXss = '<scr<script>ipt>alert(1)</scr</script>ipt>';
      const sanitized = service.sanitizeProjectContent(nestedXss, 'title');
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
    });
  });

  describe('URL Validation and Sanitization', () => {
    it('should validate legitimate URLs', () => {
      const validUrls = [
        'https://github.com/user/repo',
        'http://example.com',
        'https://www.example.com/path?param=value',
        'https://subdomain.example.com:8080/path',
      ];

      validUrls.forEach((url) => {
        expect(() => service.sanitizeUrl(url)).not.toThrow();
        const result = service.sanitizeUrl(url);
        expect(result).toBe(url);
      });
    });

    it('should reject dangerous URL schemes', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'vbscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
        'ftp://malicious.com',
      ];

      dangerousUrls.forEach((url) => {
        expect(() => service.sanitizeUrl(url)).toThrow(SearchQueryException);
      });
    });

    it('should reject malformed URLs', () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://',
        '://example.com',
        'http://[invalid',
      ];

      malformedUrls.forEach((url) => {
        expect(() => service.sanitizeUrl(url)).toThrow(SearchQueryException);
      });
    });

    it('should detect XSS in URLs', () => {
      const xssUrls = [
        'https://example.com/<script>alert(1)</script>',
        'https://example.com/?param=<script>alert(1)</script>',
        'https://example.com/javascript:alert(1)',
      ];

      xssUrls.forEach((url) => {
        expect(() => service.sanitizeUrl(url)).toThrow(SearchQueryException);
      });
    });
  });

  describe('Input Length Validation', () => {
    it('should enforce maximum length limits', () => {
      const longQuery = 'a'.repeat(501); // Exceeds 500 char limit
      expect(() => service.sanitizeSearchQuery(longQuery)).toThrow(
        SearchQueryException,
      );

      const longTitle = 'a'.repeat(201); // Exceeds 200 char limit
      expect(() => service.sanitizeProjectContent(longTitle, 'title')).toThrow(
        SearchQueryException,
      );

      const longAbstract = 'a'.repeat(2001); // Exceeds 2000 char limit
      expect(() =>
        service.sanitizeProjectContent(longAbstract, 'abstract'),
      ).toThrow(SearchQueryException);

      const longUrl = 'https://example.com/' + 'a'.repeat(500); // Exceeds 500 char limit
      expect(() => service.sanitizeUrl(longUrl)).toThrow(SearchQueryException);
    });

    it('should allow content within length limits', () => {
      const validQuery = 'a'.repeat(500); // Exactly at limit
      expect(() => service.sanitizeSearchQuery(validQuery)).not.toThrow();

      const validTitle = 'a'.repeat(200); // Exactly at limit
      expect(() =>
        service.sanitizeProjectContent(validTitle, 'title'),
      ).not.toThrow();

      const validAbstract = 'a'.repeat(2000); // Exactly at limit
      expect(() =>
        service.sanitizeProjectContent(validAbstract, 'abstract'),
      ).not.toThrow();
    });
  });

  describe('Tag Sanitization', () => {
    it('should sanitize and normalize tags', () => {
      const tags = [
        'JavaScript',
        'PYTHON',
        'machine-learning',
        'Web Development',
        '  react  ',
        'Node.js',
      ];

      const sanitized = service.sanitizeTags(tags);
      expect(sanitized).toEqual([
        'javascript',
        'python',
        'machine-learning',
        'web development',
        'react',
        'node.js',
      ]);
    });

    it('should remove dangerous characters from tags', () => {
      const dangerousTags = [
        '<script>alert(1)</script>',
        'tag<>with<>brackets',
        'tag"with"quotes',
        "tag'with'quotes",
      ];

      const sanitized = service.sanitizeTags(dangerousTags);
      sanitized.forEach((tag) => {
        expect(tag).not.toContain('<');
        expect(tag).not.toContain('>');
        expect(tag).not.toContain('"');
        expect(tag).not.toContain("'");
        expect(tag).not.toContain('script');
      });
    });

    it('should limit number of tags', () => {
      const manyTags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
      const sanitized = service.sanitizeTags(manyTags);
      expect(sanitized.length).toBeLessThanOrEqual(10);
    });

    it('should reject tags that are too long', () => {
      const longTag = 'a'.repeat(51); // Exceeds 50 char limit
      expect(() => service.sanitizeTags([longTag])).toThrow(
        SearchQueryException,
      );
    });
  });

  describe('Specialization Validation', () => {
    const allowedSpecializations = [
      'Artificial Intelligence & Machine Learning',
      'Web Development & Full Stack',
      'Mobile Application Development',
    ];

    it('should validate allowed specializations', () => {
      allowedSpecializations.forEach((spec) => {
        expect(() =>
          service.validateSpecialization(spec, allowedSpecializations),
        ).not.toThrow();
        const result = service.validateSpecialization(
          spec,
          allowedSpecializations,
        );
        expect(result).toBe(spec);
      });
    });

    it('should reject invalid specializations', () => {
      const invalidSpecs = [
        'Invalid Specialization',
        'Hacking & Cracking',
        '<script>alert(1)</script>',
      ];

      invalidSpecs.forEach((spec) => {
        expect(() =>
          service.validateSpecialization(spec, allowedSpecializations),
        ).toThrow(SearchQueryException);
      });
    });
  });

  describe('Pagination and Sort Parameter Validation', () => {
    it('should validate and sanitize pagination parameters', () => {
      const testCases = [
        { limit: 50, offset: 0, expected: { limit: 50, offset: 0 } },
        { limit: 0, offset: 0, expected: { limit: 1, offset: 0 } }, // Min limit
        { limit: 200, offset: 0, expected: { limit: 100, offset: 0 } }, // Max limit
        {
          limit: undefined,
          offset: undefined,
          expected: { limit: 20, offset: 0 },
        }, // Defaults
        { limit: -5, offset: -10, expected: { limit: 1, offset: 0 } }, // Negative values
        {
          limit: 'invalid',
          offset: 'invalid',
          expected: { limit: 20, offset: 0 },
        }, // Invalid types
      ];

      testCases.forEach(({ limit, offset, expected }) => {
        const result = service.validatePaginationParams(
          limit as any,
          offset as any,
        );
        expect(result).toEqual(expected);
      });
    });

    it('should validate and sanitize sort parameters', () => {
      const allowedFields = ['relevance', 'date', 'title', 'popularity'];

      const testCases = [
        {
          sortBy: 'relevance',
          sortOrder: 'desc',
          expected: { sortBy: 'relevance', sortOrder: 'desc' },
        },
        {
          sortBy: 'invalid',
          sortOrder: 'asc',
          expected: { sortBy: 'relevance', sortOrder: 'asc' },
        },
        {
          sortBy: 'date',
          sortOrder: 'invalid',
          expected: { sortBy: 'date', sortOrder: 'desc' },
        },
        {
          sortBy: undefined,
          sortOrder: undefined,
          expected: { sortBy: 'relevance', sortOrder: 'desc' },
        },
      ];

      testCases.forEach(({ sortBy, sortOrder, expected }) => {
        const result = service.validateSortParams(
          sortBy,
          sortOrder,
          allowedFields,
        );
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Security Threat Detection', () => {
    it('should detect various security threats', () => {
      const threats = [
        "'; DROP TABLE projects; --",
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        "' OR 1=1 --",
        'javascript:alert(1)',
        '<iframe src="malicious.com"></iframe>',
      ];

      threats.forEach((threat) => {
        expect(service.containsSecurityThreats(threat)).toBe(true);
      });
    });

    it('should not flag legitimate content as threats', () => {
      const legitimateContent = [
        'machine learning project',
        'web development with React',
        'data analysis using Python',
        'mobile app for iOS and Android',
        'cybersecurity research paper',
      ];

      legitimateContent.forEach((content) => {
        expect(service.containsSecurityThreats(content)).toBe(false);
      });
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate safe cache keys', () => {
      const inputs = [
        'search query with spaces',
        'query<with>dangerous<chars>',
        'query"with"quotes',
        "query'with'apostrophes",
        'query;with;semicolons',
      ];

      inputs.forEach((input) => {
        const cacheKey = service.generateSafeCacheKey('test', input);
        expect(cacheKey).toMatch(/^test_[a-z0-9_-]+$/);
        expect(cacheKey).not.toContain('<');
        expect(cacheKey).not.toContain('>');
        expect(cacheKey).not.toContain('"');
        expect(cacheKey).not.toContain("'");
        expect(cacheKey).not.toContain(';');
        expect(cacheKey).not.toContain(' ');
      });
    });

    it('should handle multiple inputs in cache key generation', () => {
      const cacheKey = service.generateSafeCacheKey(
        'search',
        'query',
        123,
        true,
        'filter',
      );
      expect(cacheKey).toBe('search_query_123_true_filter');
    });
  });
});
