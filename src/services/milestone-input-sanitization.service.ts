import { Injectable, Logger } from '@nestjs/common';
import { MilestoneContentSanitizationException } from '../common/exceptions/milestone.exception';

export interface SanitizationOptions {
  allowHtml?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  allowedAttributes?: string[];
  stripWhitespace?: boolean;
}

export interface SanitizationResult {
  sanitized: string;
  wasModified: boolean;
  removedContent?: string[];
}

@Injectable()
export class MilestoneInputSanitizationService {
  private readonly logger = new Logger(MilestoneInputSanitizationService.name);

  // Default sanitization options
  private readonly defaultOptions: SanitizationOptions = {
    allowHtml: false,
    maxLength: 10000,
    allowedTags: [],
    allowedAttributes: [],
    stripWhitespace: true,
  };

  // Milestone-specific sanitization options
  private readonly milestoneFieldOptions: Record<string, SanitizationOptions> =
    {
      title: {
        allowHtml: false,
        maxLength: 200,
        stripWhitespace: true,
      },
      description: {
        allowHtml: true,
        maxLength: 5000,
        allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
        allowedAttributes: ['href', 'target'],
        stripWhitespace: false,
      },
      blockingReason: {
        allowHtml: false,
        maxLength: 1000,
        stripWhitespace: true,
      },
      noteContent: {
        allowHtml: true,
        maxLength: 2000,
        allowedTags: ['p', 'br', 'strong', 'em', 'code', 'pre'],
        allowedAttributes: [],
        stripWhitespace: false,
      },
    };

  /**
   * Sanitize milestone title
   */
  sanitizeTitle(title: string): string {
    const result = this.sanitizeField(
      'title',
      title,
      this.milestoneFieldOptions.title,
    );
    return result.sanitized;
  }

  /**
   * Sanitize milestone description
   */
  sanitizeDescription(description: string): string {
    const result = this.sanitizeField(
      'description',
      description,
      this.milestoneFieldOptions.description,
    );
    return result.sanitized;
  }

  /**
   * Sanitize blocking reason
   */
  sanitizeBlockingReason(reason: string): string {
    const result = this.sanitizeField(
      'blockingReason',
      reason,
      this.milestoneFieldOptions.blockingReason,
    );
    return result.sanitized;
  }

  /**
   * Sanitize milestone note content
   */
  sanitizeNoteContent(content: string): string {
    const result = this.sanitizeField(
      'noteContent',
      content,
      this.milestoneFieldOptions.noteContent,
    );
    return result.sanitized;
  }

