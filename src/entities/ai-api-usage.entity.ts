import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('ai_api_usage')
export class AIApiUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  endpoint: string;

  @Column({ length: 100 })
  model: string;

  @Column({ type: 'int' })
  tokensUsed: number;

  @Column({ type: 'int' })
  responseTimeMs: number;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods for analytics and monitoring
  isSuccessful(): boolean {
    return this.success;
  }

  isFailed(): boolean {
    return !this.success;
  }

  isSlowResponse(thresholdMs: number = 5000): boolean {
    return this.responseTimeMs > thresholdMs;
  }

  hasError(): boolean {
    return this.errorMessage !== null && this.errorMessage.length > 0;
  }

  getUsageMetrics(): {
    endpoint: string;
    model: string;
    tokensUsed: number;
    responseTimeMs: number;
    success: boolean;
    timestamp: Date;
  } {
    return {
      endpoint: this.endpoint,
      model: this.model,
      tokensUsed: this.tokensUsed,
      responseTimeMs: this.responseTimeMs,
      success: this.success,
      timestamp: this.createdAt,
    };
  }
}
