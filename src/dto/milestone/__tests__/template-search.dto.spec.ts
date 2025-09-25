import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { TemplateSearchDto } from '../template-search.dto';
import { ProjectType } from '../../../common/enums/project-type.enum';

describe('TemplateSearchDto', () => {
  const validSearchData = {
    query: 'machine learning',
    specialization: 'Artificial Intelligence',
    projectType: ProjectType.INDIVIDUAL,
    isActive: true,
    tags: ['research', 'ai', 'machine-learning'],
    minDurationWeeks: 8,
    maxDurationWeeks: 16,
    createdBy: '550e8400-e29b-41d4-a716-446655440000',
    minUsageCount: 5,
    page: 1,
    limit: 20,
    sortBy: 'usageCount' as const,
    sortOrder: 'DESC' as const,
  };

  describe('query validation', () => {
    it('should accept valid search query', async () => {
      const dto = plainToClass(TemplateSearchDto, {
        query: validSearchData.query,
      });
      const errors = await validate(dto);
      const queryErrors = errors.filter((error) => error.property === 'query');
      expect(queryErrors).toHaveLength(0);
    });

    it('should reject query shorter than 2 characters', async () => {
      const invalidData = { query: 'A' };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const queryErrors = errors.filter((error) => error.property === 'query');
      expect(queryErrors).toHaveLength(1);
      expect(queryErrors[0].constraints?.minLength).toContain(
        'Search query must be at least 2 characters long',
      );
    });

    it('should reject query longer than 100 characters', async () => {
      const longQuery = 'A'.repeat(101);
      const invalidData = { query: longQuery };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const queryErrors = errors.filter((error) => error.property === 'query');
      expect(queryErrors).toHaveLength(1);
      expect(queryErrors[0].constraints?.maxLength).toContain(
        'Search query must not exceed 100 characters',
      );
    });

    it('should trim whitespace from query', async () => {
      const dataWithWhitespace = { query: '  machine learning  ' };
      const dto = plainToClass(TemplateSearchDto, dataWithWhitespace);
      expect(dto.query).toBe('machine learning');
    });

    it('should allow undefined query', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      const errors = await validate(dto);
      const queryErrors = errors.filter((error) => error.property === 'query');
      expect(queryErrors).toHaveLength(0);
    });
  });

  describe('specialization validation', () => {
    it('should accept valid specialization', async () => {
      const dto = plainToClass(TemplateSearchDto, {
        specialization: validSearchData.specialization,
      });
      const errors = await validate(dto);
      const specErrors = errors.filter(
        (error) => error.property === 'specialization',
      );
      expect(specErrors).toHaveLength(0);
    });

    it('should reject specialization shorter than 2 characters', async () => {
      const invalidData = { specialization: 'A' };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const specErrors = errors.filter(
        (error) => error.property === 'specialization',
      );
      expect(specErrors).toHaveLength(1);
      expect(specErrors[0].constraints?.minLength).toContain(
        'Specialization must be at least 2 characters long',
      );
    });

    it('should trim whitespace from specialization', async () => {
      const dataWithWhitespace = {
        specialization: '  Artificial Intelligence  ',
      };
      const dto = plainToClass(TemplateSearchDto, dataWithWhitespace);
      expect(dto.specialization).toBe('Artificial Intelligence');
    });

    it('should allow undefined specialization', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      const errors = await validate(dto);
      const specErrors = errors.filter(
        (error) => error.property === 'specialization',
      );
      expect(specErrors).toHaveLength(0);
    });
  });

  describe('projectType validation', () => {
    it('should accept valid project types', async () => {
      for (const projectType of Object.values(ProjectType)) {
        const data = { projectType };
        const dto = plainToClass(TemplateSearchDto, data);
        const errors = await validate(dto);
        const typeErrors = errors.filter(
          (error) => error.property === 'projectType',
        );
        expect(typeErrors).toHaveLength(0);
      }
    });

    it('should reject invalid project type', async () => {
      const invalidData = { projectType: 'invalid_type' as any };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const typeErrors = errors.filter(
        (error) => error.property === 'projectType',
      );
      expect(typeErrors).toHaveLength(1);
      expect(typeErrors[0].constraints?.isEnum).toContain(
        'Project type must be one of:',
      );
    });

    it('should allow undefined project type', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      const errors = await validate(dto);
      const typeErrors = errors.filter(
        (error) => error.property === 'projectType',
      );
      expect(typeErrors).toHaveLength(0);
    });
  });

  describe('isActive validation', () => {
    it('should accept boolean values', async () => {
      for (const isActive of [true, false]) {
        const data = { isActive };
        const dto = plainToClass(TemplateSearchDto, data);
        const errors = await validate(dto);
        const activeErrors = errors.filter(
          (error) => error.property === 'isActive',
        );
        expect(activeErrors).toHaveLength(0);
      }
    });

    it('should allow undefined isActive', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      const errors = await validate(dto);
      const activeErrors = errors.filter(
        (error) => error.property === 'isActive',
      );
      expect(activeErrors).toHaveLength(0);
    });
  });

  describe('tags validation', () => {
    it('should accept valid tags array', async () => {
      const data = { tags: validSearchData.tags };
      const dto = plainToClass(TemplateSearchDto, data);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(0);
    });

    it('should reject non-array tags', async () => {
      const invalidData = { tags: 'not-an-array' as any };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(1);
      expect(tagsErrors[0].constraints?.isArray).toContain(
        'Tags must be an array',
      );
    });

    it('should reject non-string tag items', async () => {
      const invalidData = { tags: ['valid', 123, 'another'] as any };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(1);
      expect(tagsErrors[0].constraints?.isString).toContain(
        'Each tag must be a string',
      );
    });

    it('should trim and filter empty tags', async () => {
      const dataWithWhitespace = {
        tags: ['  research  ', '', '  ai  ', '   '],
      };
      const dto = plainToClass(TemplateSearchDto, dataWithWhitespace);
      expect(dto.tags).toEqual(['research', 'ai']);
    });

    it('should allow undefined tags', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(0);
    });
  });

  describe('duration validation', () => {
    it('should accept valid min and max duration', async () => {
      const data = {
        minDurationWeeks: validSearchData.minDurationWeeks,
        maxDurationWeeks: validSearchData.maxDurationWeeks,
      };
      const dto = plainToClass(TemplateSearchDto, data);
      const errors = await validate(dto);
      const minErrors = errors.filter(
        (error) => error.property === 'minDurationWeeks',
      );
      const maxErrors = errors.filter(
        (error) => error.property === 'maxDurationWeeks',
      );
      expect(minErrors).toHaveLength(0);
      expect(maxErrors).toHaveLength(0);
    });

    it('should reject duration less than 1 week', async () => {
      const invalidData = { minDurationWeeks: 0 };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const minErrors = errors.filter(
        (error) => error.property === 'minDurationWeeks',
      );
      expect(minErrors).toHaveLength(1);
      expect(minErrors[0].constraints?.min).toContain(
        'Minimum duration must be at least 1 week',
      );
    });

    it('should reject duration greater than 52 weeks', async () => {
      const invalidData = { maxDurationWeeks: 53 };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const maxErrors = errors.filter(
        (error) => error.property === 'maxDurationWeeks',
      );
      expect(maxErrors).toHaveLength(1);
      expect(maxErrors[0].constraints?.max).toContain(
        'Maximum duration must not exceed 52 weeks',
      );
    });
  });

  describe('pagination validation', () => {
    it('should accept valid page and limit', async () => {
      const data = { page: 2, limit: 10 };
      const dto = plainToClass(TemplateSearchDto, data);
      const errors = await validate(dto);
      const pageErrors = errors.filter((error) => error.property === 'page');
      const limitErrors = errors.filter((error) => error.property === 'limit');
      expect(pageErrors).toHaveLength(0);
      expect(limitErrors).toHaveLength(0);
    });

    it('should reject page less than 1', async () => {
      const invalidData = { page: 0 };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const pageErrors = errors.filter((error) => error.property === 'page');
      expect(pageErrors).toHaveLength(1);
      expect(pageErrors[0].constraints?.min).toContain(
        'Page must be at least 1',
      );
    });

    it('should reject limit greater than 100', async () => {
      const invalidData = { limit: 101 };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const limitErrors = errors.filter((error) => error.property === 'limit');
      expect(limitErrors).toHaveLength(1);
      expect(limitErrors[0].constraints?.max).toContain(
        'Limit must not exceed 100',
      );
    });

    it('should use default values for page and limit', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(20);
    });
  });

  describe('sorting validation', () => {
    it('should accept valid sort fields', async () => {
      const validSortFields = [
        'name',
        'createdAt',
        'usageCount',
        'estimatedDurationWeeks',
      ];
      for (const sortBy of validSortFields) {
        const data = { sortBy: sortBy as any };
        const dto = plainToClass(TemplateSearchDto, data);
        const errors = await validate(dto);
        const sortErrors = errors.filter(
          (error) => error.property === 'sortBy',
        );
        expect(sortErrors).toHaveLength(0);
      }
    });

    it('should reject invalid sort field', async () => {
      const invalidData = { sortBy: 'invalid_field' as any };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const sortErrors = errors.filter((error) => error.property === 'sortBy');
      expect(sortErrors).toHaveLength(1);
      expect(sortErrors[0].constraints?.isEnum).toContain(
        'Sort by must be one of:',
      );
    });

    it('should accept valid sort orders', async () => {
      for (const sortOrder of ['ASC', 'DESC']) {
        const data = { sortOrder: sortOrder as any };
        const dto = plainToClass(TemplateSearchDto, data);
        const errors = await validate(dto);
        const orderErrors = errors.filter(
          (error) => error.property === 'sortOrder',
        );
        expect(orderErrors).toHaveLength(0);
      }
    });

    it('should reject invalid sort order', async () => {
      const invalidData = { sortOrder: 'INVALID' as any };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      const orderErrors = errors.filter(
        (error) => error.property === 'sortOrder',
      );
      expect(orderErrors).toHaveLength(1);
      expect(orderErrors[0].constraints?.isEnum).toContain(
        'Sort order must be either ASC or DESC',
      );
    });

    it('should use default values for sorting', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      expect(dto.sortBy).toBe('createdAt');
      expect(dto.sortOrder).toBe('DESC');
    });
  });

  describe('complete validation scenarios', () => {
    it('should pass validation with empty object', async () => {
      const dto = plainToClass(TemplateSearchDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(TemplateSearchDto, validSearchData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial data', async () => {
      const partialData = {
        query: 'ai',
        specialization: 'Computer Science',
        isActive: true,
        page: 2,
      };
      const dto = plainToClass(TemplateSearchDto, partialData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with multiple invalid fields', async () => {
      const invalidData = {
        query: 'A', // Too short
        specialization: 'B', // Too short
        projectType: 'invalid', // Invalid enum
        minDurationWeeks: 0, // Too low
        maxDurationWeeks: 53, // Too high
        page: 0, // Too low
        limit: 101, // Too high
        sortBy: 'invalid', // Invalid enum
        sortOrder: 'INVALID', // Invalid enum
      };
      const dto = plainToClass(TemplateSearchDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Should have errors for multiple fields
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('query');
      expect(errorProperties).toContain('specialization');
      expect(errorProperties).toContain('projectType');
      expect(errorProperties).toContain('minDurationWeeks');
      expect(errorProperties).toContain('maxDurationWeeks');
      expect(errorProperties).toContain('page');
      expect(errorProperties).toContain('limit');
      expect(errorProperties).toContain('sortBy');
      expect(errorProperties).toContain('sortOrder');
    });
  });
});
