import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { JwtTokenService } from '../jwt.service';
import { User } from '../../../entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';

describe('JwtTokenService', () => {
  let service: JwtTokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser: User = {
    id: 'test-user-id',
    email: 'test@ui.edu.ng',
    role: UserRole.STUDENT,
    password: 'hashedPassword',
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    // studentProfile: undefined,
    // supervisorProfile: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'jwt.secret': 'test-secret',
        'jwt.expiresIn': '15m',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.refreshExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<JwtTokenService>(JwtTokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokenPair', () => {
    it('should generate access and refresh tokens', async () => {
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      const result = await service.generateTokenPair(mockUser);

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(mockJwtService.signAsync).toHaveBeenNthCalledWith(
        1,
        {
          sub: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
        },
        {
          secret: 'test-secret',
          expiresIn: '15m',
        },
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should validate and return payload for valid token', async () => {
      const mockToken = 'valid-token';
      const mockPayload = {
        sub: 'user-id',
        email: 'test@ui.edu.ng',
        role: UserRole.STUDENT,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.validateAccessToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-secret',
      });
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      const mockToken = 'invalid-token';
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateAccessToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should validate and return payload for valid refresh token', async () => {
      const mockToken = 'valid-refresh-token';
      const mockPayload = {
        sub: 'user-id',
        tokenId: 'token-id',
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.validateRefreshToken(mockToken);

      expect(result).toEqual(mockPayload);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
        secret: 'test-refresh-secret',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const mockToken = 'invalid-refresh-token';
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.validateRefreshToken(mockToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      const authHeader = 'Bearer valid-token';
      const result = service.extractTokenFromHeader(authHeader);
      expect(result).toBe('valid-token');
    });

    it('should return null for invalid authorization header', () => {
      expect(service.extractTokenFromHeader('Invalid header')).toBeNull();
      expect(service.extractTokenFromHeader('')).toBeNull();
      expect(service.extractTokenFromHeader(undefined as any)).toBeNull();
    });

    it('should return null for non-Bearer token type', () => {
      const authHeader = 'Basic dGVzdDp0ZXN0';
      const result = service.extractTokenFromHeader(authHeader);
      expect(result).toBeNull();
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const mockExpiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockJwtService.decode.mockReturnValue({ exp: mockExpiration });

      const result = service.getTokenExpiration('valid-token');
      expect(result).toEqual(new Date(mockExpiration * 1000));
    });

    it('should return null for token without expiration', () => {
      mockJwtService.decode.mockReturnValue({});
      const result = service.getTokenExpiration('token-without-exp');
      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      mockJwtService.decode.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.getTokenExpiration('invalid-token');
      expect(result).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for non-expired token', () => {
      const futureExpiration = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      mockJwtService.decode.mockReturnValue({ exp: futureExpiration });

      const result = service.isTokenExpired('valid-token');
      expect(result).toBe(false);
    });

    it('should return true for expired token', () => {
      const pastExpiration = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      mockJwtService.decode.mockReturnValue({ exp: pastExpiration });

      const result = service.isTokenExpired('expired-token');
      expect(result).toBe(true);
    });

    it('should return true for token without expiration', () => {
      mockJwtService.decode.mockReturnValue({});
      const result = service.isTokenExpired('token-without-exp');
      expect(result).toBe(true);
    });
  });
});
