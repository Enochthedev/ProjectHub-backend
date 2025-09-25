import { validate } from 'class-validator';
import { AssistantResponseDto } from '../assistant-response.dto';

describe('AssistantResponseDto', () => {
  let dto: AssistantResponseDto;

  beforeEach(() => {
    dto = new AssistantResponseDto();
  });

  describe('response validation', () => {
    it('should pass with valid response', async () => {
      dto.response = 'A literature review is a comprehensive survey...';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-string response', async () => {
      (dto as any).response = 123;
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('confidenceScore validation', () => {
    it('should pass with valid confidence score', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.75;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with minimum confidence score', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with maximum confidence score', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 1;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with confidence score below minimum', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = -0.1;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail with confidence score above maximum', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 1.1;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.max).toBeDefined();
    });

    it('should fail with non-number confidence score', async () => {
      dto.response = 'Valid response';
      (dto as any).confidenceScore = '0.85';
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });
  });

  describe('sources validation', () => {
    it('should pass with valid sources array', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1', 'Source 2', 'Source 3'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with empty sources array', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = [];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-array sources', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      (dto as any).sources = 'Source 1';
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isArray).toBeDefined();
    });

    it('should fail with non-string elements in sources array', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      (dto as any).sources = ['Source 1', 123, 'Source 3'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('boolean fields validation', () => {
    it('should pass with valid boolean values', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = false;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-boolean fromAI', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      (dto as any).fromAI = 'true';
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isBoolean).toBeDefined();
    });
  });

  describe('optional fields validation', () => {
    it('should pass with valid optional fields', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.suggestedFollowUps = ['Question 1', 'Question 2'];
      dto.escalationSuggestion = 'Contact supervisor for more help';
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
        requiresHumanReview: true,
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined optional fields', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('metadata validation', () => {
    it('should pass with valid metadata object', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      dto.metadata = {
        processingTime: 1500,
        language: 'en',
        category: 'methodology',
        requiresHumanReview: false,
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-object metadata', async () => {
      dto.response = 'Valid response';
      dto.confidenceScore = 0.85;
      dto.sources = ['Source 1'];
      dto.conversationId = 'conv-id';
      dto.messageId = 'msg-id';
      dto.fromAI = true;
      (dto as any).metadata = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isObject).toBeDefined();
    });
  });
});
