import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateMilestoneDto } from '../create-milestone.dto';
import { Priority } from '../../../common/enums/priority.enum';

describe('CreateMilestoneDto', () => {
  // Calculate a valid future date within current academic year
  const getValidFutureDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-based

    if (currentMonth >= 8) {
      // September or later
      // Use a date in the next few months within the academic year
      const futureDate = new Date(now.getFullYear() + 1, 2, 15); // March 15th next year
      return futureDate.toISOString().split('T')[0];
    } else {
      // Use a date in the next few months within the current academic year
      const futureDate = new Date(now.getFullYear(), now.getMonth() + 2, 15);
      return futureDate.toISOString().split('T')[0];
    }
  };

  const validMilestoneData = {
    title: 'Complete Literature Review',
    description:
      'Complete comprehensive literature review covering recent advances in machine learning',
    dueDate: getValidFutureDate(),
    priority: Priority.HIGH,
    estimatedHours: 40,
    tags: ['research', 'literature-review'],
  };

  describe('title validation', () => {
    it('should accept valid title', async () => {
      const dto = plainToClass(CreateMilestoneDto, validMilestoneData);
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(0);
    });

    it('should reject title shorter than 3 characters', async () => {
      const invalidData = { ...validMilestoneData, title: 'AB' };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.minLength).toContain(
        'Title must be at least 3 characters long',
      );
    });

    it('should reject title longer than 200 characters', async () => {
      const longTitle = 'A'.repeat(201);
      const invalidData = { ...validMilestoneData, title: longTitle };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.maxLength).toContain(
        'Title must not exceed 200 characters',
      );
    });

    it('should trim whitespace from title', async () => {
      const dataWithWhitespace = {
        ...validMilestoneData,
        title: '  Valid Title  ',
      };
      const dto = plainToClass(CreateMilestoneDto, dataWithWhitespace);
      expect(dto.title).toBe('Valid Title');
    });

    it('should reject non-string title', async () => {
      const invalidData = { ...validMilestoneData, title: 123 };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.isString).toContain(
        'Title must be a string',
      );
    });
  });

  describe('description validation', () => {
    it('should accept valid description', async () => {
      const dto = plainToClass(CreateMilestoneDto, validMilestoneData);
      const errors = await validate(dto);
      const descriptionErrors = errors.filter(
        (error) => error.property === 'description',
      );
      expect(descriptionErrors).toHaveLength(0);
    });

    it('should reject description shorter than 10 characters', async () => {
      const invalidData = { ...validMilestoneData, description: 'Short' };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const descriptionErrors = errors.filter(
        (error) => error.property === 'description',
      );
      expect(descriptionErrors).toHaveLength(1);
      expect(descriptionErrors[0].constraints?.minLength).toContain(
        'Description must be at least 10 characters long',
      );
    });

    it('should reject description longer than 1000 characters', async () => {
      const longDescription = 'A'.repeat(1001);
      const invalidData = {
        ...validMilestoneData,
        description: longDescription,
      };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const descriptionErrors = errors.filter(
        (error) => error.property === 'description',
      );
      expect(descriptionErrors).toHaveLength(1);
      expect(descriptionErrors[0].constraints?.maxLength).toContain(
        'Description must not exceed 1000 characters',
      );
    });

    it('should trim whitespace from description', async () => {
      const dataWithWhitespace = {
        ...validMilestoneData,
        description: '  Valid description with enough characters  ',
      };
      const dto = plainToClass(CreateMilestoneDto, dataWithWhitespace);
      expect(dto.description).toBe('Valid description with enough characters');
    });
  });

  describe('dueDate validation', () => {
    it('should accept valid future date within academic year', async () => {
      // Use a date that's definitely in the future and within academic year
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 7); // 7 days from now
      const validData = {
        ...validMilestoneData,
        dueDate: tomorrow.toISOString().split('T')[0],
      };

      const dto = plainToClass(CreateMilestoneDto, validData);
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );
      expect(dueDateErrors).toHaveLength(0);
    });

    it('should reject past dates', async () => {
      const invalidData = { ...validMilestoneData, dueDate: '2020-01-01' };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );
      expect(dueDateErrors.length).toBeGreaterThan(0);

      // Check for future date validation error
      const futureError = dueDateErrors.find(
        (error) =>
          error.constraints &&
          Object.values(error.constraints).some(
            (msg) => typeof msg === 'string' && msg.includes('future'),
          ),
      );
      expect(futureError).toBeDefined();
    });

    it('should reject invalid date format', async () => {
      const invalidData = { ...validMilestoneData, dueDate: 'invalid-date' };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );
      expect(dueDateErrors).toHaveLength(1);
      expect(dueDateErrors[0].constraints?.isDateString).toContain(
        'Due date must be a valid date string',
      );
    });

    it('should reject dates outside academic year', async () => {
      // Test with a date far in the future (outside typical academic year)
      const invalidData = { ...validMilestoneData, dueDate: '2030-01-01' };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );

      // Should have academic year validation error
      const academicYearError = dueDateErrors.find(
        (error) =>
          error.constraints &&
          Object.values(error.constraints).some(
            (msg) => typeof msg === 'string' && msg.includes('academic year'),
          ),
      );
      expect(academicYearError).toBeDefined();
    });
  });

  describe('priority validation', () => {
    it('should accept valid priority values', async () => {
      for (const priority of Object.values(Priority)) {
        const data = { ...validMilestoneData, priority };
        const dto = plainToClass(CreateMilestoneDto, data);
        const errors = await validate(dto);
        const priorityErrors = errors.filter(
          (error) => error.property === 'priority',
        );
        expect(priorityErrors).toHaveLength(0);
      }
    });

    it('should reject invalid priority value', async () => {
      const invalidData = { ...validMilestoneData, priority: 'invalid' as any };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const priorityErrors = errors.filter(
        (error) => error.property === 'priority',
      );
      expect(priorityErrors).toHaveLength(1);
      expect(priorityErrors[0].constraints?.isEnum).toContain(
        'Priority must be one of:',
      );
    });
  });

  describe('projectId validation', () => {
    it('should accept valid UUID', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const data = { ...validMilestoneData, projectId: validUuid };
      const dto = plainToClass(CreateMilestoneDto, data);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(0);
    });

    it('should reject invalid UUID format', async () => {
      const invalidData = { ...validMilestoneData, projectId: 'invalid-uuid' };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(1);
      expect(projectIdErrors[0].constraints?.isUuid).toContain(
        'Project ID must be a valid UUID',
      );
    });

    it('should allow undefined projectId', async () => {
      const data = { ...validMilestoneData };
      delete (data as any).projectId;
      const dto = plainToClass(CreateMilestoneDto, data);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(0);
    });
  });

  describe('estimatedHours validation', () => {
    it('should accept valid estimated hours', async () => {
      const data = { ...validMilestoneData, estimatedHours: 40 };
      const dto = plainToClass(CreateMilestoneDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should reject hours less than 1', async () => {
      const invalidData = { ...validMilestoneData, estimatedHours: 0 };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.min).toContain(
        'Estimated hours must be at least 1',
      );
    });

    it('should reject hours greater than 1000', async () => {
      const invalidData = { ...validMilestoneData, estimatedHours: 1001 };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.max).toContain(
        'Estimated hours must not exceed 1000',
      );
    });

    it('should reject non-integer values', async () => {
      const invalidData = { ...validMilestoneData, estimatedHours: 40.5 };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.isInt).toContain(
        'Estimated hours must be an integer',
      );
    });

    it('should allow undefined estimatedHours', async () => {
      const data = { ...validMilestoneData };
      delete (data as any).estimatedHours;
      const dto = plainToClass(CreateMilestoneDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });
  });

  describe('tags validation', () => {
    it('should accept valid tags array', async () => {
      const data = {
        ...validMilestoneData,
        tags: ['research', 'literature-review'],
      };
      const dto = plainToClass(CreateMilestoneDto, data);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(0);
    });

    it('should reject non-array tags', async () => {
      const invalidData = {
        ...validMilestoneData,
        tags: 'not-an-array' as any,
      };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(1);
      expect(tagsErrors[0].constraints?.isArray).toContain(
        'Tags must be an array',
      );
    });

    it('should reject non-string tag items', async () => {
      const invalidData = {
        ...validMilestoneData,
        tags: ['valid', 123, 'another'] as any,
      };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(1);
      expect(tagsErrors[0].constraints?.isString).toContain(
        'Each tag must be a string',
      );
    });

    it('should trim and filter empty tags', async () => {
      const dataWithWhitespace = {
        ...validMilestoneData,
        tags: ['  research  ', '', '  literature-review  ', '   '],
      };
      const dto = plainToClass(CreateMilestoneDto, dataWithWhitespace);
      expect(dto.tags).toEqual(['research', 'literature-review']);
    });

    it('should allow undefined tags', async () => {
      const data = { ...validMilestoneData };
      delete (data as any).tags;
      const dto = plainToClass(CreateMilestoneDto, data);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(0);
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(CreateMilestoneDto, validMilestoneData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with multiple invalid fields', async () => {
      const invalidData = {
        title: 'AB', // Too short
        description: 'Short', // Too short
        dueDate: '2020-01-01', // Past date
        priority: 'invalid', // Invalid enum
        estimatedHours: 0, // Too low
      };
      const dto = plainToClass(CreateMilestoneDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Should have errors for multiple fields
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('title');
      expect(errorProperties).toContain('description');
      expect(errorProperties).toContain('dueDate');
      expect(errorProperties).toContain('priority');
      expect(errorProperties).toContain('estimatedHours');
    });
  });
});
