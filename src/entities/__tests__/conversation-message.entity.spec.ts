import { ConversationMessage } from '../conversation-message.entity';
import { Conversation } from '../conversation.entity';
import { MessageType, MessageStatus } from '../../common/enums';
import { MessageMetadata } from '../interfaces/conversation.interface';

describe('ConversationMessage Entity', () => {
  let message: ConversationMessage;
  let mockConversation: Conversation;

  beforeEach(() => {
    mockConversation = new Conversation();
    mockConversation.id = 'conv-123';

    message = new ConversationMessage();
    message.id = 'msg-123';
    message.conversation = mockConversation;
    message.conversationId = mockConversation.id;
    message.type = MessageType.USER_QUERY;
    message.content = 'What is a literature review?';
    message.status = MessageStatus.DELIVERED;
    message.isBookmarked = false;
    message.sources = [];
  });

  describe('Entity Structure', () => {
    it('should create a message with all required fields', () => {
      expect(message.id).toBe('msg-123');
      expect(message.conversationId).toBe('conv-123');
      expect(message.type).toBe(MessageType.USER_QUERY);
      expect(message.content).toBe('What is a literature review?');
      expect(message.status).toBe(MessageStatus.DELIVERED);
      expect(message.isBookmarked).toBe(false);
      expect(message.sources).toEqual([]);
    });

    it('should have default values for optional fields', () => {
      const newMessage = new ConversationMessage();
      expect(newMessage.status).toBeUndefined(); // Will be set by TypeORM default
      expect(newMessage.isBookmarked).toBeUndefined(); // Will be set by TypeORM default
      expect(newMessage.sources).toBeUndefined(); // Will be set by TypeORM default
    });

    it('should allow nullable fields to be null', () => {
      message.metadata = null;
      message.confidenceScore = null;

      expect(message.metadata).toBeNull();
      expect(message.confidenceScore).toBeNull();
    });

    it('should handle JSONB metadata field', () => {
      const metadata: MessageMetadata = {
        processingTime: 1500,
        aiModel: 'distilbert-base-cased-distilled-squad',
        language: 'en',
        category: 'literature_review',
        keywords: ['literature', 'review', 'research'],
        requiresHumanReview: false,
        contextUsed: {
          projectInfo: true,
          conversationHistory: true,
          knowledgeBase: false,
        },
      };

      message.metadata = metadata;
      expect(message.metadata).toEqual(metadata);
      expect(message.metadata?.processingTime).toBe(1500);
      expect(message.metadata?.contextUsed?.projectInfo).toBe(true);
    });

    it('should handle confidence score as decimal', () => {
      message.confidenceScore = 0.85;
      expect(message.confidenceScore).toBe(0.85);

      message.confidenceScore = 0.12;
      expect(message.confidenceScore).toBe(0.12);
    });

    it('should handle sources array', () => {
      message.sources = ['knowledge_base', 'project_guidelines', 'faq'];
      expect(message.sources).toEqual([
        'knowledge_base',
        'project_guidelines',
        'faq',
      ]);
    });
  });

  describe('Message Types', () => {
    it('should accept valid message types', () => {
      const types = [
        MessageType.USER_QUERY,
        MessageType.AI_RESPONSE,
        MessageType.TEMPLATE_RESPONSE,
        MessageType.SYSTEM_MESSAGE,
      ];

      types.forEach((type) => {
        message.type = type;
        expect(message.type).toBe(type);
      });
    });
  });

  describe('Message Status', () => {
    it('should accept valid message statuses', () => {
      const statuses = [
        MessageStatus.DELIVERED,
        MessageStatus.FAILED,
        MessageStatus.PROCESSING,
      ];

      statuses.forEach((status) => {
        message.status = status;
        expect(message.status).toBe(status);
      });
    });
  });

  describe('Bookmark Management Methods', () => {
    it('should bookmark message', () => {
      message.bookmark();
      expect(message.isBookmarked).toBe(true);
    });

    it('should unbookmark message', () => {
      message.isBookmarked = true;
      message.unbookmark();
      expect(message.isBookmarked).toBe(false);
    });
  });

  describe('Status Management Methods', () => {
    it('should mark message as processing', () => {
      message.markAsProcessing();
      expect(message.status).toBe(MessageStatus.PROCESSING);
    });

    it('should mark message as delivered', () => {
      message.markAsDelivered();
      expect(message.status).toBe(MessageStatus.DELIVERED);
    });

    it('should mark message as failed', () => {
      message.markAsFailed();
      expect(message.status).toBe(MessageStatus.FAILED);
    });
  });

  describe('Type Check Methods', () => {
    it('should correctly identify AI response', () => {
      message.type = MessageType.AI_RESPONSE;
      expect(message.isFromAI()).toBe(true);
      expect(message.isFromUser()).toBe(false);
      expect(message.isSystemMessage()).toBe(false);
    });

    it('should correctly identify user query', () => {
      message.type = MessageType.USER_QUERY;
      expect(message.isFromAI()).toBe(false);
      expect(message.isFromUser()).toBe(true);
      expect(message.isSystemMessage()).toBe(false);
    });

    it('should correctly identify system message', () => {
      message.type = MessageType.SYSTEM_MESSAGE;
      expect(message.isFromAI()).toBe(false);
      expect(message.isFromUser()).toBe(false);
      expect(message.isSystemMessage()).toBe(true);
    });

    it('should correctly identify template response', () => {
      message.type = MessageType.TEMPLATE_RESPONSE;
      expect(message.isFromAI()).toBe(false);
      expect(message.isFromUser()).toBe(false);
      expect(message.isSystemMessage()).toBe(false);
    });
  });

  describe('Confidence Score Methods', () => {
    it('should correctly identify high confidence', () => {
      message.confidenceScore = 0.85;
      expect(message.hasHighConfidence()).toBe(true);
      expect(message.hasLowConfidence()).toBe(false);
    });

    it('should correctly identify low confidence', () => {
      message.confidenceScore = 0.15;
      expect(message.hasHighConfidence()).toBe(false);
      expect(message.hasLowConfidence()).toBe(true);
    });

    it('should handle medium confidence', () => {
      message.confidenceScore = 0.5;
      expect(message.hasHighConfidence()).toBe(false);
      expect(message.hasLowConfidence()).toBe(false);
    });

    it('should handle null confidence score', () => {
      message.confidenceScore = null;
      expect(message.hasHighConfidence()).toBe(false);
      expect(message.hasLowConfidence()).toBe(false);
    });

    it('should handle edge cases for confidence thresholds', () => {
      message.confidenceScore = 0.7;
      expect(message.hasHighConfidence()).toBe(true);

      message.confidenceScore = 0.3;
      expect(message.hasLowConfidence()).toBe(false);

      message.confidenceScore = 0.29;
      expect(message.hasLowConfidence()).toBe(true);
    });
  });

  describe('Relationships', () => {
    it('should have conversation relationship', () => {
      expect(message.conversation).toBe(mockConversation);
      expect(message.conversationId).toBe(mockConversation.id);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt field', () => {
      expect(message.createdAt).toBeUndefined(); // Will be set by TypeORM
    });
  });
});
