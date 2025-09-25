import { PaginatedProjectsDto } from '../paginated-projects.dto';
import { ProjectSummaryDto } from '../project-summary.dto';
import { AlternativeSearchOptions } from '../../../services/suggestion.service';
import { DifficultyLevel, ApprovalStatus } from '../../../common/enums';

describe('PaginatedProjectsDto', () => {
  let mockProjects: ProjectSummaryDto[];
  let mockSuggestions: AlternativeSearchOptions;

  beforeEach(() => {
    mockProjects = [
      {
        id: '1',
        title: 'Project 1',
        abstract: 'Abstract 1',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2024,
        tags: ['react', 'typescript'],
        technologyStack: ['React', 'TypeScript'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@university.edu',
        },
        createdAt: new Date('2024-01-01'),
        approvedAt: new Date('2024-01-05'),
      },
      {
        id: '2',
        title: 'Project 2',
        abstract: 'Abstract 2',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: ['python', 'tensorflow'],
        technologyStack: ['Python', 'TensorFlow'],
        isGroupProject: true,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisor: {
          id: 'sup2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@university.edu',
        },
        createdAt: new Date('2024-01-02'),
        approvedAt: new Date('2024-01-06'),
      },
    ];

    mockSuggestions = {
      suggestions: [
        {
          type: 'query',
          value: 'machine learning',
          label: 'Try "machine learning"',
          description: 'Popular search term',
          count: 25,
        },
      ],
      relatedProjects: [],
      popularFilters: [],
    };
  });

  describe('constructor and basic properties', () => {
    it('should create instance with all required properties', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 0);

      expect(dto.projects).toEqual(mockProjects);
      expect(dto.total).toBe(50);
      expect(dto.limit).toBe(20);
      expect(dto.offset).toBe(0);
    });

    it('should include suggestions when provided', () => {
      const dto = new PaginatedProjectsDto(
        mockProjects,
        50,
        20,
        0,
        mockSuggestions,
      );
      expect(dto.suggestions).toEqual(mockSuggestions);
    });

    it('should handle undefined suggestions', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 0);
      expect(dto.suggestions).toBeUndefined();
    });
  });

  describe('pagination calculations', () => {
    describe('hasNext calculation', () => {
      it('should return true when there are more results', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 0);
        expect(dto.hasNext).toBe(true);
      });

      it('should return false when on last page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 40);
        expect(dto.hasNext).toBe(false);
      });

      it('should return false when offset + limit equals total', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 30);
        expect(dto.hasNext).toBe(false);
      });

      it('should return false when total is less than limit', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 10, 20, 0);
        expect(dto.hasNext).toBe(false);
      });
    });

    describe('hasPrevious calculation', () => {
      it('should return false on first page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 0);
        expect(dto.hasPrevious).toBe(false);
      });

      it('should return true when not on first page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 20);
        expect(dto.hasPrevious).toBe(true);
      });

      it('should return true for any positive offset', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 1);
        expect(dto.hasPrevious).toBe(true);
      });
    });

    describe('totalPages calculation', () => {
      it('should calculate total pages correctly', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 0);
        expect(dto.totalPages).toBe(3); // Math.ceil(50/20) = 3
      });

      it('should handle exact division', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 40, 20, 0);
        expect(dto.totalPages).toBe(2); // Math.ceil(40/20) = 2
      });

      it('should handle single page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 10, 20, 0);
        expect(dto.totalPages).toBe(1); // Math.ceil(10/20) = 1
      });

      it('should handle zero total', () => {
        const dto = new PaginatedProjectsDto([], 0, 20, 0);
        expect(dto.totalPages).toBe(0); // Math.ceil(0/20) = 0
      });

      it('should handle large numbers', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 1000, 25, 0);
        expect(dto.totalPages).toBe(40); // Math.ceil(1000/25) = 40
      });
    });

    describe('currentPage calculation', () => {
      it('should calculate current page correctly for first page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 0);
        expect(dto.currentPage).toBe(1); // Math.floor(0/20) + 1 = 1
      });

      it('should calculate current page correctly for second page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 20);
        expect(dto.currentPage).toBe(2); // Math.floor(20/20) + 1 = 2
      });

      it('should calculate current page correctly for third page', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 40);
        expect(dto.currentPage).toBe(3); // Math.floor(40/20) + 1 = 3
      });

      it('should handle partial pages', () => {
        const dto = new PaginatedProjectsDto(mockProjects, 50, 20, 25);
        expect(dto.currentPage).toBe(2); // Math.floor(25/20) + 1 = 2
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty projects array', () => {
      const dto = new PaginatedProjectsDto([], 0, 20, 0);

      expect(dto.projects).toEqual([]);
      expect(dto.total).toBe(0);
      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrevious).toBe(false);
      expect(dto.totalPages).toBe(0);
      expect(dto.currentPage).toBe(1);
    });

    it('should handle single project', () => {
      const singleProject = [mockProjects[0]];
      const dto = new PaginatedProjectsDto(singleProject, 1, 20, 0);

      expect(dto.projects).toEqual(singleProject);
      expect(dto.total).toBe(1);
      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrevious).toBe(false);
      expect(dto.totalPages).toBe(1);
      expect(dto.currentPage).toBe(1);
    });

    it('should handle limit of 1', () => {
      const dto = new PaginatedProjectsDto([mockProjects[0]], 50, 1, 0);

      expect(dto.hasNext).toBe(true);
      expect(dto.totalPages).toBe(50);
      expect(dto.currentPage).toBe(1);
    });

    it('should handle large offset', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 1000, 20, 980);

      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrevious).toBe(true);
      expect(dto.currentPage).toBe(50); // Math.floor(980/20) + 1 = 50
    });
  });

  describe('real-world scenarios', () => {
    it('should handle typical first page request', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 100, 20, 0);

      expect(dto.projects.length).toBe(2);
      expect(dto.total).toBe(100);
      expect(dto.limit).toBe(20);
      expect(dto.offset).toBe(0);
      expect(dto.hasNext).toBe(true);
      expect(dto.hasPrevious).toBe(false);
      expect(dto.totalPages).toBe(5);
      expect(dto.currentPage).toBe(1);
    });

    it('should handle middle page request', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 100, 20, 40);

      expect(dto.hasNext).toBe(true);
      expect(dto.hasPrevious).toBe(true);
      expect(dto.currentPage).toBe(3);
    });

    it('should handle last page request', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 100, 20, 80);

      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrevious).toBe(true);
      expect(dto.currentPage).toBe(5);
    });

    it('should handle search with no results', () => {
      const dto = new PaginatedProjectsDto([], 0, 20, 0, mockSuggestions);

      expect(dto.projects).toEqual([]);
      expect(dto.total).toBe(0);
      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrevious).toBe(false);
      expect(dto.totalPages).toBe(0);
      expect(dto.currentPage).toBe(1);
      expect(dto.suggestions).toEqual(mockSuggestions);
    });

    it('should handle different page sizes', () => {
      // Small page size
      const dto1 = new PaginatedProjectsDto(mockProjects, 100, 5, 0);
      expect(dto1.totalPages).toBe(20);

      // Large page size
      const dto2 = new PaginatedProjectsDto(mockProjects, 100, 50, 0);
      expect(dto2.totalPages).toBe(2);

      // Maximum page size
      const dto3 = new PaginatedProjectsDto(mockProjects, 100, 100, 0);
      expect(dto3.totalPages).toBe(1);
    });
  });

  describe('consistency checks', () => {
    it('should maintain consistency between pagination properties', () => {
      const dto = new PaginatedProjectsDto(mockProjects, 73, 15, 30);

      // Verify mathematical relationships
      expect(dto.currentPage).toBe(Math.floor(dto.offset / dto.limit) + 1);
      expect(dto.totalPages).toBe(Math.ceil(dto.total / dto.limit));
      expect(dto.hasNext).toBe(dto.offset + dto.limit < dto.total);
      expect(dto.hasPrevious).toBe(dto.offset > 0);
    });

    it('should handle boundary conditions correctly', () => {
      // Test exact page boundary
      const dto = new PaginatedProjectsDto(mockProjects, 60, 20, 40);

      expect(dto.currentPage).toBe(3);
      expect(dto.totalPages).toBe(3);
      expect(dto.hasNext).toBe(false);
      expect(dto.hasPrevious).toBe(true);
    });
  });
});
