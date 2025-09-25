import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

/**
 * AI Assistant specific exceptions
 */

export class ConversationNotFoundException extends AppException {
  constructor(conversationId: string) {
    super(
      `Conversation with ID ${conversationId} not found`,
      HttpStatus.NOT_FOUND,
      'CONVERSATION_NOT_FOUND',
      { conversationId },
    );
  }
}

export class AIServiceUnavailableException extends AppException {
  constructor(service: string, details?: any) {
    super(
      `AI service '${service}' is currently unavailable`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'AI_SERVICE_UNAVAILABLE',
      { service, ...details },
    );
  }
}

export class LowConfidenceResponseException extends AppException {
  constructor(confidenceScore: number, threshold: number) {
    super(
      `AI response confidence (${confidenceScore}) is below threshold (${threshold})`,
      HttpStatus.PARTIAL_CONTENT,
      'LOW_CONFIDENCE_RESPONSE',
      { confidenceScore, threshold },
    );
  }
}

export class ConversationLimitExceededException extends AppException {
  constructor(limit: number, current: number) {
    super(
      `Maximum conversation limit of ${limit} exceeded (current: ${current})`,
      HttpStatus.TOO_MANY_REQUESTS,
      'CONVERSATION_LIMIT_EXCEEDED',
      { limit, current },
    );
  }
}

export class MessageNotFoundException extends AppException {
  constructor(messageId: string) {
    super(
      `Message with ID ${messageId} not found`,
      HttpStatus.NOT_FOUND,
      'MESSAGE_NOT_FOUND',
      { messageId },
    );
  }
}

export class InvalidQueryException extends AppException {
  constructor(query: string, issues: string[]) {
    super(
      `Invalid query: ${issues.join(', ')}`,
      HttpStatus.BAD_REQUEST,
      'INVALID_QUERY',
      { query, issues },
    );
  }
}

export class KnowledgeBaseUnavailableException extends AppException {
  constructor(details?: any) {
    super(
      'Knowledge base service is currently unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
      'KNOWLEDGE_BASE_UNAVAILABLE',
      details,
    );
  }
}

export class TemplateProcessingException extends AppException {
  constructor(templateId: string, error: string) {
    super(
      `Failed to process template ${templateId}: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'TEMPLATE_PROCESSING_ERROR',
      { templateId, error },
    );
  }
}

export class ContextBuildingException extends AppException {
  constructor(conversationId: string, error: string) {
    super(
      `Failed to build context for conversation ${conversationId}: ${error}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'CONTEXT_BUILDING_ERROR',
      { conversationId, error },
    );
  }
}

export class EscalationRequiredException extends AppException {
  constructor(reason: string, conversationId?: string) {
    super(
      `Human escalation required: ${reason}`,
      HttpStatus.ACCEPTED,
      'ESCALATION_REQUIRED',
      { reason, conversationId },
    );
  }
}

export class CircuitBreakerOpenException extends AppException {
  constructor(service: string, resetTime?: Date) {
    super(
      `Circuit breaker is open for service '${service}'`,
      HttpStatus.SERVICE_UNAVAILABLE,
      'CIRCUIT_BREAKER_OPEN',
      { service, resetTime },
    );
  }
}

export class AIModelTimeoutException extends AppException {
  constructor(model: string, timeoutMs: number) {
    super(
      `AI model '${model}' request timed out after ${timeoutMs}ms`,
      HttpStatus.REQUEST_TIMEOUT,
      'AI_MODEL_TIMEOUT',
      { model, timeoutMs },
    );
  }
}

export class RateLimitExceededException extends AppException {
  constructor(resetTime?: Date) {
    super(
      'AI service rate limit exceeded',
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMIT_EXCEEDED',
      { resetTime },
    );
  }
}
