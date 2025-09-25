import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { MilestoneProgressUpdateDto } from '../milestone-progress-update.dto';

describe('MilestoneProgressUpdateDto', () => {
  const validProgressData = {
    progressNotes:
      'Completed literature review section and identified key research gaps',
    hoursWorked: 6.5,
    progressPercentage: 75,
    challenges:
      'Some papers were difficult to access due to subscription requirements',
    nextSteps:
      'Begin writing methodology section and prepare research proposal draft',
    revisedEstimatedHours: 20,
    qualityAssessment: 4,
  };

  describe('progressNotes validation', () => {
    it('should accept valid progress notes', async () => {
      const data = { progressNotes: validProgressData.progressNotes };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const notesErrors = errors.filter(
        (error) => error.property === 'progressNotes',
      );
      expect(notesErrors).toHaveLength(0);
    });

    it('should reject notes shorter than 10 characters', async () => {
      const invalidData = { progressNotes: 'Short' };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const notesErrors = errors.filter(
        (error) => error.property === 'progressNotes',
      );
      expect(notesErrors).toHaveLength(1);
      expect(notesErrors[0].constraints?.minLength).toContain(
        'Progress notes must be at least 10 characters long',
      );
    });

    it('should reject notes longer than 1000 characters', async () => {
      const longNotes = 'A'.repeat(1001);
      const invalidData = { progressNotes: longNotes };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const notesErrors = errors.filter(
        (error) => error.property === 'progressNotes',
      );
      expect(notesErrors).toHaveLength(1);
      expect(notesErrors[0].constraints?.maxLength).toContain(
        'Progress notes must not exceed 1000 characters',
      );
    });

    it('should trim whitespace from progress notes', async () => {
      const dataWithWhitespace = {
        progressNotes: '  Valid progress notes with sufficient length  ',
      };
      const dto = plainToClass(MilestoneProgressUpdateDto, dataWithWhitespace);
      expect(dto.progressNotes).toBe(
        'Valid progress notes with sufficient length',
      );
    });

    it('should allow undefined progress notes', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, {});
      const errors = await validate(dto);
      const notesErrors = errors.filter(
        (error) => error.property === 'progressNotes',
      );
      expect(notesErrors).toHaveLength(0);
    });
  });

  describe('hoursWorked validation', () => {
    it('should accept valid hours worked', async () => {
      const data = { hoursWorked: 8.5 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'hoursWorked',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should accept zero hours', async () => {
      const data = { hoursWorked: 0 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'hoursWorked',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should reject negative hours', async () => {
      const invalidData = { hoursWorked: -2 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'hoursWorked',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.min).toContain(
        'Hours worked must be at least 0',
      );
    });

    it('should reject hours exceeding 24', async () => {
      const invalidData = { hoursWorked: 25 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'hoursWorked',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.max).toContain(
        'Hours worked must not exceed 24 hours per day',
      );
    });

    it('should allow undefined hours worked', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, {});
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'hoursWorked',
      );
      expect(hoursErrors).toHaveLength(0);
    });
  });

  describe('progressPercentage validation', () => {
    it('should accept valid progress percentage', async () => {
      const data = { progressPercentage: 50 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const percentageErrors = errors.filter(
        (error) => error.property === 'progressPercentage',
      );
      expect(percentageErrors).toHaveLength(0);
    });

    it('should accept 0 percent', async () => {
      const data = { progressPercentage: 0 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const percentageErrors = errors.filter(
        (error) => error.property === 'progressPercentage',
      );
      expect(percentageErrors).toHaveLength(0);
    });

    it('should accept 100 percent', async () => {
      const data = { progressPercentage: 100 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const percentageErrors = errors.filter(
        (error) => error.property === 'progressPercentage',
      );
      expect(percentageErrors).toHaveLength(0);
    });

    it('should reject negative percentage', async () => {
      const invalidData = { progressPercentage: -10 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const percentageErrors = errors.filter(
        (error) => error.property === 'progressPercentage',
      );
      expect(percentageErrors).toHaveLength(1);
      expect(percentageErrors[0].constraints?.min).toContain(
        'Progress percentage must be at least 0',
      );
    });

    it('should reject percentage over 100', async () => {
      const invalidData = { progressPercentage: 150 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const percentageErrors = errors.filter(
        (error) => error.property === 'progressPercentage',
      );
      expect(percentageErrors).toHaveLength(1);
      expect(percentageErrors[0].constraints?.max).toContain(
        'Progress percentage must not exceed 100',
      );
    });

    it('should reject non-integer percentage', async () => {
      const invalidData = { progressPercentage: 75.5 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const percentageErrors = errors.filter(
        (error) => error.property === 'progressPercentage',
      );
      expect(percentageErrors).toHaveLength(1);
      expect(percentageErrors[0].constraints?.isInt).toContain(
        'Progress percentage must be an integer',
      );
    });
  });

  describe('challenges validation', () => {
    it('should accept valid challenges description', async () => {
      const data = { challenges: validProgressData.challenges };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const challengesErrors = errors.filter(
        (error) => error.property === 'challenges',
      );
      expect(challengesErrors).toHaveLength(0);
    });

    it('should reject challenges shorter than 10 characters', async () => {
      const invalidData = { challenges: 'Short' };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const challengesErrors = errors.filter(
        (error) => error.property === 'challenges',
      );
      expect(challengesErrors).toHaveLength(1);
      expect(challengesErrors[0].constraints?.minLength).toContain(
        'Challenges description must be at least 10 characters long',
      );
    });

    it('should reject challenges longer than 500 characters', async () => {
      const longChallenges = 'A'.repeat(501);
      const invalidData = { challenges: longChallenges };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const challengesErrors = errors.filter(
        (error) => error.property === 'challenges',
      );
      expect(challengesErrors).toHaveLength(1);
      expect(challengesErrors[0].constraints?.maxLength).toContain(
        'Challenges description must not exceed 500 characters',
      );
    });

    it('should allow undefined challenges', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, {});
      const errors = await validate(dto);
      const challengesErrors = errors.filter(
        (error) => error.property === 'challenges',
      );
      expect(challengesErrors).toHaveLength(0);
    });
  });

  describe('nextSteps validation', () => {
    it('should accept valid next steps description', async () => {
      const data = { nextSteps: validProgressData.nextSteps };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const nextStepsErrors = errors.filter(
        (error) => error.property === 'nextSteps',
      );
      expect(nextStepsErrors).toHaveLength(0);
    });

    it('should reject next steps shorter than 10 characters', async () => {
      const invalidData = { nextSteps: 'Short' };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const nextStepsErrors = errors.filter(
        (error) => error.property === 'nextSteps',
      );
      expect(nextStepsErrors).toHaveLength(1);
      expect(nextStepsErrors[0].constraints?.minLength).toContain(
        'Next steps description must be at least 10 characters long',
      );
    });

    it('should allow undefined next steps', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, {});
      const errors = await validate(dto);
      const nextStepsErrors = errors.filter(
        (error) => error.property === 'nextSteps',
      );
      expect(nextStepsErrors).toHaveLength(0);
    });
  });

  describe('revisedEstimatedHours validation', () => {
    it('should accept valid revised estimated hours', async () => {
      const data = { revisedEstimatedHours: 30 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'revisedEstimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should accept zero revised hours', async () => {
      const data = { revisedEstimatedHours: 0 };
      const dto = plainToClass(MilestoneProgressUpdateDto, data);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'revisedEstimatedHours',
      );
      expect(hoursErrors).toHaveLength(0);
    });

    it('should reject negative revised hours', async () => {
      const invalidData = { revisedEstimatedHours: -5 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'revisedEstimatedHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.min).toContain(
        'Revised estimated hours must be at least 0',
      );
    });

    it('should reject hours exceeding 1000', async () => {
      const invalidData = { revisedEstimatedHours: 1001 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const hoursErrors = errors.filter(
        (error) => error.property === 'revisedEstimatedHours',
      );
      expect(hoursErrors).toHaveLength(1);
      expect(hoursErrors[0].constraints?.max).toContain(
        'Revised estimated hours must not exceed 1000',
      );
    });
  });

  describe('qualityAssessment validation', () => {
    it('should accept valid quality assessment values', async () => {
      for (let i = 1; i <= 5; i++) {
        const data = { qualityAssessment: i };
        const dto = plainToClass(MilestoneProgressUpdateDto, data);
        const errors = await validate(dto);
        const qualityErrors = errors.filter(
          (error) => error.property === 'qualityAssessment',
        );
        expect(qualityErrors).toHaveLength(0);
      }
    });

    it('should reject quality assessment below 1', async () => {
      const invalidData = { qualityAssessment: 0 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const qualityErrors = errors.filter(
        (error) => error.property === 'qualityAssessment',
      );
      expect(qualityErrors).toHaveLength(1);
      expect(qualityErrors[0].constraints?.min).toContain(
        'Quality assessment must be at least 1',
      );
    });

    it('should reject quality assessment above 5', async () => {
      const invalidData = { qualityAssessment: 6 };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      const qualityErrors = errors.filter(
        (error) => error.property === 'qualityAssessment',
      );
      expect(qualityErrors).toHaveLength(1);
      expect(qualityErrors[0].constraints?.max).toContain(
        'Quality assessment must not exceed 5',
      );
    });

    it('should allow undefined quality assessment', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, {});
      const errors = await validate(dto);
      const qualityErrors = errors.filter(
        (error) => error.property === 'qualityAssessment',
      );
      expect(qualityErrors).toHaveLength(0);
    });
  });

  describe('complete validation scenarios', () => {
    it('should pass validation with empty object', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(MilestoneProgressUpdateDto, validProgressData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial data', async () => {
      const partialData = {
        progressNotes: 'Made good progress on research',
        hoursWorked: 4,
        progressPercentage: 60,
      };
      const dto = plainToClass(MilestoneProgressUpdateDto, partialData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with multiple invalid fields', async () => {
      const invalidData = {
        progressNotes: 'Short', // Too short
        hoursWorked: -5, // Negative
        progressPercentage: 150, // Over 100
        challenges: 'Bad', // Too short
        qualityAssessment: 10, // Over 5
      };
      const dto = plainToClass(MilestoneProgressUpdateDto, invalidData);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      // Should have errors for multiple fields
      const errorProperties = errors.map((error) => error.property);
      expect(errorProperties).toContain('progressNotes');
      expect(errorProperties).toContain('hoursWorked');
      expect(errorProperties).toContain('progressPercentage');
      expect(errorProperties).toContain('challenges');
      expect(errorProperties).toContain('qualityAssessment');
    });
  });
});
