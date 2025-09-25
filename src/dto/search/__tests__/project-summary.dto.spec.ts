import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { ProjectSummaryDto } from '../project-summary.dto';
import { DifficultyLevel, ApprovalStatus } from '../../../common/enums';

describe('ProjectSummaryDto', () => {
  let mockProject: any;

  beforeEach(() => {
    mockProject = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Machine Learning Project for Predictive Analytics',
      abstract:
        'This is a comprehensive machine learning project that focuses on predictive analytics using various algorithms and techniques. The project involves data preprocessing, feature engineering, model training, and evaluation. It demonstrates the application of machine learning in real-world scenarios and provides insights into data-driven decision making.',
      specialization: 'Artificial Intelligence & Machine Learning',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
      tags: ['machine-learning', 'python', 'tensorflow', 'data-science'],
      technologyStack: ['Python', 'TensorFlow', 'Pandas', 'Scikit-learn'],
      isGroupProject: false,
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@university.edu',
      },
      createdAt: new Date('2024-01-15T10:00:00Z'),
      approvedAt: new Date('2024-01-20T14:30:00Z'),
      relevanceScore: 0.95,
      highlightedTitle:
        'Machine <mark>Learning</mark> Project for Predictive Analytics',
      highlightedAbstract:
        'This is a comprehensive machine <mark>learning</mark> project...',
    };
  });

  describe('basic field transformation', () => {
    it('should expose all required fields', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);

      expect(dto.id).toBe(mockProject.id);
      expect(dto.title).toBe(mockProject.title);
      expect(dto.specialization).toBe(mockProject.specialization);
      expect(dto.difficultyLevel).toBe(mockProject.difficultyLevel);
      expect(dto.year).toBe(mockProject.year);
      expect(dto.tags).toEqual(mockProject.tags);
      expect(dto.technologyStack).toEqual(mockProject.technologyStack);
      expect(dto.isGroupProject).toBe(mockProject.isGroupProject);
      expect(dto.approvalStatus).toBe(mockProject.approvalStatus);
      expect(dto.createdAt).toEqual(mockProject.createdAt);
      expect(dto.approvedAt).toEqual(mockProject.approvedAt);
    });

    it('should handle null approvedAt', () => {
      mockProject.approvedAt = null;
      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.approvedAt).toBeNull();
    });
  });

  describe('abstract truncation', () => {
    it('should truncate abstract longer than 200 characters', () => {
      const longAbstract = 'a'.repeat(250);
      mockProject.abstract = longAbstract;

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.abstract).toBe('a'.repeat(200) + '...');
      expect(dto.abstract.length).toBe(203); // 200 + '...'
    });

    it('should not truncate abstract shorter than 200 characters', () => {
      const shortAbstract = 'Short abstract';
      mockProject.abstract = shortAbstract;

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.abstract).toBe(shortAbstract);
    });

    it('should handle exactly 200 character abstract', () => {
      const exactAbstract = 'a'.repeat(200);
      mockProject.abstract = exactAbstract;

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.abstract).toBe(exactAbstract);
    });

    it('should handle null or undefined abstract', () => {
      mockProject.abstract = null;
      const dto1 = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto1.abstract).toBe('undefined');

      mockProject.abstract = undefined;
      const dto2 = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto2.abstract).toBe('undefined');
    });
  });

  describe('supervisor transformation', () => {
    it('should transform supervisor object correctly', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);

      expect(dto.supervisor).toEqual({
        id: 'supervisor-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@university.edu',
      });
    });

    it('should handle missing supervisor', () => {
      mockProject.supervisor = null;
      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.supervisor).toEqual({
        id: undefined,
        firstName: undefined,
        lastName: undefined,
        email: undefined,
      });
    });

    it('should handle partial supervisor data', () => {
      mockProject.supervisor = {
        id: 'supervisor-123',
        firstName: 'John',
        // lastName and email missing
      };

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.supervisor).toEqual({
        id: 'supervisor-123',
        firstName: 'John',
        lastName: undefined,
        email: undefined,
      });
    });
  });

  describe('search-specific fields', () => {
    it('should include relevance score when provided', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.relevanceScore).toBe(0.95);
    });

    it('should include highlighted title when provided', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.highlightedTitle).toBe(
        'Machine <mark>Learning</mark> Project for Predictive Analytics',
      );
    });

    it('should include highlighted abstract when provided', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.highlightedAbstract).toBe(
        'This is a comprehensive machine <mark>learning</mark> project...',
      );
    });

    it('should handle missing search-specific fields', () => {
      delete mockProject.relevanceScore;
      delete mockProject.highlightedTitle;
      delete mockProject.highlightedAbstract;

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.relevanceScore).toBeUndefined();
      expect(dto.highlightedTitle).toBeUndefined();
      expect(dto.highlightedAbstract).toBeUndefined();
    });
  });

  describe('array fields', () => {
    it('should handle empty arrays', () => {
      mockProject.tags = [];
      mockProject.technologyStack = [];

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.tags).toEqual([]);
      expect(dto.technologyStack).toEqual([]);
    });

    it('should preserve array order', () => {
      const orderedTags = ['z-tag', 'a-tag', 'm-tag'];
      const orderedTech = ['ZFramework', 'ALibrary', 'MDatabase'];

      mockProject.tags = orderedTags;
      mockProject.technologyStack = orderedTech;

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.tags).toEqual(orderedTags);
      expect(dto.technologyStack).toEqual(orderedTech);
    });
  });

  describe('enum fields', () => {
    it('should handle all difficulty levels', () => {
      Object.values(DifficultyLevel).forEach((level) => {
        mockProject.difficultyLevel = level;
        const dto = plainToClass(ProjectSummaryDto, mockProject);
        expect(dto.difficultyLevel).toBe(level);
      });
    });

    it('should handle all approval statuses', () => {
      Object.values(ApprovalStatus).forEach((status) => {
        mockProject.approvalStatus = status;
        const dto = plainToClass(ProjectSummaryDto, mockProject);
        expect(dto.approvalStatus).toBe(status);
      });
    });
  });

  describe('date fields', () => {
    it('should preserve date objects', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.createdAt).toEqual(mockProject.createdAt);
      expect(dto.approvedAt).toEqual(mockProject.approvedAt);
    });

    it('should handle date strings', () => {
      mockProject.createdAt = '2024-01-15T10:00:00Z';
      mockProject.approvedAt = '2024-01-20T14:30:00Z';

      const dto = plainToClass(ProjectSummaryDto, mockProject);
      expect(dto.createdAt).toBe('2024-01-15T10:00:00Z');
      expect(dto.approvedAt).toBe('2024-01-20T14:30:00Z');
    });
  });

  describe('complete transformation', () => {
    it('should transform complete project object', () => {
      const dto = plainToClass(ProjectSummaryDto, mockProject);

      // Verify all fields are present and correctly transformed
      expect(dto).toMatchObject({
        id: mockProject.id,
        title: mockProject.title,
        abstract: mockProject.abstract.substring(0, 200) + '...', // Will be truncated
        specialization: mockProject.specialization,
        difficultyLevel: mockProject.difficultyLevel,
        year: mockProject.year,
        tags: mockProject.tags,
        technologyStack: mockProject.technologyStack,
        isGroupProject: mockProject.isGroupProject,
        approvalStatus: mockProject.approvalStatus,
        supervisor: {
          id: mockProject.supervisor.id,
          firstName: mockProject.supervisor.firstName,
          lastName: mockProject.supervisor.lastName,
          email: mockProject.supervisor.email,
        },
        createdAt: mockProject.createdAt,
        approvedAt: mockProject.approvedAt,
        relevanceScore: mockProject.relevanceScore,
        highlightedTitle: mockProject.highlightedTitle,
        highlightedAbstract: mockProject.highlightedAbstract,
      });
    });

    it('should handle minimal project object', () => {
      const minimalProject = {
        id: '123',
        title: 'Test Project',
        abstract: 'Test abstract',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2024,
        tags: [],
        technologyStack: [],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.PENDING,
        createdAt: new Date(),
        approvedAt: null,
      };

      const dto = plainToClass(ProjectSummaryDto, minimalProject);
      expect(dto.id).toBe('123');
      expect(dto.title).toBe('Test Project');
      expect(dto.approvedAt).toBeNull();
    });
  });
});
