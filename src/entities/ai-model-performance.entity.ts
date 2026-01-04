import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_model_performance')
@Index(['modelId', 'updatedAt'])
export class AIModelPerformance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200, unique: true, name: 'model_id' })
  modelId: string;

  @Column({ type: 'int', name: 'total_requests', default: 0 })
  totalRequests: number;

  @Column({ type: 'int', name: 'successful_requests', default: 0 })
  successfulRequests: number;

  @Column({ type: 'int', name: 'failed_requests', default: 0 })
  failedRequests: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, name: 'average_latency', default: 0 })
  averageLatency: number;

  @Column({ type: 'numeric', precision: 10, scale: 6, name: 'average_cost', default: 0 })
  averageCost: number;

  @Column({ type: 'numeric', precision: 12, scale: 6, name: 'total_cost', default: 0 })
  totalCost: number;

  @Column({ type: 'bigint', name: 'total_tokens', default: 0 })
  totalTokens: number;

  @Column({ name: 'last_used', type: 'timestamp', nullable: true })
  lastUsed: Date | null;

  @Column({ name: 'last_success', type: 'timestamp', nullable: true })
  lastSuccess: Date | null;

  @Column({ name: 'last_failure', type: 'timestamp', nullable: true })
  lastFailure: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  getSuccessRate(): number {
    if (this.totalRequests === 0) return 0;
    return this.successfulRequests / this.totalRequests;
  }

  getFailureRate(): number {
    if (this.totalRequests === 0) return 0;
    return this.failedRequests / this.totalRequests;
  }

  recordSuccess(latency: number, cost: number, tokens: number): void {
    this.totalRequests++;
    this.successfulRequests++;

    // Update running averages
    const successCount = this.successfulRequests;
    this.averageLatency = Number(
      ((Number(this.averageLatency) * (successCount - 1)) + latency) / successCount
    );
    this.averageCost = Number(
      ((Number(this.averageCost) * (successCount - 1)) + cost) / successCount
    );

    this.totalCost = Number(this.totalCost) + cost;
    this.totalTokens = Number(this.totalTokens) + tokens;
    this.lastUsed = new Date();
    this.lastSuccess = new Date();
  }

  recordFailure(): void {
    this.totalRequests++;
    this.failedRequests++;
    this.lastUsed = new Date();
    this.lastFailure = new Date();
  }

  reset(): void {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.averageLatency = 0;
    this.averageCost = 0;
    this.totalCost = 0;
    this.totalTokens = 0;
  }
}
