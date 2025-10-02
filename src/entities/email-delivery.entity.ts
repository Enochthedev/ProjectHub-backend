import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum EmailStatus {
    QUEUED = 'queued',
    SENDING = 'sending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    BOUNCED = 'bounced',
}

export enum EmailType {
    VERIFICATION = 'verification',
    PASSWORD_RESET = 'password_reset',
    WELCOME = 'welcome',
    NOTIFICATION = 'notification',
    TEST = 'test',
}

@Entity('email_deliveries')
export class EmailDelivery {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    to: string;

    @Column({ type: 'varchar', length: 255 })
    subject: string;

    @Column({
        type: 'enum',
        enum: EmailType,
    })
    type: EmailType;

    @Column({
        type: 'enum',
        enum: EmailStatus,
        default: EmailStatus.QUEUED,
    })
    status: EmailStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    messageId: string | null;

    @Column({ type: 'text', nullable: true })
    errorMessage: string | null;

    @Column({ type: 'int', default: 0 })
    retryCount: number;

    @Column({ type: 'int', default: 3 })
    maxRetries: number;

    @Column({ type: 'timestamp', nullable: true })
    scheduledAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    sentAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    deliveredAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    failedAt: Date | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}