import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone, User } from '@/entities';
import { MilestoneStatus, Priority } from '@/common/enums';

interface TimelineVisualizationOptions {
  studentId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
  includeCompleted?: boolean;
  groupBy?: 'status' | 'priority' | 'student';
}

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  status: MilestoneStatus;
  priority: Priority;
  studentEmail: string;
  estimatedHours: number;
  actualHours: number;
  completionPercentage: number;
  daysUntilDue: number;
  isOverdue: boolean;
}

interface TimelineVisualization {
  items: TimelineItem[];
  summary: {
    totalMilestones: number;
    completedMilestones: number;
    overdueMilestones: number;
    blockedMilestones: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    averageCompletionRate: number;
  };
  timeline: string;
}

@Injectable()
export class MilestoneTimelineVisualizerService {
  private readonly logger = new Logger(MilestoneTimelineVisualizerService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
  ) {}

  async generateTimelineVisualization(
    options: TimelineVisualizationOptions = {},
  ): Promise<TimelineVisualization> {
    this.logger.log('Generating milestone timeline visualization...');

    try {
      const milestones = await this.fetchMilestones(options);
      const timelineItems = this.processTimelineItems(milestones);
      const summary = this.calculateSummary(timelineItems);
      const timeline = this.generateASCIITimeline(timelineItems);

      return {
        items: timelineItems,
        summary,
        timeline,
      };
    } catch (error) {
      this.logger.error('Failed to generate timeline visualization', error);
      throw error;
    }
  }

  private async fetchMilestones(
    options: TimelineVisualizationOptions,
  ): Promise<Milestone[]> {
    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.student', 'student')
      .leftJoinAndSelect('milestone.project', 'project');

    if (options.studentId) {
      queryBuilder.andWhere('milestone.studentId = :studentId', {
        studentId: options.studentId,
      });
    }

    if (options.projectId) {
      queryBuilder.andWhere('milestone.projectId = :projectId', {
        projectId: options.projectId,
      });
    }

    if (options.startDate) {
      queryBuilder.andWhere('milestone.dueDate >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      queryBuilder.andWhere('milestone.dueDate <= :endDate', {
        endDate: options.endDate,
      });
    }

    if (!options.includeCompleted) {
      queryBuilder.andWhere('milestone.status != :completedStatus', {
        completedStatus: MilestoneStatus.COMPLETED,
      });
    }

    queryBuilder.orderBy('milestone.dueDate', 'ASC');

