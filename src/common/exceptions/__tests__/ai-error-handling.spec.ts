import { HttpStatus } from '@nestjs/common';
import {
  AIServiceException,
  RateLimitExceededException,
  InsufficientProfileDataException,
  AIModelTimeoutException,
  CircuitBreakerOpenException,
} from '../app.exception';

describe('AI Error Handling Exceptions', () => {
  describe('AIServiceException', () => {
    it('should create exception with correct properties', () => {
      const message = 'AI service is unavailable';
      const details = {
        model: 'sentence-transformers',
        endpoint: '/embeddings',
      };

      const exception = new AIServiceException(message, details);

      expect(exception.message).toBe(message);
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe('AI_SERVICE_ERROR');
      expect(exception.details).toEqual(details);
    });

    it('should work without details', () => {
      const message = 'AI service error';
      const exception = new AIServiceException(message);

      expect(exception.message).toBe(message);
      expect(exception.details).toBeUndefined();
    });

    it('should have proper response structure', () => {
      const exception = new AIServiceException('Test error', { test: true });
      const response = exception.getResponse() as any;

      expect(response.message).toBe('Test error');
      expect(response.errorCode).toBe('AI_SERVICE_ERROR');
      expect(response.details).toEqual({ test: true });
    });
  });

  describe('RateLimitExceededException', () => {
    it('should create exception with reset time', () => {
      const resetTime = new Date('2024-01-01T12:00:00Z');
      const exception = new RateLimitExceededException(resetTime);

      expect(exception.message).toBe('AI service rate limit exceeded');
      expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(exception.errorCode).toBe('RATE_LIMIT_EXCEEDED');
      expect(exception.details).toEqual({ resetTime });
    });

    it('should work without reset time', () => {
      const exception = new RateLimitExceededException();

      expect(exception.message).toBe('AI service rate limit exceeded');
      expect(exception.details).toEqual({ resetTime: undefined });
    });

    it('should provide retry information in response', () => {
      const resetTime = new Date();
      const exception = new RateLimitExceededException(resetTime);
      const response = exception.getResponse() as any;

      expect(response.details.resetTime).toBe(resetTime);
    });
  });

  describe('InsufficientProfileDataException', () => {
    it('should create exception with missing fields', () => {
      const missingFields = ['skills', 'interests', 'preferredSpecializations'];
      const exception = new InsufficientProfileDataException(missingFields);

      expect(exception.message).toBe(
        'Insufficient profile data for recommendations',
      );
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.errorCode).toBe('INSUFFICIENT_PROFILE_DATA');
      expect(exception.details).toEqual({ missingFields });
    });

    it('should handle empty missing fields array', () => {
      const exception = new InsufficientProfileDataException([]);

      expect(exception.details.missingFields).toEqual([]);
    });

    it('should provide helpful error details', () => {
      const missingFields = ['skills'];
      const exception = new InsufficientProfileDataException(missingFields);
      const response = exception.getResponse() as any;

      expect(response.details.missingFields).toEqual(['skills']);
    });
  });

  describe('AIModelTimeoutException', () => {
    it('should create exception with model and timeout info', () => {
      const model = 'sentence-transformers/all-MiniLM-L6-v2';
      const timeoutMs = 10000;
      const exception = new AIModelTimeoutException(model, timeoutMs);

      expect(exception.message).toBe(
        `AI model '${model}' request timed out after ${timeoutMs}ms`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
      expect(exception.errorCode).toBe('AI_MODEL_TIMEOUT');
      expect(exception.details).toEqual({ model, timeoutMs });
    });

    it('should provide timeout details for retry logic', () => {
      const exception = new AIModelTimeoutException('test-model', 5000);
      const response = exception.getResponse() as any;

      expect(response.details.model).toBe('test-model');
      expect(response.details.timeoutMs).toBe(5000);
    });
  });

  describe('CircuitBreakerOpenException', () => {
    it('should create exception with service name', () => {
      const service = 'hugging-face-api';
      const exception = new CircuitBreakerOpenException(service);

      expect(exception.message).toBe(
        `Circuit breaker is open for service '${service}'`,
      );
      expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      expect(exception.errorCode).toBe('CIRCUIT_BREAKER_OPEN');
      expect(exception.details).toEqual({ service, resetTime: undefined });
    });

    it('should include reset time when provided', () => {
      const service = 'ai-service';
      const resetTime = new Date('2024-01-01T12:00:00Z');
      const exception = new CircuitBreakerOpenException(service, resetTime);

      expect(exception.details).toEqual({ service, resetTime });
    });

    it('should provide service recovery information', () => {
      const resetTime = new Date();
      const exception = new CircuitBreakerOpenException(
        'test-service',
        resetTime,
      );
      const response = exception.getResponse() as any;

      expect(response.details.service).toBe('test-service');
      expect(response.details.resetTime).toBe(resetTime);
    });
  });

  describe('Error Response Structure', () => {
    it('should maintain consistent error response format across all AI exceptions', () => {
      const exceptions = [
        new AIServiceException('AI error'),
        new RateLimitExceededException(),
        new InsufficientProfileDataException(['skills']),
        new AIModelTimeoutException('model', 1000),
        new CircuitBreakerOpenException('service'),
      ];

      exceptions.forEach((exception) => {
        const response = exception.getResponse() as any;

        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('errorCode');
        expect(typeof response.message).toBe('string');
        expect(typeof response.errorCode).toBe('string');
      });
    });

    it('should have appropriate HTTP status codes', () => {
      const testCases = [
        {
          exception: new AIServiceException('test'),
          expectedStatus: HttpStatus.SERVICE_UNAVAILABLE,
        },
        {
          exception: new RateLimitExceededException(),
          expectedStatus: HttpStatus.TOO_MANY_REQUESTS,
        },
        {
          exception: new InsufficientProfileDataException([]),
          expectedStatus: HttpStatus.BAD_REQUEST,
        },
        {
          exception: new AIModelTimeoutException('model', 1000),
          expectedStatus: HttpStatus.REQUEST_TIMEOUT,
        },
        {
          exception: new CircuitBreakerOpenException('service'),
          expectedStatus: HttpStatus.SERVICE_UNAVAILABLE,
        },
      ];

      testCases.forEach(({ exception, expectedStatus }) => {
        expect(exception.getStatus()).toBe(expectedStatus);
      });
    });
  });
});
