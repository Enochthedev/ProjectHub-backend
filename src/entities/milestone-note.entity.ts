import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Milestone } from './milestone.entity';
import { User } from './user.entity';
import { NoteType } from '../common/enums';

@Entity('milestone_notes')
@Index(['milestoneId', 'createdAt'])
export class MilestoneNote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Milestone, (milestone) => milestone.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'milestone_id' })
  milestone: Milestone;

  @Column({ name: 'milestone_id' })
  milestoneId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: NoteType,
    default: NoteType.PROGRESS,
  })
  type: NoteType;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  isFromSupervisor(): boolean {
    return this.type === NoteType.SUPERVISOR_FEEDBACK;
  }

  getFormattedContent(): string {
    const timestamp = this.createdAt.toLocaleString();
    const authorName =
      this.author?.studentProfile?.name ||
      this.author?.supervisorProfile?.name ||
      'Unknown';
    return `[${timestamp}] ${authorName}: ${this.content}`;
  }

  static getTypeDisplayName(type: NoteType): string {
    const displayNames: Record<NoteType, string> = {
      [NoteType.PROGRESS]: 'Progress Update',
      [NoteType.ISSUE]: 'Issue',
      [NoteType.SOLUTION]: 'Solution',
      [NoteType.MEETING]: 'Meeting Notes',
      [NoteType.SUPERVISOR_FEEDBACK]: 'Supervisor Feedback',
    };
    return displayNames[type] || type;
  }
}
