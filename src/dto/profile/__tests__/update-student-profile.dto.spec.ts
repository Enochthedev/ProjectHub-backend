import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UpdateStudentProfileDto } from '../update-student-profile.dto';

describe('UpdateStudentProfileDto', () => {
  const validStudentProfileData = {
    name: 'John Doe',
    skills: ['JavaScript', 'TypeScript', 'React'],
    interests: ['Web Development', 'Machine Learning'],
    preferredSpecializations: [
      'Web Development & Full Stack',
      'Artificial Intelligence & Machine Learning',
    ],
    currentYear: 4,
    gpa: 4.5,
  };

  describe('name validation', () => {
    it('should accept valid name', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { name: 'John Doe' });
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(0);
    });

    it('should reject name shorter than 2 characters', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { name: 'A' });
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].constraints?.minLength).toContain(
        'Name must be at least 2 characters long',
      );
    });

    it('should reject non-string name', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { name: 123 });
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].constraints?.isString).toContain(
        'Name must be a string',
      );
    });

    it('should accept undefined name (optional field)', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {});
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(0);
    });
  });

  describe('skills validation', () => {
    it('should accept valid skills array', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        skills: ['JavaScript', 'Python'],
      });
      const errors = await validate(dto);
      const skillsErrors = errors.filter(
        (error) => error.property === 'skills',
      );
      expect(skillsErrors).toHaveLength(0);
    });

    it('should accept empty skills array', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { skills: [] });
      const errors = await validate(dto);
      const skillsErrors = errors.filter(
        (error) => error.property === 'skills',
      );
      expect(skillsErrors).toHaveLength(0);
    });

    it('should reject non-array skills', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        skills: 'JavaScript',
      });
      const errors = await validate(dto);
      const skillsErrors = errors.filter(
        (error) => error.property === 'skills',
      );
      expect(skillsErrors).toHaveLength(1);
      expect(skillsErrors[0].constraints?.isArray).toContain(
        'Skills must be an array',
      );
    });

    it('should reject non-string elements in skills array', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        skills: ['JavaScript', 123],
      });
      const errors = await validate(dto);
      const skillsErrors = errors.filter(
        (error) => error.property === 'skills',
      );
      expect(skillsErrors).toHaveLength(1);
      expect(skillsErrors[0].constraints?.isString).toContain(
        'Each skill must be a string',
      );
    });
  });

  describe('interests validation', () => {
    it('should accept valid interests array', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        interests: ['AI', 'Web Dev'],
      });
      const errors = await validate(dto);
      const interestsErrors = errors.filter(
        (error) => error.property === 'interests',
      );
      expect(interestsErrors).toHaveLength(0);
    });

    it('should reject non-string elements in interests array', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        interests: ['AI', 123],
      });
      const errors = await validate(dto);
      const interestsErrors = errors.filter(
        (error) => error.property === 'interests',
      );
      expect(interestsErrors).toHaveLength(1);
      expect(interestsErrors[0].constraints?.isString).toContain(
        'Each interest must be a string',
      );
    });
  });

  describe('preferredSpecializations validation', () => {
    it('should accept valid specializations', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Artificial Intelligence & Machine Learning',
        ],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'preferredSpecializations',
      );
      expect(specializationErrors).toHaveLength(0);
    });

    it('should reject invalid specializations', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        preferredSpecializations: ['Invalid Specialization'],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'preferredSpecializations',
      );
      expect(specializationErrors).toHaveLength(1);
      expect(specializationErrors[0].constraints?.isIn).toContain(
        'Each specialization must be one of:',
      );
    });

    it('should accept empty specializations array', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {
        preferredSpecializations: [],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'preferredSpecializations',
      );
      expect(specializationErrors).toHaveLength(0);
    });
  });

  describe('currentYear validation', () => {
    it('should accept valid current year', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { currentYear: 4 });
      const errors = await validate(dto);
      const yearErrors = errors.filter(
        (error) => error.property === 'currentYear',
      );
      expect(yearErrors).toHaveLength(0);
    });

    it('should reject current year less than 1', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { currentYear: 0 });
      const errors = await validate(dto);
      const yearErrors = errors.filter(
        (error) => error.property === 'currentYear',
      );
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].constraints?.min).toContain(
        'Current year must be at least 1',
      );
    });

    it('should reject current year greater than 6', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { currentYear: 7 });
      const errors = await validate(dto);
      const yearErrors = errors.filter(
        (error) => error.property === 'currentYear',
      );
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].constraints?.max).toContain(
        'Current year must be at most 6',
      );
    });

    it('should reject non-number current year', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { currentYear: '4' });
      const errors = await validate(dto);
      const yearErrors = errors.filter(
        (error) => error.property === 'currentYear',
      );
      expect(yearErrors).toHaveLength(1);
      expect(yearErrors[0].constraints?.isNumber).toContain(
        'Current year must be a number',
      );
    });
  });

  describe('gpa validation', () => {
    it('should accept valid GPA', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { gpa: 4.5 });
      const errors = await validate(dto);
      const gpaErrors = errors.filter((error) => error.property === 'gpa');
      expect(gpaErrors).toHaveLength(0);
    });

    it('should reject GPA less than 0.0', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { gpa: -1.0 });
      const errors = await validate(dto);
      const gpaErrors = errors.filter((error) => error.property === 'gpa');
      expect(gpaErrors).toHaveLength(1);
      expect(gpaErrors[0].constraints?.min).toContain(
        'GPA must be at least 0.0',
      );
    });

    it('should reject GPA greater than 5.0', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { gpa: 6.0 });
      const errors = await validate(dto);
      const gpaErrors = errors.filter((error) => error.property === 'gpa');
      expect(gpaErrors).toHaveLength(1);
      expect(gpaErrors[0].constraints?.max).toContain(
        'GPA must be at most 5.0',
      );
    });

    it('should reject non-number GPA', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, { gpa: '4.5' });
      const errors = await validate(dto);
      const gpaErrors = errors.filter((error) => error.property === 'gpa');
      expect(gpaErrors).toHaveLength(1);
      expect(gpaErrors[0].constraints?.isNumber).toContain(
        'GPA must be a number',
      );
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(
        UpdateStudentProfileDto,
        validStudentProfileData,
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object (all fields optional)', async () => {
      const dto = plainToClass(UpdateStudentProfileDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial data', async () => {
      const partialData = {
        name: 'John Doe',
        skills: ['JavaScript'],
      };
      const dto = plainToClass(UpdateStudentProfileDto, partialData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
