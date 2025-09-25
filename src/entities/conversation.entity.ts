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
import { ConversationMessage } from './conversation-message.entity';
import { ConversationStatus } from '../common/enums';
import { ConversationContext } from './interfaces/conversation.interface';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @OneToMany(() => ConversationMessage, (message) => message.conversation, {
    cascade: true,
  })
  messages: ConversationMessage[];

  @Column({ type: 'jsonb', nullable: true })
  context: ConversationContext | null;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Column({ name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastMessageAt: Date | null;

  // Helper methods for conversation lifecycle management
  archive(): void {
    this.status = ConversationStatus.ARCHIVED;
  }

  escalate(): void {
    this.status = ConversationStatus.ESCALATED;
  }

  reactivate(): void {
    this.status = ConversationStatus.ACTIVE;
  }

  updateLastActivity(): void {
    this.lastMessageAt = new Date();
  }

  isActive(): boolean {
    return this.status === ConversationStatus.ACTIVE;
  }

  isArchived(): boolean {
    return this.status === ConversationStatus.ARCHIVED;
  }

  isEscalated(): boolean {
    return this.status === ConversationStatus.ESCALATED;
  }
}
