import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecommendationService } from '../recommendation.service';
import { FeedbackLearningService } from '../feedback-learning.service';
import { Recommendation } from '../../entities/recommendation.entity';
import { RecommendationFeedback } from '../../entities/recommendation-feedback.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

describe('RecommendationService - Feedback Integration', () => {
  let service: RecommendationService;
  let feedbackLearningService: jest.Mocked<FeedbackLearningService>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    }),
  };

  const mockFeedbackLearningService = {
    getRecommendationAdjustments: jest.fn(),
    trackImplicitFeedback: jest.fn(),
  };

  beforeEach(async () => {
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
          provide: FeedbackLearningService,
          useValue: mockFeedbackLearningService,
        },
        // Mock other required services
        {
          provide: 'EmbeddingService',
          useValue: { generateEmbeddings: jest.fn() },
        },
        {
          provide: 'SimilarityService',
          useValue: { calculateBatchSimilarity: jest.fn() },
        },
        {
          provide: 'TextProcessingService',
          useValue: {
            processStudentProfile: jest.fn(),
            processProject: jest.fn(),
          },
        },
        {
          provide: 'RecommendationCacheService',
          useValue: {
            getCachedRecommendations: jest.fn(),
            setCachedRecommendations: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationService>(RecommendationService);
    feedbackLearningService = module.get(FeedbackLearningService);

    jest.clearAllMocks();
  });

  describe('feedback-based adjustments', () => {
    it('should apply positive adjustments for preferred specializations', async () => {
      const mockAdjustments = {
        boostSpecializations: ['AI/ML'],
        penalizeSpecializations: [],
        preferredDifficulty: 'intermediate',
        scoreAdjustment: 0.1,
      };

      feedbackLearningService.getRecommendationAdjustments.mockResolvedValue(
        mockAdjustments,
      );

      // Test the private method through reflection
      const adjustments =
        await feedbackLearningService.getRecommendationAdjustments('student-1');

      expect(adjustments.boostSpecializations).toContain('AI/ML');
      expect(adjustments.scoreAdjustment).toBe(0.1);
    });

    it('should apply negative adjustments for disliked specializations', async () => {
      const mockAdjustments = {
        boostSpecializations: [],
        penalizeSpecializations: ['Mobile Development'],
        preferredDifficulty: 'intermediate',
        scoreAdjustment: -0.1,
      };

      feedbackLearningService.getRecommendationAdjustments.mockResolvedValue(
        mockAdjustments,
      );

      const adjustments =
        await feedbackLearningService.getRecommendationAdjustments('student-1');

      expect(adjustments.penalizeSpecializations).toContain(
        'Mobile Development',
      );
      expect(adjustments.scoreAdjustment).toBe(-0.1);
    });
  });

  describe('feedback type mapping', () => {
    it('should map feedback types to actions correctly', () => {
      // Access private method through any casting
      const mapFeedbackTypeToAction = (service as any).mapFeedbackTypeToAction;

      expect(mapFeedbackTypeToAction(FeedbackType.LIKE)).toBe('bookmark');
      expect(mapFeedbackTypeToAction(FeedbackType.BOOKMARK)).toBe('bookmark');
      expect(mapFeedbackTypeToAction(FeedbackType.DISLIKE)).toBe('dismiss');
      expect(mapFeedbackTypeToAction(FeedbackType.VIEW)).toBe('view');
      expect(mapFeedbackTypeToAction(FeedbackType.RATING)).toBe('bookmark');
    });
  });

  describe('feedback-enhanced reasoning', () => {
    it('should include feedback information in reasoning', () => {
      const studentProfile = {
        preferredSpecializations: ['AI/ML'],
      } as any;

      const project = {
        specialization: 'AI/ML',
      } as any;

      const feedbackAdjustments = {
        boostSpecializations: ['AI/ML'],
        penalizeSpecializations: [],
        scoreAdjustment: 0.1,
      };

      // Access private method through any casting
      const generateProjectReasoningWithFeedback = (service as any)
        .generateProjectReasoningWithFeedback;

      const reasoning = generateProjectReasoningWithFeedback(
        studentProfile,
        project,
        ['Python', 'TensorFlow'],
        ['Machine Learning'],
        0.85,
        feedbackAdjustments,
      );

      expect(reasoning).toContain('previous feedback');
      expect(reasoning).toContain('AI/ML');
      expect(reasoning).toContain('positive feedback history');
    });

    it('should handle projects without feedback adjustments', () => {
      const studentProfile = {
        preferredSpecializations: ['Web Development'],
      } as any;

      const project = {
        specialization: 'Web Development',
      } as any;

      const feedbackAdjustments = {
        boostSpecializations: [],
        penalizeSpecializations: [],
        scoreAdjustment: 0,
      };

      const generateProjectReasoningWithFeedback = (service as any)
        .generateProjectReasoningWithFeedback;

      const reasoning = generateProjectReasoningWithFeedback(
        studentProfile,
        project,
        ['JavaScript', 'React'],
        ['Frontend Development'],
        0.7,
        feedbackAdjustments,
      );

      expect(reasoning).toContain('JavaScript');
      expect(reasoning).toContain('React');
      expect(reasoning).toContain('Frontend Development');
    });
  });

  describe('implicit feedback tracking', () => {
    it('should track implicit feedback when explicit feedback is submitted', async () => {
      const mockRecommendation = {
        id: 'rec-1',
        studentId: 'student-1',
        getProjectById: jest.fn().mockReturnValue({ id: 'project-1' }),
      };

      mockRepository.findOne.mockResolvedValue(mockRecommendation);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const feedbackDto = {
        feedbackType: FeedbackType.LIKE,
        comment: 'Great project!',
      };

      await service.submitFeedback('rec-1', 'project-1', feedbackDto);

      expect(
        feedbackLearningService.trackImplicitFeedback,
      ).toHaveBeenCalledWith({
        studentId: 'student-1',
        projectId: 'project-1',
        action: 'bookmark',
        timestamp: expect.any(Date),
        metadata: {
          explicit: true,
          rating: undefined,
          comment: 'Great project!',
        },
      });
    });

    it('should handle different feedback types for implicit tracking', async () => {
      const mockRecommendation = {
        id: 'rec-1',
        studentId: 'student-1',
        getProjectById: jest.fn().mockReturnValue({ id: 'project-1' }),
      };

      mockRepository.findOne.mockResolvedValue(mockRecommendation);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      // Test DISLIKE feedback
      const dislikeFeedbackDto = {
        feedbackType: FeedbackType.DISLIKE,
        comment: 'Not interested',
      };

      await service.submitFeedback('rec-1', 'project-1', dislikeFeedbackDto);

      expect(
        feedbackLearningService.trackImplicitFeedback,
      ).toHaveBeenCalledWith({
        studentId: 'student-1',
        projectId: 'project-1',
        action: 'dismiss',
        timestamp: expect.any(Date),
        metadata: {
          explicit: true,
          rating: undefined,
          comment: 'Not interested',
        },
      });
    });
  });
});
