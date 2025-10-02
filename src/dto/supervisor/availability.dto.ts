import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsString,
    IsOptional,
    IsInt,
    IsBoolean,
    IsDateString,
    Min,
    Max,
    Matches,
} from 'class-validator';
import { AvailabilityType, DayOfWeek } from '../../entities/supervisor-availability.entity';

export class CreateAvailabilityDto {
    @ApiProperty({
        description: 'Type of availability',
        enum: AvailabilityType,
        example: AvailabilityType.OFFICE_HOURS,
    })
    @IsEnum(AvailabilityType)
    type: AvailabilityType;

    @ApiProperty({
        description: 'Day of the week (0=Monday, 6=Sunday)',
        enum: DayOfWeek,
        example: DayOfWeek.MONDAY,
    })
    @IsEnum(DayOfWeek)
    dayOfWeek: DayOfWeek;

    @ApiProperty({
        description: 'Start time in HH:MM format',
        example: '09:00',
    })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Start time must be in HH:MM format',
    })
    startTime: string;

    @ApiProperty({
        description: 'End time in HH:MM format',
        example: '17:00',
    })
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'End time must be in HH:MM format',
    })
    endTime: string;

    @ApiProperty({
        description: 'Location for the availability slot',
        required: false,
        example: 'Office 123, Building A',
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({
        description: 'Additional notes',
        required: false,
        example: 'Available for project consultations',
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({
        description: 'Maximum capacity for this slot',
        example: 3,
        default: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    maxCapacity?: number;

    @ApiProperty({
        description: 'Effective from date',
        required: false,
        example: '2024-01-01',
    })
    @IsOptional()
    @IsDateString()
    effectiveFrom?: string;

    @ApiProperty({
        description: 'Effective until date',
        required: false,
        example: '2024-12-31',
    })
    @IsOptional()
    @IsDateString()
    effectiveUntil?: string;
}

export class UpdateAvailabilityDto {
    @ApiProperty({
        description: 'Type of availability',
        enum: AvailabilityType,
        required: false,
    })
    @IsOptional()
    @IsEnum(AvailabilityType)
    type?: AvailabilityType;

    @ApiProperty({
        description: 'Day of the week (0=Monday, 6=Sunday)',
        enum: DayOfWeek,
        required: false,
    })
    @IsOptional()
    @IsEnum(DayOfWeek)
    dayOfWeek?: DayOfWeek;

    @ApiProperty({
        description: 'Start time in HH:MM format',
        required: false,
    })
    @IsOptional()
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'Start time must be in HH:MM format',
    })
    startTime?: string;

    @ApiProperty({
        description: 'End time in HH:MM format',
        required: false,
    })
    @IsOptional()
    @IsString()
    @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
        message: 'End time must be in HH:MM format',
    })
    endTime?: string;

    @ApiProperty({
        description: 'Location for the availability slot',
        required: false,
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({
        description: 'Additional notes',
        required: false,
    })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiProperty({
        description: 'Maximum capacity for this slot',
        required: false,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    maxCapacity?: number;

    @ApiProperty({
        description: 'Whether this availability slot is active',
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: 'Effective from date',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    effectiveFrom?: string;

    @ApiProperty({
        description: 'Effective until date',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    effectiveUntil?: string;
}

export class AvailabilityResponseDto {
    @ApiProperty({
        description: 'Availability slot ID',
        example: 'availability-1',
    })
    id: string;

    @ApiProperty({
        description: 'Type of availability',
        enum: AvailabilityType,
        example: AvailabilityType.OFFICE_HOURS,
    })
    type: AvailabilityType;

    @ApiProperty({
        description: 'Day of the week',
        enum: DayOfWeek,
        example: DayOfWeek.MONDAY,
    })
    dayOfWeek: DayOfWeek;

    @ApiProperty({
        description: 'Start time',
        example: '09:00',
    })
    startTime: string;

    @ApiProperty({
        description: 'End time',
        example: '17:00',
    })
    endTime: string;

    @ApiProperty({
        description: 'Location',
        nullable: true,
        example: 'Office 123, Building A',
    })
    location: string | null;

    @ApiProperty({
        description: 'Additional notes',
        nullable: true,
        example: 'Available for project consultations',
    })
    notes: string | null;

    @ApiProperty({
        description: 'Maximum capacity',
        example: 3,
    })
    maxCapacity: number;

    @ApiProperty({
        description: 'Whether this slot is active',
        example: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Effective from date',
        nullable: true,
        example: '2024-01-01',
    })
    effectiveFrom: string | null;

    @ApiProperty({
        description: 'Effective until date',
        nullable: true,
        example: '2024-12-31',
    })
    effectiveUntil: string | null;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    createdAt: string;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    updatedAt: string;
}

export class SupervisorAvailabilityDto {
    @ApiProperty({
        description: 'Supervisor ID',
        example: 'supervisor-1',
    })
    supervisorId: string;

    @ApiProperty({
        description: 'Supervisor name',
        example: 'Dr. Jane Smith',
    })
    supervisorName: string;

    @ApiProperty({
        description: 'All availability slots',
        type: [AvailabilityResponseDto],
    })
    availabilitySlots: AvailabilityResponseDto[];

    @ApiProperty({
        description: 'Total weekly capacity',
        example: 20,
    })
    totalWeeklyCapacity: number;

    @ApiProperty({
        description: 'Current utilization percentage',
        example: 75.5,
    })
    utilizationRate: number;

    @ApiProperty({
        description: 'Next available slot',
        nullable: true,
        example: {
            dayOfWeek: 1,
            startTime: '14:00',
            endTime: '15:00',
            location: 'Office 123',
        },
    })
    nextAvailableSlot: {
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
        location: string | null;
    } | null;

    @ApiProperty({
        description: 'Last updated timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastUpdated: string;
}