    return await queryBuilder.getMany();
  }

  private processTimelineItems(milestones: Milestone[]): TimelineItem[] {
    const now = new Date();

    return milestones.map((milestone) => {
      const daysUntilDue = Math.ceil(
        (milestone.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isOverdue =
        daysUntilDue < 0 && milestone.status !== MilestoneStatus.COMPLETED;

      let completionPercentage = 0;
      if (milestone.status === MilestoneStatus.COMPLETED) {
        completionPercentage = 100;
      } else if (milestone.status === MilestoneStatus.IN_PROGRESS) {
        completionPercentage =
          milestone.estimatedHours > 0
            ? Math.min(
                100,
                (milestone.actualHours / milestone.estimatedHours) * 100,
              )
            : 0;
      }

      return {
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        dueDate: milestone.dueDate,
        status: milestone.status,
        priority: milestone.priority,
        studentEmail: milestone.student.email,
        estimatedHours: milestone.estimatedHours,
        actualHours: milestone.actualHours,
        completionPercentage: Math.round(completionPercentage),
        daysUntilDue,
        isOverdue,
      };
    });
  }

  private calculateSummary(
    items: TimelineItem[],
  ): TimelineVisualization['summary'] {
    const totalMilestones = items.length;
    const completedMilestones = items.filter(
      (item) => item.status === MilestoneStatus.COMPLETED,
    ).length;
    const overdueMilestones = items.filter((item) => item.isOverdue).length;
    const blockedMilestones = items.filter(
      (item) => item.status === MilestoneStatus.BLOCKED,
    ).length;
    const totalEstimatedHours = items.reduce(
      (sum, item) => sum + item.estimatedHours,
      0,
    );
    const totalActualHours = items.reduce(
      (sum, item) => sum + item.actualHours,
      0,
    );
    const averageCompletionRate =
      totalMilestones > 0
        ? items.reduce((sum, item) => sum + item.completionPercentage, 0) /
          totalMilestones
        : 0;

    return {
      totalMilestones,
      completedMilestones,
      overdueMilestones,
      blockedMilestones,
      totalEstimatedHours,
      totalActualHours,
      averageCompletionRate: Math.round(averageCompletionRate),
    };
  }

  private generateASCIITimeline(items: TimelineItem[]): string {
    if (items.length === 0) {
      return 'No milestones found for the specified criteria.';
    }

    const lines: string[] = [];
    lines.push('Milestone Timeline Visualization');
    lines.push('='.repeat(50));
    lines.push('');

    // Group items by month for better visualization
    const groupedByMonth = this.groupItemsByMonth(items);

    for (const [monthKey, monthItems] of Object.entries(groupedByMonth)) {
      lines.push(`📅 ${monthKey}`);
      lines.push('-'.repeat(30));

      monthItems.forEach((item) => {
        const statusIcon = this.getStatusIcon(item.status);
        const priorityIcon = this.getPriorityIcon(item.priority);
        const overdueFlag = item.isOverdue ? ' ⚠️ OVERDUE' : '';
        const completionBar = this.generateCompletionBar(
          item.completionPercentage,
        );

        lines.push(`${statusIcon} ${priorityIcon} ${item.title}`);
        lines.push(`   📧 ${item.studentEmail}`);
        lines.push(`   📅 Due: ${item.dueDate.toLocaleDateString()}`);
        lines.push(
          `   ⏱️  ${item.actualHours}h / ${item.estimatedHours}h ${completionBar}${overdueFlag}`,
        );
        lines.push('');
      });
    }

    return lines.join('\n');
  }

  private groupItemsByMonth(
    items: TimelineItem[],
  ): Record<string, TimelineItem[]> {
    const grouped: Record<string, TimelineItem[]> = {};

    items.forEach((item) => {
      const monthKey = `${item.dueDate.getFullYear()}-${String(item.dueDate.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(item);
    });

    return grouped;
  }

  private getStatusIcon(status: MilestoneStatus): string {
    switch (status) {
      case MilestoneStatus.COMPLETED:
        return '✅';
      case MilestoneStatus.IN_PROGRESS:
        return '🔄';
      case MilestoneStatus.BLOCKED:
        return '🚫';
      case MilestoneStatus.NOT_STARTED:
        return '⭕';
      default:
        return '❓';
    }
  }

  private getPriorityIcon(priority: Priority): string {
    switch (priority) {
      case Priority.CRITICAL:
        return '🔴';
      case Priority.HIGH:
        return '🟠';
      case Priority.MEDIUM:
        return '🟡';
      case Priority.LOW:
        return '🟢';
      default:
        return '⚪';
    }
  }

  private generateCompletionBar(percentage: number): string {
    const barLength = 10;
    const filledLength = Math.round((percentage / 100) * barLength);
    const emptyLength = barLength - filledLength;

    return `[${'█'.repeat(filledLength) + '░'.repeat(emptyLength)}] ${percentage}%`;
  }

  async exportTimelineToFile(
    options: TimelineVisualizationOptions = {},
    filePath: string,
  ): Promise<void> {
    this.logger.log(`Exporting timeline visualization to ${filePath}...`);

    try {
      const visualization = await this.generateTimelineVisualization(options);

      const content = [
        visualization.timeline,
        '',
        'Summary Statistics:',
        '==================',
        `Total Milestones: ${visualization.summary.totalMilestones}`,
        `Completed: ${visualization.summary.completedMilestones}`,
        `Overdue: ${visualization.summary.overdueMilestones}`,
        `Blocked: ${visualization.summary.blockedMilestones}`,
        `Total Estimated Hours: ${visualization.summary.totalEstimatedHours}`,
        `Total Actual Hours: ${visualization.summary.totalActualHours}`,
        `Average Completion Rate: ${visualization.summary.averageCompletionRate}%`,
        '',
        'Detailed Items:',
        '===============',
        JSON.stringify(visualization.items, null, 2),
      ].join('\n');

      const fs = require('fs');
      fs.writeFileSync(filePath, content, 'utf8');

      this.logger.log(`Timeline visualization exported to ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to export timeline to ${filePath}`, error);
      throw error;
    }
  }

  async generateStudentProgressReport(studentId: string): Promise<string> {
    const options: TimelineVisualizationOptions = {
      studentId,
      includeCompleted: true,
    };

    const visualization = await this.generateTimelineVisualization(options);

    const report = [
      `Student Progress Report`,
      '='.repeat(30),
      '',
      `Student: ${visualization.items[0]?.studentEmail || 'Unknown'}`,
      `Report Generated: ${new Date().toLocaleString()}`,
      '',
      'Summary:',
      `- Total Milestones: ${visualization.summary.totalMilestones}`,
      `- Completed: ${visualization.summary.completedMilestones} (${Math.round((visualization.summary.completedMilestones / visualization.summary.totalMilestones) * 100)}%)`,
      `- Overdue: ${visualization.summary.overdueMilestones}`,
      `- Blocked: ${visualization.summary.blockedMilestones}`,
      `- Average Completion Rate: ${visualization.summary.averageCompletionRate}%`,
      '',
      visualization.timeline,
    ].join('\n');

    return report;
  }

  async debugMilestoneIssues(): Promise<string[]> {
    this.logger.log('Running milestone debugging analysis...');

    const issues: string[] = [];

    try {
      // Check for overdue milestones
      const overdueMilestones = await this.milestoneRepository
        .createQueryBuilder('milestone')
        .leftJoinAndSelect('milestone.student', 'student')
        .where('milestone.dueDate < :now', { now: new Date() })
        .andWhere('milestone.status != :completed', {
          completed: MilestoneStatus.COMPLETED,
        })
        .getMany();

      if (overdueMilestones.length > 0) {
        issues.push(`Found ${overdueMilestones.length} overdue milestones:`);
        overdueMilestones.forEach((milestone) => {
          const daysOverdue = Math.ceil(
            (new Date().getTime() - milestone.dueDate.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          issues.push(
            `  - ${milestone.title} (${milestone.student.email}) - ${daysOverdue} days overdue`,
          );
        });
        issues.push('');
      }

      // Check for blocked milestones
      const blockedMilestones = await this.milestoneRepository
        .createQueryBuilder('milestone')
        .leftJoinAndSelect('milestone.student', 'student')
        .where('milestone.status = :blocked', {
          blocked: MilestoneStatus.BLOCKED,
        })
        .getMany();

      if (blockedMilestones.length > 0) {
        issues.push(`Found ${blockedMilestones.length} blocked milestones:`);
        blockedMilestones.forEach((milestone) => {
          issues.push(`  - ${milestone.title} (${milestone.student.email})`);
          issues.push(
            `    Reason: ${milestone.blockingReason || 'No reason provided'}`,
          );
        });
        issues.push('');
      }

      // Check for milestones with unrealistic time estimates
      const milestonesWithTimeIssues = await this.milestoneRepository
        .createQueryBuilder('milestone')
        .leftJoinAndSelect('milestone.student', 'student')
        .where('milestone.actualHours > milestone.estimatedHours * 2')
        .andWhere('milestone.status = :completed', {
          completed: MilestoneStatus.COMPLETED,
        })
        .getMany();

      if (milestonesWithTimeIssues.length > 0) {
        issues.push(
          `Found ${milestonesWithTimeIssues.length} milestones with significant time overruns:`,
        );
        milestonesWithTimeIssues.forEach((milestone) => {
          const overrun = (
            ((milestone.actualHours - milestone.estimatedHours) /
              milestone.estimatedHours) *
            100
          ).toFixed(1);
          issues.push(
            `  - ${milestone.title} (${milestone.student.email}) - ${overrun}% over estimate`,
          );
        });
        issues.push('');
      }

      if (issues.length === 0) {
        issues.push('No significant milestone issues detected.');
      }

      return issues;
    } catch (error) {
      this.logger.error('Failed to debug milestone issues', error);
      throw error;
    }
  }
}
