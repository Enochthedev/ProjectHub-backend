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

@Entity('supervisor_analytics')
@Index(['supervisorId', 'metricType', 'periodStart'])
export class SupervisorAnalytics {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    supervisorId: string;

    @Column({ type: 'varchar', length: 50 })
    metricType: string; // 'completion_rate', 'velocity', 'risk_score', 'student_count'

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    value: number;

    @Column({ type: 'date' })
    periodStart: Date;

    @Column({ type: 'date' })
    periodEnd: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'supervisorId' })
    supervisor: User;
}