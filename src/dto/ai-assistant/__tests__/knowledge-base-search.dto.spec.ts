import { validate } from 'class-validator';
import { KnowledgeBaseSearchDto } from '../knowledge-base-search.dto';
import { ContentType } from '../../../common/enums';

describe('KnowledgeBaseSearchDto', () => {
  let dto: KnowledgeBaseSearchDto;

  beforeEach(() => {
    dto = new KnowledgeBaseSearchDto();
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

  describe('contentType validation', () => {
    it('should pass with valid content types', async () => {
      const validTypes = Object.values(ContentType);

      for (const type of validTypes) {
        dto.contentType = type;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined content type', async () => {
      dto.contentType = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid content type', async () => {
      (dto as any).contentType = 'invalid_type';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEnum).toBeDefined();
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

  describe('tags validation', () => {
    it('should pass with valid tags array', async () => {
      dto.tags = ['research', 'academic_writing', 'guidelines'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with empty tags array', async () => {
      dto.tags = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined tags', async () => {
      dto.tags = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-array tags', async () => {
      (dto as any).tags = 'tag1,tag2';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isArray).toBeDefined();
    });

    it('should fail with non-string elements in tags array', async () => {
      (dto as any).tags = ['tag1', 123, 'tag3'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('boolean fields validation', () => {
    it('should pass with valid boolean values', async () => {
      dto.activeOnly = true;
      dto.includeRelevanceScore = false;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with default values', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-boolean values', async () => {
      (dto as any).activeOnly = 'true';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isBoolean).toBeDefined();
    });
  });

  describe('numeric fields validation', () => {
    it('should pass with valid numeric values', async () => {
      dto.minRating = 4.0;
      dto.minUsageCount = 10;
      dto.limit = 50;
      dto.offset = 20;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with minimum values', async () => {
      dto.minRating = 0;
      dto.minUsageCount = 0;
      dto.limit = 1;
      dto.offset = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with maximum values', async () => {
      dto.minRating = 5;
      dto.limit = 100;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with values below minimum', async () => {
      dto.minRating = -1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail with values above maximum', async () => {
      dto.minRating = 6;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.max).toBeDefined();
    });

    it('should fail with non-number values', async () => {
      (dto as any).minRating = '4.0';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });
  });

  describe('sorting validation', () => {
    it('should pass with valid sort fields', async () => {
      const validSortFields = [
        'relevance',
        'rating',
        'usage',
        'created_at',
        'updated_at',
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
      dto.category = 'methodology';
      dto.tags = ['research', 'academic_writing'];
      dto.contentType = ContentType.GUIDELINE;
      dto.language = 'en';
      dto.activeOnly = true;
      dto.minRating = 4.0;
      dto.minUsageCount = 10;
      dto.includeRelevanceScore = true;
      dto.limit = 20;
      dto.offset = 0;
      dto.sortBy = 'relevance';
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
