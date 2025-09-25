import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AdminSessionService } from '../admin-session.service';
import { User } from '../../../entities/user.entity';
import { RefreshToken } from '../../../entities/refresh-token.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

describe('AdminSessionService', () => {
  let service: AdminSessionService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let configService: ConfigService;

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSessionService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AdminSessionService>(AdminSessionService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('validateAdminSession', () => {
    const mockAdminUser: User = {
      id: 'admin-1',
      email: 'admin@ui.edu.ng',
      password: 'hashedPassword',
      role: UserRole.ADMIN,
      isActive: true,
      isEmailVerified: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate admin session successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockAdminUser);
      mockRefreshTokenRepository.find.mockResolvedValue([]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      mockRefreshTokenRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.validateAdminSession(
        'admin-1',
        '192.168.1.1',
        'test-agent',
      );

      expect(result).toBe(true);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin-1' },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateAdminSession('invalid-id', '192.168.1.1', 'test-agent'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is not admin', async () => {
      const nonAdminUser = { ...mockAdminUser, role: UserRole.STUDENT };
      mockUserRepository.findOne.mockResolvedValue(nonAdminUser);

      await expect(
        service.validateAdminSession('admin-1', '192.168.1.1', 'test-agent'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when admin account is deactivated', async () => {
      const deactivatedAdmin = { ...mockAdminUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(deactivatedAdmin);

      await expect(
        service.validateAdminSession('admin-1', '192.168.1.1', 'test-agent'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when admin email is not verified', async () => {
      const unverifiedAdmin = { ...mockAdminUser, isEmailVerified: false };
      mockUserRepository.findOne.mockResolvedValue(unverifiedAdmin);

      await expect(
        service.validateAdminSession('admin-1', '192.168.1.1', 'test-agent'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createAdminSession', () => {
    it('should create admin session successfully', async () => {
      const mockAdminUser: User = {
        id: 'admin-1',
        email: 'admin@ui.edu.ng',
        password: 'hashedPassword',
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
        emailVerificationToken: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockAdminUser);
      mockRefreshTokenRepository.find.mockResolvedValue([]);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      mockRefreshTokenRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      await expect(
        service.createAdminSession('admin-1', '192.168.1.1', 'test-agent'),
      ).resolves.not.toThrow();
    });
  });

  describe('revokeAdminSession', () => {
    it('should revoke specific session', async () => {
      const mockRefreshToken: RefreshToken = {
        id: 'token-1',
        tokenHash: 'refresh-token-hash',
        userId: 'admin-1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isRevoked: false,
        createdAt: new Date(),
      };

      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockRefreshTokenRepository.save.mockResolvedValue(mockRefreshToken);

      await service.revokeAdminSession('admin-1', 'token-1', 'Test reason');

      expect(mockRefreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'token-1', userId: 'admin-1' },
      });
      expect(mockRefreshTokenRepository.save).toHaveBeenCalledWith({
        ...mockRefreshToken,
        isRevoked: true,
      });
    });

    it('should revoke all sessions when no token ID provided', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 2 });

      await service.revokeAdminSession('admin-1', undefined, 'Revoke all');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: 'admin-1' },
        { isRevoked: true },
      );
    });
  });

  describe('getActiveAdminSessions', () => {
    it('should return active sessions for user', async () => {
      const mockSessions: RefreshToken[] = [
        {
          id: 'token-1',
          tokenHash: 'refresh-token-hash-1',
          userId: 'admin-1',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isRevoked: false,
          createdAt: new Date(),
        },
      ];

      mockRefreshTokenRepository.find.mockResolvedValue(mockSessions);

      const result = await service.getActiveAdminSessions('admin-1');

      expect(result).toEqual(mockSessions);
      expect(mockRefreshTokenRepository.find).toHaveBeenCalledWith({
        where: { userId: 'admin-1', isRevoked: false },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics', async () => {
      mockRefreshTokenRepository.count.mockResolvedValue(10);

      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      mockRefreshTokenRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.getSessionStatistics();

      expect(result).toEqual({
        totalActiveSessions: 10,
        adminSessions: 3,
      });
    });
  });
});
