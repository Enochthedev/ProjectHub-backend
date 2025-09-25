import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SharedMilestoneService } from '../shared-milestone.service';
import {
  SharedMilestone,
  SharedMilestoneAssignment,
  User,
  Project,
} from '../../entities';
import { MilestoneStatus, Priority, UserRole } from '../../common/enums';
import {
  CreateSharedMilestoneDto,
  UpdateSharedMilestoneStatusDto,
} from '../../dto/milestone';

describe('SharedMilestoneService', () => {
  let service: SharedMilestoneService;
  let sharedMilestoneRepository: jest.Mocked<Repository<SharedMilestone>>;
  let assignmentRepository: jest.Mocked<Repository<SharedMilestoneAssignment>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    studentProfile: {
      id: 'profile-1',
      name: 'John Doe',
      skills: ['JavaScript', 'Python'],
      interests: ['AI', 'Web Development'],
      preferredSpecializations: ['Computer Science'],
      currentYear: 4,
      gpa: 3.5,
      user: {} as User,
      profileUpdatedAt: new Date(),
    },
  };

  const mockProject: Project = {
    id: 'project-1',
    title: 'Test Project',
    abstract: 'Test abstract',
    specialization: 'Computer Science',
    difficultyLevel: 'intermediate' as any,
    year: 2024,
    tags: ['web', 'api'],
    technologyStack: ['Node.js', 'React'],
    isGroupProject: true,
    approvalStatus: 'approved' as any,
    githubUrl: null,
    demoUrl: null,
    notes: null,
    supervisor: mockUser,
    supervisorId: 'user-1',
    bookmarks: [],
    views: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: new Date(),
    approvedBy: 'user-1',
    searchVector: '',
  };

  const mockSharedMilestone = {
    id: 'milestone-1',
    title: 'Test Milestone',
    description: 'Test description',
    dueDate: new Date('2024-12-31'),
    status: MilestoneStatus.NOT_STARTED,
    priority: Priority.HIGH,
    createdBy: mockUser,
    createdById: 'user-1',
    project: mockProject,
    projectId: 'project-1',
    assignees: [mockUser],
    assignments: [],
    notes: [],
    reminders: [],
    completedAt: null,
    estimatedHours: 10,
    actualHours: 0,
    blockingReason: null,
    requiresAllApproval: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: jest.fn().mockReturnValue(false),
    getDaysUntilDue: jest.fn().mockReturnValue(30),
    canTransitionTo: jest.fn().mockReturnValue(true),
    getProgressPercentage: jest.fn().mockReturnValue(0),
    isAssignedTo: jest.fn().mockReturnValue(true),
    canBeCompletedBy: jest.fn().mockReturnValue(true),
    getAssignmentForUser: jest.fn().mockReturnValue(undefined),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharedMilestoneService,
        {
          provide: getRepositoryToken(SharedMilestone),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SharedMilestoneAssignment),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SharedMilestoneService>(SharedMilestoneService);
    sharedMilestoneRepository = module.get(getRepositoryToken(SharedMilestone));
    assignmentRepository = module.get(
      getRepositoryToken(SharedMilestoneAssignment),
    );
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
  });

  describe('createSharedMilestone', () => {
    const createDto: CreateSharedMilestoneDto = {
      title: 'Test Milestone',
      description: 'Test description',
      dueDate: '2024-12-31',
      priority: Priority.HIGH,
      projectId: 'project-1',
      assigneeIds: ['user-1'],
      estimatedHours: 10,
      requiresAllApproval: false,
    };

    it('should create a shared milestone successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.find.mockResolvedValue([mockUser]);
      sharedMilestoneRepository.create.mockReturnValue(mockSharedMilestone);
      sharedMilestoneRepository.save.mockResolvedValue(mockSharedMilestone);
      sharedMilestoneRepository.findOne.mockResolvedValue(mockSharedMilestone);

      const result = await service.createSharedMilestone(createDto, 'user-1');

      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-1' },
      });
      expect(userRepository.find).toHaveBeenCalledWith({
        where: { id: expect.anything() },
        relations: ['studentProfile'],
      });
      expect(sharedMilestoneRepository.create).toHaveBeenCalled();
      expect(sharedMilestoneRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createSharedMilestone(createDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if project is not a group project', async () => {
      const individualProject = { ...mockProject, isGroupProject: false };
      projectRepository.findOne.mockResolvedValue(individualProject);

      await expect(
        service.createSharedMilestone(createDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if assignees not found', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      userRepository.find.mockResolvedValue([]);

      await expect(
        service.createSharedMilestone(createDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSharedMilestoneById', () => {
    it('should return shared milestone by id', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(mockSharedMilestone);

      const result = await service.getSharedMilestoneById('milestone-1');

      expect(sharedMilestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        relations: expect.any(Array),
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('milestone-1');
    });

    it('should throw NotFoundException if milestone not found', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getSharedMilestoneById('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSharedMilestoneStatus', () => {
    const updateDto: UpdateSharedMilestoneStatusDto = {
      status: MilestoneStatus.COMPLETED,
      actualHours: 12,
    };

    it('should update milestone status successfully', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(mockSharedMilestone);
      sharedMilestoneRepository.save.mockResolvedValue(mockSharedMilestone);

      const result = await service.updateSharedMilestoneStatus(
        'milestone-1',
        updateDto,
        'user-1',
      );

      expect(sharedMilestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        relations: ['assignees', 'assignments'],
      });
      expect(sharedMilestoneRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if milestone not found', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSharedMilestoneStatus('nonexistent', updateDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user cannot complete milestone', async () => {
      const milestone = {
        ...mockSharedMilestone,
        canBeCompletedBy: jest.fn().mockReturnValue(false),
      } as any;
      sharedMilestoneRepository.findOne.mockResolvedValue(milestone);

      await expect(
        service.updateSharedMilestoneStatus('milestone-1', updateDto, 'user-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const milestone = {
        ...mockSharedMilestone,
        canTransitionTo: jest.fn().mockReturnValue(false),
      } as any;
      sharedMilestoneRepository.findOne.mockResolvedValue(milestone);

      await expect(
        service.updateSharedMilestoneStatus('milestone-1', updateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSharedMilestone', () => {
    it('should delete milestone successfully', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(mockSharedMilestone);
      sharedMilestoneRepository.remove.mockResolvedValue(mockSharedMilestone);

      await service.deleteSharedMilestone('milestone-1', 'user-1');

      expect(sharedMilestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
      });
      expect(sharedMilestoneRepository.remove).toHaveBeenCalledWith(
        mockSharedMilestone,
      );
    });

    it('should throw NotFoundException if milestone not found', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteSharedMilestone('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not creator', async () => {
      const milestone = {
        ...mockSharedMilestone,
        createdById: 'other-user',
      } as any;
      sharedMilestoneRepository.findOne.mockResolvedValue(milestone);

      await expect(
        service.deleteSharedMilestone('milestone-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getSharedMilestonesByProject', () => {
    it('should return milestones for a project', async () => {
      sharedMilestoneRepository.find.mockResolvedValue([mockSharedMilestone]);

      const result = await service.getSharedMilestonesByProject('project-1');

      expect(sharedMilestoneRepository.find).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        relations: expect.any(Array),
        order: { dueDate: 'ASC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getSharedMilestonesByUser', () => {
    it('should return milestones for a user', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSharedMilestone]),
      } as any;

      sharedMilestoneRepository.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.getSharedMilestonesByUser('user-1');

      expect(sharedMilestoneRepository.createQueryBuilder).toHaveBeenCalledWith(
        'milestone',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'assignees.id = :userId',
        { userId: 'user-1' },
      );
      expect(result).toHaveLength(1);
    });
  });
});
