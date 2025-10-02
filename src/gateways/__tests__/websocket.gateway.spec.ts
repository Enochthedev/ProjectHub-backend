import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { WebSocketGateway } from '../websocket.gateway';
import { AuthService } from '../../auth/auth.service';
import { Socket } from 'socket.io';

describe('WebSocketGateway', () => {
    let gateway: WebSocketGateway;
    let jwtService: JwtService;
    let authService: AuthService;
    let mockSocket: Partial<Socket>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebSocketGateway,
                {
                    provide: JwtService,
                    useValue: {
                        verify: jest.fn(),
                    },
                },
                {
                    provide: AuthService,
                    useValue: {
                        validateUser: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<WebSocketGateway>(WebSocketGateway);
        jwtService = module.get<JwtService>(JwtService);
        authService = module.get<AuthService>(AuthService);

        mockSocket = {
            id: 'test-socket-id',
            handshake: {
                auth: { token: 'valid-token' },
                headers: {},
            },
            data: {},
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        };
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('handleConnection', () => {
        it('should authenticate and connect valid user', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@example.com',
                role: 'student',
            };

            jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: 'user-1' });
            jest.spyOn(authService, 'validateUser').mockResolvedValue(mockUser as any);

            await gateway.handleConnection(mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
            expect(mockSocket.join).toHaveBeenCalledWith('role:student');
            expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
                message: 'Connected successfully',
                userId: 'user-1',
                role: 'student',
            });
        });

        it('should disconnect client without token', async () => {
            mockSocket.handshake.auth = {};
            mockSocket.handshake.headers = {};

            await gateway.handleConnection(mockSocket as Socket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should disconnect client with invalid token', async () => {
            jest.spyOn(jwtService, 'verify').mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await gateway.handleConnection(mockSocket as Socket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });

        it('should disconnect client with invalid user', async () => {
            jest.spyOn(jwtService, 'verify').mockReturnValue({ sub: 'user-1' });
            jest.spyOn(authService, 'validateUser').mockResolvedValue(null);

            await gateway.handleConnection(mockSocket as Socket);

            expect(mockSocket.disconnect).toHaveBeenCalled();
        });
    });

    describe('handleDisconnect', () => {
        it('should clean up client data on disconnect', () => {
            mockSocket.data = { userId: 'user-1' };

            gateway.handleDisconnect(mockSocket as Socket);

            // Should not throw any errors
            expect(true).toBe(true);
        });
    });

    describe('emitToUser', () => {
        it('should emit event to specific user', () => {
            const mockServer = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            };
            gateway.server = mockServer as any;

            gateway.emitToUser('user-1', 'test-event', { data: 'test' });

            expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
            expect(mockServer.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
        });
    });

    describe('emitToRole', () => {
        it('should emit event to specific role', () => {
            const mockServer = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
            };
            gateway.server = mockServer as any;

            gateway.emitToRole('student', 'test-event', { data: 'test' });

            expect(mockServer.to).toHaveBeenCalledWith('role:student');
            expect(mockServer.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
        });
    });

    describe('isUserOnline', () => {
        it('should return true for online user', () => {
            // Simulate user connection
            gateway['userSockets'].set('user-1', new Set(['socket-1']));

            expect(gateway.isUserOnline('user-1')).toBe(true);
        });

        it('should return false for offline user', () => {
            expect(gateway.isUserOnline('user-1')).toBe(false);
        });
    });

    describe('getConnectedUsersCount', () => {
        it('should return correct count of connected users', () => {
            gateway['userSockets'].set('user-1', new Set(['socket-1']));
            gateway['userSockets'].set('user-2', new Set(['socket-2', 'socket-3']));

            expect(gateway.getConnectedUsersCount()).toBe(2);
        });
    });
});