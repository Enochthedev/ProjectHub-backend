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
import { AnnouncementType } from '../common/enums/announcement-type.enum';
import { AnnouncementStatus } from '../common/enums/announcement-status.enum';
import { TargetAudience } from '../common/enums/target-audience.enum';
import { Priority } from '../common/enums/priority.enum';

/**
 * System Announcement Entity
 *
 * Manages platform-wide announcements and communications with rich content support,
 * audience targeting, and scheduling capabilities. This entity provides:
 * - Rich text content with multimedia support
 * - Flexible audience targeting with filter capabilities
 * - Scheduling and expiration functionality
 * - Engagement tracking and analytics
 */
@Entity('system_announcements')
@Index(['isPublished', 'publishAt'])
@Index(['type', 'priority'])
@Index(['expiresAt'])
@Index(['createdAt'])
@Index(['targetAudience'])
export class SystemAnnouncement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({
    type: 'enum',
    enum: AnnouncementType,
    default: AnnouncementType.GENERAL,
  })
  type: AnnouncementType;

  @Column({
    type: 'enum',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  priority: Priority;

  @Column({
    type: 'enum',
    enum: AnnouncementStatus,
    default: AnnouncementStatus.DRAFT,
  })
  status: AnnouncementStatus;

  @Column({ type: 'text', array: true, default: '{}' })
  targetAudience: TargetAudience[];

  @Column({ type: 'jsonb', nullable: true })
  targetFilters: Record<string, any> | null;

  @Column({ type: 'boolean', default: false })
  isPublished: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: true })
  allowComments: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser?: User;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  clickCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionUrl: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actionText: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper method to check if announcement is currently active
   */
  isActive(): boolean {
    const now = new Date();

    if (!this.isPublished || this.status !== AnnouncementStatus.PUBLISHED) {
      return false;
    }

    if (this.publishAt && this.publishAt > now) {
      return false;
    }

    if (this.expiresAt && this.expiresAt <= now) {
      return false;
    }

    return true;
  }

  /**
   * Helper method to check if announcement is scheduled
   */
  isScheduled(): boolean {
    return (
      this.status === AnnouncementStatus.SCHEDULED &&
      this.publishAt !== null &&
      this.publishAt > new Date()
    );
  }

  /**
   * Helper method to check if announcement is expired
   */
  isExpired(): boolean {
    return this.expiresAt !== null && this.expiresAt <= new Date();
  }

  /**
   * Helper method to get announcement status based on current time
   */
  getCurrentStatus(): AnnouncementStatus {
    if (this.isExpired()) {
      return AnnouncementStatus.EXPIRED;
    }

    if (this.isScheduled()) {
      return AnnouncementStatus.SCHEDULED;
    }

    if (this.isActive()) {
      return AnnouncementStatus.PUBLISHED;
    }

    return this.status;
  }

  /**
   * Helper method to check if user matches target audience
   */
  matchesTargetAudience(
    userRole: string,
    userAttributes?: Record<string, any>,
  ): boolean {
    // If no target audience specified, show to all
    if (!this.targetAudience || this.targetAudience.length === 0) {
      return true;
    }

    // Check if 'all' is in target audience
    if (this.targetAudience.includes(TargetAudience.ALL)) {
      return true;
    }

    // Check role-based targeting
    const roleMapping: Record<string, TargetAudience> = {
      student: TargetAudience.STUDENTS,
      supervisor: TargetAudience.SUPERVISORS,
      admin: TargetAudience.ADMINS,
    };

    if (
      roleMapping[userRole] &&
      this.targetAudience.includes(roleMapping[userRole])
    ) {
      return true;
    }

    // Check advanced filters if provided
    if (this.targetFilters && userAttributes) {
      return this.matchesAdvancedFilters(userAttributes);
    }

    return false;
  }

  /**
   * Helper method to check advanced filter matching
   */
  private matchesAdvancedFilters(userAttributes: Record<string, any>): boolean {
    if (!this.targetFilters) {
      return true;
    }

    for (const [key, value] of Object.entries(this.targetFilters)) {
      const userValue = userAttributes[key];

      if (Array.isArray(value)) {
        if (!value.includes(userValue)) {
          return false;
        }
      } else if (value !== userValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Helper method to get engagement rate
   */
  getEngagementRate(): number {
    if (this.viewCount === 0) {
      return 0;
    }

    const totalEngagements = this.clickCount + this.shareCount;
    return Math.round((totalEngagements / this.viewCount) * 100 * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Helper method to increment view count
   */
  incrementViewCount(): void {
    this.viewCount += 1;
  }

  /**
   * Helper method to increment click count
   */
  incrementClickCount(): void {
    this.clickCount += 1;
  }

  /**
   * Helper method to increment share count
   */
  incrementShareCount(): void {
    this.shareCount += 1;
  }

  /**
   * Helper method to get priority level as number
   */
  getPriorityLevel(): number {
    const priorityLevels: Record<Priority, number> = {
      [Priority.LOW]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.HIGH]: 3,
      [Priority.CRITICAL]: 4,
    };

    return priorityLevels[this.priority] || 2;
  }

  /**
   * Helper method to check if announcement is high priority
   */
  isHighPriority(): boolean {
    return (
      this.priority === Priority.HIGH || this.priority === Priority.CRITICAL
    );
  }

  /**
   * Helper method to get time until expiration
   */
  getTimeUntilExpiration(): number | null {
    if (!this.expiresAt) {
      return null;
    }

    const now = new Date();
    return this.expiresAt.getTime() - now.getTime();
  }

  /**
   * Helper method to get days until expiration
   */
  getDaysUntilExpiration(): number | null {
    const timeUntilExpiration = this.getTimeUntilExpiration();

    if (timeUntilExpiration === null) {
      return null;
    }

    return Math.ceil(timeUntilExpiration / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper method to get announcement summary
   */
  getSummary(): string {
    return (
      this.summary ||
      this.content.substring(0, 150) + (this.content.length > 150 ? '...' : '')
    );
  }

  /**
   * Helper method to get display title with priority indicator
   */
  getDisplayTitle(): string {
    const priorityIndicators: Record<Priority, string> = {
      [Priority.LOW]: '',
      [Priority.MEDIUM]: '',
      [Priority.HIGH]: '⚠️ ',
      [Priority.CRITICAL]: '🚨 ',
    };

    return `${priorityIndicators[this.priority]}${this.title}`;
  }

  /**
   * Helper method to check if announcement can be edited
   */
  canBeEdited(): boolean {
    if (this.status === AnnouncementStatus.DRAFT) {
      return true;
    }

    if (
      this.status === AnnouncementStatus.SCHEDULED &&
      this.publishAt !== null
    ) {
      return this.publishAt > new Date();
    }

    return false;
  }

  /**
   * Helper method to publish the announcement
   */
  publish(): void {
    this.isPublished = true;
    this.status = AnnouncementStatus.PUBLISHED;

    if (!this.publishAt) {
      this.publishAt = new Date();
    }
  }

  /**
   * Helper method to archive the announcement
   */
  archive(): void {
    this.status = AnnouncementStatus.ARCHIVED;
    this.isPublished = false;
  }
}
