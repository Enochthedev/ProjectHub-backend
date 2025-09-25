import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password using bcrypt with 12 rounds
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Validate password strength according to requirements
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Minimum length check
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    // Maximum length check (prevent DoS attacks)
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    // Uppercase letter check
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Lowercase letter check
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Number check
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Special character check
    if (!/[@$!%*?&]/.test(password)) {
      errors.push(
        'Password must contain at least one special character (@$!%*?&)',
      );
    }

    // Common password patterns check
    const commonPatterns = [
      /(.)\1{2,}/, // Three or more consecutive identical characters
      /123456|654321|abcdef|qwerty/i, // Common sequences
      /password|admin|user|login/i, // Common words
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        errors.push('Password contains common patterns and is not secure');
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '@$!%*?&';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';

    // Ensure at least one character from each category
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Check if password needs to be rehashed (if salt rounds changed)
   */
  async needsRehash(hashedPassword: string): Promise<boolean> {
    try {
      const rounds = bcrypt.getRounds(hashedPassword);
      return rounds < this.saltRounds;
    } catch {
      // If we can't determine rounds, assume it needs rehashing
      return true;
    }
  }
}
