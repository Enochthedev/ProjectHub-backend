import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Socket } from 'socket.io';
import { RealtimeGateway } from '../realtime.gateway';
import { AuthService } from '../../auth/auth.service';
import { RealtimeEventService } from '../../services/realtime-event.service';
import { RealtimeNotificationService } from '../../services/realtime-notification.service';
import { WebSocketRateLimiterService } from '../../services/websocket-rate-limiter.service';
import { RealtimeEvent } from '../../entities/realtime-event.entity';
import { RealtimeNotification } from '../../entities/realtime-notification.entity';

describe('RealtimeGateway', () => {
    let gateway: RealtimeGateway;
    let jwtService: JwtService;
    let authService: AuthService;
    let realtimeEventService: RealtimeEventService;
    let realtimeNotificationService: RealtimeNotificationService;
    let rateLimiterService: WebSocketRateLimiterService;

    const mockSocket = {
        id: 'test-socket-id',
        handshake: {
            auth: { token: 'valid-token' },
            headers: {},
            address: '127.0.0.1',
        },
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        to: jest.fn().mockReturnThis(),
        disconnect: jest.fn(),
    } as unknown as Socket;

    const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'student',
        isActive: true,
    };

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
            delete: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn(),
        }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RealtimeGateway,
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn().mockReturnValue({ sub: 'user-123' }),
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateUser: jest.fn().mockResolvedValue(mockUser),
                    },
                },
                {
                    provide: RealtimeEventService,
                    useValue: {
                        createEvent: jest.fn(),
                        getEventsByUser: jest.fn(),
                    },
                },
                {
                    provide: RealtimeNotificationService,
                    useValue: {
                        getPendingNotifications: jest.fn().mockResolvedValue([]),
                        createNotification: jest.fn(),
                    },
                },
                {
                    provide: WebSocketRateLimiterService,
                    useValue: {
                        checkRateLimit: jest.fn().mockReturnValue(true),
                        startCleanupInterval: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(RealtimeEvent),
                    useValue: mockRepository,
                },
                {
                    provide: getRepositoryToken(RealtimeNotification),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        gateway = module.get<RealtimeGateway>(RealtimeGateway);
        jwtService = module.get<JwtService>(JwtService);
        authService = module.get<AuthService>(AuthService);
        realtimeEventService = module.get<RealtimeEventService>(RealtimeEventService);
        realtimeNotificationService = module.get<RealtimeNotificationService>(RealtimeNotificationService);
        rateLimiterService = module.get<WebSocketRateLimiterService>(WebSocketRateLimiterService);

        // Mock server
        gateway.server = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('afterInit', () => {
        it('should initialize gateway and start rate limiter cleanup', () => {
            const mockServer = {} as any;

            gateway.afterInit(mockServer);

            expect(rateLimiterService.startCleanupInterval).toHaveBeenCalled();
        });
    });

    describe('handleConnection', () => {
        it('should successfully connect authenticated user', async () => {
            await gateway.handleConnection(mockSocket);

            expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
            expect(authService.validateUser).toHaveBeenCalledWith('user-123');
            expect(mockSocket.join).toHaveBeenCalledWith('user:user-123');
            expect(mockSocket.join).toHaveBeenCalledWith('role:student');
            expect(mockSocket.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
                message: 'Successfully connected to real-time service',
                userId: 'user-123',
            }));
        });

        it('should disconnect client without token', async () => {
            const socketWithoutToken = {
                ...mockSocket,
                handshake: { auth: {}, headers: {} },
            } as unknown as Socket;

            await gateway.handleConnection(socketWithoutToken);

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should disconnect client with invalid token', async () => {
            jest.spyOn(jwtService, 'verify').mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await gateway.handleConnection(mockSocket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should disconnect client with invalid user', async () => {
            jest.spyOn(authService, 'validateUser').mockResolvedValue(null);

            await gateway.handleConnection(mockSocket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });
    });

    describe('handleJoinProject', () => {
        beforeEach(async () => {
            await gateway.handleConnection(mockSocket);
        });

        it('should join project room when rate limit allows', async () => {
            const projectData = { projectId: 'project-123' };

            await gateway.handleJoinProject(mockSocket, projectData);

            expect(rateLimiterService.checkRateLimit).toHaveBeenCalledWith(mockSocket, 'join-project');
            expect(mockSocket.join).toHaveBeenCalledWith('project:project-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('joined-project', { projectId: 'project-123' });
        });

        it('should not join project room when rate limited', async () => {
            jest.spyOn(rateLimiterService, 'checkRateLimit').mockReturnValue(false);
            const projectData = { projectId: 'project-123' };

            await gateway.handleJoinProject(mockSocket, projectData);

            expect(mockSocket.join).not.toHaveBeenCalledWith('project:project-123');
            expect(mockSocket.emit).not.toHaveBeenCalledWith('joined-project', expect.any(Object));
        });
    });

    describe('handleJoinConversation', () => {
        beforeEach(async () => {
            await gateway.handleConnection(mockSocket);
        });

        it('should join conversation room when rate limit allows', async () => {
            const conversationData = { conversationId: 'conv-123' };

            await gateway.handleJoinConversation(mockSocket, conversationData);

            expect(rateLimiterService.checkRateLimit).toHaveBeenCalledWith(mockSocket, 'join-conversation');
            expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('joined-conversation', { conversationId: 'conv-123' });
        });
    });

    describe('handleAITypingStart', () => {
        beforeEach(async () => {
            await gateway.handleConnection(mockSocket);
        });

        it('should broadcast typing indicator when rate limit allows', async () => {
            const typingData = { conversationId: 'conv-123' };

            await gateway.handleAITypingStart(mockSocket, typingData);

            expect(rateLimiterService.checkRateLimit).toHaveBeenCalledWith(mockSocket, 'ai-typing-start');
            expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('ai-typing', expect.objectContaining({
                conversationId: 'conv-123',
                isTyping: true,
            }));
        });
    });

    describe('handleAITypingStop', () => {
        beforeEach(async () => {
            await gateway.handleConnection(mockSocket);
        });

        it('should broadcast typing stop when rate limit allows', async () => {
            const typingData = { conversationId: 'conv-123' };

            await gateway.handleAITypingStop(mockSocket, typingData);

            expect(rateLimiterService.checkRateLimit).toHaveBeenCalledWith(mockSocket, 'ai-typing-stop');
            expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-123');
            expect(mockSocket.emit).toHaveBeenCalledWith('ai-typing', expect.objectContaining({
                conversationId: 'conv-123',
                isTyping: false,
            }));
        });
    });

    describe('emitToUser', () => {
        it('should emit event to specific user', async () => {
            await gateway.emitToUser('user-123', 'test-event', { data: 'test' });

            expect(gateway.server.to).toHaveBeenCalledWith('user:user-123');
            expect(gateway.server.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
        });
    });

    describe('emitToRole', () => {
        it('should emit event to specific role', async () => {
            await gateway.emitToRole('student', 'test-event', { data: 'test' });

            expect(gateway.server.to).toHaveBeenCalledWith('role:student');
            expect(gateway.server.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
        });
    });

    describe('emitToProject', () => {
        it('should emit event to specific project', async () => {
            await gateway.emitToProject('project-123', 'test-event', { data: 'test' });

            expect(gateway.server.to).toHaveBeenCalledWith('project:project-123');
            expect(gateway.server.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
        });
    });

    describe('getConnectedUserCount', () => {
        it('should return correct connected user count', async () => {
            await gateway.handleConnection(mockSocket);

            const count = gateway.getConnectedUserCount();

            expect(count).toBe(1);
        });
    });

    describe('getConnectedUsers', () => {
        it('should return list of connected user IDs', async () => {
            await gateway.handleConnection(mockSocket);

            const users = gateway.getConnectedUsers();

            expect(users).toEqual(['user-123']);
        });
    });
});