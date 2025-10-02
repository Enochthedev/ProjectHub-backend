import { supervisorApi } from '../supervisor-api';
import { api } from '../api';
import { SupervisorDashboardData, ProgressReportFilters } from '@/types/supervisor';

// Mock the api module
jest.mock('../api', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn(),
    },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('supervisorApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getDashboard', () => {
        it('should fetch supervisor dashboard data', async () => {
            const mockDashboardData: SupervisorDashboardData = {
                supervisorId: 'supervisor-1',
                supervisorName: 'Dr. Smith',
                totalStudents: 5,
                metrics: {
                    totalMilestones: 50,
                    completedMilestones: 35,
                    overdueMilestones: 5,
                    blockedMilestones: 2,
                    overallCompletionRate: 70,
                    averageProgressVelocity: 2.5,
                    atRiskStudentCount: 2
                },
                studentSummaries: [],
                atRiskStudents: [],
                recentActivity: [],
                upcomingDeadlines: [],
                lastUpdated: '2024-03-15T10:30:00Z'
            };

            mockApi.get.mockResolvedValue(mockDashboardData);

            const result = await supervisorApi.getDashboard();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/dashboard');
            expect(result).toEqual(mockDashboardData);
        });

        it('should handle dashboard fetch error with fallback data', async () => {
            const error = new Error('Failed to fetch dashboard');
            mockApi.get.mockRejectedValue(error);

            const result = await supervisorApi.getDashboard();

            // Should return fallback data instead of throwing
            expect(result).toBeDefined();
            expect(result.supervisorId).toBe('supervisor-1');
            expect(result.supervisorName).toBe('Dr. Sarah Johnson');
        });
    });

    describe('getStudentProgress', () => {
        it('should fetch student progress data', async () => {
            const mockStudentProgress = [
                {
                    studentId: '1',
                    studentName: 'John Doe',
                    studentEmail: 'john@example.com',
                    totalMilestones: 10,
                    completedMilestones: 8,
                    inProgressMilestones: 1,
                    overdueMilestones: 1,
                    blockedMilestones: 0,
                    completionRate: 80,
                    riskScore: 0.3,
                    nextMilestone: null,
                    lastActivity: '2024-03-15T10:30:00Z',
                    projectCount: 1
                }
            ];

            mockApi.get.mockResolvedValue(mockStudentProgress);

            const result = await supervisorApi.getStudentProgress();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/students/progress');
            expect(result).toEqual(mockStudentProgress);
        });
    });

    describe('getStudentOverview', () => {
        it('should fetch student milestone overview', async () => {
            const studentId = 'student-1';
            const mockOverview = {
                studentId,
                studentName: 'John Doe',
                studentEmail: 'john@example.com',
                milestones: [],
                analytics: {
                    completionRate: 80,
                    averageTimePerMilestone: 5,
                    productivityScore: 0.8,
                    riskScore: 0.3
                },
                progressSummary: {
                    studentId,
                    studentName: 'John Doe',
                    studentEmail: 'john@example.com',
                    totalMilestones: 10,
                    completedMilestones: 8,
                    inProgressMilestones: 1,
                    overdueMilestones: 1,
                    blockedMilestones: 0,
                    completionRate: 80,
                    riskScore: 0.3,
                    nextMilestone: null,
                    lastActivity: '2024-03-15T10:30:00Z',
                    projectCount: 1
                },
                lastUpdated: '2024-03-15T10:30:00Z'
            };

            mockApi.get.mockResolvedValue(mockOverview);

            const result = await supervisorApi.getStudentOverview(studentId);

            expect(mockApi.get).toHaveBeenCalledWith(`/supervisor/students/${studentId}/overview`);
            expect(result).toEqual(mockOverview);
        });
    });

    describe('generateReport', () => {
        it('should generate report with filters', async () => {
            const filters: ProgressReportFilters = {
                studentIds: ['student-1', 'student-2'],
                startDate: '2024-01-01',
                endDate: '2024-12-31',
                status: 'completed',
                priority: 'high'
            };

            const mockReport = {
                reportId: 'report-1',
                supervisorId: 'supervisor-1',
                generatedAt: '2024-03-15T10:30:00Z',
                reportPeriod: {
                    startDate: '2024-01-01',
                    endDate: '2024-12-31'
                },
                filters,
                metrics: {
                    totalMilestones: 20,
                    completedMilestones: 15,
                    overdueMilestones: 2,
                    blockedMilestones: 1,
                    overallCompletionRate: 75,
                    averageProgressVelocity: 2.0,
                    atRiskStudentCount: 1
                },
                studentData: [],
                summary: {
                    totalStudents: 2,
                    totalMilestones: 20,
                    completionRate: 75,
                    atRiskStudents: 1
                }
            };

            mockApi.get.mockResolvedValue(mockReport);

            const result = await supervisorApi.generateReport(filters);

            expect(mockApi.get).toHaveBeenCalledWith(
                '/supervisor/reports?studentIds=student-1&studentIds=student-2&startDate=2024-01-01&endDate=2024-12-31&status=completed&priority=high'
            );
            expect(result).toEqual(mockReport);
        });

        it('should generate report without filters', async () => {
            const filters: ProgressReportFilters = {};
            const mockReport = {
                reportId: 'report-1',
                supervisorId: 'supervisor-1',
                generatedAt: '2024-03-15T10:30:00Z',
                reportPeriod: { startDate: null, endDate: null },
                filters,
                metrics: {
                    totalMilestones: 20,
                    completedMilestones: 15,
                    overdueMilestones: 2,
                    blockedMilestones: 1,
                    overallCompletionRate: 75,
                    averageProgressVelocity: 2.0,
                    atRiskStudentCount: 1
                },
                studentData: [],
                summary: {
                    totalStudents: 2,
                    totalMilestones: 20,
                    completionRate: 75,
                    atRiskStudents: 1
                }
            };

            mockApi.get.mockResolvedValue(mockReport);

            const result = await supervisorApi.generateReport(filters);

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/reports?');
            expect(result).toEqual(mockReport);
        });
    });

    describe('exportReport', () => {
        it('should export report as PDF', async () => {
            const format = 'pdf';
            const filters: ProgressReportFilters = {
                studentIds: ['student-1']
            };

            const mockExportedReport = {
                reportId: 'report-1',
                format: 'pdf' as const,
                filename: 'supervisor-report.pdf',
                content: 'base64-encoded-content',
                mimeType: 'application/pdf',
                size: 2048,
                generatedAt: '2024-03-15T10:30:00Z'
            };

            mockApi.get.mockResolvedValue(mockExportedReport);

            const result = await supervisorApi.exportReport(format, filters);

            expect(mockApi.get).toHaveBeenCalledWith(
                '/supervisor/reports/export?format=pdf&studentIds=student-1'
            );
            expect(result).toEqual(mockExportedReport);
        });

        it('should export report as CSV', async () => {
            const format = 'csv';
            const filters: ProgressReportFilters = {};

            const mockExportedReport = {
                reportId: 'report-1',
                format: 'csv' as const,
                filename: 'supervisor-report.csv',
                content: 'csv-content',
                mimeType: 'text/csv',
                size: 1024,
                generatedAt: '2024-03-15T10:30:00Z'
            };

            mockApi.get.mockResolvedValue(mockExportedReport);

            const result = await supervisorApi.exportReport(format, filters);

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/reports/export?format=csv');
            expect(result).toEqual(mockExportedReport);
        });
    });

    describe('getAnalytics', () => {
        it('should fetch supervisor analytics', async () => {
            const mockAnalytics = {
                supervisorId: 'supervisor-1',
                totalStudents: 5,
                overallMetrics: {
                    totalMilestones: 50,
                    completedMilestones: 35,
                    overdueMilestones: 5,
                    blockedMilestones: 2,
                    overallCompletionRate: 70,
                    averageProgressVelocity: 2.5,
                    atRiskStudentCount: 2
                },
                studentPerformance: {
                    topPerformers: [],
                    strugglingStudents: [],
                    averageCompletionRate: 70,
                    performanceDistribution: {
                        excellent: 1,
                        good: 2,
                        average: 1,
                        poor: 1
                    }
                },
                trendAnalysis: {
                    completionTrend: 'improving' as const,
                    velocityTrend: 'stable' as const,
                    riskTrend: 'decreasing' as const,
                    monthlyProgress: []
                },
                benchmarks: {
                    departmentAverage: 65,
                    universityAverage: 60,
                    performanceRanking: 'above_average' as const
                },
                insights: ['Students are performing well'],
                generatedAt: '2024-03-15T10:30:00Z'
            };

            mockApi.get.mockResolvedValue(mockAnalytics);

            const result = await supervisorApi.getAnalytics();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/analytics');
            expect(result).toEqual(mockAnalytics);
        });
    });

    describe('AI Interaction Management', () => {
        it('should fetch AI interactions', async () => {
            const mockInteractions = [
                {
                    id: 'interaction-1',
                    studentId: 'student-1',
                    studentName: 'John Doe',
                    conversationId: 'conv-1',
                    topic: 'Machine Learning',
                    timestamp: '2024-03-15T10:30:00Z',
                    messageCount: 5,
                    requiresReview: false,
                    confidenceScore: 0.9,
                    category: 'technical',
                    lastMessage: 'Thank you!'
                }
            ];

            mockApi.get.mockResolvedValue(mockInteractions);

            const result = await supervisorApi.getAIInteractions();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/ai-interactions');
            expect(result).toEqual(mockInteractions);
        });

        it('should fallback to AI assistant endpoint if supervisor endpoint fails', async () => {
            const mockConversations = [
                {
                    id: 'conv-1',
                    studentId: 'student-1',
                    title: 'Machine Learning Discussion',
                    lastMessageAt: '2024-03-15T10:30:00Z',
                    messageCount: 5,
                    status: 'active'
                }
            ];

            // First call fails, second succeeds
            mockApi.get
                .mockRejectedValueOnce(new Error('Supervisor endpoint not found'))
                .mockResolvedValueOnce(mockConversations);

            const result = await supervisorApi.getAIInteractions();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/ai-interactions');
            expect(mockApi.get).toHaveBeenCalledWith('/ai-assistant/conversations');
            expect(result).toHaveLength(1);
            expect(result[0].topic).toBe('Machine Learning Discussion');
        });

        it('should review AI interaction', async () => {
            const interactionId = 'interaction-1';
            const action = 'approve';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.reviewAIInteraction(interactionId, action);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/supervisor/ai-interactions/${interactionId}/review`,
                { action }
            );
        });
    });

    describe('Availability Management', () => {
        it('should fetch availability', async () => {
            const mockAvailability = {
                id: 'availability-1',
                supervisorId: 'supervisor-1',
                isAvailable: true,
                capacity: 5,
                currentStudents: 3,
                availableSlots: 2,
                specializations: ['Machine Learning', 'Data Science'],
                officeHours: [],
                unavailablePeriods: [],
                lastUpdated: '2024-03-15T10:30:00Z'
            };

            mockApi.get.mockResolvedValue(mockAvailability);

            const result = await supervisorApi.getAvailability();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/availability');
            expect(result).toEqual(mockAvailability);
        });

        it('should fallback to mock data if availability endpoint fails', async () => {
            mockApi.get.mockRejectedValueOnce(new Error('Availability endpoint not found'));

            const result = await supervisorApi.getAvailability();

            expect(mockApi.get).toHaveBeenCalledWith('/supervisor/availability');
            expect(result.isAvailable).toBe(true);
            expect(result.capacity).toBe(8);
            expect(result.specializations).toContain('Software Engineering');
        });

        it('should update availability', async () => {
            const updates = {
                isAvailable: false,
                capacity: 3
            };

            const mockUpdatedAvailability = {
                id: 'availability-1',
                supervisorId: 'supervisor-1',
                isAvailable: false,
                capacity: 3,
                currentStudents: 3,
                availableSlots: 0,
                specializations: ['Machine Learning'],
                officeHours: [],
                unavailablePeriods: [],
                lastUpdated: '2024-03-15T11:00:00Z'
            };

            mockApi.put.mockResolvedValue(mockUpdatedAvailability);

            const result = await supervisorApi.updateAvailability(updates);

            expect(mockApi.put).toHaveBeenCalledWith('/supervisor/availability', updates);
            expect(result).toEqual(mockUpdatedAvailability);
        });
    });

    describe('Project Management', () => {
        it('should fetch supervisor projects', async () => {
            const mockProjects = [
                {
                    id: 'project-1',
                    title: 'Machine Learning Project',
                    supervisor: { id: 'supervisor-1', name: 'Dr. Smith' }
                }
            ];

            mockApi.get.mockResolvedValue({ projects: mockProjects });

            const result = await supervisorApi.getSupervisorProjects();

            expect(mockApi.get).toHaveBeenCalledWith('/projects?supervisor=current');
            expect(result).toEqual(mockProjects);
        });

        it('should handle project fetch error gracefully', async () => {
            mockApi.get.mockRejectedValue(new Error('Failed to fetch projects'));

            const result = await supervisorApi.getSupervisorProjects();

            expect(result).toEqual([]);
        });

        it('should approve project application', async () => {
            const applicationId = 'app-1';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.approveProjectApplication(applicationId);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/supervisor/applications/${applicationId}/approve`
            );
        });

        it('should reject project application', async () => {
            const applicationId = 'app-1';
            const reason = 'Not suitable for current capacity';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.rejectProjectApplication(applicationId, reason);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/supervisor/applications/${applicationId}/reject`,
                { reason }
            );
        });
    });

    describe('Student Communication', () => {
        it('should send message to student', async () => {
            const studentId = 'student-1';
            const message = 'Please update your milestone status';
            const subject = 'Milestone Update Required';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.sendMessageToStudent(studentId, message, subject);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/supervisor/students/${studentId}/message`,
                { message, subject }
            );
        });

        it('should schedule student meeting', async () => {
            const studentId = 'student-1';
            const meetingData = {
                title: 'Progress Review',
                description: 'Discuss current progress and next steps',
                startTime: '2024-03-20T10:00:00Z',
                endTime: '2024-03-20T11:00:00Z',
                location: 'Office 101'
            };

            mockApi.post.mockResolvedValue({});

            await supervisorApi.scheduleStudentMeeting(studentId, meetingData);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/supervisor/students/${studentId}/meeting`,
                meetingData
            );
        });
    });

    describe('Milestone Management', () => {
        it('should approve milestone', async () => {
            const milestoneId = 'milestone-1';
            const feedback = 'Great work on this milestone!';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.approveMilestone(milestoneId, feedback);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/milestones/${milestoneId}/approve`,
                { feedback }
            );
        });

        it('should request milestone revision', async () => {
            const milestoneId = 'milestone-1';
            const feedback = 'Please add more details to the methodology section';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.requestMilestoneRevision(milestoneId, feedback);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/milestones/${milestoneId}/request-revision`,
                { feedback }
            );
        });

        it('should add milestone comment', async () => {
            const milestoneId = 'milestone-1';
            const comment = 'Consider using a different approach for data analysis';

            mockApi.post.mockResolvedValue({});

            await supervisorApi.addMilestoneComment(milestoneId, comment);

            expect(mockApi.post).toHaveBeenCalledWith(
                `/milestones/${milestoneId}/comments`,
                { comment }
            );
        });
    });
});