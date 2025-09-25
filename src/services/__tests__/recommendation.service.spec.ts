import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { RecommendationService } from '../recommendation.service';
import { Recommendation } from '../../entities/recommendation.entity';
import { RecommendationFeedback } from '../../entities/recommendation-feedback.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { EmbeddingService } from '../embedding.service';
import { SimilarityService } from '../similarity.service';
import { TextProcessingService } from '../text-processing.service';

import { RecommendationStatus } from '../../common/enums/recommendation-status.enum';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';

describe('RecommendationService', () => {
  let service: RecommendationService;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let feedbackRepository: jest.Mocked<Repository<RecommendationFeedback>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let cacheManager: jest.Mocked<any>;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let similarityService: jest.Mocked<SimilarityService>;
  let textProcessingService: jest.Mocked<TextProcessingService>;

  const mockStudent = {
    id: 'student-1',
    studentProfile: {
      id: 'profile-1',
      skills: ['JavaScript', 'React', 'Node.js'],
      interests: ['Web Development', 'AI', 'Machine Learning'],
      preferredSpecializations: ['Software Engineering', 'AI/ML'],
    },
  };

  const mockProjects = [
    {
      id: 'project-1',
      title: 'AI-Powered Web Application',
      abstract: 'Build a web application using AI and machine learning',
      specialization: 'AI/ML',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      technologyStack: ['JavaScript', 'Python', 'TensorFlow'],
      tags: ['AI', 'Web', 'Machine Learning'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor-1',
        supervisorProfile: {
          name: 'Dr. Smith',
          specializations: ['AI/ML'],
        },
      },
    },
    {
      id: 'project-2',
      title: 'Mobile App Development',
      abstract: 'Create a mobile application for iOS and Android',
      specialization: 'Software Engineering',
      difficultyLevel: DifficultyLevel.BEGINNER,
      technologyStack: ['React Native', 'JavaScript'],
      tags: ['Mobile', 'Cross-platform'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor-2',
        supervisorProfile: {
          name: 'Dr. Johnson',
          specializations: ['Software Engineering'],
        },
      },
    },
  ];

  const mockEmbeddings = {
    embeddings: [
      [0.1, 0.2, 0.3, 0.4, 0.5], // Student embedding
      [0.2, 0.3, 0.4, 0.5, 0.6], // Project 1 embedding
      [0.1, 0.1, 0.2, 0.2, 0.3], // Project 2 embedding
    ],
    tokensUsed: 100,
    processingTimeMs: 500,
    fromCache: false,
  };

  const mockSimilarityResult = {
    similarities: [
      { index: 0, score: 0.85, normalizedScore: 0.9, rank: 1 },
      { index: 1, score: 0.65, normalizedScore: 0.7, rank: 2 },
    ],
    rankedIndices: [0, 1],
    averageScore: 0.75,
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: EmbeddingService,
          useValue: {
            generateEmbeddings: jest.fn(),
          },
        },
        {
          provide: SimilarityService,
          useValue: {
            calculateBatchSimilarity: jest.fn(),
          },
        },
        {
          provide: TextProcessingService,
          useValue: {
            processStudentProfile: jest.fn(),
            processProject: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    recommendationRepository = module.get(getRepositoryToken(Recommendation));
    feedbackRepository = module.get(getRepositoryToken(RecommendationFeedback));
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    cacheManager = module.get(CACHE_MANAGER);
    embeddingService = module.get(EmbeddingService);
    similarityService = module.get(SimilarityService);
    textProcessingService = module.get(TextProcessingService);
  });

  describe('generateRecommendations', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(mockStudent as any);
      mockQueryBuilder.getMany.mockResolvedValue(mockProjects);
      textProcessingService.processStudentProfile.mockReturnValue({
        combined: {
          text: 'student profile text',
          tokens: ['student', 'profile', 'text'],
          wordCount: 3,
          characterCount: 20,
          processedAt: new Date(),
        },
      } as any);
      textProcessingService.processProject.mockReturnValue({
        combined: {
          text: 'project description text',
          tokens: ['project', 'description', 'text'],
          wordCount: 3,
          characterCount: 24,
          processedAt: new Date(),
        },
      } as any);
      embeddingService.generateEmbeddings.mockResolvedValue(
        mockEmbeddings as any,
      );
      similarityService.calculateBatchSimilarity.mockReturnValue(
        mockSimilarityResult as any,
      );
      recommendationRepository.create.mockReturnValue({} as any);
      recommendationRepository.save.mockResolvedValue({} as any);
      cacheManager.get.mockResolvedValue(null);
    });

    it('should generate recommendations successfully', async () => {
      const result = await service.generateRecommendations('student-1');

      expect(result).toBeDefined();
      expect(result.recommendations).toHaveLength(2);
      expect(result.fromCache).toBe(false);
      expect(result.averageSimilarityScore).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should return cached recommendations when available', async () => {
      const cachedResult = {
        recommendations: [],
        reasoning: 'cached',
        averageSimilarityScore: 0.8,
        fromCache: false,
        generatedAt: new Date(),
        metadata: {},
      };
      cacheManager.get.mockResolvedValue(cachedResult);

      const result = await service.generateRecommendations('student-1');

      expect(result.fromCache).toBe(true);
      expect(result.reasoning).toBe('cached');
    });

    it('should throw NotFoundException for non-existent student', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.generateRecommendations('invalid-student'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for student without profile', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'student-1',
        studentProfile: null,
      } as any);

      await expect(
        service.generateRecommendations('student-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate profile completeness', async () => {
      const incompleteStudent = {
        id: 'student-1',
        studentProfile: {
          skills: [], // Empty skills
          interests: ['AI'],
          preferredSpecializations: ['AI/ML'],
        },
      };
      userRepository.findOne.mockResolvedValue(incompleteStudent as any);

      await expect(
        service.generateRecommendations('student-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should apply diversity boost when enabled', async () => {
      const options = { includeDiversityBoost: true };
      const result = await service.generateRecommendations(
        'student-1',
        options,
      );

      expect(result.recommendations.some((r) => r.diversityBoost)).toBe(true);
    });

    it('should filter by specialization when specified', async () => {
      const options = { includeSpecializations: ['AI/ML'] };
      await service.generateRecommendations('student-1', options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization IN (:...specializations)',
        { specializations: ['AI/ML'] },
      );
    });

    it('should exclude specializations when specified', async () => {
      const options = { excludeSpecializations: ['Software Engineering'] };
      await service.generateRecommendations('student-1', options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.specialization NOT IN (:...excludeSpecializations)',
        { excludeSpecializations: ['Software Engineering'] },
      );
    });

    it('should apply difficulty level filter', async () => {
      const options = { maxDifficulty: 'intermediate' };
      await service.generateRecommendations('student-1', options);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(project.difficultyLevel) IN (:...difficulties)',
        { difficulties: ['beginner', 'intermediate'] },
      );
    });

    it('should limit results based on options', async () => {
      const options = { limit: 1 };
      const result = await service.generateRecommendations(
        'student-1',
        options,
      );

      expect(result.recommendations).toHaveLength(1);
    });

    it('should apply minimum similarity score threshold', async () => {
      const options = { minSimilarityScore: 0.8 };
      await service.generateRecommendations('student-1', options);

      expect(similarityService.calculateBatchSimilarity).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({ minThreshold: 0.8 }),
      );
    });

    it('should save recommendation to database', async () => {
      await service.generateRecommendations('student-1');

      expect(recommendationRepository.update).toHaveBeenCalledWith(
        { studentId: 'student-1', status: RecommendationStatus.ACTIVE },
        { status: RecommendationStatus.SUPERSEDED },
      );
      expect(recommendationRepository.create).toHaveBeenCalled();
      expect(recommendationRepository.save).toHaveBeenCalled();
    });

    it('should cache the result', async () => {
      await service.generateRecommendations('student-1');

      expect(cacheManager.set).toHaveBeenCalledWith(
        'recommendations:student-1',
        expect.any(Object),
        3600,
      );
    });

    it('should handle no available projects', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await expect(
        service.generateRecommendations('student-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recommendation generation algorithms', () => {
    it('should find matching skills between student and project', () => {
      const studentProfile = {
        skills: ['JavaScript', 'React', 'Python'],
      } as any;

      const project = {
        technologyStack: ['JavaScript', 'Node.js', 'React'],
      } as any;

      const matchingSkills = (service as any).findMatchingSkills(
        studentProfile,
        project,
      );

      expect(matchingSkills).toContain('JavaScript');
      expect(matchingSkills).toContain('React');
      expect(matchingSkills).not.toContain('Python');
    });

    it('should find matching interests between student and project', () => {
      const studentProfile = {
        interests: ['Web Development', 'AI', 'Machine Learning'],
      } as any;

      const project = {
        tags: ['AI', 'Web'],
        specialization: 'AI/ML',
        title: 'Machine Learning Project',
      } as any;

      const matchingInterests = (service as any).findMatchingInterests(
        studentProfile,
        project,
      );

      expect(matchingInterests).toContain('AI');
      expect(matchingInterests).toContain('Web Development');
      expect(matchingInterests).toContain('Machine Learning');
    });

    it('should generate reasoning based on matching skills', () => {
      const studentProfile = {
        preferredSpecializations: ['AI/ML'],
      } as any;

      const project = {
        specialization: 'AI/ML',
      } as any;

      const matchingSkills = ['JavaScript', 'React'];
      const matchingInterests = [];
      const score = 0.8;

      const reasoning = (service as any).generateProjectReasoning(
        studentProfile,
        project,
        matchingSkills,
        matchingInterests,
        score,
      );

      expect(reasoning).toContain('JavaScript');
      expect(reasoning).toContain('React');
      expect(reasoning).toContain('skills');
    });

    it('should generate reasoning based on matching interests', () => {
      const studentProfile = {
        preferredSpecializations: ['AI/ML'],
      } as any;

      const project = {
        specialization: 'AI/ML',
      } as any;

      const matchingSkills = [];
      const matchingInterests = ['AI', 'Machine Learning'];
      const score = 0.7;

      const reasoning = (service as any).generateProjectReasoning(
        studentProfile,
        project,
        matchingSkills,
        matchingInterests,
        score,
      );

      expect(reasoning).toContain('AI');
      expect(reasoning).toContain('interests');
    });

    it('should indicate high compatibility for high scores', () => {
      const studentProfile = {
        preferredSpecializations: ['AI/ML'],
      } as any;

      const project = {
        specialization: 'AI/ML',
      } as any;

      const matchingSkills = [];
      const matchingInterests = [];
      const score = 0.9;

      const reasoning = (service as any).generateProjectReasoning(
        studentProfile,
        project,
        matchingSkills,
        matchingInterests,
        score,
      );

      expect(reasoning).toContain('highly compatible');
    });

    it('should calculate average similarity score correctly', () => {
      const recommendations = [
        { similarityScore: 0.8 },
        { similarityScore: 0.6 },
        { similarityScore: 0.4 },
      ] as any[];

      const average = (service as any).calculateAverageScore(recommendations);

      expect(average).toBeCloseTo(0.6, 2);
    });

    it('should return 0 for empty recommendations', () => {
      const average = (service as any).calculateAverageScore([]);

      expect(average).toBe(0);
    });
  });

  describe('profile validation', () => {
    it('should pass validation for complete profile', () => {
      const completeProfile = {
        skills: ['JavaScript'],
        interests: ['Web Development'],
        preferredSpecializations: ['Software Engineering'],
      } as any;

      expect(() => {
        (service as any).validateProfileCompleteness(completeProfile);
      }).not.toThrow();
    });

    it('should throw error for missing skills', () => {
      const incompleteProfile = {
        skills: [],
        interests: ['Web Development'],
        preferredSpecializations: ['Software Engineering'],
      } as any;

      expect(() => {
        (service as any).validateProfileCompleteness(incompleteProfile);
      }).toThrow(BadRequestException);
    });

    it('should throw error for missing interests', () => {
      const incompleteProfile = {
        skills: ['JavaScript'],
        interests: [],
        preferredSpecializations: ['Software Engineering'],
      } as any;

      expect(() => {
        (service as any).validateProfileCompleteness(incompleteProfile);
      }).toThrow(BadRequestException);
    });

    it('should throw error for missing specializations', () => {
      const incompleteProfile = {
        skills: ['JavaScript'],
        interests: ['Web Development'],
        preferredSpecializations: [],
      } as any;

      expect(() => {
        (service as any).validateProfileCompleteness(incompleteProfile);
      }).toThrow(BadRequestException);
    });

    it('should list all missing fields in error message', () => {
      const incompleteProfile = {
        skills: [],
        interests: [],
        preferredSpecializations: [],
      } as any;

      expect(() => {
        (service as any).validateProfileCompleteness(incompleteProfile);
      }).toThrow('skills, interests, preferredSpecializations');
    });
  });

  describe('feedback and explanation', () => {
    const mockRecommendation = {
      id: 'rec-1',
      getProjectById: jest.fn(),
    };

    beforeEach(() => {
      recommendationRepository.findOne.mockResolvedValue(
        mockRecommendation as any,
      );
      mockRecommendation.getProjectById.mockReturnValue({ id: 'project-1' });
      feedbackRepository.create.mockReturnValue({} as any);
      feedbackRepository.save.mockResolvedValue({} as any);
    });

    it('should submit feedback successfully', async () => {
      const feedbackDto = {
        feedbackType: FeedbackType.LIKE,
        comment: 'Great recommendation!',
      };

      await service.submitFeedback('rec-1', 'project-1', feedbackDto);

      expect(feedbackRepository.create).toHaveBeenCalledWith({
        recommendationId: 'rec-1',
        projectId: 'project-1',
        feedbackType: FeedbackType.LIKE,
        rating: undefined,
        comment: 'Great recommendation!',
      });
      expect(feedbackRepository.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent recommendation', async () => {
      recommendationRepository.findOne.mockResolvedValue(null);

      const feedbackDto = {
        feedbackType: FeedbackType.LIKE,
        comment: 'Great recommendation!',
      };

      await expect(
        service.submitFeedback('invalid-rec', 'project-1', feedbackDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should require rating for RATING feedback type', async () => {
      const feedbackDto = {
        feedbackType: FeedbackType.RATING,
      };

      await expect(
        service.submitFeedback('rec-1', 'project-1', feedbackDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept rating for RATING feedback type', async () => {
      const feedbackDto = {
        feedbackType: FeedbackType.RATING,
        rating: 4.5,
        comment: 'Good match',
      };

      await service.submitFeedback('rec-1', 'project-1', feedbackDto);

      expect(feedbackRepository.create).toHaveBeenCalledWith({
        recommendationId: 'rec-1',
        projectId: 'project-1',
        feedbackType: FeedbackType.RATING,
        rating: 4.5,
        comment: 'Good match',
      });
    });

    it('should provide detailed explanation for recommendation', async () => {
      const mockProject = {
        id: 'project-1',
        reasoning: 'This project matches your AI interests',
        similarityScore: 0.8,
        matchingSkills: ['JavaScript', 'Python'],
        matchingInterests: ['AI', 'Machine Learning'],
        specialization: 'AI/ML',
        diversityBoost: 0.1,
      };

      const mockRecommendationWithSnapshot = {
        ...mockRecommendation,
        profileSnapshot: {
          specializations: ['AI/ML'],
          profileCompleteness: 85,
        },
      };

      recommendationRepository.findOne.mockResolvedValue(
        mockRecommendationWithSnapshot as any,
      );
      mockRecommendationWithSnapshot.getProjectById.mockReturnValue(
        mockProject,
      );

      const explanation = await service.explainRecommendation(
        'rec-1',
        'project-1',
      );

      expect(explanation).toBeDefined();
      expect(explanation.projectId).toBe('project-1');
      expect(explanation.explanation).toBe(
        'This project matches your AI interests',
      );
      expect(explanation.scoreBreakdown).toBeDefined();
      expect(explanation.matchingElements).toBeDefined();
    });

    it('should generate improvement suggestions based on profile gaps', () => {
      const profileSnapshot = { profileCompleteness: 70 };
      const project = { matchingSkills: [], matchingInterests: ['AI'] };

      const suggestions = (service as any).generateImprovementSuggestions(
        profileSnapshot,
        project,
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.some((s: string) => s.includes('technical skills')),
      ).toBe(true);
      expect(suggestions.some((s: string) => s.includes('profile'))).toBe(true);
    });
  });

  describe('caching and performance', () => {
    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(mockStudent as any);
      mockQueryBuilder.getMany.mockResolvedValue(mockProjects);
      textProcessingService.processStudentProfile.mockReturnValue({
        combined: {
          text: 'student profile text',
          tokens: ['student', 'profile', 'text'],
          wordCount: 3,
          characterCount: 20,
          processedAt: new Date(),
        },
      } as any);
      textProcessingService.processProject.mockReturnValue({
        combined: {
          text: 'project description text',
          tokens: ['project', 'description', 'text'],
          wordCount: 3,
          characterCount: 24,
          processedAt: new Date(),
        },
      } as any);
      embeddingService.generateEmbeddings.mockResolvedValue(
        mockEmbeddings as any,
      );
      similarityService.calculateBatchSimilarity.mockReturnValue(
        mockSimilarityResult as any,
      );
      recommendationRepository.create.mockReturnValue({} as any);
      recommendationRepository.save.mockResolvedValue({} as any);
    });

    it('should clear cache and generate fresh recommendations', async () => {
      const result = await service.refreshRecommendations('student-1');

      expect(cacheManager.del).toHaveBeenCalledWith(
        'recommendations:student-1',
      );
      expect(result.fromCache).toBe(false);
    });

    it('should return recommendation history for student', async () => {
      const mockHistory = [
        { id: 'rec-1', createdAt: new Date() },
        { id: 'rec-2', createdAt: new Date() },
      ];
      recommendationRepository.find.mockResolvedValue(mockHistory as any);

      const history = await service.getRecommendationHistory('student-1');

      expect(history).toEqual(mockHistory);
      expect(recommendationRepository.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        order: { createdAt: 'DESC' },
        take: 10,
      });
    });

    it('should handle cache errors gracefully', async () => {
      cacheManager.get.mockRejectedValue(new Error('Cache error'));

      // Should not throw error, should continue with generation
      const result = await service.generateRecommendations('student-1');

      expect(result).toBeDefined();
      expect(result.fromCache).toBe(false);
    });
  });
});
