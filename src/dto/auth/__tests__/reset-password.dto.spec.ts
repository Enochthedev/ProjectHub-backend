import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ResetPasswordDto } from '../reset-password.dto';

describe('ResetPasswordDto', () => {
  const validResetPasswordData = {
    token: 'valid-reset-token-123',
    newPassword: 'NewPassword123!',
  };

  describe('token validation', () => {
    it('should accept valid token', async () => {
      const dto = plainToClass(ResetPasswordDto, validResetPasswordData);
      const errors = await validate(dto);
      const tokenErrors = errors.filter((error) => error.property === 'token');
      expect(tokenErrors).toHaveLength(0);
    });

    it('should reject empty token', async () => {
      const invalidData = { ...validResetPasswordData, token: '' };
      const dto = plainToClass(ResetPasswordDto, invalidData);
      const errors = await validate(dto);
      const tokenErrors = errors.filter((error) => error.property === 'token');
      expect(tokenErrors).toHaveLength(1);
      expect(tokenErrors[0].constraints?.isNotEmpty).toContain(
        'Reset token is required',
      );
    });

    it('should reject non-string token', async () => {
      const invalidData = { ...validResetPasswordData, token: 123 };
      const dto = plainToClass(ResetPasswordDto, invalidData);
      const errors = await validate(dto);
      const tokenErrors = errors.filter((error) => error.property === 'token');
      expect(tokenErrors).toHaveLength(1);
      expect(tokenErrors[0].constraints?.isString).toContain(
        'Reset token must be a string',
      );
    });
  });

  describe('newPassword validation', () => {
    it('should accept valid password with all requirements', async () => {
      const dto = plainToClass(ResetPasswordDto, validResetPasswordData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(passwordErrors).toHaveLength(0);
    });

    it('should reject password shorter than 8 characters', async () => {
      const invalidData = { ...validResetPasswordData, newPassword: 'Pass1!' };
      const dto = plainToClass(ResetPasswordDto, invalidData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.minLength).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should reject password without uppercase letter', async () => {
      const invalidData = {
        ...validResetPasswordData,
        newPassword: 'password123!',
      };
      const dto = plainToClass(ResetPasswordDto, invalidData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.matches).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should reject password without special character', async () => {
      const invalidData = {
        ...validResetPasswordData,
        newPassword: 'Password123',
      };
      const dto = plainToClass(ResetPasswordDto, invalidData);
      const errors = await validate(dto);
      const passwordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(passwordErrors).toHaveLength(1);
      expect(passwordErrors[0].constraints?.matches).toContain(
        'Password must contain at least one uppercase letter',
      );
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(ResetPasswordDto, validResetPasswordData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing fields', async () => {
      const dto = plainToClass(ResetPasswordDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const tokenErrors = errors.filter((error) => error.property === 'token');
      const passwordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );

      expect(tokenErrors).toHaveLength(1);
      expect(passwordErrors).toHaveLength(1);
    });
  });
});
