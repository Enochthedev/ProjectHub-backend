import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { KnowledgeBaseEntry } from './knowledge-base-entry.entity';
import { ContentType } from '../common/enums';

export enum ContentVersion {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('knowledge_base_versions')
@Index(['entryId', 'versionNumber'])
@Index(['status', 'createdAt'])
export class KnowledgeBaseVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => KnowledgeBaseEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: KnowledgeBaseEntry;

  @Column({ name: 'entry_id' })
  entryId: string;

  @Column({ type: 'int' })
  versionNumber: number;

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

  @Column({
    type: 'enum',
    enum: ContentVersion,
    default: ContentVersion.DRAFT,
  })
  status: ContentVersion;

  @Column({ type: 'text', nullable: true })
  changes: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  source: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  relatedEntries: string[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by' })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  // Helper methods
  isDraft(): boolean {
    return this.status === ContentVersion.DRAFT;
  }

  isPublished(): boolean {
    return this.status === ContentVersion.PUBLISHED;
  }

  isArchived(): boolean {
    return this.status === ContentVersion.ARCHIVED;
  }

  publish(): void {
    this.status = ContentVersion.PUBLISHED;
  }

  archive(): void {
    this.status = ContentVersion.ARCHIVED;
  }

  toDraft(): void {
    this.status = ContentVersion.DRAFT;
  }

  hasChanges(): boolean {
    return this.changes !== null && this.changes.length > 0;
  }

  getChangesSummary(): string {
    return this.changes || 'No changes recorded';
  }

  toEntryData(): Partial<KnowledgeBaseEntry> {
    return {
      title: this.title,
      content: this.content,
      category: this.category,
      tags: this.tags,
      keywords: this.keywords,
      contentType: this.contentType,
      language: this.language,
    };
  }

  static createFromEntry(
    entry: KnowledgeBaseEntry,
    versionNumber: number,
    changes: string,
    createdById: string,
  ): Partial<KnowledgeBaseVersion> {
    return {
      entryId: entry.id,
      versionNumber,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags,
      keywords: entry.keywords,
      contentType: entry.contentType,
      language: entry.language,
      status: ContentVersion.DRAFT,
      changes,
      createdById,
    };
  }
}
