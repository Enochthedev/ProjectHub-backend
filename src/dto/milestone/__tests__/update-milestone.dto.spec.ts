import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UpdateMilestoneDto } from '../update-milestone.dto';
import { Priority } from '../../../common/enums/priority.enum';

describe('UpdateMilestoneDto', () => {
  // Calculate a valid future date within current academic year
  const getValidFutureDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7); // 7 days from now
    return tomorrow.toISOString().split('T')[0];
  };

  const validUpdateData = {
    title: 'Updated Literature Review',
    description:
      'Updated comprehensive literature review covering recent advances in machine learning',
    dueDate: getValidFutureDate(),
    priority: Priority.MEDIUM,
    estimatedHours: 50,
    tags: ['research', 'updated'],
  };

  describe('title validation', () => {
    it('should accept valid title', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(0);
    });

    it('should reject title shorter than 3 characters', async () => {
      const invalidData = { title: 'AB' };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.minLength).toContain(
        'Title must be at least 3 characters long',
      );
    });

    it('should reject title longer than 200 characters', async () => {
      const longTitle = 'A'.repeat(201);
      const invalidData = { title: longTitle };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.maxLength).toContain(
        'Title must not exceed 200 characters',
      );
    });

    it('should trim whitespace from title', async () => {
      const dataWithWhitespace = { title: '  Updated Title  ' };
      const dto = plainToClass(UpdateMilestoneDto, dataWithWhitespace);
      expect(dto.title).toBe('Updated Title');
    });

    it('should allow undefined title', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const titleErrors = errors.filter((error) => error.property === 'title');
      expect(titleErrors).toHaveLength(0);
    });
  });

  describe('description validation', () => {
    it('should accept valid description', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {
        description: validUpdateData.description,
      });
      const errors = await validate(dto);
      const descriptionErrors = errors.filter(
        (error) => error.property === 'description',
      );
      expect(descriptionErrors).toHaveLength(0);
    });

    it('should reject description shorter than 10 characters', async () => {
      const invalidData = { description: 'Short' };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
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
      const invalidData = { description: longDescription };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const descriptionErrors = errors.filter(
        (error) => error.property === 'description',
      );
      expect(descriptionErrors).toHaveLength(1);
      expect(descriptionErrors[0].constraints?.maxLength).toContain(
        'Description must not exceed 1000 characters',
      );
    });

    it('should allow undefined description', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const descriptionErrors = errors.filter(
        (error) => error.property === 'description',
      );
      expect(descriptionErrors).toHaveLength(0);
    });
  });

  describe('dueDate validation', () => {
    it('should accept valid future date within academic year', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {
        dueDate: validUpdateData.dueDate,
      });
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );
      expect(dueDateErrors).toHaveLength(0);
    });

    it('should reject past dates', async () => {
      const invalidData = { dueDate: '2020-01-01' };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
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
      const invalidData = { dueDate: 'invalid-date' };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );
      expect(dueDateErrors).toHaveLength(1);
      expect(dueDateErrors[0].constraints?.isDateString).toContain(
        'Due date must be a valid date string',
      );
    });

    it('should allow undefined dueDate', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const dueDateErrors = errors.filter(
        (error) => error.property === 'dueDate',
      );
      expect(dueDateErrors).toHaveLength(0);
    });
  });

  describe('priority validation', () => {
    it('should accept valid priority values', async () => {
      for (const priority of Object.values(Priority)) {
        const data = { priority };
        const dto = plainToClass(UpdateMilestoneDto, data);
        const errors = await validate(dto);
        const priorityErrors = errors.filter(
          (error) => error.property === 'priority',
        );
        expect(priorityErrors).toHaveLength(0);
      }
    });

    it('should reject invalid priority value', async () => {
      const invalidData = { priority: 'invalid' as any };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const priorityErrors = errors.filter(
        (error) => error.property === 'priority',
      );
      expect(priorityErrors).toHaveLength(1);
      expect(priorityErrors[0].constraints?.isEnum).toContain(
        'Priority must be one of:',
      );
    });

    it('should allow undefined priority', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const priorityErrors = errors.filter(
        (error) => error.property === 'priority',
      );
      expect(priorityErrors).toHaveLength(0);
    });
  });

  describe('projectId validation', () => {
    it('should accept valid UUID', async () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      const data = { projectId: validUuid };
      const dto = plainToClass(UpdateMilestoneDto, data);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(0);
    });

    it('should reject invalid UUID format', async () => {
      const invalidData = { projectId: 'invalid-uuid' };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
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
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(0);
    });
  });

  describe('estimatedHours validation', () => {
    it('should accept valid estimated hours', async () => {
      const data = { estimatedHours: 40 };
      const dto = plainToClass(UpdateMilestoneDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should reject hours less than 1', async () => {
      const invalidData = { estimatedHours: 0 };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
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
      const invalidData = { estimatedHours: 1001 };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.max).toContain(
        'Estimated hours must not exceed 1000',
      );
    });

    it('should allow undefined estimatedHours', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'estimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });
  });

  describe('tags validation', () => {
    it('should accept valid tags array', async () => {
      const data = { tags: ['research', 'updated'] };
      const dto = plainToClass(UpdateMilestoneDto, data);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(0);
    });

    it('should reject non-array tags', async () => {
      const invalidData = { tags: 'not-an-array' as any };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(1);
      expect(tagsErrors[0].constraints?.isArray).toContain(
        'Tags must be an array',
      );
    });

    it('should trim and filter empty tags', async () => {
      const dataWithWhitespace = {
        tags: ['  research  ', '', '  updated  ', '   '],
      };
      const dto = plainToClass(UpdateMilestoneDto, dataWithWhitespace);
      expect(dto.tags).toEqual(['research', 'updated']);
    });

    it('should allow undefined tags', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      const tagsErrors = errors.filter((error) => error.property === 'tags');
      expect(tagsErrors).toHaveLength(0);
    });
  });

  describe('partial update validation', () => {
    it('should pass validation with empty object', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with single field update', async () => {
      const dto = plainToClass(UpdateMilestoneDto, { title: 'New Title' });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with multiple field updates', async () => {
      const dto = plainToClass(UpdateMilestoneDto, {
        title: 'New Title',
        priority: Priority.HIGH,
        estimatedHours: 60,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid fields', async () => {
      const invalidData = {
        title: 'AB', // Too short
        description: 'Short', // Too short
        priority: 'invalid', // Invalid enum
      };
      const dto = plainToClass(UpdateMilestoneDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Should have errors for invalid fields
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('title');
      expect(errorProperties).toContain('description');
      expect(errorProperties).toContain('priority');
    });
  });
});
