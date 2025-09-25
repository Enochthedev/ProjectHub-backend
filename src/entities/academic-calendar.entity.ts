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

export enum AcademicEventType {
  SEMESTER_START = 'semester_start',
  SEMESTER_END = 'semester_end',
  EXAM_PERIOD = 'exam_period',
  HOLIDAY = 'holiday',
  BREAK = 'break',
  DEADLINE = 'deadline',
  ORIENTATION = 'orientation',
  GRADUATION = 'graduation',
}

export enum AcademicSemester {
  FALL = 'fall',
  SPRING = 'spring',
  SUMMER = 'summer',
}

@Entity('academic_calendar')
@Index(['academicYear', 'semester'])
@Index(['startDate', 'endDate'])
export class AcademicCalendar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: AcademicEventType,
  })
  eventType: AcademicEventType;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date', nullable: true })
  endDate: Date | null;

  @Column({
    type: 'enum',
    enum: AcademicSemester,
  })
  semester: AcademicSemester;

  @Column({ type: 'integer' })
  academicYear: number;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'boolean', default: true })
  affectsMilestones: boolean;

  @Column({ type: 'integer', default: 3 })
  priority: number; // 1-5, higher means more important

  @Column({ type: 'varchar', length: 255, nullable: true })
  importSource: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'imported_by' })
  importedByUser: User | null;

  @Column({ name: 'imported_by', nullable: true })
  importedBy: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(date: Date = new Date()): boolean {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const start = new Date(this.startDate);
    start.setHours(0, 0, 0, 0);

    const end = this.endDate ? new Date(this.endDate) : start;
    end.setHours(23, 59, 59, 999);

    return checkDate >= start && checkDate <= end;
  }

  getDuration(): number {
    if (!this.endDate) return 1; // Single day event

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    return (
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
  }

  isHighPriority(): boolean {
    return this.priority >= 4;
  }

  isCritical(): boolean {
    return this.priority === 5;
  }

  conflictsWith(date: Date): boolean {
    if (!this.affectsMilestones) return false;

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return this.isActive(checkDate);
  }

  getConflictSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    if (this.priority === 5) return 'critical';
    if (this.priority === 4) return 'high';
    if (this.priority === 3) return 'medium';
    return 'low';
  }

  isExamPeriod(): boolean {
    return this.eventType === AcademicEventType.EXAM_PERIOD;
  }

  isHolidayOrBreak(): boolean {
    return (
      this.eventType === AcademicEventType.HOLIDAY ||
      this.eventType === AcademicEventType.BREAK
    );
  }

  isSemesterBoundary(): boolean {
    return (
      this.eventType === AcademicEventType.SEMESTER_START ||
      this.eventType === AcademicEventType.SEMESTER_END
    );
  }
}