  /**
   * Sanitize a generic field with custom options
   */
  sanitizeField(
    fieldName: string,
    input: string,
    options?: SanitizationOptions,
  ): SanitizationResult {
    if (!input || typeof input !== 'string') {
      return { sanitized: '', wasModified: false };
    }

    const opts = { ...this.defaultOptions, ...options };
    let sanitized = input;
    let wasModified = false;
    const removedContent: string[] = [];

    try {
      // 1. Check for malicious patterns and remove them
      const maliciousPatterns = this.detectMaliciousPatterns(sanitized);
      if (maliciousPatterns.length > 0) {
        // Remove malicious content instead of throwing exception
        sanitized = this.removeMaliciousPatterns(sanitized);
        wasModified = true;
        removedContent.push(
          `Malicious content: ${maliciousPatterns.join(', ')}`,
        );
      }

      // 2. Strip or validate HTML
      if (!opts.allowHtml) {
        const htmlStripped = this.stripHtml(sanitized);
        if (htmlStripped !== sanitized) {
          wasModified = true;
          removedContent.push('HTML tags');
          sanitized = htmlStripped;
        }
      } else if (opts.allowedTags && opts.allowedTags.length > 0) {
        const htmlSanitized = this.sanitizeHtml(
          sanitized,
          opts.allowedTags,
          opts.allowedAttributes || [],
        );
        if (htmlSanitized !== sanitized) {
          wasModified = true;
          removedContent.push('Disallowed HTML tags/attributes');
          sanitized = htmlSanitized;
        }
      }

      // 3. Remove dangerous URLs
      const urlSanitized = this.sanitizeUrls(sanitized);
      if (urlSanitized !== sanitized) {
        wasModified = true;
        removedContent.push('Dangerous URLs');
        sanitized = urlSanitized;
      }

      // 4. Normalize whitespace
      if (opts.stripWhitespace) {
        const whitespaceTrimmed = sanitized.trim().replace(/\s+/g, ' ');
        if (whitespaceTrimmed !== sanitized) {
          wasModified = true;
          sanitized = whitespaceTrimmed;
        }
      }

      // 5. Check length limits
      if (opts.maxLength && sanitized.length > opts.maxLength) {
        throw new MilestoneContentSanitizationException(
          fieldName,
          `Content exceeds maximum length of ${opts.maxLength} characters`,
        );
      }

      // 6. Check for empty content after sanitization
      if (sanitized.trim().length === 0 && input.trim().length > 0) {
        throw new MilestoneContentSanitizationException(
          fieldName,
          'Content became empty after sanitization',
        );
      }

      return {
        sanitized,
        wasModified,
        removedContent: removedContent.length > 0 ? removedContent : undefined,
      };
    } catch (error) {
      if (error instanceof MilestoneContentSanitizationException) {
        throw error;
      }

      this.logger.error(`Sanitization error for field ${fieldName}`, {
        error: error.message,
        input: input.substring(0, 100), // Log first 100 chars for debugging
      });

      throw new MilestoneContentSanitizationException(
        fieldName,
        `Sanitization failed: ${error.message}`,
      );
    }
  }

