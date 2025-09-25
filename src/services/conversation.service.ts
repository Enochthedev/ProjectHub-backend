import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, FindManyOptions } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { ConversationStatus, MessageType } from '../common/enums';
import { ConversationContext } from '../entities/interfaces/conversation.interface';
import { ConversationCacheService } from './conversation-cache.service';

export interface CreateConversationDto {
  studentId: string;
  title: string;
  projectId?: string;
  language?: string;
  initialQuery?: string;
}

export interface ConversationSearchOptions {
  studentId?: string;
  status?: ConversationStatus;
  projectId?: string;
  language?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
  sortOrder?: 'ASC' | 'DESC';
}

export interface ConversationLimits {
  maxConversationsPerUser: number;
  maxMessagesPerConversation: number;
  autoArchiveDays: number;
}

@Injectable()
export class ConversationService {
  private readonly conversationLimits: ConversationLimits = {
    maxConversationsPerUser: 50,
    maxMessagesPerConversation: 100,
    autoArchiveDays: 30,
  };

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly cacheService: ConversationCacheService,
  ) {}

  /**
   * Create a new conversation with optional initial message
   */
  async createConversation(
    createDto: CreateConversationDto,
  ): Promise<Conversation> {
    // Validate student exists
    const student = await this.userRepository.findOne({
      where: { id: createDto.studentId },
    });
    if (!student) {
      throw new NotFoundException(
        `Student with ID ${createDto.studentId} not found`,
      );
    }

    // Check conversation limits
    await this.enforceConversationLimits(createDto.studentId);

    // Validate project if provided
    let project: Project | null = null;
    if (createDto.projectId) {
      project = await this.projectRepository.findOne({
        where: { id: createDto.projectId },
      });
      if (!project) {
        throw new NotFoundException(
          `Project with ID ${createDto.projectId} not found`,
        );
      }
    }

    // Create conversation
    const conversation = this.conversationRepository.create({
      studentId: createDto.studentId,
      title: createDto.title,
      projectId: createDto.projectId || null,
      language: createDto.language || 'en',
      status: ConversationStatus.ACTIVE,
      lastMessageAt: new Date(),
    });

    const savedConversation =
      await this.conversationRepository.save(conversation);

    // Add initial message if provided
    if (createDto.initialQuery) {
      await this.addMessage(savedConversation.id, {
        type: MessageType.USER_QUERY,
        content: createDto.initialQuery,
      });
    }

    return this.getConversationById(savedConversation.id);
  }

  /**
   * Get conversation by ID with messages (with caching)
   */
  async getConversationById(conversationId: string): Promise<Conversation> {
    // Try cache first
    const cached =
      await this.cacheService.getCachedConversation(conversationId);
    if (cached) {
      await this.cacheService.updateCacheStats('context', true);
      return cached;
    }

    await this.cacheService.updateCacheStats('context', false);

    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['student', 'project', 'messages'],
      order: {
        messages: {
          createdAt: 'ASC',
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    // Cache the conversation
    await this.cacheService.setCachedConversation(conversationId, conversation);
    if (conversation.messages) {
      await this.cacheService.setCachedMessages(
        conversationId,
        conversation.messages,
      );
    }

    return conversation;
  }

  /**
   * Search and filter conversations
   */
  async searchConversations(options: ConversationSearchOptions): Promise<{
    conversations: Conversation[];
    total: number;
  }> {
    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.student', 'student')
      .leftJoinAndSelect('conversation.project', 'project')
      .leftJoin('conversation.messages', 'messages')
      .addSelect('COUNT(messages.id)', 'messageCount')
      .groupBy('conversation.id, student.id, project.id');

    // Apply filters
    if (options.studentId) {
      queryBuilder.andWhere('conversation.studentId = :studentId', {
        studentId: options.studentId,
      });
    }

    if (options.status) {
      queryBuilder.andWhere('conversation.status = :status', {
        status: options.status,
      });
    }

    if (options.projectId) {
      queryBuilder.andWhere('conversation.projectId = :projectId', {
        projectId: options.projectId,
      });
    }

    if (options.language) {
      queryBuilder.andWhere('conversation.language = :language', {
        language: options.language,
      });
    }

    if (options.search) {
      queryBuilder.andWhere(
        '(conversation.title ILIKE :search OR messages.content ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // Apply sorting
    const sortBy = options.sortBy || 'lastMessageAt';
    const sortOrder = options.sortOrder || 'DESC';
    queryBuilder.orderBy(`conversation.${sortBy}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    if (options.limit) {
      queryBuilder.limit(options.limit);
    }
    if (options.offset) {
      queryBuilder.offset(options.offset);
    }

    const conversations = await queryBuilder.getMany();

    return { conversations, total };
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    conversationId: string,
    studentId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getConversationById(conversationId);

    // Verify ownership if studentId provided
    if (studentId && conversation.studentId !== studentId) {
      throw new BadRequestException(
        'You can only archive your own conversations',
      );
    }

    conversation.archive();
    await this.conversationRepository.save(conversation);

    return conversation;
  }

  /**
   * Reactivate an archived conversation
   */
  async reactivateConversation(
    conversationId: string,
    studentId?: string,
  ): Promise<Conversation> {
    const conversation = await this.getConversationById(conversationId);

    // Verify ownership if studentId provided
    if (studentId && conversation.studentId !== studentId) {
      throw new BadRequestException(
        'You can only reactivate your own conversations',
      );
    }

    conversation.reactivate();
    await this.conversationRepository.save(conversation);

    return conversation;
  }

  /**
   * Escalate a conversation for human review
   */
  async escalateConversation(
    conversationId: string,
    reason?: string,
  ): Promise<Conversation> {
    const conversation = await this.getConversationById(conversationId);

    conversation.escalate();

    // Add system message about escalation
    await this.addMessage(conversationId, {
      type: MessageType.SYSTEM_MESSAGE,
      content: `Conversation escalated for human review. ${reason ? `Reason: ${reason}` : ''}`,
    });

    await this.conversationRepository.save(conversation);

    return conversation;
  }

  /**
   * Update conversation context (with cache invalidation)
   */
  async updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>,
  ): Promise<Conversation> {
    const conversation = await this.getConversationById(conversationId);

    conversation.context = {
      ...conversation.context,
      ...context,
      lastActivity: new Date(),
    };

    await this.conversationRepository.save(conversation);

    // Invalidate cache since conversation was updated
    await this.cacheService.invalidateConversationCache(conversationId);

    // Cache the updated context
    if (conversation.context) {
      await this.cacheService.setCachedContext(
        conversationId,
        conversation.context,
      );
    }

    return conversation;
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    messageData: {
      type: MessageType;
      content: string;
      metadata?: any;
      confidenceScore?: number;
      sources?: string[];
    },
  ): Promise<ConversationMessage> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException(
        `Conversation with ID ${conversationId} not found`,
      );
    }

    // Check message limits
    if (
      conversation.messages.length >=
      this.conversationLimits.maxMessagesPerConversation
    ) {
      throw new BadRequestException(
        `Conversation has reached maximum message limit of ${this.conversationLimits.maxMessagesPerConversation}`,
      );
    }

    const message = this.messageRepository.create({
      conversationId,
      type: messageData.type,
      content: messageData.content,
      metadata: messageData.metadata || null,
      confidenceScore: messageData.confidenceScore || null,
      sources: messageData.sources || [],
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation last activity
    conversation.updateLastActivity();
    await this.conversationRepository.save(conversation);

    // Invalidate conversation cache since new message was added
    await this.cacheService.invalidateConversationCache(conversationId);

    return savedMessage;
  }

  /**
   * Get conversation statistics for a student
   */
  async getConversationStats(studentId: string): Promise<{
    total: number;
    active: number;
    archived: number;
    escalated: number;
    totalMessages: number;
  }> {
    const conversations = await this.conversationRepository.find({
      where: { studentId },
      relations: ['messages'],
    });

    const stats = {
      total: conversations.length,
      active: conversations.filter(
        (c) => c.status === ConversationStatus.ACTIVE,
      ).length,
      archived: conversations.filter(
        (c) => c.status === ConversationStatus.ARCHIVED,
      ).length,
      escalated: conversations.filter(
        (c) => c.status === ConversationStatus.ESCALATED,
      ).length,
      totalMessages: conversations.reduce(
        (sum, c) => sum + c.messages.length,
        0,
      ),
    };

    return stats;
  }

  /**
   * Cleanup old conversations (archive inactive ones)
   */
  async cleanupOldConversations(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.conversationLimits.autoArchiveDays,
    );

    const result = await this.conversationRepository
      .createQueryBuilder()
      .update(Conversation)
      .set({ status: ConversationStatus.ARCHIVED })
      .where('lastMessageAt < :cutoffDate', { cutoffDate })
      .andWhere('status = :status', { status: ConversationStatus.ACTIVE })
      .execute();

    return result.affected || 0;
  }

  /**
   * Delete old archived conversations permanently
   */
  async deleteOldArchivedConversations(
    olderThanDays: number = 90,
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.conversationRepository
      .createQueryBuilder()
      .delete()
      .where('updatedAt < :cutoffDate', { cutoffDate })
      .andWhere('status = :status', { status: ConversationStatus.ARCHIVED })
      .execute();

    return result.affected || 0;
  }

  /**
   * Enforce conversation limits for a user
   */
  private async enforceConversationLimits(studentId: string): Promise<void> {
    const activeConversations = await this.conversationRepository.count({
      where: {
        studentId,
        status: ConversationStatus.ACTIVE,
      },
    });

    if (
      activeConversations >= this.conversationLimits.maxConversationsPerUser
    ) {
      throw new BadRequestException(
        `Maximum active conversation limit of ${this.conversationLimits.maxConversationsPerUser} reached. Please archive some conversations first.`,
      );
    }
  }

  /**
   * Get conversation limits configuration
   */
  getConversationLimits(): ConversationLimits {
    return { ...this.conversationLimits };
  }

  /**
   * Update conversation limits (for admin use)
   */
  updateConversationLimits(limits: Partial<ConversationLimits>): void {
    Object.assign(this.conversationLimits, limits);
  }
}
