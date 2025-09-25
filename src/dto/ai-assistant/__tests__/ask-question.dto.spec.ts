import { validate } from 'class-validator';
import { AskQuestionDto } from '../ask-question.dto';

describe('AskQuestionDto', () => {
  let dto: AskQuestionDto;

  beforeEach(() => {
    dto = new AskQuestionDto();
  });

  describe('query validation', () => {
    it('should pass with valid query', async () => {
      dto.query = 'What is a literature review?';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with empty query', async () => {
      dto.query = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail with query too short', async () => {
      dto.query = 'Hi';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail with query too long', async () => {
      dto.query = 'a'.repeat(1001);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should fail with non-string query', async () => {
      (dto as any).query = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('conversationId validation', () => {
    it('should pass with valid UUID', async () => {
      dto.query = 'Valid question';
      dto.conversationId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined conversationId', async () => {
      dto.query = 'Valid question';
      dto.conversationId = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid UUID', async () => {
      dto.query = 'Valid question';
      dto.conversationId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });
  });

  describe('language validation', () => {
    it('should pass with valid language codes', async () => {
      dto.query = 'Valid question';
      const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      for (const lang of validLanguages) {
        dto.language = lang;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined language', async () => {
      dto.query = 'Valid question';
      dto.language = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid language code', async () => {
      dto.query = 'Valid question';
      dto.language = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('projectPhase validation', () => {
    it('should pass with valid project phase', async () => {
      dto.query = 'Valid question';
      dto.projectPhase = 'literature_review';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined project phase', async () => {
      dto.query = 'Valid question';
      dto.projectPhase = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('includeProjectContext validation', () => {
    it('should pass with boolean value', async () => {
      dto.query = 'Valid question';
      dto.includeProjectContext = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined value (defaults to true)', async () => {
      dto.query = 'Valid question';
      dto.includeProjectContext = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-boolean value', async () => {
      dto.query = 'Valid question';
      (dto as any).includeProjectContext = 'true';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isBoolean).toBeDefined();
    });
  });

  describe('specialization validation', () => {
    it('should pass with valid specialization', async () => {
      dto.query = 'Valid question';
      dto.specialization = 'machine_learning';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined specialization', async () => {
      dto.query = 'Valid question';
      dto.specialization = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('complete DTO validation', () => {
    it('should pass with all valid fields', async () => {
      dto.query =
        'How do I write a comprehensive literature review for my machine learning project?';
      dto.conversationId = '123e4567-e89b-12d3-a456-426614174000';
      dto.language = 'en';
      dto.projectPhase = 'literature_review';
      dto.includeProjectContext = true;
      dto.specialization = 'machine_learning';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only required fields', async () => {
      dto.query = 'What is a literature review?';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
