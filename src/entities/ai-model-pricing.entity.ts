import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('ai_model_pricing')
@Index(['modelId', 'isActive'])
export class AIModelPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200, unique: true, name: 'model_id' })
  modelId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 100 })
  provider: string;

  @Column({ type: 'numeric', precision: 12, scale: 8, name: 'cost_per_token' })
  costPerToken: number;

  @Column({ type: 'int', name: 'max_tokens' })
  maxTokens: number;

  @Column({ type: 'int', name: 'average_latency', default: 2000 })
  averageLatency: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, name: 'quality_score', default: 0.5 })
  qualityScore: number;

  @Column({ name: 'is_available', default: true })
  isAvailable: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  capabilities: string[];

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Helper methods
  estimateRequestCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens + outputTokens) * Number(this.costPerToken);
  }

  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  isEnabledAndAvailable(): boolean {
    return this.isActive && this.isAvailable;
  }

  static createFromModelInfo(modelInfo: {
    modelId: string;
    name: string;
    provider: string;
    costPerToken: number;
    maxTokens: number;
    averageLatency?: number;
    qualityScore?: number;
    capabilities?: string[];
    description?: string;
  }): Partial<AIModelPricing> {
    return {
      modelId: modelInfo.modelId,
      name: modelInfo.name,
      provider: modelInfo.provider,
      costPerToken: modelInfo.costPerToken,
      maxTokens: modelInfo.maxTokens,
      averageLatency: modelInfo.averageLatency || 2000,
      qualityScore: modelInfo.qualityScore || 0.5,
      capabilities: modelInfo.capabilities || [],
      description: modelInfo.description || null,
      isActive: true,
      isAvailable: true,
    };
  }
}
