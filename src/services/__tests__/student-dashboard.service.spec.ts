import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { StudentDashboardService } from '../student-dashboard.service';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Milestone } from '../../entities/milestone.entity';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { ProjectApplication } from '../../entities/project-application.entity';
import { UserActivity } from '../../entities/user-activity.entity';
import { Recommendation } from '../../entities/recommendation.entity';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';

describe('StudentDashboardService', () => {
    let service: StudentDashboardService;
    let userRepository: jest.Mocked<Repository<User>>;
    let projectRepository: jest.Mocked<Repository<Project>>;
    let milestoneRepository: jest.Mocked<Repository<Milestone>>;
    let bookmarkRepository: jest.Mocked<Repository<ProjectBookmark>>;
    let applicationRepository: jest.Mocked<Repository<ProjectApplication>>;
    let activityRepository: jest.Mocked<Repository<UserActivity>>;
    let recommendationRepository: jest.Mocked<Repository<Recommendation>>;

    const mockUser = {
        id: 'student-123',
        email: 'student@example.com',
        role: 'student',
        studentProfile: {
            firstName: 'John',
            lastName: 'Doe',
        },
    };

    const mockProject = {
        id: 'project-123',
        title: 'Test Project',
        abstract: 'Test project abstract',
        studentId: 'student-123',
        supervisor: {
            id: 'supervisor-123',
            supervisorProfile: {
                name: 'Dr. Jane Smith',
            },
        },
    };

    beforeEach(async () => {
        const mockUserRepository = {
            findOne: jest.fn(),
        };

        const mockProjectRepository = {
            findOne: jest.fn(),
        };

        const mockMilestoneRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
        };

        const mockBookmarkRepository = {
            find: jest.fn(),
            count: jest.fn(),
        };

        const mockApplicationRepository = {
            findOne: jest.fn(),
        };

        const mockActivityRepository = {
            find: jest.fn(),
        };

        const mockRecommendationRepository = {
            find: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StudentDashboardService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(Project),
                    useValue: mockProjectRepository,
                },
                {
                    provide: getRepositoryToken(Milestone),
                    useValue: mockMilestoneRepository,
                },
                {
                    provide: getRepositoryToken(ProjectBookmark),
                    useValue: mockBookmarkRepository,
                },
                {
                    provide: getRepositoryToken(ProjectApplication),
                    useValue: mockApplicationRepository,
                },
                {
                    provide: getRepositoryToken(UserActivity),
                    useValue: mockActivityRepository,
                },
                {
                    provide: getRepositoryToken(Recommendation),
                    useValue: mockRecommendationRepository,
                },
            ],
        }).compile();

        service = module.get<StudentDashboardService>(StudentDashboardService);
        userRepository = module.get(getRepositoryToken(User));
        projectRepository = module.get(getRepositoryToken(Project));
        milestoneRepository = module.get(getRepositoryToken(Milestone));
        bookmarkRepository = module.get(getRepositoryToken(ProjectBookmark));
        applicationRepository = module.get(getRepositoryToken(ProjectApplication));
        activityRepository = module.get(getRepositoryToken(UserActivity));
        recommendationRepository = module.get(getRepositoryToken(Recommendation));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getStudentDashboard', () => {
        it('should return complete dashboard data for student', async () => {
            userRepository.findOne.mockResolvedValue(mockUser as any);
            projectRepository.findOne.mockResolvedValue(mockProject as any);
            applicationRepository.findOne.mockResolvedValue({
                status: 'approved',
            } as any);
            // Mock different responses for different milestone queries
            milestoneRepository.find.mockImplementation((options: any) => {
                // For upcoming milestones (non-completed)
                if (options?.where?.status) {
                    return Promise.resolve([]);
                }
                // For all milestones (progress calculation)
                return Promise.resolve([
                    { id: 'milestone-1', status: MilestoneStatus.COMPLETED, dueDate: new Date('2024-03-01') },
                    { id: 'milestone-2', status: MilestoneStatus.IN_PROGRESS, dueDate: new Date('2024-04-15') },
                ]);
            });
            milestoneRepository.findOne.mockResolvedValue({
                dueDate: new Date('2024-04-15'),
            } as any);
            activityRepository.find.mockResolvedValue([
                {
                    id: 'activity-1',
                    activityType: 'project_view',
                    description: 'Viewed project',
                    createdAt: new Date(),
                    metadata: { projectId: 'project-123' },
                },
            ] as any);
            bookmarkRepository.find.mockResolvedValue([]);
            bookmarkRepository.count.mockResolvedValue(0);
            recommendationRepository.find.mockResolvedValue([]);

            const result = await service.getStudentDashboard('student-123');

            expect(result).toEqual({
                studentId: 'student-123',
                studentName: 'John Doe',
                currentProject: {
                    id: 'project-123',
                    title: 'Test Project',
                    abstract: 'Test project abstract',
                    supervisorName: 'Dr. Jane Smith',
                    progressPercentage: 50,
                    nextMilestoneDue: '2024-04-15',
                    applicationStatus: 'approved',
                },
                recentActivities: [
                    {
                        id: 'activity-1',
                        type: 'project_view',
                        description: 'Viewed project',
                        timestamp: expect.any(String),
                        relatedEntityId: 'project-123',
                    },
                ],
                bookmarkedProjects: [],
                upcomingMilestones: [],
                recommendations: [],
                quickStats: {
                    totalBookmarks: 0,
                    completedMilestones: 1,
                    totalMilestones: 2,
                    averageProgress: 50,
                },
                lastUpdated: expect.any(String),
            });
        });

        it('should throw NotFoundException when student not found', async () => {
            userRepository.findOne.mockResolvedValue(null);

            await expect(service.getStudentDashboard('invalid-id')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('getCurrentProject', () => {
        it('should return current project data', async () => {
            projectRepository.findOne.mockResolvedValue(mockProject as any);
            applicationRepository.findOne.mockResolvedValue({
                status: 'approved',
            } as any);
            milestoneRepository.find.mockResolvedValue([
                { status: MilestoneStatus.COMPLETED, dueDate: new Date('2024-03-01') },
                { status: MilestoneStatus.IN_PROGRESS, dueDate: new Date('2024-04-15') },
            ] as any);
            milestoneRepository.findOne.mockResolvedValue({
                dueDate: new Date('2024-04-15'),
            } as any);

            const result = await service.getCurrentProject('student-123');

            expect(result).toEqual({
                id: 'project-123',
                title: 'Test Project',
                abstract: 'Test project abstract',
                supervisorName: 'Dr. Jane Smith',
                progressPercentage: 50,
                nextMilestoneDue: '2024-04-15',
                applicationStatus: 'approved',
            });
        });

        it('should return null when no current project', async () => {
            projectRepository.findOne.mockResolvedValue(null);

            const result = await service.getCurrentProject('student-123');

            expect(result).toBeNull();
        });
    });

    describe('getRecentActivities', () => {
        it('should return formatted recent activities', async () => {
            const mockActivities = [
                {
                    id: 'activity-1',
                    activityType: 'project_view',
                    description: 'Viewed project',
                    createdAt: new Date('2024-03-15T10:30:00Z'),
                    metadata: { projectId: 'project-123' },
                },
                {
                    id: 'activity-2',
                    activityType: 'milestone_update',
                    description: 'Updated milestone',
                    createdAt: new Date('2024-03-14T15:20:00Z'),
                    metadata: { milestoneId: 'milestone-456' },
                },
            ];

            activityRepository.find.mockResolvedValue(mockActivities as any);

            const result = await service.getRecentActivities('student-123', 10);

            expect(result).toEqual([
                {
                    id: 'activity-1',
                    type: 'project_view',
                    description: 'Viewed project',
                    timestamp: '2024-03-15T10:30:00.000Z',
                    relatedEntityId: 'project-123',
                },
                {
                    id: 'activity-2',
                    type: 'milestone_update',
                    description: 'Updated milestone',
                    timestamp: '2024-03-14T15:20:00.000Z',
                    relatedEntityId: 'milestone-456',
                },
            ]);
        });
    });

    describe('getBookmarkedProjects', () => {
        it('should return formatted bookmarked projects', async () => {
            const mockBookmarks = [
                {
                    id: 'bookmark-1',
                    createdAt: new Date('2024-03-10T14:20:00Z'),
                    project: {
                        id: 'project-456',
                        title: 'Bookmarked Project',
                        specialization: 'Software Engineering',
                        difficultyLevel: 'intermediate',
                        supervisor: {
                            supervisorProfile: {
                                name: 'Dr. John Smith',
                            },
                        },
                    },
                },
            ];

            bookmarkRepository.find.mockResolvedValue(mockBookmarks as any);

            const result = await service.getBookmarkedProjects('student-123', 5);

            expect(result).toEqual([
                {
                    id: 'project-456',
                    title: 'Bookmarked Project',
                    specialization: 'Software Engineering',
                    difficultyLevel: 'intermediate',
                    supervisorName: 'Dr. John Smith',
                    bookmarkedAt: '2024-03-10T14:20:00.000Z',
                },
            ]);
        });
    });

    describe('getUpcomingMilestones', () => {
        it('should return upcoming milestones with days until due', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

            projectRepository.findOne.mockResolvedValue(mockProject as any);
            milestoneRepository.find.mockResolvedValue([
                {
                    id: 'milestone-1',
                    title: 'Literature Review',
                    dueDate: futureDate,
                    priority: 'high',
                    status: MilestoneStatus.IN_PROGRESS,
                },
            ] as any);

            const result = await service.getUpcomingMilestones('student-123', 5);

            expect(result).toEqual([
                {
                    id: 'milestone-1',
                    title: 'Literature Review',
                    dueDate: futureDate.toISOString().split('T')[0],
                    priority: 'high',
                    daysUntilDue: 7,
                    status: MilestoneStatus.IN_PROGRESS,
                },
            ]);
        });

        it('should return empty array when no current project', async () => {
            projectRepository.findOne.mockResolvedValue(null);

            const result = await service.getUpcomingMilestones('student-123', 5);

            expect(result).toEqual([]);
        });
    });

    describe('getQuickStats', () => {
        it('should return correct statistics', async () => {
            bookmarkRepository.count.mockResolvedValue(5);
            projectRepository.findOne.mockResolvedValue(mockProject as any);
            milestoneRepository.find.mockResolvedValue([
                { status: MilestoneStatus.COMPLETED, dueDate: new Date('2024-03-01') },
                { status: MilestoneStatus.COMPLETED, dueDate: new Date('2024-03-15') },
                { status: MilestoneStatus.IN_PROGRESS, dueDate: new Date('2024-04-15') },
                { status: MilestoneStatus.NOT_STARTED, dueDate: new Date('2024-05-15') },
            ] as any);

            const result = await service.getQuickStats('student-123');

            expect(result).toEqual({
                totalBookmarks: 5,
                completedMilestones: 2,
                totalMilestones: 4,
                averageProgress: 50,
            });
        });

        it('should handle student with no project', async () => {
            bookmarkRepository.count.mockResolvedValue(3);
            projectRepository.findOne.mockResolvedValue(null);

            const result = await service.getQuickStats('student-123');

            expect(result).toEqual({
                totalBookmarks: 3,
                completedMilestones: 0,
                totalMilestones: 0,
                averageProgress: 0,
            });
        });
    });

    describe('getProjectMilestoneProgress', () => {
        it('should return milestone progress for authorized project', async () => {
            projectRepository.findOne.mockResolvedValue(mockProject as any);
            milestoneRepository.find.mockResolvedValue([
                {
                    id: 'milestone-1',
                    title: 'Literature Review',
                    description: 'Complete literature review',
                    dueDate: new Date('2025-04-15'), // Future date
                    priority: 'high',
                    status: MilestoneStatus.COMPLETED,
                    progress: 100,
                    tags: ['research'],
                },
                {
                    id: 'milestone-2',
                    title: 'Implementation',
                    description: 'Implement the system',
                    dueDate: new Date('2025-05-15'), // Future date to avoid overdue
                    priority: 'medium',
                    status: MilestoneStatus.IN_PROGRESS,
                    progress: 60,
                    tags: ['development'],
                },
            ] as any);

            const result = await service.getProjectMilestoneProgress('student-123', 'project-123');

            expect(result.projectId).toBe('project-123');
            expect(result.milestones).toHaveLength(2);
            expect(result.progressSummary).toEqual({
                total: 2,
                completed: 1,
                inProgress: 1,
                overdue: 0,
                progressPercentage: 50,
            });
        });

        it('should throw NotFoundException for unauthorized project', async () => {
            projectRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getProjectMilestoneProgress('student-123', 'unauthorized-project'),
            ).rejects.toThrow(NotFoundException);
        });
    });
});