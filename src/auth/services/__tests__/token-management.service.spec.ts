import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenManagementService } from '../token-management.service';
import { RefreshToken } from '../../../entities/refresh-token.entity';
import { User } from '../../../entities/user.entity';
import { JwtTokenService } from '../jwt.service';
import { AuditService } from '../audit.service';
import { UserRole } from '../../../common/enums/user-role.enum';
import {
  TokenPair,
  RefreshTokenPayload,
} from '../../interfaces/token.interface';

describe('TokenManagementService', () => {
  let service: TokenManagementService;
  let refreshTokenRepository: Repository<RefreshToken>;
  let userRepository: Repository<User>;
  let jwtTokenService: JwtTokenService;
  let auditService: AuditService;
  let configService: ConfigService;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@ui.edu.ng',
    password: 'hashedPassword',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRefreshToken: RefreshToken = {
    id: 'token-id-123',
    userId: mockUser.id,
    tokenHash: 'hashed-token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    isRevoked: false,
    createdAt: new Date(),
  };

  const mockTokenPair: TokenPair = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
  };

  const mockRefreshTokenPayload: RefreshTokenPayload = {
    sub: mockUser.id,
    tokenId: 'token-id-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenManagementService,
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtTokenService,
          useValue: {
            validateRefreshToken: jest.fn(),
            generateTokenPair: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            logTokenRefresh: jest.fn(),
            logLogout: jest.fn(),
            logSuspiciousActivity: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              switch (key) {
                case 'jwt.refreshExpiresIn':
                  return '7d';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenManagementService>(TokenManagementService);
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtTokenService = module.get<JwtTokenService>(JwtTokenService);
    auditService = module.get<AuditService>(AuditService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('storeRefreshToken', () => {
    it('should store refresh token with hash and expiration', async () => {
      const mockCreate = jest.fn().mockReturnValue(mockRefreshToken);
      const mockSave = jest.fn().mockResolvedValue(mockRefreshToken);

      refreshTokenRepository.create = mockCreate;
      refreshTokenRepository.save = mockSave;

      await service.storeRefreshToken(mockUser.id, 'refresh-token');

      expect(mockCreate).toHaveBeenCalledWith({
        userId: mockUser.id,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
        isRevoked: false,
      });
      expect(mockSave).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should handle storage errors gracefully', async () => {
      const mockCreate = jest.fn().mockReturnValue(mockRefreshToken);
      const mockSave = jest.fn().mockRejectedValue(new Error('Database error'));

      refreshTokenRepository.create = mockCreate;
      refreshTokenRepository.save = mockSave;

      await expect(
        service.storeRefreshToken(mockUser.id, 'refresh-token'),
      ).rejects.toThrow('Database error');
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens with rotation', async () => {
      const mockValidateRefreshToken = jest
        .fn()
        .mockResolvedValue(mockRefreshTokenPayload);
      const mockFindOne = jest
        .fn()
        .mockResolvedValue({ ...mockRefreshToken, user: mockUser });
      const mockUserFindOne = jest.fn().mockResolvedValue(mockUser);
      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });
      const mockGenerateTokenPair = jest.fn().mockResolvedValue(mockTokenPair);
      const mockCreate = jest.fn().mockReturnValue(mockRefreshToken);
      const mockSave = jest.fn().mockResolvedValue(mockRefreshToken);
      const mockLogTokenRefresh = jest.fn().mockResolvedValue(undefined);

      jwtTokenService.validateRefreshToken = mockValidateRefreshToken;
      refreshTokenRepository.findOne = mockFindOne;
      userRepository.findOne = mockUserFindOne;
      refreshTokenRepository.update = mockUpdate;
      jwtTokenService.generateTokenPair = mockGenerateTokenPair;
      refreshTokenRepository.create = mockCreate;
      refreshTokenRepository.save = mockSave;
      auditService.logTokenRefresh = mockLogTokenRefresh;

      const result = await service.refreshTokens(
        'old-refresh-token',
        '127.0.0.1',
        'test-agent',
      );

      expect(mockValidateRefreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(mockFindOne).toHaveBeenCalledWith({
        where: {
          tokenHash: expect.any(String),
          userId: mockUser.id,
          isRevoked: false,
        },
        relations: ['user'],
      });
      expect(mockUpdate).toHaveBeenCalledWith(
        { id: mockRefreshToken.id },
        { isRevoked: true },
      );
      expect(mockGenerateTokenPair).toHaveBeenCalledWith(mockUser);
      expect(mockLogTokenRefresh).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'test-agent',
      );
      expect(result).toEqual(mockTokenPair);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const mockValidateRefreshToken = jest
        .fn()
        .mockResolvedValue(mockRefreshTokenPayload);
      const mockFindOne = jest.fn().mockResolvedValue(null);
      const mockLogSuspiciousActivity = jest.fn().mockResolvedValue(undefined);

      jwtTokenService.validateRefreshToken = mockValidateRefreshToken;
      refreshTokenRepository.findOne = mockFindOne;
      auditService.logSuspiciousActivity = mockLogSuspiciousActivity;

      await expect(
        service.refreshTokens('invalid-token', '127.0.0.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockLogSuspiciousActivity).toHaveBeenCalledWith(
        'INVALID_REFRESH_TOKEN',
        mockUser.id,
        '127.0.0.1',
        'test-agent',
        { tokenId: mockRefreshTokenPayload.tokenId },
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000),
      };
      const mockValidateRefreshToken = jest
        .fn()
        .mockResolvedValue(mockRefreshTokenPayload);
      const mockFindOne = jest.fn().mockResolvedValue(expiredToken);
      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });

      jwtTokenService.validateRefreshToken = mockValidateRefreshToken;
      refreshTokenRepository.findOne = mockFindOne;
      refreshTokenRepository.update = mockUpdate;

      await expect(service.refreshTokens('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        { id: expiredToken.id },
        { isRevoked: true },
      );
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const mockValidateRefreshToken = jest
        .fn()
        .mockResolvedValue(mockRefreshTokenPayload);
      const mockFindOne = jest
        .fn()
        .mockResolvedValue({ ...mockRefreshToken, user: inactiveUser });
      const mockUserFindOne = jest.fn().mockResolvedValue(inactiveUser);
      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });

      jwtTokenService.validateRefreshToken = mockValidateRefreshToken;
      refreshTokenRepository.findOne = mockFindOne;
      userRepository.findOne = mockUserFindOne;
      refreshTokenRepository.update = mockUpdate;

      await expect(
        service.refreshTokens('token-for-inactive-user'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUpdate).toHaveBeenCalledWith(
        { id: mockRefreshToken.id },
        { isRevoked: true },
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke a specific refresh token', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });
      refreshTokenRepository.update = mockUpdate;

      await service.revokeRefreshToken('token-id-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        { id: 'token-id-123' },
        { isRevoked: true },
      );
    });

    it('should handle revocation errors gracefully', async () => {
      const mockUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      refreshTokenRepository.update = mockUpdate;

      // Should not throw error
      await service.revokeRefreshToken('token-id-123');

      expect(mockUpdate).toHaveBeenCalledWith(
        { id: 'token-id-123' },
        { isRevoked: true },
      );
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({ affected: 3 });
      refreshTokenRepository.update = mockUpdate;

      await service.revokeAllUserTokens(mockUser.id);

      expect(mockUpdate).toHaveBeenCalledWith(
        { userId: mockUser.id, isRevoked: false },
        { isRevoked: true },
      );
    });

    it('should handle revocation errors gracefully', async () => {
      const mockUpdate = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      refreshTokenRepository.update = mockUpdate;

      // Should not throw error
      await service.revokeAllUserTokens(mockUser.id);

      expect(mockUpdate).toHaveBeenCalledWith(
        { userId: mockUser.id, isRevoked: false },
        { isRevoked: true },
      );
    });
  });

  describe('logout', () => {
    it('should logout user by revoking specific token', async () => {
      const mockFindOne = jest.fn().mockResolvedValue(mockRefreshToken);
      const mockUpdate = jest.fn().mockResolvedValue({ affected: 1 });
      const mockLogLogout = jest.fn().mockResolvedValue(undefined);

      refreshTokenRepository.findOne = mockFindOne;
      refreshTokenRepository.update = mockUpdate;
      auditService.logLogout = mockLogLogout;

      await service.logout(
        mockUser.id,
        'refresh-token',
        '127.0.0.1',
        'test-agent',
      );

      expect(mockFindOne).toHaveBeenCalledWith({
        where: {
          tokenHash: expect.any(String),
          userId: mockUser.id,
          isRevoked: false,
        },
      });
      expect(mockUpdate).toHaveBeenCalledWith(
        { id: mockRefreshToken.id },
        { isRevoked: true },
      );
      expect(mockLogLogout).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should handle logout when token not found', async () => {
      const mockFindOne = jest.fn().mockResolvedValue(null);
      const mockLogLogout = jest.fn().mockResolvedValue(undefined);

      refreshTokenRepository.findOne = mockFindOne;
      auditService.logLogout = mockLogLogout;

      await service.logout(
        mockUser.id,
        'non-existent-token',
        '127.0.0.1',
        'test-agent',
      );

      expect(mockLogLogout).toHaveBeenCalledWith(
        mockUser.id,
        '127.0.0.1',
        'test-agent',
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens and return count', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ affected: 5 });
      refreshTokenRepository.delete = mockDelete;

      const result = await service.cleanupExpiredTokens();

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: expect.objectContaining({
            _type: 'lessThan',
            _value: expect.any(Date),
          }),
        }),
      );
      expect(result).toBe(5);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockDelete = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      refreshTokenRepository.delete = mockDelete;

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(0);
    });
  });

  describe('cleanupRevokedTokens', () => {
    it('should delete old revoked tokens and return count', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ affected: 3 });
      refreshTokenRepository.delete = mockDelete;

      const result = await service.cleanupRevokedTokens(30);

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          isRevoked: true,
          createdAt: expect.objectContaining({
            _type: 'lessThan',
            _value: expect.any(Date),
          }),
        }),
      );
      expect(result).toBe(3);
    });

    it('should use default 30 days when no parameter provided', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ affected: 2 });
      refreshTokenRepository.delete = mockDelete;

      const result = await service.cleanupRevokedTokens();

      expect(mockDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          isRevoked: true,
          createdAt: expect.objectContaining({
            _type: 'lessThan',
            _value: expect.any(Date),
          }),
        }),
      );
      expect(result).toBe(2);
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockDelete = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      refreshTokenRepository.delete = mockDelete;

      const result = await service.cleanupRevokedTokens();

      expect(result).toBe(0);
    });
  });

  describe('getUserActiveTokens', () => {
    it('should return active tokens for a user', async () => {
      const activeTokens = [mockRefreshToken];
      const mockFind = jest.fn().mockResolvedValue(activeTokens);
      refreshTokenRepository.find = mockFind;

      const result = await service.getUserActiveTokens(mockUser.id);

      expect(mockFind).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
            isRevoked: false,
            expiresAt: expect.objectContaining({
              _type: 'moreThan',
              _value: expect.any(Date),
            }),
          }),
          order: { createdAt: 'DESC' },
        }),
      );
      expect(result).toEqual(activeTokens);
    });
  });

  describe('checkTokenLimit', () => {
    it('should return true when token count is within limit', async () => {
      const activeTokens = [mockRefreshToken];
      const mockFind = jest.fn().mockResolvedValue(activeTokens);
      refreshTokenRepository.find = mockFind;

      const result = await service.checkTokenLimit(mockUser.id, 10);

      expect(result).toBe(true);
    });

    it('should return false and log suspicious activity when token count exceeds limit', async () => {
      const activeTokens = Array(15).fill(mockRefreshToken);
      const mockFind = jest.fn().mockResolvedValue(activeTokens);
      const mockLogSuspiciousActivity = jest.fn().mockResolvedValue(undefined);

      refreshTokenRepository.find = mockFind;
      auditService.logSuspiciousActivity = mockLogSuspiciousActivity;

      const result = await service.checkTokenLimit(mockUser.id, 10);

      expect(result).toBe(false);
      expect(mockLogSuspiciousActivity).toHaveBeenCalledWith(
        'EXCESSIVE_TOKENS',
        mockUser.id,
        undefined,
        undefined,
        { tokenCount: 15, limit: 10 },
      );
    });
  });
});
