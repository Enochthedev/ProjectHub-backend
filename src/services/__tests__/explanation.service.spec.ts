import { Test, TestingModule } from '@nestjs/testing';
import { ExplanationService } from '../explanation.service';
import { ProjectRecommendationDto } from '../../dto/recommendation';
import { StudentProfile } from '../../entities/student-profile.entity';
import { User } from '../../entities/user.entity';

describe('ExplanationService', () => {
  let service: ExplanationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExplanationService],
    }).compile();

    service = module.get<ExplanationService>(ExplanationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessibleExplanation', () => {
    it('should generate accessible explanation with all components', () => {
      // Arrange
      const mockUser = new User();
      mockUser.id = 'test-user-id';

      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['JavaScript', 'React', 'Node.js'];
      mockStudentProfile.interests = ['web development', 'frontend'];
      mockStudentProfile.preferredSpecializations = ['Software Engineering'];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'E-commerce Web Application',
        abstract: 'Build a modern e-commerce platform using React and Node.js',
        specialization: 'Software Engineering',
        difficultyLevel: 'intermediate',
        similarityScore: 0.85,
        matchingSkills: ['JavaScript', 'React'],
        matchingInterests: ['web development'],
        reasoning: 'This project matches your skills and interests',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. Smith',
          specialization: 'Software Engineering',
        },
      };

      // Act
      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.plainLanguage).toContain('very good match');
      expect(result.plainLanguage).toContain('JavaScript and React');
      expect(result.plainLanguage).toContain('web development');
      expect(result.technicalTerms).toHaveProperty('JavaScript');
      expect(result.technicalTerms).toHaveProperty('React');
      expect(result.visualElements.scoreVisualization.value).toBe(85);
      expect(result.visualElements.scoreVisualization.color).toBe('green');
      expect(result.accessibility.screenReaderText).toContain(
        'Project recommendation',
      );
      expect(result.accessibility.ariaLabels).toHaveProperty('match-score');
    });

    it('should handle low similarity scores appropriately', () => {
      // Arrange
      const mockUser = new User();
      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['Python'];
      mockStudentProfile.interests = ['data science'];
      mockStudentProfile.preferredSpecializations = ['Data Science'];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'Mobile Game Development',
        abstract: 'Create a mobile game using Unity and C#',
        specialization: 'Game Development',
        difficultyLevel: 'advanced',
        similarityScore: 0.3,
        matchingSkills: [],
        matchingInterests: [],
        reasoning: 'This project could help you explore new areas',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. Johnson',
          specialization: 'Game Development',
        },
      };

      // Act
      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );

      // Assert
      expect(result.plainLanguage).toContain('worth considering');
      expect(result.visualElements.scoreVisualization.color).toBe('red');
      expect(result.visualElements.scoreVisualization.description).toContain(
        'Lower match',
      );
    });

    it('should provide technical term definitions', () => {
      // Arrange
      const mockUser = new User();
      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['Machine Learning', 'Python'];
      mockStudentProfile.interests = ['AI'];
      mockStudentProfile.preferredSpecializations = ['Artificial Intelligence'];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'AI Chatbot Development',
        abstract: 'Build an intelligent chatbot using machine learning',
        specialization: 'Artificial Intelligence',
        difficultyLevel: 'advanced',
        similarityScore: 0.9,
        matchingSkills: ['Machine Learning', 'Python'],
        matchingInterests: ['AI'],
        reasoning: 'Perfect match for your AI interests',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. AI Expert',
          specialization: 'Artificial Intelligence',
        },
      };

      // Act
      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );

      // Assert
      expect(result.technicalTerms).toHaveProperty('Machine Learning');
      expect(result.technicalTerms['Machine Learning']).toContain(
        'artificial intelligence',
      );
      expect(result.technicalTerms).toHaveProperty('Python');
      expect(result.technicalTerms['Python']).toContain('programming language');
      expect(result.technicalTerms).toHaveProperty('Artificial Intelligence');
    });

    it('should create appropriate visual elements', () => {
      // Arrange
      const mockUser = new User();
      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['JavaScript', 'React'];
      mockStudentProfile.interests = ['web development'];
      mockStudentProfile.preferredSpecializations = ['Web Development'];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'React Dashboard',
        abstract: 'Build a data visualization dashboard',
        specialization: 'Web Development',
        difficultyLevel: 'intermediate',
        similarityScore: 0.75,
        matchingSkills: ['JavaScript', 'React'],
        matchingInterests: ['web development'],
        reasoning: 'Good match for your web development skills',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. Web',
          specialization: 'Web Development',
        },
      };

      // Act
      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );

      // Assert
      expect(result.visualElements.matchingElements.skills).toHaveLength(2);
      expect(result.visualElements.matchingElements.skills[0].name).toBe(
        'JavaScript',
      );
      expect(
        result.visualElements.matchingElements.skills[0].matchStrength,
      ).toBe('strong');
      expect(result.visualElements.matchingElements.interests).toHaveLength(1);
      expect(result.visualElements.matchingElements.interests[0].name).toBe(
        'web development',
      );
      expect(result.visualElements.progressIndicators).toHaveLength(3);
      expect(result.visualElements.progressIndicators[0].label).toBe(
        'Skills Match',
      );
    });

    it('should generate accessibility features', () => {
      // Arrange
      const mockUser = new User();
      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['Java'];
      mockStudentProfile.interests = ['backend'];
      mockStudentProfile.preferredSpecializations = ['Software Engineering'];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'Microservices Architecture',
        abstract: 'Design and implement microservices using Java',
        specialization: 'Software Engineering',
        difficultyLevel: 'advanced',
        similarityScore: 0.8,
        matchingSkills: ['Java'],
        matchingInterests: ['backend'],
        reasoning: 'Great match for backend development',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. Backend',
          specialization: 'Software Engineering',
        },
      };

      // Act
      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );

      // Assert
      expect(result.accessibility.screenReaderText).toContain(
        'Project recommendation: Microservices Architecture',
      );
      expect(result.accessibility.screenReaderText).toContain(
        'Match score: 80 percent',
      );
      expect(result.accessibility.screenReaderText).toContain(
        'Matching skills: Java',
      );
      expect(result.accessibility.screenReaderText).toContain(
        'Matching interests: backend',
      );
      expect(result.accessibility.ariaLabels['project-title']).toContain(
        'Microservices Architecture',
      );
      expect(result.accessibility.ariaLabels['match-score']).toContain(
        '80 percent',
      );
      expect(result.accessibility.keyboardNavigation).toBe(true);
    });
  });

  describe('skill and interest formatting', () => {
    it('should format single skill correctly', () => {
      const mockUser = new User();
      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['Python'];
      mockStudentProfile.interests = [];
      mockStudentProfile.preferredSpecializations = [];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'Test Project',
        abstract: 'Test abstract',
        specialization: 'Data Science',
        difficultyLevel: 'beginner',
        similarityScore: 0.6,
        matchingSkills: ['Python'],
        matchingInterests: [],
        reasoning: 'Test reasoning',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. Test',
          specialization: 'Data Science',
        },
      };

      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );
      expect(result.plainLanguage).toContain(
        'Your experience with Python makes',
      );
    });

    it('should format multiple skills correctly', () => {
      const mockUser = new User();
      const mockStudentProfile = new StudentProfile();
      mockStudentProfile.user = mockUser;
      mockStudentProfile.skills = ['JavaScript', 'React', 'Node.js'];
      mockStudentProfile.interests = [];
      mockStudentProfile.preferredSpecializations = [];

      const mockRecommendation: ProjectRecommendationDto = {
        projectId: 'test-project-id',
        title: 'Test Project',
        abstract: 'Test abstract',
        specialization: 'Web Development',
        difficultyLevel: 'intermediate',
        similarityScore: 0.7,
        matchingSkills: ['JavaScript', 'React', 'Node.js'],
        matchingInterests: [],
        reasoning: 'Test reasoning',
        supervisor: {
          id: 'supervisor-id',
          name: 'Dr. Test',
          specialization: 'Web Development',
        },
      };

      const result = service.generateAccessibleExplanation(
        mockRecommendation,
        mockStudentProfile,
      );
      expect(result.plainLanguage).toContain('JavaScript, React, and Node.js');
    });
  });

  describe('difficulty explanations', () => {
    it('should provide appropriate difficulty explanations', () => {
      const testCases = [
        { difficulty: 'beginner', expectedText: 'new to this area' },
        { difficulty: 'intermediate', expectedText: 'background knowledge' },
        { difficulty: 'advanced', expectedText: 'challenging project' },
        { difficulty: 'expert', expectedText: 'highly complex' },
      ];

      testCases.forEach(({ difficulty, expectedText }) => {
        const mockUser = new User();
        const mockStudentProfile = new StudentProfile();
        mockStudentProfile.user = mockUser;
        mockStudentProfile.skills = [];
        mockStudentProfile.interests = [];
        mockStudentProfile.preferredSpecializations = [];

        const mockRecommendation: ProjectRecommendationDto = {
          projectId: 'test-project-id',
          title: 'Test Project',
          abstract: 'Test abstract',
          specialization: 'Test Specialization',
          difficultyLevel: difficulty,
          similarityScore: 0.5,
          matchingSkills: [],
          matchingInterests: [],
          reasoning: 'Test reasoning',
          supervisor: {
            id: 'supervisor-id',
            name: 'Dr. Test',
            specialization: 'Test Specialization',
          },
        };

        const result = service.generateAccessibleExplanation(
          mockRecommendation,
          mockStudentProfile,
        );
        expect(result.plainLanguage).toContain(expectedText);
      });
    });
  });
});
