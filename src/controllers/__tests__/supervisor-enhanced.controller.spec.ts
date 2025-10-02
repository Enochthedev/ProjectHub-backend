import { Test, TestingModule } from '@nestjs/testing';
import { SupervisorController } from '../supervisor.controller';
import { SupervisorReportingService } from '../../services/supervisor-reporting.service';
import { SupervisorAvailabilityService } from '../../services/supervisor-availability.service';
import { SupervisorAIInteractionService } from '../../services/supervisor-ai-interaction.service';
import { SupervisorCommunicationService } from '../../services/supervisor-communication.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AvailabilityType, DayOfWeek } from '../../entities/supervisor-availability.entity';
import { ReviewStatus, ReviewCategory } from '../../entities/ai-interaction-review.entity';
import { MessageType, MessagePriority, MeetingStatus } from '../../dto/supervisor/communication.dto';

describe('SupervisorController - Enhanced Features', () => {
    let controller: SupervisorController;
    let availabilityService: jest.Mocked<SupervisorAvailabilityService>;
    let aiInteractionService: jest.Mocked<SupervisorAIInteractionService>;
    let communicationService: jest.Mocked<SupervisorCommunicationService>;

    const mockSupervisorId = 'supervisor-1';
    const mockRequest = { user: { id: mockSupervisorId } };

    beforeEach(async () => {
        const mockAvailabilityService = {
            getSupervisorAvailability: jest.fn(),
            createAvailability: jest.fn(),
            updateAvailability: jest.fn(),
            deleteAvailability: jest.fn(),
        };

        const mockAIInteractionService = {
            getAIInteractionOverview: jest.fn(),
            getReviews: jest.fn(),
            createReview: jest.fn(),
            updateReview: jest.fn(),
            approveReview: jest.fn(),
            escalateReview: jest.fn(),
            flagReview: jest.fn(),
        };

        const mockCommunicationService = {
            getCommunicationOverview: jest.fn(),
            sendMessage: jest.fn(),
            getMessages: jest.fn(),
            scheduleMeeting: jest.fn(),
            getMeetings: jest.fn(),
            updateMeetingStatus: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SupervisorController],
            providers: [
                {
                    provide: SupervisorReportingService,
                    useValue: {},
                },
                {
                    provide: SupervisorAvailabilityService,
                    useValue: mockAvailabilityService,
                },
                {
                    provide: SupervisorAIInteractionService,
                    useValue: mockAIInteractionService,
                },
                {
                    provide: SupervisorCommunicationService,
                    useValue: mockCommunicationService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<SupervisorController>(SupervisorController);
        availabilityService = module.get(SupervisorAvailabilityService);
        aiInteractionService = module.get(SupervisorAIInteractionService);
        communicationService = module.get(SupervisorCommunicationService);
    });

    describe('Availability Management', () => {
        describe('getSupervisorAvailability', () => {
            it('should return supervisor availability', async () => {
                const mockAvailability = {
                    supervisorId: mockSupervisorId,
                    supervisorName: 'Dr. Jane Smith',
                    availabilitySlots: [
                        {
                            id: 'slot-1',
                            type: AvailabilityType.OFFICE_HOURS,
                            dayOfWeek: DayOfWeek.MONDAY,
                            startTime: '09:00',
                            endTime: '17:00',
                            location: 'Office 123',
                            notes: null,
                            maxCapacity: 3,
                            isActive: true,
                            effectiveFrom: null,
                            effectiveUntil: null,
                            createdAt: '2024-03-15T10:30:00Z',
                            updatedAt: '2024-03-15T10:30:00Z',
                        },
                    ],
                    totalWeeklyCapacity: 24,
                    utilizationRate: 75.5,
                    nextAvailableSlot: {
                        dayOfWeek: DayOfWeek.TUESDAY,
                        startTime: '14:00',
                        endTime: '15:00',
                        location: 'Office 123',
                    },
                    lastUpdated: '2024-03-15T10:30:00Z',
                };

                availabilityService.getSupervisorAvailability.mockResolvedValue(mockAvailability);

                const result = await controller.getSupervisorAvailability(mockRequest);

                expect(result).toEqual(mockAvailability);
                expect(availabilityService.getSupervisorAvailability).toHaveBeenCalledWith(mockSupervisorId);
            });
        });

        describe('createAvailability', () => {
            it('should create availability slot', async () => {
                const createDto = {
                    type: AvailabilityType.OFFICE_HOURS,
                    dayOfWeek: DayOfWeek.MONDAY,
                    startTime: '09:00',
                    endTime: '17:00',
                    location: 'Office 123',
                    maxCapacity: 3,
                };

                const mockCreatedSlot = {
                    id: 'slot-1',
                    ...createDto,
                    notes: null,
                    isActive: true,
                    effectiveFrom: null,
                    effectiveUntil: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T10:30:00Z',
                };

                availabilityService.createAvailability.mockResolvedValue(mockCreatedSlot);

                const result = await controller.createAvailability(mockRequest, createDto);

                expect(result).toEqual(mockCreatedSlot);
                expect(availabilityService.createAvailability).toHaveBeenCalledWith(mockSupervisorId, createDto);
            });
        });

        describe('updateAvailability', () => {
            it('should update availability slot', async () => {
                const availabilityId = 'slot-1';
                const updateDto = {
                    startTime: '10:00',
                    endTime: '16:00',
                    maxCapacity: 5,
                };

                const mockUpdatedSlot = {
                    id: availabilityId,
                    type: AvailabilityType.OFFICE_HOURS,
                    dayOfWeek: DayOfWeek.MONDAY,
                    startTime: '10:00',
                    endTime: '16:00',
                    location: 'Office 123',
                    notes: null,
                    maxCapacity: 5,
                    isActive: true,
                    effectiveFrom: null,
                    effectiveUntil: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T11:30:00Z',
                };

                availabilityService.updateAvailability.mockResolvedValue(mockUpdatedSlot);

                const result = await controller.updateAvailability(mockRequest, availabilityId, updateDto);

                expect(result).toEqual(mockUpdatedSlot);
                expect(availabilityService.updateAvailability).toHaveBeenCalledWith(
                    mockSupervisorId,
                    availabilityId,
                    updateDto,
                );
            });
        });

        describe('deleteAvailability', () => {
            it('should delete availability slot', async () => {
                const availabilityId = 'slot-1';

                availabilityService.deleteAvailability.mockResolvedValue(undefined);

                await controller.deleteAvailability(mockRequest, availabilityId);

                expect(availabilityService.deleteAvailability).toHaveBeenCalledWith(
                    mockSupervisorId,
                    availabilityId,
                );
            });
        });
    });

    describe('AI Interaction Monitoring', () => {
        describe('getAIInteractionOverview', () => {
            it('should return AI interaction overview', async () => {
                const mockOverview = {
                    supervisorId: mockSupervisorId,
                    stats: {
                        totalReviewed: 45,
                        pendingReviews: 8,
                        escalatedConversations: 3,
                        flaggedConversations: 2,
                        averageConfidenceScore: 0.82,
                        commonCategories: [
                            { category: ReviewCategory.ACCURACY, count: 15 },
                            { category: ReviewCategory.APPROPRIATENESS, count: 12 },
                        ],
                        reviewTrends: [
                            { date: '2024-03-01', approved: 5, escalated: 1, flagged: 0 },
                        ],
                    },
                    recentReviews: [],
                    priorityReviews: [],
                    lastUpdated: '2024-03-15T10:30:00Z',
                };

                aiInteractionService.getAIInteractionOverview.mockResolvedValue(mockOverview);

                const result = await controller.getAIInteractionOverview(mockRequest);

                expect(result).toEqual(mockOverview);
                expect(aiInteractionService.getAIInteractionOverview).toHaveBeenCalledWith(mockSupervisorId);
            });
        });

        describe('createAIInteractionReview', () => {
            it('should create AI interaction review', async () => {
                const createDto = {
                    conversationId: 'conversation-1',
                    status: ReviewStatus.PENDING,
                    categories: [ReviewCategory.ACCURACY],
                    confidenceScore: 0.85,
                    reviewNotes: 'Good response',
                };

                const mockCreatedReview = {
                    id: 'review-1',
                    conversationId: 'conversation-1',
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    status: ReviewStatus.PENDING,
                    categories: [ReviewCategory.ACCURACY],
                    confidenceScore: 0.85,
                    reviewNotes: 'Good response',
                    supervisorFeedback: null,
                    requiresFollowUp: false,
                    reviewedAt: '2024-03-15T10:30:00Z',
                    resolvedAt: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T10:30:00Z',
                };

                aiInteractionService.createReview.mockResolvedValue(mockCreatedReview);

                const result = await controller.createAIInteractionReview(mockRequest, createDto);

                expect(result).toEqual(mockCreatedReview);
                expect(aiInteractionService.createReview).toHaveBeenCalledWith(mockSupervisorId, createDto);
            });
        });

        describe('approveAIInteraction', () => {
            it('should approve AI interaction', async () => {
                const reviewId = 'review-1';
                const mockApprovedReview = {
                    id: reviewId,
                    conversationId: 'conversation-1',
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    status: ReviewStatus.APPROVED,
                    categories: [ReviewCategory.ACCURACY],
                    confidenceScore: 0.85,
                    reviewNotes: 'Good response',
                    supervisorFeedback: null,
                    requiresFollowUp: false,
                    reviewedAt: '2024-03-15T10:30:00Z',
                    resolvedAt: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T10:30:00Z',
                };

                aiInteractionService.approveReview.mockResolvedValue(mockApprovedReview);

                const result = await controller.approveAIInteraction(mockRequest, reviewId);

                expect(result).toEqual(mockApprovedReview);
                expect(aiInteractionService.approveReview).toHaveBeenCalledWith(mockSupervisorId, reviewId);
            });
        });

        describe('escalateAIInteraction', () => {
            it('should escalate AI interaction', async () => {
                const reviewId = 'review-1';
                const reason = 'Needs human review';
                const mockEscalatedReview = {
                    id: reviewId,
                    conversationId: 'conversation-1',
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    status: ReviewStatus.ESCALATED,
                    categories: [ReviewCategory.ACCURACY],
                    confidenceScore: 0.85,
                    reviewNotes: 'Good response',
                    supervisorFeedback: reason,
                    requiresFollowUp: true,
                    reviewedAt: '2024-03-15T10:30:00Z',
                    resolvedAt: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T10:30:00Z',
                };

                aiInteractionService.escalateReview.mockResolvedValue(mockEscalatedReview);

                const result = await controller.escalateAIInteraction(mockRequest, reviewId, reason);

                expect(result).toEqual(mockEscalatedReview);
                expect(aiInteractionService.escalateReview).toHaveBeenCalledWith(
                    mockSupervisorId,
                    reviewId,
                    reason,
                );
            });
        });
    });

    describe('Student Communication', () => {
        describe('getCommunicationOverview', () => {
            it('should return communication overview', async () => {
                const mockOverview = {
                    supervisorId: mockSupervisorId,
                    recentMessages: [],
                    upcomingMeetings: [],
                    pendingMeetings: [],
                    stats: {
                        totalMessagesSent: 45,
                        totalMeetingsScheduled: 12,
                        averageResponseTime: '2.5 hours',
                        mostActiveStudent: 'John Doe',
                    },
                    lastUpdated: '2024-03-15T10:30:00Z',
                };

                communicationService.getCommunicationOverview.mockResolvedValue(mockOverview);

                const result = await controller.getCommunicationOverview(mockRequest);

                expect(result).toEqual(mockOverview);
                expect(communicationService.getCommunicationOverview).toHaveBeenCalledWith(mockSupervisorId);
            });
        });

        describe('sendMessage', () => {
            it('should send message to student', async () => {
                const sendMessageDto = {
                    studentId: 'student-1',
                    subject: 'Milestone Review',
                    content: 'Your milestone looks good',
                    type: MessageType.MILESTONE_FEEDBACK,
                    priority: MessagePriority.NORMAL,
                };

                const mockSentMessage = {
                    id: 'message-1',
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    subject: 'Milestone Review',
                    content: 'Your milestone looks good',
                    type: MessageType.MILESTONE_FEEDBACK,
                    priority: MessagePriority.NORMAL,
                    isRead: false,
                    milestoneId: null,
                    projectId: null,
                    sentAt: '2024-03-15T10:30:00Z',
                };

                communicationService.sendMessage.mockResolvedValue(mockSentMessage);

                const result = await controller.sendMessage(mockRequest, sendMessageDto);

                expect(result).toEqual(mockSentMessage);
                expect(communicationService.sendMessage).toHaveBeenCalledWith(mockSupervisorId, sendMessageDto);
            });
        });

        describe('scheduleMeeting', () => {
            it('should schedule meeting with student', async () => {
                const scheduleMeetingDto = {
                    studentId: 'student-1',
                    title: 'Project Review',
                    description: 'Discuss project progress',
                    proposedDateTime: '2024-03-20T14:00:00Z',
                    duration: '60',
                    location: 'Office 123',
                    agenda: ['Review progress', 'Discuss next steps'],
                };

                const mockScheduledMeeting = {
                    id: 'meeting-1',
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    title: 'Project Review',
                    description: 'Discuss project progress',
                    dateTime: '2024-03-20T14:00:00Z',
                    duration: 60,
                    location: 'Office 123',
                    status: MeetingStatus.REQUESTED,
                    agenda: ['Review progress', 'Discuss next steps'],
                    isVirtual: false,
                    meetingLink: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T10:30:00Z',
                };

                communicationService.scheduleMeeting.mockResolvedValue(mockScheduledMeeting);

                const result = await controller.scheduleMeeting(mockRequest, scheduleMeetingDto);

                expect(result).toEqual(mockScheduledMeeting);
                expect(communicationService.scheduleMeeting).toHaveBeenCalledWith(
                    mockSupervisorId,
                    scheduleMeetingDto,
                );
            });
        });

        describe('updateMeetingStatus', () => {
            it('should update meeting status', async () => {
                const meetingId = 'meeting-1';
                const status = MeetingStatus.CONFIRMED;

                const mockUpdatedMeeting = {
                    id: meetingId,
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    title: 'Project Review',
                    description: 'Discuss project progress',
                    dateTime: '2024-03-20T14:00:00Z',
                    duration: 60,
                    location: 'Office 123',
                    status: MeetingStatus.CONFIRMED,
                    agenda: ['Review progress', 'Discuss next steps'],
                    isVirtual: false,
                    meetingLink: null,
                    createdAt: '2024-03-15T10:30:00Z',
                    updatedAt: '2024-03-15T11:30:00Z',
                };

                communicationService.updateMeetingStatus.mockResolvedValue(mockUpdatedMeeting);

                const result = await controller.updateMeetingStatus(mockRequest, meetingId, status);

                expect(result).toEqual(mockUpdatedMeeting);
                expect(communicationService.updateMeetingStatus).toHaveBeenCalledWith(
                    mockSupervisorId,
                    meetingId,
                    status,
                );
            });
        });
    });
});