import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICalExportService } from '../ical-export.service';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { MilestoneStatus, Priority, UserRole } from '../../common/enums';
import {
  MilestoneNotFoundException,
  MilestonePermissionException,
  ICalExportException,
} from '../../common/exceptions';

describe('ICalExportService', () => {
  let service: ICalExportService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser: User = {
    id: 'user-1',
    email: 'john.doe@example.com',
    password: 'hashedpassword',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    passwordResetToken: null,
    passwordResetExpires: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockProject: Project = {
    id: 'project-1',
    title: 'Test Project',
    supervisorId: 'supervisor-1',
  } as Project;

  const mockMilestone: Milestone = {
    id: 'milestone-1',
    title: 'Literature Review',
    description: 'Complete comprehensive literature review',
    dueDate: new Date('2024-03-15'),
    status: MilestoneStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    studentId: 'user-1',
    projectId: 'project-1',
    student: mockUser,
    project: mockProject,
    estimatedHours: 40,
    actualHours: 20,
    blockingReason: null,
    completedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    isTemplate: false,
    templateId: null,
    notes: [],
    reminders: [],
    isOverdue: jest.fn().mockReturnValue(false),
    getDaysUntilDue: jest.fn().mockReturnValue(30),
    canTransitionTo: jest.fn().mockReturnValue(true),
    getProgressPercentage: jest.fn().mockReturnValue(50),
  };

  const mockQueryBuilder = {
    createQueryBuilder: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ICalExportService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
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

    service = module.get<ICalExportService>(ICalExportService);
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportStudentMilestones', () => {
    it('should export milestones for a valid student', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([mockMilestone]);

      // Act
      const result = await service.exportStudentMilestones('user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.calendar).toContain('BEGIN:VCALENDAR');
      expect(result.calendar).toContain('Literature Review');
      expect(result.filename).toContain('john-doe');
      expect(result.mimeType).toBe('text/calendar');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw MilestoneNotFoundException for invalid student', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.exportStudentMilestones('invalid-user'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });

    it('should apply filters correctly', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([mockMilestone]);

      const options = {
        includeCompleted: false,
        includeCancelled: false,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
        projectId: 'project-1',
      };

      // Act
      await service.exportStudentMilestones('user-1', options);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.status != :completed',
        { completed: MilestoneStatus.COMPLETED },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.status != :cancelled',
        { cancelled: MilestoneStatus.CANCELLED },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.dueDate BETWEEN :start AND :end',
        expect.any(Object),
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'milestone.projectId = :projectId',
        { projectId: 'project-1' },
      );
    });

    it('should generate correct filename with options', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([mockMilestone]);

      const options = {
        projectId: 'project-1',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-03-31'),
        },
      };

      // Act
      const result = await service.exportStudentMilestones('user-1', options);

      // Assert
      expect(result.filename).toContain('john-doe');
      expect(result.filename).toContain('project-project-1');
      expect(result.filename).toContain('2024-01-01-to-2024-03-31');
      expect(result.filename).toMatch(/\.ics$/);
    });
  });

  describe('exportSingleMilestone', () => {
    it('should export a single milestone for the owner', async () => {
      // Arrange
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act
      const result = await service.exportSingleMilestone(
        'milestone-1',
        'user-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.calendar).toContain('BEGIN:VCALENDAR');
      expect(result.calendar).toContain('Literature Review');
      expect(result.filename).toContain('milestone-Literature-Review');
      expect(result.mimeType).toBe('text/calendar');
    });

    it('should throw MilestoneNotFoundException for invalid milestone', async () => {
      // Arrange
      milestoneRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.exportSingleMilestone('invalid-milestone', 'user-1'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });

    it('should throw MilestonePermissionException for unauthorized user', async () => {
      // Arrange
      const unauthorizedMilestone = {
        ...mockMilestone,
        studentId: 'other-user',
        isOverdue: jest.fn().mockReturnValue(false),
        getDaysUntilDue: jest.fn().mockReturnValue(30),
        canTransitionTo: jest.fn().mockReturnValue(true),
        getProgressPercentage: jest.fn().mockReturnValue(50),
      };
      milestoneRepository.findOne.mockResolvedValue(unauthorizedMilestone);
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.exportSingleMilestone('milestone-1', 'user-1'),
      ).rejects.toThrow(MilestonePermissionException);
    });

    it('should allow admin to export any milestone', async () => {
      // Arrange
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const otherUserMilestone = {
        ...mockMilestone,
        studentId: 'other-user',
        isOverdue: jest.fn().mockReturnValue(false),
        getDaysUntilDue: jest.fn().mockReturnValue(30),
        canTransitionTo: jest.fn().mockReturnValue(true),
        getProgressPercentage: jest.fn().mockReturnValue(50),
      };

      milestoneRepository.findOne.mockResolvedValue(otherUserMilestone);
      userRepository.findOne.mockResolvedValue(adminUser);

      // Act
      const result = await service.exportSingleMilestone(
        'milestone-1',
        'user-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.calendar).toContain('Literature Review');
    });

    it('should allow supervisor to export their students milestones', async () => {
      // Arrange
      const supervisorUser = { ...mockUser, role: UserRole.SUPERVISOR };
      const supervisedMilestone = {
        ...mockMilestone,
        studentId: 'other-user',
        project: { ...mockProject, supervisorId: 'user-1' },
        isOverdue: jest.fn().mockReturnValue(false),
        getDaysUntilDue: jest.fn().mockReturnValue(30),
        canTransitionTo: jest.fn().mockReturnValue(true),
        getProgressPercentage: jest.fn().mockReturnValue(50),
      };

      milestoneRepository.findOne.mockResolvedValue(supervisedMilestone);
      userRepository.findOne.mockResolvedValue(supervisorUser);

      // Act
      const result = await service.exportSingleMilestone(
        'milestone-1',
        'user-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.calendar).toContain('Literature Review');
    });
  });

  describe('exportMultipleStudentMilestones', () => {
    it('should export milestones for multiple students as admin', async () => {
      // Arrange
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      userRepository.findOne.mockResolvedValue(adminUser);
      mockQueryBuilder.getMany.mockResolvedValue([mockMilestone]);

      // Act
      const result = await service.exportMultipleStudentMilestones(
        ['user-1', 'user-2'],
        'admin-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.calendar).toContain('BEGIN:VCALENDAR');
      expect(result.calendar).toContain('Multiple Students');
      expect(result.filename).toContain('milestones-export');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.studentId IN (:...studentIds)',
        { studentIds: ['user-1', 'user-2'] },
      );
    });

    it('should export milestones for multiple students as supervisor', async () => {
      // Arrange
      const supervisorUser = { ...mockUser, role: UserRole.SUPERVISOR };
      userRepository.findOne.mockResolvedValue(supervisorUser);
      mockQueryBuilder.getMany.mockResolvedValue([mockMilestone]);

      // Act
      const result = await service.exportMultipleStudentMilestones(
        ['user-1', 'user-2'],
        'supervisor-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.supervisorId = :supervisorId',
        { supervisorId: 'supervisor-1' },
      );
    });

    it('should throw MilestonePermissionException for student user', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.exportMultipleStudentMilestones(['user-1', 'user-2'], 'user-1'),
      ).rejects.toThrow(MilestonePermissionException);
    });

    it('should throw MilestonePermissionException for invalid requester', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.exportMultipleStudentMilestones(
          ['user-1', 'user-2'],
          'invalid-user',
        ),
      ).rejects.toThrow(MilestonePermissionException);
    });
  });

  describe('calendar generation', () => {
    it('should include milestone details in calendar events', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([mockMilestone]);

      // Act
      const result = await service.exportStudentMilestones('user-1');

      // Assert
      expect(result.calendar).toContain('SUMMARY:🔄 🟠 Literature Review');
      expect(result.calendar).toContain(
        'DESCRIPTION:Complete comprehensive literature review',
      );
      expect(result.calendar).toContain('STATUS:TENTATIVE');
    });

    it('should include reminders based on priority', async () => {
      // Arrange
      const criticalMilestone = {
        ...mockMilestone,
        priority: Priority.CRITICAL,
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([criticalMilestone]);

      // Act
      const result = await service.exportStudentMilestones('user-1');

      // Assert
      expect(result.calendar).toContain('BEGIN:VALARM');
      expect(result.calendar).toContain('TRIGGER:-P7D'); // 7 days before
      expect(result.calendar).toContain('TRIGGER:-P3D'); // 3 days before
      expect(result.calendar).toContain('TRIGGER:-P1D'); // 1 day before
    });

    it('should handle different milestone statuses correctly', async () => {
      // Arrange
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.COMPLETED,
        completedAt: new Date('2024-02-15'),
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([completedMilestone]);

      // Act
      const result = await service.exportStudentMilestones('user-1');

      // Assert
      expect(result.calendar).toContain('SUMMARY:✅');
      expect(result.calendar).toContain('STATUS:CONFIRMED');
    });

    it('should handle blocked milestones with blocking reason', async () => {
      // Arrange
      const blockedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.BLOCKED,
        blockingReason: 'Waiting for supervisor feedback',
      };
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([blockedMilestone]);

      // Act
      const result = await service.exportStudentMilestones('user-1');

      // Assert
      expect(result.calendar).toContain('SUMMARY:🚫');
      expect(result.calendar).toContain('Blocking Reason: Wai');
    });
  });

  describe('error handling', () => {
    it('should handle empty milestone list', async () => {
      // Arrange
      userRepository.findOne.mockResolvedValue(mockUser);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.exportStudentMilestones('user-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.calendar).toContain('BEGIN:VCALENDAR');
      expect(result.calendar).toContain('END:VCALENDAR');
    });
  });
});
