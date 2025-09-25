import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MilestoneDiscussion,
  MilestoneDiscussionReply,
  SharedMilestone,
  User,
  DiscussionStatus,
} from '../entities';
import {
  CreateDiscussionDto,
  UpdateDiscussionDto,
  ResolveDiscussionDto,
  CreateDiscussionReplyDto,
  UpdateDiscussionReplyDto,
  DiscussionFiltersDto,
  DiscussionResponseDto,
  DiscussionReplyResponseDto,
  PaginatedDiscussionResponseDto,
} from '../dto/milestone';

@Injectable()
export class MilestoneDiscussionService {
  constructor(
    @InjectRepository(MilestoneDiscussion)
    private readonly discussionRepository: Repository<MilestoneDiscussion>,
    @InjectRepository(MilestoneDiscussionReply)
    private readonly replyRepository: Repository<MilestoneDiscussionReply>,
    @InjectRepository(SharedMilestone)
    private readonly sharedMilestoneRepository: Repository<SharedMilestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createDiscussion(
    createDto: CreateDiscussionDto,
    authorId: string,
  ): Promise<DiscussionResponseDto> {
    // Verify milestone exists and user has access
    const milestone = await this.sharedMilestoneRepository.findOne({
      where: { id: createDto.milestoneId },
      relations: ['assignees'],
    });

    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }

    // Check if user is assigned to the milestone
    const isAssigned = milestone.assignees.some(
      (assignee) => assignee.id === authorId,
    );
    if (!isAssigned && milestone.createdById !== authorId) {
      throw new ForbiddenException('You do not have access to this milestone');
    }

    const discussion = this.discussionRepository.create({
      milestoneId: createDto.milestoneId,
      title: createDto.title,
      content: createDto.content,
      type: createDto.type,
      authorId,
      isPinned: createDto.isPinned || false,
      isUrgent: createDto.isUrgent || false,
    });

    const savedDiscussion = await this.discussionRepository.save(discussion);
    return this.getDiscussionById(savedDiscussion.id);
  }

