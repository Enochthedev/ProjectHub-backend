import { validate } from 'class-validator';
import { ConversationSearchDto } from '../conversation-search.dto';
import { ConversationStatus } from '../../../common/enums';

describe('ConversationSearchDto', () => {
  let dto: ConversationSearchDto;

  beforeEach(() => {
    dto = new ConversationSearchDto();
  });

  describe('query validation', () => {
    it('should pass with valid query', async () => {
      dto.query = 'literature review methodology';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined query', async () => {
      dto.query = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-string query', async () => {
      (dto as any).query = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('status validation', () => {
    it('should pass with valid status values', async () => {
      const validStatuses = Object.values(ConversationStatus);

      for (const status of validStatuses) {
        dto.status = status;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined status', async () => {
      dto.status = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid status', async () => {
      (dto as any).status = 'invalid_status';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });
  });

  describe('projectId validation', () => {
    it('should pass with valid UUID', async () => {
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined projectId', async () => {
      dto.projectId = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid UUID', async () => {
      dto.projectId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUuid).toBeDefined();
    });
  });

  describe('language validation', () => {
    it('should pass with valid language codes', async () => {
      const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      for (const lang of validLanguages) {
        dto.language = lang;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined language', async () => {
      dto.language = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid language code', async () => {
      dto.language = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('date validation', () => {
    it('should pass with valid date strings', async () => {
      dto.createdAfter = '2024-01-01T00:00:00Z';
      dto.createdBefore = '2024-12-31T23:59:59Z';
      dto.lastActivityAfter = '2024-01-15T00:00:00Z';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined date fields', async () => {
      dto.createdAfter = undefined;
      dto.createdBefore = undefined;
      dto.lastActivityAfter = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-string date fields', async () => {
      (dto as any).createdAfter = 123;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('pagination validation', () => {
    it('should pass with valid pagination values', async () => {
      dto.limit = 50;
      dto.offset = 10;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with default values', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with limit below minimum', async () => {
      dto.limit = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail with limit above maximum', async () => {
      dto.limit = 101;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.max).toBeDefined();
    });

    it('should fail with negative offset', async () => {
      dto.offset = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail with non-number pagination values', async () => {
      (dto as any).limit = '20';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });
  });

  describe('sorting validation', () => {
    it('should pass with valid sort fields', async () => {
      const validSortFields = [
        'createdAt',
        'updatedAt',
        'lastMessageAt',
        'title',
      ];

      for (const field of validSortFields) {
        dto.sortBy = field;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with valid sort orders', async () => {
      const validSortOrders: ('ASC' | 'DESC')[] = ['ASC', 'DESC'];

      for (const order of validSortOrders) {
        dto.sortOrder = order;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with default sort values', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid sort field', async () => {
      dto.sortBy = 'invalid_field';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });

    it('should fail with invalid sort order', async () => {
      dto.sortOrder = 'INVALID' as any;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('complete DTO validation', () => {
    it('should pass with all valid fields', async () => {
      dto.query = 'literature review methodology';
      dto.status = ConversationStatus.ACTIVE;
      dto.projectId = '123e4567-e89b-12d3-a456-426614174000';
      dto.language = 'en';
      dto.createdAfter = '2024-01-01T00:00:00Z';
      dto.createdBefore = '2024-12-31T23:59:59Z';
      dto.lastActivityAfter = '2024-01-15T00:00:00Z';
      dto.limit = 20;
      dto.offset = 0;
      dto.sortBy = 'lastMessageAt';
      dto.sortOrder = 'DESC';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all undefined fields', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
