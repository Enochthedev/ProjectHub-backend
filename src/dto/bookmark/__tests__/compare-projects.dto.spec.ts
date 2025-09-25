import { validate } from 'class-validator';
import { CompareProjectsDto } from '../compare-projects.dto';

describe('CompareProjectsDto', () => {
  let dto: CompareProjectsDto;

  beforeEach(() => {
    dto = new CompareProjectsDto();
  });

  describe('projectIds validation', () => {
    it('should pass validation with valid UUIDs and correct array size', async () => {
      dto.projectIds = [
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with maximum allowed projects (5)', async () => {
      dto.projectIds = [
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with less than 2 projects', async () => {
      dto.projectIds = ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectIds');
      expect(errors[0].constraints).toHaveProperty('arrayMinSize');
    });

    it('should fail validation with more than 5 projects', async () => {
      dto.projectIds = [
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
        'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
        'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
        'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      ];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectIds');
      expect(errors[0].constraints).toHaveProperty('arrayMaxSize');
    });

    it('should fail validation with invalid UUIDs', async () => {
      dto.projectIds = ['invalid-uuid-1', 'invalid-uuid-2'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectIds');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when projectIds is not an array', async () => {
      (dto as any).projectIds = 'not-an-array';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectIds');
      expect(errors[0].constraints).toHaveProperty('isArray');
    });

    it('should fail validation when projectIds is empty array', async () => {
      dto.projectIds = [];

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectIds');
      expect(errors[0].constraints).toHaveProperty('arrayMinSize');
    });

    it('should fail validation when projectIds is undefined', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('projectIds');
    });
  });
});
