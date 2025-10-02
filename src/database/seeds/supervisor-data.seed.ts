import { DataSource } from 'typeorm';
import { User } from '../../entities/user.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { SupervisorAvailability, AvailabilityType, DayOfWeek } from '../../entities/supervisor-availability.entity';
import { AIInteractionReview, ReviewStatus, ReviewCategory } from '../../entities/ai-interaction-review.entity';
import { Conversation } from '../../entities/conversation.entity';
import { SupervisorAnalytics } from '../../entities/supervisor-analytics.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

export class SupervisorDataSeeder {
    constructor(private dataSource: DataSource) { }

    async seed(): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Create supervisor users
            const supervisors = await this.createSupervisors(queryRunner);

            // Create supervisor profiles
            await this.createSupervisorProfiles(queryRunner, supervisors);

            // Create availability slots
            await this.createAvailabilitySlots(queryRunner, supervisors);

            // Create sample conversations and AI reviews
            await this.createAIInteractionReviews(queryRunner, supervisors);

            // Create analytics data
            await this.createAnalyticsData(queryRunner, supervisors);

            await queryRunner.commitTransaction();
            console.log('✅ Supervisor seed data created successfully');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('❌ Error seeding supervisor data:', error);
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async createSupervisors(queryRunner: any): Promise<User[]> {
        const userRepository = queryRunner.manager.getRepository(User);
        const hashedPassword = await bcrypt.hash('supervisor123', 10);

        const supervisors = [
            {
                email: 'dr.smith@university.edu',
                password: hashedPassword,
                role: UserRole.SUPERVISOR,
                isEmailVerified: true,
                isActive: true,
                firstName: 'Jane',
                lastName: 'Smith',
            },
            {
                email: 'prof.johnson@university.edu',
                password: hashedPassword,
                role: UserRole.SUPERVISOR,
                isEmailVerified: true,
                isActive: true,
                firstName: 'Michael',
                lastName: 'Johnson',
            },
            {
                email: 'dr.williams@university.edu',
                password: hashedPassword,
                role: UserRole.SUPERVISOR,
                isEmailVerified: true,
                isActive: true,
                firstName: 'Sarah',
                lastName: 'Williams',
            },
        ];

        const savedSupervisors = [];
        for (const supervisor of supervisors) {
            const existingUser = await userRepository.findOne({
                where: { email: supervisor.email },
            });

            if (!existingUser) {
                const savedSupervisor = await userRepository.save(supervisor);
                savedSupervisors.push(savedSupervisor);
                console.log(`Created supervisor: ${supervisor.email}`);
            } else {
                savedSupervisors.push(existingUser);
                console.log(`Supervisor already exists: ${supervisor.email}`);
            }
        }

        return savedSupervisors;
    }

    private async createSupervisorProfiles(queryRunner: any, supervisors: User[]): Promise<void> {
        const profileRepository = queryRunner.manager.getRepository(SupervisorProfile);

        const profiles = [
            {
                user: supervisors[0],
                name: 'Dr. Jane Smith',
                specializations: ['Artificial Intelligence', 'Machine Learning', 'Data Science'],
                maxStudents: 12,
                isAvailable: true,
                officeLocation: 'Building A, Room 301',
                phoneNumber: '+1-555-0101',
            },
            {
                user: supervisors[1],
                name: 'Prof. Michael Johnson',
                specializations: ['Software Engineering', 'Web Development', 'Database Systems'],
                maxStudents: 15,
                isAvailable: true,
                officeLocation: 'Building B, Room 205',
                phoneNumber: '+1-555-0102',
            },
            {
                user: supervisors[2],
                name: 'Dr. Sarah Williams',
                specializations: ['Cybersecurity', 'Network Systems', 'Cloud Computing'],
                maxStudents: 10,
                isAvailable: true,
                officeLocation: 'Building C, Room 150',
                phoneNumber: '+1-555-0103',
            },
        ];

        for (const profile of profiles) {
            const existingProfile = await profileRepository.findOne({
                where: { user: { id: profile.user.id } },
            });

            if (!existingProfile) {
                await profileRepository.save(profile);
                console.log(`Created profile for: ${profile.name}`);
            } else {
                console.log(`Profile already exists for: ${profile.name}`);
            }
        }
    }

