import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SharedMilestone } from './shared-milestone.entity';
import { MilestoneDiscussionReply } from './milestone-discussion-reply.entity';

export enum DiscussionType {
  GENERAL = 'general',
  ISSUE = 'issue',
  CONFLICT = 'conflict',
  SUGGESTION = 'suggestion',
  QUESTION = 'question',
}

export enum DiscussionStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('milestone_discussions')
export class MilestoneDiscussion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SharedMilestone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'milestone_id' })
  milestone: SharedMilestone;

  @Column({ name: 'milestone_id' })
  milestoneId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: DiscussionType,
    default: DiscussionType.GENERAL,
  })
  type: DiscussionType;

  @Column({
    type: 'enum',
    enum: DiscussionStatus,
    default: DiscussionStatus.OPEN,
  })
  status: DiscussionStatus;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @OneToMany(() => MilestoneDiscussionReply, (reply) => reply.discussion, {
    cascade: true,
  })
  replies: MilestoneDiscussionReply[];

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isUrgent: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'resolved_by' })
  resolvedBy: User | null;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedById: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  canBeResolvedBy(userId: string): boolean {
    // Author can resolve their own discussions
    if (this.authorId === userId) {
      return true;
    }

    // For conflicts, any team member can resolve
    if (this.type === DiscussionType.CONFLICT) {
      return true;
    }

    return false;
  }

  isActive(): boolean {
    return this.status === DiscussionStatus.OPEN;
  }

  getRepliesCount(): number {
    return this.replies?.length || 0;
  }
}
