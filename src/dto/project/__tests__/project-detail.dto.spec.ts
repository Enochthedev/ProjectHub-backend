import 'reflect-metadata';
import { plainToClass } from 'class-transformer';
import { ProjectDetailDto } from '../project-detail.dto';
import { DifficultyLevel, ApprovalStatus } from '../../../common/enums';

describe('ProjectDetailDto', () => {
  let mockProject: any;

  beforeEach(() => {
    mockProject = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Advanced Machine Learning System for Predictive Analytics',
      abstract:
        'This comprehensive project involves developing a sophisticated machine learning system that leverages multiple algorithms for predictive analytics. The system includes data preprocessing pipelines, feature engineering modules, model training and evaluation frameworks, and a user-friendly interface for data visualization and insights generation.',
      specialization: 'Artificial Intelligence & Machine Learning',
      difficultyLevel: DifficultyLevel.ADVANCED,
      year: 2024,
      tags: [
        'machine-learning',
        'python',
        'tensorflow',
        'data-science',
        'predictive-analytics',
      ],
      technologyStack: [
        'Python',
        'TensorFlow',
        'Pandas',
        'Scikit-learn',
        'Flask',
        'React',
        'PostgreSQL',
      ],
      isGroupProject: true,
      approvalStatus: ApprovalStatus.APPROVED,
      githubUrl: 'https://github.com/university/ml-predictive-system',
      demoUrl: 'https://ml-demo.university.edu',
      notes:
        'This project requires strong mathematical background and experience with machine learning frameworks. Students should have completed courses in statistics and linear algebra.',
      supervisor: {
        id: 'supervisor-456',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane.smith@university.edu',
        supervisorProfile: {
          specializations: [
            'Artificial Intelligence & Machine Learning',
            'Data Science & Analytics',
          ],
        },
      },
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-20T15:30:00Z'),
      approvedAt: new Date('2024-01-22T09:15:00Z'),
      approvedBy: 'admin-789',
      viewCount: 125,
      bookmarkCount: 18,
    };
  });

  describe('basic field transformation', () => {
    it('should expose all required fields', () => {
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.id).toBe(mockProject.id);
      expect(dto.title).toBe(mockProject.title);
      expect(dto.abstract).toBe(mockProject.abstract);
      expect(dto.specialization).toBe(mockProject.specialization);
      expect(dto.difficultyLevel).toBe(mockProject.difficultyLevel);
      expect(dto.year).toBe(mockProject.year);
      expect(dto.tags).toEqual(mockProject.tags);
      expect(dto.technologyStack).toEqual(mockProject.technologyStack);
      expect(dto.isGroupProject).toBe(mockProject.isGroupProject);
      expect(dto.approvalStatus).toBe(mockProject.approvalStatus);
      expect(dto.githubUrl).toBe(mockProject.githubUrl);
      expect(dto.demoUrl).toBe(mockProject.demoUrl);
      expect(dto.notes).toBe(mockProject.notes);
      expect(dto.createdAt).toEqual(mockProject.createdAt);
      expect(dto.updatedAt).toEqual(mockProject.updatedAt);
      expect(dto.approvedAt).toEqual(mockProject.approvedAt);
      expect(dto.approvedBy).toBe(mockProject.approvedBy);
    });

    it('should handle null optional fields', () => {
      mockProject.githubUrl = null;
      mockProject.demoUrl = null;
      mockProject.notes = null;
      mockProject.approvedAt = null;
      mockProject.approvedBy = null;

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.githubUrl).toBeNull();
      expect(dto.demoUrl).toBeNull();
      expect(dto.notes).toBeNull();
      expect(dto.approvedAt).toBeNull();
      expect(dto.approvedBy).toBeNull();
    });
  });

  describe('supervisor transformation', () => {
    it('should transform supervisor object correctly', () => {
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.supervisor).toEqual({
        id: 'supervisor-456',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane.smith@university.edu',
        specializations: [
          'Artificial Intelligence & Machine Learning',
          'Data Science & Analytics',
        ],
      });
    });

    it('should handle missing supervisor', () => {
      mockProject.supervisor = null;
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.supervisor).toEqual({
        id: undefined,
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        specializations: [],
      });
    });

    it('should handle supervisor without profile', () => {
      mockProject.supervisor = {
        id: 'supervisor-456',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane.smith@university.edu',
        supervisorProfile: null,
      };

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.supervisor).toEqual({
        id: 'supervisor-456',
        firstName: 'Dr. Jane',
        lastName: 'Smith',
        email: 'jane.smith@university.edu',
        specializations: [],
      });
    });

    it('should handle supervisor with empty specializations', () => {
      mockProject.supervisor.supervisorProfile.specializations = [];

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.supervisor.specializations).toEqual([]);
    });

    it('should handle partial supervisor data', () => {
      mockProject.supervisor = {
        id: 'supervisor-456',
        firstName: 'Dr. Jane',
        // lastName and email missing
        supervisorProfile: {
          specializations: ['Web Development & Full Stack'],
        },
      };

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.supervisor).toEqual({
        id: 'supervisor-456',
        firstName: 'Dr. Jane',
        lastName: undefined,
        email: undefined,
        specializations: ['Web Development & Full Stack'],
      });
    });
  });

  describe('analytics fields', () => {
    it('should include analytics data when provided', () => {
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.viewCount).toBe(125);
      expect(dto.bookmarkCount).toBe(18);
    });

    it('should handle missing analytics data', () => {
      delete mockProject.viewCount;
      delete mockProject.bookmarkCount;

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.viewCount).toBeUndefined();
      expect(dto.bookmarkCount).toBeUndefined();
    });

    it('should handle zero analytics values', () => {
      mockProject.viewCount = 0;
      mockProject.bookmarkCount = 0;

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.viewCount).toBe(0);
      expect(dto.bookmarkCount).toBe(0);
    });
  });

  describe('array fields', () => {
    it('should handle empty arrays', () => {
      mockProject.tags = [];
      mockProject.technologyStack = [];

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.tags).toEqual([]);
      expect(dto.technologyStack).toEqual([]);
    });

    it('should preserve array order', () => {
      const orderedTags = ['z-tag', 'a-tag', 'm-tag'];
      const orderedTech = ['ZFramework', 'ALibrary', 'MDatabase'];

      mockProject.tags = orderedTags;
      mockProject.technologyStack = orderedTech;

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.tags).toEqual(orderedTags);
      expect(dto.technologyStack).toEqual(orderedTech);
    });

    it('should handle large arrays', () => {
      mockProject.tags = Array(10)
        .fill(0)
        .map((_, i) => `tag-${i}`);
      mockProject.technologyStack = Array(15)
        .fill(0)
        .map((_, i) => `tech-${i}`);

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.tags).toHaveLength(10);
      expect(dto.technologyStack).toHaveLength(15);
      expect(dto.tags[0]).toBe('tag-0');
      expect(dto.technologyStack[0]).toBe('tech-0');
    });
  });

  describe('enum fields', () => {
    it('should handle all difficulty levels', () => {
      Object.values(DifficultyLevel).forEach((level) => {
        mockProject.difficultyLevel = level;
        const dto = plainToClass(ProjectDetailDto, mockProject);
        expect(dto.difficultyLevel).toBe(level);
      });
    });

    it('should handle all approval statuses', () => {
      Object.values(ApprovalStatus).forEach((status) => {
        mockProject.approvalStatus = status;
        const dto = plainToClass(ProjectDetailDto, mockProject);
        expect(dto.approvalStatus).toBe(status);
      });
    });
  });

  describe('date fields', () => {
    it('should preserve date objects', () => {
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.createdAt).toEqual(mockProject.createdAt);
      expect(dto.updatedAt).toEqual(mockProject.updatedAt);
      expect(dto.approvedAt).toEqual(mockProject.approvedAt);
    });

    it('should handle date strings', () => {
      mockProject.createdAt = '2024-01-15T10:00:00Z';
      mockProject.updatedAt = '2024-01-20T15:30:00Z';
      mockProject.approvedAt = '2024-01-22T09:15:00Z';

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.createdAt).toBe('2024-01-15T10:00:00Z');
      expect(dto.updatedAt).toBe('2024-01-20T15:30:00Z');
      expect(dto.approvedAt).toBe('2024-01-22T09:15:00Z');
    });

    it('should handle null approved date for pending projects', () => {
      mockProject.approvalStatus = ApprovalStatus.PENDING;
      mockProject.approvedAt = null;
      mockProject.approvedBy = null;

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.approvedAt).toBeNull();
      expect(dto.approvedBy).toBeNull();
    });
  });

  describe('URL fields', () => {
    it('should handle valid URLs', () => {
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.githubUrl).toBe(
        'https://github.com/university/ml-predictive-system',
      );
      expect(dto.demoUrl).toBe('https://ml-demo.university.edu');
    });

    it('should handle missing URLs', () => {
      mockProject.githubUrl = null;
      mockProject.demoUrl = null;

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.githubUrl).toBeNull();
      expect(dto.demoUrl).toBeNull();
    });

    it('should handle empty string URLs', () => {
      mockProject.githubUrl = '';
      mockProject.demoUrl = '';

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.githubUrl).toBe('');
      expect(dto.demoUrl).toBe('');
    });
  });

  describe('complete transformation scenarios', () => {
    it('should transform complete project with all fields', () => {
      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto).toMatchObject({
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
          id: mockProject.supervisor.id,
          firstName: mockProject.supervisor.firstName,
          lastName: mockProject.supervisor.lastName,
          email: mockProject.supervisor.email,
          specializations:
            mockProject.supervisor.supervisorProfile.specializations,
        },
        createdAt: mockProject.createdAt,
        updatedAt: mockProject.updatedAt,
        approvedAt: mockProject.approvedAt,
        approvedBy: mockProject.approvedBy,
        viewCount: mockProject.viewCount,
        bookmarkCount: mockProject.bookmarkCount,
      });
    });

    it('should handle minimal project object', () => {
      const minimalProject = {
        id: '123',
        title: 'Minimal Project',
        abstract:
          'A minimal project for testing purposes with just the required fields and some basic information.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2024,
        tags: [],
        technologyStack: [],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.PENDING,
        githubUrl: null,
        demoUrl: null,
        notes: null,
        supervisor: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        approvedAt: null,
        approvedBy: null,
      };

      const dto = plainToClass(ProjectDetailDto, minimalProject);

      expect(dto.id).toBe('123');
      expect(dto.title).toBe('Minimal Project');
      expect(dto.approvalStatus).toBe(ApprovalStatus.PENDING);
      expect(dto.githubUrl).toBeNull();
      expect(dto.demoUrl).toBeNull();
      expect(dto.notes).toBeNull();
      expect(dto.approvedAt).toBeNull();
      expect(dto.approvedBy).toBeNull();
      expect(dto.supervisor).toEqual({
        id: undefined,
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        specializations: [],
      });
    });

    it('should handle project with complex supervisor data', () => {
      mockProject.supervisor = {
        id: 'supervisor-complex',
        firstName: 'Prof. Dr.',
        lastName: 'Complex Name-With-Hyphens',
        email: 'complex.name@university.edu',
        supervisorProfile: {
          specializations: [
            'Artificial Intelligence & Machine Learning',
            'Data Science & Analytics',
            'Software Engineering & Architecture',
          ],
        },
      };

      const dto = plainToClass(ProjectDetailDto, mockProject);

      expect(dto.supervisor).toEqual({
        id: 'supervisor-complex',
        firstName: 'Prof. Dr.',
        lastName: 'Complex Name-With-Hyphens',
        email: 'complex.name@university.edu',
        specializations: [
          'Artificial Intelligence & Machine Learning',
          'Data Science & Analytics',
          'Software Engineering & Architecture',
        ],
      });
    });

    it('should handle project in different approval states', () => {
      // Test pending project
      mockProject.approvalStatus = ApprovalStatus.PENDING;
      mockProject.approvedAt = null;
      mockProject.approvedBy = null;

      let dto = plainToClass(ProjectDetailDto, mockProject);
      expect(dto.approvalStatus).toBe(ApprovalStatus.PENDING);
      expect(dto.approvedAt).toBeNull();
      expect(dto.approvedBy).toBeNull();

      // Test rejected project
      mockProject.approvalStatus = ApprovalStatus.REJECTED;
      mockProject.approvedAt = new Date('2024-01-25T10:00:00Z');
      mockProject.approvedBy = 'admin-reject';

      dto = plainToClass(ProjectDetailDto, mockProject);
      expect(dto.approvalStatus).toBe(ApprovalStatus.REJECTED);
      expect(dto.approvedAt).toEqual(new Date('2024-01-25T10:00:00Z'));
      expect(dto.approvedBy).toBe('admin-reject');

      // Test archived project
      mockProject.approvalStatus = ApprovalStatus.ARCHIVED;

      dto = plainToClass(ProjectDetailDto, mockProject);
      expect(dto.approvalStatus).toBe(ApprovalStatus.ARCHIVED);
    });
  });
});