    private async createAvailabilitySlots(queryRunner: any, supervisors: User[]): Promise<void> {
        const availabilityRepository = queryRunner.manager.getRepository(SupervisorAvailability);

        const availabilitySlots = [
            // Dr. Jane Smith's availability
            {
                supervisorId: supervisors[0].id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: '09:00',
                endTime: '12:00',
                location: 'Building A, Room 301',
                notes: 'General office hours for all students',
                maxCapacity: 3,
                isActive: true,
            },
            {
                supervisorId: supervisors[0].id,
                type: AvailabilityType.MEETING_SLOTS,
                dayOfWeek: DayOfWeek.WEDNESDAY,
                startTime: '14:00',
                endTime: '17:00',
                location: 'Building A, Room 301',
                notes: 'Individual project consultations',
                maxCapacity: 1,
                isActive: true,
            },
            {
                supervisorId: supervisors[0].id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.FRIDAY,
                startTime: '10:00',
                endTime: '13:00',
                location: 'Building A, Room 301',
                notes: 'AI/ML project discussions',
                maxCapacity: 4,
                isActive: true,
            },

            // Prof. Michael Johnson's availability
            {
                supervisorId: supervisors[1].id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.TUESDAY,
                startTime: '10:00',
                endTime: '13:00',
                location: 'Building B, Room 205',
                notes: 'Software engineering consultations',
                maxCapacity: 5,
                isActive: true,
            },
            {
                supervisorId: supervisors[1].id,
                type: AvailabilityType.MEETING_SLOTS,
                dayOfWeek: DayOfWeek.THURSDAY,
                startTime: '15:00',
                endTime: '18:00',
                location: 'Building B, Room 205',
                notes: 'Code review sessions',
                maxCapacity: 2,
                isActive: true,
            },

            // Dr. Sarah Williams's availability
            {
                supervisorId: supervisors[2].id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: '13:00',
                endTime: '16:00',
                location: 'Building C, Room 150',
                notes: 'Cybersecurity project guidance',
                maxCapacity: 3,
                isActive: true,
            },
            {
                supervisorId: supervisors[2].id,
                type: AvailabilityType.MEETING_SLOTS,
                dayOfWeek: DayOfWeek.FRIDAY,
                startTime: '09:00',
                endTime: '12:00',
                location: 'Building C, Room 150',
                notes: 'Individual security assessments',
                maxCapacity: 1,
                isActive: true,
            },
        ];

        for (const slot of availabilitySlots) {
            const existingSlot = await availabilityRepository.findOne({
                where: {
                    supervisorId: slot.supervisorId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                },
            });

            if (!existingSlot) {
                await availabilityRepository.save(slot);
                console.log(`Created availability slot for supervisor ${slot.supervisorId} on day ${slot.dayOfWeek}`);
            }
        }
    }

    private async createAIInteractionReviews(queryRunner: any, supervisors: User[]): Promise<void> {
        const conversationRepository = queryRunner.manager.getRepository(Conversation);
        const reviewRepository = queryRunner.manager.getRepository(AIInteractionReview);
        const userRepository = queryRunner.manager.getRepository(User);

        // Get some student users for conversations
        const students = await userRepository.find({
            where: { role: UserRole.STUDENT },
            take: 5,
        });

        if (students.length === 0) {
            console.log('No students found, skipping AI interaction reviews');
            return;
        }

        // Create sample conversations
        const conversations = [];
        for (let i = 0; i < 10; i++) {
            const student = students[i % students.length];
            const conversation = await conversationRepository.save({
                studentId: student.id,
                title: `AI Consultation ${i + 1}`,
                status: 'completed',
                language: 'en',
                messageCount: Math.floor(Math.random() * 10) + 3,
            });
            conversations.push(conversation);
        }

        // Create AI interaction reviews
        const reviews = [
            {
                conversationId: conversations[0].id,
                supervisorId: supervisors[0].id,
                studentId: conversations[0].studentId,
                status: ReviewStatus.APPROVED,
                categories: [ReviewCategory.ACCURACY, ReviewCategory.APPROPRIATENESS],
                confidenceScore: 0.92,
                reviewNotes: 'AI provided accurate technical guidance on machine learning concepts',
                supervisorFeedback: 'Good response quality',
                requiresFollowUp: false,
                reviewedAt: new Date(),
            },
            {
                conversationId: conversations[1].id,
                supervisorId: supervisors[0].id,
                studentId: conversations[1].studentId,
                status: ReviewStatus.ESCALATED,
                categories: [ReviewCategory.COMPLETENESS, ReviewCategory.SAFETY],
                confidenceScore: 0.65,
                reviewNotes: 'AI response was incomplete for complex algorithm question',
                supervisorFeedback: 'Student needs additional human guidance on advanced algorithms',
                requiresFollowUp: true,
                reviewedAt: new Date(),
            },
            {
                conversationId: conversations[2].id,
                supervisorId: supervisors[1].id,
                studentId: conversations[2].studentId,
                status: ReviewStatus.FLAGGED,
                categories: [ReviewCategory.POLICY_VIOLATION],
                confidenceScore: 0.45,
                reviewNotes: 'AI may have provided solution code instead of guidance',
                supervisorFeedback: 'Need to review academic integrity guidelines with student',
                requiresFollowUp: true,
                reviewedAt: new Date(),
            },
            {
                conversationId: conversations[3].id,
                supervisorId: supervisors[1].id,
                studentId: conversations[3].studentId,
                status: ReviewStatus.PENDING,
                categories: [ReviewCategory.ACCURACY],
                confidenceScore: 0.78,
                reviewNotes: 'Awaiting review of database design recommendations',
                requiresFollowUp: false,
            },
            {
                conversationId: conversations[4].id,
                supervisorId: supervisors[2].id,
                studentId: conversations[4].studentId,
                status: ReviewStatus.APPROVED,
                categories: [ReviewCategory.ACCURACY, ReviewCategory.SAFETY],
                confidenceScore: 0.88,
                reviewNotes: 'Good security advice provided to student',
                supervisorFeedback: 'AI correctly identified security vulnerabilities',
                requiresFollowUp: false,
                reviewedAt: new Date(),
            },
        ];

        for (const review of reviews) {
            const existingReview = await reviewRepository.findOne({
                where: {
                    conversationId: review.conversationId,
                    supervisorId: review.supervisorId,
                },
            });

            if (!existingReview) {
                await reviewRepository.save(review);
                console.log(`Created AI interaction review for conversation ${review.conversationId}`);
            }
        }
    }

