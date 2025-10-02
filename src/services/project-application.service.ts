import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan } from 'typeorm';
import { ProjectApplication, ApplicationStatus } from '../entities/project-application.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { UserActivityService, ActivityType } from './user-activity.service';
import {
    CreateProjectApplicationDto,
    UpdateApplicationStatusDto,
    ProjectApplicationDto,
    StudentApplicationsDto,
    SupervisorApplicationsDto,
} from '../dto/dashboard/project-application.dto';

@Injectable()
export class ProjectApplicationService {
    private readonly logger = new Logger(ProjectApplicationService.name);

    constructor(
        @InjectRepository(ProjectApplication)
        private readonly applicationRepository: Repository<ProjectApplication>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly userActivityService: UserActivityService,
    ) { }

    /**
     * Create a new project application
     */
    async createApplication(
        studentId: string,
        createDto: CreateProjectApplicationDto,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<ProjectApplicationDto> {
        // Check if project exists and is approved
        const project = await this.projectRepository.findOne({
            where: { id: createDto.projectId },
            relations: ['supervisor'],
        });

        if (!project) {
            throw new NotFoundException('Project not found');
        }

        if (project.approvalStatus !== 'approved') {
            throw new BadRequestException('Cannot apply to unapproved projects');
        }

        // Check if student already applied to this project
        const existingApplication = await this.applicationRepository.findOne({
            where: {
                projectId: createDto.projectId,
                studentId,
            },
        });

        if (existingApplication) {
            throw new ConflictException('You have already applied to this project');
        }

        // Check if project already has an assigned student
        if (project.studentId) {
            throw new BadRequestException('This project already has an assigned student');
        }

        // Create the application
        const application = this.applicationRepository.create({
            projectId: createDto.projectId,
            studentId,
            coverLetter: createDto.coverLetter || null,
            status: ApplicationStatus.PENDING,
        });

        const savedApplication = await this.applicationRepository.save(application);

        // Log the activity
        await this.userActivityService.logActivity({
            userId: studentId,
            activityType: ActivityType.PROJECT_APPLY,
            description: `Applied to project: ${project.title}`,
            metadata: {
                projectId: project.id,
                applicationId: savedApplication.id,
            },
            ipAddress,
            userAgent,
        });

        this.logger.log(
            `Student ${studentId} applied to project ${createDto.projectId}`,
        );

        return this.mapToDto(
            await this.applicationRepository.findOne({
                where: { id: savedApplication.id },
                relations: ['project', 'project.supervisor', 'student', 'student.studentProfile'],
            }),
        );
    }

    /**
     * Update application status (for supervisors/admins)
     */
    async updateApplicationStatus(
        applicationId: string,
        updateDto: UpdateApplicationStatusDto,
        reviewerId: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<ProjectApplicationDto> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['project', 'project.supervisor', 'student', 'student.studentProfile'],
        });

        if (!application) {
            throw new NotFoundException('Application not found');
        }

        // Check if reviewer has permission (supervisor of the project or admin)
        const reviewer = await this.userRepository.findOne({
            where: { id: reviewerId },
        });

        if (!reviewer) {
            throw new NotFoundException('Reviewer not found');
        }

        const canReview =
            reviewer.role === 'admin' ||
            (reviewer.role === 'supervisor' && application.project.supervisorId === reviewerId);

        if (!canReview) {
            throw new BadRequestException('You do not have permission to review this application');
        }

        // Validate status transition
        if (application.status !== ApplicationStatus.PENDING) {
            throw new BadRequestException('Can only update pending applications');
        }

        // If rejecting, require rejection reason
        if (updateDto.status === ApplicationStatus.REJECTED && !updateDto.rejectionReason) {
            throw new BadRequestException('Rejection reason is required when rejecting an application');
        }

        // Update the application
        application.status = updateDto.status;
        application.rejectionReason = updateDto.rejectionReason || null;
        application.reviewedAt = new Date();
        application.reviewedById = reviewerId;

        const savedApplication = await this.applicationRepository.save(application);

        // If approved, assign student to project
        if (updateDto.status === ApplicationStatus.APPROVED) {
            await this.projectRepository.update(
                { id: application.projectId },
                { studentId: application.studentId },
            );

            // Reject all other pending applications for this project
            await this.applicationRepository.update(
                {
                    projectId: application.projectId,
                    status: ApplicationStatus.PENDING,
                    id: Not(applicationId),
                },
                {
                    status: ApplicationStatus.REJECTED,
                    rejectionReason: 'Project assigned to another student',
                    reviewedAt: new Date(),
                    reviewedById: reviewerId,
                },
            );
        }

        // Log the activity
        await this.userActivityService.logActivity({
            userId: reviewerId,
            activityType: ActivityType.PROJECT_APPLY,
            description: `${updateDto.status} application for project: ${application.project.title}`,
            metadata: {
                projectId: application.projectId,
                applicationId: application.id,
                studentId: application.studentId,
                action: updateDto.status,
            },
            ipAddress,
            userAgent,
        });

        this.logger.log(
            `Application ${applicationId} ${updateDto.status} by reviewer ${reviewerId}`,
        );

