import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AIInteractionReview, ReviewStatus, ReviewCategory } from '../entities/ai-interaction-review.entity';
import { Conversation } from '../entities/conversation.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import {
    CreateAIInteractionReviewDto,
    UpdateAIInteractionReviewDto,
    AIInteractionReviewResponseDto,
    AIInteractionStatsDto,
    AIInteractionOverviewDto,
} from '../dto/supervisor/ai-interaction.dto';

@Injectable()
export class SupervisorAIInteractionService {
    private readonly logger = new Logger(SupervisorAIInteractionService.name);

    constructor(
        @InjectRepository(AIInteractionReview)
        private readonly reviewRepository: Repository<AIInteractionReview>,
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async createReview(
        supervisorId: string,
        createDto: CreateAIInteractionReviewDto,
    ): Promise<AIInteractionReviewResponseDto> {
        this.logger.log(`Creating AI interaction review for conversation ${createDto.conversationId}`);

        // Verify supervisor exists
        const supervisor = await this.userRepository.findOne({
            where: { id: supervisorId, role: UserRole.SUPERVISOR },
        });

        if (!supervisor) {
            throw new NotFoundException('Supervisor not found');
        }

        // Verify conversation exists and get student info
        const conversation = await this.conversationRepository.findOne({
            where: { id: createDto.conversationId },
            relations: ['student'],
        });

        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Check if supervisor has access to this student's conversations
        await this.verifyStudentAccess(supervisorId, conversation.studentId);

        // Check if review already exists
        const existingReview = await this.reviewRepository.findOne({
            where: { conversationId: createDto.conversationId, supervisorId },
        });

        if (existingReview) {
            throw new ForbiddenException('Review already exists for this conversation');
        }

        const review = this.reviewRepository.create({
            ...createDto,
            supervisorId,
            studentId: conversation.studentId,
            reviewedAt: new Date(),
        });

        const savedReview = await this.reviewRepository.save(review);
        return this.mapToResponseDto(savedReview, conversation.student);
    }

    async updateReview(
        supervisorId: string,
        reviewId: string,
        updateDto: UpdateAIInteractionReviewDto,
    ): Promise<AIInteractionReviewResponseDto> {
        this.logger.log(`Updating AI interaction review ${reviewId}`);

        const review = await this.reviewRepository.findOne({
            where: { id: reviewId, supervisorId },
            relations: ['conversation', 'student'],
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        // Update fields
        Object.assign(review, updateDto);

        // Update timestamps based on status changes
        if (updateDto.status) {
            if (updateDto.status === ReviewStatus.RESOLVED) {
                review.resolvedAt = new Date();
            } else {
                // Clear resolved timestamp for non-resolved statuses
                review.resolvedAt = null;
            }
        }

        const savedReview = await this.reviewRepository.save(review);
        return this.mapToResponseDto(savedReview, review.student);
    }

    async getReview(supervisorId: string, reviewId: string): Promise<AIInteractionReviewResponseDto> {
        const review = await this.reviewRepository.findOne({
            where: { id: reviewId, supervisorId },
            relations: ['student'],
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        return this.mapToResponseDto(review, review.student);
    }

    async getReviews(
        supervisorId: string,
        status?: ReviewStatus,
        category?: ReviewCategory,
        limit = 50,
        offset = 0,
    ): Promise<AIInteractionReviewResponseDto[]> {
        this.logger.log(`Getting AI interaction reviews for supervisor ${supervisorId}`);

        const queryBuilder = this.reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.student', 'student')
            .where('review.supervisorId = :supervisorId', { supervisorId });

        if (status) {
            queryBuilder.andWhere('review.status = :status', { status });
        }

        if (category) {
            queryBuilder.andWhere(':category = ANY(review.categories)', { category });
        }

        const reviews = await queryBuilder
            .orderBy('review.createdAt', 'DESC')
            .limit(limit)
            .offset(offset)
            .getMany();

        return reviews.map(review => this.mapToResponseDto(review, review.student));
    }

    async getAIInteractionStats(supervisorId: string): Promise<AIInteractionStatsDto> {
        this.logger.log(`Getting AI interaction stats for supervisor ${supervisorId}`);

        const reviews = await this.reviewRepository.find({
            where: { supervisorId },
        });

        const totalReviewed = reviews.length;
        const pendingReviews = reviews.filter(r => r.status === ReviewStatus.PENDING).length;
        const escalatedConversations = reviews.filter(r => r.status === ReviewStatus.ESCALATED).length;
        const flaggedConversations = reviews.filter(r => r.status === ReviewStatus.FLAGGED).length;

        const confidenceScores = reviews
            .filter(r => r.confidenceScore !== null)
            .map(r => r.confidenceScore!);
        const averageConfidenceScore = confidenceScores.length > 0
            ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
            : 0;

        // Calculate common categories
        const categoryCount = new Map<ReviewCategory, number>();
        reviews.forEach(review => {
            review.categories.forEach(category => {
                categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
            });
        });

        const commonCategories = Array.from(categoryCount.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Calculate review trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentReviews = reviews.filter(r => r.createdAt >= thirtyDaysAgo);
        const reviewTrends = this.calculateReviewTrends(recentReviews);

        return {
            totalReviewed,
            pendingReviews,
            escalatedConversations,
            flaggedConversations,
            averageConfidenceScore: Math.round(averageConfidenceScore * 100) / 100,
            commonCategories,
            reviewTrends,
        };
    }

    async getAIInteractionOverview(supervisorId: string): Promise<AIInteractionOverviewDto> {
        this.logger.log(`Getting AI interaction overview for supervisor ${supervisorId}`);

        const stats = await this.getAIInteractionStats(supervisorId);

        // Get recent reviews requiring attention
        const recentReviews = await this.getReviews(supervisorId, undefined, undefined, 10, 0);

        // Get high-priority reviews
        const priorityReviews = await this.reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.student', 'student')
            .where('review.supervisorId = :supervisorId', { supervisorId })
            .andWhere('review.status IN (:...statuses)', {
                statuses: [ReviewStatus.PENDING, ReviewStatus.ESCALATED, ReviewStatus.FLAGGED]
            })
            .andWhere('review.requiresFollowUp = true')
            .orderBy('review.createdAt', 'ASC')
            .limit(5)
            .getMany();

        const mappedPriorityReviews = priorityReviews.map(review =>
            this.mapToResponseDto(review, review.student)
        );

        return {
            supervisorId,
            stats,
            recentReviews,
            priorityReviews: mappedPriorityReviews,
            lastUpdated: new Date().toISOString(),
        };
    }

    async approveReview(supervisorId: string, reviewId: string): Promise<AIInteractionReviewResponseDto> {
        return this.updateReview(supervisorId, reviewId, {
            status: ReviewStatus.APPROVED,
            reviewedAt: new Date(),
        });
    }

    async escalateReview(
        supervisorId: string,
        reviewId: string,
        reason?: string
    ): Promise<AIInteractionReviewResponseDto> {
        return this.updateReview(supervisorId, reviewId, {
            status: ReviewStatus.ESCALATED,
            supervisorFeedback: reason,
            requiresFollowUp: true,
            reviewedAt: new Date(),
        });
    }

    async flagReview(
        supervisorId: string,
        reviewId: string,
        reason?: string
    ): Promise<AIInteractionReviewResponseDto> {
        return this.updateReview(supervisorId, reviewId, {
            status: ReviewStatus.FLAGGED,
            supervisorFeedback: reason,
            requiresFollowUp: true,
            reviewedAt: new Date(),
        });
    }

    private async verifyStudentAccess(supervisorId: string, studentId: string): Promise<void> {
        // In a real implementation, this would check if the supervisor has access to this student
        // For now, we'll assume all supervisors can review all student interactions
        // This should be implemented based on your student-supervisor relationship model
        return;
    }

    private calculateReviewTrends(reviews: AIInteractionReview[]): Array<{
        date: string;
        approved: number;
        escalated: number;
        flagged: number;
    }> {
        const trends = new Map<string, { approved: number; escalated: number; flagged: number }>();

        reviews.forEach(review => {
            const date = review.createdAt.toISOString().split('T')[0];
            if (!trends.has(date)) {
                trends.set(date, { approved: 0, escalated: 0, flagged: 0 });
            }

            const dayTrend = trends.get(date)!;
            switch (review.status) {
                case ReviewStatus.APPROVED:
                    dayTrend.approved++;
                    break;
                case ReviewStatus.ESCALATED:
                    dayTrend.escalated++;
                    break;
                case ReviewStatus.FLAGGED:
                    dayTrend.flagged++;
                    break;
            }
        });

        return Array.from(trends.entries())
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    private mapToResponseDto(
        review: AIInteractionReview,
        student: User
    ): AIInteractionReviewResponseDto {
        return {
            id: review.id,
            conversationId: review.conversationId,
            studentId: review.studentId,
            studentName: student?.studentProfile?.name || 'Unknown Student',
            status: review.status,
            categories: review.categories,
            confidenceScore: review.confidenceScore,
            reviewNotes: review.reviewNotes,
            supervisorFeedback: review.supervisorFeedback,
            requiresFollowUp: review.requiresFollowUp,
            reviewedAt: review.reviewedAt?.toISOString() || null,
            resolvedAt: review.resolvedAt?.toISOString() || null,
            createdAt: review.createdAt.toISOString(),
            updatedAt: review.updatedAt.toISOString(),
        };
    }
}