import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProjectsController } from '../projects.controller';
import { SearchService } from '../../services/search.service';
import { ProjectService } from '../../services/project.service';
import { ProjectViewTrackingService } from '../../services/project-view-tracking.service';
import { InputSanitizationService } from '../../common/services/input-sanitization.service';
import { SearchProjectsDto } from '../../dto/search';
import { MalformedSearchQueryException } from '../../common/exceptions/project.exception';

describe('ProjectsController - Security Tests', () => {
  let controller: ProjectsController;
  let searchService: SearchService;
  let inputSanitizationService: InputSanitizationService;

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

    const mockInputSanitizationService = {
      sanitizeSearchQuery: jest.fn(),
      sanitizeTags: jest.fn(),
      validatePaginationParams: jest.fn(),
      validateSortParams: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
        {
          provide: ProjectViewTrackingService,
          useValue: mockViewTrackingService,
        },
        {
          provide: InputSanitizationService,
          useValue: mockInputSanitizationService,
        },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    searchService = module.get<SearchService>(SearchService);
    inputSanitizationService = module.get<InputSanitizationService>(
      InputSanitizationService,
    );
  });

  describe('Search Projects Security', () => {
    it('should sanitize search query before processing', async () => {
      const maliciousQuery = "'; DROP TABLE projects; --";
      const sanitizedQuery = 'machine learning';

      const searchDto: SearchProjectsDto = {
        query: maliciousQuery,
        limit: 20,
        offset: 0,
      };

      (
        inputSanitizationService.sanitizeSearchQuery as jest.Mock
      ).mockReturnValue(sanitizedQuery);
      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue({
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.searchProjects(searchDto);

      expect(inputSanitizationService.sanitizeSearchQuery).toHaveBeenCalledWith(
        maliciousQuery,
      );
      expect(searchDto.query).toBe(sanitizedQuery);
      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({ query: sanitizedQuery }),
      );
    });

    it('should sanitize tags before processing', async () => {
      const maliciousTags = ['<script>alert(1)</script>', 'legitimate-tag'];
      const sanitizedTags = ['legitimate-tag'];

      const searchDto: SearchProjectsDto = {
        tags: maliciousTags,
        limit: 20,
        offset: 0,
      };

      (inputSanitizationService.sanitizeTags as jest.Mock).mockReturnValue(
        sanitizedTags,
      );
      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue({
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.searchProjects(searchDto);

      expect(inputSanitizationService.sanitizeTags).toHaveBeenCalledWith(
        maliciousTags,
      );
      expect(searchDto.tags).toBe(sanitizedTags);
    });

    it('should validate and sanitize pagination parameters', async () => {
      const searchDto: SearchProjectsDto = {
        limit: -5, // Invalid negative limit
        offset: -10, // Invalid negative offset
      };

      const sanitizedParams = { limit: 20, offset: 0 };

      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue(sanitizedParams);
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue({
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.searchProjects(searchDto);

      expect(
        inputSanitizationService.validatePaginationParams,
      ).toHaveBeenCalledWith(-5, -10);
      expect(searchDto.limit).toBe(20);
      expect(searchDto.offset).toBe(0);
    });

    it('should validate and sanitize sort parameters', async () => {
      const searchDto: SearchProjectsDto = {
        sortBy: 'malicious_field' as any,
        sortOrder: 'malicious_order' as any,
        limit: 20,
        offset: 0,
      };

      const sanitizedSort = { sortBy: 'relevance', sortOrder: 'desc' };

      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue(sanitizedSort);
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.searchProjects(searchDto);

      expect(inputSanitizationService.validateSortParams).toHaveBeenCalledWith(
        'malicious_field',
        'malicious_order',
      );
      expect(searchDto.sortBy).toBe('relevance');
      expect(searchDto.sortOrder).toBe('desc');
    });

    it('should handle sanitization exceptions properly', async () => {
      const searchDto: SearchProjectsDto = {
        query: "'; DROP TABLE projects; --",
        limit: 20,
        offset: 0,
      };

      (
        inputSanitizationService.sanitizeSearchQuery as jest.Mock
      ).mockImplementation(() => {
        throw new MalformedSearchQueryException(
          searchDto.query!,
          'SQL injection detected',
        );
      });

      await expect(controller.searchProjects(searchDto)).rejects.toThrow(
        MalformedSearchQueryException,
      );
    });

    it('should handle service errors gracefully', async () => {
      const searchDto: SearchProjectsDto = {
        query: 'legitimate query',
        limit: 20,
        offset: 0,
      };

      (
        inputSanitizationService.sanitizeSearchQuery as jest.Mock
      ).mockReturnValue('legitimate query');
      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue({
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      (searchService.searchProjects as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(controller.searchProjects(searchDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Popular Projects Security', () => {
    it('should validate limit parameter for popular projects', async () => {
      const maliciousLimit = 999999; // Extremely high limit
      const expectedLimit = 50; // Should be capped at 50

      (searchService.getPopularProjects as jest.Mock).mockResolvedValue([]);

      await controller.getPopularProjects(maliciousLimit);

      expect(searchService.getPopularProjects).toHaveBeenCalledWith(
        expectedLimit,
      );
    });

    it('should handle negative limit values', async () => {
      const negativeLimit = -10;
      const expectedLimit = 1; // Should default to minimum

      (searchService.getPopularProjects as jest.Mock).mockResolvedValue([]);

      await controller.getPopularProjects(negativeLimit);

      expect(searchService.getPopularProjects).toHaveBeenCalledWith(
        expectedLimit,
      );
    });

    it('should handle undefined limit gracefully', async () => {
      const expectedLimit = 10; // Default value

      (searchService.getPopularProjects as jest.Mock).mockResolvedValue([]);

      await controller.getPopularProjects(undefined);

      expect(searchService.getPopularProjects).toHaveBeenCalledWith(
        expectedLimit,
      );
    });
  });

  describe('Project Details Security', () => {
    it('should validate UUID format for project ID', async () => {
      const invalidIds = [
        'not-a-uuid',
        '123',
        'invalid-uuid-format',
        '<script>alert(1)</script>',
        "'; DROP TABLE projects; --",
        '',
        null,
        undefined,
      ];

      for (const invalidId of invalidIds) {
        await expect(
          controller.getProjectById(invalidId as any, {
            user: { id: 'user123' },
          }),
        ).rejects.toThrow(BadRequestException);
      }
    });

    it('should accept valid UUID format', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const mockProject = {
        id: validUuid,
        title: 'Test Project',
        abstract: 'Test Abstract',
      };

      (searchService.getProjectById as jest.Mock).mockResolvedValue(
        mockProject,
      );

      const result = await controller.getProjectById(validUuid, {
        user: { id: 'user123' },
        ip: '192.168.1.1',
        get: () => 'Mozilla/5.0',
      });

      expect(result).toBe(mockProject);
    });

    it('should handle project not found gracefully', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';

      (searchService.getProjectById as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.getProjectById(validUuid, { user: { id: 'user123' } }),
      ).rejects.toThrow('Project not found or not approved');
    });
  });

  describe('Related Projects Security', () => {
    it('should validate UUID format for related projects', async () => {
      const invalidId = 'invalid-uuid';

      await expect(controller.getRelatedProjects(invalidId, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate and limit the number of suggestions', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const excessiveLimit = 100;
      const expectedLimit = 20; // Should be capped at 20

      const mockProject = {
        id: validUuid,
        title: 'Test Project',
        specialization: 'Web Development',
        tags: ['react', 'nodejs'],
      };

      (searchService.getProjectById as jest.Mock).mockResolvedValue(
        mockProject,
      );
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [mockProject],
        total: 1,
      });

      await controller.getRelatedProjects(validUuid, excessiveLimit);

      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: expectedLimit + 1, // +1 to exclude current project
        }),
      );
    });

    it('should handle negative limit values for suggestions', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const negativeLimit = -5;
      const expectedLimit = 1; // Should default to minimum

      const mockProject = {
        id: validUuid,
        title: 'Test Project',
        specialization: 'Web Development',
        tags: ['react', 'nodejs'],
      };

      (searchService.getProjectById as jest.Mock).mockResolvedValue(
        mockProject,
      );
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [mockProject],
        total: 1,
      });

      await controller.getRelatedProjects(validUuid, negativeLimit);

      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: expectedLimit + 1,
        }),
      );
    });

    it('should properly filter out the current project from suggestions', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const otherUuid = '987fcdeb-51d2-43a1-b654-123456789abc';

      const currentProject = {
        id: validUuid,
        title: 'Current Project',
        specialization: 'Web Development',
        tags: ['react', 'nodejs'],
      };

      const relatedProject = {
        id: otherUuid,
        title: 'Related Project',
        specialization: 'Web Development',
        tags: ['react', 'express'],
      };

      (searchService.getProjectById as jest.Mock).mockResolvedValue(
        currentProject,
      );
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [currentProject, relatedProject], // Current project included in results
        total: 2,
      });

      const result = await controller.getRelatedProjects(validUuid, 5);

      expect(result).toEqual([relatedProject]); // Should exclude current project
      expect(result).not.toContainEqual(currentProject);
    });
  });

  describe('Input Sanitization Edge Cases', () => {
    it('should handle null and undefined values gracefully', async () => {
      const searchDto: SearchProjectsDto = {
        query: null as any,
        tags: undefined as any,
        limit: null as any,
        offset: undefined as any,
      };

      (
        inputSanitizationService.sanitizeSearchQuery as jest.Mock
      ).mockReturnValue('');
      (inputSanitizationService.sanitizeTags as jest.Mock).mockReturnValue([]);
      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue({
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.searchProjects(searchDto);

      expect(inputSanitizationService.sanitizeSearchQuery).toHaveBeenCalledWith(
        null,
      );
      expect(inputSanitizationService.sanitizeTags).toHaveBeenCalledWith(
        undefined,
      );
    });

    it('should handle empty strings and arrays', async () => {
      const searchDto: SearchProjectsDto = {
        query: '',
        tags: [],
        limit: 20,
        offset: 0,
      };

      (
        inputSanitizationService.sanitizeSearchQuery as jest.Mock
      ).mockReturnValue('');
      (inputSanitizationService.sanitizeTags as jest.Mock).mockReturnValue([]);
      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.validateSortParams as jest.Mock
      ).mockReturnValue({
        sortBy: 'relevance',
        sortOrder: 'desc',
      });
      (searchService.searchProjects as jest.Mock).mockResolvedValue({
        projects: [],
        total: 0,
        limit: 20,
        offset: 0,
      });

      await controller.searchProjects(searchDto);

      expect(searchService.searchProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          query: '',
          tags: [],
        }),
      );
    });
  });
});
