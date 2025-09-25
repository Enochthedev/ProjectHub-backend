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
import { ContentType } from '../common/enums';

@Entity('knowledge_base_entries')
export class KnowledgeBaseEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'varchar', length: 100 })
  category: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  keywords: string[];

  @Column({
    type: 'enum',
    enum: ContentType,
  })
  contentType: ContentType;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @Column({ name: 'created_by', nullable: true })
  createdById: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Full-text search vector
  @Index('knowledge_search_idx', { synchronize: false })
  @Column({
    type: 'tsvector',
    select: false,
    insert: false,
    update: false,
    nullable: true,
  })
  searchVector: string | null;

  // Helper methods for knowledge base management
  incrementUsage(): void {
    this.usageCount += 1;
  }

  updateRating(newRating: number, totalRatings: number): void {
    // Calculate new average rating
    const currentTotal = this.averageRating * (totalRatings - 1);
    this.averageRating = (currentTotal + newRating) / totalRatings;
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
  }

  addKeyword(keyword: string): void {
    if (!this.keywords.includes(keyword)) {
      this.keywords.push(keyword);
    }
  }

  removeKeyword(keyword: string): void {
    this.keywords = this.keywords.filter((k) => k !== keyword);
  }

  isGuideline(): boolean {
    return this.contentType === ContentType.GUIDELINE;
  }

  isTemplate(): boolean {
    return this.contentType === ContentType.TEMPLATE;
  }

  isExample(): boolean {
    return this.contentType === ContentType.EXAMPLE;
  }

  isFAQ(): boolean {
    return this.contentType === ContentType.FAQ;
  }

  isPolicy(): boolean {
    return this.contentType === ContentType.POLICY;
  }

  hasHighRating(): boolean {
    return this.averageRating >= 4.0;
  }

  isPopular(): boolean {
    return this.usageCount >= 10;
  }

  isMultilingual(): boolean {
    return this.language !== 'en';
  }
}
