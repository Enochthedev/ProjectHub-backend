import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Recommendation } from './recommendation.entity';
import { FeedbackType } from '../common/enums/feedback-type.enum';

@Entity('recommendation_feedback')
export class RecommendationFeedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(
    () => Recommendation,
    (recommendation) => recommendation.feedback,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'recommendation_id' })
  recommendation: Recommendation;

  @Column({ name: 'recommendation_id' })
  recommendationId: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column({ type: 'enum', enum: FeedbackType })
  feedbackType: FeedbackType;

  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating: number | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods for validation
  isValidRating(): boolean {
    if (this.feedbackType === FeedbackType.RATING) {
      return this.rating !== null && this.rating >= 1.0 && this.rating <= 5.0;
    }
    return true;
  }

  isPositiveFeedback(): boolean {
    return (
      [FeedbackType.LIKE, FeedbackType.BOOKMARK].includes(this.feedbackType) ||
      (this.feedbackType === FeedbackType.RATING &&
        this.rating !== null &&
        this.rating >= 3.0)
    );
  }

  isNegativeFeedback(): boolean {
    return (
      this.feedbackType === FeedbackType.DISLIKE ||
      (this.feedbackType === FeedbackType.RATING &&
        this.rating !== null &&
        this.rating < 3.0)
    );
  }
}
