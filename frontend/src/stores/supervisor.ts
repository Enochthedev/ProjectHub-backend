import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api } from '../lib/api';

// Types
export interface AvailabilitySlot {
    id: string;
    type: 'office_hours' | 'meeting_slots' | 'unavailable';
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string | null;
    notes: string | null;
    maxCapacity: number;
    isActive: boolean;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface SupervisorAvailability {
    supervisorId: string;
    supervisorName: string;
    availabilitySlots: AvailabilitySlot[];
    totalWeeklyCapacity: number;
    utilizationRate: number;
    nextAvailableSlot: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        location: string | null;
    } | null;
    lastUpdated: string;
}

export interface AIInteractionStats {
    totalReviewed: number;
    pendingReviews: number;
    escalatedConversations: number;
    flaggedConversations: number;
    averageConfidenceScore: number;
    commonCategories: Array<{
        category: string;
        count: number;
    }>;
    reviewTrends: Array<{
        date: string;
        approved: number;
        escalated: number;
        flagged: number;
    }>;
}

export interface AIInteractionOverview {
    supervisorId: string;
    stats: AIInteractionStats;
    recentReviews: AIInteractionReview[];
    priorityReviews: AIInteractionReview[];
    lastUpdated: string;
}

export interface AIInteractionReview {
    id: string;
    conversationId: string;
    studentId: string;
    studentName: string;
    status: 'pending' | 'approved' | 'escalated' | 'flagged' | 'resolved';
    categories: string[];
    confidenceScore: number | null;
    reviewNotes: string | null;
    supervisorFeedback: string | null;
    requiresFollowUp: boolean;
    reviewedAt: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface StudentMessage {
    id: string;
    studentId: string;
    studentName: string;
    subject: string;
    content: string;
    type: 'general' | 'milestone_feedback' | 'project_guidance' | 'meeting_request' | 'urgent';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    isRead: boolean;
    milestoneId: string | null;
    projectId: string | null;
    sentAt: string;
}

export interface StudentMeeting {
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    description: string | null;
    dateTime: string;
    duration: number;
    location: string | null;
    status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
    agenda: string[];
    isVirtual: boolean;
    meetingLink: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CommunicationOverview {
    supervisorId: string;
    recentMessages: StudentMessage[];
    upcomingMeetings: StudentMeeting[];
    pendingMeetings: StudentMeeting[];
    stats: {
        totalMessagesSent: number;
        totalMeetingsScheduled: number;
        averageResponseTime: string;
        mostActiveStudent: string;
    };
    lastUpdated: string;
}

export interface SupervisorDashboard {
    supervisorId: string;
    supervisorName: string;
    totalStudents: number;
    metrics: {
        totalMilestones: number;
        completedMilestones: number;
        overdueMilestones: number;
        blockedMilestones: number;
        overallCompletionRate: number;
        averageProgressVelocity: number;
        atRiskStudentCount: number;
    };
    studentSummaries: any[];
    atRiskStudents: any[];
    recentActivity: any[];
    upcomingDeadlines: any[];
    lastUpdated: string;
}

// Store interface
interface SupervisorState {
    // Data
    dashboard: SupervisorDashboard | null;
    availability: SupervisorAvailability | null;
    aiInteractionOverview: AIInteractionOverview | null;
    communicationOverview: CommunicationOverview | null;

    // Loading states
    isLoadingDashboard: boolean;
    isLoadingAvailability: boolean;
    isLoadingAIInteractions: boolean;
    isLoadingCommunication: boolean;

    // Error states
    dashboardError: string | null;
    availabilityError: string | null;
    aiInteractionError: string | null;
    communicationError: string | null;

    // Actions
    fetchDashboard: () => Promise<void>;
    fetchAvailability: () => Promise<void>;
    fetchAIInteractionOverview: () => Promise<void>;
    fetchCommunicationOverview: () => Promise<void>;

