import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UpdateSupervisorProfileDto } from '../update-supervisor-profile.dto';

describe('UpdateSupervisorProfileDto', () => {
  const validSupervisorProfileData = {
    name: 'Dr. Jane Smith',
    specializations: [
      'Web Development & Full Stack',
      'Software Engineering & Architecture',
    ],
    maxStudents: 8,
    isAvailable: true,
    officeLocation: 'Room 201, Computer Science Building',
    phoneNumber: '+234-801-234-5678',
  };

  describe('name validation', () => {
    it('should accept valid name', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        name: 'Dr. Jane Smith',
      });
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(0);
    });

    it('should reject name shorter than 2 characters', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, { name: 'A' });
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(1);
      expect(nameErrors[0].constraints?.minLength).toContain(
        'Name must be at least 2 characters long',
      );
    });

    it('should accept undefined name (optional field)', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {});
      const errors = await validate(dto);
      const nameErrors = errors.filter((error) => error.property === 'name');
      expect(nameErrors).toHaveLength(0);
    });
  });

  describe('specializations validation', () => {
    it('should accept valid specializations', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        specializations: [
          'Web Development & Full Stack',
          'Artificial Intelligence & Machine Learning',
        ],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'specializations',
      );
      expect(specializationErrors).toHaveLength(0);
    });

    it('should reject empty specializations array', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        specializations: [],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'specializations',
      );
      expect(specializationErrors).toHaveLength(1);
      expect(specializationErrors[0].constraints?.arrayNotEmpty).toContain(
        'Must have at least one specialization',
      );
    });

    it('should reject invalid specializations', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        specializations: ['Invalid Specialization'],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'specializations',
      );
      expect(specializationErrors).toHaveLength(1);
      expect(specializationErrors[0].constraints?.isIn).toContain(
        'Each specialization must be one of:',
      );
    });

    it('should reject non-array specializations', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        specializations: 'Web Development',
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'specializations',
      );
      expect(specializationErrors).toHaveLength(1);
      expect(specializationErrors[0].constraints?.isArray).toContain(
        'Specializations must be an array',
      );
    });

    it('should reject non-string elements in specializations array', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        specializations: ['Web Development & Full Stack', 123],
      });
      const errors = await validate(dto);
      const specializationErrors = errors.filter(
        (error) => error.property === 'specializations',
      );
      expect(specializationErrors).toHaveLength(1);
      expect(specializationErrors[0].constraints?.isString).toContain(
        'Each specialization must be a string',
      );
    });
  });

  describe('maxStudents validation', () => {
    it('should accept valid max students', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, { maxStudents: 10 });
      const errors = await validate(dto);
      const maxStudentsErrors = errors.filter(
        (error) => error.property === 'maxStudents',
      );
      expect(maxStudentsErrors).toHaveLength(0);
    });

    it('should reject max students less than 1', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, { maxStudents: 0 });
      const errors = await validate(dto);
      const maxStudentsErrors = errors.filter(
        (error) => error.property === 'maxStudents',
      );
      expect(maxStudentsErrors).toHaveLength(1);
      expect(maxStudentsErrors[0].constraints?.min).toContain(
        'Maximum students must be at least 1',
      );
    });

    it('should reject max students greater than 20', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, { maxStudents: 25 });
      const errors = await validate(dto);
      const maxStudentsErrors = errors.filter(
        (error) => error.property === 'maxStudents',
      );
      expect(maxStudentsErrors).toHaveLength(1);
      expect(maxStudentsErrors[0].constraints?.max).toContain(
        'Maximum students must be at most 20',
      );
    });

    it('should reject non-number max students', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        maxStudents: '10',
      });
      const errors = await validate(dto);
      const maxStudentsErrors = errors.filter(
        (error) => error.property === 'maxStudents',
      );
      expect(maxStudentsErrors).toHaveLength(1);
      expect(maxStudentsErrors[0].constraints?.isNumber).toContain(
        'Maximum students must be a number',
      );
    });
  });

  describe('isAvailable validation', () => {
    it('should accept valid boolean availability', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        isAvailable: true,
      });
      const errors = await validate(dto);
      const availabilityErrors = errors.filter(
        (error) => error.property === 'isAvailable',
      );
      expect(availabilityErrors).toHaveLength(0);
    });

    it('should accept false availability', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        isAvailable: false,
      });
      const errors = await validate(dto);
      const availabilityErrors = errors.filter(
        (error) => error.property === 'isAvailable',
      );
      expect(availabilityErrors).toHaveLength(0);
    });

    it('should reject non-boolean availability', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        isAvailable: 'true',
      });
      const errors = await validate(dto);
      const availabilityErrors = errors.filter(
        (error) => error.property === 'isAvailable',
      );
      expect(availabilityErrors).toHaveLength(1);
      expect(availabilityErrors[0].constraints?.isBoolean).toContain(
        'Availability status must be a boolean',
      );
    });
  });

  describe('officeLocation validation', () => {
    it('should accept valid office location', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        officeLocation: 'Room 201',
      });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'officeLocation',
      );
      expect(locationErrors).toHaveLength(0);
    });

    it('should reject office location shorter than 2 characters', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        officeLocation: 'A',
      });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'officeLocation',
      );
      expect(locationErrors).toHaveLength(1);
      expect(locationErrors[0].constraints?.minLength).toContain(
        'Office location must be at least 2 characters long',
      );
    });

    it('should reject non-string office location', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        officeLocation: 123,
      });
      const errors = await validate(dto);
      const locationErrors = errors.filter(
        (error) => error.property === 'officeLocation',
      );
      expect(locationErrors).toHaveLength(1);
      expect(locationErrors[0].constraints?.isString).toContain(
        'Office location must be a string',
      );
    });
  });

  describe('phoneNumber validation', () => {
    it('should accept valid phone number', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        phoneNumber: '+234-801-234-5678',
      });
      const errors = await validate(dto);
      const phoneErrors = errors.filter(
        (error) => error.property === 'phoneNumber',
      );
      expect(phoneErrors).toHaveLength(0);
    });

    it('should reject phone number shorter than 10 characters', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        phoneNumber: '123456789',
      });
      const errors = await validate(dto);
      const phoneErrors = errors.filter(
        (error) => error.property === 'phoneNumber',
      );
      expect(phoneErrors).toHaveLength(1);
      expect(phoneErrors[0].constraints?.minLength).toContain(
        'Phone number must be at least 10 characters long',
      );
    });

    it('should reject non-string phone number', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {
        phoneNumber: 1234567890,
      });
      const errors = await validate(dto);
      const phoneErrors = errors.filter(
        (error) => error.property === 'phoneNumber',
      );
      expect(phoneErrors).toHaveLength(1);
      expect(phoneErrors[0].constraints?.isString).toContain(
        'Phone number must be a string',
      );
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(
        UpdateSupervisorProfileDto,
        validSupervisorProfileData,
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object (all fields optional)', async () => {
      const dto = plainToClass(UpdateSupervisorProfileDto, {});
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial data', async () => {
      const partialData = {
        name: 'Dr. Jane Smith',
        maxStudents: 5,
      };
      const dto = plainToClass(UpdateSupervisorProfileDto, partialData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
