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

export enum ReportType {
    STUDENT_PROGRESS = 'student_progress',
    MILESTONE_SUMMARY = 'milestone_summary',
    AI_INTERACTION_SUMMARY = 'ai_interaction_summary',
    PERFORMANCE_ANALYTICS = 'performance_analytics',
    CUSTOM = 'custom',
}

export enum ReportFormat {
    PDF = 'pdf',
    CSV = 'csv',
    JSON = 'json',
}

export enum ReportStatus {
    GENERATING = 'generating',
    COMPLETED = 'completed',
    FAILED = 'failed',
    EXPIRED = 'expired',
}

@Entity('supervisor_reports')
@Index(['supervisorId', 'type', 'createdAt'])
@Index(['status', 'createdAt'])
export class SupervisorReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    supervisorId: string;

    @Column({
        type: 'enum',
        enum: ReportType,
        default: ReportType.STUDENT_PROGRESS,
    })
    type: ReportType;

    @Column({
        type: 'enum',
        enum: ReportFormat,
        default: ReportFormat.PDF,
    })
    format: ReportFormat;

    @Column({
        type: 'enum',
        enum: ReportStatus,
        default: ReportStatus.GENERATING,
    })
    status: ReportStatus;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'jsonb', nullable: true })
    filters: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    parameters: Record<string, any>;

    @Column({ type: 'varchar', length: 255, nullable: true })
    filename: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    filePath: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    mimeType: string;

    @Column({ type: 'bigint', nullable: true })
    fileSize: number;

    @Column({ type: 'timestamp', nullable: true })
    generatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date;

    @Column({ type: 'int', default: 0 })
    downloadCount: number;

    @Column({ type: 'timestamp', nullable: true })
    lastDownloadedAt: Date;

    @Column({ type: 'text', nullable: true })
    errorMessage: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'supervisorId' })
    supervisor: User;
}