import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
} from 'typeorm';
import { UserRole } from '../common/enums/user-role.enum';
import { StudentProfile } from './student-profile.entity';
import { SupervisorProfile } from './supervisor-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string; // bcrypt hashed

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  emailVerificationToken: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  passwordResetToken: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  passwordResetExpires: Date | null;

  @OneToOne(() => StudentProfile, (profile) => profile.user, { cascade: true })
  studentProfile?: StudentProfile;

  @OneToOne(() => SupervisorProfile, (profile) => profile.user, {
    cascade: true,
  })
  supervisorProfile?: SupervisorProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
