import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtStrategy } from '../jwt.strategy';
import { User } from '../../../entities/user.entity';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtPayload } from '../../interfaces/token.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: Repository<User>;

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

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'jwt.secret': 'test-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    const mockPayload: JwtPayload = {
      sub: 'test-user-id',
      email: 'test@ui.edu.ng',
      role: UserRole.STUDENT,
    };

    it('should return user for valid payload', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockPayload.sub },
        // relations: ['studentProfile', 'supervisorProfile'], // Temporarily disabled
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockUserRepository.findOne.mockResolvedValue(inactiveUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('User account is deactivated'),
      );
    });

    it('should throw UnauthorizedException when email is not verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockUserRepository.findOne.mockResolvedValue(unverifiedUser);

      await expect(strategy.validate(mockPayload)).rejects.toThrow(
        new UnauthorizedException('Email not verified'),
      );
    });

    it('should return user when validation succeeds', async () => {
      const userWithProfiles = {
        ...mockUser,
        // studentProfile: { id: 'profile-id', name: 'Test Student' },
      };
      mockUserRepository.findOne.mockResolvedValue(userWithProfiles);

      const result = await strategy.validate(mockPayload);

      expect(result).toEqual(userWithProfiles);
      // expect(result.studentProfile).toBeDefined();
    });
  });
});
