import { Project } from '../project.entity';
import { DifficultyLevel, ApprovalStatus } from '../../common/enums';

describe('Project Entity', () => {
  let project: Project;

  beforeEach(() => {
    project = new Project();
    project.title = 'AI-Powered Student Management System';
    project.abstract =
      'A comprehensive system that uses artificial intelligence to manage student records, track academic progress, and provide personalized recommendations for academic improvement.';
    project.specialization = 'Artificial Intelligence & Machine Learning';
    project.difficultyLevel = DifficultyLevel.INTERMEDIATE;
    project.year = 2024;
    project.tags = [
      'AI',
      'Machine Learning',
      'Student Management',
      'Web Application',
    ];
    project.technologyStack = [
      'Python',
      'TensorFlow',
      'React',
      'Node.js',
      'PostgreSQL',
    ];
    project.isGroupProject = false;
    project.approvalStatus = ApprovalStatus.PENDING;
    project.supervisorId = 'supervisor-uuid-123';
  });

  describe('Entity Structure', () => {
    it('should create a project with all required fields', () => {
      expect(project.title).toBe('AI-Powered Student Management System');
      expect(project.abstract).toContain('artificial intelligence');
      expect(project.specialization).toBe(
        'Artificial Intelligence & Machine Learning',
      );
      expect(project.difficultyLevel).toBe(DifficultyLevel.INTERMEDIATE);
      expect(project.year).toBe(2024);
      expect(project.supervisorId).toBe('supervisor-uuid-123');
    });

    it('should have default values for optional fields', () => {
      const newProject = new Project();
      expect(newProject.tags).toBeUndefined(); // Will be set by TypeORM default
      expect(newProject.technologyStack).toBeUndefined(); // Will be set by TypeORM default
      expect(newProject.isGroupProject).toBeUndefined(); // Will be set by TypeORM default
      expect(newProject.approvalStatus).toBeUndefined(); // Will be set by TypeORM default
    });

    it('should allow nullable fields to be null', () => {
      project.githubUrl = null;
      project.demoUrl = null;
      project.notes = null;
      project.approvedAt = null;
      project.approvedBy = null;

      expect(project.githubUrl).toBeNull();
      expect(project.demoUrl).toBeNull();
      expect(project.notes).toBeNull();
      expect(project.approvedAt).toBeNull();
      expect(project.approvedBy).toBeNull();
    });
  });

  describe('Difficulty Level Validation', () => {
    it('should accept valid difficulty levels', () => {
      const levels = [
        DifficultyLevel.BEGINNER,
        DifficultyLevel.INTERMEDIATE,
        DifficultyLevel.ADVANCED,
      ];

      levels.forEach((level) => {
        project.difficultyLevel = level;
        expect(project.difficultyLevel).toBe(level);
      });
    });
  });

  describe('Approval Status Validation', () => {
    it('should accept valid approval statuses', () => {
      const statuses = [
        ApprovalStatus.PENDING,
        ApprovalStatus.APPROVED,
        ApprovalStatus.REJECTED,
        ApprovalStatus.ARCHIVED,
      ];

      statuses.forEach((status) => {
        project.approvalStatus = status;
        expect(project.approvalStatus).toBe(status);
      });
    });
  });

  describe('Array Fields', () => {
    it('should handle tags array correctly', () => {
      const tags = ['AI', 'Machine Learning', 'Web Development'];
      project.tags = tags;
      expect(project.tags).toEqual(tags);
      expect(project.tags.length).toBe(3);
    });

    it('should handle technology stack array correctly', () => {
      const techStack = ['Python', 'React', 'PostgreSQL'];
      project.technologyStack = techStack;
      expect(project.technologyStack).toEqual(techStack);
      expect(project.technologyStack.length).toBe(3);
    });

    it('should handle empty arrays', () => {
      project.tags = [];
      project.technologyStack = [];
      expect(project.tags).toEqual([]);
      expect(project.technologyStack).toEqual([]);
    });
  });

  describe('URL Fields', () => {
    it('should accept valid URLs', () => {
      project.githubUrl = 'https://github.com/user/project';
      project.demoUrl = 'https://project-demo.com';

      expect(project.githubUrl).toBe('https://github.com/user/project');
      expect(project.demoUrl).toBe('https://project-demo.com');
    });
  });

  describe('Relationships', () => {
    it('should allow supervisor relationship', () => {
      expect(project.supervisor).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });

    it('should allow bookmarks relationship', () => {
      expect(project.bookmarks).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });

    it('should allow views relationship', () => {
      expect(project.views).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      expect(project.createdAt).toBeUndefined(); // Will be set by TypeORM
      expect(project.updatedAt).toBeUndefined(); // Will be set by TypeORM
    });

    it('should handle approval timestamp', () => {
      const approvalDate = new Date();
      project.approvedAt = approvalDate;
      expect(project.approvedAt).toBe(approvalDate);
    });
  });

  describe('Search Vector', () => {
    it('should have search vector field for full-text search', () => {
      expect(project.searchVector).toBeUndefined();
      // This field is managed by PostgreSQL triggers
    });
  });
});
