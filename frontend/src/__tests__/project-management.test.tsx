import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useProjectStore } from '@/stores/project';
import { useAuthStore } from '@/stores/auth';
import { CurrentProjectWidget } from '@/components/features/project/CurrentProjectWidget';
import { ProjectStatusUpdate } from '@/components/features/project/ProjectStatusUpdate';
import { ProjectCommunication } from '@/components/features/project/ProjectCommunication';

// Mock the stores
jest.mock('@/stores/project');
jest.mock('@/stores/auth');

const mockUseProjectStore = useProjectStore as jest.MockedFunction<typeof useProjectStore>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock data
const mockStudentCurrentProject = {
    id: 'proj-1',
    title: 'AI-Powered Learning Management System',
    abstract: 'Development of an intelligent learning management system.',
    specialization: 'Software Engineering',
    difficultyLevel: 'intermediate' as const,
    year: 2024,
    tags: ['AI', 'Machine Learning'],
    technologyStack: ['React', 'Node.js'],
    isGroupProject: false,
    approvalStatus: 'approved' as const,
    supervisor: {
        id: 'sup-1',
        name: 'Dr. Sarah Johnson',
        specializations: ['AI']
    },
    viewCount: 45,
    bookmarkCount: 12,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    assignedAt: '2024-01-01T00:00:00Z',
    startDate: '2024-01-01T00:00:00Z',
    expectedEndDate: '2024-06-01T00:00:00Z',
    projectStatus: 'in_progress' as const,
    overallProgress: 35,
    student: {
        id: 'student-1',
        name: 'John Smith',
        email: 'john@example.com',
        studentId: 'CS2024001'
    },
    totalMilestones: 8,
    completedMilestones: 3,
    overdueMilestones: 1,
    upcomingDeadlines: [
        {
            milestoneId: 'milestone-1',
            title: 'System Design',
            dueDate: '2024-02-01T00:00:00Z',
            priority: 'high' as const
        }
    ],
    weeklyProgress: [],
    hasUnreadUpdates: true,
    pendingApprovals: 1
};

