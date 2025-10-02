import { renderHook, act } from '@testing-library/react';
import { useSupervisorStore, useStudentMetrics, useAIInteractionMetrics } from '../supervisor';
import { SupervisorDashboardData, StudentProgressSummary, AtRiskStudent, AIInteractionOverview } from '@/types/supervisor';

// Mock data
const mockStudentProgress: StudentProgressSummary[] = [
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
        nextMilestone: {
            id: 'milestone-1',
            title: 'Final Report',
            dueDate: '2024-04-15',
            priority: 'high'
        },
        lastActivity: '2024-03-15T10:30:00Z',
        projectCount: 1
    },
    {
        studentId: '2',
        studentName: 'Jane Smith',
        studentEmail: 'jane@example.com',
        totalMilestones: 8,
        completedMilestones: 3,
        inProgressMilestones: 2,
        overdueMilestones: 2,
        blockedMilestones: 1,
        completionRate: 37.5,
        riskScore: 0.8,
        nextMilestone: null,
        lastActivity: '2024-03-10T14:20:00Z',
        projectCount: 1
    }
];

const mockAtRiskStudents: AtRiskStudent[] = [
    {
        studentId: '2',
        studentName: 'Jane Smith',
        riskLevel: 'high',
        riskFactors: ['2 overdue milestones', '1 blocked milestone'],
        overdueMilestones: 2,
        blockedMilestones: 1,
        lastActivity: '2024-03-10T14:20:00Z',
        recommendedActions: ['Schedule meeting', 'Review blocked milestones'],
        urgencyScore: 85
    }
];

const mockDashboardData: SupervisorDashboardData = {
    supervisorId: 'supervisor-1',
    supervisorName: 'Dr. Smith',
    totalStudents: 2,
    metrics: {
        totalMilestones: 18,
        completedMilestones: 11,
        overdueMilestones: 3,
        blockedMilestones: 1,
        overallCompletionRate: 61.1,
        averageProgressVelocity: 1.5,
        atRiskStudentCount: 1
    },
    studentSummaries: mockStudentProgress,
    atRiskStudents: mockAtRiskStudents,
    recentActivity: [
        {
            studentId: '1',
            studentName: 'John Doe',
            activity: 'Completed milestone: Literature Review',
            timestamp: '2024-03-15T10:30:00Z'
        }
    ],
    upcomingDeadlines: [
        {
            studentId: '1',
            studentName: 'John Doe',
            milestoneId: 'milestone-1',
            milestoneTitle: 'Final Report',
            dueDate: '2024-04-15',
            priority: 'high',
            daysUntilDue: 5
        }
    ],
    lastUpdated: '2024-03-15T10:30:00Z'
};

const mockAIInteractions: AIInteractionOverview[] = [
    {
        id: 'interaction-1',
        studentId: '1',
        studentName: 'John Doe',
        conversationId: 'conv-1',
        topic: 'Machine Learning Algorithms',
        timestamp: '2024-03-15T10:30:00Z',
        messageCount: 5,
        requiresReview: false,
        confidenceScore: 0.9,
        category: 'technical',
        lastMessage: 'Thank you for the explanation!'
    },
    {
        id: 'interaction-2',
        studentId: '2',
        studentName: 'Jane Smith',
        conversationId: 'conv-2',
        topic: 'Project Methodology',
        timestamp: '2024-03-14T15:20:00Z',
        messageCount: 8,
        requiresReview: true,
        escalationReason: 'Student asking for help with complex research methodology',
        confidenceScore: 0.6,
        category: 'academic',
        lastMessage: 'I need help with my research approach'
    }
];

