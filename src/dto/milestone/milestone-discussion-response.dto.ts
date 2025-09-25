import { DiscussionType, DiscussionStatus } from '../../entities';

export class DiscussionReplyResponseDto {
  id: string;
  content: string;
  author: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  };
  parentReplyId: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DiscussionResponseDto {
  id: string;
  title: string;
  content: string;
  type: DiscussionType;
  status: DiscussionStatus;
  isPinned: boolean;
  isUrgent: boolean;

  author: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  };

  milestone: {
    id: string;
    title: string;
    dueDate: Date;
    status: string;
  };

  replies: DiscussionReplyResponseDto[];
  repliesCount: number;

  resolvedBy: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  } | null;

  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PaginatedDiscussionResponseDto {
  discussions: DiscussionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
