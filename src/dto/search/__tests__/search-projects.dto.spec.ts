import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { SearchProjectsDto } from '../search-projects.dto';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';
import {
  ProjectSortBy,
  SortOrder,
} from '../../../common/enums/project-sort-by.enum';
import { SPECIALIZATIONS } from '../../../common/constants/specializations';

describe('SearchProjectsDto', () => {
  let dto: SearchProjectsDto;

  beforeEach(() => {
    dto = new SearchProjectsDto();
  });

  describe('query validation', () => {
    it('should accept valid query string', async () => {
      dto.query = 'machine learning project';
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should trim whitespace from query', () => {
      const input = { query: '  machine learning  ' };
      const transformed = plainToClass(SearchProjectsDto, input);
      expect(transformed.query).toBe('machine learning');
    });

    it('should reject query exceeding 100 characters', async () => {
      dto.query = 'a'.repeat(101);
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.maxLength).toContain('100 characters');
    });

    it('should accept empty query', async () => {
      dto.query = undefined;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('specializations validation', () => {
    it('should accept valid specializations', async () => {
      dto.specializations = [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
      ];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid specializations', async () => {
      dto.specializations = ['Invalid Specialization'];
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.isIn).toContain('Invalid specialization');
    });

    it('should reject more than 10 specializations', async () => {
      dto.specializations = Array(11).fill(SPECIALIZATIONS[0]);
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.arrayMaxSize).toContain(
        'Maximum 10 specializations',
      );
    });

    it('should accept all valid specializations', async () => {
      dto.specializations = [...SPECIALIZATIONS];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should accept empty specializations array', async () => {
      dto.specializations = [];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('difficulty levels validation', () => {
    it('should accept valid difficulty levels', async () => {
      dto.difficultyLevels = [
        DifficultyLevel.BEGINNER,
        DifficultyLevel.INTERMEDIATE,
      ];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid difficulty levels', async () => {
      dto.difficultyLevels = ['invalid' as any];
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });

    it('should reject more than 3 difficulty levels', async () => {
      dto.difficultyLevels = [
        DifficultyLevel.BEGINNER,
        DifficultyLevel.INTERMEDIATE,
        DifficultyLevel.ADVANCED,
        'extra' as any,
      ];
      const errors = await validate(dto);
      expect(errors.length).toBe(1); // Only array size validation
    });

    it('should accept all valid difficulty levels', async () => {
      dto.difficultyLevels = [
        DifficultyLevel.BEGINNER,
        DifficultyLevel.INTERMEDIATE,
        DifficultyLevel.ADVANCED,
      ];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('year validation', () => {
    const currentYear = new Date().getFullYear();

    it('should accept valid year range', async () => {
      dto.yearFrom = 2020;
      dto.yearTo = currentYear;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject year before 2020', async () => {
      dto.yearFrom = 2019;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.min).toContain('2020');
    });

    it('should reject future years', async () => {
      dto.yearFrom = currentYear + 1;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.max).toContain('future');
    });

    it('should transform string numbers to integers', () => {
      const input = { yearFrom: '2023', yearTo: '2024' };
      const transformed = plainToClass(SearchProjectsDto, input);
      expect(transformed.yearFrom).toBe(2023);
      expect(transformed.yearTo).toBe(2024);
      expect(typeof transformed.yearFrom).toBe('number');
    });

    it('should reject non-integer years', async () => {
      dto.yearFrom = 2023.5 as any;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.isInt).toContain('integer');
    });
  });

  describe('tags validation', () => {
    it('should accept valid tags array', async () => {
      dto.tags = ['react', 'typescript', 'nodejs'];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject more than 20 tags', async () => {
      dto.tags = Array(21).fill('tag');
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.arrayMaxSize).toContain('Maximum 20 tags');
    });

    it('should accept empty tags array', async () => {
      dto.tags = [];
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should reject non-string tags', async () => {
      dto.tags = [123 as any, 'valid-tag'];
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
    });
  });

  describe('pagination validation', () => {
    it('should accept valid pagination parameters', async () => {
      dto.limit = 50;
      dto.offset = 100;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should use default values when not provided', () => {
      const transformed = plainToClass(SearchProjectsDto, {});
      expect(transformed.limit).toBe(20);
      expect(transformed.offset).toBe(0);
    });

    it('should reject limit less than 1', async () => {
      dto.limit = 0;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.min).toContain('at least 1');
    });

    it('should reject limit greater than 100', async () => {
      dto.limit = 101;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.max).toContain('cannot exceed 100');
    });

    it('should reject negative offset', async () => {
      dto.offset = -1;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.min).toContain('at least 0');
    });

    it('should transform string numbers to integers', () => {
      const input = { limit: '25', offset: '50' };
      const transformed = plainToClass(SearchProjectsDto, input);
      expect(transformed.limit).toBe(25);
      expect(transformed.offset).toBe(50);
    });
  });

  describe('sorting validation', () => {
    it('should accept valid sort parameters', async () => {
      dto.sortBy = ProjectSortBy.POPULARITY;
      dto.sortOrder = SortOrder.ASC;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should use default sort values', () => {
      const transformed = plainToClass(SearchProjectsDto, {});
      expect(transformed.sortBy).toBe(ProjectSortBy.RELEVANCE);
      expect(transformed.sortOrder).toBe(SortOrder.DESC);
    });

    it('should reject invalid sort by option', async () => {
      dto.sortBy = 'invalid' as any;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.isEnum).toContain('Invalid sort by');
    });

    it('should reject invalid sort order', async () => {
      dto.sortOrder = 'invalid' as any;
      const errors = await validate(dto);
      expect(errors.length).toBe(1);
      expect(errors[0].constraints?.isEnum).toContain('Invalid sort order');
    });
  });

  describe('isGroupProject validation', () => {
    it('should accept boolean values', async () => {
      dto.isGroupProject = true;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);

      dto.isGroupProject = false;
      const errors2 = await validate(dto);
      expect(errors2.length).toBe(0);
    });

    it('should transform string boolean to boolean', () => {
      const input1 = { isGroupProject: true };
      const transformed1 = plainToClass(SearchProjectsDto, input1);
      expect(transformed1.isGroupProject).toBe(true);

      const input2 = { isGroupProject: false };
      const transformed2 = plainToClass(SearchProjectsDto, input2);
      expect(transformed2.isGroupProject).toBe(false);
    });

    it('should accept undefined value', async () => {
      dto.isGroupProject = undefined;
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('complex validation scenarios', () => {
    it('should validate complete search request', async () => {
      const input = {
        query: 'machine learning',
        specializations: ['Artificial Intelligence & Machine Learning'],
        difficultyLevels: [DifficultyLevel.INTERMEDIATE],
        yearFrom: 2022,
        yearTo: 2024,
        tags: ['python', 'tensorflow'],
        isGroupProject: false,
        limit: 10,
        offset: 0,
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
      };

      const transformed = plainToClass(SearchProjectsDto, input);
      const errors = await validate(transformed);
      expect(errors.length).toBe(0);
    });

    it('should handle multiple validation errors', async () => {
      dto.query = 'a'.repeat(101); // Too long
      dto.specializations = ['Invalid Spec']; // Invalid specialization
      dto.yearFrom = 2019; // Too early
      dto.limit = 0; // Too small

      const errors = await validate(dto);
      expect(errors.length).toBe(4);
    });

    it('should validate empty search request', async () => {
      const transformed = plainToClass(SearchProjectsDto, {});
      const errors = await validate(transformed);
      expect(errors.length).toBe(0);
    });
  });
});
