import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { MessageRating } from './message-rating.entity';
import { MessageType, MessageStatus } from '../common/enums';
import { MessageMetadata } from './interfaces/conversation.interface';

@Entity('conversation_messages')
export class ConversationMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  type: MessageType;

  @Column('text')
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: MessageMetadata | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  confidenceScore: number | null;

  @Column({ type: 'text', array: true, default: '{}' })
  sources: string[];

  @Column({ default: false })
  isBookmarked: boolean;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.DELIVERED,
  })
  status: MessageStatus;

  @OneToMany(() => MessageRating, (rating) => rating.message, { cascade: true })
  ratings: MessageRating[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  averageRating: number;

  @Column({ type: 'integer', default: 0 })
  ratingCount: number;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods for message management
  bookmark(): void {
    this.isBookmarked = true;
  }

  unbookmark(): void {
    this.isBookmarked = false;
  }

  markAsProcessing(): void {
    this.status = MessageStatus.PROCESSING;
  }

  markAsDelivered(): void {
    this.status = MessageStatus.DELIVERED;
  }

  markAsFailed(): void {
    this.status = MessageStatus.FAILED;
  }

  isFromAI(): boolean {
    return this.type === MessageType.AI_RESPONSE;
  }

  isFromUser(): boolean {
    return this.type === MessageType.USER_QUERY;
  }

  isSystemMessage(): boolean {
    return this.type === MessageType.SYSTEM_MESSAGE;
  }

  hasHighConfidence(): boolean {
    return this.confidenceScore !== null && this.confidenceScore >= 0.7;
  }

  hasLowConfidence(): boolean {
    return this.confidenceScore !== null && this.confidenceScore < 0.3;
  }

  // Rating management methods
  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.ratingCount + newRating;
    this.ratingCount += 1;
    this.averageRating = Number((totalRating / this.ratingCount).toFixed(2));
  }

  hasHighRating(): boolean {
    return this.averageRating >= 4.0 && this.ratingCount > 0;
  }

  hasLowRating(): boolean {
    return this.averageRating <= 2.0 && this.ratingCount > 0;
  }

  isWellRated(): boolean {
    return this.ratingCount >= 5 && this.averageRating >= 3.5;
  }
}
