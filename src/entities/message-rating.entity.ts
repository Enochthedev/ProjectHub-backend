import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ConversationMessage } from './conversation-message.entity';
import { User } from './user.entity';

@Entity('message_ratings')
@Unique(['messageId', 'userId'])
export class MessageRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ConversationMessage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: ConversationMessage;

  @Column({ name: 'message_id' })
  messageId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  rating: number; // 1.0 to 5.0

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  isPositive(): boolean {
    return this.rating >= 4.0;
  }

  isNegative(): boolean {
    return this.rating <= 2.0;
  }

  isNeutral(): boolean {
    return this.rating > 2.0 && this.rating < 4.0;
  }
}
