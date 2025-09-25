import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ForgotPasswordDto } from '../forgot-password.dto';

describe('ForgotPasswordDto', () => {
  const validForgotPasswordData = {
    email: 'student@ui.edu.ng',
  };

  describe('email validation', () => {
    it('should accept valid university email', async () => {
      const dto = plainToClass(ForgotPasswordDto, validForgotPasswordData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject non-university email domain', async () => {
      const invalidData = { email: 'student@gmail.com' };
      const dto = plainToClass(ForgotPasswordDto, invalidData);
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.matches).toContain(
        'Must use University of Ibadan email',
      );
    });

    it('should reject invalid email format', async () => {
      const invalidData = { email: 'invalid-email' };
      const dto = plainToClass(ForgotPasswordDto, invalidData);
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.isEmail).toContain(
        'Please provide a valid email address',
      );
    });

    it('should reject empty email', async () => {
      const invalidData = { email: '' };
      const dto = plainToClass(ForgotPasswordDto, invalidData);
      const errors = await validate(dto);
      const emailErrors = errors.filter((error) => error.property === 'email');
      expect(emailErrors).toHaveLength(1);
      expect(emailErrors[0].constraints?.isEmail).toContain(
        'Please provide a valid email address',
      );
    });
  });
});
