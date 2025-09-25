import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ProjectStatusService } from '../project-status.service';
import { ProjectAuditService } from '../project-audit.service';
import { Project } from '../../entities/project.entity';
import { ApprovalStatus, DifficultyLevel, UserRole } from '../../common/enums';

describe('ProjectStatusService', () => {
  let service: ProjectStatusService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectAuditService: jest.Mocked<ProjectAuditService>;

  const mockProject = {
    id: 'project-id',
    title: 'Test Project Title',
    abstract:
      'This is a comprehensive test project abstract that meets the minimum length requirements for validation.',
    specialization: 'Artificial Intelligence & Machine Learning',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['test', 'project'],
    technologyStack: ['React', 'Node.js'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.PENDING,
    supervisorId: 'supervisor-id',
    supervisor: {
      id: 'supervisor-id',
      isActive: true,
      role: UserRole.SUPERVISOR,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectStatusService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: ProjectAuditService,
          useValue: {
            logProjectApproval: jest.fn(),
            logProjectRejection: jest.fn(),
            logProjectArchival: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectStatusService>(ProjectStatusService);
    projectRepository = module.get(getRepositoryToken(Project));
    projectAuditService = module.get(ProjectAuditService);
  });

  describe('canTransitionStatus', () => {
    it('should allow valid status transitions', async () => {
      const result = await service.canTransitionStatus(
        mockProject,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      );

      expect(result.canTransition).toBe(true);
    });

    it('should reject invalid status transitions', async () => {
      const result = await service.canTransitionStatus(
        mockProject,
        ApprovalStatus.PENDING,
        ApprovalStatus.ARCHIVED,
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain(
        'Cannot transition from pending to archived',
      );
    });

    it('should reject transition when current status does not match', async () => {
      const approvedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
      };

      const result = await service.canTransitionStatus(
        approvedProject,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain(
        'Project status is approved, not pending',
      );
    });

    it('should reject approval for project with inactive supervisor', async () => {
      const projectWithInactiveSupervisor = {
        ...mockProject,
        supervisor: { ...mockProject.supervisor, isActive: false },
      };

      const result = await service.canTransitionStatus(
        projectWithInactiveSupervisor,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Project supervisor is not active');
    });

    it('should reject approval for project with insufficient title length', async () => {
      const projectWithShortTitle = {
        ...mockProject,
        title: 'Short',
      };

      const result = await service.canTransitionStatus(
        projectWithShortTitle,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Project title is too short');
    });

    it('should reject approval for project with insufficient abstract length', async () => {
      const projectWithShortAbstract = {
        ...mockProject,
        abstract: 'Too short',
      };

      const result = await service.canTransitionStatus(
        projectWithShortAbstract,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain('Project abstract is too short');
    });

    it('should reject approval for project without technology stack', async () => {
      const projectWithoutTech = {
        ...mockProject,
        technologyStack: [],
      };

      const result = await service.canTransitionStatus(
        projectWithoutTech,
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
      );

      expect(result.canTransition).toBe(false);
      expect(result.reason).toContain(
        'Project must specify at least one technology',
      );
    });
  });

  describe('transitionProjectStatus', () => {
    it('should successfully transition project status', async () => {
      projectRepository.findOne.mockResolvedValueOnce(mockProject);
      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      const updatedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
      };
      projectRepository.findOne.mockResolvedValueOnce(updatedProject);

      const result = await service.transitionProjectStatus(
        'project-id',
        ApprovalStatus.APPROVED,
        'admin-id',
        'Project meets all requirements',
      );

      expect(result.approvalStatus).toBe(ApprovalStatus.APPROVED);
      expect(projectRepository.update).toHaveBeenCalledWith('project-id', {
        approvalStatus: ApprovalStatus.APPROVED,
        approvedAt: expect.any(Date),
        approvedBy: 'admin-id',
        notes: 'Project meets all requirements',
      });
      expect(projectAuditService.logProjectApproval).toHaveBeenCalledWith(
        'project-id',
        'admin-id',
        'Project meets all requirements',
      );
    });

    it('should throw error for invalid transition', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      await expect(
        service.transitionProjectStatus(
          'project-id',
          ApprovalStatus.ARCHIVED,
          'admin-id',
        ),
      ).rejects.toThrow('Cannot transition from pending to archived');
    });

    it('should throw error for non-existent project', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.transitionProjectStatus(
          'invalid-id',
          ApprovalStatus.APPROVED,
          'admin-id',
        ),
      ).rejects.toThrow('Project with ID invalid-id not found');
    });
  });

  describe('bulkArchiveOldProjects', () => {
    it('should archive old approved projects', async () => {
      const oldProject1 = {
        ...mockProject,
        id: 'old-1',
        year: 2020,
        approvalStatus: ApprovalStatus.APPROVED,
      };
      const oldProject2 = {
        ...mockProject,
        id: 'old-2',
        year: 2019,
        approvalStatus: ApprovalStatus.APPROVED,
      };

      projectRepository.find.mockResolvedValue([oldProject1, oldProject2]);
      projectRepository.findOne
        .mockResolvedValueOnce(oldProject1)
        .mockResolvedValueOnce({
          ...oldProject1,
          approvalStatus: ApprovalStatus.ARCHIVED,
        })
        .mockResolvedValueOnce(oldProject2)
        .mockResolvedValueOnce({
          ...oldProject2,
          approvalStatus: ApprovalStatus.ARCHIVED,
        });

      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.bulkArchiveOldProjects('admin-id');

      expect(result).toBe(2);
      expect(projectRepository.find).toHaveBeenCalledWith({
        where: {
          approvalStatus: ApprovalStatus.APPROVED,
          year: expect.any(Object), // LessThan matcher
        },
      });
      expect(projectAuditService.logProjectArchival).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during bulk archiving', async () => {
      const oldProject = {
        ...mockProject,
        id: 'old-1',
        year: 2020,
        approvalStatus: ApprovalStatus.APPROVED,
      };

      projectRepository.find.mockResolvedValue([oldProject]);
      projectRepository.findOne.mockResolvedValue(oldProject);
      projectRepository.update.mockRejectedValue(new Error('Database error'));

      const result = await service.bulkArchiveOldProjects('admin-id');

      expect(result).toBe(0); // No projects archived due to error
    });
  });

  describe('bulkRejectStaleProjects', () => {
    it('should reject stale pending projects', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const staleProject1 = {
        ...mockProject,
        id: 'stale-1',
        createdAt: thirtyOneDaysAgo,
        approvalStatus: ApprovalStatus.PENDING,
      };
      const staleProject2 = {
        ...mockProject,
        id: 'stale-2',
        createdAt: thirtyOneDaysAgo,
        approvalStatus: ApprovalStatus.PENDING,
      };

      projectRepository.find.mockResolvedValue([staleProject1, staleProject2]);
      projectRepository.findOne
        .mockResolvedValueOnce(staleProject1)
        .mockResolvedValueOnce({
          ...staleProject1,
          approvalStatus: ApprovalStatus.REJECTED,
        })
        .mockResolvedValueOnce(staleProject2)
        .mockResolvedValueOnce({
          ...staleProject2,
          approvalStatus: ApprovalStatus.REJECTED,
        });

      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.bulkRejectStaleProjects('admin-id');

      expect(result).toBe(2);
      expect(projectRepository.find).toHaveBeenCalledWith({
        where: {
          approvalStatus: ApprovalStatus.PENDING,
          createdAt: expect.any(Object), // LessThan matcher
        },
      });
      expect(projectAuditService.logProjectRejection).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProjectStatusStatistics', () => {
    it('should return project status statistics', async () => {
      projectRepository.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // approved
        .mockResolvedValueOnce(3) // rejected
        .mockResolvedValueOnce(2) // archived
        .mockResolvedValueOnce(20); // total

      const result = await service.getProjectStatusStatistics();

      expect(result).toEqual({
        pending: 5,
        approved: 10,
        rejected: 3,
        archived: 2,
        total: 20,
      });
    });
  });

  describe('getProjectsRequiringAttention', () => {
    it('should return projects requiring attention', async () => {
      const stalePendingProject = {
        ...mockProject,
        id: 'stale-1',
        approvalStatus: ApprovalStatus.PENDING,
      };
      const oldApprovedProject = {
        ...mockProject,
        id: 'old-1',
        year: 2020,
        approvalStatus: ApprovalStatus.APPROVED,
      };

      projectRepository.find
        .mockResolvedValueOnce([stalePendingProject])
        .mockResolvedValueOnce([oldApprovedProject]);

      const result = await service.getProjectsRequiringAttention();

      expect(result.stalePending).toHaveLength(1);
      expect(result.oldApproved).toHaveLength(1);
      expect(result.stalePending[0].id).toBe('stale-1');
      expect(result.oldApproved[0].id).toBe('old-1');
    });
  });
});