  /**
   * Remove malicious patterns from input
   */
  private removeMaliciousPatterns(input: string): string {
    let cleaned = input;

    // Remove script tags and their content
    cleaned = cleaned.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

    // Remove javascript: protocols
    cleaned = cleaned.replace(/javascript:/gi, '');

    // Remove data URIs with scripts
    cleaned = cleaned.replace(/data:.*script/gi, '');

    // Remove event handlers
    cleaned = cleaned.replace(/on\w+\s*=/gi, '');

    // Remove basic SQL injection patterns (be careful not to remove legitimate content)
    cleaned = cleaned.replace(
      /\b(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      '',
    );

    // Remove dangerous HTML elements
    cleaned = cleaned.replace(
      /<(iframe|object|embed|link|meta)[\s\S]*?>/gi,
      '',
    );

    // Remove base64 encoded scripts
    cleaned = cleaned.replace(/data:text\/html;base64,/gi, '');

    return cleaned.trim();
  }

  /**
   * Detect potentially malicious patterns
   */
  private detectMaliciousPatterns(input: string): string[] {
    const patterns = [
      {
        name: 'Script injection',
        regex: /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      },
      {
        name: 'JavaScript protocol',
        regex: /javascript:/gi,
      },
      {
        name: 'Data URI with script',
        regex: /data:.*script/gi,
      },
      {
        name: 'Event handlers',
        regex: /on\w+\s*=/gi,
      },
      {
        name: 'SQL injection patterns',
        regex: /(union|select|insert|update|delete|drop|create|alter)\s+/gi,
      },
      {
        name: 'XSS patterns',
        regex: /(<iframe|<object|<embed|<link|<meta)/gi,
      },
      {
        name: 'Base64 encoded scripts',
        regex: /data:text\/html;base64,/gi,
      },
    ];

    const detected: string[] = [];

    for (const pattern of patterns) {
      if (pattern.regex.test(input)) {
        detected.push(pattern.name);
      }
    }

    return detected;
  }

  /**
   * Strip all HTML tags
   */
  private stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, '');
  }

  /**
   * Sanitize HTML to allow only specific tags and attributes
   */
  private sanitizeHtml(
    input: string,
    allowedTags: string[],
    allowedAttributes: string[],
  ): string {
    // Simple HTML sanitization - in production, consider using a library like DOMPurify
    let sanitized = input;

    // Remove all tags except allowed ones
    const tagRegex = /<(\/?)([\w-]+)([^>]*)>/g;
    sanitized = sanitized.replace(
      tagRegex,
      (match, closing, tagName, attributes) => {
        const tag = tagName.toLowerCase();

        if (!allowedTags.includes(tag)) {
          return ''; // Remove disallowed tags
        }

        if (closing) {
          return `</${tag}>`;
        }

        // Sanitize attributes
        if (allowedAttributes.length === 0) {
          return `<${tag}>`;
        }

        const sanitizedAttributes = this.sanitizeAttributes(
          attributes,
          allowedAttributes,
        );
        return `<${tag}${sanitizedAttributes}>`;
      },
    );

    return sanitized;
  }

  /**
   * Sanitize HTML attributes
   */
  private sanitizeAttributes(
    attributeString: string,
    allowedAttributes: string[],
  ): string {
    if (!attributeString || allowedAttributes.length === 0) {
      return '';
    }

    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    const sanitizedAttrs: string[] = [];
    let match;

    while ((match = attrRegex.exec(attributeString)) !== null) {
      const [, attrName, attrValue] = match;

      if (allowedAttributes.includes(attrName.toLowerCase())) {
        // Additional validation for specific attributes
        if (attrName.toLowerCase() === 'href') {
          const sanitizedUrl = this.sanitizeUrl(attrValue);
          if (sanitizedUrl) {
            sanitizedAttrs.push(`${attrName}="${sanitizedUrl}"`);
          }
        } else {
          sanitizedAttrs.push(`${attrName}="${attrValue}"`);
        }
      }
    }

    return sanitizedAttrs.length > 0 ? ' ' + sanitizedAttrs.join(' ') : '';
  }

  /**
   * Sanitize URLs in content
   */
  private sanitizeUrls(input: string): string {
    const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;

    return input.replace(urlRegex, (url) => {
      const sanitizedUrl = this.sanitizeUrl(url);
      return sanitizedUrl || '[URL removed]';
    });
  }

  /**
   * Validate and sanitize a single URL
   */
  private sanitizeUrl(url: string): string | null {
    try {
      const parsed = new URL(url);

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      // Block suspicious domains (you can extend this list)
      const blockedDomains = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co'];

      if (blockedDomains.some((domain) => parsed.hostname.includes(domain))) {
        return null;
      }

      // Return the cleaned URL
      return parsed.toString();
    } catch {
      // Invalid URL
      return null;
    }
  }

  /**
   * Validate milestone data comprehensively
   */
  validateMilestoneData(data: {
    title?: string;
    description?: string;
    blockingReason?: string;
  }): {
    title?: string;
    description?: string;
    blockingReason?: string;
    warnings?: string[];
  } {
    const result: any = {};
    const warnings: string[] = [];

    if (data.title !== undefined) {
      const titleResult = this.sanitizeField(
        'title',
        data.title,
        this.milestoneFieldOptions.title,
      );
      result.title = titleResult.sanitized;
      if (titleResult.wasModified) {
        warnings.push(
          `Title was modified during sanitization: ${titleResult.removedContent?.join(', ')}`,
        );
      }
    }

    if (data.description !== undefined) {
      const descResult = this.sanitizeField(
        'description',
        data.description,
        this.milestoneFieldOptions.description,
      );
      result.description = descResult.sanitized;
      if (descResult.wasModified) {
        warnings.push(
          `Description was modified during sanitization: ${descResult.removedContent?.join(', ')}`,
        );
      }
    }

    if (data.blockingReason !== undefined) {
      const reasonResult = this.sanitizeField(
        'blockingReason',
        data.blockingReason,
        this.milestoneFieldOptions.blockingReason,
      );
      result.blockingReason = reasonResult.sanitized;
      if (reasonResult.wasModified) {
        warnings.push(
          `Blocking reason was modified during sanitization: ${reasonResult.removedContent?.join(', ')}`,
        );
      }
    }

    if (warnings.length > 0) {
      result.warnings = warnings;
    }

    return result;
  }
}
