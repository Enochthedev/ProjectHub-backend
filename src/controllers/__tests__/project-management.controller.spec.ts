import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectManagementController } from '../project-management.controller';
import { ProjectService } from '../../services/project.service';
import { SearchService } from '../../services/search.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectDetailDto,
} from '../../dto/project';
import { SearchProjectsDto, PaginatedProjectsDto } from '../../dto/search';
import { UserRole, DifficultyLevel, ApprovalStatus } from '../../common/enums';
import { Project } from '../../entities/project.entity';

describe('ProjectManagementController', () => {
  let controller: ProjectManagementController;
  let projectService: jest.Mocked<ProjectService>;
  let searchService: jest.Mocked<SearchService>;

  const mockSupervisorUser = {
    id: 'supervisor-id',
    role: UserRole.SUPERVISOR,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@university.edu',
  };

  const mockAdminUser = {
    id: 'admin-id',
    role: UserRole.ADMIN,
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@university.edu',
  };

  const mockCreateProjectDto: CreateProjectDto = {
    title: 'Test Project',
    abstract:
      'This is a test project abstract that is long enough to meet validation requirements.',
    specialization: 'Web Development & Full Stack',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['react', 'nodejs'],
    technologyStack: ['React', 'Node.js', 'PostgreSQL'],
    isGroupProject: false,
    githubUrl: 'https://github.com/test/project',
    demoUrl: 'https://test-project.com',
    notes: 'Additional project notes',
  };

  const mockProject: Project = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: mockCreateProjectDto.title,
    abstract: mockCreateProjectDto.abstract,
    specialization: mockCreateProjectDto.specialization,
    difficultyLevel: mockCreateProjectDto.difficultyLevel,
    year: mockCreateProjectDto.year,
    tags: mockCreateProjectDto.tags,
    technologyStack: mockCreateProjectDto.technologyStack,
    isGroupProject: mockCreateProjectDto.isGroupProject,
    githubUrl: mockCreateProjectDto.githubUrl || null,
    demoUrl: mockCreateProjectDto.demoUrl || null,
    notes: mockCreateProjectDto.notes || null,
    supervisorId: 'supervisor-id',
    approvalStatus: ApprovalStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null,
    approvedBy: null,
    searchVector: '',
    supervisor: mockSupervisorUser as any,
    bookmarks: [],
    views: [],
  };

  const mockProjectDetail: ProjectDetailDto = {
    id: mockProject.id,
    title: mockProject.title,
    abstract: mockProject.abstract,
    specialization: mockProject.specialization,
    difficultyLevel: mockProject.difficultyLevel,
    year: mockProject.year,
    tags: mockProject.tags,
    technologyStack: mockProject.technologyStack,
    isGroupProject: mockProject.isGroupProject,
    approvalStatus: mockProject.approvalStatus,
    githubUrl: mockProject.githubUrl,
    demoUrl: mockProject.demoUrl,
    notes: mockProject.notes,
    supervisor: {
      id: mockSupervisorUser.id,
      firstName: mockSupervisorUser.firstName,
      lastName: mockSupervisorUser.lastName,
      email: mockSupervisorUser.email,
      specializations: ['Web Development & Full Stack'],
    },
    createdAt: mockProject.createdAt,
    updatedAt: mockProject.updatedAt,
    approvedAt: mockProject.approvedAt,
    approvedBy: mockProject.approvedBy,
    viewCount: 0,
    bookmarkCount: 0,
  };

  beforeEach(async () => {
    const mockProjectService = {
      createProject: jest.fn(),
      updateProject: jest.fn(),
      getProjectById: jest.fn(),
      getSuggestedTags: jest.fn(),
      getSuggestedTechnologies: jest.fn(),
    };

    const mockSearchService = {
      searchProjects: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectManagementController],
      providers: [
        { provide: ProjectService, useValue: mockProjectService },
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();

    controller = module.get<ProjectManagementController>(
      ProjectManagementController,
    );
    projectService = module.get(ProjectService);
    searchService = module.get(SearchService);
  });

  describe('createProject', () => {
    it('should create project successfully for supervisor', async () => {
      const mockRequest = { user: mockSupervisorUser };

      projectService.createProject.mockResolvedValue(mockProject);
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);

      const result = await controller.createProject(
        mockRequest,
        mockCreateProjectDto,
      );

      expect(result).toEqual(mockProjectDetail);
      expect(projectService.createProject).toHaveBeenCalledWith(
        mockCreateProjectDto,
        mockSupervisorUser.id,
      );
      expect(projectService.getProjectById).toHaveBeenCalledWith(
        mockProject.id,
      );
    });

    it('should handle validation errors', async () => {
      const mockRequest = { user: mockSupervisorUser };

      projectService.createProject.mockRejectedValue(
        new Error('validation failed: Title already exists'),
      );

      await expect(
        controller.createProject(mockRequest, mockCreateProjectDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle duplicate project errors', async () => {
      const mockRequest = { user: mockSupervisorUser };

      projectService.createProject.mockRejectedValue(
        new Error('duplicate project detected'),
      );

      await expect(
        controller.createProject(mockRequest, mockCreateProjectDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateProject', () => {
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const updateDto: UpdateProjectDto = {
      title: 'Updated Project Title',
      abstract:
        'Updated project abstract that meets the minimum length requirements.',
    };

    it('should update project successfully for owner', async () => {
      const mockRequest = { user: mockSupervisorUser };

      projectService.updateProject.mockResolvedValue(mockProject);
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);

      const result = await controller.updateProject(
        projectId,
        mockRequest,
        updateDto,
      );

      expect(result).toEqual(mockProjectDetail);
      expect(projectService.updateProject).toHaveBeenCalledWith(
        projectId,
        updateDto,
        mockSupervisorUser.id,
        mockSupervisorUser.role,
      );
    });

    it('should update project successfully for admin', async () => {
      const mockRequest = { user: mockAdminUser };

      projectService.updateProject.mockResolvedValue(mockProject);
      projectService.getProjectById.mockResolvedValue(mockProjectDetail);

      const result = await controller.updateProject(
        projectId,
        mockRequest,
        updateDto,
      );

      expect(result).toEqual(mockProjectDetail);
      expect(projectService.updateProject).toHaveBeenCalledWith(
        projectId,
        updateDto,
        mockAdminUser.id,
        mockAdminUser.role,
      );
    });

    it('should throw BadRequestException for invalid UUID', async () => {
      const mockRequest = { user: mockSupervisorUser };
      const invalidId = 'invalid-uuid';

      await expect(
        controller.updateProject(invalidId, mockRequest, updateDto),
      ).rejects.toThrow(BadRequestException);

      expect(projectService.updateProject).not.toHaveBeenCalled();
    });

    it('should handle permission errors', async () => {
      const mockRequest = { user: mockSupervisorUser };

      projectService.updateProject.mockRejectedValue(
        new Error('permission denied: You can only update your own projects'),
      );

      await expect(
        controller.updateProject(projectId, mockRequest, updateDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle validation errors', async () => {
      const mockRequest = { user: mockSupervisorUser };

      projectService.updateProject.mockRejectedValue(
        new Error('validation failed: Invalid specialization'),
      );

      await expect(
        controller.updateProject(projectId, mockRequest, updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getSupervisorProjects', () => {
    it('should return supervisor projects with default parameters', async () => {
      const mockRequest = { user: mockSupervisorUser };
      const mockPaginatedProjects = new PaginatedProjectsDto(
        [mockProjectDetail as any],
        1,
        20,
        0,
      );

      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      const result = await controller.getSupervisorProjects(mockRequest);

      expect(result).toEqual(mockPaginatedProjects);
      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 0,
          sortBy: 'date',
          sortOrder: 'desc',
        }),
      );
    });

    it('should return supervisor projects with filters', async () => {
      const mockRequest = { user: mockSupervisorUser };
      const mockPaginatedProjects = new PaginatedProjectsDto([], 0, 10, 0);

      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      const result = await controller.getSupervisorProjects(
        mockRequest,
        ApprovalStatus.APPROVED,
        2024,
        'Web Development & Full Stack',
        10,
        0,
        'title',
        'asc',
      );

      expect(result).toEqual(mockPaginatedProjects);
      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          sortBy: 'title',
          sortOrder: 'asc',
          yearFrom: 2024,
          yearTo: 2024,
          specializations: ['Web Development & Full Stack'],
        }),
      );
    });

    it('should enforce limit constraints', async () => {
      const mockRequest = { user: mockSupervisorUser };
      const mockPaginatedProjects = new PaginatedProjectsDto([], 0, 1, 0);

      searchService.searchProjects.mockResolvedValue(mockPaginatedProjects);

      // Test maximum limit
      await controller.getSupervisorProjects(
        mockRequest,
        undefined,
        undefined,
        undefined,
        200,
      );
      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );

      // Test minimum limit
      await controller.getSupervisorProjects(
        mockRequest,
        undefined,
        undefined,
        undefined,
        0,
      );
      expect(searchService.searchProjects).toHaveBeenLastCalledWith(
        expect.objectContaining({ limit: 1 }), // Math.max(0, 1) = 1
      );
    });
  });

  describe('getSupervisorAnalytics', () => {
    it('should return supervisor analytics', async () => {
      const mockRequest = { user: mockSupervisorUser };
      const mockAnalytics = {
        totalProjects: 5,
        approvedProjects: 3,
        pendingProjects: 1,
        rejectedProjects: 1,
        totalViews: 150,
        totalBookmarks: 25,
        popularityScore: 85.5,
        projectsByYear: { '2024': 3, '2023': 2 },
        projectsBySpecialization: { 'Web Development & Full Stack': 5 },
      };

      // Mock the private method call
      jest
        .spyOn(controller as any, 'getSupervisorProjectAnalytics')
        .mockResolvedValue(mockAnalytics);

      const result = await controller.getSupervisorAnalytics(mockRequest);

      expect(result).toEqual(mockAnalytics);
    });
  });

  describe('getTagSuggestions', () => {
    it('should return tag suggestions for valid input', async () => {
      const mockTags = ['react', 'reactjs', 'react-native'];
      projectService.getSuggestedTags.mockResolvedValue(mockTags);

      const result = await controller.getTagSuggestions('rea');

      expect(result).toEqual(mockTags);
      expect(projectService.getSuggestedTags).toHaveBeenCalledWith('rea');
    });

    it('should throw BadRequestException for short input', async () => {
      await expect(controller.getTagSuggestions('r')).rejects.toThrow(
        BadRequestException,
      );
      expect(projectService.getSuggestedTags).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty input', async () => {
      await expect(controller.getTagSuggestions('')).rejects.toThrow(
        BadRequestException,
      );
      expect(projectService.getSuggestedTags).not.toHaveBeenCalled();
    });

    it('should trim input whitespace', async () => {
      const mockTags = ['react'];
      projectService.getSuggestedTags.mockResolvedValue(mockTags);

      await controller.getTagSuggestions('  react  ');

      expect(projectService.getSuggestedTags).toHaveBeenCalledWith('react');
    });
  });

  describe('getTechnologySuggestions', () => {
    it('should return technology suggestions for valid input', async () => {
      const mockTechnologies = ['React', 'React Native', 'Redux'];
      projectService.getSuggestedTechnologies.mockResolvedValue(
        mockTechnologies,
      );

      const result = await controller.getTechnologySuggestions('Rea');

      expect(result).toEqual(mockTechnologies);
      expect(projectService.getSuggestedTechnologies).toHaveBeenCalledWith(
        'Rea',
      );
    });

    it('should throw BadRequestException for short input', async () => {
      await expect(controller.getTechnologySuggestions('R')).rejects.toThrow(
        BadRequestException,
      );
      expect(projectService.getSuggestedTechnologies).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty input', async () => {
      await expect(controller.getTechnologySuggestions('')).rejects.toThrow(
        BadRequestException,
      );
      expect(projectService.getSuggestedTechnologies).not.toHaveBeenCalled();
    });

    it('should trim input whitespace', async () => {
      const mockTechnologies = ['Node.js'];
      projectService.getSuggestedTechnologies.mockResolvedValue(
        mockTechnologies,
      );

      await controller.getTechnologySuggestions('  Node  ');

      expect(projectService.getSuggestedTechnologies).toHaveBeenCalledWith(
        'Node',
      );
    });
  });
});
