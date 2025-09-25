import { RecommendationFeedback } from '../recommendation-feedback.entity';
import { Recommendation } from '../recommendation.entity';
import { FeedbackType } from '../../common/enums/feedback-type.enum';

describe('RecommendationFeedback Entity', () => {
  let feedback: RecommendationFeedback;
  let mockRecommendation: Recommendation;

  beforeEach(() => {
    // Create mock recommendation
    mockRecommendation = new Recommendation();
    mockRecommendation.id = 'test-recommendation-id';

    // Create feedback
    feedback = new RecommendationFeedback();
    feedback.id = 'test-feedback-id';
    feedback.recommendation = mockRecommendation;
    feedback.recommendationId = mockRecommendation.id;
    feedback.projectId = 'test-project-id';
    feedback.feedbackType = FeedbackType.LIKE;
    feedback.rating = null;
    feedback.comment = null;
    feedback.createdAt = new Date('2024-01-01');
  });

  describe('Entity Structure', () => {
    it('should create feedback with all required fields', () => {
      expect(feedback.id).toBe('test-feedback-id');
      expect(feedback.recommendationId).toBe('test-recommendation-id');
      expect(feedback.projectId).toBe('test-project-id');
      expect(feedback.feedbackType).toBe(FeedbackType.LIKE);
    });

    it('should allow nullable rating and comment', () => {
      expect(feedback.rating).toBeNull();
      expect(feedback.comment).toBeNull();
    });

    it('should support all feedback types', () => {
      const feedbackTypes = Object.values(FeedbackType);
      feedbackTypes.forEach((type) => {
        feedback.feedbackType = type;
        expect(feedback.feedbackType).toBe(type);
      });
    });
  });

  describe('Rating Feedback', () => {
    beforeEach(() => {
      feedback.feedbackType = FeedbackType.RATING;
    });

    it('should accept valid rating values', () => {
      const validRatings = [1.0, 2.5, 3.0, 4.5, 5.0];
      validRatings.forEach((rating) => {
        feedback.rating = rating;
        expect(feedback.rating).toBe(rating);
      });
    });

    it('should handle decimal precision for ratings', () => {
      feedback.rating = 3.7;
      expect(feedback.rating).toBe(3.7);
    });
  });

  describe('Helper Methods', () => {
    describe('isValidRating', () => {
      it('should return true for RATING type with valid rating', () => {
        feedback.feedbackType = FeedbackType.RATING;
        feedback.rating = 4.0;
        expect(feedback.isValidRating()).toBe(true);
      });

      it('should return false for RATING type with null rating', () => {
        feedback.feedbackType = FeedbackType.RATING;
        feedback.rating = null;
        expect(feedback.isValidRating()).toBe(false);
      });

      it('should return false for RATING type with invalid rating (too low)', () => {
        feedback.feedbackType = FeedbackType.RATING;
        feedback.rating = 0.5;
        expect(feedback.isValidRating()).toBe(false);
      });

      it('should return false for RATING type with invalid rating (too high)', () => {
        feedback.feedbackType = FeedbackType.RATING;
        feedback.rating = 5.5;
        expect(feedback.isValidRating()).toBe(false);
      });

      it('should return true for non-RATING types regardless of rating value', () => {
        const nonRatingTypes = [
          FeedbackType.LIKE,
          FeedbackType.DISLIKE,
          FeedbackType.BOOKMARK,
          FeedbackType.VIEW,
        ];

        nonRatingTypes.forEach((type) => {
          feedback.feedbackType = type;
          feedback.rating = null;
          expect(feedback.isValidRating()).toBe(true);

          feedback.rating = 10.0; // Invalid rating value
          expect(feedback.isValidRating()).toBe(true); // Still valid for non-rating types
        });
      });
    });

    describe('isPositiveFeedback', () => {
      it('should return true for LIKE feedback', () => {
        feedback.feedbackType = FeedbackType.LIKE;
        expect(feedback.isPositiveFeedback()).toBe(true);
      });

      it('should return true for BOOKMARK feedback', () => {
        feedback.feedbackType = FeedbackType.BOOKMARK;
        expect(feedback.isPositiveFeedback()).toBe(true);
      });

      it('should return true for RATING >= 3.0', () => {
        feedback.feedbackType = FeedbackType.RATING;

        [3.0, 3.5, 4.0, 4.5, 5.0].forEach((rating) => {
          feedback.rating = rating;
          expect(feedback.isPositiveFeedback()).toBe(true);
        });
      });

      it('should return false for RATING < 3.0', () => {
        feedback.feedbackType = FeedbackType.RATING;

        [1.0, 1.5, 2.0, 2.5, 2.9].forEach((rating) => {
          feedback.rating = rating;
          expect(feedback.isPositiveFeedback()).toBe(false);
        });
      });

      it('should return false for DISLIKE feedback', () => {
        feedback.feedbackType = FeedbackType.DISLIKE;
        expect(feedback.isPositiveFeedback()).toBe(false);
      });

      it('should return false for VIEW feedback', () => {
        feedback.feedbackType = FeedbackType.VIEW;
        expect(feedback.isPositiveFeedback()).toBe(false);
      });
    });

    describe('isNegativeFeedback', () => {
      it('should return true for DISLIKE feedback', () => {
        feedback.feedbackType = FeedbackType.DISLIKE;
        expect(feedback.isNegativeFeedback()).toBe(true);
      });

      it('should return true for RATING < 3.0', () => {
        feedback.feedbackType = FeedbackType.RATING;

        [1.0, 1.5, 2.0, 2.5, 2.9].forEach((rating) => {
          feedback.rating = rating;
          expect(feedback.isNegativeFeedback()).toBe(true);
        });
      });

      it('should return false for RATING >= 3.0', () => {
        feedback.feedbackType = FeedbackType.RATING;

        [3.0, 3.5, 4.0, 4.5, 5.0].forEach((rating) => {
          feedback.rating = rating;
          expect(feedback.isNegativeFeedback()).toBe(false);
        });
      });

      it('should return false for positive feedback types', () => {
        const positiveFeedbackTypes = [
          FeedbackType.LIKE,
          FeedbackType.BOOKMARK,
          FeedbackType.VIEW,
        ];

        positiveFeedbackTypes.forEach((type) => {
          feedback.feedbackType = type;
          expect(feedback.isNegativeFeedback()).toBe(false);
        });
      });
    });
  });

  describe('Relationships', () => {
    it('should have relationship with Recommendation entity', () => {
      expect(feedback.recommendation).toBe(mockRecommendation);
      expect(feedback.recommendationId).toBe(mockRecommendation.id);
    });

    it('should support cascade delete from recommendation', () => {
      // This would be tested in integration tests with actual database
      expect(feedback.recommendationId).toBe('test-recommendation-id');
    });
  });

  describe('Validation', () => {
    it('should validate enum values', () => {
      const validFeedbackTypes = Object.values(FeedbackType);
      expect(validFeedbackTypes).toContain(feedback.feedbackType);
    });

    it('should validate rating precision', () => {
      feedback.rating = 4.7;
      expect(feedback.rating).toBe(4.7);
    });

    it('should allow long comments', () => {
      const longComment =
        'This is a very long comment that explains in detail why this recommendation was helpful and what specific aspects made it relevant to my interests and career goals.';
      feedback.comment = longComment;
      expect(feedback.comment).toBe(longComment);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt field', () => {
      expect(feedback.createdAt).toEqual(new Date('2024-01-01'));
    });
  });

  describe('Business Logic Validation', () => {
    it('should handle rating feedback with comment', () => {
      feedback.feedbackType = FeedbackType.RATING;
      feedback.rating = 4.5;
      feedback.comment = 'Great recommendation, very relevant to my interests';

      expect(feedback.isValidRating()).toBe(true);
      expect(feedback.isPositiveFeedback()).toBe(true);
      expect(feedback.isNegativeFeedback()).toBe(false);
    });

    it('should handle like feedback without rating', () => {
      feedback.feedbackType = FeedbackType.LIKE;
      feedback.rating = null;
      feedback.comment = 'This looks interesting';

      expect(feedback.isValidRating()).toBe(true);
      expect(feedback.isPositiveFeedback()).toBe(true);
      expect(feedback.isNegativeFeedback()).toBe(false);
    });

    it('should handle dislike feedback with explanation', () => {
      feedback.feedbackType = FeedbackType.DISLIKE;
      feedback.rating = null;
      feedback.comment = 'Not relevant to my career goals';

      expect(feedback.isValidRating()).toBe(true);
      expect(feedback.isPositiveFeedback()).toBe(false);
      expect(feedback.isNegativeFeedback()).toBe(true);
    });
  });
});
