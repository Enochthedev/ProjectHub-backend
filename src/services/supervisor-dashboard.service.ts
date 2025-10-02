import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan, MoreThan, Between } from 'typeorm';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { ProjectApplication, ApplicationStatus } from '../entities/project-application.entity';
import { UserActivity, ActivityType } from '../entities/user-activity.entity';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import {
    SupervisorDashboardDto,
    SupervisorMetricsDto,
    StudentProgressDto,
    SupervisorProjectDto,
    UpcomingDeadlineDto,
    AIInteractionSummaryDto,
} from '../dto/dashboard/supervisor-dashboard.dto';

@Injectable()
export class SupervisorDashboardService {
    private readonly logger = new Logger(SupervisorDashboardService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(ProjectApplication)
        private readonly applicationRepository: Repository<ProjectApplication>,
        @InjectRepository(UserActivity)
        private readonly activityRepository: Repository<UserActivity>,
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(ConversationMessage)
        private readonly messageRepository: Repository<ConversationMessage>,
    ) { }

    /**
     * Get comprehensive supervisor dashboard data
     */
    async getSupervisorDashboard(supervisorId: string): Promise<SupervisorDashboardDto> {
        this.logger.log(`Getting dashboard data for supervisor ${supervisorId}`);

        const supervisor = await this.userRepository.findOne({
            where: { id: supervisorId, role: 'supervisor' },
            relations: ['supervisorProfile'],
        });

        if (!supervisor) {
            throw new NotFoundException('Supervisor not found');
        }

        const [
            metrics,
            studentProgress,
            projects,
            upcomingDeadlines,
            aiInteractionSummary,
            recentActivities,
        ] = await Promise.all([
            this.getSupervisorMetrics(supervisorId),
            this.getStudentProgress(supervisorId),
            this.getSupervisorProjects(supervisorId),
            this.getUpcomingDeadlines(supervisorId),
            this.getAIInteractionSummary(supervisorId),
            this.getRecentStudentActivities(supervisorId),
        ]);

        return {
            supervisorId,
            supervisorName: supervisor.supervisorProfile?.name || supervisor.email,
            metrics,
            studentProgress,
            projects,
            upcomingDeadlines,
            aiInteractionSummary,
            recentActivities,
            lastUpdated: new Date().toISOString(),
        };
    }

    /**
     * Get supervisor metrics
     */
    async getSupervisorMetrics(supervisorId: string): Promise<SupervisorMetricsDto> {
        const currentYear = new Date().getFullYear();
        const yearStart = new Date(currentYear, 0, 1);
        const yearEnd = new Date(currentYear, 11, 31);

        const [
            projects,
            applications,
            milestones,
            conversations,
        ] = await Promise.all([
            this.projectRepository.find({
                where: { supervisorId },
                relations: ['student'],
            }),
            this.applicationRepository.find({
                where: {
                    project: { supervisorId },
                    status: ApplicationStatus.PENDING,
                },
                relations: ['project'],
            }),
            this.milestoneRepository.find({
                where: { project: { supervisorId } },
                relations: ['project'],
            }),
            this.conversationRepository.find({
                where: {
                    student: {
                        projects: { supervisorId }
                    }
                },
                relations: ['student'],
            }),
        ]);

        const activeProjects = projects.filter(p => p.student).length;
        const completedProjectsThisYear = projects.filter(p =>
            p.status === 'completed' &&
            p.updatedAt >= yearStart &&
            p.updatedAt <= yearEnd
        ).length;

        const totalStudents = new Set(projects.filter(p => p.student).map(p => p.studentId)).size;
        const overdueMilestones = milestones.filter(m =>
            m.status !== MilestoneStatus.COMPLETED &&
            new Date(m.dueDate) < new Date()
        ).length;

        // Calculate students at risk (more than 50% overdue milestones or low progress)
        const studentsAtRisk = await this.calculateStudentsAtRisk(supervisorId);

        // Calculate average progress
        const averageProgress = await this.calculateAverageStudentProgress(supervisorId);

        // Mock response time calculation (in a real system, this would be tracked)
        const averageResponseTime = 4.2; // hours

        return {
            totalStudents,
            activeProjects,
            completedProjectsThisYear,
            pendingApplications: applications.length,
            overdueMilestones,
            studentsAtRisk,
            averageStudentProgress: averageProgress,
            averageResponseTime,
        };
    }

