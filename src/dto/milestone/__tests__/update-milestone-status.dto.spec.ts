import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UpdateMilestoneStatusDto } from '../update-milestone-status.dto';
import { MilestoneStatus } from '../../../common/enums/milestone-status.enum';

describe('UpdateMilestoneStatusDto', () => {
  const validStatusUpdateData = {
    status: MilestoneStatus.IN_PROGRESS,
    notes: 'Started working on the literature review section',
    actualHours: 5,
  };

  describe('status validation', () => {
    it('should accept valid milestone status', async () => {
      for (const status of Object.values(MilestoneStatus)) {
        const data = { ...validStatusUpdateData, status };
        const dto = plainToClass(UpdateMilestoneStatusDto, data);
        const errors = await validate(dto);
        const statusErrors = errors.filter(
          (error) => error.property === 'status',
        );
        expect(statusErrors).toHaveLength(0);
      }
    });

    it('should reject invalid status value', async () => {
      const invalidData = {
        ...validStatusUpdateData,
        status: 'invalid_status' as any,
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const statusErrors = errors.filter(
        (error) => error.property === 'status',
      );
      expect(statusErrors).toHaveLength(1);
      expect(statusErrors[0].constraints?.isEnum).toContain(
        'Status must be one of:',
      );
    });

    it('should require status field', async () => {
      const invalidData = { notes: 'Some notes' };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const statusErrors = errors.filter(
        (error) => error.property === 'status',
      );
      expect(statusErrors).toHaveLength(1);
    });
  });

  describe('notes validation', () => {
    it('should accept valid notes', async () => {
      const data = { ...validStatusUpdateData, notes: 'Valid progress notes' };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(0);
    });

    it('should reject notes longer than 500 characters', async () => {
      const longNotes = 'A'.repeat(501);
      const invalidData = { ...validStatusUpdateData, notes: longNotes };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(1);
      expect(notesErrors[0].constraints?.maxLength).toContain(
        'Notes must not exceed 500 characters',
      );
    });

    it('should reject non-string notes', async () => {
      const invalidData = { ...validStatusUpdateData, notes: 123 as any };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(1);
      expect(notesErrors[0].constraints?.isString).toContain(
        'Notes must be a string',
      );
    });

    it('should allow undefined notes', async () => {
      const data = { status: MilestoneStatus.IN_PROGRESS };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const notesErrors = errors.filter((error) => error.property === 'notes');
      expect(notesErrors).toHaveLength(0);
    });
  });

  describe('actualHours validation', () => {
    it('should accept valid actual hours', async () => {
      const data = { ...validStatusUpdateData, actualHours: 10 };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'actualHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should accept zero hours', async () => {
      const data = { ...validStatusUpdateData, actualHours: 0 };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'actualHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should reject negative hours', async () => {
      const invalidData = { ...validStatusUpdateData, actualHours: -5 };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'actualHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.min).toContain(
        'Actual hours must be at least 0',
      );
    });

    it('should reject non-integer values', async () => {
      const invalidData = { ...validStatusUpdateData, actualHours: 5.5 };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'actualHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.isInt).toContain(
        'Actual hours must be an integer',
      );
    });

    it('should allow undefined actualHours', async () => {
      const data = { status: MilestoneStatus.IN_PROGRESS };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'actualHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });
  });

  describe('blockingReason validation', () => {
    it('should require blocking reason when status is BLOCKED', async () => {
      const invalidData = {
        status: MilestoneStatus.BLOCKED,
        notes: 'Some notes',
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(1);
    });

    it('should accept valid blocking reason when status is BLOCKED', async () => {
      const data = {
        status: MilestoneStatus.BLOCKED,
        blockingReason:
          'Waiting for supervisor feedback on research direction and methodology',
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(0);
    });

    it('should reject blocking reason shorter than 10 characters when status is BLOCKED', async () => {
      const invalidData = {
        status: MilestoneStatus.BLOCKED,
        blockingReason: 'Short',
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(1);
      expect(blockingErrors[0].constraints?.minLength).toContain(
        'Blocking reason must be at least 10 characters long',
      );
    });

    it('should reject blocking reason longer than 500 characters when status is BLOCKED', async () => {
      const longReason = 'A'.repeat(501);
      const invalidData = {
        status: MilestoneStatus.BLOCKED,
        blockingReason: longReason,
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(1);
      expect(blockingErrors[0].constraints?.maxLength).toContain(
        'Blocking reason must not exceed 500 characters',
      );
    });

    it('should not require blocking reason when status is not BLOCKED', async () => {
      const data = {
        status: MilestoneStatus.IN_PROGRESS,
        notes: 'Making good progress',
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(0);
    });

    it('should allow blocking reason when status is not BLOCKED (optional)', async () => {
      const data = {
        status: MilestoneStatus.IN_PROGRESS,
        blockingReason: 'Previously blocked but now resolved',
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(0);
    });
  });

  describe('complete validation scenarios', () => {
    it('should pass validation with minimal required fields', async () => {
      const data = { status: MilestoneStatus.IN_PROGRESS };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all valid fields', async () => {
      const data = {
        status: MilestoneStatus.COMPLETED,
        notes: 'Successfully completed all literature review tasks',
        actualHours: 45,
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for BLOCKED status with blocking reason', async () => {
      const data = {
        status: MilestoneStatus.BLOCKED,
        notes: 'Unable to proceed with current approach',
        blockingReason:
          'Waiting for supervisor approval on methodology changes and access to required datasets',
        actualHours: 20,
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, data);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with multiple invalid fields', async () => {
      const invalidData = {
        status: 'invalid_status',
        notes: 'A'.repeat(501), // Too long
        actualHours: -5, // Negative
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Should have errors for multiple fields
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('status');
      expect(errorProperties).toContain('notes');
      expect(errorProperties).toContain('actualHours');
    });

    it('should fail validation for BLOCKED status without blocking reason', async () => {
      const invalidData = {
        status: MilestoneStatus.BLOCKED,
        notes: 'Cannot proceed',
        actualHours: 10,
      };
      const dto = plainToClass(UpdateMilestoneStatusDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const blockingErrors = errors.filter(
        (error) => error.property === 'blockingReason',
      );
      expect(blockingErrors).toHaveLength(1);
    });
  });
});
