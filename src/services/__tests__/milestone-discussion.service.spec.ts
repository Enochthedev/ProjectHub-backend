import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MilestoneDiscussionService } from '../milestone-discussion.service';
import {
  MilestoneDiscussion,
  MilestoneDiscussionReply,
  SharedMilestone,
  User,
  DiscussionType,
  DiscussionStatus,
} from '../../entities';
import {
  CreateDiscussionDto,
  CreateDiscussionReplyDto,
} from '../../dto/milestone';

describe('MilestoneDiscussionService', () => {
  let service: MilestoneDiscussionService;
  let discussionRepository: jest.Mocked<Repository<MilestoneDiscussion>>;
  let replyRepository: jest.Mocked<Repository<MilestoneDiscussionReply>>;
  let sharedMilestoneRepository: jest.Mocked<Repository<SharedMilestone>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    studentProfile: {
      name: 'John Doe',
    },
  } as any;

  const mockMilestone = {
    id: 'milestone-1',
    title: 'Test Milestone',
    createdById: 'user-1',
    assignees: [mockUser],
  } as any;

  const mockDiscussion = {
    id: 'discussion-1',
    title: 'Test Discussion',
    content: 'Test content',
    type: DiscussionType.GENERAL,
    status: DiscussionStatus.OPEN,
    authorId: 'user-1',
    milestoneId: 'milestone-1',
    author: mockUser,
    milestone: mockMilestone,
    replies: [],
    isPinned: false,
    isUrgent: false,
    resolvedBy: null,
    resolvedAt: null,
    resolutionNotes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    canBeResolvedBy: jest.fn().mockReturnValue(true),
    isActive: jest.fn().mockReturnValue(true),
    getRepliesCount: jest.fn().mockReturnValue(0),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneDiscussionService,
        {
          provide: getRepositoryToken(MilestoneDiscussion),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MilestoneDiscussionReply),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SharedMilestone),
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

    service = module.get<MilestoneDiscussionService>(
      MilestoneDiscussionService,
    );
    discussionRepository = module.get(getRepositoryToken(MilestoneDiscussion));
    replyRepository = module.get(getRepositoryToken(MilestoneDiscussionReply));
    sharedMilestoneRepository = module.get(getRepositoryToken(SharedMilestone));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('createDiscussion', () => {
    const createDto: CreateDiscussionDto = {
      milestoneId: 'milestone-1',
      title: 'Test Discussion',
      content: 'Test content',
      type: DiscussionType.GENERAL,
    };

    it('should create a discussion successfully', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(mockMilestone);
      discussionRepository.create.mockReturnValue(mockDiscussion);
      discussionRepository.save.mockResolvedValue(mockDiscussion);
      discussionRepository.findOne.mockResolvedValue(mockDiscussion);

      const result = await service.createDiscussion(createDto, 'user-1');

      expect(sharedMilestoneRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'milestone-1' },
        relations: ['assignees'],
      });
      expect(discussionRepository.create).toHaveBeenCalled();
      expect(discussionRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if milestone not found', async () => {
      sharedMilestoneRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createDiscussion(createDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not assigned to milestone', async () => {
      const milestoneWithoutUser = {
        ...mockMilestone,
        assignees: [],
        createdById: 'other-user',
      };
      sharedMilestoneRepository.findOne.mockResolvedValue(milestoneWithoutUser);

      await expect(
        service.createDiscussion(createDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDiscussionById', () => {
    it('should return discussion by id', async () => {
      discussionRepository.findOne.mockResolvedValue(mockDiscussion);

      const result = await service.getDiscussionById('discussion-1');

      expect(discussionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'discussion-1' },
        relations: expect.any(Array),
        order: expect.any(Object),
      });
      expect(result).toBeDefined();
      expect(result.id).toBe('discussion-1');
    });

    it('should throw NotFoundException if discussion not found', async () => {
      discussionRepository.findOne.mockResolvedValue(null);

      await expect(service.getDiscussionById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDiscussion', () => {
    const updateDto = {
      title: 'Updated Title',
      content: 'Updated content',
    };

    it('should update discussion successfully', async () => {
      discussionRepository.findOne.mockResolvedValue(mockDiscussion);
      discussionRepository.save.mockResolvedValue(mockDiscussion);

      const result = await service.updateDiscussion(
        'discussion-1',
        updateDto,
        'user-1',
      );

      expect(discussionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'discussion-1' },
      });
      expect(discussionRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const discussionByOtherUser = {
        ...mockDiscussion,
        authorId: 'other-user',
      };
      discussionRepository.findOne.mockResolvedValue(discussionByOtherUser);

      await expect(
        service.updateDiscussion('discussion-1', updateDto, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if discussion is resolved', async () => {
      const resolvedDiscussion = {
        ...mockDiscussion,
        status: DiscussionStatus.RESOLVED,
      };
      discussionRepository.findOne.mockResolvedValue(resolvedDiscussion);

      await expect(
        service.updateDiscussion('discussion-1', updateDto, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createReply', () => {
    const createReplyDto: CreateDiscussionReplyDto = {
      discussionId: 'discussion-1',
      content: 'Test reply',
    };

    const mockReply = {
      id: 'reply-1',
      content: 'Test reply',
      authorId: 'user-1',
      discussionId: 'discussion-1',
      author: mockUser,
      parentReplyId: null,
      isEdited: false,
      editedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    it('should create reply successfully', async () => {
      const discussionWithMilestone = {
        ...mockDiscussion,
        milestone: mockMilestone,
      };
      discussionRepository.findOne.mockResolvedValue(discussionWithMilestone);
      replyRepository.create.mockReturnValue(mockReply);
      replyRepository.save.mockResolvedValue(mockReply);
      replyRepository.findOne.mockResolvedValue(mockReply);

      const result = await service.createReply(createReplyDto, 'user-1');

      expect(discussionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'discussion-1' },
        relations: ['milestone', 'milestone.assignees'],
      });
      expect(replyRepository.create).toHaveBeenCalled();
      expect(replyRepository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if discussion not found', async () => {
      discussionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createReply(createReplyDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDiscussion', () => {
    it('should delete discussion successfully', async () => {
      discussionRepository.findOne.mockResolvedValue(mockDiscussion);
      discussionRepository.remove.mockResolvedValue(mockDiscussion);

      await service.deleteDiscussion('discussion-1', 'user-1');

      expect(discussionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'discussion-1' },
      });
      expect(discussionRepository.remove).toHaveBeenCalledWith(mockDiscussion);
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const discussionByOtherUser = {
        ...mockDiscussion,
        authorId: 'other-user',
      };
      discussionRepository.findOne.mockResolvedValue(discussionByOtherUser);

      await expect(
        service.deleteDiscussion('discussion-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
