import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Milestone } from './milestone.entity';

export enum NotificationType {
    MILESTONE_OVERDUE = 'milestone_overdue',
    MILESTONE_BLOCKED = 'milestone_blocked',
    MILESTONE_COMPLETED = 'milestone_completed',
    MILESTONE_UPDATED = 'milestone_updated',
    PROJECT_ASSIGNED = 'project_assigned',
    SUPERVISOR_MESSAGE = 'supervisor_message',
    SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

export enum NotificationStatus {
    UNREAD = 'unread',
    READ = 'read',
    ARCHIVED = 'archived',
}

export enum NotificationPriority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    URGENT = 'urgent',
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    type: NotificationType;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({
        type: 'enum',
        enum: NotificationStatus,
        default: NotificationStatus.UNREAD,
    })
    status: NotificationStatus;

    @Column({
        type: 'enum',
        enum: NotificationPriority,
        default: NotificationPriority.MEDIUM,
    })
    priority: NotificationPriority;

    @Column({ type: 'varchar', length: 255, nullable: true })
    actionUrl: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    actionLabel: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    @Column({ type: 'boolean', default: false })
    emailSent: boolean;

    @Column({ type: 'timestamp', nullable: true })
    emailSentAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    readAt: Date | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'uuid' })
    userId: string;

    @ManyToOne(() => Milestone, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'milestoneId' })
    milestone?: Milestone;

    @Column({ type: 'uuid', nullable: true })
    milestoneId?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}