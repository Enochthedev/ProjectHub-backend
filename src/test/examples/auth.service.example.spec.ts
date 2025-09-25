import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../../auth/auth.service';
import { User } from '../../entities';
import { UserFixtures, AuthFixtures } from '../fixtures';
import { TestDatabaseUtil } from '../utils';

describe('AuthService (Example Test)', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let module: TestingModule;

  beforeAll(async () => {
    await TestDatabaseUtil.beforeAll();
  });

  afterAll(async () => {
    await TestDatabaseUtil.afterAll();
  });

  beforeEach(async () => {
    await TestDatabaseUtil.beforeEach();

    module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: TestDatabaseUtil.getRepository(User),
        },
        // Add other required providers...
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(async () => {
    await TestDatabaseUtil.afterEach();
    await module.close();
  });

  describe('register', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const registerDto = AuthFixtures.createValidStudentRegisterDto();

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(registerDto.email);
      expect(result.tokens.accessToken).toBeDefined();
    });

    it('should reject registration with invalid email domain', async () => {
      // Arrange
      const registerDto = AuthFixtures.createInvalidRegisterDto('email');

      // Act & Assert
      await expect(service.register(registerDto as any)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      // Arrange
      const userData = await UserFixtures.createTestStudent();
      const user = userRepository.create(userData);
      await userRepository.save(user);

      const loginDto = AuthFixtures.createValidLoginDto({
        email: userData.email,
        password: 'TestPass123!', // Use the unhashed password
      });

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBeDefined();
    });
  });

  describe('performance test example', () => {
    it('should handle bulk user creation efficiently', async () => {
      // Arrange
      const userCount = 100;
      const userData = await UserFixtures.createMultipleStudents(userCount);

      // Act
      const startTime = Date.now();
      const users = userRepository.create(userData);
      await userRepository.save(users);
      const endTime = Date.now();

      // Assert
      const createdUsers = await userRepository.count();
      expect(createdUsers).toBe(userCount);

      const executionTime = endTime - startTime;
      console.log(`Created ${userCount} users in ${executionTime}ms`);

      // Performance assertion (adjust threshold as needed)
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
