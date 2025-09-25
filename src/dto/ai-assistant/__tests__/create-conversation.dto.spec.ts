import { validate } from 'class-validator';
import { CreateConversationDto } from '../create-conversation.dto';

describe('CreateConversationDto', () => {
  let dto: CreateConversationDto;

  beforeEach(() => {
    dto = new CreateConversationDto();
  });

  describe('title validation', () => {
    it('should pass with valid title', async () => {
      dto.title = 'Literature Review Discussion';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with empty title', async () => {
      dto.title = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail with title too short', async () => {
      dto.title = 'Hi';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail with title too long', async () => {
      dto.title = 'a'.repeat(201);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should fail with non-string title', async () => {
      (dto as any).title = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('initialQuery validation', () => {
    it('should pass with valid initial query', async () => {
      dto.title = 'Valid Title';
      dto.initialQuery = 'How do I start my literature review?';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined initial query', async () => {
      dto.title = 'Valid Title';
      dto.initialQuery = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with initial query too long', async () => {
      dto.title = 'Valid Title';
      dto.initialQuery = 'a'.repeat(1001);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should fail with non-string initial query', async () => {
      dto.title = 'Valid Title';
      (dto as any).initialQuery = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('projectId validation', () => {
    it('should pass with valid UUID', async () => {
      dto.title = 'Valid Title';
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined projectId', async () => {
      dto.title = 'Valid Title';
      dto.projectId = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid UUID', async () => {
      dto.title = 'Valid Title';
      dto.projectId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });
  });

  describe('language validation', () => {
    it('should pass with valid language codes', async () => {
      dto.title = 'Valid Title';
      const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      for (const lang of validLanguages) {
        dto.language = lang;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined language (defaults to en)', async () => {
      dto.title = 'Valid Title';
      dto.language = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid language code', async () => {
      dto.title = 'Valid Title';
      dto.language = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('complete DTO validation', () => {
    it('should pass with all valid fields', async () => {
      dto.title = 'Machine Learning Literature Review';
      dto.initialQuery =
        'How do I conduct a systematic literature review for machine learning research?';
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000';
      dto.language = 'en';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with only required fields', async () => {
      dto.title = 'Literature Review Discussion';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
