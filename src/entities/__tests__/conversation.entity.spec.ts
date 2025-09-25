import { Conversation } from '../conversation.entity';
import { ConversationMessage } from '../conversation-message.entity';
import { User } from '../user.entity';
import { Project } from '../project.entity';
import { ConversationStatus } from '../../common/enums';
import { ConversationContext } from '../interfaces/conversation.interface';

describe('Conversation Entity', () => {
  let conversation: Conversation;
  let mockUser: User;
  let mockProject: Project;

  beforeEach(() => {
    mockUser = new User();
    mockUser.id = 'user-123';
    mockUser.email = 'student@ui.edu.ng';

    mockProject = new Project();
    mockProject.id = 'project-123';

    conversation = new Conversation();
    conversation.id = 'conv-123';
    conversation.student = mockUser;
    conversation.studentId = mockUser.id;
    conversation.title = 'FYP Guidance Session';
    conversation.status = ConversationStatus.ACTIVE;
    conversation.language = 'en';
    conversation.project = mockProject;
    conversation.projectId = mockProject.id;
  });

  describe('Entity Structure', () => {
    it('should create a conversation with all required fields', () => {
      expect(conversation.id).toBe('conv-123');
      expect(conversation.studentId).toBe('user-123');
      expect(conversation.title).toBe('FYP Guidance Session');
      expect(conversation.status).toBe(ConversationStatus.ACTIVE);
      expect(conversation.language).toBe('en');
      expect(conversation.projectId).toBe('project-123');
    });

    it('should have default values for optional fields', () => {
      const newConversation = new Conversation();
      expect(newConversation.status).toBeUndefined(); // Will be set by TypeORM default
      expect(newConversation.language).toBeUndefined(); // Will be set by TypeORM default
    });

    it('should allow nullable fields to be null', () => {
      conversation.context = null;
      conversation.project = null;
      conversation.projectId = null;
      conversation.lastMessageAt = null;

      expect(conversation.context).toBeNull();
      expect(conversation.project).toBeNull();
      expect(conversation.projectId).toBeNull();
      expect(conversation.lastMessageAt).toBeNull();
    });

    it('should handle JSONB context field', () => {
      const context: ConversationContext = {
        projectPhase: 'literature_review',
        specialization: 'machine_learning',
        recentTopics: ['methodology', 'data_collection'],
        preferences: {
          language: 'en',
          detailLevel: 'detailed',
        },
      };

      conversation.context = context;
      expect(conversation.context).toEqual(context);
      expect(conversation.context?.projectPhase).toBe('literature_review');
      expect(conversation.context?.preferences?.detailLevel).toBe('detailed');
    });
  });

  describe('Status Management', () => {
    it('should accept valid conversation statuses', () => {
      const statuses = [
        ConversationStatus.ACTIVE,
        ConversationStatus.ARCHIVED,
        ConversationStatus.ESCALATED,
      ];

      statuses.forEach((status) => {
        conversation.status = status;
        expect(conversation.status).toBe(status);
      });
    });
  });

  describe('Lifecycle Management Methods', () => {
    it('should archive conversation', () => {
      conversation.archive();
      expect(conversation.status).toBe(ConversationStatus.ARCHIVED);
    });

    it('should escalate conversation', () => {
      conversation.escalate();
      expect(conversation.status).toBe(ConversationStatus.ESCALATED);
    });

    it('should reactivate conversation', () => {
      conversation.status = ConversationStatus.ARCHIVED;
      conversation.reactivate();
      expect(conversation.status).toBe(ConversationStatus.ACTIVE);
    });

    it('should update last activity timestamp', () => {
      const beforeUpdate = new Date();
      conversation.updateLastActivity();
      const afterUpdate = new Date();

      expect(conversation.lastMessageAt).toBeDefined();
      expect(conversation.lastMessageAt!.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime(),
      );
      expect(conversation.lastMessageAt!.getTime()).toBeLessThanOrEqual(
        afterUpdate.getTime(),
      );
    });
  });

  describe('Status Check Methods', () => {
    it('should correctly identify active status', () => {
      conversation.status = ConversationStatus.ACTIVE;
      expect(conversation.isActive()).toBe(true);
      expect(conversation.isArchived()).toBe(false);
      expect(conversation.isEscalated()).toBe(false);
    });

    it('should correctly identify archived status', () => {
      conversation.status = ConversationStatus.ARCHIVED;
      expect(conversation.isActive()).toBe(false);
      expect(conversation.isArchived()).toBe(true);
      expect(conversation.isEscalated()).toBe(false);
    });

    it('should correctly identify escalated status', () => {
      conversation.status = ConversationStatus.ESCALATED;
      expect(conversation.isActive()).toBe(false);
      expect(conversation.isArchived()).toBe(false);
      expect(conversation.isEscalated()).toBe(true);
    });
  });

  describe('Relationships', () => {
    it('should have student relationship', () => {
      expect(conversation.student).toBe(mockUser);
      expect(conversation.studentId).toBe(mockUser.id);
    });

    it('should have optional project relationship', () => {
      expect(conversation.project).toBe(mockProject);
      expect(conversation.projectId).toBe(mockProject.id);

      // Test nullable project
      conversation.project = null;
      conversation.projectId = null;
      expect(conversation.project).toBeNull();
      expect(conversation.projectId).toBeNull();
    });

    it('should allow messages relationship', () => {
      expect(conversation.messages).toBeUndefined(); // Will be populated by TypeORM
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      expect(conversation.createdAt).toBeUndefined(); // Will be set by TypeORM
      expect(conversation.updatedAt).toBeUndefined(); // Will be set by TypeORM
    });
  });
});
