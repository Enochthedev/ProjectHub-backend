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
import { AIAlertRule, AlertSeverity } from './ai-alert-rule.entity';

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  ACKNOWLEDGED = 'acknowledged',
  SUPPRESSED = 'suppressed',
}

@Entity('ai_alerts')
@Index(['serviceId', 'status'])
@Index(['severity', 'status'])
@Index(['triggeredAt', 'status'])
@Index(['ruleId', 'status'])
export class AIAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AIAlertRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: AIAlertRule;

  @Column({ name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => AIServiceConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: AIServiceConfig;

  @Column({ name: 'service_id' })
  serviceId: string;

  @Column({ length: 100 })
  alertType: string;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  threshold: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  currentValue: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column()
  triggeredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledged_by' })
  acknowledgedBy: User | null;

  @Column({ name: 'acknowledged_by', nullable: true })
  acknowledgedById: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'int', default: 1 })
  occurrenceCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastOccurrence: Date | null;

  @Column({ type: 'text', array: true, default: '{}' })
  notificationsSent: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === AlertStatus.ACTIVE;
  }

  isResolved(): boolean {
    return this.status === AlertStatus.RESOLVED;
  }

  isAcknowledged(): boolean {
    return this.status === AlertStatus.ACKNOWLEDGED;
  }

  isSuppressed(): boolean {
    return this.status === AlertStatus.SUPPRESSED;
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

  acknowledge(userId: string, notes?: string): void {
    this.status = AlertStatus.ACKNOWLEDGED;
    this.acknowledgedAt = new Date();
    this.acknowledgedById = userId;
    if (notes) {
      this.resolutionNotes = notes;
    }
  }

  resolve(notes?: string): void {
    this.status = AlertStatus.RESOLVED;
    this.resolvedAt = new Date();
    if (notes) {
      this.resolutionNotes = notes;
    }
  }

  suppress(): void {
    this.status = AlertStatus.SUPPRESSED;
  }

  reactivate(): void {
    this.status = AlertStatus.ACTIVE;
    this.acknowledgedAt = null;
    this.acknowledgedById = null;
    this.resolvedAt = null;
  }

  incrementOccurrence(): void {
    this.occurrenceCount += 1;
    this.lastOccurrence = new Date();
  }

  getDuration(): number | null {
    if (!this.resolvedAt) return null;
    return this.resolvedAt.getTime() - this.triggeredAt.getTime();
  }

  getDurationInMinutes(): number | null {
    const duration = this.getDuration();
    return duration ? Math.floor(duration / (1000 * 60)) : null;
  }

  getDurationInHours(): number | null {
    const duration = this.getDuration();
    return duration ? Math.floor(duration / (1000 * 60 * 60)) : null;
  }

  getAge(): number {
    return new Date().getTime() - this.triggeredAt.getTime();
  }

  getAgeInMinutes(): number {
    return Math.floor(this.getAge() / (1000 * 60));
  }

  getAgeInHours(): number {
    return Math.floor(this.getAge() / (1000 * 60 * 60));
  }

  addNotificationSent(channel: string): void {
    if (!this.notificationsSent.includes(channel)) {
      this.notificationsSent.push(channel);
    }
  }

  hasNotificationSent(channel: string): boolean {
    return this.notificationsSent.includes(channel);
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

  updateCurrentValue(value: number): void {
    this.currentValue = value;
    this.incrementOccurrence();
  }

  getThresholdExceededBy(): number {
    return Math.abs(this.currentValue - this.threshold);
  }

  getThresholdExceededPercentage(): number {
    if (this.threshold === 0) return 0;
    return (this.getThresholdExceededBy() / this.threshold) * 100;
  }

  static createFromRule(
    rule: AIAlertRule,
    currentValue: number,
    title: string,
    description: string,
  ): Partial<AIAlert> {
    return {
      ruleId: rule.id,
      serviceId: rule.serviceId,
      alertType: rule.metricType,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      title,
      description,
      threshold: rule.threshold,
      currentValue,
      triggeredAt: new Date(),
      occurrenceCount: 1,
      lastOccurrence: new Date(),
      notificationsSent: [],
    };
  }
}
