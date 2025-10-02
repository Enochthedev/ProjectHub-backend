import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { RealtimeEventService } from '../services/realtime-event.service';
import { RealtimeNotificationService } from '../services/realtime-notification.service';
import { WebSocketRateLimiterService } from '../services/websocket-rate-limiter.service';
import { RealtimeEvent } from '../entities/realtime-event.entity';
import { RealtimeNotification } from '../entities/realtime-notification.entity';
import { User } from '../entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([RealtimeEvent, RealtimeNotification, User]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '24h' },
        }),
        AuthModule,
    ],
    providers: [
        RealtimeGateway,
        RealtimeEventService,
        RealtimeNotificationService,
        WebSocketRateLimiterService,
    ],
    exports: [
        RealtimeGateway,
        RealtimeEventService,
        RealtimeNotificationService,
        WebSocketRateLimiterService,
    ],
})
export class WebSocketModule { }