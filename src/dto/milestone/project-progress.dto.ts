import { ApiProperty } from '@nestjs/swagger';

export class MilestoneProgressDto {
  @ApiProperty({
    description: 'Milestone ID',
    example: 'uuid-string',
  })
  id: string;

  @ApiProperty({
    description: 'Milestone title',
    example: 'Complete Literature Review',
  })
  title: string;

  @ApiProperty({
    description: 'Milestone status',
    example: 'in_progress',
  })
  status: string;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 50,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Due date',
    example: '2024-03-15',
  })
  dueDate: string;

  @ApiProperty({
    description: 'Whether the milestone is overdue',
    example: false,
  })
  isOverdue: boolean;
}

export class ProjectProgressDto {
  @ApiProperty({
    description: 'Overall project completion percentage',
    example: 65.5,
  })
  overallProgress: number;

  @ApiProperty({
    description: 'Total number of milestones',
    example: 8,
  })
  totalMilestones: number;

  @ApiProperty({
    description: 'Number of completed milestones',
    example: 3,
  })
  completedMilestones: number;

  @ApiProperty({
    description: 'Number of in-progress milestones',
    example: 2,
  })
  inProgressMilestones: number;

  @ApiProperty({
    description: 'Number of blocked milestones',
    example: 1,
  })
  blockedMilestones: number;

  @ApiProperty({
    description: 'Number of overdue milestones',
    example: 1,
  })
  overdueMilestones: number;

  @ApiProperty({
    description: 'Estimated completion date based on current progress',
    example: '2024-06-15',
    nullable: true,
  })
  estimatedCompletionDate: string | null;

  @ApiProperty({
    description: 'Progress velocity (milestones per week)',
    example: 0.75,
  })
  progressVelocity: number;

  @ApiProperty({
    description: 'Individual milestone progress details',
    type: [MilestoneProgressDto],
  })
  milestones: MilestoneProgressDto[];

  @ApiProperty({
    description: 'Next upcoming milestone',
    type: MilestoneProgressDto,
    nullable: true,
  })
  nextMilestone: MilestoneProgressDto | null;
}
