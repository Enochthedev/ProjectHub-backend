import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum ApplicationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    WITHDRAWN = 'withdrawn',
}

@Entity('project_applications')
@Unique(['projectId', 'studentId'])
@Index(['studentId', 'status'])
@Index(['projectId', 'status'])
export class ProjectApplication {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @Column({ name: 'project_id' })
    projectId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'student_id' })
    student: User;

    @Column({ name: 'student_id' })
    studentId: string;

    @Column({
        type: 'enum',
        enum: ApplicationStatus,
        default: ApplicationStatus.PENDING,
    })
    status: ApplicationStatus;

    @Column({ type: 'text', nullable: true })
    coverLetter: string | null;

    @Column({ type: 'text', nullable: true })
    rejectionReason: string | null;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt: Date | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'reviewed_by' })
    reviewedBy: User | null;

    @Column({ name: 'reviewed_by', nullable: true })
    reviewedById: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}