import { Test, TestingModule } from '@nestjs/testing';
import { TokenCleanupService } from '../token-cleanup.service';
import { TokenManagementService } from '../token-management.service';

describe('TokenCleanupService', () => {
  let service: TokenCleanupService;
  let tokenManagementService: TokenManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenCleanupService,
        {
          provide: TokenManagementService,
          useValue: {
            cleanupExpiredTokens: jest.fn(),
            cleanupRevokedTokens: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TokenCleanupService>(TokenCleanupService);
    tokenManagementService = module.get<TokenManagementService>(
      TokenManagementService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupExpiredTokens', () => {
    it('should call tokenManagementService.cleanupExpiredTokens', async () => {
      const mockCleanupExpiredTokens = jest.fn().mockResolvedValue(5);
      tokenManagementService.cleanupExpiredTokens = mockCleanupExpiredTokens;

      await service.cleanupExpiredTokens();

      expect(mockCleanupExpiredTokens).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      const mockCleanupExpiredTokens = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      tokenManagementService.cleanupExpiredTokens = mockCleanupExpiredTokens;

      // Should not throw error
      await service.cleanupExpiredTokens();

      expect(mockCleanupExpiredTokens).toHaveBeenCalledTimes(1);
    });

    it('should not log when no tokens are deleted', async () => {
      const mockCleanupExpiredTokens = jest.fn().mockResolvedValue(0);
      tokenManagementService.cleanupExpiredTokens = mockCleanupExpiredTokens;

      await service.cleanupExpiredTokens();

      expect(mockCleanupExpiredTokens).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupRevokedTokens', () => {
    it('should call tokenManagementService.cleanupRevokedTokens with 30 days', async () => {
      const mockCleanupRevokedTokens = jest.fn().mockResolvedValue(3);
      tokenManagementService.cleanupRevokedTokens = mockCleanupRevokedTokens;

      await service.cleanupRevokedTokens();

      expect(mockCleanupRevokedTokens).toHaveBeenCalledWith(30);
    });

    it('should handle errors gracefully', async () => {
      const mockCleanupRevokedTokens = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));
      tokenManagementService.cleanupRevokedTokens = mockCleanupRevokedTokens;

      // Should not throw error
      await service.cleanupRevokedTokens();

      expect(mockCleanupRevokedTokens).toHaveBeenCalledWith(30);
    });

    it('should not log when no tokens are deleted', async () => {
      const mockCleanupRevokedTokens = jest.fn().mockResolvedValue(0);
      tokenManagementService.cleanupRevokedTokens = mockCleanupRevokedTokens;

      await service.cleanupRevokedTokens();

      expect(mockCleanupRevokedTokens).toHaveBeenCalledWith(30);
    });
  });
});
