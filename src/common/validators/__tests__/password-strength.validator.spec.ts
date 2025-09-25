import { validate } from 'class-validator';
import { IsStrongPassword } from '../password-strength.validator';

class TestDto {
  @IsStrongPassword({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    allowedSpecialChars: '@$!%*?&',
  })
  password: string;
}

class CustomTestDto {
  @IsStrongPassword({
    minLength: 6,
    requireUppercase: false,
    requireSpecialChars: false,
  })
  password: string;
}

describe('IsStrongPassword Validator', () => {
  let testDto: TestDto;

  beforeEach(() => {
    testDto = new TestDto();
  });

  describe('valid passwords', () => {
    it('should pass for strong password with all requirements', async () => {
      testDto.password = 'SecurePass123!';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass for password with different special characters', async () => {
      testDto.password = 'MyPassword1@';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass for longer password', async () => {
      testDto.password = 'VeryLongSecurePassword123$';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid passwords', () => {
    it('should fail for password too short', async () => {
      testDto.password = 'Short1!';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain(
        'at least 8 characters',
      );
    });

    it('should fail for password without uppercase', async () => {
      testDto.password = 'lowercase123!';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain(
        'one uppercase letter',
      );
    });

    it('should fail for password without lowercase', async () => {
      testDto.password = 'UPPERCASE123!';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain(
        'one lowercase letter',
      );
    });

    it('should fail for password without numbers', async () => {
      testDto.password = 'NoNumbers!';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain('one number');
    });

    it('should fail for password without special characters', async () => {
      testDto.password = 'NoSpecialChars123';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain(
        'one special character',
      );
    });

    it('should fail for empty password', async () => {
      testDto.password = '';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });

    it('should fail for null password', async () => {
      testDto.password = null as any;
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });
  });

  describe('custom options', () => {
    let customDto: CustomTestDto;

    beforeEach(() => {
      customDto = new CustomTestDto();
    });

    it('should pass for password meeting custom requirements', async () => {
      customDto.password = 'simple123';
      const errors = await validate(customDto);
      expect(errors).toHaveLength(0);
    });

    it('should fail for password too short with custom length', async () => {
      customDto.password = 'short';
      const errors = await validate(customDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isStrongPassword).toContain(
        'at least 6 characters',
      );
    });
  });
});
