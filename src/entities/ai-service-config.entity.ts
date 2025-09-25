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

export enum AIServiceType {
  HUGGING_FACE = 'hugging_face',
  OPENAI = 'openai',
  CUSTOM = 'custom',
}

export enum AIModelType {
  EMBEDDING = 'embedding',
  QA = 'qa',
  CLASSIFICATION = 'classification',
  GENERATION = 'generation',
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  monthlyLimit: number;
  burstLimit: number;
}

export interface ModelParameters {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  confidenceThreshold?: number;
  customParameters?: Record<string, any>;
}

export interface FallbackBehavior {
  enabled: boolean;
  fallbackService?: AIServiceType;
  fallbackModel?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  fallbackMessage?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  halfOpenMaxCalls: number;
  monitoringPeriod: number;
}

@Entity('ai_service_configs')
@Index(['serviceType', 'modelType'])
@Index(['isActive', 'createdAt'])
export class AIServiceConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: AIServiceType,
  })
  serviceType: AIServiceType;

  @Column({
    type: 'enum',
    enum: AIModelType,
  })
  modelType: AIModelType;

  @Column({ length: 200 })
  model: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  apiEndpoint: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  apiKey: string | null;

  @Column({ type: 'int', default: 15000 })
  timeout: number;

  @Column({ type: 'jsonb' })
  rateLimits: RateLimitConfig;

  @Column({ type: 'jsonb' })
  modelParameters: ModelParameters;

  @Column({ type: 'jsonb' })
  fallbackBehavior: FallbackBehavior;

  @Column({ type: 'jsonb' })
  circuitBreaker: CircuitBreakerConfig;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'int', default: 0 })
  version: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;

  @Column({ name: 'updated_by' })
  updatedById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isEnabled(): boolean {
    return this.isActive;
  }

  isDisabled(): boolean {
    return !this.isActive;
  }

  hasTag(tag: string): boolean {
    return this.tags.includes(tag);
  }

  addTag(tag: string): void {
    if (!this.hasTag(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  getRateLimitForPeriod(period: 'minute' | 'hour' | 'day' | 'month'): number {
    switch (period) {
      case 'minute':
        return this.rateLimits.requestsPerMinute;
      case 'hour':
        return this.rateLimits.requestsPerHour;
      case 'day':
        return this.rateLimits.requestsPerDay;
      case 'month':
        return this.rateLimits.monthlyLimit;
      default:
        return 0;
    }
  }

  isFallbackEnabled(): boolean {
    return this.fallbackBehavior.enabled;
  }

  getModelParameter<T = any>(key: string, defaultValue?: T): T {
    return this.modelParameters[key] ?? defaultValue;
  }

  setModelParameter(key: string, value: any): void {
    this.modelParameters = {
      ...this.modelParameters,
      [key]: value,
    };
  }

  getCircuitBreakerThreshold(): number {
    return this.circuitBreaker.failureThreshold;
  }

  getRecoveryTimeout(): number {
    return this.circuitBreaker.recoveryTimeout;
  }

  incrementVersion(): void {
    this.version += 1;
  }

  toConfigObject(): {
    name: string;
    serviceType: AIServiceType;
    modelType: AIModelType;
    model: string;
    apiEndpoint?: string;
    timeout: number;
    rateLimits: RateLimitConfig;
    modelParameters: ModelParameters;
    fallbackBehavior: FallbackBehavior;
    circuitBreaker: CircuitBreakerConfig;
  } {
    return {
      name: this.name,
      serviceType: this.serviceType,
      modelType: this.modelType,
      model: this.model,
      apiEndpoint: this.apiEndpoint || undefined,
      timeout: this.timeout,
      rateLimits: this.rateLimits,
      modelParameters: this.modelParameters,
      fallbackBehavior: this.fallbackBehavior,
      circuitBreaker: this.circuitBreaker,
    };
  }

  static createDefault(
    name: string,
    serviceType: AIServiceType,
    modelType: AIModelType,
    model: string,
    createdById: string,
  ): Partial<AIServiceConfig> {
    return {
      name,
      serviceType,
      modelType,
      model,
      timeout: 15000,
      rateLimits: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
        monthlyLimit: 100000,
        burstLimit: 10,
      },
      modelParameters: {
        temperature: 0.7,
        maxTokens: 512,
        confidenceThreshold: 0.3,
      },
      fallbackBehavior: {
        enabled: true,
        maxRetries: 3,
        retryDelayMs: 1000,
        fallbackMessage: 'AI service temporarily unavailable',
      },
      circuitBreaker: {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        halfOpenMaxCalls: 2,
        monitoringPeriod: 60000,
      },
      isActive: true,
      tags: [],
      version: 1,
      createdById,
      updatedById: createdById,
    };
  }
}
