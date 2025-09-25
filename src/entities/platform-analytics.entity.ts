import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AnalyticsMetric } from '../common/enums/analytics-metric.enum';
import { AnalyticsPeriod } from '../common/enums/analytics-period.enum';

/**
 * Platform Analytics Entity
 *
 * Tracks platform metrics and usage statistics with flexible metric storage,
 * time-series data support, and aggregation capabilities. This entity provides:
 * - Flexible metric storage with metadata support
 * - Time-series data for trend analysis
 * - Aggregation and summary capabilities
 * - Performance optimized queries with proper indexing
 */
@Entity('platform_analytics')
@Index(['date', 'metric'])
@Index(['metric', 'period'])
@Index(['date'])
@Index(['createdAt'])
export class PlatformAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({
    type: 'enum',
    enum: AnalyticsMetric,
  })
  metric: AnalyticsMetric;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  value: number;

  @Column({
    type: 'enum',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.DAILY,
  })
  period: AnalyticsPeriod;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subcategory: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  dimensions: Record<string, any> | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  previousValue: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 4, nullable: true })
  changePercent: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'boolean', default: false })
  isAggregated: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  source: string | null;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Helper method to calculate percentage change from previous value
   */
  calculateChangePercent(): number | null {
    if (this.previousValue === null || this.previousValue === 0) {
      return null;
    }

    const change =
      ((Number(this.value) - Number(this.previousValue)) /
        Number(this.previousValue)) *
      100;
    return Math.round(change * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Helper method to update change percentage
   */
  updateChangePercent(): void {
    this.changePercent = this.calculateChangePercent();
  }

  /**
   * Helper method to check if metric shows growth
   */
  isGrowth(): boolean {
    return this.changePercent !== null && this.changePercent > 0;
  }

  /**
   * Helper method to check if metric shows decline
   */
  isDecline(): boolean {
    return this.changePercent !== null && this.changePercent < 0;
  }

  /**
   * Helper method to get formatted value with unit
   */
  getFormattedValue(): string {
    const formattedValue = this.formatNumber(Number(this.value));
    return this.unit ? `${formattedValue} ${this.unit}` : formattedValue;
  }

  /**
   * Helper method to get formatted previous value with unit
   */
  getFormattedPreviousValue(): string | null {
    if (this.previousValue === null) {
      return null;
    }

    const formattedValue = this.formatNumber(Number(this.previousValue));
    return this.unit ? `${formattedValue} ${this.unit}` : formattedValue;
  }

  /**
   * Helper method to format numbers with appropriate suffixes
   */
  private formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    } else if (value % 1 === 0) {
      return value.toString();
    } else {
      return value.toFixed(2);
    }
  }

  /**
   * Helper method to get change indicator
   */
  getChangeIndicator(): string {
    if (this.changePercent === null) {
      return '—';
    } else if (this.changePercent > 0) {
      return `↗ +${this.changePercent}%`;
    } else if (this.changePercent < 0) {
      return `↘ ${this.changePercent}%`;
    } else {
      return '→ 0%';
    }
  }

  /**
   * Helper method to check if this is a time-series metric
   */
  isTimeSeries(): boolean {
    return this.period !== null && this.date !== null;
  }

  /**
   * Helper method to get metric summary
   */
  getSummary(): string {
    const formattedValue = this.getFormattedValue();
    const changeIndicator = this.getChangeIndicator();
    return `${this.metric}: ${formattedValue} ${changeIndicator}`;
  }

  /**
   * Helper method to check if metric is within expected range
   */
  isWithinRange(min?: number, max?: number): boolean {
    const numValue = Number(this.value);

    if (min !== undefined && numValue < min) {
      return false;
    }

    if (max !== undefined && numValue > max) {
      return false;
    }

    return true;
  }

  /**
   * Helper method to get metric category from enum
   */
  getMetricCategory(): string {
    const metric = this.metric;

    if (metric.startsWith('user_')) {
      return 'User Metrics';
    } else if (metric.startsWith('project_')) {
      return 'Project Metrics';
    } else if (metric.startsWith('supervisor_')) {
      return 'Supervisor Metrics';
    } else if (metric.startsWith('ai_')) {
      return 'AI Metrics';
    } else if (metric.startsWith('system_')) {
      return 'System Metrics';
    } else if (metric.startsWith('milestone_')) {
      return 'Milestone Metrics';
    } else if (metric.startsWith('recommendation_')) {
      return 'Recommendation Metrics';
    } else {
      return 'Other Metrics';
    }
  }
}
