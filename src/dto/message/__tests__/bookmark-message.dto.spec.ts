import { validate } from 'class-validator';
import { BookmarkMessageDto } from '../bookmark-message.dto';

describe('BookmarkMessageDto', () => {
  let dto: BookmarkMessageDto;

  beforeEach(() => {
    dto = new BookmarkMessageDto();
  });

  describe('Valid DTO', () => {
    it('should pass validation with valid messageId', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid messageId and note', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';
      dto.note = 'Great explanation of literature review methodology';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty note', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';
      dto.note = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid DTO', () => {
    it('should fail validation when messageId is missing', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('messageId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when messageId is not a valid UUID', async () => {
      dto.messageId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('messageId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when note exceeds maximum length', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';
      dto.note = 'a'.repeat(501); // Exceeds 500 character limit

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('note');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail validation when note is not a string', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';
      (dto as any).note = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('note');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('Optional Properties', () => {
    it('should allow undefined note', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';
      dto.note = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow note at maximum length (500 characters)', async () => {
      dto.messageId = '123e4567-e89b-12d3-a456-426614174000';
      dto.note = 'a'.repeat(500);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
