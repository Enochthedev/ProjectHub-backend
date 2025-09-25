import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneInputSanitizationService } from '../milestone-input-sanitization.service';
import { MilestoneContentSanitizationException } from '../../common/exceptions/milestone.exception';

describe('MilestoneInputSanitizationService', () => {
  let service: MilestoneInputSanitizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MilestoneInputSanitizationService],
    }).compile();

    service = module.get<MilestoneInputSanitizationService>(
      MilestoneInputSanitizationService,
    );
  });

  describe('sanitizeTitle', () => {
    it('should sanitize a clean title', () => {
      const title = 'Clean Milestone Title';
      const result = service.sanitizeTitle(title);
      expect(result).toBe(title);
    });

    it('should remove HTML tags from title', () => {
      const title = '<script>alert("xss")</script>Clean Title';
      const result = service.sanitizeTitle(title);
      expect(result).toBe('Clean Title');
    });

    it('should throw exception for title exceeding max length', () => {
      const longTitle = 'a'.repeat(201);
      expect(() => service.sanitizeTitle(longTitle)).toThrow(
        MilestoneContentSanitizationException,
      );
    });

    it('should handle empty title', () => {
      const result = service.sanitizeTitle('');
      expect(result).toBe('');
    });

    it('should normalize whitespace in title', () => {
      const title = '  Multiple   Spaces   Title  ';
      const result = service.sanitizeTitle(title);
      expect(result).toBe('Multiple Spaces Title');
    });
  });

  describe('sanitizeDescription', () => {
    it('should allow safe HTML tags in description', () => {
      const description =
        '<p>This is a <strong>bold</strong> description with <em>emphasis</em>.</p>';
      const result = service.sanitizeDescription(description);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove dangerous HTML tags', () => {
      const description = '<script>alert("xss")</script><p>Safe content</p>';
      const result = service.sanitizeDescription(description);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe content</p>');
    });

    it('should sanitize URLs in description', () => {
      const description = 'Check out this link: javascript:alert("xss")';
      const result = service.sanitizeDescription(description);
      expect(result).not.toContain('javascript:');
    });

    it('should throw exception for description exceeding max length', () => {
      const longDescription = 'a'.repeat(5001);
      expect(() => service.sanitizeDescription(longDescription)).toThrow(
        MilestoneContentSanitizationException,
      );
    });

    it('should preserve allowed attributes', () => {
      const description =
        '<a href="https://example.com" target="_blank">Link</a>';
      const result = service.sanitizeDescription(description);
      expect(result).toContain('href="https://example.com');
      expect(result).toContain('target="_blank"');
    });
  });

  describe('sanitizeBlockingReason', () => {
    it('should sanitize blocking reason text', () => {
      const reason =
        'Blocked due to <script>alert("xss")</script> dependency issues';
      const result = service.sanitizeBlockingReason(reason);
      expect(result).toBe('Blocked due to dependency issues');
    });

    it('should throw exception for blocking reason exceeding max length', () => {
      const longReason = 'a'.repeat(1001);
      expect(() => service.sanitizeBlockingReason(longReason)).toThrow(
        MilestoneContentSanitizationException,
      );
    });

    it('should normalize whitespace in blocking reason', () => {
      const reason = '  Multiple   spaces   in   reason  ';
      const result = service.sanitizeBlockingReason(reason);
      expect(result).toBe('Multiple spaces in reason');
    });
  });

  describe('sanitizeNoteContent', () => {
    it('should allow safe HTML in note content', () => {
      const content = '<p>Progress update with <code>code snippet</code></p>';
      const result = service.sanitizeNoteContent(content);
      expect(result).toContain('<p>');
      expect(result).toContain('<code>');
    });

    it('should remove dangerous HTML from note content', () => {
      const content = '<script>alert("xss")</script><p>Safe note</p>';
      const result = service.sanitizeNoteContent(content);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe note</p>');
    });

    it('should throw exception for note content exceeding max length', () => {
      const longContent = 'a'.repeat(2001);
      expect(() => service.sanitizeNoteContent(longContent)).toThrow(
        MilestoneContentSanitizationException,
      );
    });
  });

  describe('sanitizeField', () => {
    it('should return sanitization result with modification flag', () => {
      const input = '<script>alert("xss")</script>Clean content';
      const result = service.sanitizeField('test', input, { allowHtml: false });

      expect(result.sanitized).toBe('Clean content');
      expect(result.wasModified).toBe(true);
      expect(result.removedContent).toContain('Malicious content');
    });

    it('should handle null or undefined input', () => {
      const result = service.sanitizeField('test', null as any);
      expect(result.sanitized).toBe('');
      expect(result.wasModified).toBe(false);
    });

    it('should detect and remove malicious patterns', () => {
      const maliciousInputs = [
        {
          input: '<script>alert("xss")</script>Safe content',
          expected: 'Safe content',
        },
        {
          input: 'javascript:alert("xss") Safe content',
          expected: ' Safe content',
        },
        {
          input:
            'data:text/html;base64,PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4= Safe',
          expected: ' Safe',
        },
        {
          input: 'onclick="alert(\'xss\')" Safe content',
          expected: ' Safe content',
        },
        {
          input: 'SELECT * FROM users WHERE id = 1 Safe content',
          expected: ' Safe content',
        },
      ];

      maliciousInputs.forEach(({ input, expected }) => {
        const result = service.sanitizeField('test', input);
        expect(result.sanitized.trim()).toBe(expected.trim());
        expect(result.wasModified).toBe(true);
      });
    });

    it('should throw exception when content becomes empty after sanitization', () => {
      const input = '<script>alert("xss")</script>';
      expect(() =>
        service.sanitizeField('test', input, { allowHtml: false }),
      ).toThrow(MilestoneContentSanitizationException);
    });

    it('should handle custom sanitization options', () => {
      const input = '<div><p>Content</p></div>';
      const result = service.sanitizeField('test', input, {
        allowHtml: true,
        allowedTags: ['p'],
        allowedAttributes: [],
      });

      expect(result.sanitized).toContain('<p>Content</p>');
      expect(result.sanitized).not.toContain('<div>');
      expect(result.wasModified).toBe(true);
    });
  });

  describe('validateMilestoneData', () => {
    it('should validate and sanitize multiple fields', () => {
      const data = {
        title: '<script>alert("xss")</script>Clean Title',
        description: '<p>Safe <strong>description</strong></p>',
        blockingReason: '  Blocked   for   testing  ',
      };

      const result = service.validateMilestoneData(data);

      expect(result.title).toBe('Clean Title');
      expect(result.description).toContain(
        '<p>Safe <strong>description</strong></p>',
      );
      expect(result.blockingReason).toBe('Blocked for testing');
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle partial data validation', () => {
      const data = {
        title: 'Clean Title',
      };

      const result = service.validateMilestoneData(data);

      expect(result.title).toBe('Clean Title');
      expect(result.description).toBeUndefined();
      expect(result.blockingReason).toBeUndefined();
    });

    it('should return warnings when content is modified', () => {
      const data = {
        title: '<b>Title with HTML</b>',
        description: '<script>alert("xss")</script><p>Description</p>',
      };

      const result = service.validateMilestoneData(data);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings!.some((w) => w.includes('Title'))).toBe(true);
      expect(result.warnings!.some((w) => w.includes('Description'))).toBe(
        true,
      );
    });
  });

  describe('URL Sanitization', () => {
    it('should allow safe HTTPS URLs', () => {
      const input = 'Check out https://example.com for more info';
      const result = service.sanitizeField('test', input);
      expect(result.sanitized).toContain('https://example.com');
    });

    it('should remove dangerous URLs', () => {
      const input = 'Dangerous link: javascript:alert("xss")';
      const result = service.sanitizeField('test', input);
      expect(result.sanitized).not.toContain('javascript:');
    });

    it('should block suspicious domains', () => {
      const input = 'Short link: https://bit.ly/suspicious';
      const result = service.sanitizeField('test', input);
      expect(result.sanitized).toContain('[URL removed]');
    });

    it('should handle malformed URLs', () => {
      const input = 'Invalid URL: htp://malformed.url';
      const result = service.sanitizeField('test', input);
      // Malformed URLs that don't match URL patterns should be left as-is
      expect(result.sanitized).toBe(input);
    });
  });

  describe('HTML Sanitization', () => {
    it('should preserve allowed HTML tags and attributes', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = service.sanitizeField('test', input, {
        allowHtml: true,
        allowedTags: ['a'],
        allowedAttributes: ['href', 'target'],
      });

      expect(result.sanitized).toContain('href="https://example.com');
      expect(result.sanitized).toContain('target="_blank"');
      expect(result.sanitized).toContain('<a');
      expect(result.sanitized).toContain('</a>');
    });

    it('should remove disallowed HTML tags', () => {
      const input = '<div><p>Content</p><script>alert("xss")</script></div>';
      const result = service.sanitizeField('test', input, {
        allowHtml: true,
        allowedTags: ['p'],
        allowedAttributes: [],
      });

      expect(result.sanitized).toContain('<p>Content</p>');
      expect(result.sanitized).not.toContain('<div>');
      expect(result.sanitized).not.toContain('<script>');
    });

    it('should remove disallowed attributes', () => {
      const input =
        '<a href="https://example.com" onclick="alert(\'xss\')">Link</a>';
      const result = service.sanitizeField('test', input, {
        allowHtml: true,
        allowedTags: ['a'],
        allowedAttributes: ['href'],
      });

      expect(result.sanitized).toContain('href="https://example.com');
      expect(result.sanitized).not.toContain('onclick');
    });
  });

  describe('Error Handling', () => {
    it('should handle sanitization errors gracefully', () => {
      // Mock a scenario where sanitization might fail
      const originalStripHtml = (service as any).stripHtml;
      (service as any).stripHtml = jest.fn().mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      expect(() =>
        service.sanitizeField('test', 'content', { allowHtml: false }),
      ).toThrow(MilestoneContentSanitizationException);

      // Restore original method
      (service as any).stripHtml = originalStripHtml;
    });

    it('should provide detailed error information', () => {
      try {
        service.sanitizeField('testField', 'a'.repeat(10001), {
          maxLength: 100,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(MilestoneContentSanitizationException);
        expect(error.message).toContain('testField');
        expect(error.message).toContain('maximum length');
      }
    });
  });
});
