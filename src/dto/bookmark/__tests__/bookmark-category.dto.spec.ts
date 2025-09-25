import { validate } from 'class-validator';
import {
  CreateBookmarkCategoryDto,
  UpdateBookmarkCategoryDto,
  AssignBookmarkCategoryDto,
} from '../bookmark-category.dto';

describe('Bookmark Category DTOs', () => {
  describe('CreateBookmarkCategoryDto', () => {
    let dto: CreateBookmarkCategoryDto;

    beforeEach(() => {
      dto = new CreateBookmarkCategoryDto();
    });

    it('should pass validation with valid data', async () => {
      dto.name = 'Web Development';
      dto.description = 'Projects related to web development';
      dto.color = '#3498db';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with only required fields', async () => {
      dto.name = 'AI Projects';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty name', async () => {
      dto.name = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail validation with name too long', async () => {
      dto.name = 'a'.repeat(51);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail validation with description too long', async () => {
      dto.name = 'Valid Name';
      dto.description = 'a'.repeat(201);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('description');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail validation with color too long', async () => {
      dto.name = 'Valid Name';
      dto.color = '#1234567890';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('color');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });
  });

  describe('UpdateBookmarkCategoryDto', () => {
    let dto: UpdateBookmarkCategoryDto;

    beforeEach(() => {
      dto = new UpdateBookmarkCategoryDto();
    });

    it('should pass validation with partial data', async () => {
      dto.name = 'Updated Name';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with empty name when provided', async () => {
      dto.name = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
      expect(errors[0].constraints).toHaveProperty('minLength');
    });
  });

  describe('AssignBookmarkCategoryDto', () => {
    let dto: AssignBookmarkCategoryDto;

    beforeEach(() => {
      dto = new AssignBookmarkCategoryDto();
    });

    it('should pass validation with valid bookmark ID and category ID', async () => {
      dto.bookmarkId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      dto.categoryId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with valid bookmark ID and no category ID', async () => {
      dto.bookmarkId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid bookmark ID', async () => {
      dto.bookmarkId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('bookmarkId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation with invalid category ID', async () => {
      dto.bookmarkId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      dto.categoryId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('categoryId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when bookmark ID is missing', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('bookmarkId');
    });
  });
});
