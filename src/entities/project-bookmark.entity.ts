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
import { Project } from './project.entity';
import { BookmarkCategory } from './bookmark-category.entity';

@Entity('project_bookmarks')
@Index(['studentId', 'projectId'], { unique: true })
export class ProjectBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Project, (project) => project.bookmarks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column({ name: 'project_id' })
  projectId: string;

  @ManyToOne(() => BookmarkCategory, (category) => category.bookmarks, {
    nullable: true,
  })
  @JoinColumn({ name: 'category_id' })
  category: BookmarkCategory | null;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
