import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RealtimeEventService } from '../services/realtime-event.service';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { WebSocketRateLimiterService } from '../services/websocket-rate-limiter.service';

@Injectable()
@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
    namespace: '/realtime',
})
export class RealtimeGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(RealtimeGateway.name);
    private connectedUsers = new Map<
        string,
        { socket: Socket; userId: string }
    >();

    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly realtimeEventService: RealtimeEventService,
        private readonly realtimeNotificationService: RealtimeNotificationService,
        private readonly rateLimiterService: WebSocketRateLimiterService,
    ) { }

    afterInit(): void {
        this.logger.log('WebSocket Gateway initialized');
        this.rateLimiterService.startCleanupInterval();
    }

    private checkRateLimit(client: Socket, eventName: string): boolean {
        return this.rateLimiterService.checkRateLimit(client, eventName);
    }

    async handleConnection(client: Socket): Promise<void> {
        try {
            const token = this.extractToken(client);

            if (!token) {
                this.logger.warn(
                    `Client ${client.id} attempted to connect without token`,
                );
                client.disconnect();
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const payload = this.jwtService.verify(token);

            const user = await this.userRepository.findOne({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                where: { id: payload.sub },
            });

            if (!user) {
                this.logger.warn(`Invalid user for client ${client.id}`);
                client.disconnect();
                return;
            }

            // Store connection
            this.connectedUsers.set(client.id, { socket: client, userId: user.id });

            // Join user-specific room
            void client.join(`user:${user.id}`);

            // Join role-specific room
            void client.join(`role:${user.role}`);

            this.logger.log(`User ${user.id} connected with socket ${client.id}`);

            // Send connection confirmation
            client.emit('connected', {
                message: 'Successfully connected to real-time service',
                userId: user.id,
                timestamp: new Date().toISOString(),
            });

            // Send any pending notifications
            await this.sendPendingNotifications(user.id, client);
        } catch (error) {
            this.logger.error(`Connection error for client ${client.id}:`, error);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket): void {
        const connection = this.connectedUsers.get(client.id);
        if (connection) {
            this.logger.log(`User ${connection.userId} disconnected`);
            this.connectedUsers.delete(client.id);
        }
    }

    @SubscribeMessage('join-project')
    handleJoinProject(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { projectId: string },
    ): void {
        if (!this.checkRateLimit(client, 'join-project')) {
            return;
        }

        const connection = this.connectedUsers.get(client.id);
        if (!connection) return;

        void client.join(`project:${data.projectId}`);
        this.logger.log(
            `User ${connection.userId} joined project room ${data.projectId}`,
        );

        client.emit('joined-project', { projectId: data.projectId });
    }

    @SubscribeMessage('leave-project')
    handleLeaveProject(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { projectId: string },
    ): void {
        const connection = this.connectedUsers.get(client.id);
        if (!connection) return;

        void client.leave(`project:${data.projectId}`);
        this.logger.log(
            `User ${connection.userId} left project room ${data.projectId}`,
        );

        client.emit('left-project', { projectId: data.projectId });
    }

    @SubscribeMessage('join-conversation')
    handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        if (!this.checkRateLimit(client, 'join-conversation')) {
            return;
        }

        const connection = this.connectedUsers.get(client.id);
        if (!connection) return;

        void client.join(`conversation:${data.conversationId}`);
        this.logger.log(
            `User ${connection.userId} joined conversation room ${data.conversationId}`,
        );

        client.emit('joined-conversation', { conversationId: data.conversationId });
    }

    @SubscribeMessage('ai-typing-start')
    handleAITypingStart(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        if (!this.checkRateLimit(client, 'ai-typing-start')) {
            return;
        }

        const connection = this.connectedUsers.get(client.id);
        if (!connection) return;

        // Broadcast typing indicator to conversation room
        client.to(`conversation:${data.conversationId}`).emit('ai-typing', {
            conversationId: data.conversationId,
            isTyping: true,
            timestamp: new Date().toISOString(),
        });
    }

    @SubscribeMessage('ai-typing-stop')
    handleAITypingStop(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: string },
    ): void {
        if (!this.checkRateLimit(client, 'ai-typing-stop')) {
            return;
        }

        const connection = this.connectedUsers.get(client.id);
        if (!connection) return;

        // Broadcast typing stop to conversation room
        client.to(`conversation:${data.conversationId}`).emit('ai-typing', {
            conversationId: data.conversationId,
            isTyping: false,
            timestamp: new Date().toISOString(),
        });
    }

    // Public methods for other services to emit events
    emitToUser(userId: string, event: string, data: unknown): void {
        this.server.to(`user:${userId}`).emit(event, data);
    }

    emitToRole(role: string, event: string, data: unknown): void {
        this.server.to(`role:${role}`).emit(event, data);
    }

    emitToProject(projectId: string, event: string, data: unknown): void {
        this.server.to(`project:${projectId}`).emit(event, data);
    }

    emitToConversation(
        conversationId: string,
        event: string,
        data: unknown,
    ): void {
        this.server.to(`conversation:${conversationId}`).emit(event, data);
    }

    emitToAll(event: string, data: unknown): void {
        this.server.emit(event, data);
    }

    private extractToken(client: Socket): string | null {
        const authToken = client.handshake.auth?.token as string;
        const headerToken = client.handshake.headers?.authorization as string;

        return authToken || headerToken?.replace('Bearer ', '') || null;
    }

    private async sendPendingNotifications(
        userId: string,
        client: Socket,
    ): Promise<void> {
        try {
            const notifications =
                await this.realtimeNotificationService.getPendingNotifications(userId);

            for (const notification of notifications) {
                client.emit('notification', notification);
            }
        } catch (error) {
            this.logger.error(
                `Error sending pending notifications to user ${userId}:`,
                error,
            );
        }
    }

    getConnectedUserCount(): number {
        return this.connectedUsers.size;
    }

    getConnectedUsers(): string[] {
        return Array.from(this.connectedUsers.values()).map((conn) => conn.userId);
    }
}
