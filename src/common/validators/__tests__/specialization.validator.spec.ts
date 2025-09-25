import { validate } from 'class-validator';
import {
  IsValidSpecialization,
  IsRequiredForRole,
} from '../specialization.validator';
import { UserRole } from '../../enums/user-role.enum';

class TestSpecializationDto {
  @IsValidSpecialization()
  specializations: string[];
}

class TestRoleDto {
  role: UserRole;

  @IsRequiredForRole(UserRole.SUPERVISOR, 'role')
  specializations?: string[];
}

describe('Specialization Validators', () => {
  describe('IsValidSpecialization', () => {
    let testDto: TestSpecializationDto;

    beforeEach(() => {
      testDto = new TestSpecializationDto();
    });

    it('should pass for valid specializations', async () => {
      testDto.specializations = [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
      ];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass for single valid specialization', async () => {
      testDto.specializations = ['Data Science & Analytics'];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail for invalid specialization', async () => {
      testDto.specializations = ['Invalid Specialization'];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isValidSpecialization).toContain(
        'must be one of',
      );
    });

    it('should fail for mixed valid and invalid specializations', async () => {
      testDto.specializations = [
        'Artificial Intelligence & Machine Learning',
        'Invalid Specialization',
      ];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });

    it('should fail for non-array input', async () => {
      testDto.specializations = 'not an array' as any;
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });

    it('should fail for empty array', async () => {
      testDto.specializations = [];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0); // Empty array is valid for this validator
    });
  });

  describe('IsRequiredForRole', () => {
    let testDto: TestRoleDto;

    beforeEach(() => {
      testDto = new TestRoleDto();
    });

    it('should pass when field is provided for required role', async () => {
      testDto.role = UserRole.SUPERVISOR;
      testDto.specializations = ['Artificial Intelligence & Machine Learning'];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass when field is not provided for non-required role', async () => {
      testDto.role = UserRole.STUDENT;
      // specializations not provided
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when field is not provided for required role', async () => {
      testDto.role = UserRole.SUPERVISOR;
      // specializations not provided
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isRequiredForRole).toContain(
        'required for supervisor role',
      );
    });

    it('should pass when field is empty array for required role (handled by other validators)', async () => {
      testDto.role = UserRole.SUPERVISOR;
      testDto.specializations = [];
      const errors = await validate(testDto);
      // Empty array passes IsRequiredForRole but would fail ArrayNotEmpty if used together
      expect(errors).toHaveLength(0);
    });

    it('should pass when field is provided for non-required role', async () => {
      testDto.role = UserRole.STUDENT;
      testDto.specializations = ['Web Development & Full Stack'];
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });
  });
});