    /**
     * Get student progress for all supervised students
     */
    async getStudentProgress(supervisorId: string): Promise<StudentProgressDto[]> {
        const projects = await this.projectRepository.find({
            where: { supervisorId },
            relations: ['student', 'student.studentProfile'],
        });

        const studentsWithProjects = projects.filter(p => p.student);

        const studentProgressPromises = studentsWithProjects.map(async (project) => {
            const milestones = await this.milestoneRepository.find({
                where: { projectId: project.id },
            });

            const completedMilestones = milestones.filter(
                m => m.status === MilestoneStatus.COMPLETED
            ).length;

            const overdueMilestones = milestones.filter(m =>
                m.status !== MilestoneStatus.COMPLETED &&
                new Date(m.dueDate) < new Date()
            ).length;

            const progressPercentage = milestones.length > 0
                ? Math.round((completedMilestones / milestones.length) * 100)
                : 0;

            // Get last activity
            const lastActivity = await this.activityRepository.findOne({
                where: { userId: project.studentId },
                order: { createdAt: 'DESC' },
            });

            // Calculate risk level
            const riskLevel = this.calculateRiskLevel(progressPercentage, overdueMilestones, milestones.length);

            return {
                id: project.student.id,
                name: project.student.studentProfile?.firstName && project.student.studentProfile?.lastName
                    ? `${project.student.studentProfile.firstName} ${project.student.studentProfile.lastName}`
                    : project.student.email,
                email: project.student.email,
                currentProject: {
                    id: project.id,
                    title: project.title,
                    progressPercentage,
                },
                completedMilestones,
                totalMilestones: milestones.length,
                overdueMilestones,
                lastActivity: lastActivity?.createdAt.toISOString() || project.updatedAt.toISOString(),
                riskLevel,
            };
        });

        return Promise.all(studentProgressPromises);
    }

    /**
     * Get supervisor's projects
     */
    async getSupervisorProjects(supervisorId: string): Promise<SupervisorProjectDto[]> {
        const projects = await this.projectRepository.find({
            where: { supervisorId },
            relations: ['student', 'student.studentProfile'],
        });

        const projectPromises = projects.map(async (project) => {
            const [milestones, applications] = await Promise.all([
                this.milestoneRepository.find({
                    where: { projectId: project.id },
                }),
                this.applicationRepository.count({
                    where: {
                        projectId: project.id,
                        status: ApplicationStatus.PENDING,
                    },
                }),
            ]);

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
                assignedStudent: project.student ? {
                    id: project.student.id,
                    name: project.student.studentProfile?.firstName && project.student.studentProfile?.lastName
                        ? `${project.student.studentProfile.firstName} ${project.student.studentProfile.lastName}`
                        : project.student.email,
                } : null,
                progressPercentage,
                pendingApplications: applications,
                nextMilestoneDue: nextMilestone?.dueDate?.toISOString().split('T')[0] || null,
                status: project.student ? 'active' : 'available',
            };
        });

