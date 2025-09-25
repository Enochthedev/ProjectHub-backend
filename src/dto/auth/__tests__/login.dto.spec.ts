import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { LoginDto } from '../login.dto';

describe('LoginDto', () => {
  const validLoginData = {
    email: 'student@ui.edu.ng',
    password: 'Password123!',
  };

  describe('email validation', () => {
    it('should accept valid email', async () => {
      const dto = plainToClass(LoginDto, validLoginData);
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(0);
    });

    it('should reject invalid email format', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email' };
      const dto = plainToClass(LoginDto, invalidData);
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.isEmail).toContain(
        'Please provide a valid email address',
      );
    });

    it('should reject empty email', async () => {
      const invalidData = { ...validLoginData, email: '' };
      const dto = plainToClass(LoginDto, invalidData);
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.isEmail).toContain(
        'Please provide a valid email address',
      );
    });
  });

  describe('password validation', () => {
    it('should accept valid password', async () => {
      const dto = plainToClass(LoginDto, validLoginData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );
      expect(passwordErrors).toHaveLength(0);
    });

    it('should reject empty password', async () => {
      const invalidData = { ...validLoginData, password: '' };
      const dto = plainToClass(LoginDto, invalidData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );
      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.minLength).toContain(
        'Password is required',
      );
    });

    it('should reject non-string password', async () => {
      const invalidData = { ...validLoginData, password: 123 };
      const dto = plainToClass(LoginDto, invalidData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );
      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.isString).toContain(
        'Password must be a string',
      );
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(LoginDto, validLoginData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing fields', async () => {
      const dto = plainToClass(LoginDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const emailErrors = errors.filter((error) => error.property === 'email');
      const passwordErrors = errors.filter(
        (error) => error.property === 'password',
      );

      expect(emailErrors).toHaveLength(1);
      expect(passwordErrors).toHaveLength(1);
    });
  });
});
