import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { SupervisorProfile } from '../src/entities/supervisor-profile.entity';
import { SupervisorAvailability, AvailabilityType, DayOfWeek } from '../src/entities/supervisor-availability.entity';
import { AIInteractionReview, ReviewStatus, ReviewCategory } from '../src/entities/ai-interaction-review.entity';
import { Conversation } from '../src/entities/conversation.entity';
import { UserRole } from '../src/common/enums/user-role.enum';
import { JwtService } from '@nestjs/jwt';

describe('Supervisor Enhanced API (e2e)', () => {
    let app: INestApplication;
    let userRepository: Repository<User>;
    let supervisorProfileRepository: Repository<SupervisorProfile>;
    let availabilityRepository: Repository<SupervisorAvailability>;
    let reviewRepository: Repository<AIInteractionReview>;
    let conversationRepository: Repository<Conversation>;
    let jwtService: JwtService;

    let supervisorUser: User;
    let studentUser: User;
    let supervisorToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
        supervisorProfileRepository = moduleFixture.get<Repository<SupervisorProfile>>(
            getRepositoryToken(SupervisorProfile),
        );
        availabilityRepository = moduleFixture.get<Repository<SupervisorAvailability>>(
            getRepositoryToken(SupervisorAvailability),
        );
        reviewRepository = moduleFixture.get<Repository<AIInteractionReview>>(
            getRepositoryToken(AIInteractionReview),
        );
        conversationRepository = moduleFixture.get<Repository<Conversation>>(
            getRepositoryToken(Conversation),
        );
        jwtService = moduleFixture.get<JwtService>(JwtService);

        // Create test users
        await createTestData();
    });

    afterAll(async () => {
        await cleanupTestData();
        await app.close();
    });

    async function createTestData() {
        // Create supervisor user
        supervisorUser = await userRepository.save({
            email: 'supervisor@test.com',
            role: UserRole.SUPERVISOR,
            isEmailVerified: true,
            isActive: true,
        });

        // Create supervisor profile
        await supervisorProfileRepository.save({
            user: supervisorUser,
            name: 'Dr. Jane Smith',
            specializations: ['AI', 'Machine Learning'],
            maxStudents: 10,
            isAvailable: true,
        });

        // Create student user
        studentUser = await userRepository.save({
            email: 'student@test.com',
            role: UserRole.STUDENT,
            isEmailVerified: true,
            isActive: true,
        });

        // Generate JWT token for supervisor
        supervisorToken = jwtService.sign({
            sub: supervisorUser.id,
            email: supervisorUser.email,
            role: supervisorUser.role,
        });
    }

    async function cleanupTestData() {
        await reviewRepository.delete({});
        await conversationRepository.delete({});
        await availabilityRepository.delete({});
        await supervisorProfileRepository.delete({});
        await userRepository.delete({});
    }

    describe('/supervisor/availability (GET)', () => {
        it('should return supervisor availability', async () => {
            // Create test availability slot
            await availabilityRepository.save({
                supervisorId: supervisorUser.id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: '09:00',
                endTime: '17:00',
                location: 'Office 123',
                maxCapacity: 3,
                isActive: true,
            });

            const response = await request(app.getHttpServer())
                .get('/supervisor/availability')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('supervisorId', supervisorUser.id);
            expect(response.body).toHaveProperty('supervisorName', 'Dr. Jane Smith');
            expect(response.body).toHaveProperty('availabilitySlots');
            expect(response.body.availabilitySlots).toHaveLength(1);
            expect(response.body.availabilitySlots[0]).toMatchObject({
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: '09:00',
                endTime: '17:00',
                location: 'Office 123',
                maxCapacity: 3,
                isActive: true,
            });
        });

        it('should require authentication', async () => {
            await request(app.getHttpServer())
                .get('/supervisor/availability')
                .expect(401);
        });
    });

    describe('/supervisor/availability (POST)', () => {
        it('should create availability slot', async () => {
            const createDto = {
                type: AvailabilityType.MEETING_SLOTS,
                dayOfWeek: DayOfWeek.TUESDAY,
                startTime: '14:00',
                endTime: '16:00',
                location: 'Conference Room A',
                notes: 'Available for project consultations',
                maxCapacity: 2,
            };

            const response = await request(app.getHttpServer())
                .post('/supervisor/availability')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(createDto)
                .expect(201);

            expect(response.body).toMatchObject({
                type: AvailabilityType.MEETING_SLOTS,
                dayOfWeek: DayOfWeek.TUESDAY,
                startTime: '14:00',
                endTime: '16:00',
                location: 'Conference Room A',
                notes: 'Available for project consultations',
                maxCapacity: 2,
                isActive: true,
            });
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('createdAt');
        });

        it('should validate time format', async () => {
            const invalidDto = {
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: '25:00', // Invalid time
                endTime: '17:00',
            };

            await request(app.getHttpServer())
                .post('/supervisor/availability')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe('/supervisor/availability/:id (PUT)', () => {
        it('should update availability slot', async () => {
            // Create availability slot first
            const availability = await availabilityRepository.save({
                supervisorId: supervisorUser.id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.WEDNESDAY,
                startTime: '10:00',
                endTime: '15:00',
                maxCapacity: 1,
                isActive: true,
            });

            const updateDto = {
                startTime: '11:00',
                endTime: '16:00',
                maxCapacity: 3,
            };

            const response = await request(app.getHttpServer())
                .put(`/supervisor/availability/${availability.id}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(updateDto)
                .expect(200);

            expect(response.body).toMatchObject({
                id: availability.id,
                startTime: '11:00',
                endTime: '16:00',
                maxCapacity: 3,
            });
        });

        it('should return 404 for non-existent availability slot', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000';

            await request(app.getHttpServer())
                .put(`/supervisor/availability/${nonExistentId}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({ maxCapacity: 5 })
                .expect(404);
        });
    });

    describe('/supervisor/availability/:id (DELETE)', () => {
        it('should delete availability slot', async () => {
            // Create availability slot first
            const availability = await availabilityRepository.save({
                supervisorId: supervisorUser.id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.THURSDAY,
                startTime: '09:00',
                endTime: '12:00',
                maxCapacity: 2,
                isActive: true,
            });

            await request(app.getHttpServer())
                .delete(`/supervisor/availability/${availability.id}`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(204);

            // Verify deletion
            const deletedAvailability = await availabilityRepository.findOne({
                where: { id: availability.id },
            });
            expect(deletedAvailability).toBeNull();
        });
    });

    describe('/supervisor/ai-interactions (GET)', () => {
        it('should return AI interaction overview', async () => {
            const response = await request(app.getHttpServer())
                .get('/supervisor/ai-interactions')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('supervisorId', supervisorUser.id);
            expect(response.body).toHaveProperty('stats');
            expect(response.body).toHaveProperty('recentReviews');
            expect(response.body).toHaveProperty('priorityReviews');
            expect(response.body).toHaveProperty('lastUpdated');
        });
    });

    describe('/supervisor/ai-interactions/reviews (POST)', () => {
        it('should create AI interaction review', async () => {
            // Create a conversation first
            const conversation = await conversationRepository.save({
                studentId: studentUser.id,
                title: 'Test Conversation',
                status: 'active',
                language: 'en',
                messageCount: 1,
            });

            const createDto = {
                conversationId: conversation.id,
                status: ReviewStatus.PENDING,
                categories: [ReviewCategory.ACCURACY, ReviewCategory.APPROPRIATENESS],
                confidenceScore: 0.85,
                reviewNotes: 'AI response was accurate and appropriate',
            };

            const response = await request(app.getHttpServer())
                .post('/supervisor/ai-interactions/reviews')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(createDto)
                .expect(201);

            expect(response.body).toMatchObject({
                conversationId: conversation.id,
                status: ReviewStatus.PENDING,
                categories: [ReviewCategory.ACCURACY, ReviewCategory.APPROPRIATENESS],
                confidenceScore: 0.85,
                reviewNotes: 'AI response was accurate and appropriate',
            });
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('studentId', studentUser.id);
        });

        it('should return 404 for non-existent conversation', async () => {
            const nonExistentConversationId = '00000000-0000-0000-0000-000000000000';

            const createDto = {
                conversationId: nonExistentConversationId,
                status: ReviewStatus.PENDING,
                categories: [ReviewCategory.ACCURACY],
            };

            await request(app.getHttpServer())
                .post('/supervisor/ai-interactions/reviews')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(createDto)
                .expect(404);
        });
    });

    describe('/supervisor/ai-interactions/reviews/:id/approve (POST)', () => {
        it('should approve AI interaction review', async () => {
            // Create conversation and review first
            const conversation = await conversationRepository.save({
                studentId: studentUser.id,
                title: 'Test Conversation',
                status: 'active',
                language: 'en',
                messageCount: 1,
            });

            const review = await reviewRepository.save({
                conversationId: conversation.id,
                supervisorId: supervisorUser.id,
                studentId: studentUser.id,
                status: ReviewStatus.PENDING,
                categories: [ReviewCategory.ACCURACY],
                requiresFollowUp: false,
            });

            const response = await request(app.getHttpServer())
                .post(`/supervisor/ai-interactions/reviews/${review.id}/approve`)
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(response.body).toMatchObject({
                id: review.id,
                status: ReviewStatus.APPROVED,
            });
            expect(response.body).toHaveProperty('reviewedAt');
        });
    });

    describe('/supervisor/communication (GET)', () => {
        it('should return communication overview', async () => {
            const response = await request(app.getHttpServer())
                .get('/supervisor/communication')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('supervisorId', supervisorUser.id);
            expect(response.body).toHaveProperty('recentMessages');
            expect(response.body).toHaveProperty('upcomingMeetings');
            expect(response.body).toHaveProperty('pendingMeetings');
            expect(response.body).toHaveProperty('stats');
            expect(response.body.stats).toHaveProperty('totalMessagesSent');
            expect(response.body.stats).toHaveProperty('totalMeetingsScheduled');
        });
    });

    describe('/supervisor/communication/messages (POST)', () => {
        it('should send message to student', async () => {
            const sendMessageDto = {
                studentId: studentUser.id,
                subject: 'Project Update Required',
                content: 'Please provide an update on your project progress.',
                type: 'general',
                priority: 'normal',
            };

            const response = await request(app.getHttpServer())
                .post('/supervisor/communication/messages')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(sendMessageDto)
                .expect(201);

            expect(response.body).toMatchObject({
                studentId: studentUser.id,
                subject: 'Project Update Required',
                content: 'Please provide an update on your project progress.',
                type: 'general',
                priority: 'normal',
                isRead: false,
            });
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('sentAt');
        });

        it('should return 404 for non-existent student', async () => {
            const nonExistentStudentId = '00000000-0000-0000-0000-000000000000';

            const sendMessageDto = {
                studentId: nonExistentStudentId,
                subject: 'Test Message',
                content: 'Test content',
                type: 'general',
                priority: 'normal',
            };

            await request(app.getHttpServer())
                .post('/supervisor/communication/messages')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(sendMessageDto)
                .expect(404);
        });
    });

    describe('/supervisor/communication/meetings (POST)', () => {
        it('should schedule meeting with student', async () => {
            const scheduleMeetingDto = {
                studentId: studentUser.id,
                title: 'Project Progress Review',
                description: 'Discuss current progress and next milestones',
                proposedDateTime: '2024-04-15T14:00:00Z',
                duration: '60',
                location: 'Office 123',
                agenda: ['Review current progress', 'Discuss challenges', 'Plan next steps'],
                isVirtual: false,
            };

            const response = await request(app.getHttpServer())
                .post('/supervisor/communication/meetings')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send(scheduleMeetingDto)
                .expect(201);

            expect(response.body).toMatchObject({
                studentId: studentUser.id,
                title: 'Project Progress Review',
                description: 'Discuss current progress and next milestones',
                dateTime: '2024-04-15T14:00:00.000Z',
                duration: 60,
                location: 'Office 123',
                status: 'requested',
                agenda: ['Review current progress', 'Discuss challenges', 'Plan next steps'],
                isVirtual: false,
            });
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('createdAt');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid UUID parameters', async () => {
            await request(app.getHttpServer())
                .get('/supervisor/availability/invalid-uuid')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .expect(400);
        });

        it('should handle unauthorized access', async () => {
            await request(app.getHttpServer())
                .get('/supervisor/availability')
                .expect(401);
        });

        it('should handle invalid request body', async () => {
            await request(app.getHttpServer())
                .post('/supervisor/availability')
                .set('Authorization', `Bearer ${supervisorToken}`)
                .send({
                    type: 'invalid_type',
                    dayOfWeek: 'invalid_day',
                })
                .expect(400);
        });
    });
});