    private async createAnalyticsData(queryRunner: any, supervisors: User[]): Promise<void> {
        const analyticsRepository = queryRunner.manager.getRepository(SupervisorAnalytics);

        const currentDate = new Date();
        const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        const thisMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const analyticsData = [];

        for (const supervisor of supervisors) {
            // Last month metrics
            analyticsData.push(
                {
                    supervisorId: supervisor.id,
                    metricType: 'completion_rate',
                    value: Math.random() * 30 + 60, // 60-90%
                    periodStart: lastMonth,
                    periodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
                    metadata: { studentCount: Math.floor(Math.random() * 5) + 8 },
                },
                {
                    supervisorId: supervisor.id,
                    metricType: 'velocity',
                    value: Math.random() * 2 + 1, // 1-3 milestones per week
                    periodStart: lastMonth,
                    periodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
                    metadata: { averageTimeToComplete: Math.floor(Math.random() * 5) + 3 },
                },
                {
                    supervisorId: supervisor.id,
                    metricType: 'risk_score',
                    value: Math.random() * 0.3 + 0.1, // 0.1-0.4
                    periodStart: lastMonth,
                    periodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
                    metadata: { atRiskStudents: Math.floor(Math.random() * 3) + 1 },
                },
            );

            // This month metrics
            analyticsData.push(
                {
                    supervisorId: supervisor.id,
                    metricType: 'completion_rate',
                    value: Math.random() * 30 + 65, // 65-95%
                    periodStart: thisMonth,
                    periodEnd: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0),
                    metadata: { studentCount: Math.floor(Math.random() * 5) + 8 },
                },
                {
                    supervisorId: supervisor.id,
                    metricType: 'velocity',
                    value: Math.random() * 2 + 1.2, // 1.2-3.2 milestones per week
                    periodStart: thisMonth,
                    periodEnd: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0),
                    metadata: { averageTimeToComplete: Math.floor(Math.random() * 4) + 2 },
                },
                {
                    supervisorId: supervisor.id,
                    metricType: 'risk_score',
                    value: Math.random() * 0.25 + 0.05, // 0.05-0.3
                    periodStart: thisMonth,
                    periodEnd: new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0),
                    metadata: { atRiskStudents: Math.floor(Math.random() * 2) },
                },
            );
        }

        for (const analytics of analyticsData) {
            const existingAnalytics = await analyticsRepository.findOne({
                where: {
                    supervisorId: analytics.supervisorId,
                    metricType: analytics.metricType,
                    periodStart: analytics.periodStart,
                },
            });

            if (!existingAnalytics) {
                await analyticsRepository.save(analytics);
                console.log(`Created analytics data for supervisor ${analytics.supervisorId}: ${analytics.metricType}`);
            }
        }
    }
}

export default SupervisorDataSeeder;