  async getDiscussionById(id: string): Promise<DiscussionResponseDto> {
    const discussion = await this.discussionRepository.findOne({
      where: { id },
      relations: [
        'author',
        'author.studentProfile',
        'milestone',
        'replies',
        'replies.author',
        'replies.author.studentProfile',
        'resolvedBy',
        'resolvedBy.studentProfile',
      ],
      order: {
        replies: {
          createdAt: 'ASC',
        },
      },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    return this.mapToResponseDto(discussion);
  }

  async getDiscussionsByMilestone(
    milestoneId: string,
    filters?: DiscussionFiltersDto,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedDiscussionResponseDto> {
    const queryBuilder = this.discussionRepository
      .createQueryBuilder('discussion')
      .leftJoinAndSelect('discussion.author', 'author')
      .leftJoinAndSelect('author.studentProfile', 'authorProfile')
      .leftJoinAndSelect('discussion.milestone', 'milestone')
      .leftJoinAndSelect('discussion.replies', 'replies')
      .leftJoinAndSelect('replies.author', 'replyAuthor')
      .leftJoinAndSelect('replyAuthor.studentProfile', 'replyAuthorProfile')
      .leftJoinAndSelect('discussion.resolvedBy', 'resolvedBy')
      .leftJoinAndSelect('resolvedBy.studentProfile', 'resolvedByProfile')
      .where('discussion.milestoneId = :milestoneId', { milestoneId });

    if (filters?.type) {
      queryBuilder.andWhere('discussion.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('discussion.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.isPinned !== undefined) {
      queryBuilder.andWhere('discussion.isPinned = :isPinned', {
        isPinned: filters.isPinned,
      });
    }

    if (filters?.isUrgent !== undefined) {
      queryBuilder.andWhere('discussion.isUrgent = :isUrgent', {
        isUrgent: filters.isUrgent,
      });
    }

    if (filters?.authorId) {
      queryBuilder.andWhere('discussion.authorId = :authorId', {
        authorId: filters.authorId,
      });
    }

    // Order by pinned first, then urgent, then creation date
    queryBuilder
      .orderBy('discussion.isPinned', 'DESC')
      .addOrderBy('discussion.isUrgent', 'DESC')
      .addOrderBy('discussion.createdAt', 'DESC');

    const total = await queryBuilder.getCount();
    const discussions = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      discussions: discussions.map((discussion) =>
        this.mapToResponseDto(discussion),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateDiscussion(
    id: string,
    updateDto: UpdateDiscussionDto,
    userId: string,
  ): Promise<DiscussionResponseDto> {
    const discussion = await this.discussionRepository.findOne({
      where: { id },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Only author can update discussion
    if (discussion.authorId !== userId) {
      throw new ForbiddenException('You can only update your own discussions');
    }

    // Cannot update resolved discussions
    if (discussion.status === DiscussionStatus.RESOLVED) {
      throw new BadRequestException('Cannot update resolved discussions');
    }

    if (updateDto.title) discussion.title = updateDto.title;
    if (updateDto.content) discussion.content = updateDto.content;
    if (updateDto.type) discussion.type = updateDto.type;
    if (updateDto.isPinned !== undefined)
      discussion.isPinned = updateDto.isPinned;
    if (updateDto.isUrgent !== undefined)
      discussion.isUrgent = updateDto.isUrgent;

    await this.discussionRepository.save(discussion);
    return this.getDiscussionById(id);
  }

  async resolveDiscussion(
    id: string,
    resolveDto: ResolveDiscussionDto,
    userId: string,
  ): Promise<DiscussionResponseDto> {
    const discussion = await this.discussionRepository.findOne({
      where: { id },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Check if user can resolve this discussion
    if (!discussion.canBeResolvedBy(userId)) {
      throw new ForbiddenException(
        'You do not have permission to resolve this discussion',
      );
    }

    discussion.status = resolveDto.status;
    discussion.resolutionNotes = resolveDto.resolutionNotes || null;

    if (resolveDto.status === DiscussionStatus.RESOLVED) {
      discussion.resolvedById = userId;
      discussion.resolvedAt = new Date();
    } else {
      discussion.resolvedById = null;
      discussion.resolvedAt = null;
    }

    await this.discussionRepository.save(discussion);
    return this.getDiscussionById(id);
  }

  async deleteDiscussion(id: string, userId: string): Promise<void> {
    const discussion = await this.discussionRepository.findOne({
      where: { id },
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Only author can delete discussion
    if (discussion.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own discussions');
    }

    await this.discussionRepository.remove(discussion);
  }

  async createReply(
    createDto: CreateDiscussionReplyDto,
    authorId: string,
  ): Promise<DiscussionReplyResponseDto> {
    // Verify discussion exists and user has access
    const discussion = await this.discussionRepository.findOne({
      where: { id: createDto.discussionId },
      relations: ['milestone', 'milestone.assignees'],
    });

    if (!discussion) {
      throw new NotFoundException('Discussion not found');
    }

    // Check if user has access to the milestone
    const isAssigned = discussion.milestone.assignees.some(
      (assignee) => assignee.id === authorId,
    );
    if (!isAssigned && discussion.milestone.createdById !== authorId) {
      throw new ForbiddenException('You do not have access to this discussion');
    }

    // Verify parent reply exists if provided
    if (createDto.parentReplyId) {
      const parentReply = await this.replyRepository.findOne({
        where: {
          id: createDto.parentReplyId,
          discussionId: createDto.discussionId,
        },
      });

      if (!parentReply) {
        throw new NotFoundException('Parent reply not found');
      }
    }

    const reply = this.replyRepository.create({
      discussionId: createDto.discussionId,
      content: createDto.content,
      authorId,
      parentReplyId: createDto.parentReplyId || null,
    });

    const savedReply = await this.replyRepository.save(reply);
    return this.getReplyById(savedReply.id);
  }

  async getReplyById(id: string): Promise<DiscussionReplyResponseDto> {
    const reply = await this.replyRepository.findOne({
      where: { id },
      relations: ['author', 'author.studentProfile'],
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    return this.mapReplyToResponseDto(reply);
  }

  async updateReply(
    id: string,
    updateDto: UpdateDiscussionReplyDto,
    userId: string,
  ): Promise<DiscussionReplyResponseDto> {
    const reply = await this.replyRepository.findOne({
      where: { id },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (!reply.canBeEditedBy(userId)) {
      throw new ForbiddenException('You can only edit your own replies');
    }

    reply.content = updateDto.content;
    reply.isEdited = true;
    reply.editedAt = new Date();

    await this.replyRepository.save(reply);
    return this.getReplyById(id);
  }

  async deleteReply(id: string, userId: string): Promise<void> {
    const reply = await this.replyRepository.findOne({
      where: { id },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    if (!reply.canBeDeletedBy(userId)) {
      throw new ForbiddenException('You can only delete your own replies');
    }

    await this.replyRepository.remove(reply);
  }

  private mapToResponseDto(
    discussion: MilestoneDiscussion,
  ): DiscussionResponseDto {
    return {
      id: discussion.id,
      title: discussion.title,
      content: discussion.content,
      type: discussion.type,
      status: discussion.status,
      isPinned: discussion.isPinned,
      isUrgent: discussion.isUrgent,
      author: {
        id: discussion.author.id,
        email: discussion.author.email,
        studentProfile: discussion.author.studentProfile
          ? {
              name: discussion.author.studentProfile.name,
            }
          : undefined,
      },
      milestone: {
        id: discussion.milestone.id,
        title: discussion.milestone.title,
        dueDate: discussion.milestone.dueDate,
        status: discussion.milestone.status,
      },
      replies:
        discussion.replies?.map((reply) => this.mapReplyToResponseDto(reply)) ||
        [],
      repliesCount: discussion.getRepliesCount(),
      resolvedBy: discussion.resolvedBy
        ? {
            id: discussion.resolvedBy.id,
            email: discussion.resolvedBy.email,
            studentProfile: discussion.resolvedBy.studentProfile
              ? {
                  name: discussion.resolvedBy.studentProfile.name,
                }
              : undefined,
          }
        : null,
      resolvedAt: discussion.resolvedAt,
      resolutionNotes: discussion.resolutionNotes,
      createdAt: discussion.createdAt,
      updatedAt: discussion.updatedAt,
    };
  }

  private mapReplyToResponseDto(
    reply: MilestoneDiscussionReply,
  ): DiscussionReplyResponseDto {
    return {
      id: reply.id,
      content: reply.content,
      author: {
        id: reply.author.id,
        email: reply.author.email,
        studentProfile: reply.author.studentProfile
          ? {
              name: reply.author.studentProfile.name,
            }
          : undefined,
      },
      parentReplyId: reply.parentReplyId,
      isEdited: reply.isEdited,
      editedAt: reply.editedAt,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
    };
  }
}
