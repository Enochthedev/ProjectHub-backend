import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  ApplyTemplateDto,
  TemplateMilestoneCustomizationDto,
} from '../apply-template.dto';
import { Priority } from '../../../common/enums/priority.enum';

describe('ApplyTemplateDto', () => {
  // Calculate a valid future date within current academic year
  const getValidFutureDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const validApplyTemplateData = {
    templateId: '550e8400-e29b-41d4-a716-446655440000',
    startDate: getValidFutureDate(),
    projectId: '550e8400-e29b-41d4-a716-446655440001',
    customDurationWeeks: 16,
    notes: 'Applying template for AI/ML specialization project',
  };

  describe('templateId validation', () => {
    it('should accept valid UUID template ID', async () => {
      const dto = plainToClass(ApplyTemplateDto, validApplyTemplateData);
      const errors = await validate(dto);
      const templateIdErrors = errors.filter(
        (error) => error.property === 'templateId',
      );
      expect(templateIdErrors).toHaveLength(0);
    });

    it('should reject invalid UUID format', async () => {
      const invalidData = {
        ...validApplyTemplateData,
        templateId: 'invalid-uuid',
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const templateIdErrors = errors.filter(
        (error) => error.property === 'templateId',
      );
      expect(templateIdErrors).toHaveLength(1);
      expect(templateIdErrors[0].constraints?.isUuid).toContain(
        'Template ID must be a valid UUID',
      );
    });

    it('should reject empty template ID', async () => {
      const invalidData = { ...validApplyTemplateData, templateId: '' };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const templateIdErrors = errors.filter(
        (error) => error.property === 'templateId',
      );
      expect(templateIdErrors).toHaveLength(1);
      expect(templateIdErrors[0].constraints?.isNotEmpty).toContain(
        'Template ID cannot be empty',
      );
    });
  });

  describe('startDate validation', () => {
    it('should accept valid future start date', async () => {
      const dto = plainToClass(ApplyTemplateDto, validApplyTemplateData);
      const errors = await validate(dto);
      const startDateErrors = errors.filter(
        (error) => error.property === 'startDate',
      );
      expect(startDateErrors).toHaveLength(0);
    });

    it('should accept today as start date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const data = { ...validApplyTemplateData, startDate: today };
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const startDateErrors = errors.filter(
        (error) => error.property === 'startDate',
      );
      expect(startDateErrors).toHaveLength(0);
    });

    it('should reject past dates', async () => {
      const invalidData = {
        ...validApplyTemplateData,
        startDate: '2020-01-01',
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const startDateErrors = errors.filter(
        (error) => error.property === 'startDate',
      );
      expect(startDateErrors.length).toBeGreaterThan(0);

      // Check for future date validation error
      const futureError = startDateErrors.find(
        (error) =>
          error.constraints &&
          Object.values(error.constraints).some(
            (msg) => typeof msg === 'string' && msg.includes('future'),
          ),
      );
      expect(futureError).toBeDefined();
    });

    it('should reject invalid date format', async () => {
      const invalidData = {
        ...validApplyTemplateData,
        startDate: 'invalid-date',
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const startDateErrors = errors.filter(
        (error) => error.property === 'startDate',
      );
      expect(startDateErrors).toHaveLength(1);
      expect(startDateErrors[0].constraints?.isDateString).toContain(
        'Start date must be a valid date string',
      );
    });
  });

  describe('projectId validation', () => {
    it('should accept valid UUID project ID', async () => {
      const dto = plainToClass(ApplyTemplateDto, validApplyTemplateData);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(0);
    });

    it('should reject invalid UUID format', async () => {
      const invalidData = {
        ...validApplyTemplateData,
        projectId: 'invalid-uuid',
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(1);
      expect(projectIdErrors[0].constraints?.isUuid).toContain(
        'Project ID must be a valid UUID',
      );
    });

    it('should allow undefined project ID', async () => {
      const data = { ...validApplyTemplateData };
      delete (data as any).projectId;
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const projectIdErrors = errors.filter(
        (error) => error.property === 'projectId',
      );
      expect(projectIdErrors).toHaveLength(0);
    });
  });

  describe('customDurationWeeks validation', () => {
    it('should accept valid custom duration', async () => {
      const data = { ...validApplyTemplateData, customDurationWeeks: 20 };
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const durationErrors = errors.filter(
        (error) => error.property === 'customDurationWeeks',
      );
      expect(durationErrors).toHaveLength(0);
    });

    it('should reject duration less than 1 week', async () => {
      const invalidData = { ...validApplyTemplateData, customDurationWeeks: 0 };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const durationErrors = errors.filter(
        (error) => error.property === 'customDurationWeeks',
      );
      expect(durationErrors).toHaveLength(1);
      expect(durationErrors[0].constraints?.min).toContain(
        'Custom duration must be at least 1 week',
      );
    });

    it('should reject duration greater than 52 weeks', async () => {
      const invalidData = {
        ...validApplyTemplateData,
        customDurationWeeks: 53,
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const durationErrors = errors.filter(
        (error) => error.property === 'customDurationWeeks',
      );
      expect(durationErrors).toHaveLength(1);
      expect(durationErrors[0].constraints?.max).toContain(
        'Custom duration must not exceed 52 weeks',
      );
    });

    it('should allow undefined custom duration', async () => {
      const data = { ...validApplyTemplateData };
      delete (data as any).customDurationWeeks;
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const durationErrors = errors.filter(
        (error) => error.property === 'customDurationWeeks',
      );
      expect(durationErrors).toHaveLength(0);
    });
  });

  describe('notes validation', () => {
    it('should accept valid notes', async () => {
      const dto = plainToClass(ApplyTemplateDto, validApplyTemplateData);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(0);
    });

    it('should reject notes longer than 500 characters', async () => {
      const longNotes = 'A'.repeat(501);
      const invalidData = { ...validApplyTemplateData, notes: longNotes };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(1);
      expect(notesErrors[0].constraints?.maxLength).toContain(
        'Notes must not exceed 500 characters',
      );
    });

    it('should trim whitespace from notes', async () => {
      const dataWithWhitespace = {
        ...validApplyTemplateData,
        notes: '  Valid notes with whitespace  ',
      };
      const dto = plainToClass(ApplyTemplateDto, dataWithWhitespace);
      expect(dto.notes).toBe('Valid notes with whitespace');
    });

    it('should allow undefined notes', async () => {
      const data = { ...validApplyTemplateData };
      delete (data as any).notes;
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(0);
    });
  });

  describe('customizations validation', () => {
    const validCustomization = {
      milestoneTitle: 'Literature Review',
      newTitle: 'Comprehensive Literature Review',
      newDescription:
        'Conduct comprehensive literature review on recent advances',
      newDaysFromStart: 21,
      priority: Priority.HIGH,
      newEstimatedHours: 60,
      exclude: false,
    };

    it('should accept valid customizations array', async () => {
      const data = {
        ...validApplyTemplateData,
        customizations: [validCustomization],
      };
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const customizationErrors = errors.filter(
        (error) => error.property === 'customizations',
      );
      expect(customizationErrors).toHaveLength(0);
    });

    it('should reject non-array customizations', async () => {
      const invalidData = {
        ...validApplyTemplateData,
        customizations: 'not-an-array' as any,
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      const customizationErrors = errors.filter(
        (error) => error.property === 'customizations',
      );
      expect(customizationErrors).toHaveLength(1);
      expect(customizationErrors[0].constraints?.isArray).toContain(
        'Customizations must be an array',
      );
    });

    it('should allow undefined customizations', async () => {
      const data = { ...validApplyTemplateData };
      delete (data as any).customizations;
      const dto = plainToClass(ApplyTemplateDto, data);
      const errors = await validate(dto);
      const customizationErrors = errors.filter(
        (error) => error.property === 'customizations',
      );
      expect(customizationErrors).toHaveLength(0);
    });
  });

  describe('complete validation scenarios', () => {
    it('should pass validation with minimal required fields', async () => {
      const minimalData = {
        templateId: '550e8400-e29b-41d4-a716-446655440000',
        startDate: getValidFutureDate(),
      };
      const dto = plainToClass(ApplyTemplateDto, minimalData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(ApplyTemplateDto, validApplyTemplateData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with multiple invalid fields', async () => {
      const invalidData = {
        templateId: 'invalid-uuid',
        startDate: '2020-01-01', // Past date
        projectId: 'invalid-uuid',
        customDurationWeeks: 0, // Too low
        notes: 'A'.repeat(501), // Too long
      };
      const dto = plainToClass(ApplyTemplateDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Should have errors for multiple fields
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('templateId');
      expect(errorProperties).toContain('startDate');
      expect(errorProperties).toContain('projectId');
      expect(errorProperties).toContain('customDurationWeeks');
      expect(errorProperties).toContain('notes');
    });
  });
});

describe('TemplateMilestoneCustomizationDto', () => {
  const validCustomizationData = {
    milestoneTitle: 'Literature Review',
    newTitle: 'Comprehensive Literature Review',
    newDescription:
      'Conduct comprehensive literature review on recent advances in machine learning',
    newDaysFromStart: 21,
    priority: Priority.HIGH,
    newEstimatedHours: 60,
    exclude: false,
  };

  describe('milestoneTitle validation', () => {
    it('should accept valid milestone title', async () => {
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        validCustomizationData,
      );
      const errors = await validate(dto);
      const titleErrors = errors.filter(
        (error) => error.property === 'milestoneTitle',
      );
      expect(titleErrors).toHaveLength(0);
    });

    it('should reject empty milestone title', async () => {
      const invalidData = { ...validCustomizationData, milestoneTitle: '' };
      const dto = plainToClass(TemplateMilestoneCustomizationDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter(
        (error) => error.property === 'milestoneTitle',
      );
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.isNotEmpty).toContain(
        'Milestone title cannot be empty',
      );
    });

    it('should reject title shorter than 3 characters', async () => {
      const invalidData = { ...validCustomizationData, milestoneTitle: 'AB' };
      const dto = plainToClass(TemplateMilestoneCustomizationDto, invalidData);
      const errors = await validate(dto);
      const titleErrors = errors.filter(
        (error) => error.property === 'milestoneTitle',
      );
      expect(titleErrors).toHaveLength(1);
      expect(titleErrors[0].constraints?.minLength).toContain(
        'Milestone title must be at least 3 characters long',
      );
    });

    it('should trim whitespace from milestone title', async () => {
      const dataWithWhitespace = {
        ...validCustomizationData,
        milestoneTitle: '  Literature Review  ',
      };
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        dataWithWhitespace,
      );
      expect(dto.milestoneTitle).toBe('Literature Review');
    });
  });

  describe('optional fields validation', () => {
    it('should accept valid new title', async () => {
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        validCustomizationData,
      );
      const errors = await validate(dto);
      const newTitleErrors = errors.filter(
        (error) => error.property === 'newTitle',
      );
      expect(newTitleErrors).toHaveLength(0);
    });

    it('should accept valid new description', async () => {
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        validCustomizationData,
      );
      const errors = await validate(dto);
      const newDescErrors = errors.filter(
        (error) => error.property === 'newDescription',
      );
      expect(newDescErrors).toHaveLength(0);
    });

    it('should accept valid days from start', async () => {
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        validCustomizationData,
      );
      const errors = await validate(dto);
      const daysErrors = errors.filter(
        (error) => error.property === 'newDaysFromStart',
      );
      expect(daysErrors).toHaveLength(0);
    });

    it('should accept valid priority', async () => {
      for (const priority of Object.values(Priority)) {
        const data = { ...validCustomizationData, priority };
        const dto = plainToClass(TemplateMilestoneCustomizationDto, data);
        const errors = await validate(dto);
        const priorityErrors = errors.filter(
          (error) => error.property === 'priority',
        );
        expect(priorityErrors).toHaveLength(0);
      }
    });

    it('should accept valid estimated hours', async () => {
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        validCustomizationData,
      );
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'newEstimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should accept valid exclude flag', async () => {
      const dto = plainToClass(
        TemplateMilestoneCustomizationDto,
        validCustomizationData,
      );
      const errors = await validate(dto);
      const excludeErrors = errors.filter(
        (error) => error.property === 'exclude',
      );
      expect(excludeErrors).toHaveLength(0);
    });
  });

  describe('validation with minimal data', () => {
    it('should pass validation with only milestone title', async () => {
      const minimalData = { milestoneTitle: 'Literature Review' };
      const dto = plainToClass(TemplateMilestoneCustomizationDto, minimalData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
