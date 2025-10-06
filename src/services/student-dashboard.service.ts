import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Not, LessThan } from 'typeorm';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { ProjectApplication, ApplicationStatus } from '../entities/project-application.entity';
import { UserActivity, ActivityType } from '../entities/user-activity.entity';
import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationStatus } from '../common/enums/recommendation-status.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
    StudentDashboardDto,
    CurrentProjectDto,
    RecentActivityDto,
    BookmarkedProjectDto,
    UpcomingMilestoneDto,
    RecommendationDto,
} from '../dto/dashboard/student-dashboard.dto';

@Injectable()
export class StudentDashboardService {
    private readonly logger = new Logger(StudentDashboardService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(ProjectBookmark)
        private readonly bookmarkRepository: Repository<ProjectBookmark>,
        @InjectRepository(ProjectApplication)
        private readonly applicationRepository: Repository<ProjectApplication>,
        @InjectRepository(UserActivity)
        private readonly activityRepository: Repository<UserActivity>,
        @InjectRepository(Recommendation)
        private readonly recommendationRepository: Repository<Recommendation>,
    ) { }

    /**
     * Get comprehensive student dashboard data
     */
    async getStudentDashboard(studentId: string): Promise<StudentDashboardDto> {
        this.logger.log(`Getting dashboard data for student ${studentId}`);

        const student = await this.userRepository.findOne({
            where: { id: studentId, role: UserRole.STUDENT },
            relations: ['studentProfile'],
        });

        if (!student) {
            throw new NotFoundException('Student not found');
        }

        const [
            currentProject,
            recentActivities,
            bookmarkedProjects,
            upcomingMilestones,
            recommendations,
            quickStats,
        ] = await Promise.all([
            this.getCurrentProject(studentId),
            this.getRecentActivities(studentId),
            this.getBookmarkedProjects(studentId),
            this.getUpcomingMilestones(studentId),
            this.getRecommendations(studentId),
            this.getQuickStats(studentId),
        ]);

        return {
            studentId,
            studentName: student.studentProfile?.name || student.email,
            currentProject,
            recentActivities,
            bookmarkedProjects,
            upcomingMilestones,
            recommendations,
            quickStats,
            lastUpdated: new Date().toISOString(),
        };
    }

    /**
     * Get student's current project
     */
    async getCurrentProject(studentId: string): Promise<CurrentProjectDto | null> {
        const project = await this.projectRepository.findOne({
            where: { studentId },
            relations: ['supervisor', 'supervisor.supervisorProfile'],
        });

        if (!project) {
            return null;
        }

        // Get application status
        const application = await this.applicationRepository.findOne({
            where: {
                projectId: project.id,
                studentId,
                status: ApplicationStatus.APPROVED,
            },
        });

        // Calculate progress percentage based on milestones
        const milestones = await this.milestoneRepository.find({
            where: { projectId: project.id },
        });

        const completedMilestones = milestones.filter(
            m => m.status === MilestoneStatus.COMPLETED
        ).length;

        const progressPercentage = milestones.length > 0
            ? Math.round((completedMilestones / milestones.length) * 100)
            : 0;

        // Get next milestone due date
        const nextMilestone = await this.milestoneRepository.findOne({
            where: {
                projectId: project.id,
                status: Not(MilestoneStatus.COMPLETED),
            },
            order: { dueDate: 'ASC' },
        });

        return {
            id: project.id,
            title: project.title,
            abstract: project.abstract,
            supervisorName: project.supervisor?.supervisorProfile?.name ||
                project.supervisor?.email || 'Unknown',
            progressPercentage,
            nextMilestoneDue: nextMilestone?.dueDate?.toISOString().split('T')[0] || null,
            applicationStatus: application?.status || 'unknown',
        };
    }

    /**
     * Get recent activities for student
     */
    async getRecentActivities(studentId: string, limit: number = 10): Promise<RecentActivityDto[]> {
        const activities = await this.activityRepository.find({
            where: { userId: studentId },
            order: { createdAt: 'DESC' },
            take: limit,
        });

        return activities.map(activity => ({
            id: activity.id,
            type: activity.activityType,
            description: activity.description,
            timestamp: activity.createdAt.toISOString(),
            relatedEntityId: activity.metadata?.projectId ||
                activity.metadata?.milestoneId ||
                activity.metadata?.applicationId || null,
        }));
    }

    /**
     * Get bookmarked projects for student
     */
    async getBookmarkedProjects(studentId: string, limit: number = 5): Promise<BookmarkedProjectDto[]> {
        const bookmarks = await this.bookmarkRepository.find({
            where: { studentId },
            relations: ['project', 'project.supervisor', 'project.supervisor.supervisorProfile'],
            order: { createdAt: 'DESC' },
            take: limit,
        });

        return bookmarks.map(bookmark => ({
            id: bookmark.project.id,
            title: bookmark.project.title,
            specialization: bookmark.project.specialization,
            difficultyLevel: bookmark.project.difficultyLevel,
            supervisorName: bookmark.project.supervisor?.supervisorProfile?.name ||
                bookmark.project.supervisor?.email || 'Unknown',
            bookmarkedAt: bookmark.createdAt.toISOString(),
        }));
    }

