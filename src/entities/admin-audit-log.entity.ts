import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Admin Audit Log Entity
 *
 * Tracks all administrative actions with enhanced detail for security and compliance.
 * This entity provides comprehensive audit trails for admin activities including:
 * - Detailed action descriptions
 * - Resource identification
 * - Before/after state tracking
 * - Security context information
 * - Risk level assessment
 */
@Entity('admin_audit_logs')
@Index(['adminId', 'action'])
@Index(['createdAt'])
@Index(['riskLevel'])
@Index(['resourceType', 'resourceId'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  adminId: string;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'varchar', length: 100 })
  resourceType: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resourceId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  beforeState: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  afterState: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId: string | null;

  @Column({
    type: 'enum',
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  })
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'integer', nullable: true })
  duration: number | null; // Duration in milliseconds

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  admin?: User;

  @CreateDateColumn()
  createdAt: Date;

  /**
   * Helper method to determine if this is a high-risk action
   */
  isHighRisk(): boolean {
    return this.riskLevel === 'high' || this.riskLevel === 'critical';
  }

  /**
   * Helper method to get a summary of the action
   */
  getSummary(): string {
    const resource = this.resourceId
      ? `${this.resourceType}:${this.resourceId}`
      : this.resourceType;
    return `${this.action} on ${resource}`;
  }

  /**
   * Helper method to check if action was successful
   */
  wasSuccessful(): boolean {
    return this.success;
  }
}
