import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RealtimeEvent } from '../entities/realtime-event.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface RealtimeEventData {
  type:
    | 'project_stats'
    | 'milestone_progress'
    | 'ai_activity'
    | 'user_activity'
    | 'system_health';
  userId?: string;
  role?: 'student' | 'supervisor' | 'admin';
  data: Record<string, unknown>;
}

@Injectable()
export class RealtimeEventService {
  private readonly logger = new Logger(RealtimeEventService.name);

  constructor(
    @InjectRepository(RealtimeEvent)
    private readonly realtimeEventRepository: Repository<RealtimeEvent>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createEvent(eventData: RealtimeEventData): Promise<RealtimeEvent> {
    try {
      const event = this.realtimeEventRepository.create({
        type: eventData.type,
        userId: eventData.userId,
        role: eventData.role,
        data: eventData.data,
        timestamp: new Date(),
      });

      const savedEvent = await this.realtimeEventRepository.save(event);

      // Emit event for real-time processing
      this.eventEmitter.emit('realtime.event.created', savedEvent);

      this.logger.log(
        `Created realtime event: ${eventData.type} for user ${eventData.userId}`,
      );

      return savedEvent;
    } catch (error) {
      this.logger.error('Error creating realtime event:', error);
      throw error;
    }
  }

  async getEventsByUser(
    userId: string,
    limit: number = 50,
  ): Promise<RealtimeEvent[]> {
    return this.realtimeEventRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getEventsByRole(
    role: string,
    limit: number = 50,
  ): Promise<RealtimeEvent[]> {
    return this.realtimeEventRepository.find({
      where: { role },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async getRecentEvents(limit: number = 100): Promise<RealtimeEvent[]> {
    return this.realtimeEventRepository.find({
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  async deleteOldEvents(olderThanDays: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await this.realtimeEventRepository
      .createQueryBuilder()
      .delete()
      .where('timestamp < :cutoffDate', { cutoffDate })
      .execute();

    this.logger.log(`Deleted realtime events older than ${olderThanDays} days`);
  }

  // Convenience methods for specific event types
  async createProjectStatsEvent(
    userId: string,
    role: string,
    data: Record<string, unknown>,
  ) {
    return this.createEvent({
      type: 'project_stats',
      userId,
      role: role as 'student' | 'supervisor' | 'admin',
      data,
    });
  }

  async createMilestoneProgressEvent(
    userId: string,
    role: string,
    data: Record<string, unknown>,
  ) {
    return this.createEvent({
      type: 'milestone_progress',
      userId,
      role: role as 'student' | 'supervisor' | 'admin',
      data,
    });
  }

  async createAIActivityEvent(
    userId: string,
    role: string,
    data: Record<string, unknown>,
  ) {
    return this.createEvent({
      type: 'ai_activity',
      userId,
      role: role as 'student' | 'supervisor' | 'admin',
      data,
    });
  }

  async createUserActivityEvent(
    userId: string,
    role: string,
    data: Record<string, unknown>,
  ) {
    return this.createEvent({
      type: 'user_activity',
      userId,
      role: role as 'student' | 'supervisor' | 'admin',
      data,
    });
  }

  async createSystemHealthEvent(data: Record<string, unknown>) {
    return this.createEvent({
      type: 'system_health',
      data,
    });
  }
}
