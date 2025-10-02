import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class WebSocketAuthGuard implements CanActivate {
    private readonly logger = new Logger(WebSocketAuthGuard.name);

    constructor(
        private readonly jwtService: JwtService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();

            // Check if user is already authenticated (from connection)
            if (client.data?.user) {
                return true;
            }

            const token = this.extractToken(client);
            if (!token) {
                throw new WsException('No token provided');
            }

            const payload = this.jwtService.verify(token);
            const user = await this.userRepository.findOne({ where: { id: payload.sub } });

            if (!user) {
                throw new WsException('Invalid token');
            }

            // Store user in socket data
            client.data.user = user;
            client.data.userId = user.id;

            return true;
        } catch (error) {
            this.logger.error('WebSocket authentication failed:', error);
            throw new WsException('Authentication failed');
        }
    }

    private extractToken(client: Socket): string | null {
        const token = client.handshake.auth?.token ||
            client.handshake.headers?.authorization?.replace('Bearer ', '');
        return token || null;
    }
}