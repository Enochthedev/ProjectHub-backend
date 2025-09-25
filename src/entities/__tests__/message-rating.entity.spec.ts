import { MessageRating } from '../message-rating.entity';
import { ConversationMessage } from '../conversation-message.entity';
import { User } from '../user.entity';

describe('MessageRating Entity', () => {
  let messageRating: MessageRating;
  let mockMessage: ConversationMessage;
  let mockUser: User;

  beforeEach(() => {
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    } as Partial<User> as User;

    mockMessage = {
      id: 'msg-123',
      content: 'Test message content',
    } as Partial<ConversationMessage> as ConversationMessage;

    messageRating = new MessageRating();
    messageRating.id = 'rating-123';
    messageRating.messageId = 'msg-123';
    messageRating.message = mockMessage;
    messageRating.userId = 'user-123';
    messageRating.user = mockUser;
    messageRating.rating = 4.0;
    messageRating.feedback = 'Very helpful response';
    messageRating.createdAt = new Date();
  });

  describe('Entity Properties', () => {
    it('should have all required properties', () => {
      expect(messageRating.id).toBe('rating-123');
      expect(messageRating.messageId).toBe('msg-123');
      expect(messageRating.message).toBe(mockMessage);
      expect(messageRating.userId).toBe('user-123');
      expect(messageRating.user).toBe(mockUser);
      expect(messageRating.rating).toBe(4.0);
      expect(messageRating.feedback).toBe('Very helpful response');
      expect(messageRating.createdAt).toBeInstanceOf(Date);
    });

    it('should allow null feedback', () => {
      messageRating.feedback = null;
      expect(messageRating.feedback).toBeNull();
    });
  });

  describe('Helper Methods', () => {
    describe('isPositive', () => {
      it('should return true for ratings >= 4.0', () => {
        messageRating.rating = 4.0;
        expect(messageRating.isPositive()).toBe(true);

        messageRating.rating = 4.5;
        expect(messageRating.isPositive()).toBe(true);

        messageRating.rating = 5.0;
        expect(messageRating.isPositive()).toBe(true);
      });

      it('should return false for ratings < 4.0', () => {
        messageRating.rating = 3.9;
        expect(messageRating.isPositive()).toBe(false);

        messageRating.rating = 3.0;
        expect(messageRating.isPositive()).toBe(false);

        messageRating.rating = 1.0;
        expect(messageRating.isPositive()).toBe(false);
      });
    });

    describe('isNegative', () => {
      it('should return true for ratings <= 2.0', () => {
        messageRating.rating = 2.0;
        expect(messageRating.isNegative()).toBe(true);

        messageRating.rating = 1.5;
        expect(messageRating.isNegative()).toBe(true);

        messageRating.rating = 1.0;
        expect(messageRating.isNegative()).toBe(true);
      });

      it('should return false for ratings > 2.0', () => {
        messageRating.rating = 2.1;
        expect(messageRating.isNegative()).toBe(false);

        messageRating.rating = 3.0;
        expect(messageRating.isNegative()).toBe(false);

        messageRating.rating = 5.0;
        expect(messageRating.isNegative()).toBe(false);
      });
    });

    describe('isNeutral', () => {
      it('should return true for ratings between 2.0 and 4.0 (exclusive)', () => {
        messageRating.rating = 2.1;
        expect(messageRating.isNeutral()).toBe(true);

        messageRating.rating = 3.0;
        expect(messageRating.isNeutral()).toBe(true);

        messageRating.rating = 3.9;
        expect(messageRating.isNeutral()).toBe(true);
      });

      it('should return false for ratings <= 2.0 or >= 4.0', () => {
        messageRating.rating = 2.0;
        expect(messageRating.isNeutral()).toBe(false);

        messageRating.rating = 4.0;
        expect(messageRating.isNeutral()).toBe(false);

        messageRating.rating = 1.0;
        expect(messageRating.isNeutral()).toBe(false);

        messageRating.rating = 5.0;
        expect(messageRating.isNeutral()).toBe(false);
      });
    });
  });

  describe('Rating Boundaries', () => {
    it('should handle minimum rating (1.0)', () => {
      messageRating.rating = 1.0;
      expect(messageRating.isNegative()).toBe(true);
      expect(messageRating.isNeutral()).toBe(false);
      expect(messageRating.isPositive()).toBe(false);
    });

    it('should handle maximum rating (5.0)', () => {
      messageRating.rating = 5.0;
      expect(messageRating.isPositive()).toBe(true);
      expect(messageRating.isNeutral()).toBe(false);
      expect(messageRating.isNegative()).toBe(false);
    });

    it('should handle boundary values correctly', () => {
      // Test 2.0 boundary
      messageRating.rating = 2.0;
      expect(messageRating.isNegative()).toBe(true);
      expect(messageRating.isNeutral()).toBe(false);

      // Test 4.0 boundary
      messageRating.rating = 4.0;
      expect(messageRating.isPositive()).toBe(true);
      expect(messageRating.isNeutral()).toBe(false);
    });
  });

  describe('Entity Creation', () => {
    it('should create a new MessageRating instance', () => {
      const newRating = new MessageRating();
      expect(newRating).toBeInstanceOf(MessageRating);
      expect(newRating.id).toBeUndefined();
      expect(newRating.rating).toBeUndefined();
      expect(newRating.feedback).toBeUndefined();
    });
  });
});
