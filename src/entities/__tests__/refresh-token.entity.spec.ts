import { RefreshToken } from '../refresh-token.entity';

describe('RefreshToken Entity', () => {
  let refreshToken: RefreshToken;

  beforeEach(() => {
    refreshToken = new RefreshToken();
    refreshToken.userId = '123e4567-e89b-12d3-a456-426614174000';
    refreshToken.tokenHash = 'hashed_token_string_here';
    refreshToken.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    refreshToken.isRevoked = false;
  });

  describe('Entity Structure', () => {
    it('should create a refresh token with all required fields', () => {
      expect(refreshToken.userId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(refreshToken.tokenHash).toBe('hashed_token_string_here');
      expect(refreshToken.expiresAt).toBeInstanceOf(Date);
      expect(refreshToken.isRevoked).toBe(false);
    });

    it('should have default values for boolean fields', () => {
      const newToken = new RefreshToken();
      expect(newToken.isRevoked).toBeUndefined(); // Will be set by TypeORM default to false
    });
  });

  describe('Token Management', () => {
    it('should handle token expiration dates', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      refreshToken.expiresAt = futureDate;
      expect(refreshToken.expiresAt.getTime()).toBeGreaterThan(Date.now());

      refreshToken.expiresAt = pastDate;
      expect(refreshToken.expiresAt.getTime()).toBeLessThan(Date.now());
    });

    it('should handle token revocation', () => {
      refreshToken.isRevoked = true;
      expect(refreshToken.isRevoked).toBe(true);

      refreshToken.isRevoked = false;
      expect(refreshToken.isRevoked).toBe(false);
    });

    it('should store hashed token strings', () => {
      const hashedTokens = [
        'sha256_hashed_token_1',
        'bcrypt_hashed_token_2',
        'argon2_hashed_token_3',
      ];

      hashedTokens.forEach((hash) => {
        refreshToken.tokenHash = hash;
        expect(refreshToken.tokenHash).toBe(hash);
      });
    });
  });

  describe('User Relationship', () => {
    it('should have userId field for foreign key', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '987fcdeb-51a2-43d1-9f12-123456789abc',
        '550e8400-e29b-41d4-a716-446655440000',
      ];

      validUUIDs.forEach((uuid) => {
        refreshToken.userId = uuid;
        expect(refreshToken.userId).toBe(uuid);
      });
    });

    it('should have user relationship', () => {
      expect(refreshToken.user).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt field', () => {
      expect(refreshToken.createdAt).toBeUndefined();
      // Will be set by TypeORM CreateDateColumn
    });
  });

  describe('Security Features', () => {
    it('should support token rotation by creating new tokens', () => {
      const originalHash = refreshToken.tokenHash;
      const newHash = 'new_rotated_token_hash';

      refreshToken.tokenHash = newHash;
      expect(refreshToken.tokenHash).toBe(newHash);
      expect(refreshToken.tokenHash).not.toBe(originalHash);
    });

    it('should support immediate revocation', () => {
      expect(refreshToken.isRevoked).toBe(false);

      // Simulate token revocation
      refreshToken.isRevoked = true;
      expect(refreshToken.isRevoked).toBe(true);
    });
  });
});