describe('useSupervisorStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        const { result } = renderHook(() => useSupervisorStore());
        act(() => {
            result.current.setDashboardData(null as any);
            result.current.setStudentProgress([]);
            result.current.setAtRiskStudents([]);
            result.current.setAIInteractions([]);
            result.current.setEscalatedInteractions([]);
            result.current.clearError();
        });
    });

    describe('Dashboard Data Management', () => {
        it('should set and get dashboard data', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setDashboardData(mockDashboardData);
            });

            expect(result.current.dashboardData).toEqual(mockDashboardData);
        });

        it('should set student progress data', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setStudentProgress(mockStudentProgress);
            });

            expect(result.current.studentProgress).toEqual(mockStudentProgress);
        });

        it('should set at-risk students data', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setAtRiskStudents(mockAtRiskStudents);
            });

            expect(result.current.atRiskStudents).toEqual(mockAtRiskStudents);
        });
    });

    describe('Student Management', () => {
        it('should find student by ID', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setStudentProgress(mockStudentProgress);
            });

            const student = result.current.getStudentById('1');
            expect(student).toEqual(mockStudentProgress[0]);
        });

        it('should return undefined for non-existent student', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setStudentProgress(mockStudentProgress);
            });

            const student = result.current.getStudentById('999');
            expect(student).toBeUndefined();
        });

        it('should get high risk students', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setAtRiskStudents(mockAtRiskStudents);
            });

            const highRiskStudents = result.current.getHighRiskStudents();
            expect(highRiskStudents).toHaveLength(1);
            expect(highRiskStudents[0].riskLevel).toBe('high');
        });
    });

    describe('Dashboard Computed Values', () => {
        it('should get upcoming deadlines sorted by due date', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setDashboardData(mockDashboardData);
            });

            const upcomingDeadlines = result.current.getUpcomingDeadlines();
            expect(upcomingDeadlines).toHaveLength(1);
            expect(upcomingDeadlines[0].daysUntilDue).toBe(5);
        });

        it('should get recent activity sorted by timestamp', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setDashboardData(mockDashboardData);
            });

            const recentActivity = result.current.getRecentActivity();
            expect(recentActivity).toHaveLength(1);
            expect(recentActivity[0].studentName).toBe('John Doe');
        });
    });

    describe('AI Interaction Management', () => {
        it('should set AI interactions', () => {
            const { result } = renderHook(() => useSupervisorStore());

            act(() => {
                result.current.setAIInteractions(mockAIInteractions);
            });

            expect(result.current.aiInteractions).toEqual(mockAIInteractions);
        });

        it('should set escalated interactions', () => {
            const { result } = renderHook(() => useSupervisorStore());
            const escalatedInteractions = mockAIInteractions.filter(i => i.requiresReview);

            act(() => {
                result.current.setEscalatedInteractions(escalatedInteractions);
            });

            expect(result.current.escalatedInteractions).toEqual(escalatedInteractions);
        });
    });

    describe('Report Management', () => {
        it('should set and clear report filters', () => {
            const { result } = renderHook(() => useSupervisorStore());
            const filters = {
                studentIds: ['1', '2'],
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            };

            act(() => {
                result.current.setReportFilters(filters);
            });

            expect(result.current.reportFilters).toMatchObject(filters);

            act(() => {
                result.current.clearReportFilters();
            });

            expect(result.current.reportFilters.studentIds).toEqual([]);
            expect(result.current.reportFilters.startDate).toBeUndefined();
            expect(result.current.reportFilters.endDate).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        it('should set and clear errors', () => {
            const { result } = renderHook(() => useSupervisorStore());
            const errorMessage = 'Test error message';

            act(() => {
                result.current.setError(errorMessage);
            });

            expect(result.current.error).toBe(errorMessage);

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Loading State', () => {
        it('should manage loading state', () => {
            const { result } = renderHook(() => useSupervisorStore());

            expect(result.current.isLoading).toBe(false);

            act(() => {
                result.current.setLoading(true);
            });

            expect(result.current.isLoading).toBe(true);

            act(() => {
                result.current.setLoading(false);
            });

            expect(result.current.isLoading).toBe(false);
        });
    });
});

describe('useStudentMetrics', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useSupervisorStore());
        act(() => {
            result.current.setStudentProgress(mockStudentProgress);
        });
    });

    it('should calculate student metrics correctly', () => {
        const { result } = renderHook(() => useStudentMetrics());

        expect(result.current.totalStudents).toBe(2);
        expect(result.current.averageCompletionRate).toBe(58.75); // (80 + 37.5) / 2
        expect(result.current.studentsAtRisk).toBe(1); // Jane Smith with risk score 0.8
        expect(result.current.studentsOnTrack).toBe(1); // John Doe with 80% completion
        expect(result.current.performanceDistribution.excellent).toBe(0);
        expect(result.current.performanceDistribution.good).toBe(1); // John Doe
        expect(result.current.performanceDistribution.average).toBe(0);
        expect(result.current.performanceDistribution.poor).toBe(1); // Jane Smith
    });
});

describe('useAIInteractionMetrics', () => {
    beforeEach(() => {
        const { result } = renderHook(() => useSupervisorStore());
        act(() => {
            result.current.setAIInteractions(mockAIInteractions);
            result.current.setEscalatedInteractions(mockAIInteractions.filter(i => i.requiresReview));
        });
    });

    it('should calculate AI interaction metrics correctly', () => {
        const { result } = renderHook(() => useAIInteractionMetrics());

        expect(result.current.totalInteractions).toBe(2);
        expect(result.current.escalatedCount).toBe(1);
        expect(result.current.escalationRate).toBe(50); // 1/2 * 100
        expect(result.current.averageConfidence).toBe(0.75); // (0.9 + 0.6) / 2
        expect(result.current.requiresReview).toBe(1);
    });

    it('should handle empty interactions', () => {
        const { result: storeResult } = renderHook(() => useSupervisorStore());
        act(() => {
            storeResult.current.setAIInteractions([]);
            storeResult.current.setEscalatedInteractions([]);
        });

        const { result } = renderHook(() => useAIInteractionMetrics());

        expect(result.current.totalInteractions).toBe(0);
        expect(result.current.escalatedCount).toBe(0);
        expect(result.current.escalationRate).toBe(0);
        expect(result.current.averageConfidence).toBe(0);
        expect(result.current.requiresReview).toBe(0);
    });
});