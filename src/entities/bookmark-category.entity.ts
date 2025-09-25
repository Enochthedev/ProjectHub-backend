import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ProjectBookmark } from './project-bookmark.entity';

@Entity('bookmark_categories')
export class BookmarkCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null; // Hex color code

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id' })
  studentId: string;

  @OneToMany(() => ProjectBookmark, (bookmark) => bookmark.category)
  bookmarks: ProjectBookmark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
