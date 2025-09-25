import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { GenerateRecommendationsDto } from '../generate-recommendations.dto';
import { DifficultyLevel } from '../../../common/enums/difficulty-level.enum';

describe('GenerateRecommendationsDto', () => {
  describe('limit validation', () => {
    it('should accept valid limit values', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, { limit: 10 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should use default limit when not provided', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {});
      expect(dto.limit).toBe(10);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject limit below minimum', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, { limit: 0 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject limit above maximum', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, { limit: 25 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should reject non-integer limit', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, { limit: 10.5 });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('isInt');
    });
  });

  describe('specialization filtering', () => {
    it('should accept valid exclude specializations array', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        excludeSpecializations: ['Machine Learning', 'Web Development'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid include specializations array', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        includeSpecializations: ['Data Science', 'Mobile Development'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-string values in exclude specializations', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        excludeSpecializations: ['Valid String', 123, null],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('excludeSpecializations');
    });

    it('should reject non-array exclude specializations', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        excludeSpecializations: 'Not an array',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('excludeSpecializations');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });
  });

  describe('difficulty level validation', () => {
    it('should accept valid difficulty level', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        maxDifficulty: DifficultyLevel.INTERMEDIATE,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid difficulty level', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        maxDifficulty: 'invalid_level' as any,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('maxDifficulty');
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('should allow undefined difficulty level', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {});
      expect(dto.maxDifficulty).toBeUndefined();
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('similarity score validation', () => {
    it('should accept valid similarity score', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        minSimilarityScore: 0.5,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should use default similarity score when not provided', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {});
      expect(dto.minSimilarityScore).toBe(0.3);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject similarity score below minimum', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        minSimilarityScore: -0.1,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('minSimilarityScore');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should reject similarity score above maximum', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        minSimilarityScore: 1.5,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('minSimilarityScore');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should accept boundary values', async () => {
      const dtoMin = plainToClass(GenerateRecommendationsDto, {
        minSimilarityScore: 0.0,
      });
      const errorsMin = await validate(dtoMin);
      expect(errorsMin).toHaveLength(0);

      const dtoMax = plainToClass(GenerateRecommendationsDto, {
        minSimilarityScore: 1.0,
      });
      const errorsMax = await validate(dtoMax);
      expect(errorsMax).toHaveLength(0);
    });
  });

  describe('boolean flags validation', () => {
    it('should accept valid forceRefresh flag', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        forceRefresh: true,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should use default forceRefresh when not provided', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {});
      expect(dto.forceRefresh).toBe(false);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept valid includeDiversityBoost flag', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        includeDiversityBoost: false,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should use default includeDiversityBoost when not provided', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {});
      expect(dto.includeDiversityBoost).toBe(true);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-boolean values', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        forceRefresh: 'true' as any,
        includeDiversityBoost: 1 as any,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(2);
      expect(errors.some((e) => e.property === 'forceRefresh')).toBe(true);
      expect(errors.some((e) => e.property === 'includeDiversityBoost')).toBe(
        true,
      );
    });
  });

  describe('complete DTO validation', () => {
    it('should validate complete valid DTO', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        limit: 15,
        excludeSpecializations: ['Machine Learning'],
        includeSpecializations: ['Web Development', 'Mobile Development'],
        maxDifficulty: DifficultyLevel.ADVANCED,
        forceRefresh: true,
        minSimilarityScore: 0.4,
        includeDiversityBoost: false,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate DTO with only optional fields', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      // Check default values
      expect(dto.limit).toBe(10);
      expect(dto.forceRefresh).toBe(false);
      expect(dto.minSimilarityScore).toBe(0.3);
      expect(dto.includeDiversityBoost).toBe(true);
    });

    it('should handle type transformation correctly', async () => {
      const dto = plainToClass(GenerateRecommendationsDto, {
        limit: '5', // String that should be converted to number
        minSimilarityScore: '0.7', // String that should be converted to number
      });

      expect(typeof dto.limit).toBe('number');
      expect(dto.limit).toBe(5);
      expect(typeof dto.minSimilarityScore).toBe('number');
      expect(dto.minSimilarityScore).toBe(0.7);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
