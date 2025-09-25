import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { BookmarkQueryDto } from '../bookmark-query.dto';

describe('BookmarkQueryDto', () => {
  describe('page validation', () => {
    it('should pass validation with valid page number', async () => {
      const dto = plainToClass(BookmarkQueryDto, { page: '1' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
    });

    it('should use default page value when not provided', async () => {
      const dto = plainToClass(BookmarkQueryDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.page).toBe(1);
    });

    it('should fail validation with page less than 1', async () => {
      const dto = plainToClass(BookmarkQueryDto, { page: '0' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail validation with non-integer page', async () => {
      const dto = plainToClass(BookmarkQueryDto, { page: 'invalid' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('page');
      expect(errors[0].constraints).toHaveProperty('isInt');
    });
  });

  describe('limit validation', () => {
    it('should pass validation with valid limit', async () => {
      const dto = plainToClass(BookmarkQueryDto, { limit: '20' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(20);
    });

    it('should use default limit value when not provided', async () => {
      const dto = plainToClass(BookmarkQueryDto, {});

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(20);
    });

    it('should fail validation with limit less than 1', async () => {
      const dto = plainToClass(BookmarkQueryDto, { limit: '0' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail validation with limit greater than 100', async () => {
      const dto = plainToClass(BookmarkQueryDto, { limit: '101' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should fail validation with non-integer limit', async () => {
      const dto = plainToClass(BookmarkQueryDto, { limit: 'invalid' });

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('limit');
      expect(errors[0].constraints).toHaveProperty('isInt');
    });
  });
});
