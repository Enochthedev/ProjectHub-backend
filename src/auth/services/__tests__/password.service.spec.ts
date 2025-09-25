import { Test, TestingModule } from '@nestjs/testing';
import { PasswordService } from '../password.service';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordService],
    }).compile();

    service = module.get<PasswordService>(PasswordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password with 12 salt rounds', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = 'hashedPassword';

      mockedBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const result = await service.hashPassword(password);

      expect(result).toBe(hashedPassword);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 12);
    });
  });

  describe('comparePasswords', () => {
    it('should return true for matching passwords', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = 'hashedPassword';

      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.comparePasswords(
        plainPassword,
        hashedPassword,
      );

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
    });

    it('should return false for non-matching passwords', async () => {
      const plainPassword = 'TestPassword123!';
      const hashedPassword = 'hashedPassword';

      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.comparePasswords(
        plainPassword,
        hashedPassword,
      );

      expect(result).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        plainPassword,
        hashedPassword,
      );
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const strongPassword = 'StrongPass123!';
      const result = service.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      const result = service.validatePasswordStrength(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
    });

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = service.validatePasswordStrength(longPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must not exceed 128 characters',
      );
    });

    it('should reject password without uppercase letter', () => {
      const password = 'lowercase123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
    });

    it('should reject password without lowercase letter', () => {
      const password = 'UPPERCASE123!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter',
      );
    });

    it('should reject password without number', () => {
      const password = 'NoNumbers!';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
    });

    it('should reject password without special character', () => {
      const password = 'NoSpecialChar123';
      const result = service.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character (@$!%*?&)',
      );
    });

    it('should reject password with common patterns', () => {
      const passwords = [
        'Password123!', // Contains "password"
        'AdminUser123!', // Contains "admin"
        'Qwerty123!', // Contains "qwerty"
        'Aaabbbccc1!', // Three consecutive identical characters
        '123456789Aa!', // Contains "123456"
      ];

      passwords.forEach((password) => {
        const result = service.validatePasswordStrength(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          'Password contains common patterns and is not secure',
        );
      });
    });

    it('should return multiple errors for weak password', () => {
      const weakPassword = 'weak';
      const result = service.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long',
      );
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter',
      );
      expect(result.errors).toContain(
        'Password must contain at least one number',
      );
      expect(result.errors).toContain(
        'Password must contain at least one special character (@$!%*?&)',
      );
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length of 16', () => {
      const password = service.generateSecurePassword();
      expect(password).toHaveLength(16);
    });

    it('should generate password with specified length', () => {
      const length = 20;
      const password = service.generateSecurePassword(length);
      expect(password).toHaveLength(length);
    });

    it('should generate password that passes strength validation', () => {
      const password = service.generateSecurePassword();
      const validation = service.validatePasswordStrength(password);
      expect(validation.isValid).toBe(true);
    });

    it('should generate different passwords on multiple calls', () => {
      const password1 = service.generateSecurePassword();
      const password2 = service.generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it('should contain at least one character from each category', () => {
      const password = service.generateSecurePassword();

      expect(/[A-Z]/.test(password)).toBe(true); // Uppercase
      expect(/[a-z]/.test(password)).toBe(true); // Lowercase
      expect(/\d/.test(password)).toBe(true); // Number
      expect(/[@$!%*?&]/.test(password)).toBe(true); // Special character
    });
  });

  describe('needsRehash', () => {
    it('should return false for password hashed with current salt rounds', async () => {
      const hashedPassword = 'hashedPassword';
      mockedBcrypt.getRounds.mockReturnValue(12);

      const result = await service.needsRehash(hashedPassword);

      expect(result).toBe(false);
      expect(mockedBcrypt.getRounds).toHaveBeenCalledWith(hashedPassword);
    });

    it('should return true for password hashed with fewer salt rounds', async () => {
      const hashedPassword = 'hashedPassword';
      mockedBcrypt.getRounds.mockReturnValue(10);

      const result = await service.needsRehash(hashedPassword);

      expect(result).toBe(true);
      expect(mockedBcrypt.getRounds).toHaveBeenCalledWith(hashedPassword);
    });

    it('should return true when getRounds throws an error', async () => {
      const hashedPassword = 'invalidHashedPassword';
      mockedBcrypt.getRounds.mockImplementation(() => {
        throw new Error('Invalid hash');
      });

      const result = await service.needsRehash(hashedPassword);

      expect(result).toBe(true);
    });
  });
});
