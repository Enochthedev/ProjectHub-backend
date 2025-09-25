import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { MilestoneStatus, Priority } from '../common/enums';
import {
  GanttChartDataDto,
  CalendarViewDataDto,
  WorkloadDistributionDto,
  TimelineVisualizationDto,
  MilestoneTimelineItemDto,
  CalendarEventDto,
  WorkloadPeriodDto,
} from '../dto/milestone/visualization.dto';

export interface MilestoneVisualizationServiceInterface {
  generateGanttChartData(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GanttChartDataDto>;
  generateCalendarViewData(
    studentId: string,
    year: number,
    month: number,
  ): Promise<CalendarViewDataDto>;
  analyzeWorkloadDistribution(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<WorkloadDistributionDto>;
  generateTimelineVisualization(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TimelineVisualizationDto>;
}

@Injectable()
export class MilestoneVisualizationService
  implements MilestoneVisualizationServiceInterface
{
  private readonly logger = new Logger(MilestoneVisualizationService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async generateGanttChartData(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<GanttChartDataDto> {
    this.logger.log(`Generating Gantt chart data for student ${studentId}`);

    // Set default date range if not provided
    const defaultStartDate = startDate || new Date();
    const defaultEndDate =
      endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now

    const queryBuilder = this.milestoneRepository
      .createQueryBuilder('milestone')
      .leftJoinAndSelect('milestone.project', 'project')
      .where('milestone.studentId = :studentId', { studentId })
      .andWhere('milestone.dueDate BETWEEN :startDate AND :endDate', {
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0],
      })
      .orderBy('milestone.dueDate', 'ASC');

    const milestones = await queryBuilder.getMany();

    // Transform milestones into Gantt chart format
    const ganttItems: MilestoneTimelineItemDto[] = milestones.map(
      (milestone, index) => {
        // Calculate start date (estimated based on position and duration)
        const estimatedStartDate = this.calculateEstimatedStartDate(
          milestone,
          milestones,
          index,
        );

        return {
          id: milestone.id,
          title: milestone.title,
          startDate: estimatedStartDate.toISOString().split('T')[0],
          endDate: milestone.dueDate.toISOString().split('T')[0],
          status: milestone.status,
          priority: milestone.priority,
          progress: milestone.getProgressPercentage(),
          estimatedHours: milestone.estimatedHours,
          actualHours: milestone.actualHours,
          isOverdue: milestone.isOverdue(),
          projectId: milestone.projectId,
          projectTitle: milestone.project?.title || null,
          dependencies: this.calculateDependencies(milestone, milestones),
          colorCode: this.getStatusColorCode(milestone.status),
        };
      },
    );

    // Calculate critical path
    const criticalPath = this.calculateCriticalPath(ganttItems);

    return {
      items: ganttItems,
      dateRange: {
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0],
      },
      criticalPath,
      totalDuration: this.calculateTotalDuration(ganttItems),
      metadata: {
        totalMilestones: ganttItems.length,
        completedMilestones: ganttItems.filter(
          (item) => item.status === MilestoneStatus.COMPLETED,
        ).length,
        overdueMilestones: ganttItems.filter((item) => item.isOverdue).length,
        criticalMilestones: criticalPath.length,
      },
    };
  }

  async generateCalendarViewData(
    studentId: string,
    year: number,
    month: number,
  ): Promise<CalendarViewDataDto> {
    this.logger.log(
      `Generating calendar view data for student ${studentId} for ${year}-${month}`,
    );

    // Calculate month boundaries
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const milestones = await this.milestoneRepository.find({
      where: {
        studentId,
      },
      relations: ['project'],
      order: { dueDate: 'ASC' },
    });

    // Filter milestones for the specified month and create calendar events
    const events: CalendarEventDto[] = milestones
      .filter((milestone) => {
        const dueDate = new Date(milestone.dueDate);
        return dueDate >= startDate && dueDate <= endDate;
      })
      .map((milestone) => ({
        id: milestone.id,
        title: milestone.title,
        date: milestone.dueDate.toISOString().split('T')[0],
        status: milestone.status,
        priority: milestone.priority,
        isOverdue: milestone.isOverdue(),
        colorCode: this.getStatusColorCode(milestone.status),
        projectTitle: milestone.project?.title || null,
        estimatedHours: milestone.estimatedHours,
      }));

    // Group events by date
    const eventsByDate: Record<string, CalendarEventDto[]> = {};
    events.forEach((event) => {
      if (!eventsByDate[event.date]) {
        eventsByDate[event.date] = [];
      }
      eventsByDate[event.date].push(event);
    });

    // Calculate workload for each day
    const dailyWorkload: Record<string, number> = {};
    Object.entries(eventsByDate).forEach(([date, dayEvents]) => {
      dailyWorkload[date] = dayEvents.reduce(
        (sum, event) => sum + event.estimatedHours,
        0,
      );
    });

    return {
      year,
      month,
      events,
      eventsByDate,
      dailyWorkload,
      summary: {
        totalEvents: events.length,
        completedEvents: events.filter(
          (e) => e.status === MilestoneStatus.COMPLETED,
        ).length,
        overdueEvents: events.filter((e) => e.isOverdue).length,
        highPriorityEvents: events.filter(
          (e) =>
            e.priority === Priority.HIGH || e.priority === Priority.CRITICAL,
        ).length,
        totalEstimatedHours: events.reduce(
          (sum, e) => sum + e.estimatedHours,
          0,
        ),
      },
    };
  }

  async analyzeWorkloadDistribution(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<WorkloadDistributionDto> {
    this.logger.log(`Analyzing workload distribution for student ${studentId}`);

    const defaultStartDate = startDate || new Date();
    const defaultEndDate =
      endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000); // 6 months from now

    const milestones = await this.milestoneRepository.find({
      where: {
        studentId,
      },
      relations: ['project'],
      order: { dueDate: 'ASC' },
    });

    // Filter milestones within date range
    const filteredMilestones = milestones.filter((milestone) => {
      const dueDate = new Date(milestone.dueDate);
      return dueDate >= defaultStartDate && dueDate <= defaultEndDate;
    });

    // Group milestones by week
    const weeklyWorkload: WorkloadPeriodDto[] = [];
    const weekMap = new Map<string, Milestone[]>();

    filteredMilestones.forEach((milestone) => {
      const weekKey = this.getWeekKey(milestone.dueDate);
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, []);
      }
      weekMap.get(weekKey)!.push(milestone);
    });

    // Calculate workload for each week
    weekMap.forEach((weekMilestones, weekKey) => {
      const [year, week] = weekKey.split('-W');
      const weekStart = this.getDateFromWeek(parseInt(year), parseInt(week));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const totalHours = weekMilestones.reduce(
        (sum, m) => sum + m.estimatedHours,
        0,
      );
      const milestoneCount = weekMilestones.length;
      const highPriorityCount = weekMilestones.filter(
        (m) => m.priority === Priority.HIGH || m.priority === Priority.CRITICAL,
      ).length;

      weeklyWorkload.push({
        periodStart: weekStart.toISOString().split('T')[0],
        periodEnd: weekEnd.toISOString().split('T')[0],
        totalHours,
        milestoneCount,
        highPriorityCount,
        isOverloaded: totalHours > 40 || milestoneCount > 3, // Configurable thresholds
        conflictLevel: this.calculateConflictLevel(totalHours, milestoneCount),
        milestones: weekMilestones.map((m) => ({
          id: m.id,
          title: m.title,
          dueDate: m.dueDate.toISOString().split('T')[0],
          priority: m.priority,
          estimatedHours: m.estimatedHours,
        })),
      });
    });

    // Sort by period start date
    weeklyWorkload.sort((a, b) => a.periodStart.localeCompare(b.periodStart));

    // Identify scheduling conflicts
    const conflicts = this.identifySchedulingConflicts(weeklyWorkload);

    return {
      dateRange: {
        startDate: defaultStartDate.toISOString().split('T')[0],
        endDate: defaultEndDate.toISOString().split('T')[0],
      },
      weeklyWorkload,
      conflicts,
      summary: {
        totalMilestones: filteredMilestones.length,
        totalEstimatedHours: filteredMilestones.reduce(
          (sum, m) => sum + m.estimatedHours,
          0,
        ),
        averageWeeklyHours:
          weeklyWorkload.length > 0
            ? weeklyWorkload.reduce((sum, w) => sum + w.totalHours, 0) /
              weeklyWorkload.length
            : 0,
        overloadedWeeks: weeklyWorkload.filter((w) => w.isOverloaded).length,
        peakWorkloadWeek: weeklyWorkload.reduce(
          (max, current) =>
            current.totalHours > max.totalHours ? current : max,
          weeklyWorkload[0] || {
            totalHours: 0,
            periodStart: '',
            periodEnd: '',
            milestoneCount: 0,
            highPriorityCount: 0,
            isOverloaded: false,
            conflictLevel: 'low',
            milestones: [],
          },
        ),
      },
    };
  }

  async generateTimelineVisualization(
    studentId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TimelineVisualizationDto> {
    this.logger.log(
      `Generating timeline visualization for student ${studentId}`,
    );

    const ganttData = await this.generateGanttChartData(
      studentId,
      startDate,
      endDate,
    );
    const workloadData = await this.analyzeWorkloadDistribution(
      studentId,
      startDate,
      endDate,
    );

    // Create timeline events from milestones
    const timelineEvents = ganttData.items.map((item) => ({
      id: item.id,
      title: item.title,
      date: item.endDate,
      type: 'milestone' as const,
      status: item.status,
      priority: item.priority,
      description: `Due: ${item.endDate}`,
      colorCode: item.colorCode,
    }));

    // Add workload alerts as timeline events
    const workloadAlerts = workloadData.conflicts.map((conflict, index) => ({
      id: `conflict-${index}`,
      title: `Workload Conflict`,
      date: conflict.date,
      type: 'alert' as const,
      status: 'warning' as any,
      priority: Priority.HIGH,
      description: conflict.description,
      colorCode: '#ff6b6b',
    }));

    const allEvents = [...timelineEvents, ...workloadAlerts].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      dateRange: ganttData.dateRange,
      events: allEvents,
      ganttData,
      workloadData,
      summary: {
        totalEvents: allEvents.length,
        milestoneEvents: timelineEvents.length,
        alertEvents: workloadAlerts.length,
        criticalPathLength: ganttData.criticalPath.length,
        estimatedCompletionDate: this.calculateEstimatedCompletion(
          ganttData.items,
        ),
      },
    };
  }

  // Private helper methods

  private calculateEstimatedStartDate(
    milestone: Milestone,
    allMilestones: Milestone[],
    index: number,
  ): Date {
    // Simple estimation: assume each milestone takes 2 weeks
    const estimatedDuration = 14; // days
    const dueDate = new Date(milestone.dueDate);
    const startDate = new Date(dueDate);
    startDate.setDate(startDate.getDate() - estimatedDuration);

    return startDate;
  }

  private calculateDependencies(
    milestone: Milestone,
    allMilestones: Milestone[],
  ): string[] {
    // Simple dependency calculation based on chronological order
    // In a real implementation, this would be based on actual dependency relationships
    const milestoneIndex = allMilestones.findIndex(
      (m) => m.id === milestone.id,
    );
    if (milestoneIndex > 0) {
      return [allMilestones[milestoneIndex - 1].id];
    }
    return [];
  }

  private getStatusColorCode(status: MilestoneStatus): string {
    const colorMap: Record<MilestoneStatus, string> = {
      [MilestoneStatus.NOT_STARTED]: '#6c757d',
      [MilestoneStatus.IN_PROGRESS]: '#007bff',
      [MilestoneStatus.COMPLETED]: '#28a745',
      [MilestoneStatus.BLOCKED]: '#dc3545',
      [MilestoneStatus.CANCELLED]: '#6c757d',
    };
    return colorMap[status] || '#6c757d';
  }

  private calculateCriticalPath(items: MilestoneTimelineItemDto[]): string[] {
    // Simplified critical path calculation
    // In a real implementation, this would use proper CPM algorithm
    return items
      .filter(
        (item) =>
          item.priority === Priority.HIGH ||
          item.priority === Priority.CRITICAL,
      )
      .map((item) => item.id);
  }

  private calculateTotalDuration(items: MilestoneTimelineItemDto[]): number {
    if (items.length === 0) return 0;

    const startDate = new Date(
      Math.min(...items.map((item) => new Date(item.startDate).getTime())),
    );
    const endDate = new Date(
      Math.max(...items.map((item) => new Date(item.endDate).getTime())),
    );

    return Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  private getDateFromWeek(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStart;
  }

  private calculateConflictLevel(
    totalHours: number,
    milestoneCount: number,
  ): 'low' | 'medium' | 'high' {
    if (totalHours > 60 || milestoneCount > 5) return 'high';
    if (totalHours > 40 || milestoneCount > 3) return 'medium';
    return 'low';
  }

  private identifySchedulingConflicts(
    weeklyWorkload: WorkloadPeriodDto[],
  ): Array<{
    date: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const conflicts: Array<{
      date: string;
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    weeklyWorkload.forEach((week) => {
      if (week.isOverloaded) {
        conflicts.push({
          date: week.periodStart,
          type: 'workload_overload',
          description: `Week of ${week.periodStart}: ${week.milestoneCount} milestones (${week.totalHours}h estimated)`,
          severity: week.conflictLevel as 'low' | 'medium' | 'high',
        });
      }
    });

    return conflicts;
  }

  private calculateEstimatedCompletion(
    items: MilestoneTimelineItemDto[],
  ): string | null {
    if (items.length === 0) return null;

    const incompleteMilestones = items.filter(
      (item) =>
        item.status !== MilestoneStatus.COMPLETED &&
        item.status !== MilestoneStatus.CANCELLED,
    );

    if (incompleteMilestones.length === 0) return null;

    const latestDueDate = Math.max(
      ...incompleteMilestones.map((item) => new Date(item.endDate).getTime()),
    );
    return new Date(latestDueDate).toISOString().split('T')[0];
  }
}
