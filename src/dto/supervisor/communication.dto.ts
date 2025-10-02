import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsDateString,
    IsEnum,
    IsArray,
    IsBoolean,
} from 'class-validator';

export enum MessageType {
    GENERAL = 'general',
    MILESTONE_FEEDBACK = 'milestone_feedback',
    PROJECT_GUIDANCE = 'project_guidance',
    MEETING_REQUEST = 'meeting_request',
    URGENT = 'urgent',
}

export enum MessagePriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum MeetingStatus {
    REQUESTED = 'requested',
    CONFIRMED = 'confirmed',
    CANCELLED = 'cancelled',
    COMPLETED = 'completed',
}

export class SendMessageDto {
    @ApiProperty({
        description: 'Student ID to send message to',
        example: 'student-1',
    })
    @IsString()
    studentId: string;

    @ApiProperty({
        description: 'Message subject',
        example: 'Milestone Review Feedback',
    })
    @IsString()
    subject: string;

    @ApiProperty({
        description: 'Message content',
        example: 'Your latest milestone submission looks good. Please address the following points...',
    })
    @IsString()
    content: string;

    @ApiProperty({
        description: 'Message type',
        enum: MessageType,
        example: MessageType.MILESTONE_FEEDBACK,
    })
    @IsEnum(MessageType)
    type: MessageType;

    @ApiProperty({
        description: 'Message priority',
        enum: MessagePriority,
        example: MessagePriority.NORMAL,
    })
    @IsEnum(MessagePriority)
    priority: MessagePriority;

    @ApiProperty({
        description: 'Related milestone ID',
        required: false,
        example: 'milestone-1',
    })
    @IsOptional()
    @IsString()
    milestoneId?: string;

    @ApiProperty({
        description: 'Related project ID',
        required: false,
        example: 'project-1',
    })
    @IsOptional()
    @IsString()
    projectId?: string;
}

export class ScheduleMeetingDto {
    @ApiProperty({
        description: 'Student ID to schedule meeting with',
        example: 'student-1',
    })
    @IsString()
    studentId: string;

    @ApiProperty({
        description: 'Meeting title',
        example: 'Project Progress Review',
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Meeting description',
        required: false,
        example: 'Discuss current progress and next steps',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Proposed meeting date and time',
        example: '2024-03-20T14:00:00Z',
    })
    @IsDateString()
    proposedDateTime: string;

    @ApiProperty({
        description: 'Meeting duration in minutes',
        example: 60,
    })
    @IsString()
    duration: string;

    @ApiProperty({
        description: 'Meeting location',
        required: false,
        example: 'Office 123, Building A',
    })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiProperty({
        description: 'Meeting agenda items',
        required: false,
        example: ['Review milestone progress', 'Discuss challenges', 'Plan next steps'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    agenda?: string[];

    @ApiProperty({
        description: 'Whether this is a virtual meeting',
        required: false,
        example: false,
    })
    @IsOptional()
    @IsBoolean()
    isVirtual?: boolean;

    @ApiProperty({
        description: 'Virtual meeting link',
        required: false,
        example: 'https://zoom.us/j/123456789',
    })
    @IsOptional()
    @IsString()
    meetingLink?: string;
}

export class MessageResponseDto {
    @ApiProperty({
        description: 'Message ID',
        example: 'message-1',
    })
    id: string;

    @ApiProperty({
        description: 'Student ID',
        example: 'student-1',
    })
    studentId: string;

    @ApiProperty({
        description: 'Student name',
        example: 'John Doe',
    })
    studentName: string;

    @ApiProperty({
        description: 'Message subject',
        example: 'Milestone Review Feedback',
    })
    subject: string;

    @ApiProperty({
        description: 'Message content',
        example: 'Your latest milestone submission looks good...',
    })
    content: string;

    @ApiProperty({
        description: 'Message type',
        enum: MessageType,
        example: MessageType.MILESTONE_FEEDBACK,
    })
    type: MessageType;

    @ApiProperty({
        description: 'Message priority',
        enum: MessagePriority,
        example: MessagePriority.NORMAL,
    })
    priority: MessagePriority;

    @ApiProperty({
        description: 'Whether message has been read',
        example: false,
    })
    isRead: boolean;

    @ApiProperty({
        description: 'Related milestone ID',
        nullable: true,
        example: 'milestone-1',
    })
    milestoneId: string | null;

    @ApiProperty({
        description: 'Related project ID',
        nullable: true,
        example: 'project-1',
    })
    projectId: string | null;

    @ApiProperty({
        description: 'Sent timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    sentAt: string;
}

export class MeetingResponseDto {
    @ApiProperty({
        description: 'Meeting ID',
        example: 'meeting-1',
    })
    id: string;

    @ApiProperty({
        description: 'Student ID',
        example: 'student-1',
    })
    studentId: string;

    @ApiProperty({
        description: 'Student name',
        example: 'John Doe',
    })
    studentName: string;

    @ApiProperty({
        description: 'Meeting title',
        example: 'Project Progress Review',
    })
    title: string;

    @ApiProperty({
        description: 'Meeting description',
        nullable: true,
        example: 'Discuss current progress and next steps',
    })
    description: string | null;

    @ApiProperty({
        description: 'Meeting date and time',
        example: '2024-03-20T14:00:00Z',
    })
    dateTime: string;

    @ApiProperty({
        description: 'Meeting duration in minutes',
        example: 60,
    })
    duration: number;

    @ApiProperty({
        description: 'Meeting location',
        nullable: true,
        example: 'Office 123, Building A',
    })
    location: string | null;

    @ApiProperty({
        description: 'Meeting status',
        enum: MeetingStatus,
        example: MeetingStatus.REQUESTED,
    })
    status: MeetingStatus;

    @ApiProperty({
        description: 'Meeting agenda items',
        example: ['Review milestone progress', 'Discuss challenges'],
    })
    agenda: string[];

    @ApiProperty({
        description: 'Whether this is a virtual meeting',
        example: false,
    })
    isVirtual: boolean;

    @ApiProperty({
        description: 'Virtual meeting link',
        nullable: true,
        example: 'https://zoom.us/j/123456789',
    })
    meetingLink: string | null;

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

export class CommunicationOverviewDto {
    @ApiProperty({
        description: 'Supervisor ID',
        example: 'supervisor-1',
    })
    supervisorId: string;

    @ApiProperty({
        description: 'Recent messages sent',
        type: [MessageResponseDto],
    })
    recentMessages: MessageResponseDto[];

    @ApiProperty({
        description: 'Upcoming meetings',
        type: [MeetingResponseDto],
    })
    upcomingMeetings: MeetingResponseDto[];

    @ApiProperty({
        description: 'Pending meeting requests',
        type: [MeetingResponseDto],
    })
    pendingMeetings: MeetingResponseDto[];

    @ApiProperty({
        description: 'Communication statistics',
        example: {
            totalMessagesSent: 45,
            totalMeetingsScheduled: 12,
            averageResponseTime: '2.5 hours',
            mostActiveStudent: 'John Doe',
        },
    })
    stats: {
        totalMessagesSent: number;
        totalMeetingsScheduled: number;
        averageResponseTime: string;
        mostActiveStudent: string;
    };

    @ApiProperty({
        description: 'Last updated timestamp',
        example: '2024-03-15T10:30:00Z',
    })
    lastUpdated: string;
}