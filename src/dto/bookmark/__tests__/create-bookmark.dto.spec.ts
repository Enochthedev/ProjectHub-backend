import { validate } from 'class-validator';
import { CreateBookmarkDto } from '../create-bookmark.dto';

describe('CreateBookmarkDto', () => {
  let dto: CreateBookmarkDto;

  beforeEach(() => {
    dto = new CreateBookmarkDto();
  });

  describe('projectId validation', () => {
    it('should pass validation with valid UUID', async () => {
      dto.projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid UUID', async () => {
      dto.projectId = 'invalid-uuid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when projectId is empty', async () => {
      dto.projectId = '';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectId');
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail validation when projectId is undefined', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectId');
    });
  });
});
