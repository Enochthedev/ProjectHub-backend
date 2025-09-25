import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, SelectQueryBuilder } from 'typeorm';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { MessageRating } from '../entities/message-rating.entity';
import { Conversation } from '../entities/conversation.entity';
import { User } from '../entities/user.entity';
import { MessageType, MessageStatus } from '../common/enums';
import {
  BookmarkMessageDto,
  RateMessageDto,
  MessageSearchDto,
  MessageResponseDto,
} from '../dto/message';

export interface MessageSearchResult {
  messages: MessageResponseDto[];
  total: number;
  hasMore: boolean;
}

export interface MessageStats {
  total: number;
  bookmarked: number;
  rated: number;
  averageRating: number;
  byType: Record<MessageType, number>;
  byStatus: Record<MessageStatus, number>;
}

@Injectable()
export class MessageManagementService {
  constructor(
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(MessageRating)
    private readonly ratingRepository: Repository<MessageRating>,
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get a message by ID with ownership validation
   */
  async getMessageById(
    messageId: string,
    userId?: string,
  ): Promise<ConversationMessage> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation', 'conversation.student', 'ratings'],
    });

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    // Validate ownership if userId provided
    if (userId && message.conversation.studentId !== userId) {
      throw new ForbiddenException(
        'You can only access messages from your own conversations',
      );
    }

    return message;
  }

  /**
   * Bookmark a message
   */
  async bookmarkMessage(
    userId: string,
    bookmarkDto: BookmarkMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.getMessageById(bookmarkDto.messageId, userId);

    if (message.isBookmarked) {
      throw new BadRequestException('Message is already bookmarked');
    }

    message.bookmark();

    // Store bookmark note in metadata if provided
    if (bookmarkDto.note) {
      message.metadata = {
        ...message.metadata,
        bookmarkNote: bookmarkDto.note,
        bookmarkedAt: new Date(),
      };
    }

    await this.messageRepository.save(message);

    return this.mapToResponseDto(message);
  }

  /**
   * Remove bookmark from a message
   */
  async unbookmarkMessage(
    userId: string,
    messageId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.getMessageById(messageId, userId);

    if (!message.isBookmarked) {
      throw new BadRequestException('Message is not bookmarked');
    }

    message.unbookmark();

    // Remove bookmark-related metadata
    if (message.metadata) {
      const { bookmarkNote, bookmarkedAt, ...restMetadata } =
        message.metadata as any;
      message.metadata = restMetadata;
    }

    await this.messageRepository.save(message);

    return this.mapToResponseDto(message);
  }

  /**
   * Rate a message
   */
  async rateMessage(
    userId: string,
    rateDto: RateMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.getMessageById(rateDto.messageId, userId);

    // Check if user already rated this message
    const existingRating = await this.ratingRepository.findOne({
      where: {
        messageId: rateDto.messageId,
        userId: userId,
      },
    });

    if (existingRating) {
      // Update existing rating
      const oldRating = existingRating.rating;
      existingRating.rating = rateDto.rating;
      existingRating.feedback = rateDto.feedback || null;

      await this.ratingRepository.save(existingRating);

      // Update message average rating
      this.updateMessageRating(message, oldRating, rateDto.rating);
    } else {
      // Create new rating
      const rating = this.ratingRepository.create({
        messageId: rateDto.messageId,
        userId: userId,
        rating: rateDto.rating,
        feedback: rateDto.feedback || null,
      });

      await this.ratingRepository.save(rating);

      // Update message average rating
      message.updateRating(rateDto.rating);
    }

    await this.messageRepository.save(message);

    return this.mapToResponseDto(message);
  }

  /**
   * Get user's rating for a message
   */
  async getUserRating(
    userId: string,
    messageId: string,
  ): Promise<MessageRating | null> {
    return this.ratingRepository.findOne({
      where: {
        messageId: messageId,
        userId: userId,
      },
    });
  }

  /**
   * Search messages with filters
   */
  async searchMessages(
    userId: string,
    searchDto: MessageSearchDto,
  ): Promise<MessageSearchResult> {
    const queryBuilder = this.createMessageSearchQuery(userId, searchDto);

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.limit(searchDto.limit || 20).offset(searchDto.offset || 0);

    const messages = await queryBuilder.getMany();
    const messageDtos = messages.map((message) =>
      this.mapToResponseDto(message),
    );

    const hasMore = (searchDto.offset || 0) + messages.length < total;

    return {
      messages: messageDtos,
      total,
      hasMore,
    };
  }

  /**
   * Get bookmarked messages for a user
   */
  async getBookmarkedMessages(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MessageSearchResult> {
    const searchDto: MessageSearchDto = {
      bookmarkedOnly: true,
      limit,
      offset,
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    return this.searchMessages(userId, searchDto);
  }

  /**
   * Get highly rated messages for a user
   */
  async getHighlyRatedMessages(
    userId: string,
    minRating: number = 4.0,
    limit: number = 50,
  ): Promise<MessageSearchResult> {
    const searchDto: MessageSearchDto = {
      minRating,
      limit,
      offset: 0,
      sortBy: 'averageRating',
      sortOrder: 'DESC',
    };

    return this.searchMessages(userId, searchDto);
  }

  /**
   * Get message statistics for a user
   */
  async getMessageStats(userId: string): Promise<MessageStats> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.studentId = :userId', { userId });

    const messages = await queryBuilder.getMany();

    const stats: MessageStats = {
      total: messages.length,
      bookmarked: messages.filter((m) => m.isBookmarked).length,
      rated: messages.filter((m) => m.ratingCount > 0).length,
      averageRating: this.calculateOverallAverageRating(messages),
      byType: {} as Record<MessageType, number>,
      byStatus: {} as Record<MessageStatus, number>,
    };

    // Count by type
    Object.values(MessageType).forEach((type) => {
      stats.byType[type] = messages.filter((m) => m.type === type).length;
    });

    // Count by status
    Object.values(MessageStatus).forEach((status) => {
      stats.byStatus[status] = messages.filter(
        (m) => m.status === status,
      ).length;
    });

    return stats;
  }

  /**
   * Get messages that need attention (low ratings, failed status, etc.)
   */
  async getMessagesNeedingAttention(
    userId: string,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .where('conversation.studentId = :userId', { userId })
      .andWhere(
        '(message.status = :failedStatus OR (message.averageRating <= :lowRating AND message.ratingCount >= :minRatingCount))',
        {
          failedStatus: MessageStatus.FAILED,
          lowRating: 2.0,
          minRatingCount: 2,
        },
      )
      .orderBy('message.createdAt', 'DESC')
      .limit(20)
      .getMany();

    return messages.map((message) => this.mapToResponseDto(message));
  }

  /**
   * Update message status
   */
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
    userId?: string,
  ): Promise<MessageResponseDto> {
    const message = await this.getMessageById(messageId, userId);

    switch (status) {
      case MessageStatus.PROCESSING:
        message.markAsProcessing();
        break;
      case MessageStatus.DELIVERED:
        message.markAsDelivered();
        break;
      case MessageStatus.FAILED:
        message.markAsFailed();
        break;
    }

    await this.messageRepository.save(message);

    return this.mapToResponseDto(message);
  }

  /**
   * Delete a message (soft delete by marking as failed)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.getMessageById(messageId, userId);

    // Only allow deletion of user's own messages
    if (message.type !== MessageType.USER_QUERY) {
      throw new BadRequestException(
        'You can only delete your own query messages',
      );
    }

    // Mark as failed instead of hard delete to maintain conversation integrity
    message.markAsFailed();
    await this.messageRepository.save(message);
  }

  /**
   * Create search query builder
   */
  private createMessageSearchQuery(
    userId: string,
    searchDto: MessageSearchDto,
  ): SelectQueryBuilder<ConversationMessage> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .where('conversation.studentId = :userId', { userId });

    // Apply filters
    if (searchDto.conversationId) {
      queryBuilder.andWhere('message.conversationId = :conversationId', {
        conversationId: searchDto.conversationId,
      });
    }

    if (searchDto.query) {
      queryBuilder.andWhere('message.content ILIKE :query', {
        query: `%${searchDto.query}%`,
      });
    }

    if (searchDto.type) {
      queryBuilder.andWhere('message.type = :type', { type: searchDto.type });
    }

    if (searchDto.status) {
      queryBuilder.andWhere('message.status = :status', {
        status: searchDto.status,
      });
    }

    if (searchDto.bookmarkedOnly) {
      queryBuilder.andWhere('message.isBookmarked = :bookmarked', {
        bookmarked: true,
      });
    }

    if (searchDto.minConfidence !== undefined) {
      queryBuilder.andWhere('message.confidenceScore >= :minConfidence', {
        minConfidence: searchDto.minConfidence,
      });
    }

    if (searchDto.minRating !== undefined) {
      queryBuilder.andWhere('message.averageRating >= :minRating', {
        minRating: searchDto.minRating,
      });
    }

    // Apply sorting
    const sortBy = searchDto.sortBy || 'createdAt';
    const sortOrder = searchDto.sortOrder || 'DESC';
    queryBuilder.orderBy(`message.${sortBy}`, sortOrder);

    return queryBuilder;
  }

  /**
   * Update message rating when a rating is changed
   */
  private updateMessageRating(
    message: ConversationMessage,
    oldRating: number,
    newRating: number,
  ): void {
    if (message.ratingCount === 0) {
      message.updateRating(newRating);
    } else {
      // Recalculate average: remove old rating and add new rating
      const totalRating =
        message.averageRating * message.ratingCount - oldRating + newRating;
      message.averageRating = Number(
        (totalRating / message.ratingCount).toFixed(2),
      );
    }
  }

  /**
   * Calculate overall average rating for multiple messages
   */
  private calculateOverallAverageRating(
    messages: ConversationMessage[],
  ): number {
    const ratedMessages = messages.filter((m) => m.ratingCount > 0);
    if (ratedMessages.length === 0) return 0;

    const totalWeightedRating = ratedMessages.reduce(
      (sum, message) => sum + message.averageRating * message.ratingCount,
      0,
    );
    const totalRatings = ratedMessages.reduce(
      (sum, message) => sum + message.ratingCount,
      0,
    );

    return Number((totalWeightedRating / totalRatings).toFixed(2));
  }

  /**
   * Map entity to response DTO
   */
  private mapToResponseDto(message: ConversationMessage): MessageResponseDto {
    return {
      id: message.id,
      conversationId: message.conversationId,
      type: message.type,
      content: message.content,
      metadata: message.metadata || undefined,
      confidenceScore: message.confidenceScore || undefined,
      sources: message.sources,
      isBookmarked: message.isBookmarked,
      status: message.status,
      averageRating: message.averageRating,
      ratingCount: message.ratingCount,
      createdAt: message.createdAt,
    };
  }
}
