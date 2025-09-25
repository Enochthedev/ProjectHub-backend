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
import { ProjectType } from '../common/enums';
import {
  TemplateMilestone,
  TemplateConfiguration,
} from './interfaces/template-milestone.interface';

@Entity('milestone_templates')
@Index(['specialization', 'projectType', 'isActive'])
export class MilestoneTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  specialization: string;

  @Column({
    type: 'enum',
    enum: ProjectType,
  })
  projectType: ProjectType;

  @Column({ type: 'jsonb' })
  milestoneItems: TemplateMilestone[];

  @Column({ type: 'jsonb', nullable: true })
  configuration: TemplateConfiguration | null;

  @Column({ type: 'integer' })
  estimatedDurationWeeks: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  averageRating: number;

  @Column({ type: 'integer', default: 0 })
  ratingCount: number;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isArchived(): boolean {
    return this.archivedAt !== null;
  }

  getTotalEstimatedHours(): number {
    return this.milestoneItems.reduce(
      (total, item) => total + item.estimatedHours,
      0,
    );
  }

  getMilestoneCount(): number {
    return this.milestoneItems.length;
  }

  getRequiredMilestones(): TemplateMilestone[] {
    if (!this.configuration?.requiredMilestones) {
      return this.milestoneItems;
    }

    return this.milestoneItems.filter((item) =>
      this.configuration!.requiredMilestones.includes(item.title),
    );
  }

  getOptionalMilestones(): TemplateMilestone[] {
    if (!this.configuration?.optionalMilestones) {
      return [];
    }

    return this.milestoneItems.filter((item) =>
      this.configuration!.optionalMilestones.includes(item.title),
    );
  }

  validateMilestoneItems(): string[] {
    const errors: string[] = [];
    const titles = new Set<string>();

    for (const item of this.milestoneItems) {
      // Check for duplicate titles
      if (titles.has(item.title)) {
        errors.push(`Duplicate milestone title: ${item.title}`);
      }
      titles.add(item.title);

      // Validate days from start
      if (item.daysFromStart < 0) {
        errors.push(`Invalid daysFromStart for ${item.title}: must be >= 0`);
      }

      // Validate estimated hours
      if (item.estimatedHours <= 0) {
        errors.push(`Invalid estimatedHours for ${item.title}: must be > 0`);
      }

      // Validate dependencies
      if (item.dependencies) {
        for (const dep of item.dependencies) {
          if (!titles.has(dep) && dep !== item.title) {
            // Note: This validation assumes dependencies are defined after their targets
            // A more sophisticated validation would require topological sorting
          }
        }
      }
    }

    return errors;
  }

  incrementUsage(): void {
    this.usageCount += 1;
  }

  updateRating(newRating: number): void {
    const totalRating = this.averageRating * this.ratingCount + newRating;
    this.ratingCount += 1;
    this.averageRating = Number((totalRating / this.ratingCount).toFixed(2));
  }

  archive(): void {
    this.isActive = false;
    this.archivedAt = new Date();
  }

  restore(): void {
    this.isActive = true;
    this.archivedAt = null;
  }

  static createDefaultConfiguration(): TemplateConfiguration {
    return {
      allowCustomization: true,
      minimumDurationWeeks: 4,
      maximumDurationWeeks: 52,
      requiredMilestones: [],
      optionalMilestones: [],
    };
  }
}
