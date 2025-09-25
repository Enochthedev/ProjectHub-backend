import { validate } from 'class-validator';
import { RegisterDto } from '../register.dto';
import { UserRole } from '../../../common/enums/user-role.enum';

describe('RegisterDto', () => {
  let dto: RegisterDto;

  beforeEach(() => {
    dto = new RegisterDto();
  });

  describe('valid data', () => {
    it('should pass validation for valid student registration', async () => {
      dto.email = 'student@ui.edu.ng';
      dto.password = 'SecurePass123!';
      dto.role = UserRole.STUDENT;
      dto.name = 'John Doe';
      dto.skills = ['JavaScript', 'Python'];
      dto.interests = ['Web Development', 'AI'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for valid supervisor registration', async () => {
      dto.email = 'supervisor@ui.edu.ng';
      dto.password = 'SecurePass123!';
      dto.role = UserRole.SUPERVISOR;
      dto.name = 'Dr. Jane Smith';
      dto.specializations = ['Artificial Intelligence & Machine Learning'];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation for minimal student data', async () => {
      dto.email = 'student@ui.edu.ng';
      dto.password = 'SecurePass123!';
      dto.role = UserRole.STUDENT;
      dto.name = 'John Doe';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('email validation', () => {
    beforeEach(() => {
      dto.password = 'SecurePass123!';
      dto.role = UserRole.STUDENT;
      dto.name = 'John Doe';
    });

    it('should fail for invalid email format', async () => {
      dto.email = 'invalid-email';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should fail for non-university email', async () => {
      dto.email = 'student@gmail.com';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('email');
    });

    it('should pass for valid university email', async () => {
      dto.email = 'student@ui.edu.ng';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'email')).toHaveLength(0);
    });
  });

  describe('password validation', () => {
    beforeEach(() => {
      dto.email = 'student@ui.edu.ng';
      dto.role = UserRole.STUDENT;
      dto.name = 'John Doe';
    });

    it('should fail for weak password', async () => {
      dto.password = 'weak';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail for password without uppercase', async () => {
      dto.password = 'lowercase123!';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should fail for password without special characters', async () => {
      dto.password = 'NoSpecialChars123';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('password');
    });

    it('should pass for strong password', async () => {
      dto.password = 'SecurePass123!';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'password')).toHaveLength(0);
    });
  });

  describe('role-specific validation', () => {
    beforeEach(() => {
      dto.email = 'user@ui.edu.ng';
      dto.password = 'SecurePass123!';
      dto.name = 'Test User';
    });

    it('should require specializations for supervisor role', async () => {
      dto.role = UserRole.SUPERVISOR;
      // No specializations provided

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'specializations')).toBe(true);
    });

    it('should not require specializations for student role', async () => {
      dto.role = UserRole.STUDENT;
      // No specializations provided

      const errors = await validate(dto);
      expect(
        errors.filter((e) => e.property === 'specializations'),
      ).toHaveLength(0);
    });

    it('should validate specializations when provided for supervisor', async () => {
      dto.role = UserRole.SUPERVISOR;
      dto.specializations = ['Invalid Specialization'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'specializations')).toBe(true);
    });

    it('should accept valid specializations for supervisor', async () => {
      dto.role = UserRole.SUPERVISOR;
      dto.specializations = ['Artificial Intelligence & Machine Learning'];

      const errors = await validate(dto);
      expect(
        errors.filter((e) => e.property === 'specializations'),
      ).toHaveLength(0);
    });
  });

  describe('name validation', () => {
    beforeEach(() => {
      dto.email = 'student@ui.edu.ng';
      dto.password = 'SecurePass123!';
      dto.role = UserRole.STUDENT;
    });

    it('should fail for empty name', async () => {
      dto.name = '';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should fail for too short name', async () => {
      dto.name = 'A';
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('name');
    });

    it('should pass for valid name', async () => {
      dto.name = 'John Doe';
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'name')).toHaveLength(0);
    });
  });

  describe('optional fields for students', () => {
    beforeEach(() => {
      dto.email = 'student@ui.edu.ng';
      dto.password = 'SecurePass123!';
      dto.role = UserRole.STUDENT;
      dto.name = 'John Doe';
    });

    it('should accept valid skills array', async () => {
      dto.skills = ['JavaScript', 'Python', 'React'];
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'skills')).toHaveLength(0);
    });

    it('should accept valid interests array', async () => {
      dto.interests = ['Web Development', 'Machine Learning'];
      const errors = await validate(dto);
      expect(errors.filter((e) => e.property === 'interests')).toHaveLength(0);
    });

    it('should fail for non-array skills', async () => {
      dto.skills = 'not an array' as any;
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'skills')).toBe(true);
    });

    it('should fail for non-string items in skills', async () => {
      dto.skills = ['JavaScript', 123 as any, 'Python'];
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'skills')).toBe(true);
    });
  });
});
