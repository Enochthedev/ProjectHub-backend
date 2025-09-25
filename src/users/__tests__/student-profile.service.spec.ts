import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StudentProfileService } from '../student-profile.service';
import { StudentProfile } from '../../entities/student-profile.entity';
import { User } from '../../entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateStudentProfileDto } from '../../dto/profile/update-student-profile.dto';

describe('StudentProfileService', () => {
  let service: StudentProfileService;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-123',
    email: 'student@ui.edu.ng',
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

  const mockStudentProfile: StudentProfile = {
    id: 'profile-123',
    name: 'John Doe',
    skills: ['JavaScript', 'Python'],
    interests: ['Web Development', 'AI'],
    preferredSpecializations: ['Web Development & Full Stack'],
    currentYear: 4,
    gpa: 4.5,
    user: mockUser,
    profileUpdatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentProfileService,
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            findAndCount: jest.fn(),
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

    service = module.get<StudentProfileService>(StudentProfileService);
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStudentProfile', () => {
    it('should return student profile when user exists', async () => {
      const userWithProfile = {
        ...mockUser,
        studentProfile: mockStudentProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      const result = await service.getStudentProfile('user-123');

      expect(result).toEqual(mockStudentProfile);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123', role: UserRole.STUDENT },
        relations: ['studentProfile'],
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getStudentProfile('user-123')).rejects.toThrow(
        new NotFoundException('Student user not found'),
      );
    });

    it('should throw NotFoundException when student profile does not exist', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.getStudentProfile('user-123')).rejects.toThrow(
        new NotFoundException('Student profile not found'),
      );
    });
  });

  describe('createStudentProfile', () => {
    const validProfileData: UpdateStudentProfileDto = {
      name: 'John Doe',
      skills: ['JavaScript', 'Python'],
      interests: ['Web Development'],
      preferredSpecializations: ['Web Development & Full Stack'],
      currentYear: 4,
      gpa: 4.5,
    };

    it('should create student profile successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      studentProfileRepository.create.mockReturnValue(mockStudentProfile);
      studentProfileRepository.save.mockResolvedValue(mockStudentProfile);

      const result = await service.createStudentProfile(
        'user-123',
        validProfileData,
      );

      expect(result).toEqual(mockStudentProfile);
      expect(studentProfileRepository.create).toHaveBeenCalledWith({
        ...validProfileData,
        user: mockUser,
      });
      expect(studentProfileRepository.save).toHaveBeenCalledWith(
        mockStudentProfile,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createStudentProfile('user-123', validProfileData),
      ).rejects.toThrow(new NotFoundException('Student user not found'));
    });

    it('should throw BadRequestException when profile already exists', async () => {
      const userWithProfile = {
        ...mockUser,
        studentProfile: mockStudentProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      await expect(
        service.createStudentProfile('user-123', validProfileData),
      ).rejects.toThrow(
        new BadRequestException('Student profile already exists'),
      );
    });

    it('should throw BadRequestException for invalid specializations', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        preferredSpecializations: ['Invalid Specialization'],
      };

      await expect(
        service.createStudentProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid skills array', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        skills: ['', 'Valid Skill'], // Empty string should be invalid
      };

      await expect(
        service.createStudentProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate skills', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const invalidData = {
        ...validProfileData,
        skills: ['JavaScript', 'javascript'], // Case-insensitive duplicates
      };

      await expect(
        service.createStudentProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for too many skills', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const tooManySkills = Array.from(
        { length: 21 },
        (_, i) => `Skill ${i + 1}`,
      );
      const invalidData = {
        ...validProfileData,
        skills: tooManySkills,
      };

      await expect(
        service.createStudentProfile('user-123', invalidData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStudentProfile', () => {
    const updateData: UpdateStudentProfileDto = {
      name: 'Jane Doe',
      skills: ['TypeScript', 'React'],
    };

    it('should update student profile successfully', async () => {
      const userWithProfile = {
        ...mockUser,
        studentProfile: mockStudentProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);

      const updatedProfile = { ...mockStudentProfile, ...updateData };
      studentProfileRepository.save.mockResolvedValue(updatedProfile);

      const result = await service.updateStudentProfile('user-123', updateData);

      expect(result).toEqual(updatedProfile);
      expect(studentProfileRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStudentProfile('user-123', updateData),
      ).rejects.toThrow(new NotFoundException('Student user not found'));
    });
  });

  describe('deleteStudentProfile', () => {
    it('should delete student profile successfully', async () => {
      const userWithProfile = {
        ...mockUser,
        studentProfile: mockStudentProfile,
      };
      userRepository.findOne.mockResolvedValue(userWithProfile);
      studentProfileRepository.remove.mockResolvedValue(mockStudentProfile);

      await service.deleteStudentProfile('user-123');

      expect(studentProfileRepository.remove).toHaveBeenCalledWith(
        mockStudentProfile,
      );
    });

    it('should throw NotFoundException when profile does not exist', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteStudentProfile('user-123')).rejects.toThrow(
        new NotFoundException('Student user not found'),
      );
    });
  });

  describe('getAllStudentProfiles', () => {
    it('should return paginated student profiles', async () => {
      const profiles = [mockStudentProfile];
      studentProfileRepository.findAndCount.mockResolvedValue([profiles, 1]);

      const result = await service.getAllStudentProfiles(1, 10);

      expect(result).toEqual({ profiles, total: 1 });
      expect(studentProfileRepository.findAndCount).toHaveBeenCalledWith({
        relations: ['user'],
        skip: 0,
        take: 10,
        order: { profileUpdatedAt: 'DESC' },
      });
    });
  });

  describe('searchStudentProfiles', () => {
    it('should search student profiles by term', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockStudentProfile], 1]),
      } as any;

      studentProfileRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );

      const result = await service.searchStudentProfiles('JavaScript', 1, 10);

      expect(result).toEqual({ profiles: [mockStudentProfile], total: 1 });
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('getStudentsBySpecialization', () => {
    it('should return students by valid specialization', async () => {
      const profiles = [mockStudentProfile];
      studentProfileRepository.findAndCount.mockResolvedValue([profiles, 1]);

      const result = await service.getStudentsBySpecialization(
        'Web Development & Full Stack',
        1,
        10,
      );

      expect(result).toEqual({ profiles, total: 1 });
    });

    it('should throw BadRequestException for invalid specialization', async () => {
      await expect(
        service.getStudentsBySpecialization('Invalid Specialization', 1, 10),
      ).rejects.toThrow(new BadRequestException('Invalid specialization'));
    });
  });
});
