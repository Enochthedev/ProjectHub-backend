import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ProjectBookmark } from './project-bookmark.entity';
import { ProjectView } from './project-view.entity';
import { DifficultyLevel, ApprovalStatus } from '../common/enums';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  abstract: string;

  @Column({ type: 'varchar', length: 100 })
  specialization: string;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
  })
  difficultyLevel: DifficultyLevel;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  technologyStack: string[];

  @Column({ type: 'boolean', default: false })
  isGroupProject: boolean;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  approvalStatus: ApprovalStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  githubUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  demoUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'supervisor_id' })
  supervisor: User;

  @Column({ name: 'supervisor_id' })
  supervisorId: string;

  @OneToMany(() => ProjectBookmark, (bookmark) => bookmark.project)
  bookmarks: ProjectBookmark[];

  @OneToMany(() => ProjectView, (view) => view.project)
  views: ProjectView[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;

  // Full-text search vector for PostgreSQL
  @Index('project_search_idx', { synchronize: false })
  @Column({
    type: 'tsvector',
    select: false,
    insert: false,
    update: false,
  })
  searchVector: string;
}
