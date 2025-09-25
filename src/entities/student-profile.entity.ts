import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('student_profiles')
export class StudentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'jsonb', default: '[]' })
  skills: string[];

  @Column({ type: 'jsonb', default: '[]' })
  interests: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  preferredSpecializations: string[];

  @Column({ nullable: true, type: 'int' })
  currentYear: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 3, scale: 2 })
  gpa: number | null;

  @Column({ nullable: true, type: 'uuid' })
  supervisorId: string | null;

  @OneToOne(() => User, (user) => user.studentProfile)
  @JoinColumn()
  user: User;

  @UpdateDateColumn()
  profileUpdatedAt: Date;
}