    /**
     * Get upcoming milestones for student
     */
    async getUpcomingMilestones(studentId: string, limit: number = 5): Promise<UpcomingMilestoneDto[]> {
        // First get the student's current project
        const project = await this.projectRepository.findOne({
            where: { studentId },
        });

        if (!project) {
            return [];
        }

        const milestones = await this.milestoneRepository.find({
            where: {
                projectId: project.id,
                status: Not(MilestoneStatus.COMPLETED),
            },
            order: { dueDate: 'ASC' },
            take: limit,
        });

        const now = new Date();

        return milestones.map(milestone => {
            const dueDate = new Date(milestone.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: milestone.id,
                title: milestone.title,
                dueDate: milestone.dueDate ? milestone.dueDate.toISOString().split('T')[0] : '',
                priority: milestone.priority,
                daysUntilDue,
                status: milestone.status,
            };
        });
    }

    /**
     * Get AI recommendations for student
     */
    async getRecommendations(studentId: string, limit: number = 5): Promise<RecommendationDto[]> {
        const recommendations = await this.recommendationRepository.find({
            where: {
                studentId,
                status: RecommendationStatus.ACTIVE,
            },
            order: { averageSimilarityScore: 'DESC', createdAt: 'DESC' },
            take: limit,
        });

        return recommendations.flatMap(rec =>
            rec.projectSuggestions.slice(0, limit).map(proj => ({
                id: rec.id,
                type: 'project',
                projectId: proj.projectId,
                title: proj.title,
                reason: proj.reasoning,
                confidenceScore: proj.similarityScore,
            }))
        ).slice(0, limit);
    }

    /**
     * Get quick statistics for student
     */
    async getQuickStats(studentId: string): Promise<{
        totalBookmarks: number;
        completedMilestones: number;
        totalMilestones: number;
        averageProgress: number;
    }> {
        const [
            totalBookmarks,
            project,
        ] = await Promise.all([
            this.bookmarkRepository.count({ where: { studentId } }),
            this.projectRepository.findOne({ where: { studentId } }),
        ]);

        let completedMilestones = 0;
        let totalMilestones = 0;
        let averageProgress = 0;

        if (project) {
            const milestones = await this.milestoneRepository.find({
                where: { projectId: project.id },
            });

            totalMilestones = milestones.length;
            completedMilestones = milestones.filter(
                m => m.status === MilestoneStatus.COMPLETED
            ).length;

            averageProgress = totalMilestones > 0
                ? Math.round((completedMilestones / totalMilestones) * 100)
                : 0;
        }

        return {
            totalBookmarks,
            completedMilestones,
            totalMilestones,
            averageProgress,
        };
    }

    /**
     * Get student milestones with progress tracking
     */
    async getStudentMilestones(studentId: string) {
        const project = await this.projectRepository.findOne({
            where: { studentId },
        });

        if (!project) {
            return {
                projectId: null,
                milestones: [],
                progressSummary: {
                    total: 0,
                    completed: 0,
                    inProgress: 0,
                    overdue: 0,
                    progressPercentage: 0,
                },
            };
        }

        const milestones = await this.milestoneRepository.find({
            where: { projectId: project.id },
            order: { dueDate: 'ASC' },
        });

        const now = new Date();
        const completed = milestones.filter(m => m.status === MilestoneStatus.COMPLETED).length;
        const inProgress = milestones.filter(m => m.status === MilestoneStatus.IN_PROGRESS).length;
        const overdue = milestones.filter(m =>
            m.status !== MilestoneStatus.COMPLETED &&
            m.dueDate && new Date(m.dueDate) < now
        ).length;

        return {
            projectId: project.id,
            milestones: milestones.map(milestone => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description,
                dueDate: milestone.dueDate ? milestone.dueDate.toISOString().split('T')[0] : '',
                priority: milestone.priority,
                status: milestone.status,
                progress: milestone.getProgressPercentage(),
                isOverdue: milestone.status !== MilestoneStatus.COMPLETED &&
                    milestone.dueDate && new Date(milestone.dueDate) < now,
                daysUntilDue: milestone.dueDate ? Math.ceil((new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0,
            })),
            progressSummary: {
                total: milestones.length,
                completed,
                inProgress,
                overdue,
                progressPercentage: milestones.length > 0
                    ? Math.round((completed / milestones.length) * 100)
                    : 0,
            },
        };
    }

    /**
     * Get milestone progress for a specific project
     */
    async getProjectMilestoneProgress(studentId: string, projectId: string) {
        // Verify the student has access to this project
        const project = await this.projectRepository.findOne({
            where: { id: projectId, studentId },
        });

        if (!project) {
            throw new NotFoundException('Project not found or access denied');
        }

        return this.getStudentMilestones(studentId);
    }
}