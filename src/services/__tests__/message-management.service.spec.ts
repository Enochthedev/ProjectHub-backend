import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { MessageManagementService } from '../message-management.service';
import { ConversationMessage } from '../../entities/conversation-message.entity';
import { MessageRating } from '../../entities/message-rating.entity';
import { Conversation } from '../../entities/conversation.entity';
import { User } from '../../entities/user.entity';
import {
  MessageType,
  MessageStatus,
  ConversationStatus,
} from '../../common/enums';
import {
  BookmarkMessageDto,
  RateMessageDto,
  MessageSearchDto,
} from '../../dto/message';

describe('MessageManagementService', () => {
  let service: MessageManagementService;
  let messageRepository: jest.Mocked<Repository<ConversationMessage>>;
  let ratingRepository: jest.Mocked<Repository<MessageRating>>;
  let conversationRepository: jest.Mocked<Repository<Conversation>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  } as Partial<User> as User;

  const mockConversation = {
    id: 'conv-123',
    studentId: 'user-123',
    student: mockUser,
    title: 'Test Conversation',
    status: ConversationStatus.ACTIVE,
    language: 'en',
    messages: [],
    context: null,
    project: null,
    projectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: new Date(),
  } as Partial<Conversation> as Conversation;

  const mockMessage = {
    id: 'msg-123',
    conversationId: 'conv-123',
    conversation: mockConversation,
    type: MessageType.AI_RESPONSE,
    content: 'Test AI response about literature review',
    metadata: {
      processingTime: 1500,
      aiModel: 'distilbert-base-cased-distilled-squad',
      language: 'en',
      category: 'methodology',
    },
    confidenceScore: 0.85,
    sources: ['FYP Guidelines'],
    isBookmarked: false,
    status: MessageStatus.DELIVERED,
    ratings: [],
    averageRating: 0,
    ratingCount: 0,
    createdAt: new Date(),
    bookmark: jest.fn(),
    unbookmark: jest.fn(),
    markAsProcessing: jest.fn(),
    markAsDelivered: jest.fn(),
    markAsFailed: jest.fn(),
    updateRating: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageManagementService,
        {
          provide: getRepositoryToken(ConversationMessage),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MessageRating),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Conversation),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MessageManagementService>(MessageManagementService);
    messageRepository = module.get(getRepositoryToken(ConversationMessage));
    ratingRepository = module.get(getRepositoryToken(MessageRating));
    conversationRepository = module.get(getRepositoryToken(Conversation));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMessageById', () => {
    it('should return message when found and user has access', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);

      const result = await service.getMessageById('msg-123', 'user-123');

      expect(result).toBe(mockMessage);
      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        relations: ['conversation', 'conversation.student', 'ratings'],
      });
    });

    it('should throw NotFoundException when message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getMessageById('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own conversation', async () => {
      const otherUserMessage = {
        ...mockMessage,
        conversation: { ...mockConversation, studentId: 'other-user' },
      };
      messageRepository.findOne.mockResolvedValue(otherUserMessage as any);

      await expect(
        service.getMessageById('msg-123', 'user-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('bookmarkMessage', () => {
    const bookmarkDto: BookmarkMessageDto = {
      messageId: 'msg-123',
      note: 'Great explanation',
    };

    it('should bookmark message successfully', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);

      const result = await service.bookmarkMessage('user-123', bookmarkDto);

      expect(mockMessage.bookmark).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalledWith(mockMessage);
      expect(result.id).toBe('msg-123');
      expect(result.isBookmarked).toBe(false); // Mock doesn't change the value
    });

    it('should throw BadRequestException when message already bookmarked', async () => {
      const bookmarkedMessage = { ...mockMessage, isBookmarked: true };
      messageRepository.findOne.mockResolvedValue(bookmarkedMessage as any);

      await expect(
        service.bookmarkMessage('user-123', bookmarkDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should store bookmark note in metadata', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);

      await service.bookmarkMessage('user-123', bookmarkDto);

      expect(mockMessage.metadata).toEqual(
        expect.objectContaining({
          bookmarkNote: 'Great explanation',
          bookmarkedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('unbookmarkMessage', () => {
    it('should unbookmark message successfully', async () => {
      const bookmarkedMessage = { ...mockMessage, isBookmarked: true };
      messageRepository.findOne.mockResolvedValue(bookmarkedMessage as any);
      messageRepository.save.mockResolvedValue(bookmarkedMessage as any);

      const result = await service.unbookmarkMessage('user-123', 'msg-123');

      expect(bookmarkedMessage.unbookmark).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalledWith(bookmarkedMessage);
      expect(result.id).toBe('msg-123');
    });

    it('should throw BadRequestException when message not bookmarked', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);

      await expect(
        service.unbookmarkMessage('user-123', 'msg-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rateMessage', () => {
    const rateDto: RateMessageDto = {
      messageId: 'msg-123',
      rating: 4.5,
      feedback: 'Very helpful response',
    };

    it('should create new rating when user has not rated before', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);
      ratingRepository.findOne.mockResolvedValue(null);
      ratingRepository.create.mockReturnValue({} as MessageRating);
      ratingRepository.save.mockResolvedValue({} as MessageRating);
      messageRepository.save.mockResolvedValue(mockMessage);

      const result = await service.rateMessage('user-123', rateDto);

      expect(ratingRepository.create).toHaveBeenCalledWith({
        messageId: 'msg-123',
        userId: 'user-123',
        rating: 4.5,
        feedback: 'Very helpful response',
      });
      expect(mockMessage.updateRating).toHaveBeenCalledWith(4.5);
      expect(result.id).toBe('msg-123');
    });

    it('should update existing rating when user has rated before', async () => {
      const existingRating: MessageRating = {
        id: 'rating-123',
        messageId: 'msg-123',
        userId: 'user-123',
        rating: 3.0,
        feedback: 'Old feedback',
      } as MessageRating;

      messageRepository.findOne.mockResolvedValue(mockMessage);
      ratingRepository.findOne.mockResolvedValue(existingRating);
      ratingRepository.save.mockResolvedValue(existingRating);
      messageRepository.save.mockResolvedValue(mockMessage);

      await service.rateMessage('user-123', rateDto);

      expect(existingRating.rating).toBe(4.5);
      expect(existingRating.feedback).toBe('Very helpful response');
      expect(ratingRepository.save).toHaveBeenCalledWith(existingRating);
    });
  });

  describe('searchMessages', () => {
    const searchDto: MessageSearchDto = {
      query: 'literature review',
      bookmarkedOnly: true,
      limit: 10,
      offset: 0,
    };

    it('should search messages with filters', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMessage]),
      };

      messageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.searchMessages('user-123', searchDto);

      expect(result.total).toBe(5);
      expect(result.messages).toHaveLength(1);
      expect(result.hasMore).toBe(true); // 0 + 1 < 5, so hasMore should be true
    });
  });

  describe('getMessageStats', () => {
    it('should return message statistics for user', async () => {
      const messages = [
        {
          ...mockMessage,
          type: MessageType.AI_RESPONSE,
          isBookmarked: true,
          ratingCount: 2,
          averageRating: 4.0,
        },
        {
          ...mockMessage,
          type: MessageType.USER_QUERY,
          isBookmarked: false,
          ratingCount: 0,
          averageRating: 0,
        },
      ];

      const mockQueryBuilder = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(messages),
      };

      messageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getMessageStats('user-123');

      expect(result.total).toBe(2);
      expect(result.bookmarked).toBe(1);
      expect(result.rated).toBe(1);
      expect(result.averageRating).toBe(4.0);
      expect(result.byType[MessageType.AI_RESPONSE]).toBe(1); // Only first message has AI_RESPONSE type
      expect(result.byType[MessageType.USER_QUERY]).toBe(1); // Second message has USER_QUERY type
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status to processing', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);

      const result = await service.updateMessageStatus(
        'msg-123',
        MessageStatus.PROCESSING,
        'user-123',
      );

      expect(mockMessage.markAsProcessing).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalledWith(mockMessage);
      expect(result.id).toBe('msg-123');
    });

    it('should update message status to delivered', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);

      await service.updateMessageStatus(
        'msg-123',
        MessageStatus.DELIVERED,
        'user-123',
      );

      expect(mockMessage.markAsDelivered).toHaveBeenCalled();
    });

    it('should update message status to failed', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);
      messageRepository.save.mockResolvedValue(mockMessage);

      await service.updateMessageStatus(
        'msg-123',
        MessageStatus.FAILED,
        'user-123',
      );

      expect(mockMessage.markAsFailed).toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should delete user query message by marking as failed', async () => {
      const userMessage = { ...mockMessage, type: MessageType.USER_QUERY };
      messageRepository.findOne.mockResolvedValue(userMessage as any);
      messageRepository.save.mockResolvedValue(userMessage as any);

      await service.deleteMessage('msg-123', 'user-123');

      expect(userMessage.markAsFailed).toHaveBeenCalled();
      expect(messageRepository.save).toHaveBeenCalledWith(userMessage);
    });

    it('should throw BadRequestException when trying to delete non-user message', async () => {
      messageRepository.findOne.mockResolvedValue(mockMessage);

      await expect(
        service.deleteMessage('msg-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBookmarkedMessages', () => {
    it('should return bookmarked messages for user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMessage]),
      };

      messageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getBookmarkedMessages('user-123', 10, 0);

      expect(result.total).toBe(3);
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('getHighlyRatedMessages', () => {
    it('should return highly rated messages for user', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockMessage]),
      };

      messageRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getHighlyRatedMessages('user-123', 4.0, 10);

      expect(result.total).toBe(2);
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('getUserRating', () => {
    it('should return user rating for message', async () => {
      const mockRating: MessageRating = {
        id: 'rating-123',
        messageId: 'msg-123',
        userId: 'user-123',
        rating: 4.5,
        feedback: 'Great response',
      } as MessageRating;

      ratingRepository.findOne.mockResolvedValue(mockRating);

      const result = await service.getUserRating('user-123', 'msg-123');

      expect(result).toBe(mockRating);
      expect(ratingRepository.findOne).toHaveBeenCalledWith({
        where: {
          messageId: 'msg-123',
          userId: 'user-123',
        },
      });
    });

    it('should return null when no rating exists', async () => {
      ratingRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserRating('user-123', 'msg-123');

      expect(result).toBeNull();
    });
  });
});
