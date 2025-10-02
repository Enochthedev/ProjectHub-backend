import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeNotificationService } from '../real-time-notification.service';
import { RealtimeNotification } from '../../entities/realtime-notification.entity';
import { WebSocketGateway } from '../../gateways/websocket.gateway';

describe('RealtimeNotificationService', () => {
    let service: RealtimeNotificationService;
    let repository: Repository<RealtimeNotification>;
    let websocketGateway: WebSocketGateway;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RealtimeNotificationService,
                {
                    provide: getRepositoryToken(RealtimeNotification),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        find: jest.fn(),
                        update: jest.fn(),
                        count: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: WebSocketGateway,
                    useValue: {
                        emitToUser: jest.fn(),
                        emitToAll: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RealtimeNotificationService>(RealtimeNotificationService);
        repository = module.get<Repository<RealtimeNotification>>(getRepositoryToken(RealtimeNotification));
        websocketGateway = module.get<WebSocketGateway>(WebSocketGateway);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('sendNotification', () => {
        it('should save notification and emit to user', async () => {
            const mockNotification = {
                id: 'notification-1',
                type: 'milestone_deadline',
                title: 'Test Notification',
                message: 'Test message',
                userId: 'user-1',
                priority: 'medium',
                createdAt: new Date(),
            };

            jest.spyOn(repository, 'create').mockReturnValue(mockNotification as any);
            jest.spyOn(repository, 'save').mockResolvedValue(mockNotification as any);

            const payload = {
                type: 'milestone_deadline' as const,
                title: 'Test Notification',
                message: 'Test message',
                userId: 'user-1',
                priority: 'medium' as const,
            };

            await service.sendNotification(payload);

            expect(repository.create).toHaveBeenCalledWith(expect.objectContaining(payload));
            expect(repository.save).toHaveBeenCalledWith(mockNotification);
            expect(websocketGateway.emitToUser).toHaveBeenCalledWith(
                'user-1',
                'notification',
                expect.objectContaining({
                    id: 'notification-1',
                    ...payload,
                }),
            );
        });

        it('should broadcast to all users when no userId provided', async () => {
            const mockNotification = {
                id: 'notification-1',
                type: 'system_alert',
                title: 'System Alert',
                message: 'System maintenance',
                priority: 'high',
                createdAt: new Date(),
            };

            jest.spyOn(repository, 'create').mockReturnValue(mockNotification as any);
            jest.spyOn(repository, 'save').mockResolvedValue(mockNotification as any);

            const payload = {
                type: 'system_alert' as const,
                title: 'System Alert',
                message: 'System maintenance',
                priority: 'high' as const,
            };

            await service.sendNotification(payload);

            expect(websocketGateway.emitToAll).toHaveBeenCalledWith(
                'notification',
                expect.objectContaining({
                    id: 'notification-1',
                    ...payload,
                }),
            );
        });
    });

    describe('sendMilestoneDeadlineAlert', () => {
        it('should send milestone deadline alert with correct priority', async () => {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1); // Due tomorrow

            jest.spyOn(repository, 'create').mockReturnValue({} as any);
            jest.spyOn(repository, 'save').mockResolvedValue({} as any);

            await service.sendMilestoneDeadlineAlert('user-1', 'Test Milestone', dueDate);

            expect(repository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'milestone_deadline',
                    priority: 'urgent', // Should be urgent for 1 day
                }),
            );
        });
    });

    describe('markAsRead', () => {
        it('should mark notification as read and emit update', async () => {
            jest.spyOn(repository, 'update').mockResolvedValue({} as any);

            await service.markAsRead('notification-1', 'user-1');

            expect(repository.update).toHaveBeenCalledWith(
                { id: 'notification-1', userId: 'user-1' },
                expect.objectContaining({ isRead: true }),
            );
            expect(websocketGateway.emitToUser).toHaveBeenCalledWith(
                'user-1',
                'notification-read',
                { notificationId: 'notification-1' },
            );
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread notification count', async () => {
            jest.spyOn(repository, 'count').mockResolvedValue(5);

            const count = await service.getUnreadCount('user-1');

            expect(count).toBe(5);
            expect(repository.count).toHaveBeenCalledWith({
                where: { userId: 'user-1', isRead: false },
            });
        });
    });
});