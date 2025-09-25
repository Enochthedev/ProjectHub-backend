import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminProjectController } from '../admin-project.controller';
import { ProjectService } from '../../services/project.service';
import { SearchService } from '../../services/search.service';
import { ProjectAnalyticsService } from '../../services/project-analytics.service';
import {
  ApproveProjectDto,
  RejectProjectDto,
  ProjectDetailDto,
} from '../../dto/project';
import { SearchProjectsDto, PaginatedProjectsDto } from '../../dto/search';
import { ApprovalStatus, UserRole, DifficultyLevel } from '../../common/enums';
import { Project } from '../../entities/project.entity';

describe('AdminProjectController', () => {
  let controller: AdminProjectController;
  let projectService: jest.Mocked<ProjectService>;
  let searchService: jest.Mocked<SearchService>;
  let projectAnalyticsService: jest.Mocked<ProjectAnalyticsService>;

  const mockProject: Partial<Project> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Project',
    abstract: 'Test abstract',
    specialization: 'Web Development',
    approvalStatus: ApprovalStatus.PENDING,
    supervisorId: 'supervisor-id',
  };

  const mockProjectDetail: ProjectDetailDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Project',
    abstract: 'Test abstract',
    specialization: 'Web Development',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['web', 'development'],
    technologyStack: ['React', 'Node.js'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.APPROVED,
    supervisor: {
      id: 'supervisor-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@university.edu',
    },
    viewCount: 0,
    bookmarkCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ProjectDetailDto;

  const mockPaginatedProjects = new PaginatedProjectsDto(
    [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Test Project',
        abstract: 'Test abstract',
        specialization: 'Web Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: ['web', 'development'],
        technologyStack: ['React', 'Node.js'],
        isGroupProject: false,
        supervisor: {
          id: 'supervisor-id',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@university.edu',
        },
        approvalStatus: ApprovalStatus.PENDING,
        createdAt: new Date(),
        approvedAt: null,
      } as any,
    ],
    1,
    20,
    0,
  );

  const mockRequest = {
    user: {
      id: 'admin-id',
      role: UserRole.ADMIN,
    },
  };

  beforeEach(async () => {
    const mockProjectService = {
      approveProject: jest.fn(),
      rejectProject: jest.fn(),
      getProjectById: jest.fn(),
      archiveProject: jest.fn(),
      bulkArchiveOldProjects: jest.fn(),
      bulkRejectStaleProjects: jest.fn(),
      getProjectStatusStatistics: jest.fn(),
      getProjectsRequiringAttention: jest.fn(),
    };

    const mockSearchService = {
      searchProjectsByStatus: jest.fn(),
    };

    const mockProjectAnalyticsService = {
      getSystemAnalytics: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: ProjectAnalyticsService,
          useValue: mockProjectAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AdminProjectController>(AdminProjectController);
    projectService = module.get(ProjectService);
    searchService = module.get(SearchService);
    projectAnalyticsService = module.get(ProjectAnalyticsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPendingProjects', () => {
    it('should return paginated pending projects', async () => {
      searchService.searchProjectsByStatus.mockResolvedValue(
        mockPaginatedProjects,
      );

      const result = await controller.getPendingProjects();

      expect(result).toEqual(mockPaginatedProjects);
      expect(searchService.searchProjectsByStatus).toHaveBeenCalledWith(
        ApprovalStatus.PENDING,
        expect.objectContaining({
          limit: 20,
          offset: 0,
          sortBy: 'date',
          sortOrder: 'desc',
        }),
        undefined,
      );
    });

    it('should apply filters when provided', async () => {
      searchService.searchProjectsByStatus.mockResolvedValue(
        mockPaginatedProjects,
      );

      await controller.getPendingProjects(
        10,
        5,
        'Web Development',
        'supervisor-id',
        'title',
        'asc',
      );

      expect(searchService.searchProjectsByStatus).toHaveBeenCalledWith(
        ApprovalStatus.PENDING,
        expect.objectContaining({
          limit: 10,
          offset: 5,
          specializations: ['Web Development'],
          sortBy: 'title',
          sortOrder: 'asc',
        }),
        'supervisor-id',
      );
    });

    it('should enforce limit constraints', async () => {
      searchService.searchProjectsByStatus.mockResolvedValue(
        mockPaginatedProjects,
      );

      await controller.getPendingProjects(150, -5);

      expect(searchService.searchProjectsByStatus).toHaveBeenCalledWith(
        ApprovalStatus.PENDING,
        expect.objectContaining({
          limit: 100, // Max limit enforced
          offset: 0, // Negative offset corrected
        }),
        undefined,
      );
    });
  });

  describe('approveProject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const approveDto: ApproveProjectDto = {
      approvalNotes: 'Excellent project proposal',
    };

    it('should approve a project successfully', async () => {
      projectService.approveProject.mockResolvedValue(mockProject as Project);
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);

      const result = await controller.approveProject(
        validUuid,
        mockRequest,
        approveDto,
      );

      expect(result).toEqual(mockProjectDetail);
      expect(projectService.approveProject).toHaveBeenCalledWith(
        validUuid,
        'admin-id',
        approveDto,
      );
      expect(projectService.getProjectById).toHaveBeenCalledWith(
        mockProject.id,
      );
    });

    it('should approve a project without approval notes', async () => {
      projectService.approveProject.mockResolvedValue(mockProject as Project);
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);

      const result = await controller.approveProject(validUuid, mockRequest);

      expect(result).toEqual(mockProjectDetail);
      expect(projectService.approveProject).toHaveBeenCalledWith(
        validUuid,
        'admin-id',
        undefined,
      );
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const invalidUuid = 'invalid-uuid';

      await expect(
        controller.approveProject(invalidUuid, mockRequest, approveDto),
      ).rejects.toThrow(BadRequestException);

      expect(projectService.approveProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      projectService.approveProject.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.approveProject(validUuid, mockRequest, approveDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when project cannot be approved', async () => {
      projectService.approveProject.mockRejectedValue(
        new Error('Project cannot be approved - already approved'),
      );

      await expect(
        controller.approveProject(validUuid, mockRequest, approveDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectProject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const rejectDto: RejectProjectDto = {
      rejectionReason: 'Project scope is too broad and lacks clear objectives',
    };

    it('should reject a project successfully', async () => {
      projectService.rejectProject.mockResolvedValue(undefined);

      const result = await controller.rejectProject(
        validUuid,
        mockRequest,
        rejectDto,
      );

      expect(result).toEqual({
        message: 'Project rejected successfully',
        projectId: validUuid,
        rejectionReason: rejectDto.rejectionReason,
      });
      expect(projectService.rejectProject).toHaveBeenCalledWith(
        validUuid,
        'admin-id',
        rejectDto,
      );
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const invalidUuid = 'invalid-uuid';

      await expect(
        controller.rejectProject(invalidUuid, mockRequest, rejectDto),
      ).rejects.toThrow(BadRequestException);

      expect(projectService.rejectProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      projectService.rejectProject.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.rejectProject(validUuid, mockRequest, rejectDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when project cannot be rejected', async () => {
      projectService.rejectProject.mockRejectedValue(
        new Error('Project cannot be rejected - already processed'),
      );

      await expect(
        controller.rejectProject(validUuid, mockRequest, rejectDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('UUID validation', () => {
    it('should validate UUID format correctly', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      const invalidUuids = [
        'invalid-uuid',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '',
        null,
        undefined,
      ];

      validUuids.forEach((uuid) => {
        expect(() => {
          if (!controller['isValidUuid'](uuid)) {
            throw new BadRequestException('Invalid UUID');
          }
        }).not.toThrow();
      });

      invalidUuids.forEach((uuid) => {
        expect(() => {
          if (!controller['isValidUuid'](uuid as string)) {
            throw new BadRequestException('Invalid UUID');
          }
        }).toThrow(BadRequestException);
      });
    });
  });

  describe('Sort mapping', () => {
    it('should map sort criteria correctly', () => {
      expect(controller['mapSortBy']('title')).toBe('title');
      expect(controller['mapSortBy']('supervisor')).toBe('supervisor');
      expect(controller['mapSortBy']('date')).toBe('date');
      expect(controller['mapSortBy']('invalid')).toBe('date');
      expect(controller['mapSortBy'](undefined)).toBe('date');
    });
  });

  describe('getSystemAnalytics', () => {
    const mockAnalytics = {
      totalProjects: 150,
      projectsByStatus: {
        pending: 12,
        approved: 120,
        rejected: 15,
        archived: 3,
      },
      projectsBySpecialization: {
        'Web Development': 45,
        'Machine Learning': 32,
        'Mobile Development': 28,
      },
      projectsByYear: {
        '2024': 85,
        '2023': 65,
      },
      popularityMetrics: {
        totalViews: 2450,
        totalBookmarks: 380,
        averageViewsPerProject: 16.3,
        averageBookmarksPerProject: 2.5,
      },
      trendingTechnologies: [
        { technology: 'React', count: 25, trend: 'up' },
        { technology: 'Python', count: 22, trend: 'stable' },
      ],
      supervisorMetrics: {
        totalSupervisors: 45,
        activeSupervisors: 38,
        averageProjectsPerSupervisor: 3.2,
      },
      recentActivity: {
        projectsSubmittedThisWeek: 8,
        projectsApprovedThisWeek: 12,
        projectsRejectedThisWeek: 2,
      },
    };

    it('should return system analytics', async () => {
      (projectAnalyticsService as any).getSystemAnalytics.mockResolvedValue(
        mockAnalytics,
      );

      const result = await controller.getSystemAnalytics();

      expect(result).toEqual(mockAnalytics);
      expect(
        (projectAnalyticsService as any).getSystemAnalytics,
      ).toHaveBeenCalled();
    });
  });

  describe('archiveProject', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should archive a project successfully', async () => {
      projectService.archiveProject.mockResolvedValue(undefined);

      const result = await controller.archiveProject(validUuid, mockRequest);

      expect(result.message).toBe('Project archived successfully');
      expect(result.projectId).toBe(validUuid);
      expect(result.archivedAt).toBeInstanceOf(Date);
      expect(projectService.archiveProject).toHaveBeenCalledWith(
        validUuid,
        'admin-id',
      );
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const invalidUuid = 'invalid-uuid';

      await expect(
        controller.archiveProject(invalidUuid, mockRequest),
      ).rejects.toThrow(BadRequestException);

      expect(projectService.archiveProject).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      projectService.archiveProject.mockRejectedValue(
        new Error('Project not found'),
      );

      await expect(
        controller.archiveProject(validUuid, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when project cannot be archived', async () => {
      projectService.archiveProject.mockRejectedValue(
        new Error('Project cannot be archived - already archived'),
      );

      await expect(
        controller.archiveProject(validUuid, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkArchiveOldProjects', () => {
    it('should perform bulk archive operation', async () => {
      const archivedCount = 15;
      projectService.bulkArchiveOldProjects.mockResolvedValue(archivedCount);

      const result = await controller.bulkArchiveOldProjects(mockRequest);

      expect(result.message).toBe('Bulk archive completed');
      expect(result.archivedCount).toBe(archivedCount);
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(projectService.bulkArchiveOldProjects).toHaveBeenCalledWith(
        'admin-id',
      );
    });

    it('should handle zero archived projects', async () => {
      projectService.bulkArchiveOldProjects.mockResolvedValue(0);

      const result = await controller.bulkArchiveOldProjects(mockRequest);

      expect(result.archivedCount).toBe(0);
    });
  });

  describe('bulkRejectStaleProjects', () => {
    it('should perform bulk reject operation', async () => {
      const rejectedCount = 8;
      projectService.bulkRejectStaleProjects.mockResolvedValue(rejectedCount);

      const result = await controller.bulkRejectStaleProjects(mockRequest);

      expect(result.message).toBe('Bulk reject completed');
      expect(result.rejectedCount).toBe(rejectedCount);
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(projectService.bulkRejectStaleProjects).toHaveBeenCalledWith(
        'admin-id',
      );
    });

    it('should handle zero rejected projects', async () => {
      projectService.bulkRejectStaleProjects.mockResolvedValue(0);

      const result = await controller.bulkRejectStaleProjects(mockRequest);

      expect(result.rejectedCount).toBe(0);
    });
  });

  describe('getProjectStatusStatistics', () => {
    const mockStatistics = {
      pending: 12,
      approved: 120,
      rejected: 15,
      archived: 3,
      total: 150,
    };

    it('should return project status statistics', async () => {
      projectService.getProjectStatusStatistics.mockResolvedValue(
        mockStatistics,
      );

      const result = await controller.getProjectStatusStatistics();

      expect(result).toEqual(mockStatistics);
      expect(projectService.getProjectStatusStatistics).toHaveBeenCalled();
    });
  });

  describe('getProjectsRequiringAttention', () => {
    const mockAttentionData = {
      stalePending: [] as any[],
      oldApproved: [] as any[],
    };

    it('should return projects requiring attention', async () => {
      projectService.getProjectsRequiringAttention.mockResolvedValue(
        mockAttentionData,
      );

      const result = await controller.getProjectsRequiringAttention();

      expect(result).toEqual(mockAttentionData);
      expect(projectService.getProjectsRequiringAttention).toHaveBeenCalled();
    });

    it('should handle empty attention lists', async () => {
      const emptyData = { stalePending: [], oldApproved: [] };
      projectService.getProjectsRequiringAttention.mockResolvedValue(emptyData);

      const result = await controller.getProjectsRequiringAttention();

      expect(result.stalePending).toHaveLength(0);
      expect(result.oldApproved).toHaveLength(0);
    });
  });
});
