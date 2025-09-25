import { Injectable } from '@nestjs/common';
import {
  MalformedSearchQueryException,
  SearchQueryException,
} from '../exceptions/project.exception';

/**
 * Service for input sanitization and security validation
 */
@Injectable()
export class InputSanitizationService {
  // SQL injection patterns to detect and block
  private readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b).*(\b(FROM|INTO|TABLE|DATABASE|WHERE)\b)/gi,
    /(--|\/\*|\*\/|;)/g,
    /(\bOR\b|\bAND\b)\s*(\b=\b|\bLIKE\b)\s*(\b1\b|\btrue\b|\b'1'\b|\b"1"\b)/gi,
    /(\bUNION\b.*?\bSELECT\b)/gi,
    /(\bINTO\b.*?\bOUTFILE\b)/gi,
    /(\bLOAD_FILE\b|\bINTO\b.*?\bDUMPFILE\b)/gi,
    /('|\").*?(;|--|\/\*)/gi,
  ];

  // XSS patterns to detect and sanitize
  private readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
  ];

  // Dangerous characters that should be escaped or removed in search queries
  private readonly DANGEROUS_CHARS = /[<>]/g;

  // Maximum lengths for different input types
  private readonly MAX_LENGTHS = {
    SEARCH_QUERY: 500,
    PROJECT_TITLE: 200,
    PROJECT_ABSTRACT: 2000,
    TAG: 50,
    URL: 500,
    NOTES: 1000,
  };

  /**
   * Sanitize search query input
   */
  sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Check length
    if (query.length > this.MAX_LENGTHS.SEARCH_QUERY) {
      throw new SearchQueryException(
        `Search query too long. Maximum ${this.MAX_LENGTHS.SEARCH_QUERY} characters allowed`,
        query.substring(0, 100) + '...',
      );
    }

    // Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(query)) {
        throw new MalformedSearchQueryException(
          query.substring(0, 100),
          'Potential SQL injection detected',
        );
      }
    }

    // Remove dangerous characters and normalize whitespace
    const sanitized = query
      .replace(this.DANGEROUS_CHARS, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Validate that we still have meaningful content
    if (sanitized.length === 0 && query.length > 0) {
      throw new MalformedSearchQueryException(
        query.substring(0, 100),
        'Query contains only invalid characters',
      );
    }

    return sanitized;
  }

  /**
   * Sanitize project content (title, abstract, notes)
   */
  sanitizeProjectContent(
    content: string,
    type: 'title' | 'abstract' | 'notes',
  ): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    const maxLength =
      this.MAX_LENGTHS[
        `PROJECT_${type.toUpperCase()}` as keyof typeof this.MAX_LENGTHS
      ];

    // Check length
    if (content.length > maxLength) {
      throw new SearchQueryException(
        `${type} too long. Maximum ${maxLength} characters allowed`,
        content.substring(0, 100) + '...',
      );
    }

    // Remove XSS patterns
    let sanitized = content;
    for (const pattern of this.XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Escape dangerous characters but preserve basic formatting
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&(?!(?:lt|gt|quot|#x27|amp);)/g, '&amp;');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Sanitize URL input
   */
  sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    // Check length
    if (url.length > this.MAX_LENGTHS.URL) {
      throw new SearchQueryException(
        `URL too long. Maximum ${this.MAX_LENGTHS.URL} characters allowed`,
        url.substring(0, 100) + '...',
      );
    }

    // Basic URL validation
    try {
      const urlObj = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new SearchQueryException(
          'Only HTTP and HTTPS URLs are allowed',
          url,
        );
      }

      // Check for dangerous patterns in URL
      if (this.XSS_PATTERNS.some((pattern) => pattern.test(url))) {
        throw new SearchQueryException(
          'URL contains potentially dangerous content',
          url,
        );
      }

      return urlObj.toString();
    } catch (error) {
      if (error instanceof SearchQueryException) {
        throw error;
      }
      throw new SearchQueryException('Invalid URL format', url);
    }
  }

  /**
   * Sanitize array of tags
   */
  sanitizeTags(tags: string[]): string[] {
    if (!Array.isArray(tags)) {
      return [];
    }

    return tags
      .filter((tag) => tag && typeof tag === 'string')
      .map((tag) => {
        // Check individual tag length
        if (tag.length > this.MAX_LENGTHS.TAG) {
          throw new SearchQueryException(
            `Tag too long. Maximum ${this.MAX_LENGTHS.TAG} characters allowed`,
            tag,
          );
        }

        // Remove dangerous characters and normalize
        return tag
          .replace(this.DANGEROUS_CHARS, '')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();
      })
      .filter((tag) => tag.length > 0)
      .slice(0, 10); // Limit number of tags
  }

  /**
   * Validate and sanitize specialization
   */
  validateSpecialization(
    specialization: string,
    allowedSpecializations: string[],
  ): string {
    if (!specialization || typeof specialization !== 'string') {
      throw new SearchQueryException('Specialization is required');
    }

    const sanitized = specialization.trim();

    if (!allowedSpecializations.includes(sanitized)) {
      throw new SearchQueryException(
        `Invalid specialization: ${sanitized}. Allowed values: ${allowedSpecializations.join(', ')}`,
        sanitized,
      );
    }

    return sanitized;
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationParams(
    limit?: number,
    offset?: number,
  ): { limit: number; offset: number } {
    const numLimit = Number(limit);
    const numOffset = Number(offset);

    const sanitizedLimit = isNaN(numLimit)
      ? 20
      : Math.min(Math.max(numLimit, 1), 100);
    const sanitizedOffset = isNaN(numOffset) ? 0 : Math.max(numOffset, 0);

    return { limit: sanitizedLimit, offset: sanitizedOffset };
  }

  /**
   * Validate sort parameters
   */
  validateSortParams(
    sortBy?: string,
    sortOrder?: string,
    allowedSortFields: string[] = ['relevance', 'date', 'title', 'popularity'],
  ): { sortBy: string; sortOrder: string } {
    const sanitizedSortBy = allowedSortFields.includes(sortBy || '')
      ? sortBy!
      : 'relevance';
    const sanitizedSortOrder = ['asc', 'desc'].includes(
      sortOrder?.toLowerCase() || '',
    )
      ? sortOrder!.toLowerCase()
      : 'desc';

    return { sortBy: sanitizedSortBy, sortOrder: sanitizedSortOrder };
  }

  /**
   * Check if input contains potential security threats
   */
  containsSecurityThreats(input: string): boolean {
    if (!input || typeof input !== 'string') {
      return false;
    }

    // Check for SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }

    // Check for XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      if (pattern.test(input)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate safe cache key from user input
   */
  generateSafeCacheKey(
    prefix: string,
    ...inputs: (string | number | boolean)[]
  ): string {
    const sanitizedInputs = inputs
      .map((input) => String(input))
      .map((input) => input.replace(/[^a-zA-Z0-9_-]/g, '_'))
      .join('_');

    return `${prefix}_${sanitizedInputs}`.toLowerCase();
  }
}
