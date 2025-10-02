import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

export enum AvailabilityType {
    OFFICE_HOURS = 'office_hours',
    MEETING_SLOTS = 'meeting_slots',
    UNAVAILABLE = 'unavailable',
}

export enum DayOfWeek {
    MONDAY = 0,
    TUESDAY = 1,
    WEDNESDAY = 2,
    THURSDAY = 3,
    FRIDAY = 4,
    SATURDAY = 5,
    SUNDAY = 6,
}

@Entity('supervisor_availability')
@Index(['supervisorId', 'dayOfWeek', 'startTime'])
export class SupervisorAvailability {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    supervisorId: string;

    @Column({
        type: 'enum',
        enum: AvailabilityType,
        default: AvailabilityType.OFFICE_HOURS,
    })
    type: AvailabilityType;

    @Column({
        type: 'enum',
        enum: DayOfWeek,
    })
    dayOfWeek: DayOfWeek;

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    location: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'int', default: 1 })
    maxCapacity: number;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @Column({ type: 'date', nullable: true })
    effectiveFrom: Date;

    @Column({ type: 'date', nullable: true })
    effectiveUntil: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'supervisorId' })
    supervisor: User;
}