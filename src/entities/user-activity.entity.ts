import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ActivityType {
    LOGIN = 'login',
    LOGOUT = 'logout',
    PROJECT_VIEW = 'project_view',
    PROJECT_BOOKMARK = 'project_bookmark',
    PROJECT_UNBOOKMARK = 'project_unbookmark',
    PROJECT_APPLY = 'project_apply',
    MILESTONE_CREATE = 'milestone_create',
    MILESTONE_UPDATE = 'milestone_update',
    MILESTONE_COMPLETE = 'milestone_complete',
    AI_CHAT = 'ai_chat',
    PROFILE_UPDATE = 'profile_update',
    SEARCH = 'search',
}

@Entity('user_activities')
@Index(['userId', 'createdAt'])
@Index(['activityType', 'createdAt'])
export class UserActivity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({
        type: 'enum',
        enum: ActivityType,
    })
    activityType: ActivityType;

    @Column({ type: 'varchar', length: 500 })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    @Column({ type: 'varchar', length: 45, nullable: true })
    ipAddress: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    userAgent: string | null;

    @CreateDateColumn()
    createdAt: Date;
}