import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { MilestoneNote } from './milestone-note.entity';
import { MilestoneReminder } from './milestone-reminder.entity';
import { SharedMilestoneAssignment } from './shared-milestone-assignment.entity';
import { MilestoneStatus, Priority } from '../common/enums';

@Entity('shared_milestones')
export class SharedMilestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.NOT_STARTED,
  })
  status: MilestoneStatus;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToMany(() => User, { eager: true })
  @JoinTable({
    name: 'shared_milestone_assignees',
    joinColumn: { name: 'milestone_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  assignees: User[];

  @OneToMany(
    () => SharedMilestoneAssignment,
    (assignment) => assignment.milestone,
    { cascade: true },
  )
  assignments: SharedMilestoneAssignment[];

  @OneToMany(() => MilestoneNote, (note) => note.milestone, { cascade: true })
  notes: MilestoneNote[];

  @OneToMany(() => MilestoneReminder, (reminder) => reminder.milestone, {
    cascade: true,
  })
  reminders: MilestoneReminder[];

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  estimatedHours: number;

  @Column({ type: 'integer', default: 0 })
  actualHours: number;

  @Column({ type: 'text', nullable: true })
  blockingReason: string | null;

  @Column({ type: 'boolean', default: false })
  requiresAllApproval: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods for business logic
  isOverdue(): boolean {
    if (this.status === MilestoneStatus.COMPLETED) {
      return false;
    }
    return new Date() > new Date(this.dueDate);
  }

  getDaysUntilDue(): number {
    const today = new Date();
    const due = new Date(this.dueDate);
    const diffTime = due.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

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
    if (this.assignments && this.assignments.length > 0) {
      const completedAssignments = this.assignments.filter(
        (assignment) => assignment.status === MilestoneStatus.COMPLETED,
      ).length;
      return Math.round((completedAssignments / this.assignments.length) * 100);
    }

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

  isAssignedTo(userId: string): boolean {
    return this.assignees?.some((assignee) => assignee.id === userId) || false;
  }

  canBeCompletedBy(userId: string): boolean {
    if (!this.requiresAllApproval) {
      return this.isAssignedTo(userId);
    }

    // If requires all approval, check if all assignments are completed
    if (!this.assignments || this.assignments.length === 0) {
      return false;
    }

    const allAssignmentsCompleted = this.assignments.every(
      (assignment) => assignment.status === MilestoneStatus.COMPLETED,
    );

    return allAssignmentsCompleted && this.isAssignedTo(userId);
  }

  getAssignmentForUser(userId: string): SharedMilestoneAssignment | undefined {
    return this.assignments?.find(
      (assignment) => assignment.assigneeId === userId,
    );
  }
}
