import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

export enum ReviewStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    ESCALATED = 'escalated',
    FLAGGED = 'flagged',
    RESOLVED = 'resolved',
}

export enum ReviewCategory {
    ACCURACY = 'accuracy',
    APPROPRIATENESS = 'appropriateness',
    COMPLETENESS = 'completeness',
    SAFETY = 'safety',
    POLICY_VIOLATION = 'policy_violation',
}

@Entity('ai_interaction_reviews')
@Index(['supervisorId', 'status', 'createdAt'])
@Index(['conversationId', 'status'])
export class AIInteractionReview {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    conversationId: string;

    @Column({ type: 'uuid' })
    supervisorId: string;

    @Column({ type: 'uuid', nullable: true })
    studentId: string;

    @Column({
        type: 'enum',
        enum: ReviewStatus,
        default: ReviewStatus.PENDING,
    })
    status: ReviewStatus;

    @Column({
        type: 'enum',
        enum: ReviewCategory,
        array: true,
        default: [],
    })
    categories: ReviewCategory[];

    @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
    confidenceScore: number;

    @Column({ type: 'text', nullable: true })
    reviewNotes: string;

    @Column({ type: 'text', nullable: true })
    supervisorFeedback: string;

    @Column({ type: 'jsonb', nullable: true })
    aiResponseMetadata: Record<string, any>;

    @Column({ type: 'boolean', default: false })
    requiresFollowUp: boolean;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    resolvedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversationId' })
    conversation: Conversation;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'supervisorId' })
    supervisor: User;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'studentId' })
    student: User;
}