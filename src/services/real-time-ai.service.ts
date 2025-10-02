import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from '../gateways/realtime.gateway';
import { RealtimeNotificationService } from './real-time-notification.service';

export interface AITypingStatus {
    conversationId: string;
    isTyping: boolean;
    estimatedResponseTime?: number;
}

export interface AIResponseUpdate {
    conversationId: string;
    messageId: string;
    content?: string;
    isComplete: boolean;
    confidenceScore?: number;
    sources?: any[];
    suggestedFollowUps?: string[];
}

@Injectable()
export class RealtimeAIService {
    private readonly logger = new Logger(RealtimeAIService.name);
    private typingStatuses = new Map<string, NodeJS.Timeout>();

    constructor(
        private readonly websocketGateway: RealtimeGateway,
        private readonly notificationService: RealtimeNotificationService,
    ) { }

    async startTyping(userId: string, conversationId: string, estimatedResponseTime?: number): Promise<void> {
        // Clear any existing typing timeout
        this.stopTyping(userId, conversationId);

        // Send typing indicator
        this.websocketGateway.emitToUser(userId, 'ai-typing-start', {
            conversationId,
            isTyping: true,
            estimatedResponseTime,
            timestamp: new Date(),
        });

        // Set auto-stop timeout (max 30 seconds)
        const timeout = setTimeout(() => {
            this.stopTyping(userId, conversationId);
        }, Math.min(estimatedResponseTime || 10000, 30000));

        this.typingStatuses.set(`${userId}:${conversationId}`, timeout);

        this.logger.log(`AI typing started for user ${userId}, conversation ${conversationId}`);
    }

    async stopTyping(userId: string, conversationId: string): Promise<void> {
        const key = `${userId}:${conversationId}`;
        const timeout = this.typingStatuses.get(key);

        if (timeout) {
            clearTimeout(timeout);
            this.typingStatuses.delete(key);
        }

        // Send typing stop indicator
        this.websocketGateway.emitToUser(userId, 'ai-typing-stop', {
            conversationId,
            isTyping: false,
            timestamp: new Date(),
        });

        this.logger.log(`AI typing stopped for user ${userId}, conversation ${conversationId}`);
    }

    async sendPartialResponse(userId: string, update: AIResponseUpdate): Promise<void> {
        this.websocketGateway.emitToUser(userId, 'ai-response-partial', {
            ...update,
            timestamp: new Date(),
        });

        this.logger.log(`Partial AI response sent for conversation ${update.conversationId}`);
    }

    async sendCompleteResponse(userId: string, update: AIResponseUpdate): Promise<void> {
        // Stop typing indicator
        await this.stopTyping(userId, update.conversationId);

        // Send complete response
        this.websocketGateway.emitToUser(userId, 'ai-response-complete', {
            ...update,
            isComplete: true,
            timestamp: new Date(),
        });

        // Send notification if user is not actively viewing the conversation
        await this.notificationService.sendAIResponseNotification(userId, update.conversationId);

        this.logger.log(`Complete AI response sent for conversation ${update.conversationId}`);
    }

    async sendError(userId: string, conversationId: string, error: string): Promise<void> {
        // Stop typing indicator
        await this.stopTyping(userId, conversationId);

        // Send error
        this.websocketGateway.emitToUser(userId, 'ai-error', {
            conversationId,
            error,
            timestamp: new Date(),
        });

        this.logger.error(`AI error sent for conversation ${conversationId}: ${error}`);
    }

    async broadcastAIStatus(status: 'online' | 'offline' | 'maintenance' | 'degraded'): Promise<void> {
        this.websocketGateway.emitToAll('ai-status-update', {
            status,
            timestamp: new Date(),
        });

        this.logger.log(`AI status broadcasted: ${status}`);
    }

    async sendConversationUpdate(userId: string, conversationId: string, updateType: string, data: any): Promise<void> {
        this.websocketGateway.emitToUser(userId, 'conversation-update', {
            conversationId,
            updateType,
            data,
            timestamp: new Date(),
        });

        this.logger.log(`Conversation update sent: ${updateType} for ${conversationId}`);
    }

    async notifySupervisorOfEscalation(supervisorId: string, conversationId: string, studentId: string, reason: string): Promise<void> {
        this.websocketGateway.emitToUser(supervisorId, 'ai-escalation', {
            conversationId,
            studentId,
            reason,
            timestamp: new Date(),
        });

        // Also send notification
        await this.notificationService.sendNotification({
            type: 'system_alert',
            title: 'AI Conversation Escalated',
            message: `A student conversation requires your attention: ${reason}`,
            userId: supervisorId,
            priority: 'high',
            actionUrl: `/supervisor/ai-monitoring?conversation=${conversationId}`,
            data: { conversationId, studentId, reason },
        });

        this.logger.log(`AI escalation notified to supervisor ${supervisorId}`);
    }

    // Cleanup method to clear stale typing statuses
    cleanup(): void {
        for (const [key, timeout] of this.typingStatuses.entries()) {
            clearTimeout(timeout);
        }
        this.typingStatuses.clear();
        this.logger.log('AI typing statuses cleaned up');
    }
}