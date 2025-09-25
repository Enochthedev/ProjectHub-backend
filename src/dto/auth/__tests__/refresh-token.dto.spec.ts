import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { RefreshTokenDto } from '../refresh-token.dto';

describe('RefreshTokenDto', () => {
  const validRefreshTokenData = {
    refreshToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  };

  describe('refreshToken validation', () => {
    it('should accept valid refresh token', async () => {
      const dto = plainToClass(RefreshTokenDto, validRefreshTokenData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject empty refresh token', async () => {
      const invalidData = { refreshToken: '' };
      const dto = plainToClass(RefreshTokenDto, invalidData);
      const errors = await validate(dto);
      const tokenErrors = errors.filter(
        (error) => error.property === 'refreshToken',
      );
      expect(tokenErrors).toHaveLength(1);
      expect(tokenErrors[0].constraints?.isNotEmpty).toContain(
        'Refresh token is required',
      );
    });

    it('should reject non-string refresh token', async () => {
      const invalidData = { refreshToken: 123 };
      const dto = plainToClass(RefreshTokenDto, invalidData);
      const errors = await validate(dto);
      const tokenErrors = errors.filter(
        (error) => error.property === 'refreshToken',
      );
      expect(tokenErrors).toHaveLength(1);
      expect(tokenErrors[0].constraints?.isString).toContain(
        'Refresh token must be a string',
      );
    });

    it('should reject undefined refresh token', async () => {
      const dto = plainToClass(RefreshTokenDto, {});
      const errors = await validate(dto);
      const tokenErrors = errors.filter(
        (error) => error.property === 'refreshToken',
      );
      expect(tokenErrors).toHaveLength(1);
      expect(tokenErrors[0].constraints?.isNotEmpty).toContain(
        'Refresh token is required',
      );
    });
  });

  describe('complete validation', () => {
    it('should pass validation with valid refresh token', async () => {
      const dto = plainToClass(RefreshTokenDto, validRefreshTokenData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should accept any non-empty string as refresh token', async () => {
      const testCases = [
        { refreshToken: 'simple-token' },
        { refreshToken: 'token-with-dashes-and-numbers-123' },
        {
          refreshToken: 'very.long.token.with.dots.and.special.characters!@#$%',
        },
      ];

      for (const testCase of testCases) {
        const dto = plainToClass(RefreshTokenDto, testCase);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });
  });
});
