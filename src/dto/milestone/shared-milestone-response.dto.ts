import { MilestoneStatus, Priority } from '../../common/enums';

export class AssignmentResponseDto {
  id: string;
  taskTitle: string;
  taskDescription: string | null;
  status: MilestoneStatus;
  estimatedHours: number;
  actualHours: number;
  notes: string | null;
  completedAt: Date | null;
  blockingReason: string | null;
  assignee: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  };
  assignedBy: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SharedMilestoneResponseDto {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: MilestoneStatus;
  priority: Priority;
  estimatedHours: number;
  actualHours: number;
  completedAt: Date | null;
  blockingReason: string | null;
  requiresAllApproval: boolean;
  progressPercentage: number;
  isOverdue: boolean;
  daysUntilDue: number;

  createdBy: {
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  };

  project: {
    id: string;
    title: string;
    specialization: string;
    isGroupProject: boolean;
  };

  assignees: Array<{
    id: string;
    email: string;
    studentProfile?: {
      name: string;
    };
  }>;

  assignments: AssignmentResponseDto[];

  createdAt: Date;
  updatedAt: Date;
}
