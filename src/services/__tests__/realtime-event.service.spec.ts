import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeEventService, RealtimeEventData } from '../realtime-event.service';
import { RealtimeEvent } from '../../entities/realtime-event.entity';

describe('RealtimeEventService', () => {
    let service: RealtimeEventService;
    let repository: Repository<RealtimeEvent>;
    let eventEmitter: EventEmitter2;

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn(),
        }),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RealtimeEventService,
                {
                    provide: getRepositoryToken(RealtimeEvent),
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<RealtimeEventService>(RealtimeEventService);
        repository = module.get<Repository<RealtimeEvent>>(getRepositoryToken(RealtimeEvent));
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createEvent', () => {
        it('should create and save a realtime event', async () => {
            const eventData: RealtimeEventData = {
                type: 'milestone_progress',
                userId: 'user-123',
                role: 'student',
                data: { status: 'completed' },
            };

            const mockEvent = {
                id: 'event-123',
                ...eventData,
                timestamp: new Date(),
            };

            mockRepository.create.mockReturnValue(mockEvent);
            mockRepository.save.mockResolvedValue(mockEvent);

            const result = await service.createEvent(eventData);

            expect(mockRepository.create).toHaveBeenCalledWith({
                type: eventData.type,
                userId: eventData.userId,
                role: eventData.role,
                data: eventData.data,
                timestamp: expect.any(Date),
            });
            expect(mockRepository.save).toHaveBeenCalledWith(mockEvent);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith('realtime.event.created', mockEvent);
            expect(result).toEqual(mockEvent);
        });

        it('should handle role in event data', async () => {
            const eventData: RealtimeEventData = {
                type: 'ai_activity',
                userId: 'user-123',
                role: 'supervisor',
                data: { message: 'Hello' },
            };

            const mockEvent = { id: 'event-123', ...eventData };
            mockRepository.create.mockReturnValue(mockEvent);
            mockRepository.save.mockResolvedValue(mockEvent);

            await service.createEvent(eventData);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    role: 'supervisor',
                })
            );
        });

        it('should throw error when save fails', async () => {
            const eventData: RealtimeEventData = {
                type: 'system_health',
                data: { status: 'healthy' },
            };

            mockRepository.create.mockReturnValue({});
            mockRepository.save.mockRejectedValue(new Error('Database error'));

            await expect(service.createEvent(eventData)).rejects.toThrow('Database error');
        });
    });

    describe('getEventsByUser', () => {
        it('should return events for a specific user', async () => {
            const userId = 'user-123';
            const mockEvents = [
                { id: 'event-1', userId, type: 'milestone_progress' },
                { id: 'event-2', userId, type: 'project_stats' },
            ];

            mockRepository.find.mockResolvedValue(mockEvents);

            const result = await service.getEventsByUser(userId);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { userId },
                order: { timestamp: 'DESC' },
                take: 50,
            });
            expect(result).toEqual(mockEvents);
        });

        it('should respect custom limit', async () => {
            const userId = 'user-123';
            const limit = 10;

            await service.getEventsByUser(userId, limit);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { userId },
                order: { timestamp: 'DESC' },
                take: limit,
            });
        });
    });

    describe('getEventsByRole', () => {
        it('should return events for a specific role', async () => {
            const role = 'student';
            const mockEvents = [{ id: 'event-1', role, type: 'milestone_progress' }];

            mockRepository.find.mockResolvedValue(mockEvents);

            const result = await service.getEventsByRole(role);

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { role },
                order: { timestamp: 'DESC' },
                take: 50,
            });
            expect(result).toEqual(mockEvents);
        });
    });

    describe('deleteOldEvents', () => {
        it('should delete events older than specified days', async () => {
            const olderThanDays = 30;
            const mockQueryBuilder = mockRepository.createQueryBuilder();

            await service.deleteOldEvents(olderThanDays);

            expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
            expect(mockQueryBuilder.delete).toHaveBeenCalled();
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'timestamp < :cutoffDate',
                expect.objectContaining({ cutoffDate: expect.any(Date) })
            );
            expect(mockQueryBuilder.execute).toHaveBeenCalled();
        });
    });

    describe('convenience methods', () => {
        it('should create project stats event', async () => {
            const mockEvent = { id: 'event-123' };
            mockRepository.create.mockReturnValue(mockEvent);
            mockRepository.save.mockResolvedValue(mockEvent);

            await service.createProjectStatsEvent('user-123', 'student', { projectCount: 5 });

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'project_stats',
                    userId: 'user-123',
                    role: 'student',
                    data: { projectCount: 5 },
                })
            );
        });

        it('should create milestone progress event', async () => {
            const mockEvent = { id: 'event-123' };
            mockRepository.create.mockReturnValue(mockEvent);
            mockRepository.save.mockResolvedValue(mockEvent);

            await service.createMilestoneProgressEvent('user-123', 'student', { progress: 75 });

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'milestone_progress',
                    userId: 'user-123',
                    role: 'student',
                    data: { progress: 75 },
                })
            );
        });

        it('should create AI activity event', async () => {
            const mockEvent = { id: 'event-123' };
            mockRepository.create.mockReturnValue(mockEvent);
            mockRepository.save.mockResolvedValue(mockEvent);

            await service.createAIActivityEvent('user-123', 'student', { query: 'Hello' });

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'ai_activity',
                    userId: 'user-123',
                    role: 'student',
                    data: { query: 'Hello' },
                })
            );
        });
    });
});