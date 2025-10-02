import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../../services/dashboard.service';
import { StudentDashboardService } from '../../services/student-dashboard.service';
import { SupervisorDashboardService } from '../../services/supervisor-dashboard.service';
import { ProjectApplicationService } from '../../services/project-application.service';
import { UserActivityService } from '../../services/user-activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('DashboardController', () => {
    let controller: DashboardController;
    let studentDashboardService: jest.Mocked<StudentDashboardService>;
    let supervisorDashboardService: jest.Mocked<SupervisorDashboardService>;
    let dashboardService: jest.Mocked<DashboardService>;
    let projectApplicationService: jest.Mocked<ProjectApplicationService>;
    let userActivityService: jest.Mocked<UserActivityService>;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'student',
    };

    const mockRequest = {
        user: mockUser,
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test-agent' },
    };

    beforeEach(async () => {
        const mockStudentDashboardService = {
            getStudentDashboard: jest.fn(),
            getCurrentProject: jest.fn(),
            getStudentMilestones: jest.fn(),
            getProjectMilestoneProgress: jest.fn(),
        };

        const mockSupervisorDashboardService = {
            getSupervisorDashboard: jest.fn(),
            getStudentProgress: jest.fn(),
            getSupervisorProjects: jest.fn(),
            getAIInteractionSummary: jest.fn(),
            getProjectMilestoneProgress: jest.fn(),
            getOverdueMilestones: jest.fn(),
        };

        const mockDashboardService = {
            getAdminDashboard: jest.fn(),
            getPlatformAnalytics: jest.fn(),
            getSystemHealthMetrics: jest.fn(),
            getProjectMilestoneProgress: jest.fn(),
            getAllOverdueMilestones: jest.fn(),
            refreshDashboardCache: jest.fn(),
        };

        const mockProjectApplicationService = {
            createApplication: jest.fn(),
            getStudentApplications: jest.fn(),
            getSupervisorApplications: jest.fn(),
            getAllApplications: jest.fn(),
            getApplicationById: jest.fn(),
            updateApplicationStatus: jest.fn(),
            withdrawApplication: jest.fn(),
        };

        const mockUserActivityService = {
            getRecentActivities: jest.fn(),
            getActivitySummary: jest.fn(),
            getSystemRecentActivities: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DashboardController],
            providers: [
                {
                    provide: DashboardService,
                    useValue: mockDashboardService,
                },
                {
                    provide: StudentDashboardService,
                    useValue: mockStudentDashboardService,
                },
                {
                    provide: SupervisorDashboardService,
                    useValue: mockSupervisorDashboardService,
                },
                {
                    provide: ProjectApplicationService,
                    useValue: mockProjectApplicationService,
                },
                {
                    provide: UserActivityService,
                    useValue: mockUserActivityService,
                },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DashboardController>(DashboardController);
        studentDashboardService = module.get(StudentDashboardService);
        supervisorDashboardService = module.get(SupervisorDashboardService);
        dashboardService = module.get(DashboardService);
        projectApplicationService = module.get(ProjectApplicationService);
        userActivityService = module.get(UserActivityService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('getStudentDashboard', () => {
        it('should return student dashboard data', async () => {
            const mockDashboardData = {
                studentId: 'user-123',
                studentName: 'John Doe',
                currentProject: null,
                recentActivities: [],
                bookmarkedProjects: [],
                upcomingMilestones: [],
                recommendations: [],
                quickStats: {
                    totalBookmarks: 0,
                    completedMilestones: 0,
                    totalMilestones: 0,
                    averageProgress: 0,
                },
                lastUpdated: new Date().toISOString(),
            };

            studentDashboardService.getStudentDashboard.mockResolvedValue(mockDashboardData);

            const result = await controller.getStudentDashboard(mockRequest);

            expect(result).toEqual(mockDashboardData);
            expect(studentDashboardService.getStudentDashboard).toHaveBeenCalledWith('user-123');
        });
    });

    describe('getSupervisorDashboard', () => {
        it('should return supervisor dashboard data', async () => {
            const mockRequest = {
                user: { ...mockUser, role: 'supervisor' },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'test-agent' },
            };

            const mockDashboardData = {
                supervisorId: 'user-123',
                supervisorName: 'Dr. Jane Smith',
                metrics: {
                    totalStudents: 5,
                    activeProjects: 3,
                    completedProjectsThisYear: 2,
                    pendingApplications: 1,
                    overdueMilestones: 0,
                    studentsAtRisk: 0,
                    averageStudentProgress: 75.0,
                    averageResponseTime: 4.2,
                },
                studentProgress: [],
                projects: [],
                upcomingDeadlines: [],
                aiInteractionSummary: {
                    totalConversations: 0,
                    conversationsNeedingReview: 0,
                    averageConfidenceScore: 0,
                    commonCategories: [],
                    recentEscalations: [],
                },
                recentActivities: [],
                lastUpdated: new Date().toISOString(),
            };

            supervisorDashboardService.getSupervisorDashboard.mockResolvedValue(mockDashboardData);

            const result = await controller.getSupervisorDashboard(mockRequest);

            expect(result).toEqual(mockDashboardData);
            expect(supervisorDashboardService.getSupervisorDashboard).toHaveBeenCalledWith('user-123');
        });
    });

    describe('getAdminDashboard', () => {
        it('should return admin dashboard data', async () => {
            const mockRequest = {
                user: { ...mockUser, role: 'admin' },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'test-agent' },
            };

            const mockDashboardData = {
                metrics: {
                    totalUsers: 100,
                    activeUsers: 80,
                    newUsersToday: 5,
                    totalProjects: 50,
                    pendingProjects: 10,
                    approvedProjects: 35,
                    totalMilestones: 200,
                    completedMilestones: 150,
                    overdueMilestones: 5,
                    systemHealthScore: 95,
                },
                userGrowthData: [],
                projectStatusDistribution: [],
                systemAlerts: [],
                recentActivities: [],
                topPerformingProjects: [],
                pendingApprovals: {
                    projects: 10,
                    users: 5,
                    reports: 0,
                },
                lastUpdated: new Date().toISOString(),
            };

            dashboardService.getAdminDashboard.mockResolvedValue(mockDashboardData);

            const result = await controller.getAdminDashboard(mockRequest);

            expect(result).toEqual(mockDashboardData);
            expect(dashboardService.getAdminDashboard).toHaveBeenCalled();
        });
    });

    describe('createProjectApplication', () => {
        it('should create a project application', async () => {
            const createDto = {
                projectId: 'project-123',
                coverLetter: 'I am interested in this project...',
            };

            const mockApplication = {
                id: 'app-123',
                project: {
                    id: 'project-123',
                    title: 'Test Project',
                    supervisorName: 'Dr. Smith',
                },
                student: {
                    id: 'user-123',
                    name: 'John Doe',
                    email: 'john@example.com',
                },
                status: 'pending',
                coverLetter: 'I am interested in this project...',
                rejectionReason: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reviewedAt: null,
                reviewedBy: null,
            };

            projectApplicationService.createApplication.mockResolvedValue(mockApplication);

            const result = await controller.createProjectApplication(mockRequest, createDto);

            expect(result).toEqual(mockApplication);
            expect(projectApplicationService.createApplication).toHaveBeenCalledWith(
                'user-123',
                createDto,
                '127.0.0.1',
                'test-agent',
            );
        });
    });

    describe('getStudentApplications', () => {
        it('should return student applications', async () => {
            const mockApplications = {
                studentId: 'user-123',
                applications: [],
                statistics: {
                    total: 0,
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    withdrawn: 0,
                },
            };

            projectApplicationService.getStudentApplications.mockResolvedValue(mockApplications);

            const result = await controller.getStudentApplications(mockRequest);

            expect(result).toEqual(mockApplications);
            expect(projectApplicationService.getStudentApplications).toHaveBeenCalledWith('user-123');
        });
    });

    describe('updateApplicationStatus', () => {
        it('should update application status', async () => {
            const mockRequest = {
                user: { ...mockUser, role: 'supervisor' },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'test-agent' },
            };

            const updateDto = {
                status: 'approved' as const,
            };

            const mockApplication = {
                id: 'app-123',
                project: {
                    id: 'project-123',
                    title: 'Test Project',
                    supervisorName: 'Dr. Smith',
                },
                student: {
                    id: 'student-123',
                    name: 'John Doe',
                    email: 'john@example.com',
                },
                status: 'approved',
                coverLetter: 'I am interested in this project...',
                rejectionReason: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                reviewedAt: new Date().toISOString(),
                reviewedBy: {
                    id: 'user-123',
                    name: 'Dr. Smith',
                },
            };

            projectApplicationService.updateApplicationStatus.mockResolvedValue(mockApplication);

            const result = await controller.updateApplicationStatus(mockRequest, 'app-123', updateDto);

            expect(result).toEqual(mockApplication);
            expect(projectApplicationService.updateApplicationStatus).toHaveBeenCalledWith(
                'app-123',
                updateDto,
                'user-123',
                '127.0.0.1',
                'test-agent',
            );
        });
    });

    describe('getRecentActivities', () => {
        it('should return recent activities', async () => {
            const mockActivities = [
                {
                    id: 'activity-1',
                    activityType: 'project_view',
                    description: 'Viewed project: Test Project',
                    createdAt: new Date(),
                    userId: 'user-123',
                    metadata: null,
                    ipAddress: null,
                    userAgent: null,
                },
            ];

            userActivityService.getRecentActivities.mockResolvedValue(mockActivities);

            const result = await controller.getRecentActivities(mockRequest, 10);

            expect(result).toEqual(mockActivities);
            expect(userActivityService.getRecentActivities).toHaveBeenCalledWith('user-123', 10);
        });

        it('should use default limit when not provided', async () => {
            const mockActivities = [];
            userActivityService.getRecentActivities.mockResolvedValue(mockActivities);

            await controller.getRecentActivities(mockRequest);

            expect(userActivityService.getRecentActivities).toHaveBeenCalledWith('user-123', 10);
        });

        it('should cap limit at 100', async () => {
            const mockActivities = [];
            userActivityService.getRecentActivities.mockResolvedValue(mockActivities);

            await controller.getRecentActivities(mockRequest, 150);

            expect(userActivityService.getRecentActivities).toHaveBeenCalledWith('user-123', 100);
        });
    });

    describe('getMilestoneProgress', () => {
        it('should return milestone progress for student', async () => {
            const mockProgress = {
                projectId: 'project-123',
                milestones: [],
                progressSummary: {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    overdue: 0,
                    progressPercentage: 0,
                },
            };

            studentDashboardService.getProjectMilestoneProgress.mockResolvedValue(mockProgress);

            const result = await controller.getMilestoneProgress(mockRequest, 'project-123');

            expect(result).toEqual(mockProgress);
            expect(studentDashboardService.getProjectMilestoneProgress).toHaveBeenCalledWith(
                'user-123',
                'project-123',
            );
        });

        it('should return milestone progress for supervisor', async () => {
            const mockRequest = {
                user: { ...mockUser, role: 'supervisor' },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'test-agent' },
            };

            const mockProgress = {
                projectId: 'project-123',
                milestones: [],
                progressSummary: {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    overdue: 0,
                    progressPercentage: 0,
                },
            };

            supervisorDashboardService.getProjectMilestoneProgress.mockResolvedValue(mockProgress);

            const result = await controller.getMilestoneProgress(mockRequest, 'project-123');

            expect(result).toEqual(mockProgress);
            expect(supervisorDashboardService.getProjectMilestoneProgress).toHaveBeenCalledWith(
                'user-123',
                'project-123',
            );
        });

        it('should return milestone progress for admin', async () => {
            const mockRequest = {
                user: { ...mockUser, role: 'admin' },
                ip: '127.0.0.1',
                headers: { 'user-agent': 'test-agent' },
            };

            const mockProgress = {
                projectId: 'project-123',
                projectTitle: 'Test Project',
                milestones: [],
                progressSummary: {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    overdue: 0,
                    progressPercentage: 0,
                },
            };

            dashboardService.getProjectMilestoneProgress.mockResolvedValue(mockProgress);

            const result = await controller.getMilestoneProgress(mockRequest, 'project-123');

            expect(result).toEqual(mockProgress);
            expect(dashboardService.getProjectMilestoneProgress).toHaveBeenCalledWith('project-123');
        });
    });
});