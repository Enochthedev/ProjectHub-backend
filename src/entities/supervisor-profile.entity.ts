import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('supervisor_profiles')
export class SupervisorProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', array: true })
  specializations: string[];

  @Column({ default: 5, type: 'int' })
  maxStudents: number;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  officeLocation: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @OneToOne(() => User, (user) => user.supervisorProfile)
  @JoinColumn()
  user: User;
}
