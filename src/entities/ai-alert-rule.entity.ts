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
import { AIServiceConfig } from './ai-service-config.entity';

export enum MetricType {
  RESPONSE_TIME = 'response_time',
  SUCCESS_RATE = 'success_rate',
  ERROR_RATE = 'error_rate',
  THROUGHPUT = 'throughput',
  TOKEN_USAGE = 'token_usage',
  COST = 'cost',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertCondition {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
}

@Entity('ai_alert_rules')
@Index(['serviceId', 'isEnabled'])
@Index(['metricType', 'isEnabled'])
@Index(['severity', 'isEnabled'])
export class AIAlertRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => AIServiceConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: AIServiceConfig;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({
    type: 'enum',
    enum: MetricType,
  })
  metricType: MetricType;

  @Column({
    type: 'enum',
    enum: AlertCondition,
  })
  condition: AlertCondition;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  threshold: number;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
  })
  severity: AlertSeverity;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'int', default: 5 })
  evaluationWindow: number; // minutes

  @Column({ type: 'int', default: 15 })
  cooldownPeriod: number; // minutes

  @Column({ default: true })
  isEnabled: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  notificationChannels: string[];

  @Column({ type: 'timestamp', nullable: true })
  lastTriggered: Date | null;

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

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
  isActive(): boolean {
    return this.isEnabled;
  }

  isInactive(): boolean {
    return !this.isEnabled;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  isCritical(): boolean {
    return this.severity === AlertSeverity.CRITICAL;
  }

  isHigh(): boolean {
    return this.severity === AlertSeverity.HIGH;
  }

  isMedium(): boolean {
    return this.severity === AlertSeverity.MEDIUM;
  }

  isLow(): boolean {
    return this.severity === AlertSeverity.LOW;
  }

  shouldTrigger(currentValue: number): boolean {
    switch (this.condition) {
      case AlertCondition.GREATER_THAN:
        return currentValue > this.threshold;
      case AlertCondition.LESS_THAN:
        return currentValue < this.threshold;
      case AlertCondition.EQUALS:
        return Math.abs(currentValue - this.threshold) < 0.0001;
      case AlertCondition.NOT_EQUALS:
        return Math.abs(currentValue - this.threshold) >= 0.0001;
      case AlertCondition.GREATER_THAN_OR_EQUAL:
        return currentValue >= this.threshold;
      case AlertCondition.LESS_THAN_OR_EQUAL:
        return currentValue <= this.threshold;
      default:
        return false;
    }
  }

  isInCooldown(): boolean {
    if (!this.lastTriggered) return false;
    const cooldownEnd = new Date(
      this.lastTriggered.getTime() + this.cooldownPeriod * 60 * 1000,
    );
    return new Date() < cooldownEnd;
  }

  trigger(): void {
    this.lastTriggered = new Date();
    this.triggerCount += 1;
  }

  getConditionDescription(): string {
    const metricName = this.metricType.replace('_', ' ').toLowerCase();
    const conditionText = this.condition.replace('_', ' ').toLowerCase();
    return `${metricName} ${conditionText} ${this.threshold}`;
  }

  addNotificationChannel(channel: string): void {
    if (!this.notificationChannels.includes(channel)) {
      this.notificationChannels.push(channel);
    }
  }

  removeNotificationChannel(channel: string): void {
    this.notificationChannels = this.notificationChannels.filter(
      (c) => c !== channel,
    );
  }

  hasNotificationChannel(channel: string): boolean {
    return this.notificationChannels.includes(channel);
  }

  getMetadata<T = any>(key: string): T | undefined {
    return this.metadata?.[key];
  }

  setMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  static createDefault(
    name: string,
    serviceId: string,
    metricType: MetricType,
    threshold: number,
    createdById: string,
  ): Partial<AIAlertRule> {
    return {
      name,
      serviceId,
      metricType,
      condition: AlertCondition.GREATER_THAN,
      threshold,
      severity: AlertSeverity.MEDIUM,
      evaluationWindow: 5,
      cooldownPeriod: 15,
      isEnabled: true,
      notificationChannels: ['email'],
      triggerCount: 0,
      createdById,
      updatedById: createdById,
    };
  }
}
