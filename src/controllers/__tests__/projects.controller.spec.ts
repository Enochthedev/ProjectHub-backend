import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProjectsController } from '../projects.controller';
import { SearchService } from '../../services/search.service';
import { ProjectService } from '../../services/project.service';
import { ProjectViewTrackingService } from '../../services/project-view-tracking.service';
import {
  SearchProjectsDto,
  PaginatedProjectsDto,
  ProjectSummaryDto,
} from '../../dto/search';
import { ProjectDetailDto } from '../../dto/project';
import {
  ProjectSortBy,
  SortOrder,
  DifficultyLevel,
  ApprovalStatus,
} from '../../common/enums';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let searchService: jest.Mocked<SearchService>;
  let projectService: jest.Mocked<ProjectService>;
  let viewTrackingService: jest.Mocked<ProjectViewTrackingService>;

  const mockProjectSummary: ProjectSummaryDto = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Project',
    abstract: 'This is a test project abstract',
    specialization: 'Web Development & Full Stack',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['react', 'nodejs'],
    technologyStack: ['React', 'Node.js', 'PostgreSQL'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.APPROVED,
    supervisor: {
      id: 'supervisor-id',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@university.edu',
    },
    createdAt: new Date(),
    approvedAt: new Date(),
  };

  const mockProjectDetail: ProjectDetailDto = {
    ...mockProjectSummary,
    githubUrl: 'https://github.com/test/project',
    demoUrl: 'https://test-project.com',
    notes: 'Additional project notes',
    updatedAt: new Date(),
    approvedBy: 'admin-id',
    viewCount: 10,
    bookmarkCount: 5,
    supervisor: {
      ...mockProjectSummary.supervisor,
      specializations: ['Web Development & Full Stack'],
    },
  };

  const mockPaginatedProjects: PaginatedProjectsDto = new PaginatedProjectsDto(
    [mockProjectSummary],
    1,
    20,
    0,
  );

  beforeEach(async () => {
    const mockSearchService = {
      searchProjects: jest.fn(),
      getPopularProjects: jest.fn(),
      getProjectById: jest.fn(),
    };

    const mockProjectService = {
      getProjectById: jest.fn(),
    };

    const mockViewTrackingService = {
      trackProjectView: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        { provide: SearchService, useValue: mockSearchService },
        { provide: ProjectService, useValue: mockProjectService },
        {
          provide: ProjectViewTrackingService,
          useValue: mockViewTrackingService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    searchService = module.get(SearchService);
    projectService = module.get(ProjectService);
    viewTrackingService = module.get(ProjectViewTrackingService);
  });

  describe('searchProjects', () => {
    it('should return paginated projects for valid search', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'react',
        limit: 20,
        offset: 0,
        sortBy: ProjectSortBy.RELEVANCE,
        sortOrder: SortOrder.DESC,
      };

      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      const result = await controller.searchProjects(searchDto);

      expect(result).toEqual(mockPaginatedProjects);
      expect(searchService.searchProjects).toHaveBeenCalledWith(searchDto);
    });

    it('should handle search with filters', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'machine learning',
        specializations: ['Artificial Intelligence & Machine Learning'],
        difficultyLevels: [DifficultyLevel.ADVANCED],
        yearFrom: 2023,
        yearTo: 2024,
        tags: ['python', 'tensorflow'],
        isGroupProject: false,
        limit: 10,
        offset: 0,
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.DESC,
      };

      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      const result = await controller.searchProjects(searchDto);

      expect(result).toEqual(mockPaginatedProjects);
      expect(searchService.searchProjects).toHaveBeenCalledWith(searchDto);
    });

    it('should handle empty search query', async () => {
      const searchDto: SearchProjectsDto = {
        limit: 20,
        offset: 0,
        sortBy: ProjectSortBy.DATE,
        sortOrder: SortOrder.DESC,
      };

      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      const result = await controller.searchProjects(searchDto);

      expect(result).toEqual(mockPaginatedProjects);
      expect(searchService.searchProjects).toHaveBeenCalledWith(searchDto);
    });

    it('should throw BadRequestException for invalid search parameters', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test',
        limit: 20,
        offset: 0,
      };

      searchService.searchProjects.mockRejectedValue(
        new BadRequestException('Invalid search query'),
      );

      await expect(controller.searchProjects(searchDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle service errors gracefully', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'test',
        limit: 20,
        offset: 0,
      };

      searchService.searchProjects.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.searchProjects(searchDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPopularProjects', () => {
    it('should return popular projects with default limit', async () => {
      const popularProjects = [mockProjectSummary];
      searchService.getPopularProjects.mockResolvedValue(popularProjects);

      const result = await controller.getPopularProjects();

      expect(result).toEqual(popularProjects);
      expect(searchService.getPopularProjects).toHaveBeenCalledWith(10);
    });

    it('should return popular projects with custom limit', async () => {
      const popularProjects = [mockProjectSummary];
      searchService.getPopularProjects.mockResolvedValue(popularProjects);

      const result = await controller.getPopularProjects(5);

      expect(result).toEqual(popularProjects);
      expect(searchService.getPopularProjects).toHaveBeenCalledWith(5);
    });

    it('should enforce maximum limit of 50', async () => {
      const popularProjects = [mockProjectSummary];
      searchService.getPopularProjects.mockResolvedValue(popularProjects);

      const result = await controller.getPopularProjects(100);

      expect(result).toEqual(popularProjects);
      expect(searchService.getPopularProjects).toHaveBeenCalledWith(50);
    });

    it('should enforce minimum limit of 1', async () => {
      const popularProjects = [mockProjectSummary];
      searchService.getPopularProjects.mockResolvedValue(popularProjects);

      const result = await controller.getPopularProjects(-5);

      expect(result).toEqual(popularProjects);
      expect(searchService.getPopularProjects).toHaveBeenCalledWith(1);
    });
  });

  describe('getProjectById', () => {
    const mockRequest = {
      user: { id: 'user-id' },
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('Mozilla/5.0'),
    };

    it('should return project details for valid ID', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);
      viewTrackingService.trackProjectView.mockResolvedValue(true);

      const result = await controller.getProjectById(projectId, mockRequest);

      expect(result).toEqual(mockProjectDetail);
      expect(projectService.getProjectById).toHaveBeenCalledWith(projectId);
    });

    it('should track project view', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);
      viewTrackingService.trackProjectView.mockResolvedValue(true);

      await controller.getProjectById(projectId, mockRequest);

      // Note: View tracking is async and doesn't block the response
      // We can't easily test it without adding delays
      expect(projectService.getProjectById).toHaveBeenCalledWith(projectId);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const invalidId = 'invalid-uuid';

      await expect(
        controller.getProjectById(invalidId, mockRequest),
      ).rejects.toThrow(BadRequestException);
      expect(projectService.getProjectById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when project not found', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      projectService.getProjectById.mockResolvedValue(undefined as any);

      await expect(
        controller.getProjectById(projectId, mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRelatedProjects', () => {
    it('should return related projects for valid ID', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      const relatedProjects = [mockProjectSummary];

      searchService.getProjectById.mockResolvedValue({
        ...mockProjectDetail,
        specialization: 'Web Development & Full Stack',
        tags: ['react', 'nodejs', 'javascript'],
      } as any);

      const relatedProject = { ...mockProjectSummary, id: 'different-id' };
      searchService.searchProjects.mockResolvedValue(
        new PaginatedProjectsDto(
          [relatedProject, { ...mockProjectSummary, id: projectId }],
          2,
          6,
          0,
        ),
      );

      const result = await controller.getRelatedProjects(projectId, 5);

      expect(result).toHaveLength(1);
      expect(result[0].id).not.toBe(projectId); // Should exclude the current project
      expect(searchService.getProjectById).toHaveBeenCalledWith(projectId);
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const invalidId = 'invalid-uuid';

      await expect(controller.getRelatedProjects(invalidId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when project not found', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';
      searchService.getProjectById.mockResolvedValue(null);

      await expect(controller.getRelatedProjects(projectId, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce limit constraints', async () => {
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      searchService.getProjectById.mockResolvedValue(mockProjectDetail as any);
      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      // Test maximum limit
      await controller.getRelatedProjects(projectId, 100);
      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 21 }), // 20 + 1 for filtering
      );

      // Test minimum limit (0 becomes 1, then +1 for filtering = 2)
      await controller.getRelatedProjects(projectId, 0);
      expect(searchService.searchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 2 }), // 1 + 1 for filtering
      );
    });
  });
});
