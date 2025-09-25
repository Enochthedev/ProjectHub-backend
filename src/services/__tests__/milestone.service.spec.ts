import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MilestoneService } from '../milestone.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneNote } from '../../entities/milestone-note.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { MilestoneCacheService } from '../milestone-cache.service';
import { MilestoneCacheInvalidationService } from '../milestone-cache-invalidation.service';
import {
  MilestoneNotFoundException,
  InvalidMilestoneStatusException,
  MilestoneValidationException,
  MilestonePermissionException,
  MilestoneDependencyException,
  AcademicCalendarException,
} from '../../common/exceptions';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { NoteType } from '../../common/enums/note-type.enum';
import {
  CreateMilestoneDto,
  UpdateMilestoneDto,
  UpdateMilestoneStatusDto,
  CreateMilestoneNoteDto,
  MilestoneFiltersDto,
} from '../../dto/milestone';

describe('MilestoneService', () => {
  let service: MilestoneService;
  let milestoneRepository: Repository<Milestone>;
  let milestoneNoteRepository: Repository<MilestoneNote>;
  let userRepository: Repository<User>;
  let projectRepository: Repository<Project>;
  let dataSource: DataSource;
  let cacheService: MilestoneCacheService;
  let cacheInvalidationService: MilestoneCacheInvalidationService;

  const mockStudent: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'student@test.com',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    password: 'hashedPassword',
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupervisor: User = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    email: 'supervisor@test.com',
    role: UserRole.SUPERVISOR,
    isEmailVerified: true,
    isActive: true,
    password: 'hashedPassword',
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProject: Partial<Project> = {
    id: '323e4567-e89b-12d3-a456-426614174000',
    title: 'Test Project',
    abstract: 'A test project',
    specialization: 'Computer Science',
    supervisorId: mockSupervisor.id,
    year: 2024,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMilestone = {
    id: '423e4567-e89b-12d3-a456-426614174000',
    title: 'Literature Review',
    description: 'Complete comprehensive literature review',
    dueDate: new Date('2026-06-15'),
    status: MilestoneStatus.NOT_STARTED,
    priority: Priority.HIGH,
    studentId: mockStudent.id,
    student: mockStudent,
    projectId: mockProject.id!,
    project: mockProject as Project,
    completedAt: null,
    estimatedHours: 40,
    actualHours: 0,
    blockingReason: null,
    isTemplate: false,
    templateId: null,
    notes: [],
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    canTransitionTo: jest.fn(),
    getProgressPercentage: jest.fn(),
    getDaysUntilDue: jest.fn(),
    isOverdue: jest.fn(),
  } as Milestone & {
    canTransitionTo: jest.Mock;
    getProgressPercentage: jest.Mock;
    getDaysUntilDue: jest.Mock;
    isOverdue: jest.Mock;
  };

  const mockQueryBuilder = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
  };

  const mockMilestoneRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockMilestoneNoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockDataSource = {
    // Mock DataSource methods if needed
  };

  const mockCacheService = {
    getCachedProgress: jest.fn(),
    setCachedProgress: jest.fn(),
    invalidateProgressCache: jest.fn(),
  };

  const mockCacheInvalidationService = {
    invalidateCachesForMilestoneCreation: jest.fn(),
    invalidateCachesForMilestoneUpdate: jest.fn(),
    invalidateCachesForMilestoneDeletion: jest.fn(),
    invalidateForStatusChange: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(MilestoneNote),
          useValue: mockMilestoneNoteRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: MilestoneCacheService,
          useValue: mockCacheService,
        },
        {
          provide: MilestoneCacheInvalidationService,
          useValue: mockCacheInvalidationService,
        },
      ],
    }).compile();

    service = module.get<MilestoneService>(MilestoneService);
    milestoneRepository = module.get<Repository<Milestone>>(
      getRepositoryToken(Milestone),
    );
    milestoneNoteRepository = module.get<Repository<MilestoneNote>>(
      getRepositoryToken(MilestoneNote),
    );
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
    dataSource = module.get<DataSource>(DataSource);
    cacheService = module.get<MilestoneCacheService>(MilestoneCacheService);
    cacheInvalidationService = module.get<MilestoneCacheInvalidationService>(
      MilestoneCacheInvalidationService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMilestone', () => {
    const validCreateDto: CreateMilestoneDto = {
      title: 'Literature Review',
      description:
        'Complete comprehensive literature review on machine learning',
      dueDate: '2026-06-15', // Use far future date
      priority: Priority.HIGH,
      estimatedHours: 40,
    };

    it('should successfully create a milestone', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockStudent);
      mockMilestoneRepository.create.mockReturnValue(mockMilestone);
      mockMilestoneRepository.save.mockResolvedValue(mockMilestone);
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockCacheInvalidationService.invalidateCachesForMilestoneCreation.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.createMilestone(
        validCreateDto,
        mockStudent.id,
      );

      // Assert
      expect(result).toEqual(mockMilestone);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockStudent.id },
      });
      expect(mockMilestoneRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: validCreateDto.title,
          description: validCreateDto.description,
          priority: validCreateDto.priority,
          estimatedHours: validCreateDto.estimatedHours,
          studentId: mockStudent.id,
          status: MilestoneStatus.NOT_STARTED,
          dueDate: expect.any(Date),
        }),
      );
      expect(mockMilestoneRepository.save).toHaveBeenCalled();
      expect(
        mockCacheInvalidationService.invalidateCachesForMilestoneCreation,
      ).toHaveBeenCalled();
    });

    it('should throw MilestoneValidationException for non-existent student', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createMilestone(validCreateDto, 'invalid-id'),
      ).rejects.toThrow(MilestoneValidationException);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'invalid-id' },
      });
    });

    it('should throw MilestoneValidationException for past due date', async () => {
      // Arrange
      const pastDateDto = { ...validCreateDto, dueDate: '2023-01-01' };
      mockUserRepository.findOne.mockResolvedValue(mockStudent);

      // Act & Assert
      await expect(
        service.createMilestone(pastDateDto, mockStudent.id),
      ).rejects.toThrow(MilestoneValidationException);
    });

    it('should validate project if projectId is provided', async () => {
      // Arrange
      const dtoWithProject = {
        ...validCreateDto,
        projectId: mockProject.id,
        dueDate: '2026-06-15',
      };
      mockUserRepository.findOne.mockResolvedValue(mockStudent);
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockMilestoneRepository.create.mockReturnValue(mockMilestone);
      mockMilestoneRepository.save.mockResolvedValue(mockMilestone);
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockCacheInvalidationService.invalidateCachesForMilestoneCreation.mockResolvedValue(
        undefined,
      );

      // Act
      await service.createMilestone(dtoWithProject, mockStudent.id);

      // Assert
      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockProject.id },
      });
    });

    it('should throw MilestoneValidationException for non-existent project', async () => {
      // Arrange
      const dtoWithProject = {
        ...validCreateDto,
        projectId: 'invalid-project-id',
      };
      mockUserRepository.findOne.mockResolvedValue(mockStudent);
      mockProjectRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createMilestone(dtoWithProject, mockStudent.id),
      ).rejects.toThrow(MilestoneValidationException);
    });

    it('should validate academic calendar', async () => {
      // Arrange
      const invalidDateDto = { ...validCreateDto, dueDate: '2025-12-25' }; // Christmas
      mockUserRepository.findOne.mockResolvedValue(mockStudent);

      // Act & Assert
      await expect(
        service.createMilestone(invalidDateDto, mockStudent.id),
      ).rejects.toThrow(AcademicCalendarException);
    });
  });

  describe('updateMilestone', () => {
    const validUpdateDto: UpdateMilestoneDto = {
      title: 'Updated Literature Review',
      description: 'Updated description',
      priority: Priority.CRITICAL,
    };

    it('should successfully update a milestone', async () => {
      // Arrange
      const milestoneToUpdate = { ...mockMilestone };
      mockMilestoneRepository.findOne.mockResolvedValue(milestoneToUpdate);
      mockMilestoneRepository.save.mockResolvedValue({
        ...milestoneToUpdate,
        ...validUpdateDto,
      });
      mockCacheInvalidationService.invalidateCachesForMilestoneUpdate.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.updateMilestone(
        mockMilestone.id,
        validUpdateDto,
        mockStudent.id,
      );

      // Assert
      expect(mockMilestoneRepository.save).toHaveBeenCalled();
      expect(
        mockCacheInvalidationService.invalidateCachesForMilestoneUpdate,
      ).toHaveBeenCalled();
    });

    it('should throw MilestoneNotFoundException for non-existent milestone', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateMilestone('invalid-id', validUpdateDto, mockStudent.id),
      ).rejects.toThrow(MilestoneNotFoundException);
    });

    it('should throw MilestonePermissionException for non-owner', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);

      // Act & Assert
      await expect(
        service.updateMilestone(
          mockMilestone.id,
          validUpdateDto,
          'other-user-id',
        ),
      ).rejects.toThrow(MilestonePermissionException);
    });

    it('should validate due date if provided in update', async () => {
      // Arrange
      const updateWithPastDate = { ...validUpdateDto, dueDate: '2023-01-01' };
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);

      // Act & Assert
      await expect(
        service.updateMilestone(
          mockMilestone.id,
          updateWithPastDate,
          mockStudent.id,
        ),
      ).rejects.toThrow(MilestoneValidationException);
    });
  });

  describe('updateMilestoneStatus', () => {
    const validStatusDto: UpdateMilestoneStatusDto = {
      status: MilestoneStatus.IN_PROGRESS,
      notes: 'Started working on literature review',
    };

    it('should successfully update milestone status', async () => {
      // Arrange
      const milestoneToUpdate = { ...mockMilestone };
      milestoneToUpdate.canTransitionTo = jest.fn().mockReturnValue(true);
      mockMilestoneRepository.findOne.mockResolvedValue(milestoneToUpdate);
      mockMilestoneRepository.save.mockResolvedValue({
        ...milestoneToUpdate,
        status: validStatusDto.status,
      });
      const mockNote = {
        id: 'note-id',
        content: 'test note',
        author: mockStudent,
      };
      mockMilestoneNoteRepository.create.mockReturnValue(mockNote);
      mockMilestoneNoteRepository.save.mockResolvedValue(mockNote);
      mockMilestoneNoteRepository.findOne.mockResolvedValue(mockNote);
      mockCacheInvalidationService.invalidateForStatusChange.mockResolvedValue(
        undefined,
      );

      // Act
      const result = await service.updateMilestoneStatus(
        mockMilestone.id,
        validStatusDto,
        mockStudent.id,
      );

      // Assert
      expect(milestoneToUpdate.canTransitionTo).toHaveBeenCalledWith(
        validStatusDto.status,
      );
      expect(mockMilestoneRepository.save).toHaveBeenCalled();
      expect(
        mockCacheInvalidationService.invalidateForStatusChange,
      ).toHaveBeenCalled();
    });

    it('should throw InvalidMilestoneStatusException for invalid transition', async () => {
      // Arrange
      const milestoneToUpdate = { ...mockMilestone };
      milestoneToUpdate.canTransitionTo = jest.fn().mockReturnValue(false);
      mockMilestoneRepository.findOne.mockResolvedValue(milestoneToUpdate);

      // Act & Assert
      await expect(
        service.updateMilestoneStatus(
          mockMilestone.id,
          validStatusDto,
          mockStudent.id,
        ),
      ).rejects.toThrow(InvalidMilestoneStatusException);
    });

    it('should set completion date when marking as completed', async () => {
      // Arrange
      const completionDto: UpdateMilestoneStatusDto = {
        status: MilestoneStatus.COMPLETED,
        actualHours: 35,
        notes: 'Literature review completed',
      };
      const milestoneToUpdate = { ...mockMilestone };
      milestoneToUpdate.canTransitionTo = jest.fn().mockReturnValue(true);
      mockMilestoneRepository.findOne.mockResolvedValue(milestoneToUpdate);
      mockMilestoneRepository.save.mockResolvedValue(milestoneToUpdate);
      const mockNote = {
        id: 'note-id',
        content: 'test note',
        author: mockStudent,
      };
      mockMilestoneNoteRepository.create.mockReturnValue(mockNote);
      mockMilestoneNoteRepository.save.mockResolvedValue(mockNote);
      mockMilestoneNoteRepository.findOne.mockResolvedValue(mockNote);
      mockCacheInvalidationService.invalidateForStatusChange.mockResolvedValue(
        undefined,
      );

      // Act
      await service.updateMilestoneStatus(
        mockMilestone.id,
        completionDto,
        mockStudent.id,
      );

      // Assert
      expect(milestoneToUpdate.completedAt).toBeDefined();
      expect(milestoneToUpdate.actualHours).toBe(35);
    });

    it('should require blocking reason when marking as blocked', async () => {
      // Arrange
      const blockedDto: UpdateMilestoneStatusDto = {
        status: MilestoneStatus.BLOCKED,
        // Missing blockingReason
      };
      const milestoneToUpdate = { ...mockMilestone };
      milestoneToUpdate.canTransitionTo = jest.fn().mockReturnValue(true);
      mockMilestoneRepository.findOne.mockResolvedValue(milestoneToUpdate);

      // Act & Assert
      await expect(
        service.updateMilestoneStatus(
          mockMilestone.id,
          blockedDto,
          mockStudent.id,
        ),
      ).rejects.toThrow(MilestoneValidationException);
    });

    it('should handle blocking status with reason', async () => {
      // Arrange
      const blockedDto: UpdateMilestoneStatusDto = {
        status: MilestoneStatus.BLOCKED,
        blockingReason: 'Waiting for supervisor feedback',
        notes: 'Cannot proceed without guidance',
      };
      const milestoneToUpdate = { ...mockMilestone };
      milestoneToUpdate.canTransitionTo = jest.fn().mockReturnValue(true);
      mockMilestoneRepository.findOne.mockResolvedValue(milestoneToUpdate);
      mockMilestoneRepository.save.mockResolvedValue(milestoneToUpdate);
      const mockNote = {
        id: 'note-id',
        content: 'test note',
        author: mockStudent,
      };
      mockMilestoneNoteRepository.create.mockReturnValue(mockNote);
      mockMilestoneNoteRepository.save.mockResolvedValue(mockNote);
      mockMilestoneNoteRepository.findOne.mockResolvedValue(mockNote);
      mockCacheInvalidationService.invalidateForStatusChange.mockResolvedValue(
        undefined,
      );

      // Act
      await service.updateMilestoneStatus(
        mockMilestone.id,
        blockedDto,
        mockStudent.id,
      );

      // Assert
      expect(milestoneToUpdate.blockingReason).toBe(blockedDto.blockingReason);
      expect(milestoneToUpdate.status).toBe(MilestoneStatus.BLOCKED);
    });
  });

  describe('deleteMilestone', () => {
    it('should successfully delete a milestone', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockMilestoneNoteRepository.count.mockResolvedValue(0);
      mockMilestoneRepository.remove.mockResolvedValue(mockMilestone);
      mockCacheInvalidationService.invalidateCachesForMilestoneDeletion.mockResolvedValue(
        undefined,
      );

      // Act
      await service.deleteMilestone(mockMilestone.id, mockStudent.id);

      // Assert
      expect(mockMilestoneRepository.remove).toHaveBeenCalledWith(
        mockMilestone,
      );
      expect(
        mockCacheInvalidationService.invalidateCachesForMilestoneDeletion,
      ).toHaveBeenCalled();
    });

    it('should throw MilestoneDependencyException when milestone has notes', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockMilestoneNoteRepository.count.mockResolvedValue(3);

      // Act & Assert
      await expect(
        service.deleteMilestone(mockMilestone.id, mockStudent.id),
      ).rejects.toThrow(MilestoneDependencyException);
    });

    it('should throw MilestoneNotFoundException for non-existent milestone', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteMilestone('invalid-id', mockStudent.id),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });

  describe('getStudentMilestones', () => {
    const mockQueryBuilder = {
      createQueryBuilder: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      mockMilestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder,
      );
    });

    it('should get milestones with default pagination', async () => {
      // Arrange
      const milestones = [mockMilestone];
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(milestones);

      // Act
      const result = await service.getStudentMilestones(mockStudent.id);

      // Assert
      expect(result).toEqual({ milestones, total: 1 });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.studentId = :studentId',
        {
          studentId: mockStudent.id,
        },
      );
    });

    it('should apply status filter', async () => {
      // Arrange
      const filters: MilestoneFiltersDto = {
        status: MilestoneStatus.IN_PROGRESS,
      };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getStudentMilestones(mockStudent.id, filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.status = :status',
        {
          status: MilestoneStatus.IN_PROGRESS,
        },
      );
    });

    it('should apply priority filter', async () => {
      // Arrange
      const filters: MilestoneFiltersDto = { priority: Priority.HIGH };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getStudentMilestones(mockStudent.id, filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.priority = :priority',
        {
          priority: Priority.HIGH,
        },
      );
    });

    it('should apply search filter', async () => {
      // Arrange
      const filters: MilestoneFiltersDto = { search: 'literature' };
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getStudentMilestones(mockStudent.id, filters);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(milestone.title ILIKE :search OR milestone.description ILIKE :search)',
        { search: '%literature%' },
      );
    });

    it('should apply pagination', async () => {
      // Arrange
      const filters: MilestoneFiltersDto = { page: 2, limit: 10 };
      mockQueryBuilder.getCount.mockResolvedValue(25);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.getStudentMilestones(mockStudent.id, filters);

      // Assert
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10); // (page - 1) * limit
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('getMilestoneById', () => {
    it('should return milestone for owner', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockUserRepository.findOne.mockResolvedValue(mockStudent);

      // Act
      const result = await service.getMilestoneById(
        mockMilestone.id,
        mockStudent.id,
      );

      // Assert
      expect(result).toEqual(mockMilestone);
    });

    it('should return milestone for admin', async () => {
      // Arrange
      const adminUser = { ...mockStudent, role: UserRole.ADMIN };
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockUserRepository.findOne.mockResolvedValue(adminUser);

      // Act
      const result = await service.getMilestoneById(
        mockMilestone.id,
        adminUser.id,
      );

      // Assert
      expect(result).toEqual(mockMilestone);
    });

    it('should throw MilestoneNotFoundException for non-existent milestone', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getMilestoneById('invalid-id', mockStudent.id),
      ).rejects.toThrow(MilestoneNotFoundException);
    });

    it('should throw MilestonePermissionException for unauthorized access', async () => {
      // Arrange
      const otherStudent = { ...mockStudent, id: 'other-student-id' };
      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockUserRepository.findOne.mockResolvedValue(otherStudent);

      // Act & Assert
      await expect(
        service.getMilestoneById(mockMilestone.id, otherStudent.id),
      ).rejects.toThrow(MilestonePermissionException);
    });
  });

  describe('addMilestoneNote', () => {
    const validNoteDto: CreateMilestoneNoteDto = {
      content: 'Found 15 relevant papers on machine learning in education',
      type: NoteType.PROGRESS,
    };

    it('should successfully add a note to milestone', async () => {
      // Arrange
      const mockNote = {
        id: 'note-id',
        content: validNoteDto.content,
        type: validNoteDto.type,
        milestoneId: mockMilestone.id,
        authorId: mockStudent.id,
        author: mockStudent,
        createdAt: new Date(),
      };

      mockMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      mockUserRepository.findOne.mockResolvedValue(mockStudent);
      mockMilestoneNoteRepository.create.mockReturnValue(mockNote);
      mockMilestoneNoteRepository.save.mockResolvedValue(mockNote);
      mockMilestoneNoteRepository.findOne.mockResolvedValue(mockNote);

      // Act
      const result = await service.addMilestoneNote(
        mockMilestone.id,
        validNoteDto,
        mockStudent.id,
      );

      // Assert
      expect(result).toEqual(mockNote);
      expect(mockMilestoneNoteRepository.create).toHaveBeenCalledWith({
        ...validNoteDto,
        milestoneId: mockMilestone.id,
        authorId: mockStudent.id,
      });
    });

    it('should throw MilestoneNotFoundException for non-existent milestone', async () => {
      // Arrange
      mockMilestoneRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addMilestoneNote('invalid-id', validNoteDto, mockStudent.id),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });

  describe('calculateProjectProgress', () => {
    it('should return cached progress if available', async () => {
      // Arrange
      const cachedProgress = {
        overallProgress: 50,
        totalMilestones: 2,
        completedMilestones: 1,
        inProgressMilestones: 1,
        blockedMilestones: 0,
        overdueMilestones: 0,
        estimatedCompletionDate: '2024-07-01',
        progressVelocity: 0.5,
        milestones: [],
        nextMilestone: null,
      };
      mockCacheService.getCachedProgress.mockResolvedValue(cachedProgress);

      // Act
      const result = await service.calculateProjectProgress(mockStudent.id);

      // Assert
      expect(result).toEqual(cachedProgress);
      expect(mockCacheService.getCachedProgress).toHaveBeenCalledWith(
        mockStudent.id,
      );
    });

    it('should calculate progress when no cache available', async () => {
      // Arrange
      const milestones = [
        {
          ...mockMilestone,
          status: MilestoneStatus.COMPLETED,
          completedAt: new Date('2024-05-01'),
          getProgressPercentage: jest.fn().mockReturnValue(100),
          isOverdue: jest.fn().mockReturnValue(false),
        },
        {
          ...mockMilestone,
          id: 'milestone-2',
          status: MilestoneStatus.IN_PROGRESS,
          completedAt: null,
          getProgressPercentage: jest.fn().mockReturnValue(50),
          isOverdue: jest.fn().mockReturnValue(false),
        },
      ];

      mockCacheService.getCachedProgress.mockResolvedValue(null);
      mockMilestoneRepository.find.mockResolvedValue(milestones);
      mockCacheService.setCachedProgress.mockResolvedValue(undefined);

      // Act
      const result = await service.calculateProjectProgress(mockStudent.id);

      // Assert
      expect(result.totalMilestones).toBe(2);
      expect(result.completedMilestones).toBe(1);
      expect(result.inProgressMilestones).toBe(1);
      expect(result.overallProgress).toBe(75); // (100 + 50) / 2
      expect(mockCacheService.setCachedProgress).toHaveBeenCalled();
    });

    it('should return empty progress for student with no milestones', async () => {
      // Arrange
      mockCacheService.getCachedProgress.mockResolvedValue(null);
      mockMilestoneRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.calculateProjectProgress(mockStudent.id);

      // Assert
      expect(result.totalMilestones).toBe(0);
      expect(result.overallProgress).toBe(0);
      expect(result.nextMilestone).toBeNull();
    });
  });
});
