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
import { MilestoneDiscussion } from './milestone-discussion.entity';

@Entity('milestone_discussion_replies')
export class MilestoneDiscussionReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MilestoneDiscussion, (discussion) => discussion.replies, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'discussion_id' })
  discussion: MilestoneDiscussion;

  @Column({ name: 'discussion_id' })
  discussionId: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => MilestoneDiscussionReply, { nullable: true })
  @JoinColumn({ name: 'parent_reply_id' })
  parentReply: MilestoneDiscussionReply | null;

  @Column({ name: 'parent_reply_id', nullable: true })
  parentReplyId: string | null;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  canBeEditedBy(userId: string): boolean {
    return this.authorId === userId;
  }

  canBeDeletedBy(userId: string): boolean {
    return this.authorId === userId;
  }

  isReply(): boolean {
    return this.parentReplyId !== null;
  }
}
