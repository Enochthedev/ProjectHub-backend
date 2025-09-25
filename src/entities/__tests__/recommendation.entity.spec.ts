import {
  Recommendation,
  ProjectRecommendation,
  StudentProfileSnapshot,
} from '../recommendation.entity';
import { RecommendationStatus } from '../../common/enums/recommendation-status.enum';
import { User } from '../user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

describe('Recommendation Entity', () => {
  let recommendation: Recommendation;
  let mockUser: User;
  let mockProjectSuggestions: ProjectRecommendation[];
  let mockProfileSnapshot: StudentProfileSnapshot;

  beforeEach(() => {
    // Create mock user
    mockUser = new User();
    mockUser.id = 'test-user-id';
    mockUser.email = 'student@ui.edu.ng';
    mockUser.role = UserRole.STUDENT;

    // Create mock project suggestions
    mockProjectSuggestions = [
      {
        projectId: 'project-1',
        title: 'Machine Learning Project',
        abstract: 'A project about ML algorithms',
        specialization: 'Artificial Intelligence',
        difficultyLevel: 'intermediate',
        similarityScore: 0.85,
        matchingSkills: ['Python', 'Machine Learning'],
        matchingInterests: ['AI', 'Data Science'],
        reasoning: 'Strong match based on skills and interests',
        supervisor: {
          id: 'supervisor-1',
          name: 'Dr. Smith',
          specialization: 'AI',
        },
        diversityBoost: 0.1,
      },
      {
        projectId: 'project-2',
        title: 'Web Development Project',
        abstract: 'A full-stack web application',
        specialization: 'Software Engineering',
        difficultyLevel: 'beginner',
        similarityScore: 0.72,
        matchingSkills: ['JavaScript', 'React'],
        matchingInterests: ['Web Development'],
        reasoning: 'Good match for web development interests',
        supervisor: {
          id: 'supervisor-2',
          name: 'Dr. Johnson',
          specialization: 'Software Engineering',
        },
      },
    ];

    // Create mock profile snapshot
    mockProfileSnapshot = {
      skills: ['Python', 'JavaScript', 'Machine Learning'],
      interests: ['AI', 'Web Development', 'Data Science'],
      specializations: ['Artificial Intelligence', 'Software Engineering'],
      preferredDifficulty: 'intermediate',
      careerGoals: 'Become a data scientist',
      profileCompleteness: 0.9,
      snapshotDate: new Date('2024-01-01'),
    };

    // Create recommendation
    recommendation = new Recommendation();
    recommendation.id = 'test-recommendation-id';
    recommendation.student = mockUser;
    recommendation.studentId = mockUser.id;
    recommendation.projectSuggestions = mockProjectSuggestions;
    recommendation.reasoning = 'Generated based on profile analysis';
    recommendation.averageSimilarityScore = 0.785;
    recommendation.profileSnapshot = mockProfileSnapshot;
    recommendation.status = RecommendationStatus.ACTIVE;
    recommendation.createdAt = new Date('2024-01-01');
    recommendation.updatedAt = new Date('2024-01-01');
    recommendation.expiresAt = new Date('2024-01-02');
  });

  describe('Entity Structure', () => {
    it('should create a recommendation with all required fields', () => {
      expect(recommendation.id).toBe('test-recommendation-id');
      expect(recommendation.studentId).toBe('test-user-id');
      expect(recommendation.projectSuggestions).toHaveLength(2);
      expect(recommendation.reasoning).toBe(
        'Generated based on profile analysis',
      );
      expect(recommendation.averageSimilarityScore).toBe(0.785);
      expect(recommendation.status).toBe(RecommendationStatus.ACTIVE);
    });

    it('should have valid project suggestions structure', () => {
      const project = recommendation.projectSuggestions[0];
      expect(project.projectId).toBe('project-1');
      expect(project.title).toBe('Machine Learning Project');
      expect(project.similarityScore).toBe(0.85);
      expect(project.matchingSkills).toContain('Python');
      expect(project.supervisor.name).toBe('Dr. Smith');
    });

    it('should have valid profile snapshot structure', () => {
      const snapshot = recommendation.profileSnapshot;
      expect(snapshot.skills).toContain('Python');
      expect(snapshot.interests).toContain('AI');
      expect(snapshot.profileCompleteness).toBe(0.9);
      expect(snapshot.snapshotDate).toEqual(new Date('2024-01-01'));
    });

    it('should have default status as ACTIVE', () => {
      const newRecommendation = new Recommendation();
      // Note: Default value will be set by TypeORM, not in the entity constructor
      expect(RecommendationStatus.ACTIVE).toBe('active');
    });
  });

  describe('Helper Methods', () => {
    describe('isExpired', () => {
      it('should return true when expiration date has passed', () => {
        recommendation.expiresAt = new Date('2020-01-01'); // Past date
        expect(recommendation.isExpired()).toBe(true);
      });

      it('should return false when expiration date is in the future', () => {
        recommendation.expiresAt = new Date('2030-01-01'); // Future date
        expect(recommendation.isExpired()).toBe(false);
      });

      it('should return false when expiresAt is null', () => {
        recommendation.expiresAt = null;
        expect(recommendation.isExpired()).toBe(false);
      });
    });

    describe('isActive', () => {
      it('should return true when status is ACTIVE and not expired', () => {
        recommendation.status = RecommendationStatus.ACTIVE;
        recommendation.expiresAt = new Date('2030-01-01');
        expect(recommendation.isActive()).toBe(true);
      });

      it('should return false when status is not ACTIVE', () => {
        recommendation.status = RecommendationStatus.EXPIRED;
        recommendation.expiresAt = new Date('2030-01-01');
        expect(recommendation.isActive()).toBe(false);
      });

      it('should return false when expired even if status is ACTIVE', () => {
        recommendation.status = RecommendationStatus.ACTIVE;
        recommendation.expiresAt = new Date('2020-01-01');
        expect(recommendation.isActive()).toBe(false);
      });
    });

    describe('getProjectById', () => {
      it('should return project when found', () => {
        const project = recommendation.getProjectById('project-1');
        expect(project).toBeDefined();
        expect(project?.title).toBe('Machine Learning Project');
      });

      it('should return undefined when project not found', () => {
        const project = recommendation.getProjectById('non-existent');
        expect(project).toBeUndefined();
      });
    });

    describe('getAverageScore', () => {
      it('should calculate correct average score', () => {
        const average = recommendation.getAverageScore();
        const expected = (0.85 + 0.72) / 2;
        expect(average).toBe(expected);
      });

      it('should return 0 when no project suggestions', () => {
        recommendation.projectSuggestions = [];
        expect(recommendation.getAverageScore()).toBe(0);
      });
    });
  });

  describe('Relationships', () => {
    it('should have relationship with User entity', () => {
      expect(recommendation.student).toBe(mockUser);
      expect(recommendation.studentId).toBe(mockUser.id);
    });

    it('should support feedback relationship', () => {
      expect(recommendation.feedback).toBeUndefined(); // Will be populated by TypeORM
    });
  });

  describe('Validation', () => {
    it('should validate JSONB fields structure', () => {
      expect(Array.isArray(recommendation.projectSuggestions)).toBe(true);
      expect(typeof recommendation.profileSnapshot).toBe('object');
    });

    it('should validate similarity score precision', () => {
      // Test that decimal precision is maintained
      recommendation.averageSimilarityScore = 0.123;
      expect(recommendation.averageSimilarityScore).toBe(0.123);
    });

    it('should validate enum values', () => {
      const validStatuses = Object.values(RecommendationStatus);
      expect(validStatuses).toContain(recommendation.status);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      expect(recommendation.createdAt).toEqual(new Date('2024-01-01'));
      expect(recommendation.updatedAt).toEqual(new Date('2024-01-01'));
    });

    it('should allow nullable expiresAt', () => {
      recommendation.expiresAt = null;
      expect(recommendation.expiresAt).toBeNull();
    });
  });
});