        return Promise.all(projectPromises);
    }

    /**
     * Get upcoming deadlines across all supervised students
     */
    async getUpcomingDeadlines(supervisorId: string, limit: number = 10): Promise<UpcomingDeadlineDto[]> {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const milestones = await this.milestoneRepository
            .createQueryBuilder('milestone')
            .leftJoinAndSelect('milestone.project', 'project')
            .leftJoinAndSelect('project.student', 'student')
            .leftJoinAndSelect('student.studentProfile', 'studentProfile')
            .where('project.supervisorId = :supervisorId', { supervisorId })
            .andWhere('milestone.status != :completedStatus', { completedStatus: MilestoneStatus.COMPLETED })
            .andWhere('milestone.dueDate <= :thirtyDays', { thirtyDays: thirtyDaysFromNow })
            .orderBy('milestone.dueDate', 'ASC')
            .take(limit)
            .getMany();

        const now = new Date();

        return milestones.map(milestone => {
            const dueDate = new Date(milestone.dueDate);
            const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            return {
                id: milestone.id,
                title: milestone.title,
                studentName: milestone.project.student?.studentProfile?.firstName && milestone.project.student?.studentProfile?.lastName
                    ? `${milestone.project.student.studentProfile.firstName} ${milestone.project.student.studentProfile.lastName}`
                    : milestone.project.student?.email || 'Unassigned',
                projectTitle: milestone.project.title,
                dueDate: milestone.dueDate.toISOString().split('T')[0],
                daysUntilDue,
                priority: milestone.priority,
                status: milestone.status,
            };
        });
    }

    /**
     * Get AI interaction summary for supervised students
     */
    async getAIInteractionSummary(supervisorId: string): Promise<AIInteractionSummaryDto> {
        // Get all conversations for students supervised by this supervisor
        const conversations = await this.conversationRepository
            .createQueryBuilder('conversation')
            .leftJoinAndSelect('conversation.student', 'student')
            .leftJoin('student.projects', 'project')
            .where('project.supervisorId = :supervisorId', { supervisorId })
            .getMany();

        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
            return {
                totalConversations: 0,
                conversationsNeedingReview: 0,
                averageConfidenceScore: 0,
                commonCategories: [],
                recentEscalations: [],
            };
        }

        const messages = await this.messageRepository.find({
            where: {
                conversationId: conversationIds.length > 0 ? conversationIds : ['none'],
                type: 'assistant',
            },
            relations: ['conversation', 'conversation.student', 'conversation.student.studentProfile'],
        });

        // Calculate metrics
        const totalConversations = conversations.length;
        const conversationsNeedingReview = conversations.filter(c => c.status === 'escalated').length;

        const confidenceScores = messages
            .filter(m => m.confidenceScore !== null)
            .map(m => m.confidenceScore);

        const averageConfidenceScore = confidenceScores.length > 0
            ? Math.round(confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length * 10) / 10
            : 0;

        // Mock common categories (in a real system, this would be based on message categorization)
        const commonCategories = [
            { category: 'Technical Implementation', count: Math.floor(messages.length * 0.3) },
            { category: 'Project Planning', count: Math.floor(messages.length * 0.25) },
            { category: 'Literature Review', count: Math.floor(messages.length * 0.2) },
            { category: 'Methodology', count: Math.floor(messages.length * 0.15) },
            { category: 'Writing Assistance', count: Math.floor(messages.length * 0.1) },
        ].filter(c => c.count > 0);

        // Get recent escalations
        const recentEscalations = conversations
            .filter(c => c.status === 'escalated')
            .slice(0, 5)
            .map(conversation => ({
                id: conversation.id,
                studentName: conversation.student?.studentProfile?.firstName && conversation.student?.studentProfile?.lastName
                    ? `${conversation.student.studentProfile.firstName} ${conversation.student.studentProfile.lastName}`
                    : conversation.student?.email || 'Unknown',
                topic: conversation.title || 'General Discussion',
                timestamp: conversation.updatedAt.toISOString(),
            }));

        return {
            totalConversations,
            conversationsNeedingReview,
            averageConfidenceScore,
            commonCategories,
            recentEscalations,
        };
    }

    /**
     * Get recent activities from supervised students
     */
    async getRecentStudentActivities(supervisorId: string, limit: number = 10) {
        // Get all student IDs supervised by this supervisor
        const projects = await this.projectRepository.find({
            where: { supervisorId },
            select: ['studentId'],
        });

        const studentIds = projects
            .filter(p => p.studentId)
            .map(p => p.studentId);

        if (studentIds.length === 0) {
            return [];
        }

        const activities = await this.activityRepository.find({
            where: { userId: studentIds.length > 0 ? studentIds : ['none'] },
            relations: ['user', 'user.studentProfile'],
            order: { createdAt: 'DESC' },
            take: limit,
        });

        return activities.map(activity => ({
            id: activity.id,
            studentName: activity.user?.studentProfile?.firstName && activity.user?.studentProfile?.lastName
                ? `${activity.user.studentProfile.firstName} ${activity.user.studentProfile.lastName}`
                : activity.user?.email || 'Unknown',
            type: activity.activityType,
            description: activity.description,
            timestamp: activity.createdAt.toISOString(),
        }));
    }

    /**
     * Get milestone progress for a specific project (supervisor access)
     */
    async getProjectMilestoneProgress(supervisorId: string, projectId: string) {
        // Verify the supervisor has access to this project
        const project = await this.projectRepository.findOne({
            where: { id: projectId, supervisorId },
        });

        if (!project) {
            throw new NotFoundException('Project not found or access denied');
        }

        const milestones = await this.milestoneRepository.find({
            where: { projectId },
            order: { dueDate: 'ASC' },
        });

        const now = new Date();
        const completed = milestones.filter(m => m.status === MilestoneStatus.COMPLETED).length;
        const inProgress = milestones.filter(m => m.status === MilestoneStatus.IN_PROGRESS).length;
        const overdue = milestones.filter(m =>
            m.status !== MilestoneStatus.COMPLETED &&
            new Date(m.dueDate) < now
        ).length;

        return {
            projectId,
            milestones: milestones.map(milestone => ({
                id: milestone.id,
                title: milestone.title,
                description: milestone.description,
                dueDate: milestone.dueDate.toISOString().split('T')[0],
                priority: milestone.priority,
                status: milestone.status,
                progress: milestone.progress || 0,
                tags: milestone.tags || [],
                isOverdue: milestone.status !== MilestoneStatus.COMPLETED &&
                    new Date(milestone.dueDate) < now,
                daysUntilDue: Math.ceil((new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
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
     * Get overdue milestones for supervisor
     */
    async getOverdueMilestones(supervisorId: string) {
        const now = new Date();

        const milestones = await this.milestoneRepository
            .createQueryBuilder('milestone')
            .leftJoinAndSelect('milestone.project', 'project')
            .leftJoinAndSelect('project.student', 'student')
            .leftJoinAndSelect('student.studentProfile', 'studentProfile')
            .where('project.supervisorId = :supervisorId', { supervisorId })
            .andWhere('milestone.status != :completedStatus', { completedStatus: MilestoneStatus.COMPLETED })
            .andWhere('milestone.dueDate < :now', { now })
            .orderBy('milestone.dueDate', 'ASC')
            .getMany();

        return milestones.map(milestone => ({
            id: milestone.id,
            title: milestone.title,
            projectTitle: milestone.project.title,
            studentName: milestone.project.student?.studentProfile?.firstName && milestone.project.student?.studentProfile?.lastName
                ? `${milestone.project.student.studentProfile.firstName} ${milestone.project.student.studentProfile.lastName}`
                : milestone.project.student?.email || 'Unassigned',
            dueDate: milestone.dueDate.toISOString().split('T')[0],
            daysOverdue: Math.ceil((now.getTime() - new Date(milestone.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
            priority: milestone.priority,
            status: milestone.status,
        }));
    }

    // Helper methods

    private async calculateStudentsAtRisk(supervisorId: string): Promise<number> {
        const projects = await this.projectRepository.find({
            where: { supervisorId },
            relations: ['student'],
        });

        let studentsAtRisk = 0;

        for (const project of projects.filter(p => p.student)) {
            const milestones = await this.milestoneRepository.find({
                where: { projectId: project.id },
            });

            const overdueMilestones = milestones.filter(m =>
                m.status !== MilestoneStatus.COMPLETED &&
                new Date(m.dueDate) < new Date()
            ).length;

            const overduePercentage = milestones.length > 0
                ? (overdueMilestones / milestones.length) * 100
                : 0;

            if (overduePercentage > 30) { // More than 30% overdue milestones
                studentsAtRisk++;
            }
        }

        return studentsAtRisk;
    }

    private async calculateAverageStudentProgress(supervisorId: string): Promise<number> {
        const projects = await this.projectRepository.find({
            where: { supervisorId },
            relations: ['student'],
        });

        const studentsWithProjects = projects.filter(p => p.student);

        if (studentsWithProjects.length === 0) {
            return 0;
        }

        let totalProgress = 0;

        for (const project of studentsWithProjects) {
            const milestones = await this.milestoneRepository.find({
                where: { projectId: project.id },
            });

            const completedMilestones = milestones.filter(
                m => m.status === MilestoneStatus.COMPLETED
            ).length;

            const progressPercentage = milestones.length > 0
                ? (completedMilestones / milestones.length) * 100
                : 0;

            totalProgress += progressPercentage;
        }

        return Math.round(totalProgress / studentsWithProjects.length * 10) / 10;
    }

    private calculateRiskLevel(progressPercentage: number, overdueMilestones: number, totalMilestones: number): 'low' | 'medium' | 'high' {
        const overduePercentage = totalMilestones > 0 ? (overdueMilestones / totalMilestones) * 100 : 0;

        if (overduePercentage > 50 || progressPercentage < 30) {
            return 'high';
        } else if (overduePercentage > 20 || progressPercentage < 60) {
            return 'medium';
        } else {
            return 'low';
        }
    }
}