    // Availability actions
    createAvailabilitySlot: (slot: Omit<AvailabilitySlot, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateAvailabilitySlot: (id: string, updates: Partial<AvailabilitySlot>) => Promise<void>;
    deleteAvailabilitySlot: (id: string) => Promise<void>;

    // AI Interaction actions
    approveAIInteraction: (reviewId: string) => Promise<void>;
    escalateAIInteraction: (reviewId: string, reason?: string) => Promise<void>;
    flagAIInteraction: (reviewId: string, reason?: string) => Promise<void>;

    // Communication actions
    sendMessage: (message: {
        studentId: string;
        subject: string;
        content: string;
        type: string;
        priority: string;
        milestoneId?: string;
        projectId?: string;
    }) => Promise<void>;
    scheduleMeeting: (meeting: {
        studentId: string;
        title: string;
        description?: string;
        proposedDateTime: string;
        duration: string;
        location?: string;
        agenda?: string[];
        isVirtual?: boolean;
        meetingLink?: string;
    }) => Promise<void>;
    updateMeetingStatus: (meetingId: string, status: string) => Promise<void>;

    // Utility actions
    clearErrors: () => void;
    reset: () => void;
}

// Store implementation
export const useSupervisorStore = create<SupervisorState>()(
    devtools(
        (set, get) => ({
            // Initial state
            dashboard: null,
            availability: null,
            aiInteractionOverview: null,
            communicationOverview: null,

            isLoadingDashboard: false,
            isLoadingAvailability: false,
            isLoadingAIInteractions: false,
            isLoadingCommunication: false,

            dashboardError: null,
            availabilityError: null,
            aiInteractionError: null,
            communicationError: null,

            // Dashboard actions
            fetchDashboard: async () => {
                set({ isLoadingDashboard: true, dashboardError: null });
                try {
                    const response = await api.get('/supervisor/dashboard');
                    set({ dashboard: response.data, isLoadingDashboard: false });
                } catch (error: any) {
                    set({
                        dashboardError: error.response?.data?.message || 'Failed to fetch dashboard',
                        isLoadingDashboard: false
                    });
                }
            },

            // Availability actions
            fetchAvailability: async () => {
                set({ isLoadingAvailability: true, availabilityError: null });
                try {
                    const response = await api.get('/supervisor/availability');
                    set({ availability: response.data, isLoadingAvailability: false });
                } catch (error: any) {
                    set({
                        availabilityError: error.response?.data?.message || 'Failed to fetch availability',
                        isLoadingAvailability: false
                    });
                }
            },

            createAvailabilitySlot: async (slot) => {
                try {
                    await api.post('/supervisor/availability', slot);
                    // Refresh availability data
                    await get().fetchAvailability();
                } catch (error: any) {
                    set({ availabilityError: error.response?.data?.message || 'Failed to create availability slot' });
                    throw error;
                }
            },

            updateAvailabilitySlot: async (id, updates) => {
                try {
                    await api.put(`/supervisor/availability/${id}`, updates);
                    // Refresh availability data
                    await get().fetchAvailability();
                } catch (error: any) {
                    set({ availabilityError: error.response?.data?.message || 'Failed to update availability slot' });
                    throw error;
                }
            },

            deleteAvailabilitySlot: async (id) => {
                try {
                    await api.delete(`/supervisor/availability/${id}`);
                    // Refresh availability data
                    await get().fetchAvailability();
                } catch (error: any) {
                    set({ availabilityError: error.response?.data?.message || 'Failed to delete availability slot' });
                    throw error;
                }
            },

            // AI Interaction actions
            fetchAIInteractionOverview: async () => {
                set({ isLoadingAIInteractions: true, aiInteractionError: null });
                try {
                    const response = await api.get('/supervisor/ai-interactions');
                    set({ aiInteractionOverview: response.data, isLoadingAIInteractions: false });
                } catch (error: any) {
                    set({
                        aiInteractionError: error.response?.data?.message || 'Failed to fetch AI interactions',
                        isLoadingAIInteractions: false
                    });
                }
            },

            approveAIInteraction: async (reviewId) => {
                try {
                    await api.post(`/supervisor/ai-interactions/reviews/${reviewId}/approve`);
                    // Refresh AI interaction data
                    await get().fetchAIInteractionOverview();
                } catch (error: any) {
                    set({ aiInteractionError: error.response?.data?.message || 'Failed to approve AI interaction' });
                    throw error;
                }
            },

            escalateAIInteraction: async (reviewId, reason) => {
                try {
                    await api.post(`/supervisor/ai-interactions/reviews/${reviewId}/escalate`, { reason });
                    // Refresh AI interaction data
                    await get().fetchAIInteractionOverview();
                } catch (error: any) {
                    set({ aiInteractionError: error.response?.data?.message || 'Failed to escalate AI interaction' });
                    throw error;
                }
            },

            flagAIInteraction: async (reviewId, reason) => {
                try {
                    await api.post(`/supervisor/ai-interactions/reviews/${reviewId}/flag`, { reason });
                    // Refresh AI interaction data
                    await get().fetchAIInteractionOverview();
                } catch (error: any) {
                    set({ aiInteractionError: error.response?.data?.message || 'Failed to flag AI interaction' });
                    throw error;
                }
            },

            // Communication actions
            fetchCommunicationOverview: async () => {
                set({ isLoadingCommunication: true, communicationError: null });
                try {
                    const response = await api.get('/supervisor/communication');
                    set({ communicationOverview: response.data, isLoadingCommunication: false });
                } catch (error: any) {
                    set({
                        communicationError: error.response?.data?.message || 'Failed to fetch communication overview',
                        isLoadingCommunication: false
                    });
                }
            },

            sendMessage: async (message) => {
                try {
                    await api.post('/supervisor/communication/messages', message);
                    // Refresh communication data
                    await get().fetchCommunicationOverview();
                } catch (error: any) {
                    set({ communicationError: error.response?.data?.message || 'Failed to send message' });
                    throw error;
                }
            },

            scheduleMeeting: async (meeting) => {
                try {
                    await api.post('/supervisor/communication/meetings', meeting);
                    // Refresh communication data
                    await get().fetchCommunicationOverview();
                } catch (error: any) {
                    set({ communicationError: error.response?.data?.message || 'Failed to schedule meeting' });
                    throw error;
                }
            },

            updateMeetingStatus: async (meetingId, status) => {
                try {
                    await api.put(`/supervisor/communication/meetings/${meetingId}/status`, { status });
                    // Refresh communication data
                    await get().fetchCommunicationOverview();
                } catch (error: any) {
                    set({ communicationError: error.response?.data?.message || 'Failed to update meeting status' });
                    throw error;
                }
            },

            // Utility actions
            clearErrors: () => {
                set({
                    dashboardError: null,
                    availabilityError: null,
                    aiInteractionError: null,
                    communicationError: null,
                });
            },

            reset: () => {
                set({
                    dashboard: null,
                    availability: null,
                    aiInteractionOverview: null,
                    communicationOverview: null,
                    isLoadingDashboard: false,
                    isLoadingAvailability: false,
                    isLoadingAIInteractions: false,
                    isLoadingCommunication: false,
                    dashboardError: null,
                    availabilityError: null,
                    aiInteractionError: null,
                    communicationError: null,
                });
            },
        }),
        {
            name: 'supervisor-store',
        }
    )
);