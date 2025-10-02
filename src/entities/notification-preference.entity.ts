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
import { NotificationType } from './notification.entity';

export enum NotificationChannel {
    EMAIL = 'email',
    IN_APP = 'in_app',
    PUSH = 'push',
}

@Entity('notification_preferences')
export class NotificationPreference {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({
        type: 'enum',
        enum: NotificationType,
    })
    notificationType: NotificationType;

    @Column({
        type: 'enum',
        enum: NotificationChannel,
    })
    channel: NotificationChannel;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;

    @Column({ type: 'jsonb', nullable: true })
    settings: Record<string, any> | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'uuid' })
    userId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}