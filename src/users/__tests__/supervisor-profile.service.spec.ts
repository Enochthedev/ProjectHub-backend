import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SupervisorProfileService } from '../supervisor-profile.service';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateSupervisorProfileDto } from '../../dto/profile/update-supervisor-profile.dto';

describe('SupervisorProfileService', () => {
  let service: SupervisorProfileService;
  let supervisorProfileRepository: jest.Mocked<Repository<SupervisorProfile>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-123',
    email: 'supervisor@ui.edu.ng',
    password: 'hashedPassword',
    role: UserRole.SUPERVISOR,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupervisorProfile: SupervisorProfile = {
    id: 'profile-123',
    name: 'Dr. Jane Smith',
    specializations: [
      'Web Development & Full Stack',
      'Artificial Intelligence & Machine Learning',
    ],
    maxStudents: 5,
    isAvailable: true,
    officeLocation: 'Room 101, CS Building',
    phoneNumber: '+2348012345678',
    user: mockUser,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupervisorProfileService,
        {
          provide: getRepositoryToken(SupervisorProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            findAndCount: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SupervisorProfileService>(SupervisorProfileService);
    supervisorProfileRepository = module.get(
      getRepositoryToken(SupervisorProfile),
    );
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSupervisorProfile', () => {
    it('should return supervisor profile when user exists', async () => {
      const userWithProfile = {
        ...mockUser,
        supervisorProfile: mockSupervisorProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      const result = await service.getSupervisorProfile('user-123');

      expect(result).toEqual(mockSupervisorProfile);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123', role: UserRole.SUPERVISOR },
        relations: ['supervisorProfile'],
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getSupervisorProfile('user-123')).rejects.toThrow(
        new NotFoundException('Supervisor user not found'),
      );
    });

    it('should throw NotFoundException when supervisor profile does not exist', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.getSupervisorProfile('user-123')).rejects.toThrow(
        new NotFoundException('Supervisor profile not found'),
      );
    });
  });

  describe('createSupervisorProfile', () => {
    const validProfileData: UpdateSupervisorProfileDto = {
      name: 'Dr. Jane Smith',
      specializations: ['Web Development & Full Stack'],
      maxStudents: 5,
      isAvailable: true,
      officeLocation: 'Room 101',
      phoneNumber: '+2348012345678',
    };

    it('should create supervisor profile successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      supervisorProfileRepository.create.mockReturnValue(mockSupervisorProfile);
      supervisorProfileRepository.save.mockResolvedValue(mockSupervisorProfile);
      supervisorProfileRepository.findOne.mockResolvedValue(
        mockSupervisorProfile,
      );

      const result = await service.createSupervisorProfile(
        'user-123',
        validProfileData,
      );

      expect(result).toEqual(mockSupervisorProfile);
      expect(supervisorProfileRepository.create).toHaveBeenCalledWith({
        ...validProfileData,
        user: mockUser,
      });
      expect(supervisorProfileRepository.save).toHaveBeenCalledWith(
        mockSupervisorProfile,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createSupervisorProfile('user-123', validProfileData),
      ).rejects.toThrow(new NotFoundException('Supervisor user not found'));
    });

    it('should throw BadRequestException when profile already exists', async () => {
      const userWithProfile = {
        ...mockUser,
        supervisorProfile: mockSupervisorProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      await expect(
        service.createSupervisorProfile('user-123', validProfileData),
      ).rejects.toThrow(
        new BadRequestException('Supervisor profile already exists'),
      );
    });

    it('should throw BadRequestException for invalid specializations', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        specializations: ['Invalid Specialization'],
      };

      await expect(
        service.createSupervisorProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty specializations array', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        specializations: [],
      };

      await expect(
        service.createSupervisorProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate specializations', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        specializations: [
          'Web Development & Full Stack',
          'Web Development & Full Stack',
        ],
      };

      await expect(
        service.createSupervisorProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for too many specializations', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        specializations: [
          'Web Development & Full Stack',
          'Artificial Intelligence & Machine Learning',
          'Mobile Application Development',
          'Cybersecurity & Information Security',
          'Data Science & Analytics',
          'Cloud Computing & DevOps', // 6th specialization - should be invalid
        ],
      };

      await expect(
        service.createSupervisorProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid phone number', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        phoneNumber: 'invalid-phone',
      };

      await expect(
        service.createSupervisorProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateSupervisorProfile', () => {
    const updateData: UpdateSupervisorProfileDto = {
      name: 'Dr. John Doe',
      maxStudents: 8,
    };

    it('should update supervisor profile successfully', async () => {
      const userWithProfile = {
        ...mockUser,
        supervisorProfile: mockSupervisorProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      const updatedProfile = { ...mockSupervisorProfile, ...updateData };
      supervisorProfileRepository.save.mockResolvedValue(updatedProfile);
      supervisorProfileRepository.findOne.mockResolvedValue(updatedProfile);

      const result = await service.updateSupervisorProfile(
        'user-123',
        updateData,
      );

      expect(result).toEqual(updatedProfile);
      expect(supervisorProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSupervisorProfile('user-123', updateData),
      ).rejects.toThrow(new NotFoundException('Supervisor user not found'));
    });
  });

  describe('deleteSupervisorProfile', () => {
    it('should delete supervisor profile successfully', async () => {
      const userWithProfile = {
        ...mockUser,
        supervisorProfile: mockSupervisorProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);
      supervisorProfileRepository.remove.mockResolvedValue(
        mockSupervisorProfile,
      );

      await service.deleteSupervisorProfile('user-123');

      expect(supervisorProfileRepository.remove).toHaveBeenCalledWith(
        mockSupervisorProfile,
      );
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteSupervisorProfile('user-123')).rejects.toThrow(
        new NotFoundException('Supervisor user not found'),
      );
    });
  });

  describe('getAllSupervisorProfiles', () => {
    it('should return paginated supervisor profiles', async () => {
      const profiles = [mockSupervisorProfile];
      supervisorProfileRepository.findAndCount.mockResolvedValue([profiles, 1]);

      const result = await service.getAllSupervisorProfiles(1, 10);

      expect(result).toEqual({ profiles, total: 1 });
      expect(supervisorProfileRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['user'],
        skip: 0,
        take: 10,
        order: { name: 'ASC' },
      });
    });
  });

  describe('getAvailableSupervisorsBySpecialization', () => {
    it('should return available supervisors by valid specialization', async () => {
      const profiles = [mockSupervisorProfile];
      supervisorProfileRepository.findAndCount.mockResolvedValue([profiles, 1]);

      const result = await service.getAvailableSupervisorsBySpecialization(
        'Web Development & Full Stack',
        1,
        10,
      );

      expect(result).toEqual({ profiles, total: 1 });
      expect(supervisorProfileRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          specializations: 'Web Development & Full Stack',
          isAvailable: true,
        },
        relations: ['user'],
        skip: 0,
        take: 10,
        order: { name: 'ASC' },
      });
    });

    it('should throw BadRequestException for invalid specialization', async () => {
      await expect(
        service.getAvailableSupervisorsBySpecialization(
          'Invalid Specialization',
          1,
          10,
        ),
      ).rejects.toThrow(new BadRequestException('Invalid specialization'));
    });
  });

  describe('searchSupervisorProfiles', () => {
    it('should search supervisor profiles by term', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest
          .fn()
          .mockResolvedValue([[mockSupervisorProfile], 1]),
      } as any;

      supervisorProfileRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.searchSupervisorProfiles('Jane', 1, 10);

      expect(result).toEqual({ profiles: [mockSupervisorProfile], total: 1 });
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('toggleAvailability', () => {
    it('should toggle supervisor availability', async () => {
      const userWithProfile = {
        ...mockUser,
        supervisorProfile: mockSupervisorProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      const toggledProfile = { ...mockSupervisorProfile, isAvailable: false };
      supervisorProfileRepository.save.mockResolvedValue(toggledProfile);

      const result = await service.toggleAvailability('user-123');

      expect(result.isAvailable).toBe(false);
      expect(supervisorProfileRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateCapacity', () => {
    it('should update supervisor capacity successfully', async () => {
      const userWithProfile = {
        ...mockUser,
        supervisorProfile: mockSupervisorProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      const updatedProfile = { ...mockSupervisorProfile, maxStudents: 10 };
      supervisorProfileRepository.save.mockResolvedValue(updatedProfile);
      supervisorProfileRepository.findOne.mockResolvedValue(updatedProfile);

      const result = await service.updateCapacity('user-123', 10);

      expect(result.maxStudents).toBe(10);
      expect(supervisorProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid capacity', async () => {
      await expect(service.updateCapacity('user-123', 0)).rejects.toThrow(
        new BadRequestException('Maximum students must be between 1 and 20'),
      );

      await expect(service.updateCapacity('user-123', 21)).rejects.toThrow(
        new BadRequestException('Maximum students must be between 1 and 20'),
      );
    });
  });

  describe('getSupervisorStatistics', () => {
    it('should return supervisor statistics', async () => {
      supervisorProfileRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8) // available
        .mockResolvedValue(2); // counts for each specialization

      const result = await service.getSupervisorStatistics();

      expect(result.total).toBe(10);
      expect(result.available).toBe(8);
      expect(result.unavailable).toBe(2);
      expect(result.bySpecialization).toBeDefined();
    });
  });
});
