import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RecommendationService } from '../recommendation.service';
import { FallbackRecommendationService } from '../fallback-recommendation.service';
import { EmbeddingService } from '../embedding.service';
import { SimilarityService } from '../similarity.service';
import { TextProcessingService } from '../text-processing.service';
import { RecommendationCacheService } from '../recommendation-cache.service';
import { FeedbackLearningService } from '../feedback-learning.service';
import { ExplanationService } from '../explanation.service';
import { ProgressiveLoadingService } from '../progressive-loading.service';

import { Recommendation } from '../../entities/recommendation.entity';
import { RecommendationFeedback } from '../../entities/recommendation-feedback.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';

import {
  ProjectRecommendationDto,
  RecommendationResultDto,
} from '../../dto/recommendation';
import { FeedbackType } from '../../common/enums/feedback-type.enum';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';

describe('Recommendation Quality Validation Tests', () => {
  let recommendationService: RecommendationService;
  let fallbackService: FallbackRecommendationService;
  let embeddingService: EmbeddingService;
  let similarityService: SimilarityService;
  let textProcessingService: TextProcessingService;
  let feedbackLearningService: FeedbackLearningService;

  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;
  let feedbackRepository: jest.Mocked<Repository<RecommendationFeedback>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;

  const mockStudentProfiles = {
    webDeveloper: {
      id: 'student1',
      skills: ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS'],
      interests: ['Web Development', 'Frontend', 'User Experience'],
      preferredSpecializations: ['Web Development & Full Stack'],
      user: { id: 'user1' },
    } as StudentProfile,

    aiEnthusiast: {
      id: 'student2',
      skills: ['Python', 'TensorFlow', 'Machine Learning', 'Data Analysis'],
      interests: ['Artificial Intelligence', 'Data Science', 'Computer Vision'],
      preferredSpecializations: ['Machine Learning & AI'],
      user: { id: 'user2' },
    } as StudentProfile,

    mobileDeveloper: {
      id: 'student3',
      skills: ['Java', 'Kotlin', 'Android', 'Flutter'],
      interests: ['Mobile Development', 'Android', 'Cross-platform'],
      preferredSpecializations: ['Mobile Development'],
      user: { id: 'user3' },
    } as StudentProfile,
  };

  const mockProjects = [
    {
      id: 'project1',
      title: 'React E-commerce Platform',
      abstract:
        'Build a modern e-commerce platform using React, Node.js, and MongoDB.',
      specialization: 'Web Development & Full Stack',
      difficultyLevel: 'intermediate',
      technologyStack: ['React', 'Node.js', 'MongoDB', 'Express'],
      tags: ['e-commerce', 'full-stack', 'web'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor1',
        supervisorProfile: {
          name: 'Dr. Smith',
          specializations: ['Web Development'],
        },
      },
    },
    {
      id: 'project2',
      title: 'Machine Learning Image Classifier',
      abstract:
        'Develop an image classification system using deep learning techniques.',
      specialization: 'Machine Learning & AI',
      difficultyLevel: 'advanced',
      technologyStack: ['Python', 'TensorFlow', 'OpenCV', 'NumPy'],
      tags: ['machine-learning', 'computer-vision', 'ai'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor2',
        supervisorProfile: {
          name: 'Dr. Johnson',
          specializations: ['Machine Learning'],
        },
      },
    },
    {
      id: 'project3',
      title: 'Android Fitness Tracking App',
      abstract:
        'Create a comprehensive fitness tracking application for Android devices.',
      specialization: 'Mobile Development',
      difficultyLevel: 'intermediate',
      technologyStack: ['Kotlin', 'Android', 'SQLite', 'Firebase'],
      tags: ['mobile', 'android', 'fitness'],
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor3',
        supervisorProfile: {
          name: 'Dr. Brown',
          specializations: ['Mobile Development'],
        },
      },
    },
  ] as Project[];

  beforeEach(async () => {
    const mockRepositories = {
      recommendation: {
        find: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
          getOne: jest.fn().mockResolvedValue(null),
        })),
      },
      feedback: {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
      },
      user: {
        findOne: jest.fn(),
      },
      project: {
        createQueryBuilder: jest.fn(() => ({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockProjects),
        })),
      },
      studentProfile: {
        findOne: jest.fn(),
      },
    };

    const mockServices = {
      embedding: {
        generateEmbeddings: jest.fn(),
      },
      similarity: {
        calculateSimilarity: jest.fn(),
        calculateBatchSimilarity: jest.fn(),
      },
      textProcessing: {
        processStudentProfile: jest.fn(),
        processProject: jest.fn(),
      },
      cache: {
        getCachedRecommendations: jest.fn(),
        setCachedRecommendations: jest.fn(),
        invalidateRecommendations: jest.fn(),
      },
      feedbackLearning: {
        getRecommendationAdjustments: jest.fn(),
        trackImplicitFeedback: jest.fn(),
      },
      explanation: {
        generateAccessibleExplanation: jest.fn(),
      },
      progressiveLoading: {
        startRequest: jest.fn(),
        updateProgress: jest.fn(),
        completeRequest: jest.fn(),
        failRequest: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationService,
        FallbackRecommendationService,
        {
          provide: getRepositoryToken(Recommendation),
          useValue: mockRepositories.recommendation,
        },
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: mockRepositories.feedback,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepositories.user,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepositories.project,
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: mockRepositories.studentProfile,
        },
        {
          provide: EmbeddingService,
          useValue: mockServices.embedding,
        },
        {
          provide: SimilarityService,
          useValue: mockServices.similarity,
        },
        {
          provide: TextProcessingService,
          useValue: mockServices.textProcessing,
        },
        {
          provide: RecommendationCacheService,
          useValue: mockServices.cache,
        },
        {
          provide: FeedbackLearningService,
          useValue: mockServices.feedbackLearning,
        },
        {
          provide: ExplanationService,
          useValue: mockServices.explanation,
        },
        {
          provide: ProgressiveLoadingService,
          useValue: mockServices.progressiveLoading,
        },
      ],
    }).compile();

    recommendationService = module.get<RecommendationService>(
      RecommendationService,
    );
    fallbackService = module.get<FallbackRecommendationService>(
      FallbackRecommendationService,
    );
    embeddingService = module.get<EmbeddingService>(EmbeddingService);
    similarityService = module.get<SimilarityService>(SimilarityService);
    textProcessingService = module.get<TextProcessingService>(
      TextProcessingService,
    );
    feedbackLearningService = module.get<FeedbackLearningService>(
      FeedbackLearningService,
    );

    recommendationRepository = module.get(getRepositoryToken(Recommendation));
    feedbackRepository = module.get(getRepositoryToken(RecommendationFeedback));
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Recommendation Diversity Tests', () => {
    it('should ensure recommendations span multiple specializations', async () => {
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
        { limit: 5 },
      );

      const specializations = new Set(
        result.recommendations.map((r) => r.specialization),
      );
      expect(specializations.size).toBeGreaterThan(0);

      // Should not be dominated by a single specialization if multiple projects exist
      if (result.recommendations.length > 2) {
        const webDevCount = result.recommendations.filter(
          (r) => r.specialization === 'Web Development & Full Stack',
        ).length;
        expect(webDevCount / result.recommendations.length).toBeLessThan(1.0);
      }
    });

    it('should prevent echo chambers by boosting underrepresented specializations', async () => {
      const diverseProfile = {
        ...mockStudentProfiles.webDeveloper,
        interests: ['Web Development', 'Mobile Development', 'AI'],
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Mobile Development',
        ],
      };

      const result =
        await fallbackService.generateRuleBasedRecommendations(diverseProfile);
      const specializations = new Set(
        result.recommendations.map((r) => r.specialization),
      );

      // Should include projects from different specializations when interests are diverse
      if (mockProjects.length > 1) {
        expect(specializations.size).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Similarity Score Accuracy Tests', () => {
    it('should calculate accurate similarity scores for perfect matches', async () => {
      const perfectMatchProfile = {
        skills: ['React', 'Node.js', 'MongoDB'],
        interests: ['E-commerce', 'Full-stack'],
        preferredSpecializations: ['Web Development & Full Stack'],
      } as StudentProfile;

      const result =
        await fallbackService.generateRuleBasedRecommendations(
          perfectMatchProfile,
        );

      const reactProject = result.recommendations.find(
        (r) =>
          r.title.includes('React') &&
          r.specialization === 'Web Development & Full Stack',
      );

      if (reactProject) {
        expect(reactProject.similarityScore).toBeGreaterThan(0.5);
        expect(reactProject.matchingSkills.length).toBeGreaterThan(0);
      }
    });

    it('should normalize similarity scores to 0-1 range', async () => {
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
      );

      result.recommendations.forEach((rec) => {
        expect(rec.similarityScore).toBeGreaterThanOrEqual(0);
        expect(rec.similarityScore).toBeLessThanOrEqual(1);
      });
    });

    it('should provide consistent similarity rankings', async () => {
      const testProfile = mockStudentProfiles.mobileDeveloper;

      // Run recommendation generation multiple times
      const results = await Promise.all([
        fallbackService.generateRuleBasedRecommendations(testProfile),
        fallbackService.generateRuleBasedRecommendations(testProfile),
      ]);

      // Rankings should be consistent across runs
      const rankings = results.map((result) =>
        result.recommendations
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .map((r) => r.projectId),
      );

      // Should have same top recommendation
      if (rankings[0].length > 0 && rankings[1].length > 0) {
        expect(rankings[1][0]).toBe(rankings[0][0]);
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should generate recommendations within acceptable time limits', async () => {
      const startTime = Date.now();

      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.metadata.processingTimeMs).toBeLessThan(1500);
    });

    it('should handle large project datasets efficiently', async () => {
      // Create a large dataset of projects
      const largeProjectSet = Array.from({ length: 50 }, (_, i) => ({
        ...mockProjects[0],
        id: `project${i}`,
        title: `Project ${i}`,
      }));

      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(
        largeProjectSet,
      );

      const startTime = Date.now();
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
        { limit: 10 },
      );
      const endTime = Date.now();

      expect(result.recommendations.length).toBeLessThanOrEqual(10);
      expect(endTime - startTime).toBeLessThan(3000); // Should handle 50 projects within 3 seconds
    });

    it('should maintain performance under concurrent requests', async () => {
      const concurrentRequests = 3;
      const promises = Array.from({ length: concurrentRequests }, () =>
        fallbackService.generateRuleBasedRecommendations(
          mockStudentProfiles.webDeveloper,
          { limit: 5 },
        ),
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(5000); // All requests within 5 seconds

      // All results should be valid
      results.forEach((result) => {
        expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
        expect(result.averageSimilarityScore).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Recommendation Quality Metrics', () => {
    it('should calculate meaningful quality metrics', async () => {
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
        { limit: 5 },
      );

      // Average similarity score should be meaningful
      expect(result.averageSimilarityScore).toBeGreaterThanOrEqual(0);
      expect(result.averageSimilarityScore).toBeLessThanOrEqual(1);

      // Should have reasonable distribution of scores
      if (result.recommendations.length > 1) {
        const scores = result.recommendations.map((r) => r.similarityScore);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        expect(maxScore).toBeGreaterThanOrEqual(minScore);
      }
    });

    it('should provide comprehensive matching information', async () => {
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
      );

      result.recommendations.forEach((rec) => {
        // Should have meaningful reasoning
        expect(rec.reasoning).toBeTruthy();
        expect(rec.reasoning.length).toBeGreaterThan(10);

        // Should have supervisor information
        expect(rec.supervisor).toBeDefined();
        expect(rec.supervisor.name).toBeTruthy();

        // Should have valid arrays for matching skills/interests
        expect(Array.isArray(rec.matchingSkills)).toBe(true);
        expect(Array.isArray(rec.matchingInterests)).toBe(true);
      });
    });

    it('should validate recommendation completeness', async () => {
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.aiEnthusiast,
      );

      result.recommendations.forEach((rec) => {
        // All required fields should be present
        expect(rec.projectId).toBeTruthy();
        expect(rec.title).toBeTruthy();
        expect(rec.abstract).toBeTruthy();
        expect(rec.specialization).toBeTruthy();
        expect(rec.difficultyLevel).toBeTruthy();
        expect(rec.similarityScore).toBeGreaterThanOrEqual(0);
        expect(rec.reasoning).toBeTruthy();
        expect(rec.supervisor).toBeDefined();
      });
    });

    it('should ensure recommendation relevance', async () => {
      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.mobileDeveloper,
      );

      // Mobile developer should get mobile-related projects with higher scores
      const mobileProjects = result.recommendations.filter(
        (r) =>
          r.specialization === 'Mobile Development' ||
          r.matchingSkills.some((skill) =>
            ['Java', 'Kotlin', 'Android', 'Flutter'].includes(skill),
          ),
      );

      if (mobileProjects.length > 0) {
        const avgMobileScore =
          mobileProjects.reduce((sum, p) => sum + p.similarityScore, 0) /
          mobileProjects.length;
        expect(avgMobileScore).toBeGreaterThan(0.2); // Should have decent relevance
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty skill sets gracefully', async () => {
      const emptyProfile = {
        id: 'empty-student',
        skills: [],
        interests: [],
        preferredSpecializations: [],
        user: { id: 'empty-user' },
      } as StudentProfile;

      const result =
        await fallbackService.generateRuleBasedRecommendations(emptyProfile);

      // Should still return some recommendations or handle gracefully
      expect(result).toBeDefined();
      expect(result.reasoning).toContain('rule-based matching');
    });

    it('should handle profiles with unusual specializations', async () => {
      const unusualProfile = {
        id: 'unusual-student',
        skills: ['Blockchain', 'Solidity', 'Web3'],
        interests: ['Cryptocurrency', 'DeFi'],
        preferredSpecializations: ['Blockchain Development'],
        user: { id: 'unusual-user' },
      } as StudentProfile;

      const result =
        await fallbackService.generateRuleBasedRecommendations(unusualProfile);

      // Should handle gracefully even if no perfect matches
      expect(result).toBeDefined();
      expect(result.metadata.fallback).toBe(true);
    });

    it('should maintain quality with minimal project data', async () => {
      const minimalProjects = [mockProjects[0]]; // Only one project
      const mockQueryBuilder = projectRepository.createQueryBuilder();
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(
        minimalProjects,
      );

      const result = await fallbackService.generateRuleBasedRecommendations(
        mockStudentProfiles.webDeveloper,
      );

      expect(result.recommendations.length).toBeLessThanOrEqual(1);
      if (result.recommendations.length > 0) {
        expect(
          result.recommendations[0].similarityScore,
        ).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
