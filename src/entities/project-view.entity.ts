import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Project } from './project.entity';

@Entity('project_views')
export class ProjectView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project, (project) => project.views, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  @Index()
  projectId: string;

  @Column({ type: 'uuid', nullable: true })
  viewerId: string | null;

  @Column({ type: 'inet' })
  ipAddress: string;

  @Column({ type: 'text' })
  userAgent: string;

  @CreateDateColumn()
  @Index()
  viewedAt: Date;
}
