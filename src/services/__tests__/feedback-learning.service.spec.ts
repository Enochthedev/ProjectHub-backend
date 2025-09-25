import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FeedbackLearningService,
  ImplicitFeedbackData,
  FeedbackAggregation,
} from '../feedback-learning.service';
import { RecommendationFeedback } from '../../entities/recommendation-feedback.entity';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { ProjectView } from '../../entities/project-view.entity';
import { Recommendation } from '../../entities/recommendation.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

describe('FeedbackLearningService', () => {
  let service: FeedbackLearningService;
  let feedbackRepository: jest.Mocked<Repository<RecommendationFeedback>>;
  let bookmarkRepository: jest.Mocked<Repository<ProjectBookmark>>;
  let viewRepository: jest.Mocked<Repository<ProjectView>>;
  let recommendationRepository: jest.Mocked<Repository<Recommendation>>;

  const mockQueryBuilder = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getRawOne: jest.fn(),
    select: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
  };

  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder as any),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackLearningService,
        {
          provide: getRepositoryToken(RecommendationFeedback),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProjectBookmark),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProjectView),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Recommendation),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<FeedbackLearningService>(FeedbackLearningService);
    feedbackRepository = module.get(getRepositoryToken(RecommendationFeedback));
    bookmarkRepository = module.get(getRepositoryToken(ProjectBookmark));
    viewRepository = module.get(getRepositoryToken(ProjectView));
    recommendationRepository = module.get(getRepositoryToken(Recommendation));

    // Reset mocks
    jest.clearAllMocks();
    Object.values(mockQueryBuilder).forEach((mock) => mock.mockReset());
  });

  describe('trackImplicitFeedback', () => {
    it('should track bookmark action as implicit feedback', async () => {
      const implicitData: ImplicitFeedbackData = {
        studentId: 'student-1',
        projectId: 'project-1',
        action: 'bookmark',
        timestamp: new Date(),
      };

      const mockRecommendation = {
        id: 'rec-1',
        projectSuggestions: [{ projectId: 'project-1' }],
      };

      // Mock finding recommendation
      mockQueryBuilder.getMany.mockResolvedValue([mockRecommendation]);

      // Mock feedback creation
      const mockFeedback = { id: 'feedback-1' };
      feedbackRepository.create.mockReturnValue(mockFeedback as any);
      feedbackRepository.save.mockResolvedValue(mockFeedback as any);

      await service.trackImplicitFeedback(implicitData);

      expect(feedbackRepository.create).toHaveBeenCalledWith({
        recommendationId: 'rec-1',
        projectId: 'project-1',
        feedbackType: FeedbackType.BOOKMARK,
        rating: 5.0,
        comment: 'Implicit feedback from bookmark',
      });
      expect(feedbackRepository.save).toHaveBeenCalledWith(mockFeedback);
    });

    it('should track view action as implicit feedback', async () => {
      const implicitData: ImplicitFeedbackData = {
        studentId: 'student-1',
        projectId: 'project-1',
        action: 'view',
        timestamp: new Date(),
      };

      const mockRecommendation = {
        id: 'rec-1',
        projectSuggestions: [{ projectId: 'project-1' }],
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockRecommendation]);

      const mockFeedback = { id: 'feedback-1' };
      feedbackRepository.create.mockReturnValue(mockFeedback as any);
      feedbackRepository.save.mockResolvedValue(mockFeedback as any);

      await service.trackImplicitFeedback(implicitData);

      expect(feedbackRepository.create).toHaveBeenCalledWith({
        recommendationId: 'rec-1',
        projectId: 'project-1',
        feedbackType: FeedbackType.VIEW,
        rating: 3.0,
        comment: 'Implicit feedback from view',
      });
    });

    it('should track dismiss action as implicit feedback', async () => {
      const implicitData: ImplicitFeedbackData = {
        studentId: 'student-1',
        projectId: 'project-1',
        action: 'dismiss',
        timestamp: new Date(),
      };

      const mockRecommendation = {
        id: 'rec-1',
        projectSuggestions: [{ projectId: 'project-1' }],
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockRecommendation]);

      const mockFeedback = { id: 'feedback-1' };
      feedbackRepository.create.mockReturnValue(mockFeedback as any);
      feedbackRepository.save.mockResolvedValue(mockFeedback as any);

      await service.trackImplicitFeedback(implicitData);

      expect(feedbackRepository.create).toHaveBeenCalledWith({
        recommendationId: 'rec-1',
        projectId: 'project-1',
        feedbackType: FeedbackType.DISLIKE,
        rating: 1.0,
        comment: 'Implicit feedback from dismiss',
      });
    });

    it('should handle case when no recommendation is found', async () => {
      const implicitData: ImplicitFeedbackData = {
        studentId: 'student-1',
        projectId: 'project-1',
        action: 'bookmark',
        timestamp: new Date(),
      };

      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.trackImplicitFeedback(implicitData);

      expect(feedbackRepository.create).not.toHaveBeenCalled();
      expect(feedbackRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('aggregateProjectFeedback', () => {
    it('should aggregate feedback data for a project', async () => {
      const projectId = 'project-1';

      const mockFeedback = [
        { feedbackType: FeedbackType.LIKE, rating: null },
        { feedbackType: FeedbackType.RATING, rating: 4.5 },
        { feedbackType: FeedbackType.DISLIKE, rating: null },
        { feedbackType: FeedbackType.BOOKMARK, rating: null },
        { feedbackType: FeedbackType.RATING, rating: 2.0 },
      ];

      mockQueryBuilder.getMany.mockResolvedValue(mockFeedback);
      bookmarkRepository.count.mockResolvedValue(10);
      viewRepository.count.mockResolvedValue(50);

      const result = await service.aggregateProjectFeedback(projectId);

      expect(result).toEqual({
        totalFeedback: 5,
        positiveCount: 3, // LIKE, RATING>=4, BOOKMARK
        negativeCount: 2, // DISLIKE, RATING<3
        averageRating: 3.25, // (4.5 + 2.0) / 2
        bookmarkCount: 10,
        viewCount: 50,
        dismissalCount: 0,
        feedbackByType: {
          [FeedbackType.LIKE]: 1,
          [FeedbackType.DISLIKE]: 1,
          [FeedbackType.RATING]: 2,
          [FeedbackType.BOOKMARK]: 1,
          [FeedbackType.VIEW]: 0,
        },
      });
    });

    it('should handle project with no feedback', async () => {
      const projectId = 'project-1';

      mockQueryBuilder.getMany.mockResolvedValue([]);
      bookmarkRepository.count.mockResolvedValue(0);
      viewRepository.count.mockResolvedValue(0);

      const result = await service.aggregateProjectFeedback(projectId);

      expect(result).toEqual({
        totalFeedback: 0,
        positiveCount: 0,
        negativeCount: 0,
        averageRating: 0,
        bookmarkCount: 0,
        viewCount: 0,
        dismissalCount: 0,
        feedbackByType: {
          [FeedbackType.LIKE]: 0,
          [FeedbackType.DISLIKE]: 0,
          [FeedbackType.RATING]: 0,
          [FeedbackType.BOOKMARK]: 0,
          [FeedbackType.VIEW]: 0,
        },
      });
    });
  });

  describe('analyzeStudentFeedbackPatterns', () => {
    it('should analyze feedback patterns for a student', async () => {
      const studentId = 'student-1';

      const mockFeedback = [
        {
          feedbackType: FeedbackType.LIKE,
          rating: null,
          recommendationId: 'rec-1',
          projectId: 'project-1',
        },
        {
          feedbackType: FeedbackType.RATING,
          rating: 4.5,
          recommendationId: 'rec-1',
          projectId: 'project-2',
        },
        {
          feedbackType: FeedbackType.DISLIKE,
          rating: null,
          recommendationId: 'rec-2',
          projectId: 'project-3',
        },
      ];

      const mockRecommendations = [
        {
          id: 'rec-1',
          projectSuggestions: [
            { projectId: 'project-1', specialization: 'AI/ML' },
            { projectId: 'project-2', specialization: 'Web Development' },
          ],
        },
        {
          id: 'rec-2',
          projectSuggestions: [
            { projectId: 'project-3', specialization: 'Mobile Development' },
          ],
        },
      ];

      mockQueryBuilder.getMany
        .mockResolvedValueOnce(mockFeedback) // First call for feedback
        .mockResolvedValueOnce(mockRecommendations); // Second call for recommendations

      const result = await service.analyzeStudentFeedbackPatterns(studentId);

      expect(result).toEqual({
        studentId: 'student-1',
        preferredSpecializations: ['AI/ML', 'Web Development'], // From positive feedback
        dislikedSpecializations: ['Mobile Development'], // From negative feedback
        skillPreferences: [],
        difficultyPreference: 'intermediate',
        averageRating: 4.5, // Only one rating
        feedbackCount: 3,
      });
    });

    it('should handle student with no feedback', async () => {
      const studentId = 'student-1';

      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.analyzeStudentFeedbackPatterns(studentId);

      expect(result).toEqual({
        studentId: 'student-1',
        preferredSpecializations: [],
        dislikedSpecializations: [],
        skillPreferences: [],
        difficultyPreference: 'intermediate',
        averageRating: 0,
        feedbackCount: 0,
      });
    });
  });

  describe('getRecommendationAdjustments', () => {
    it('should return adjustments based on feedback patterns', async () => {
      const studentId = 'student-1';

      // Mock the analyzeStudentFeedbackPatterns method
      const mockPatterns = {
        studentId: 'student-1',
        preferredSpecializations: ['AI/ML', 'Web Development'],
        dislikedSpecializations: ['Mobile Development'],
        skillPreferences: [],
        difficultyPreference: 'intermediate',
        averageRating: 4.5,
        feedbackCount: 10,
      };

      jest
        .spyOn(service, 'analyzeStudentFeedbackPatterns')
        .mockResolvedValue(mockPatterns);

      const result = await service.getRecommendationAdjustments(studentId);

      expect(result).toEqual({
        boostSpecializations: ['AI/ML', 'Web Development'],
        penalizeSpecializations: ['Mobile Development'],
        preferredDifficulty: 'intermediate',
        scoreAdjustment: 0.1, // Boost for high rating
      });
    });

    it('should apply penalty for low average rating', async () => {
      const studentId = 'student-1';

      const mockPatterns = {
        studentId: 'student-1',
        preferredSpecializations: [],
        dislikedSpecializations: ['AI/ML'],
        skillPreferences: [],
        difficultyPreference: 'intermediate',
        averageRating: 1.5, // Low rating
        feedbackCount: 5,
      };

      jest
        .spyOn(service, 'analyzeStudentFeedbackPatterns')
        .mockResolvedValue(mockPatterns);

      const result = await service.getRecommendationAdjustments(studentId);

      expect(result.scoreAdjustment).toBe(-0.1); // Penalty for low rating
    });

    it('should handle errors gracefully', async () => {
      const studentId = 'student-1';

      jest
        .spyOn(service, 'analyzeStudentFeedbackPatterns')
        .mockRejectedValue(new Error('Database error'));

      const result = await service.getRecommendationAdjustments(studentId);

      expect(result).toEqual({
        boostSpecializations: [],
        penalizeSpecializations: [],
        preferredDifficulty: 'intermediate',
        scoreAdjustment: 0,
      });
    });
  });

  describe('private methods', () => {
    it('should map actions to feedback types correctly', () => {
      // Access private method through any casting
      const mapActionToFeedbackType = (service as any).mapActionToFeedbackType;

      expect(mapActionToFeedbackType('bookmark')).toBe(FeedbackType.BOOKMARK);
      expect(mapActionToFeedbackType('view')).toBe(FeedbackType.VIEW);
      expect(mapActionToFeedbackType('dismiss')).toBe(FeedbackType.DISLIKE);
      expect(mapActionToFeedbackType('unknown')).toBe(FeedbackType.VIEW);
    });

    it('should assign implicit ratings correctly', () => {
      const getImplicitRating = (service as any).getImplicitRating;

      expect(getImplicitRating('bookmark')).toBe(5.0);
      expect(getImplicitRating('view')).toBe(3.0);
      expect(getImplicitRating('dismiss')).toBe(1.0);
      expect(getImplicitRating('unknown')).toBeNull();
    });
  });
});