const mockUser = {
    id: 'user-1',
    email: 'student@example.com',
    role: 'student' as const,
    isEmailVerified: true,
    isActive: true,
    profile: {
        id: 'profile-1',
        firstName: 'John',
        lastName: 'Smith',
        studentId: 'CS2024001',
        specialization: 'Software Engineering',
        year: 2024,
        interests: [],
        skills: [],
        profileUpdatedAt: '2024-01-01T00:00:00Z'
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
};

describe('Current Project Management', () => {
    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup default mock implementations
        mockUseAuthStore.mockReturnValue({
            user: mockUser,
            token: 'mock-token',
            refreshToken: 'mock-refresh-token',
            isLoading: false,
            error: null,
            isAuthenticated: true,
            login: jest.fn(),
            register: jest.fn(),
            logout: jest.fn(),
            refreshTokens: jest.fn(),
            updateProfile: jest.fn(),
            clearError: jest.fn(),
            resetPassword: jest.fn(),
            confirmResetPassword: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerificationEmail: jest.fn(),
            setLoading: jest.fn(),
            setError: jest.fn(),
            setUser: jest.fn(),
            setTokens: jest.fn()
        });

        mockUseProjectStore.mockReturnValue({
            // Basic state
            searchParams: { query: '', page: 1, limit: 12, sortBy: 'relevance', sortOrder: 'desc' },
            activeFilters: { specializations: [], difficultyLevels: [], years: [], tags: [], technologyStack: [], supervisorIds: [] },
            currentProject: null,
            relatedProjects: [],
            popularProjects: [],
            supervisorProjects: [],
            
            // Current project management state
            studentCurrentProject: mockStudentCurrentProject,
            supervisorCurrentProjects: [],
            projectAssignments: [],
            statusUpdates: [],
            communications: [],
            unreadCommunications: 0,
            progressVisualization: null,
            deadlineNotifications: [],
            
            // UI state
            isSearching: false,
            isLoadingCurrentProject: false,
            isUpdatingStatus: false,
            isSendingMessage: false,
            searchError: null,
            currentProjectError: null,

            // Mock functions
            setSearchParams: jest.fn(),
            clearSearchParams: jest.fn(),
            setActiveFilters: jest.fn(),
            clearFilters: jest.fn(),
            setCurrentProject: jest.fn(),
            setRelatedProjects: jest.fn(),
            setPopularProjects: jest.fn(),
            setSupervisorProjects: jest.fn(),
            setSearching: jest.fn(),
            setSearchError: jest.fn(),
            clearError: jest.fn(),
            getStudentCurrentProject: jest.fn(),
            getSupervisorCurrentProjects: jest.fn(),
            assignProjectToStudent: jest.fn(),
            acceptProjectAssignment: jest.fn(),
            declineProjectAssignment: jest.fn(),
            updateProjectStatus: jest.fn(),
            getStatusUpdates: jest.fn(),
            approveStatusUpdate: jest.fn(),
            rejectStatusUpdate: jest.fn(),
            sendMessage: jest.fn(),
            getCommunications: jest.fn(),
            markMessageAsRead: jest.fn(),
            sendMeetingRequest: jest.fn(),
            getProgressVisualization: jest.fn(),
            updateWeeklyProgress: jest.fn(),
            getDeadlineNotifications: jest.fn(),
            dismissNotification: jest.fn(),
            markNotificationAsRead: jest.fn(),
            clearCurrentProjectError: jest.fn(),
            refreshCurrentProjectData: jest.fn()
        });
    });

    describe('CurrentProjectWidget', () => {
        it('renders student current project correctly', () => {
            render(<CurrentProjectWidget />);
            
            expect(screen.getByText('AI-Powered Learning Management System')).toBeInTheDocument();
            expect(screen.getByText('in progress')).toBeInTheDocument();
            expect(screen.getByText('Software Engineering')).toBeInTheDocument();
            expect(screen.getByText('35%')).toBeInTheDocument();
        });

        it('shows loading state when loading', () => {
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                isLoadingCurrentProject: true
            });

            render(<CurrentProjectWidget />);
            
            expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
        });

        it('shows no project state when student has no current project', () => {
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                studentCurrentProject: null
            });

            render(<CurrentProjectWidget />);
            
            expect(screen.getByText('No Current Project')).toBeInTheDocument();
            expect(screen.getByText('Browse Projects')).toBeInTheDocument();
        });

        it('displays upcoming deadlines correctly', () => {
            render(<CurrentProjectWidget />);
            
            expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
            expect(screen.getByText('System Design')).toBeInTheDocument();
        });

        it('shows unread updates indicator', () => {
            render(<CurrentProjectWidget />);
            
            // Should show red dot for unread updates
            const unreadIndicator = screen.getByTestId('unread-indicator');
            expect(unreadIndicator).toHaveClass('bg-red-500');
        });
    });

    describe('ProjectStatusUpdate', () => {
        it('opens modal when update status button is clicked', () => {
            render(
                <ProjectStatusUpdate 
                    projectId="proj-1" 
                    currentStatus="in_progress" 
                />
            );
            
            const updateButton = screen.getByText('Update Status');
            fireEvent.click(updateButton);
            
            expect(screen.getByText('Update Project Status')).toBeInTheDocument();
        });

        it('shows current status correctly', () => {
            render(
                <ProjectStatusUpdate 
                    projectId="proj-1" 
                    currentStatus="in_progress" 
                />
            );
            
            const updateButton = screen.getByText('Update Status');
            fireEvent.click(updateButton);
            
            expect(screen.getByText('In Progress')).toBeInTheDocument();
        });

        it('allows selecting new status', () => {
            render(
                <ProjectStatusUpdate 
                    projectId="proj-1" 
                    currentStatus="in_progress" 
                />
            );
            
            const updateButton = screen.getByText('Update Status');
            fireEvent.click(updateButton);
            
            const completedButton = screen.getByText('Completed');
            fireEvent.click(completedButton);
            
            expect(completedButton).toHaveClass('border-black');
        });

        it('requires description for status update', async () => {
            const mockUpdateProjectStatus = jest.fn();
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                updateProjectStatus: mockUpdateProjectStatus
            });

            render(
                <ProjectStatusUpdate 
                    projectId="proj-1" 
                    currentStatus="in_progress" 
                />
            );
            
            const updateButton = screen.getByText('Update Status');
            fireEvent.click(updateButton);
            
            const submitButton = screen.getByText('Update Status');
            expect(submitButton).toBeDisabled();
            
            const descriptionInput = screen.getByPlaceholderText(/Describe the reason/);
            fireEvent.change(descriptionInput, { 
                target: { value: 'Project completed successfully' } 
            });
            
            expect(submitButton).not.toBeDisabled();
        });

        it('calls updateProjectStatus when form is submitted', async () => {
            const mockUpdateProjectStatus = jest.fn().mockResolvedValue(undefined);
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                updateProjectStatus: mockUpdateProjectStatus
            });

            render(
                <ProjectStatusUpdate 
                    projectId="proj-1" 
                    currentStatus="in_progress" 
                />
            );
            
            const updateButton = screen.getByText('Update Status');
            fireEvent.click(updateButton);
            
            const descriptionInput = screen.getByPlaceholderText(/Describe the reason/);
            fireEvent.change(descriptionInput, { 
                target: { value: 'Project completed successfully' } 
            });
            
            const submitButton = screen.getByText('Update Status');
            fireEvent.click(submitButton);
            
            await waitFor(() => {
                expect(mockUpdateProjectStatus).toHaveBeenCalledWith(
                    'proj-1',
                    'in_progress',
                    'Project completed successfully',
                    []
                );
            });
        });
    });

    describe('ProjectCommunication', () => {
        it('renders communication interface', () => {
            render(
                <ProjectCommunication
                    projectId="proj-1"
                    recipientId="sup-1"
                    recipientType="supervisor"
                />
            );
            
            expect(screen.getByText('Communication')).toBeInTheDocument();
            expect(screen.getByText('New Message')).toBeInTheDocument();
        });

        it('opens compose modal when new message button is clicked', () => {
            render(
                <ProjectCommunication
                    projectId="proj-1"
                    recipientId="sup-1"
                    recipientType="supervisor"
                />
            );
            
            const newMessageButton = screen.getByText('New Message');
            fireEvent.click(newMessageButton);
            
            expect(screen.getByText('New Message')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter message subject...')).toBeInTheDocument();
        });

        it('allows switching between message types', () => {
            render(
                <ProjectCommunication
                    projectId="proj-1"
                    recipientId="sup-1"
                    recipientType="supervisor"
                />
            );
            
            const newMessageButton = screen.getByText('New Message');
            fireEvent.click(newMessageButton);
            
            const meetingRequestButton = screen.getByText('Meeting Request');
            fireEvent.click(meetingRequestButton);
            
            expect(screen.getByText('Meeting Details')).toBeInTheDocument();
            expect(screen.getByText('Proposed Times')).toBeInTheDocument();
        });

        it('validates required fields before sending', () => {
            render(
                <ProjectCommunication
                    projectId="proj-1"
                    recipientId="sup-1"
                    recipientType="supervisor"
                />
            );
            
            const newMessageButton = screen.getByText('New Message');
            fireEvent.click(newMessageButton);
            
            const sendButton = screen.getByText('Send Message');
            expect(sendButton).toBeDisabled();
            
            const subjectInput = screen.getByPlaceholderText('Enter message subject...');
            fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
            
            expect(sendButton).toBeDisabled(); // Still disabled without content
            
            const contentInput = screen.getByPlaceholderText('Enter your message...');
            fireEvent.change(contentInput, { target: { value: 'Test message content' } });
            
            expect(sendButton).not.toBeDisabled();
        });

        it('calls sendMessage when form is submitted', async () => {
            const mockSendMessage = jest.fn().mockResolvedValue(undefined);
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                sendMessage: mockSendMessage
            });

            render(
                <ProjectCommunication
                    projectId="proj-1"
                    recipientId="sup-1"
                    recipientType="supervisor"
                />
            );
            
            const newMessageButton = screen.getByText('New Message');
            fireEvent.click(newMessageButton);
            
            const subjectInput = screen.getByPlaceholderText('Enter message subject...');
            fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
            
            const contentInput = screen.getByPlaceholderText('Enter your message...');
            fireEvent.change(contentInput, { target: { value: 'Test message content' } });
            
            const sendButton = screen.getByText('Send Message');
            fireEvent.click(sendButton);
            
            await waitFor(() => {
                expect(mockSendMessage).toHaveBeenCalledWith(
                    'proj-1',
                    'sup-1',
                    'Test Subject',
                    'Test message content',
                    'message'
                );
            });
        });
    });

    describe('Integration Tests', () => {
        it('loads current project data on component mount', () => {
            const mockGetStudentCurrentProject = jest.fn();
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                getStudentCurrentProject: mockGetStudentCurrentProject
            });

            render(<CurrentProjectWidget />);
            
            expect(mockGetStudentCurrentProject).toHaveBeenCalled();
        });

        it('handles error states gracefully', () => {
            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                currentProjectError: 'Failed to load project data'
            });

            render(<CurrentProjectWidget />);
            
            expect(screen.getByText('Error Loading Project')).toBeInTheDocument();
            expect(screen.getByText('Failed to load project data')).toBeInTheDocument();
        });

        it('shows different content for supervisor role', () => {
            mockUseAuthStore.mockReturnValue({
                ...mockUseAuthStore(),
                user: { ...mockUser, role: 'supervisor' }
            });

            mockUseProjectStore.mockReturnValue({
                ...mockUseProjectStore(),
                supervisorCurrentProjects: [mockStudentCurrentProject]
            });

            render(<CurrentProjectWidget />);
            
            expect(screen.getByText('Current Projects')).toBeInTheDocument();
            expect(screen.getByText('1 Active')).toBeInTheDocument();
        });
    });
});