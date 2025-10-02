import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

export enum ApplicationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    WITHDRAWN = 'withdrawn',
}

export class CreateProjectApplicationDto {
    @ApiProperty({
        description: 'Project ID to apply for',
        example: 'project-123',
    })
    @IsString()
    projectId: string;

    @ApiProperty({
        description: 'Cover letter explaining interest and qualifications',
        example: 'I am very interested in this project because...',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    coverLetter?: string;
}

export class UpdateApplicationStatusDto {
    @ApiProperty({
        description: 'New application status',
        enum: ApplicationStatus,
        example: 'approved',
    })
    @IsEnum(ApplicationStatus)
    status: ApplicationStatus;

    @ApiProperty({
        description: 'Reason for rejection (required if status is rejected)',
        example: 'Student does not meet the technical requirements',
        required: false,
    })
    @IsOptional()
    @IsString()
    @MaxLength(1000)
    rejectionReason?: string;
}

export class ProjectApplicationDto {
    @ApiProperty({
        description: 'Application ID',
        example: 'app-123',
    })
    id: string;

    @ApiProperty({
        description: 'Project information',
        example: {
            id: 'project-123',
            title: 'AI-Powered Recommendation System',
            supervisorName: 'Dr. Jane Smith',
        },
    })
    project: {
        id: string;
        title: string;
        supervisorName: string;
    };

    @ApiProperty({
        description: 'Student information',
        example: {
            id: 'student-123',
            name: 'John Doe',
            email: 'john.doe@university.edu',
        },
    })
    student: {
        id: string;
        name: string;
        email: string;
    };

    @ApiProperty({
        description: 'Application status',
        enum: ApplicationStatus,
        example: 'pending',
    })
    status: ApplicationStatus;

    @ApiProperty({
        description: 'Cover letter',
        example: 'I am very interested in this project because...',
        nullable: true,
    })
    coverLetter: string | null;

    @ApiProperty({
        description: 'Rejection reason (if rejected)',
        example: 'Student does not meet the technical requirements',
        nullable: true,
    })
    rejectionReason: string | null;

    @ApiProperty({
        description: 'Application submission date',
        example: '2024-03-15T10:30:00Z',
    })
    createdAt: string;

    @ApiProperty({
        description: 'Last update date',
        example: '2024-03-16T14:20:00Z',
    })
    updatedAt: string;

    @ApiProperty({
        description: 'Review date (if reviewed)',
        example: '2024-03-16T14:20:00Z',
        nullable: true,
    })
    reviewedAt: string | null;

    @ApiProperty({
        description: 'Reviewer information (if reviewed)',
        example: {
            id: 'supervisor-123',
            name: 'Dr. Jane Smith',
        },
        nullable: true,
    })
    reviewedBy: {
        id: string;
        name: string;
    } | null;
}

export class StudentApplicationsDto {
    @ApiProperty({
        description: 'Student ID',
        example: 'student-123',
    })
    studentId: string;

    @ApiProperty({
        description: 'List of applications',
        type: [ProjectApplicationDto],
    })
    applications: ProjectApplicationDto[];

    @ApiProperty({
        description: 'Application statistics',
        example: {
            total: 5,
            pending: 2,
            approved: 1,
            rejected: 2,
            withdrawn: 0,
        },
    })
    statistics: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        withdrawn: number;
    };
}

export class SupervisorApplicationsDto {
    @ApiProperty({
        description: 'Supervisor ID',
        example: 'supervisor-123',
    })
    supervisorId: string;

    @ApiProperty({
        description: 'List of applications for supervisor\'s projects',
        type: [ProjectApplicationDto],
    })
    applications: ProjectApplicationDto[];

    @ApiProperty({
        description: 'Application statistics',
        example: {
            total: 15,
            pending: 8,
            approved: 4,
            rejected: 3,
            withdrawn: 0,
        },
    })
    statistics: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        withdrawn: number;
    };
}