        return this.mapToDto(savedApplication);
    }

    /**
     * Get applications for a student
     */
    async getStudentApplications(studentId: string): Promise<StudentApplicationsDto> {
        const applications = await this.applicationRepository.find({
            where: { studentId },
            relations: ['project', 'project.supervisor', 'reviewedBy', 'reviewedBy.supervisorProfile'],
            order: { createdAt: 'DESC' },
        });

        const statistics = this.calculateApplicationStatistics(applications);

        return {
            studentId,
            applications: applications.map((app) => this.mapToDto(app)),
            statistics,
        };
    }

    /**
     * Get applications for a supervisor's projects
     */
    async getSupervisorApplications(supervisorId: string): Promise<SupervisorApplicationsDto> {
        const applications = await this.applicationRepository
            .createQueryBuilder('application')
            .leftJoinAndSelect('application.project', 'project')
            .leftJoinAndSelect('project.supervisor', 'supervisor')
            .leftJoinAndSelect('application.student', 'student')
            .leftJoinAndSelect('student.studentProfile', 'studentProfile')
            .leftJoinAndSelect('application.reviewedBy', 'reviewedBy')
            .leftJoinAndSelect('reviewedBy.supervisorProfile', 'reviewedByProfile')
            .where('project.supervisorId = :supervisorId', { supervisorId })
            .orderBy('application.createdAt', 'DESC')
            .getMany();

        const statistics = this.calculateApplicationStatistics(applications);

        return {
            supervisorId,
            applications: applications.map((app) => this.mapToDto(app)),
            statistics,
        };
    }

    /**
     * Get all applications (for admin)
     */
    async getAllApplications(): Promise<ProjectApplicationDto[]> {
        const applications = await this.applicationRepository.find({
            relations: ['project', 'project.supervisor', 'student', 'student.studentProfile', 'reviewedBy', 'reviewedBy.supervisorProfile'],
            order: { createdAt: 'DESC' },
        });

        return applications.map((app) => this.mapToDto(app));
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string): Promise<ProjectApplicationDto> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId },
            relations: ['project', 'project.supervisor', 'student', 'student.studentProfile', 'reviewedBy', 'reviewedBy.supervisorProfile'],
        });

        if (!application) {
            throw new NotFoundException('Application not found');
        }

        return this.mapToDto(application);
    }

    /**
     * Withdraw application (for students)
     */
    async withdrawApplication(
        applicationId: string,
        studentId: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<ProjectApplicationDto> {
        const application = await this.applicationRepository.findOne({
            where: { id: applicationId, studentId },
            relations: ['project', 'project.supervisor', 'student', 'student.studentProfile'],
        });

        if (!application) {
            throw new NotFoundException('Application not found');
        }

        if (application.status !== ApplicationStatus.PENDING) {
            throw new BadRequestException('Can only withdraw pending applications');
        }

        application.status = ApplicationStatus.WITHDRAWN;
        const savedApplication = await this.applicationRepository.save(application);

        // Log the activity
        await this.userActivityService.logActivity({
            userId: studentId,
            activityType: ActivityType.PROJECT_APPLY,
            description: `Withdrew application for project: ${application.project.title}`,
            metadata: {
                projectId: application.projectId,
                applicationId: application.id,
                action: 'withdrawn',
            },
            ipAddress,
            userAgent,
        });

        this.logger.log(`Application ${applicationId} withdrawn by student ${studentId}`);

        return this.mapToDto(savedApplication);
    }

    /**
     * Get application statistics for dashboard
     */
    async getApplicationStatistics(): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        withdrawn: number;
        recentApplications: number;
    }> {
        const [total, pending, approved, rejected, withdrawn] = await Promise.all([
            this.applicationRepository.count(),
            this.applicationRepository.count({ where: { status: ApplicationStatus.PENDING } }),
            this.applicationRepository.count({ where: { status: ApplicationStatus.APPROVED } }),
            this.applicationRepository.count({ where: { status: ApplicationStatus.REJECTED } }),
            this.applicationRepository.count({ where: { status: ApplicationStatus.WITHDRAWN } }),
        ]);

        // Recent applications (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentApplications = await this.applicationRepository.count({
            where: {
                createdAt: MoreThan(sevenDaysAgo),
            },
        });

        return {
            total,
            pending,
            approved,
            rejected,
            withdrawn,
            recentApplications,
        };
    }

    /**
     * Map entity to DTO
     */
    private mapToDto(application: ProjectApplication): ProjectApplicationDto {
        return {
            id: application.id,
            project: {
                id: application.project.id,
                title: application.project.title,
                supervisorName: application.project.supervisor?.supervisorProfile?.name ||
                    application.project.supervisor?.email || 'Unknown',
            },
            student: {
                id: application.student.id,
                name: application.student.studentProfile?.name || application.student.email,
                email: application.student.email,
            },
            status: application.status,
            coverLetter: application.coverLetter,
            rejectionReason: application.rejectionReason,
            createdAt: application.createdAt.toISOString(),
            updatedAt: application.updatedAt.toISOString(),
            reviewedAt: application.reviewedAt?.toISOString() || null,
            reviewedBy: application.reviewedBy
                ? {
                    id: application.reviewedBy.id,
                    name: application.reviewedBy.supervisorProfile?.name ||
                        application.reviewedBy.email,
                }
                : null,
        };
    }

    /**
     * Calculate application statistics
     */
    private calculateApplicationStatistics(applications: ProjectApplication[]): {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        withdrawn: number;
    } {
        return {
            total: applications.length,
            pending: applications.filter((app) => app.status === ApplicationStatus.PENDING).length,
            approved: applications.filter((app) => app.status === ApplicationStatus.APPROVED).length,
            rejected: applications.filter((app) => app.status === ApplicationStatus.REJECTED).length,
            withdrawn: applications.filter((app) => app.status === ApplicationStatus.WITHDRAWN).length,
        };
    }
}