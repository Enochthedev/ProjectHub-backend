import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ChangePasswordDto } from '../change-password.dto';

describe('ChangePasswordDto', () => {
  const validChangePasswordData = {
    currentPassword: 'OldPassword123!',
    newPassword: 'NewPassword123!',
  };

  describe('currentPassword validation', () => {
    it('should accept valid current password', async () => {
      const dto = plainToClass(ChangePasswordDto, validChangePasswordData);
      const errors = await validate(dto);
      const currentPasswordErrors = errors.filter(
        (error) => error.property === 'currentPassword',
      );
      expect(currentPasswordErrors).toHaveLength(0);
    });

    it('should reject empty current password', async () => {
      const invalidData = { ...validChangePasswordData, currentPassword: '' };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const currentPasswordErrors = errors.filter(
        (error) => error.property === 'currentPassword',
      );
      expect(currentPasswordErrors).toHaveLength(1);
      expect(currentPasswordErrors[0].constraints?.minLength).toContain(
        'Current password is required',
      );
    });

    it('should reject non-string current password', async () => {
      const invalidData = { ...validChangePasswordData, currentPassword: 123 };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const currentPasswordErrors = errors.filter(
        (error) => error.property === 'currentPassword',
      );
      expect(currentPasswordErrors).toHaveLength(1);
      expect(currentPasswordErrors[0].constraints?.isString).toContain(
        'Current password must be a string',
      );
    });
  });

  describe('newPassword validation', () => {
    it('should accept valid new password with all requirements', async () => {
      const dto = plainToClass(ChangePasswordDto, validChangePasswordData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(0);
    });

    it('should reject new password shorter than 8 characters', async () => {
      const invalidData = { ...validChangePasswordData, newPassword: 'Pass1!' };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors[0].constraints?.minLength).toContain(
        'New password must be at least 8 characters long',
      );
    });

    it('should reject new password without uppercase letter', async () => {
      const invalidData = {
        ...validChangePasswordData,
        newPassword: 'password123!',
      };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors[0].constraints?.matches).toContain(
        'New password must contain at least one uppercase letter',
      );
    });

    it('should reject new password without lowercase letter', async () => {
      const invalidData = {
        ...validChangePasswordData,
        newPassword: 'PASSWORD123!',
      };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors[0].constraints?.matches).toContain(
        'New password must contain at least one uppercase letter',
      );
    });

    it('should reject new password without number', async () => {
      const invalidData = {
        ...validChangePasswordData,
        newPassword: 'Password!',
      };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors[0].constraints?.matches).toContain(
        'New password must contain at least one uppercase letter',
      );
    });

    it('should reject new password without special character', async () => {
      const invalidData = {
        ...validChangePasswordData,
        newPassword: 'Password123',
      };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors[0].constraints?.matches).toContain(
        'New password must contain at least one uppercase letter',
      );
    });

    it('should reject non-string new password', async () => {
      const invalidData = { ...validChangePasswordData, newPassword: 123 };
      const dto = plainToClass(ChangePasswordDto, invalidData);
      const errors = await validate(dto);
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );
      expect(newPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors[0].constraints?.isString).toContain(
        'New password must be a string',
      );
    });
  });

  describe('complete validation', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(ChangePasswordDto, validChangePasswordData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing fields', async () => {
      const dto = plainToClass(ChangePasswordDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);

      const currentPasswordErrors = errors.filter(
        (error) => error.property === 'currentPassword',
      );
      const newPasswordErrors = errors.filter(
        (error) => error.property === 'newPassword',
      );

      expect(currentPasswordErrors).toHaveLength(1);
      expect(newPasswordErrors).toHaveLength(1);
    });

    it('should allow same password for current and new (business logic will handle this)', async () => {
      const samePasswordData = {
        currentPassword: 'Password123!',
        newPassword: 'Password123!',
      };
      const dto = plainToClass(ChangePasswordDto, samePasswordData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
