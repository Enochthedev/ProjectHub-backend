import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MilestoneAccessControlService,
  AccessContext,
} from '../milestone-access-control.service';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  MilestoneNotFoundException,
  MilestoneOwnershipException,
  MilestonePermissionException,
} from '../../common/exceptions/milestone.exception';

describe('MilestoneAccessControlService', () => {
  let service: MilestoneAccessControlService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;

  const mockStudent: User = {
    id: 'student-123',
    role: UserRole.STUDENT,
    email: 'student@example.com',
  } as User;

  const mockSupervisor: User = {
    id: 'supervisor-123',
    role: UserRole.SUPERVISOR,
    email: 'supervisor@example.com',
  } as User;

  const mockProject: Project = {
    id: 'project-123',
    title: 'Test Project',
    supervisor: mockSupervisor,
    students: [mockStudent],
  } as Project;

  const mockMilestone: Milestone = {
    id: 'milestone-123',
    title: 'Test Milestone',
    studentId: 'student-123',
    student: mockStudent,
    project: mockProject,
    projectId: 'project-123',
  } as Milestone;

  const studentContext: AccessContext = {
    userId: 'student-123',
    userRole: UserRole.STUDENT,
    supervisorId: 'supervisor-123',
    projectIds: ['project-123'],
  };

  const supervisorContext: AccessContext = {
    userId: 'supervisor-123',
    userRole: UserRole.SUPERVISOR,
    projectIds: ['project-123'],
  };

  const adminContext: AccessContext = {
    userId: 'admin-123',
    userRole: UserRole.ADMIN,
    projectIds: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneAccessControlService,
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<MilestoneAccessControlService>(
      MilestoneAccessControlService,
    );
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkMilestoneAccess', () => {
    it('should allow read access for milestone owner', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        studentContext,
        'read',
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow write access for milestone owner', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        studentContext,
        'write',
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow delete access for milestone owner', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        studentContext,
        'delete',
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow read access for supervisor', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        supervisorContext,
        'read',
      );

      expect(hasAccess).toBe(true);
    });

    it('should deny write access for supervisor', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        supervisorContext,
        'write',
      );

      expect(hasAccess).toBe(false);
    });

    it('should allow reminder management for supervisor', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        supervisorContext,
        'manage_reminders',
      );

      expect(hasAccess).toBe(true);
    });

    it('should allow all access for admin', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const readAccess = await service.checkMilestoneAccess(
        'milestone-123',
        adminContext,
        'read',
      );
      const writeAccess = await service.checkMilestoneAccess(
        'milestone-123',
        adminContext,
        'write',
      );
      const deleteAccess = await service.checkMilestoneAccess(
        'milestone-123',
        adminContext,
        'delete',
      );

      expect(readAccess).toBe(true);
      expect(writeAccess).toBe(true);
      expect(deleteAccess).toBe(true);
    });

    it('should deny access for non-related user', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const otherUserContext: AccessContext = {
        userId: 'other-user-123',
        userRole: UserRole.STUDENT,
        projectIds: [],
      };

      const hasAccess = await service.checkMilestoneAccess(
        'milestone-123',
        otherUserContext,
        'read',
      );

      expect(hasAccess).toBe(false);
    });

    it('should handle milestone not found', async () => {
      milestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.checkMilestoneAccess('nonexistent-123', studentContext, 'read'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });

  describe('getMilestonePermissions', () => {
    it('should return detailed permissions for milestone owner', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const permissions = await service.getMilestonePermissions(
        'milestone-123',
        studentContext,
      );

      expect(permissions.canRead).toBe(true);
      expect(permissions.canWrite).toBe(true);
      expect(permissions.canDelete).toBe(true);
      expect(permissions.canManageReminders).toBe(true);
      expect(permissions.reason).toBe('Owner access');
    });

    it('should return limited permissions for supervisor', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const permissions = await service.getMilestonePermissions(
        'milestone-123',
        supervisorContext,
      );

      expect(permissions.canRead).toBe(true);
      expect(permissions.canWrite).toBe(false);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canManageReminders).toBe(true);
      expect(permissions.reason).toBe('Supervisor access');
    });

    it('should return full permissions for admin', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const permissions = await service.getMilestonePermissions(
        'milestone-123',
        adminContext,
      );

      expect(permissions.canRead).toBe(true);
      expect(permissions.canWrite).toBe(true);
      expect(permissions.canDelete).toBe(true);
      expect(permissions.canManageReminders).toBe(true);
      expect(permissions.reason).toBe('Admin access');
    });

    it('should return no permissions for unauthorized user', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const otherUserContext: AccessContext = {
        userId: 'other-user-123',
        userRole: UserRole.STUDENT,
        projectIds: [],
      };

      const permissions = await service.getMilestonePermissions(
        'milestone-123',
        otherUserContext,
      );

      expect(permissions.canRead).toBe(false);
      expect(permissions.canWrite).toBe(false);
      expect(permissions.canDelete).toBe(false);
      expect(permissions.canManageReminders).toBe(false);
      expect(permissions.reason).toBe('No access permissions');
    });
  });

  describe('validateOwnership', () => {
    it('should validate ownership for milestone owner', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      await expect(
        service.validateOwnership('milestone-123', 'student-123'),
      ).resolves.not.toThrow();
    });

    it('should throw exception for non-owner', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      await expect(
        service.validateOwnership('milestone-123', 'other-user-123'),
      ).rejects.toThrow(MilestoneOwnershipException);
    });

    it('should throw exception for nonexistent milestone', async () => {
      milestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateOwnership('nonexistent-123', 'student-123'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });

  describe('validateSupervisorAccess', () => {
    it('should validate supervisor access for supervised project', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      await expect(
        service.validateSupervisorAccess('milestone-123', 'supervisor-123'),
      ).resolves.not.toThrow();
    });

    it('should validate supervisor access for supervised student', async () => {
      const milestoneWithStudentSupervisor = {
        ...mockMilestone,
        project: null,
        student: {
          ...mockStudent,
          supervisorProfile: { id: 'supervisor-123' },
        },
      };

      milestoneRepository.findOne.mockResolvedValue(
        milestoneWithStudentSupervisor,
      );
      userRepository.findOne.mockResolvedValue({
        ...mockStudent,
        supervisorProfile: { id: 'supervisor-123' },
      } as any);

      await expect(
        service.validateSupervisorAccess('milestone-123', 'supervisor-123'),
      ).resolves.not.toThrow();
    });

    it('should throw exception for non-supervisor', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      await expect(
        service.validateSupervisorAccess(
          'milestone-123',
          'other-supervisor-123',
        ),
      ).rejects.toThrow(MilestonePermissionException);
    });

    it('should throw exception for nonexistent milestone', async () => {
      milestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.validateSupervisorAccess('nonexistent-123', 'supervisor-123'),
      ).rejects.toThrow(MilestoneNotFoundException);
    });
  });

  describe('canCreateMilestone', () => {
    it('should allow admin to create milestones for any project', async () => {
      const canCreate = await service.canCreateMilestone(
        'project-123',
        adminContext,
      );
      expect(canCreate).toBe(true);
    });

    it('should allow student to create personal milestones', async () => {
      const canCreate = await service.canCreateMilestone(null, studentContext);
      expect(canCreate).toBe(true);
    });

    it('should allow student to create milestones for their project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const canCreate = await service.canCreateMilestone(
        'project-123',
        studentContext,
      );
      expect(canCreate).toBe(true);
    });

    it('should deny student creating milestones for other projects', async () => {
      const otherProject = {
        ...mockProject,
        id: 'other-project-123',
        students: [],
      };

      projectRepository.findOne.mockResolvedValue(otherProject);

      const canCreate = await service.canCreateMilestone(
        'other-project-123',
        studentContext,
      );
      expect(canCreate).toBe(false);
    });

    it('should allow supervisor to create milestones for supervised projects', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const canCreate = await service.canCreateMilestone(
        'project-123',
        supervisorContext,
      );
      expect(canCreate).toBe(true);
    });

    it('should deny supervisor creating milestones for non-supervised projects', async () => {
      const otherProject = {
        ...mockProject,
        id: 'other-project-123',
        supervisor: { id: 'other-supervisor-123' },
      };

      projectRepository.findOne.mockResolvedValue(otherProject);

      const canCreate = await service.canCreateMilestone(
        'other-project-123',
        supervisorContext,
      );
      expect(canCreate).toBe(false);
    });

    it('should handle nonexistent project', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      const canCreate = await service.canCreateMilestone(
        'nonexistent-123',
        studentContext,
      );
      expect(canCreate).toBe(false);
    });
  });

  describe('getAccessibleMilestoneIds', () => {
    it('should return all milestone IDs for admin', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'milestone-1' },
            { id: 'milestone-2' },
            { id: 'milestone-3' },
          ]),
      };

      milestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const accessibleIds =
        await service.getAccessibleMilestoneIds(adminContext);

      expect(accessibleIds).toEqual([
        'milestone-1',
        'milestone-2',
        'milestone-3',
      ]);
      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledTimes(4);
    });

    it('should return student milestones for student user', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'milestone-1' }, { id: 'milestone-2' }]),
      };

      milestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const accessibleIds =
        await service.getAccessibleMilestoneIds(studentContext);

      expect(accessibleIds).toEqual(['milestone-1', 'milestone-2']);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'milestone.studentId = :userId',
        { userId: studentContext.userId },
      );
    });

    it('should return supervised milestones for supervisor', async () => {
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'milestone-1' }, { id: 'milestone-3' }]),
      };

      milestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const accessibleIds =
        await service.getAccessibleMilestoneIds(supervisorContext);

      expect(accessibleIds).toEqual(['milestone-1', 'milestone-3']);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        '(supervisor.id = :userId OR student.supervisorId = :userId)',
        { userId: supervisorContext.userId },
      );
    });
  });

  describe('bulkPermissionCheck', () => {
    it('should check permissions for multiple milestones', async () => {
      const milestoneIds = ['milestone-1', 'milestone-2', 'milestone-3'];

      // Mock getAccessibleMilestoneIds
      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest
          .fn()
          .mockResolvedValue([{ id: 'milestone-1' }, { id: 'milestone-2' }]),
      };

      milestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock individual permission checks
      milestoneRepository.findOne
        .mockResolvedValueOnce({ ...mockMilestone, id: 'milestone-1' })
        .mockResolvedValueOnce({ ...mockMilestone, id: 'milestone-2' });

      const results = await service.bulkPermissionCheck(
        milestoneIds,
        studentContext,
        'read',
      );

      expect(results['milestone-1']).toBe(true);
      expect(results['milestone-2']).toBe(true);
      expect(results['milestone-3']).toBe(false); // Not in accessible list
    });

    it('should handle errors in bulk permission check', async () => {
      const milestoneIds = ['milestone-1'];

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'milestone-1' }]),
      };

      milestoneRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      milestoneRepository.findOne.mockRejectedValue(
        new Error('Database error'),
      );

      const results = await service.bulkPermissionCheck(
        milestoneIds,
        studentContext,
        'read',
      );

      expect(results['milestone-1']).toBe(false);
    });
  });

  describe('enforceAccess', () => {
    it('should not throw when access is allowed', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      await expect(
        service.enforceAccess('milestone-123', studentContext, 'read'),
      ).resolves.not.toThrow();
    });

    it('should throw exception when access is denied', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);

      const otherUserContext: AccessContext = {
        userId: 'other-user-123',
        userRole: UserRole.STUDENT,
        projectIds: [],
      };

      await expect(
        service.enforceAccess('milestone-123', otherUserContext, 'read'),
      ).rejects.toThrow(MilestonePermissionException);
    });
  });

  describe('getUserContext', () => {
    it('should create user context from user entity', async () => {
      const mockUserEntity = {
        id: 'user-123',
        role: UserRole.STUDENT,
        supervisorProfile: null,
        studentProfile: { supervisorId: 'supervisor-123' },
        projects: [{ id: 'project-1' }, { id: 'project-2' }],
      };

      userRepository.findOne.mockResolvedValue(mockUserEntity as any);

      const context = await service.getUserContext('user-123');

      expect(context).toEqual({
        userId: 'user-123',
        userRole: UserRole.STUDENT,
        supervisorId: 'supervisor-123',
        projectIds: ['project-1', 'project-2'],
      });
    });

    it('should throw error for nonexistent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserContext('nonexistent-123')).rejects.toThrow(
        'User nonexistent-123 not found',
      );
    });
  });
});
