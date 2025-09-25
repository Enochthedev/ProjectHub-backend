import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SharedMilestone } from './shared-milestone.entity';
import { MilestoneStatus } from '../common/enums';

@Entity('shared_milestone_assignments')
export class SharedMilestoneAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SharedMilestone, (milestone) => milestone.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'milestone_id' })
  milestone: SharedMilestone;

  @Column({ name: 'milestone_id' })
  milestoneId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'assignee_id' })
  assigneeId: string;

  @Column({ type: 'varchar', length: 200 })
  taskTitle: string;

  @Column({ type: 'text', nullable: true })
  taskDescription: string | null;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.NOT_STARTED,
  })
  status: MilestoneStatus;

  @Column({ type: 'integer', default: 0 })
  estimatedHours: number;

  @Column({ type: 'integer', default: 0 })
  actualHours: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  blockingReason: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assignedBy: User | null;

  @Column({ name: 'assigned_by', nullable: true })
  assignedById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  canTransitionTo(newStatus: MilestoneStatus): boolean {
    const validTransitions: Record<MilestoneStatus, MilestoneStatus[]> = {
      [MilestoneStatus.NOT_STARTED]: [
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.BLOCKED,
        MilestoneStatus.CANCELLED,
      ],
      [MilestoneStatus.IN_PROGRESS]: [
        MilestoneStatus.COMPLETED,
        MilestoneStatus.BLOCKED,
        MilestoneStatus.CANCELLED,
      ],
      [MilestoneStatus.BLOCKED]: [
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.CANCELLED,
      ],
      [MilestoneStatus.COMPLETED]: [MilestoneStatus.IN_PROGRESS], // Allow reopening
      [MilestoneStatus.CANCELLED]: [MilestoneStatus.NOT_STARTED],
    };

    return validTransitions[this.status]?.includes(newStatus) || false;
  }

  getProgressPercentage(): number {
    switch (this.status) {
      case MilestoneStatus.NOT_STARTED:
        return 0;
      case MilestoneStatus.IN_PROGRESS:
        return 50;
      case MilestoneStatus.COMPLETED:
        return 100;
      case MilestoneStatus.BLOCKED:
        return 25;
      case MilestoneStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  }

  isOverdue(milestoneDate: Date): boolean {
    if (this.status === MilestoneStatus.COMPLETED) {
      return false;
    }
    return new Date() > new Date(milestoneDate);
  }
}
