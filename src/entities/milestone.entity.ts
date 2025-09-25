import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';
import { MilestoneNote } from './milestone-note.entity';
import { MilestoneReminder } from './milestone-reminder.entity';
import { MilestoneStatus, Priority } from '../common/enums';

@Entity('milestones')
export class Milestone {
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
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

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
  isTemplate: boolean;

  @Column({ type: 'uuid', nullable: true })
  templateId: string | null;

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
}
