import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import {
    SendMessageDto,
    ScheduleMeetingDto,
    MessageResponseDto,
    MeetingResponseDto,
    CommunicationOverviewDto,
    MessageType,
    MessagePriority,
    MeetingStatus,
} from '../dto/supervisor/communication.dto';

// These would be proper entities in a real implementation
interface Message {
    id: string;
    supervisorId: string;
    studentId: string;
    subject: string;
    content: string;
    type: MessageType;
    priority: MessagePriority;
    isRead: boolean;
    milestoneId?: string;
    projectId?: string;
    sentAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

interface Meeting {
    id: string;
    supervisorId: string;
    studentId: string;
    title: string;
    description?: string;
    dateTime: Date;
    duration: number;
    location?: string;
    status: MeetingStatus;
    agenda: string[];
    isVirtual: boolean;
    meetingLink?: string;
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class SupervisorCommunicationService {
    private readonly logger = new Logger(SupervisorCommunicationService.name);

    // In-memory storage for demo purposes
    private messages: Message[] = [];
    private meetings: Meeting[] = [];

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async sendMessage(
        supervisorId: string,
        sendMessageDto: SendMessageDto,
    ): Promise<MessageResponseDto> {
        this.logger.log(`Sending message from supervisor ${supervisorId} to student ${sendMessageDto.studentId}`);

        // Verify supervisor exists
        const supervisor = await this.userRepository.findOne({
            where: { id: supervisorId, role: UserRole.SUPERVISOR },
        });

        if (!supervisor) {
            throw new NotFoundException('Supervisor not found');
        }

        // Verify student exists
        const student = await this.userRepository.findOne({
            where: { id: sendMessageDto.studentId, role: UserRole.STUDENT },
            relations: ['studentProfile'],
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // Create message
        const message: Message = {
            id: `message-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            supervisorId,
            studentId: sendMessageDto.studentId,
            subject: sendMessageDto.subject,
            content: sendMessageDto.content,
            type: sendMessageDto.type,
            priority: sendMessageDto.priority,
            isRead: false,
            milestoneId: sendMessageDto.milestoneId,
            projectId: sendMessageDto.projectId,
            sentAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.messages.push(message);

        // In a real implementation, you would:
        // 1. Save to database
        // 2. Send email notification
        // 3. Create in-app notification
        // 4. Log the communication

        return this.mapMessageToResponseDto(message, student);
    }

    async scheduleMeeting(
        supervisorId: string,
        scheduleMeetingDto: ScheduleMeetingDto,
    ): Promise<MeetingResponseDto> {
        this.logger.log(`Scheduling meeting from supervisor ${supervisorId} with student ${scheduleMeetingDto.studentId}`);

        // Verify supervisor exists
        const supervisor = await this.userRepository.findOne({
            where: { id: supervisorId, role: UserRole.SUPERVISOR },
        });

        if (!supervisor) {
            throw new NotFoundException('Supervisor not found');
        }

        // Verify student exists
        const student = await this.userRepository.findOne({
            where: { id: scheduleMeetingDto.studentId, role: UserRole.STUDENT },
            relations: ['studentProfile'],
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        // Create meeting
        const meeting: Meeting = {
            id: `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            supervisorId,
            studentId: scheduleMeetingDto.studentId,
            title: scheduleMeetingDto.title,
            description: scheduleMeetingDto.description,
            dateTime: new Date(scheduleMeetingDto.proposedDateTime),
            duration: parseInt(scheduleMeetingDto.duration),
            location: scheduleMeetingDto.location,
            status: MeetingStatus.REQUESTED,
            agenda: scheduleMeetingDto.agenda || [],
            isVirtual: scheduleMeetingDto.isVirtual || false,
            meetingLink: scheduleMeetingDto.meetingLink,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.meetings.push(meeting);

        // In a real implementation, you would:
        // 1. Save to database
        // 2. Send calendar invitation
        // 3. Create notifications
        // 4. Check for scheduling conflicts
        // 5. Integrate with calendar systems

        return this.mapMeetingToResponseDto(meeting, student);
    }

    async getMessages(
        supervisorId: string,
        studentId?: string,
        limit = 50,
        offset = 0,
    ): Promise<MessageResponseDto[]> {
        this.logger.log(`Getting messages for supervisor ${supervisorId}`);

        let filteredMessages = this.messages.filter(m => m.supervisorId === supervisorId);

        if (studentId) {
            filteredMessages = filteredMessages.filter(m => m.studentId === studentId);
        }

        const paginatedMessages = filteredMessages
            .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
            .slice(offset, offset + limit);

        // Get student info for each message
        const studentIds = [...new Set(paginatedMessages.map(m => m.studentId))];
        const students = await this.userRepository.find({
            where: { id: In(studentIds) },
            relations: ['studentProfile'],
        });

        const studentMap = new Map(students.map(s => [s.id, s]));

        return paginatedMessages.map(message => {
            const student = studentMap.get(message.studentId);
            return this.mapMessageToResponseDto(message, student);
        });
    }

    async getMeetings(
        supervisorId: string,
        studentId?: string,
        status?: MeetingStatus,
        limit = 50,
        offset = 0,
    ): Promise<MeetingResponseDto[]> {
        this.logger.log(`Getting meetings for supervisor ${supervisorId}`);

        let filteredMeetings = this.meetings.filter(m => m.supervisorId === supervisorId);

        if (studentId) {
            filteredMeetings = filteredMeetings.filter(m => m.studentId === studentId);
        }

        if (status) {
            filteredMeetings = filteredMeetings.filter(m => m.status === status);
        }

        const paginatedMeetings = filteredMeetings
            .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())
            .slice(offset, offset + limit);

        // Get student info for each meeting
        const studentIds = [...new Set(paginatedMeetings.map(m => m.studentId))];
        const students = await this.userRepository.find({
            where: { id: In(studentIds) },
            relations: ['studentProfile'],
        });

        const studentMap = new Map(students.map(s => [s.id, s]));

        return paginatedMeetings.map(meeting => {
            const student = studentMap.get(meeting.studentId);
            return this.mapMeetingToResponseDto(meeting, student);
        });
    }

    async updateMeetingStatus(
        supervisorId: string,
        meetingId: string,
        status: MeetingStatus,
    ): Promise<MeetingResponseDto> {
        this.logger.log(`Updating meeting ${meetingId} status to ${status}`);

        const meetingIndex = this.meetings.findIndex(
            m => m.id === meetingId && m.supervisorId === supervisorId
        );

        if (meetingIndex === -1) {
            throw new NotFoundException('Meeting not found');
        }

        this.meetings[meetingIndex].status = status;
        this.meetings[meetingIndex].updatedAt = new Date();

        const student = await this.userRepository.findOne({
            where: { id: this.meetings[meetingIndex].studentId },
            relations: ['studentProfile'],
        });

        return this.mapMeetingToResponseDto(this.meetings[meetingIndex], student || undefined);
    }

    async getCommunicationOverview(supervisorId: string): Promise<CommunicationOverviewDto> {
        this.logger.log(`Getting communication overview for supervisor ${supervisorId}`);

        // Get recent messages (last 10)
        const recentMessages = await this.getMessages(supervisorId, undefined, 10, 0);

        // Get upcoming meetings
        const now = new Date();
        const upcomingMeetings = await this.getMeetings(supervisorId);
        const filteredUpcomingMeetings = upcomingMeetings
            .filter(m => new Date(m.dateTime) > now && m.status !== MeetingStatus.CANCELLED)
            .slice(0, 10);

        // Get pending meetings
        const pendingMeetings = await this.getMeetings(supervisorId, undefined, MeetingStatus.REQUESTED);

        // Calculate stats
        const totalMessagesSent = this.messages.filter(m => m.supervisorId === supervisorId).length;
        const totalMeetingsScheduled = this.meetings.filter(m => m.supervisorId === supervisorId).length;

        // Find most active student
        const studentMessageCounts = new Map<string, number>();
        this.messages
            .filter(m => m.supervisorId === supervisorId)
            .forEach(m => {
                studentMessageCounts.set(m.studentId, (studentMessageCounts.get(m.studentId) || 0) + 1);
            });

        let mostActiveStudentId = '';
        let maxMessages = 0;
        studentMessageCounts.forEach((count, studentId) => {
            if (count > maxMessages) {
                maxMessages = count;
                mostActiveStudentId = studentId;
            }
        });

        let mostActiveStudentName = 'None';
        if (mostActiveStudentId) {
            const student = await this.userRepository.findOne({
                where: { id: mostActiveStudentId },
                relations: ['studentProfile'],
            });
            mostActiveStudentName = student?.studentProfile?.name || 'Unknown Student';
        }

        return {
            supervisorId,
            recentMessages,
            upcomingMeetings: filteredUpcomingMeetings,
            pendingMeetings,
            stats: {
                totalMessagesSent,
                totalMeetingsScheduled,
                averageResponseTime: '2.5 hours', // Placeholder
                mostActiveStudent: mostActiveStudentName,
            },
            lastUpdated: new Date().toISOString(),
        };
    }

    private mapMessageToResponseDto(message: Message, student?: User): MessageResponseDto {
        return {
            id: message.id,
            studentId: message.studentId,
            studentName: student?.studentProfile?.name || 'Unknown Student',
            subject: message.subject,
            content: message.content,
            type: message.type,
            priority: message.priority,
            isRead: message.isRead,
            milestoneId: message.milestoneId || null,
            projectId: message.projectId || null,
            sentAt: message.sentAt.toISOString(),
        };
    }

    private mapMeetingToResponseDto(meeting: Meeting, student?: User): MeetingResponseDto {
        return {
            id: meeting.id,
            studentId: meeting.studentId,
            studentName: student?.studentProfile?.name || 'Unknown Student',
            title: meeting.title,
            description: meeting.description || null,
            dateTime: meeting.dateTime.toISOString(),
            duration: meeting.duration,
            location: meeting.location || null,
            status: meeting.status,
            agenda: meeting.agenda,
            isVirtual: meeting.isVirtual,
            meetingLink: meeting.meetingLink || null,
            createdAt: meeting.createdAt.toISOString(),
            updatedAt: meeting.updatedAt.toISOString(),
        };
    }
}

// Import fix for In operator
import { In } from 'typeorm';