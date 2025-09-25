import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { KnowledgeBaseEntry } from './knowledge-base-entry.entity';

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REVISION = 'needs_revision',
}

export enum ApprovalAction {
  SUBMIT = 'submit',
  APPROVE = 'approve',
  REJECT = 'reject',
  REQUEST_CHANGES = 'request_changes',
  RESUBMIT = 'resubmit',
}

@Entity('knowledge_base_approvals')
@Index(['entryId', 'status'])
@Index(['status', 'createdAt'])
@Index(['reviewerId', 'status'])
export class KnowledgeBaseApproval {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => KnowledgeBaseEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: KnowledgeBaseEntry;

  @Column({ name: 'entry_id' })
  entryId: string;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({
    type: 'enum',
    enum: ApprovalAction,
  })
  action: ApprovalAction;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitter_id' })
  submitter: User;

  @Column({ name: 'submitter_id' })
  submitterId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer: User | null;

  @Column({ name: 'reviewer_id', nullable: true })
  reviewerId: string | null;

  @Column({ type: 'text', nullable: true })
  comments: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  suggestedChanges: string[];

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isPending(): boolean {
    return this.status === ApprovalStatus.PENDING;
  }

  isApproved(): boolean {
    return this.status === ApprovalStatus.APPROVED;
  }

  isRejected(): boolean {
    return this.status === ApprovalStatus.REJECTED;
  }

  needsRevision(): boolean {
    return this.status === ApprovalStatus.NEEDS_REVISION;
  }

  approve(reviewerId: string, comments?: string): void {
    this.status = ApprovalStatus.APPROVED;
    this.action = ApprovalAction.APPROVE;
    this.reviewerId = reviewerId;
    this.comments = comments || null;
    this.reviewedAt = new Date();
  }

  reject(reviewerId: string, reason: string, comments?: string): void {
    this.status = ApprovalStatus.REJECTED;
    this.action = ApprovalAction.REJECT;
    this.reviewerId = reviewerId;
    this.reason = reason;
    this.comments = comments || null;
    this.reviewedAt = new Date();
  }

  requestChanges(
    reviewerId: string,
    suggestedChanges: string[],
    comments?: string,
  ): void {
    this.status = ApprovalStatus.NEEDS_REVISION;
    this.action = ApprovalAction.REQUEST_CHANGES;
    this.reviewerId = reviewerId;
    this.suggestedChanges = suggestedChanges;
    this.comments = comments || null;
    this.reviewedAt = new Date();
  }

  resubmit(submitterId: string): void {
    this.status = ApprovalStatus.PENDING;
    this.action = ApprovalAction.RESUBMIT;
    this.submitterId = submitterId;
    this.reviewerId = null;
    this.reviewedAt = null;
    this.comments = null;
    this.suggestedChanges = [];
    this.reason = null;
  }

  isOverdue(): boolean {
    if (!this.dueDate) return false;
    return new Date() > this.dueDate && this.isPending();
  }

  getDaysUntilDue(): number | null {
    if (!this.dueDate) return null;
    const now = new Date();
    const diffTime = this.dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getProcessingTime(): number | null {
    if (!this.reviewedAt) return null;
    const diffTime = this.reviewedAt.getTime() - this.createdAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Days
  }

  hasComments(): boolean {
    return this.comments !== null && this.comments.length > 0;
  }

  hasSuggestedChanges(): boolean {
    return this.suggestedChanges.length > 0;
  }

  isHighPriority(): boolean {
    return this.priority >= 3;
  }

  setHighPriority(): void {
    this.priority = 3;
  }

  setLowPriority(): void {
    this.priority = 1;
  }

  static createSubmission(
    entryId: string,
    submitterId: string,
    dueDate?: Date,
  ): Partial<KnowledgeBaseApproval> {
    return {
      entryId,
      submitterId,
      status: ApprovalStatus.PENDING,
      action: ApprovalAction.SUBMIT,
      priority: 2, // Normal priority
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };
  }
}
