import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan, Not, IsNull } from 'typeorm';
import { AnalyticsService, DateRange } from './analytics.service';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { Milestone } from '../entities/milestone.entity';
import { PlatformAnalytics } from '../entities/platform-analytics.entity';
import { ApprovalStatus } from '../common/enums/approval-status.enum';
import { MilestoneStatus } from '../common/enums/milestone-status.enum';
import { UserRole } from '../common/enums/user-role.enum';
import {
  DashboardVisualizationDto,
  DashboardWidgetDto,
  CustomDashboardDto,
} from '../dto/admin/reporting.dto';
import { v4 as uuidv4 } from 'uuid';

export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalProjects: number;
  pendingProjects: number;
  approvedProjects: number;
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  systemHealthScore: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: Date;
}

export interface RealTimeDashboardData {
  metrics: DashboardMetrics;
  charts: DashboardVisualizationDto[];
  widgets: DashboardWidgetDto[];
  alerts: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    message: string;
    timestamp: Date;
  }>;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private dashboardCache: Map<string, RealTimeDashboardData> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly analyticsService: AnalyticsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(PlatformAnalytics)
    private readonly analyticsRepository: Repository<PlatformAnalytics>,
  ) { }

  /**
   * Get real-time dashboard data
   */
  async getRealTimeDashboard(adminId: string): Promise<RealTimeDashboardData> {
    this.logger.log(`Getting real-time dashboard for admin ${adminId}`);

    const cacheKey = `dashboard-${adminId}`;
    const cached = this.dashboardCache.get(cacheKey);

    if (cached && this.isCacheValid(cached.metrics.lastUpdated)) {
      return cached;
    }

    const dashboardData = await this.generateRealTimeDashboard();
    this.dashboardCache.set(cacheKey, dashboardData);

    return dashboardData;
  }

  /**
   * Generate real-time dashboard data
   */
  private async generateRealTimeDashboard(): Promise<RealTimeDashboardData> {
    const [metrics, charts, widgets, alerts] = await Promise.all([
      this.getDashboardMetrics(),
      this.generateDashboardCharts(),
      this.generateDashboardWidgets(),
      this.generateDashboardAlerts(),
    ]);

    return {
      metrics,
      charts,
      widgets,
      alerts,
    };
  }

  /**
   * Get dashboard metrics
   */
  private async getDashboardMetrics(): Promise<DashboardMetrics> {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalProjects,
      pendingProjects,
      approvedProjects,
      totalMilestones,
      completedMilestones,
      overdueMilestones,
      systemHealth,
    ] = await Promise.all([
      this.userRepository.count(),
      this.getActiveUsersCount(),
      this.userRepository.count({
        where: {
          createdAt: Between(startOfDay, endOfDay),
        },
      }),
      this.projectRepository.count(),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.PENDING },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.APPROVED },
      }),
      this.milestoneRepository.count(),
      this.milestoneRepository.count({
        where: { status: MilestoneStatus.COMPLETED },
      }),
      this.getOverdueMilestonesCount(),
      this.analyticsService.getSystemHealthMetrics(),
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalProjects,
      pendingProjects,
      approvedProjects,
      totalMilestones,
      completedMilestones,
      overdueMilestones,
      systemHealthScore: systemHealth.healthScore,
      averageResponseTime: systemHealth.averageResponseTime,
      errorRate: systemHealth.errorRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Generate dashboard charts
   */
  private async generateDashboardCharts(): Promise<
    DashboardVisualizationDto[]
  > {
    const last30Days = this.getLast30DaysRange();

    return [
      await this.createUserGrowthChart(last30Days),
      await this.createProjectStatusChart(),
      await this.createMilestoneProgressChart(),
      await this.createSystemHealthChart(),
      await this.createActivityHeatmapChart(last30Days),
    ];
  }

  /**
   * Generate dashboard widgets
   */
  private async generateDashboardWidgets(): Promise<DashboardWidgetDto[]> {
    return [
      {
        id: 'total-users',
        title: 'Total Users',
        type: 'metric',
        size: { width: 3, height: 2 },
        position: { x: 0, y: 0 },
        config: {
          value: await this.userRepository.count(),
          icon: 'users',
          color: 'blue',
        },
      },
      {
        id: 'pending-projects',
        title: 'Pending Projects',
        type: 'metric',
        size: { width: 3, height: 2 },
        position: { x: 3, y: 0 },
        config: {
          value: await this.projectRepository.count({
            where: { approvalStatus: ApprovalStatus.PENDING },
          }),
          icon: 'clock',
          color: 'orange',
        },
      },
      {
        id: 'system-health',
        title: 'System Health',
        type: 'metric',
        size: { width: 3, height: 2 },
        position: { x: 6, y: 0 },
        config: {
          value: (await this.analyticsService.getSystemHealthMetrics())
            .healthScore,
          icon: 'heart',
          color: 'green',
          suffix: '%',
        },
      },
      {
        id: 'active-users',
        title: 'Active Users (24h)',
        type: 'metric',
        size: { width: 3, height: 2 },
        position: { x: 9, y: 0 },
        config: {
          value: await this.getActiveUsersCount(),
          icon: 'activity',
          color: 'purple',
        },
      },
      {
        id: 'user-growth-chart',
        title: 'User Growth',
        type: 'chart',
        size: { width: 6, height: 4 },
        position: { x: 0, y: 2 },
        visualization: await this.createUserGrowthChart(
          this.getLast30DaysRange(),
        ),
      },
      {
        id: 'project-status-chart',
        title: 'Project Status',
        type: 'chart',
        size: { width: 6, height: 4 },
        position: { x: 6, y: 2 },
        visualization: await this.createProjectStatusChart(),
      },
      {
        id: 'recent-activities',
        title: 'Recent Activities',
        type: 'list',
        size: { width: 6, height: 4 },
        position: { x: 0, y: 6 },
        config: {
          items: await this.getRecentActivities(),
        },
      },
      {
        id: 'system-alerts',
        title: 'System Alerts',
        type: 'list',
        size: { width: 6, height: 4 },
        position: { x: 6, y: 6 },
        config: {
          items: await this.getSystemAlerts(),
        },
      },
    ];
  }

  /**
   * Generate dashboard alerts
   */
  private async generateDashboardAlerts(): Promise<
    Array<{
      id: string;
      type: 'warning' | 'error' | 'info';
      title: string;
      message: string;
      timestamp: Date;
    }>
  > {
    const alerts: Array<{
      id: string;
      type: 'warning' | 'error' | 'info';
      title: string;
      message: string;
      timestamp: Date;
    }> = [];
    const systemHealth = await this.analyticsService.getSystemHealthMetrics();

    // System health alerts
    if (systemHealth.healthScore < 70) {
      alerts.push({
        id: uuidv4(),
        type: 'error' as const,
        title: 'System Health Critical',
        message: `System health score is ${systemHealth.healthScore}%. Immediate attention required.`,
        timestamp: new Date(),
      });
    } else if (systemHealth.healthScore < 85) {
      alerts.push({
        id: uuidv4(),
        type: 'warning' as const,
        title: 'System Health Warning',
        message: `System health score is ${systemHealth.healthScore}%. Monitor closely.`,
        timestamp: new Date(),
      });
    }

    // Response time alerts
    if (systemHealth.averageResponseTime > 1000) {
      alerts.push({
        id: uuidv4(),
        type: 'warning' as const,
        title: 'High Response Time',
        message: `Average response time is ${systemHealth.averageResponseTime}ms.`,
        timestamp: new Date(),
      });
    }

    // Error rate alerts
    if (systemHealth.errorRate > 5) {
      alerts.push({
        id: uuidv4(),
        type: 'error' as const,
        title: 'High Error Rate',
        message: `Error rate is ${systemHealth.errorRate}%.`,
        timestamp: new Date(),
      });
    }

    // Pending projects alert
    const pendingProjects = await this.projectRepository.count({
      where: { approvalStatus: ApprovalStatus.PENDING },
    });

    if (pendingProjects > 50) {
      alerts.push({
        id: uuidv4(),
        type: 'warning' as const,
        title: 'High Pending Projects',
        message: `${pendingProjects} projects are pending approval.`,
        timestamp: new Date(),
      });
    }

    // Overdue milestones alert
    const overdueMilestones = await this.getOverdueMilestonesCount();
    if (overdueMilestones > 20) {
      alerts.push({
        id: uuidv4(),
        type: 'warning' as const,
        title: 'Overdue Milestones',
        message: `${overdueMilestones} milestones are overdue.`,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  /**
   * Create user growth chart
   */
  private async createUserGrowthChart(
    dateRange: DateRange,
  ): Promise<DashboardVisualizationDto> {
    const dailyData = await this.getDailyUserRegistrations(dateRange);

    return {
      type: 'line',
      title: 'User Growth (Last 30 Days)',
      data: {
        labels: dailyData.map((d) => d.date),
        datasets: [
          {
            label: 'New Users',
            data: dailyData.map((d) => d.count),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };
  }

  /**
   * Create project status chart
   */
  private async createProjectStatusChart(): Promise<DashboardVisualizationDto> {
    const [approved, pending, rejected] = await Promise.all([
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.APPROVED },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.PENDING },
      }),
      this.projectRepository.count({
        where: { approvalStatus: ApprovalStatus.REJECTED },
      }),
    ]);

    return {
      type: 'pie',
      title: 'Project Status Distribution',
      data: {
        labels: ['Approved', 'Pending', 'Rejected'],
        datasets: [
          {
            data: [approved, pending, rejected],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(251, 191, 36, 0.8)',
              'rgba(239, 68, 68, 0.8)',
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(251, 191, 36)',
              'rgb(239, 68, 68)',
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
  }

  /**
   * Create milestone progress chart
   */
  private async createMilestoneProgressChart(): Promise<DashboardVisualizationDto> {
    const [completed, inProgress, notStarted, overdue] = await Promise.all([
      this.milestoneRepository.count({
        where: { status: MilestoneStatus.COMPLETED },
      }),
      this.milestoneRepository.count({
        where: { status: MilestoneStatus.IN_PROGRESS },
      }),
      this.milestoneRepository.count({
        where: { status: MilestoneStatus.NOT_STARTED },
      }),
      this.getOverdueMilestonesCount(),
    ]);

    return {
      type: 'bar',
      title: 'Milestone Progress',
      data: {
        labels: ['Completed', 'In Progress', 'Not Started', 'Overdue'],
        datasets: [
          {
            label: 'Milestones',
            data: [completed, inProgress, notStarted, overdue],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(156, 163, 175, 0.8)',
              'rgba(239, 68, 68, 0.8)',
            ],
            borderColor: [
              'rgb(34, 197, 94)',
              'rgb(59, 130, 246)',
              'rgb(156, 163, 175)',
              'rgb(239, 68, 68)',
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };
  }

  /**
   * Create system health chart
   */
  private async createSystemHealthChart(): Promise<DashboardVisualizationDto> {
    const systemHealth = await this.analyticsService.getSystemHealthMetrics();

    return {
      type: 'gauge',
      title: 'System Health Score',
      data: {
        value: systemHealth.healthScore,
        max: 100,
        thresholds: [
          { value: 70, color: 'red' },
          { value: 85, color: 'yellow' },
          { value: 100, color: 'green' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
  }

  /**
   * Create activity heatmap chart
   */
  private async createActivityHeatmapChart(
    dateRange: DateRange,
  ): Promise<DashboardVisualizationDto> {
    const activityData = await this.getHourlyActivityData(dateRange);

    return {
      type: 'scatter',
      title: 'Activity Heatmap (24h)',
      data: {
        datasets: [
          {
            label: 'Activity',
            data: activityData,
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: 'rgb(59, 130, 246)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: 23,
            title: {
              display: true,
              text: 'Hour of Day',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Activity Count',
            },
          },
        },
      },
    };
  }

  /**
   * Create custom dashboard
   */
  async createCustomDashboard(
    dashboardDto: CustomDashboardDto,
    adminId: string,
  ): Promise<{ id: string; dashboard: CustomDashboardDto }> {
    const dashboardId = uuidv4();

    // In a real implementation, this would be saved to the database
    // For now, we'll just return the dashboard with an ID

    this.logger.log(
      `Created custom dashboard ${dashboardId} for admin ${adminId}`,
    );

    return {
      id: dashboardId,
      dashboard: dashboardDto,
    };
  }

  /**
   * Update dashboard widget
   */
  async updateDashboardWidget(
    dashboardId: string,
    widgetId: string,
    widget: DashboardWidgetDto,
    adminId: string,
  ): Promise<DashboardWidgetDto> {
    // In a real implementation, this would update the widget in the database

    this.logger.log(
      `Updated widget ${widgetId} in dashboard ${dashboardId} by admin ${adminId}`,
    );

    return widget;
  }

  /**
   * Get dashboard widget data
   */
  async getWidgetData(widgetId: string, config?: any): Promise<any> {
    switch (widgetId) {
      case 'total-users':
        return { value: await this.userRepository.count() };
      case 'pending-projects':
        return {
          value: await this.projectRepository.count({
            where: { approvalStatus: ApprovalStatus.PENDING },
          }),
        };
      case 'system-health':
        const health = await this.analyticsService.getSystemHealthMetrics();
        return { value: health.healthScore };
      case 'active-users':
        return { value: await this.getActiveUsersCount() };
      default:
        throw new NotFoundException(`Widget ${widgetId} not found`);
    }
  }

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(): Promise<any> {
    this.logger.log('Getting admin dashboard data');

    const [
      metrics,
      userGrowthData,
      projectStatusDistribution,
      systemAlerts,
      recentActivities,
      topPerformingProjects,
      pendingApprovals,
    ] = await Promise.all([
      this.getDashboardMetrics(),
      this.getUserGrowthData(),
      this.getProjectStatusDistribution(),
      this.getSystemAlerts(),
      this.getRecentSystemActivities(),
      this.getTopPerformingProjects(),
      this.getPendingApprovals(),
    ]);

    return {
      metrics: {
        totalUsers: metrics.totalUsers,
        activeUsers: metrics.activeUsers,
        newUsersToday: metrics.newUsersToday,
        totalProjects: metrics.totalProjects,
        pendingProjects: metrics.pendingProjects,
        approvedProjects: metrics.approvedProjects,
        totalMilestones: metrics.totalMilestones,
        completedMilestones: metrics.completedMilestones,
        overdueMilestones: metrics.overdueMilestones,
        systemHealthScore: metrics.systemHealthScore,
      },
      userGrowthData,
      projectStatusDistribution,
      systemAlerts,
      recentActivities,
      topPerformingProjects,
      pendingApprovals,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(): Promise<any> {
    const [
      userStats,
      projectStats,
      milestoneStats,
      activityStats,
    ] = await Promise.all([
      this.getUserStatistics(),
      this.getProjectStatistics(),
      this.getMilestoneStatistics(),
      this.getActivityStatistics(),
    ]);

    return {
      userStats,
      projectStats,
      milestoneStats,
      activityStats,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<any> {
    const systemHealth = await this.analyticsService.getSystemHealthMetrics();

    return {
      healthScore: systemHealth.healthScore,
      averageResponseTime: systemHealth.averageResponseTime,
      errorRate: systemHealth.errorRate,
      uptime: systemHealth.uptime || 99.9,
      memoryUsage: systemHealth.memoryUsage || 65,
      cpuUsage: systemHealth.cpuUsage || 45,
      databaseConnections: systemHealth.activeConnections || 25,
      lastChecked: new Date().toISOString(),
    };
  }

  /**
   * Get milestone progress for any project (admin access)
   */
  async getProjectMilestoneProgress(projectId: string): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestones = await this.milestoneRepository.find({
      where: { projectId },
      order: { dueDate: 'ASC' },
    });

    const now = new Date();
    const completed = milestones.filter(m => m.status === MilestoneStatus.COMPLETED).length;
    const inProgress = milestones.filter(m => m.status === MilestoneStatus.IN_PROGRESS).length;
    const overdue = milestones.filter(m =>
      m.status !== MilestoneStatus.COMPLETED &&
      new Date(m.dueDate) < now
    ).length;

    return {
      projectId,
      projectTitle: project.title,
      milestones: milestones.map(milestone => ({
        id: milestone.id,
        title: milestone.title,
        description: milestone.description,
        dueDate: milestone.dueDate.toISOString().split('T')[0],
        priority: milestone.priority,
        status: milestone.status,
        progress: milestone.getProgressPercentage(),
        isOverdue: milestone.status !== MilestoneStatus.COMPLETED &&
          new Date(milestone.dueDate) < now,
        daysUntilDue: Math.ceil((new Date(milestone.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      progressSummary: {
        total: milestones.length,
        completed,
        inProgress,
        overdue,
        progressPercentage: milestones.length > 0
          ? Math.round((completed / milestones.length) * 100)
          : 0,
      },
    };
  }

  /**
   * Get all overdue milestones (admin access)
   */
  async getAllOverdueMilestones(): Promise<any> {
    const now = new Date();

    const milestones = await this.milestoneRepository.find({
      where: {
        status: Not(MilestoneStatus.COMPLETED),
        dueDate: LessThan(now),
      },
      relations: ['project', 'project.student', 'project.student.studentProfile', 'project.supervisor', 'project.supervisor.supervisorProfile'],
      order: { dueDate: 'ASC' },
    });

    return milestones.map(milestone => ({
      id: milestone.id,
      title: milestone.title,
      projectTitle: milestone.project?.title || 'Unknown',
      studentName: milestone.project?.student?.studentProfile?.name || milestone.project?.student?.email || 'Unassigned',
      supervisorName: milestone.project?.supervisor?.supervisorProfile?.name ||
        milestone.project?.supervisor?.email || 'Unknown',
      dueDate: milestone.dueDate.toISOString().split('T')[0],
      daysOverdue: Math.ceil((now.getTime() - new Date(milestone.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      priority: milestone.priority,
      status: milestone.status,
    }));
  }

  /**
   * Refresh dashboard cache
   */
  async refreshDashboardCache(adminId?: string): Promise<void> {
    if (adminId) {
      this.dashboardCache.delete(`dashboard-${adminId}`);
    } else {
      this.dashboardCache.clear();
    }

    this.logger.log('Dashboard cache refreshed');
  }

  // Additional helper methods for admin dashboard

  private async getUserGrowthData(): Promise<Array<{ date: string; newUsers: number; totalUsers: number }>> {
    const last30Days = this.getLast30DaysRange();
    const dailyData = await this.getDailyUserRegistrations(last30Days);

    let runningTotal = await this.userRepository.count({
      where: {
        createdAt: LessThan(last30Days.startDate),
      },
    });

    return dailyData.map(day => {
      runningTotal += day.count;
      return {
        date: day.date,
        newUsers: day.count,
        totalUsers: runningTotal,
      };
    });
  }

  private async getProjectStatusDistribution(): Promise<Array<{ status: string; count: number; percentage: number }>> {
    const [approved, pending, rejected, total] = await Promise.all([
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.APPROVED } }),
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.REJECTED } }),
      this.projectRepository.count(),
    ]);

    return [
      {
        status: 'approved',
        count: approved,
        percentage: total > 0 ? Math.round((approved / total) * 100 * 10) / 10 : 0,
      },
      {
        status: 'pending',
        count: pending,
        percentage: total > 0 ? Math.round((pending / total) * 100 * 10) / 10 : 0,
      },
      {
        status: 'rejected',
        count: rejected,
        percentage: total > 0 ? Math.round((rejected / total) * 100 * 10) / 10 : 0,
      },
    ];
  }

  private async getRecentSystemActivities(): Promise<Array<{ id: string; type: string; description: string; userName: string | null; timestamp: string }>> {
    // Return empty array for now - would need to implement proper activity tracking
    return [];
  }

  private async getTopPerformingProjects(): Promise<Array<{ id: string; title: string; supervisorName: string; viewCount: number; bookmarkCount: number; applicationCount: number }>> {
    const projects = await this.projectRepository.find({
      relations: ['supervisor', 'supervisor.supervisorProfile', 'bookmarks'],
      take: 10,
    });

    return projects.map(project => ({
      id: project.id,
      title: project.title,
      supervisorName: project.supervisor?.supervisorProfile?.name ||
        project.supervisor?.email || 'Unknown',
      viewCount: 0, // Would need to query ProjectView entity
      bookmarkCount: project.bookmarks?.length || 0,
      applicationCount: 0, // Would need to query ProjectApplication entity
    }));
  }

  private async getPendingApprovals(): Promise<{ projects: number; users: number; reports: number }> {
    const [pendingProjects, pendingUsers] = await Promise.all([
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      this.userRepository.count({ where: { isEmailVerified: false } }),
    ]);

    return {
      projects: pendingProjects,
      users: pendingUsers,
      reports: 0, // Placeholder - would be implemented based on reporting system
    };
  }

  private async getUserStatistics(): Promise<any> {
    const [total, students, supervisors, admins, verified, active] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: UserRole.STUDENT } }),
      this.userRepository.count({ where: { role: UserRole.SUPERVISOR } }),
      this.userRepository.count({ where: { role: UserRole.ADMIN } }),
      this.userRepository.count({ where: { isEmailVerified: true } }),
      this.getActiveUsersCount(),
    ]);

    return {
      total,
      byRole: { students, supervisors, admins },
      verified,
      active,
      verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
      activeRate: total > 0 ? Math.round((active / total) * 100) : 0,
    };
  }

  private async getProjectStatistics(): Promise<any> {
    const [total, approved, pending, rejected, withStudents] = await Promise.all([
      this.projectRepository.count(),
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.APPROVED } }),
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.PENDING } }),
      this.projectRepository.count({ where: { approvalStatus: ApprovalStatus.REJECTED } }),
      this.projectRepository.count({ where: { studentId: Not(IsNull()) } }),
    ]);

    return {
      total,
      byStatus: { approved, pending, rejected },
      assigned: withStudents,
      available: approved - withStudents,
      assignmentRate: approved > 0 ? Math.round((withStudents / approved) * 100) : 0,
    };
  }

  private async getMilestoneStatistics(): Promise<any> {
    const [total, completed, inProgress, notStarted, overdue] = await Promise.all([
      this.milestoneRepository.count(),
      this.milestoneRepository.count({ where: { status: MilestoneStatus.COMPLETED } }),
      this.milestoneRepository.count({ where: { status: MilestoneStatus.IN_PROGRESS } }),
      this.milestoneRepository.count({ where: { status: MilestoneStatus.NOT_STARTED } }),
      this.getOverdueMilestonesCount(),
    ]);

    return {
      total,
      byStatus: { completed, inProgress, notStarted, overdue },
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      overdueRate: total > 0 ? Math.round((overdue / total) * 100) : 0,
    };
  }

  private async getActivityStatistics(): Promise<any> {
    // This would be implemented with proper activity tracking
    // For now, return mock data
    return {
      totalActivities: 1000,
      last24h: 150,
      last7d: 800,
      topTypes: [
        { type: 'project_view', count: 300 },
        { type: 'milestone_update', count: 200 },
        { type: 'ai_chat', count: 180 },
        { type: 'project_bookmark', count: 120 },
        { type: 'login', count: 100 },
      ],
    };
  }

  // Helper methods

  private isCacheValid(lastUpdated: Date): boolean {
    return Date.now() - lastUpdated.getTime() < this.CACHE_TTL;
  }

  private getLast30DaysRange(): DateRange {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return { startDate, endDate };
  }

  private async getActiveUsersCount(): Promise<number> {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    // This is a simplified implementation
    // In reality, you'd track user activity more comprehensively
    // Since lastLoginAt doesn't exist, we'll use a different approach
    // In a real implementation, you'd track user activity differently
    return Math.floor((await this.userRepository.count()) * 0.8); // Mock 80% active rate
  }

  private async getOverdueMilestonesCount(): Promise<number> {
    const now = new Date();

    return this.milestoneRepository.count({
      where: {
        dueDate: LessThan(now),
        status: Not(MilestoneStatus.COMPLETED),
      },
    });
  }

  private async getDailyUserRegistrations(
    dateRange: DateRange,
  ): Promise<Array<{ date: string; count: number }>> {
    // This is a simplified implementation
    // In reality, you'd use a proper SQL query to group by date
    const result: Array<{ date: string; count: number }> = [];
    const currentDate = new Date(dateRange.startDate);

    while (currentDate <= dateRange.endDate) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.userRepository.count({
        where: {
          createdAt: Between(currentDate, nextDate),
        },
      });

      result.push({
        date: currentDate.toISOString().split('T')[0],
        count,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  private async getHourlyActivityData(
    dateRange: DateRange,
  ): Promise<Array<{ x: number; y: number }>> {
    // This is a simplified implementation
    // In reality, you'd track various activities and aggregate by hour
    const result: Array<{ x: number; y: number }> = [];

    for (let hour = 0; hour < 24; hour++) {
      // Mock data - in reality, this would come from activity logs
      const activity = Math.floor(Math.random() * 100) + 10;
      result.push({ x: hour, y: activity });
    }

    return result;
  }

  private async getRecentActivities(): Promise<
    Array<{ id: string; text: string; timestamp: Date; type: string }>
  > {
    // This is a simplified implementation
    // In reality, you'd have an activity log table
    return [
      {
        id: '1',
        text: 'New user registered: John Doe',
        timestamp: new Date(),
        type: 'user',
      },
      {
        id: '2',
        text: 'Project approved: AI Research Project',
        timestamp: new Date(Date.now() - 300000),
        type: 'project',
      },
      {
        id: '3',
        text: 'Milestone completed: Literature Review',
        timestamp: new Date(Date.now() - 600000),
        type: 'milestone',
      },
    ];
  }

  private async getSystemAlerts(): Promise<
    Array<{ id: string; text: string; severity: string; timestamp: Date }>
  > {
    // This is a simplified implementation
    const alerts: Array<{
      id: string;
      text: string;
      severity: string;
      timestamp: Date;
    }> = [];
    const systemHealth = await this.analyticsService.getSystemHealthMetrics();

    if (systemHealth.healthScore < 85) {
      alerts.push({
        id: '1',
        text: `System health: ${systemHealth.healthScore}%`,
        severity: systemHealth.healthScore < 70 ? 'error' : 'warning',
        timestamp: new Date(),
      });
    }

    if (systemHealth.averageResponseTime > 500) {
      alerts.push({
        id: '2',
        text: `High response time: ${systemHealth.averageResponseTime}ms`,
        severity: 'warning',
        timestamp: new Date(),
      });
    }

    return alerts;
  }
}
