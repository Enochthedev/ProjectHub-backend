import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DashboardService,
  DashboardMetrics,
  RealTimeDashboardData,
} from '../dashboard.service';
import { AnalyticsService } from '../analytics.service';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Milestone } from '../../entities/milestone.entity';
import { PlatformAnalytics } from '../../entities/platform-analytics.entity';
import {
  CustomDashboardDto,
  DashboardWidgetDto,
  DashboardVisualizationDto,
} from '../../dto/admin/reporting.dto';
import { NotFoundException } from '@nestjs/common';

describe('DashboardService', () => {
  let service: DashboardService;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let analyticsRepository: jest.Mocked<Repository<PlatformAnalytics>>;

  const mockSystemHealth = {
    uptime: 99.9,
    averageResponseTime: 150,
    errorRate: 0.1,
    activeConnections: 250,
    memoryUsage: 65,
    cpuUsage: 45,
    diskUsage: 70,
    healthScore: 85,
  };

  beforeEach(async () => {
    const mockUserRepository = {
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const mockProjectRepository = {
      count: jest.fn(),
      find: jest.fn(),
    };

    const mockMilestoneRepository = {
      count: jest.fn(),
      find: jest.fn(),
    };

    const mockAnalyticsRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    const mockAnalyticsService = {
      getSystemHealthMetrics: jest.fn().mockResolvedValue(mockSystemHealth),
      getPlatformUsageMetrics: jest.fn(),
      generateComprehensiveAnalytics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: mockMilestoneRepository,
        },
        {
          provide: getRepositoryToken(PlatformAnalytics),
          useValue: mockAnalyticsRepository,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    analyticsService = module.get(AnalyticsService);
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    analyticsRepository = module.get(getRepositoryToken(PlatformAnalytics));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRealTimeDashboard', () => {
    const adminId = 'admin-1';

    beforeEach(() => {
      // Setup default mock responses
      userRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(20) // newUsersToday
        .mockResolvedValueOnce(80); // activeUsers (lastLoginAt)

      projectRepository.count
        .mockResolvedValueOnce(50) // totalProjects
        .mockResolvedValueOnce(10) // pendingProjects
        .mockResolvedValueOnce(40); // approvedProjects

      milestoneRepository.count
        .mockResolvedValueOnce(200) // totalMilestones
        .mockResolvedValueOnce(150) // completedMilestones
        .mockResolvedValueOnce(10); // overdueMilestones
    });

    it('should return real-time dashboard data', async () => {
      // Act
      const result = await service.getRealTimeDashboard(adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.charts).toBeDefined();
      expect(result.widgets).toBeDefined();
      expect(result.alerts).toBeDefined();
    });

    it('should return correct dashboard metrics', async () => {
      // Act
      const result = await service.getRealTimeDashboard(adminId);

      // Assert
      expect(result.metrics.totalUsers).toBe(100);
      expect(result.metrics.newUsersToday).toBe(20);
      expect(result.metrics.totalProjects).toBe(50);
      expect(result.metrics.pendingProjects).toBe(10);
      expect(result.metrics.approvedProjects).toBe(40);
      expect(result.metrics.totalMilestones).toBe(200);
      expect(result.metrics.completedMilestones).toBe(150);
      expect(result.metrics.systemHealthScore).toBe(85);
      expect(result.metrics.averageResponseTime).toBe(150);
      expect(result.metrics.errorRate).toBe(0.1);
    });

    it('should include dashboard charts', async () => {
      // Act
      const result = await service.getRealTimeDashboard(adminId);

      // Assert
      expect(result.charts).toHaveLength(5);
      expect(result.charts[0].title).toBe('User Growth (Last 30 Days)');
      expect(result.charts[1].title).toBe('Project Status Distribution');
      expect(result.charts[2].title).toBe('Milestone Progress');
      expect(result.charts[3].title).toBe('System Health Score');
      expect(result.charts[4].title).toBe('Activity Heatmap (24h)');
    });

    it('should include dashboard widgets', async () => {
      // Act
      const result = await service.getRealTimeDashboard(adminId);

      // Assert
      expect(result.widgets).toHaveLength(8);

      const totalUsersWidget = result.widgets.find(
        (w) => w.id === 'total-users',
      );
      expect(totalUsersWidget).toBeDefined();
      expect(totalUsersWidget?.title).toBe('Total Users');
      expect(totalUsersWidget?.type).toBe('metric');

      const pendingProjectsWidget = result.widgets.find(
        (w) => w.id === 'pending-projects',
      );
      expect(pendingProjectsWidget).toBeDefined();
      expect(pendingProjectsWidget?.title).toBe('Pending Projects');
    });

    it('should generate alerts based on system health', async () => {
      // Arrange - Set low health score to trigger alert
      analyticsService.getSystemHealthMetrics.mockResolvedValue({
        ...mockSystemHealth,
        healthScore: 65,
      });

      // Act
      const result = await service.getRealTimeDashboard(adminId);

      // Assert
      expect(result.alerts.length).toBeGreaterThan(0);
      const healthAlert = result.alerts.find(
        (a) => a.title === 'System Health Critical',
      );
      expect(healthAlert).toBeDefined();
      expect(healthAlert?.type).toBe('error');
    });

    it('should generate warning alerts for moderate issues', async () => {
      // Arrange - Set moderate health score and high response time
      analyticsService.getSystemHealthMetrics.mockResolvedValue({
        ...mockSystemHealth,
        healthScore: 80,
        averageResponseTime: 1200,
      });

      // Act
      const result = await service.getRealTimeDashboard(adminId);

      // Assert
      const healthAlert = result.alerts.find(
        (a) => a.title === 'System Health Warning',
      );
      const responseTimeAlert = result.alerts.find(
        (a) => a.title === 'High Response Time',
      );

      expect(healthAlert).toBeDefined();
      expect(healthAlert?.type).toBe('warning');
      expect(responseTimeAlert).toBeDefined();
      expect(responseTimeAlert?.type).toBe('warning');
    });

    it('should cache dashboard data', async () => {
      // Act
      const result1 = await service.getRealTimeDashboard(adminId);
      const result2 = await service.getRealTimeDashboard(adminId);

      // Assert
      expect(result1).toBe(result2); // Should return same cached object
      expect(userRepository.count).toHaveBeenCalledTimes(3); // Only called once due to caching
    });

    it('should refresh cache after TTL expires', async () => {
      // Arrange
      const originalDate = Date.now;
      let mockTime = Date.now();
      Date.now = jest.fn(() => mockTime);

      // Act
      await service.getRealTimeDashboard(adminId);

      // Fast forward time beyond cache TTL (5 minutes)
      mockTime += 6 * 60 * 1000;

      await service.getRealTimeDashboard(adminId);

      // Assert
      expect(userRepository.count).toHaveBeenCalledTimes(6); // Called twice due to cache expiry

      // Cleanup
      Date.now = originalDate;
    });
  });

  describe('createCustomDashboard', () => {
    it('should create a custom dashboard', async () => {
      // Arrange
      const adminId = 'admin-1';
      const dashboardDto: CustomDashboardDto = {
        name: 'Executive Dashboard',
        description: 'High-level metrics for executives',
        widgets: [
          {
            id: 'widget-1',
            title: 'Total Users',
            type: 'metric',
            size: { width: 4, height: 2 },
            position: { x: 0, y: 0 },
          },
        ],
        layout: {
          columns: 12,
          rowHeight: 100,
        },
      };

      // Act
      const result = await service.createCustomDashboard(dashboardDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.dashboard).toEqual(dashboardDto);
    });
  });

  describe('updateDashboardWidget', () => {
    it('should update a dashboard widget', async () => {
      // Arrange
      const adminId = 'admin-1';
      const dashboardId = 'dashboard-1';
      const widgetId = 'widget-1';
      const widget: DashboardWidgetDto = {
        id: widgetId,
        title: 'Updated Widget',
        type: 'chart',
        size: { width: 6, height: 4 },
        position: { x: 0, y: 0 },
      };

      // Act
      const result = await service.updateDashboardWidget(
        dashboardId,
        widgetId,
        widget,
        adminId,
      );

      // Assert
      expect(result).toEqual(widget);
    });
  });

  describe('getWidgetData', () => {
    beforeEach(() => {
      userRepository.count.mockResolvedValue(100);
      projectRepository.count.mockResolvedValue(50);
    });

    it('should return data for total-users widget', async () => {
      // Act
      const result = await service.getWidgetData('total-users');

      // Assert
      expect(result).toEqual({ value: 100 });
      expect(userRepository.count).toHaveBeenCalled();
    });

    it('should return data for pending-projects widget', async () => {
      // Act
      const result = await service.getWidgetData('pending-projects');

      // Assert
      expect(result).toEqual({ value: 50 });
      expect(projectRepository.count).toHaveBeenCalledWith({
        where: { approvalStatus: 'pending' },
      });
    });

    it('should return data for system-health widget', async () => {
      // Act
      const result = await service.getWidgetData('system-health');

      // Assert
      expect(result).toEqual({ value: 85 });
      expect(analyticsService.getSystemHealthMetrics).toHaveBeenCalled();
    });

    it('should throw NotFoundException for unknown widget', async () => {
      // Act & Assert
      await expect(service.getWidgetData('unknown-widget')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refreshDashboardCache', () => {
    it('should clear cache for specific admin', async () => {
      // Arrange
      const adminId = 'admin-1';

      // Populate cache
      await service.getRealTimeDashboard(adminId);

      // Act
      await service.refreshDashboardCache(adminId);

      // Verify cache is cleared by checking if data is fetched again
      await service.getRealTimeDashboard(adminId);

      // Assert - Should be called twice (once before refresh, once after)
      expect(userRepository.count).toHaveBeenCalledTimes(6); // 3 calls per dashboard generation
    });

    it('should clear all cache when no admin specified', async () => {
      // Arrange
      const adminId1 = 'admin-1';
      const adminId2 = 'admin-2';

      // Populate cache for multiple admins
      await service.getRealTimeDashboard(adminId1);
      await service.getRealTimeDashboard(adminId2);

      // Act
      await service.refreshDashboardCache();

      // Verify cache is cleared
      await service.getRealTimeDashboard(adminId1);
      await service.getRealTimeDashboard(adminId2);

      // Assert - Should be called 4 times total (2 before refresh, 2 after)
      expect(userRepository.count).toHaveBeenCalledTimes(12); // 3 calls per dashboard generation × 4
    });
  });

  describe('chart generation', () => {
    beforeEach(() => {
      userRepository.count.mockResolvedValue(100);
      projectRepository.count
        .mockResolvedValueOnce(40) // approved
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5); // rejected

      milestoneRepository.count
        .mockResolvedValueOnce(150) // completed
        .mockResolvedValueOnce(30) // in_progress
        .mockResolvedValueOnce(15) // not_started
        .mockResolvedValueOnce(5); // overdue
    });

    it('should generate user growth chart', async () => {
      // Act
      const result = await service.getRealTimeDashboard('admin-1');
      const userGrowthChart = result.charts.find(
        (c) => c.title === 'User Growth (Last 30 Days)',
      );

      // Assert
      expect(userGrowthChart).toBeDefined();
      expect(userGrowthChart?.type).toBe('line');
      expect(userGrowthChart?.data).toBeDefined();
      expect(userGrowthChart?.options).toBeDefined();
    });

    it('should generate project status chart', async () => {
      // Act
      const result = await service.getRealTimeDashboard('admin-1');
      const projectStatusChart = result.charts.find(
        (c) => c.title === 'Project Status Distribution',
      );

      // Assert
      expect(projectStatusChart).toBeDefined();
      expect(projectStatusChart?.type).toBe('pie');
      expect(projectStatusChart?.data.labels).toEqual([
        'Approved',
        'Pending',
        'Rejected',
      ]);
      expect(projectStatusChart?.data.datasets[0].data).toEqual([40, 10, 5]);
    });

    it('should generate milestone progress chart', async () => {
      // Act
      const result = await service.getRealTimeDashboard('admin-1');
      const milestoneChart = result.charts.find(
        (c) => c.title === 'Milestone Progress',
      );

      // Assert
      expect(milestoneChart).toBeDefined();
      expect(milestoneChart?.type).toBe('bar');
      expect(milestoneChart?.data.labels).toEqual([
        'Completed',
        'In Progress',
        'Not Started',
        'Overdue',
      ]);
      expect(milestoneChart?.data.datasets[0].data).toEqual([150, 30, 15, 5]);
    });

    it('should generate system health gauge chart', async () => {
      // Act
      const result = await service.getRealTimeDashboard('admin-1');
      const healthChart = result.charts.find(
        (c) => c.title === 'System Health Score',
      );

      // Assert
      expect(healthChart).toBeDefined();
      expect(healthChart?.type).toBe('gauge');
      expect(healthChart?.data.value).toBe(85);
      expect(healthChart?.data.max).toBe(100);
    });

    it('should generate activity heatmap chart', async () => {
      // Act
      const result = await service.getRealTimeDashboard('admin-1');
      const heatmapChart = result.charts.find(
        (c) => c.title === 'Activity Heatmap (24h)',
      );

      // Assert
      expect(heatmapChart).toBeDefined();
      expect(heatmapChart?.type).toBe('scatter');
      expect(heatmapChart?.data.datasets).toBeDefined();
      expect(heatmapChart?.options?.scales?.x?.max).toBe(23);
    });
  });

  describe('alert generation', () => {
    it('should generate no alerts for healthy system', async () => {
      // Arrange - All metrics are healthy
      analyticsService.getSystemHealthMetrics.mockResolvedValue({
        ...mockSystemHealth,
        healthScore: 90,
        averageResponseTime: 100,
        errorRate: 0.05,
      });

      projectRepository.count.mockResolvedValue(10); // Low pending projects
      milestoneRepository.count.mockResolvedValue(5); // Low overdue milestones

      // Act
      const result = await service.getRealTimeDashboard('admin-1');

      // Assert
      expect(result.alerts).toHaveLength(0);
    });

    it('should generate multiple alerts for unhealthy system', async () => {
      // Arrange - Multiple issues
      analyticsService.getSystemHealthMetrics.mockResolvedValue({
        ...mockSystemHealth,
        healthScore: 60,
        averageResponseTime: 1500,
        errorRate: 8,
      });

      projectRepository.count
        .mockResolvedValueOnce(100) // totalProjects
        .mockResolvedValueOnce(60) // pendingProjects (high)
        .mockResolvedValueOnce(40); // approvedProjects

      milestoneRepository.count.mockResolvedValue(25); // High overdue milestones

      // Act
      const result = await service.getRealTimeDashboard('admin-1');

      // Assert
      expect(result.alerts.length).toBeGreaterThan(3);

      const alertTitles = result.alerts.map((a) => a.title);
      expect(alertTitles).toContain('System Health Critical');
      expect(alertTitles).toContain('High Response Time');
      expect(alertTitles).toContain('High Error Rate');
      expect(alertTitles).toContain('High Pending Projects');
      expect(alertTitles).toContain('Overdue Milestones');
    });

    it('should set correct alert types and severities', async () => {
      // Arrange
      analyticsService.getSystemHealthMetrics.mockResolvedValue({
        ...mockSystemHealth,
        healthScore: 65,
        errorRate: 6,
      });

      // Act
      const result = await service.getRealTimeDashboard('admin-1');

      // Assert
      const criticalAlert = result.alerts.find(
        (a) => a.title === 'System Health Critical',
      );
      const errorAlert = result.alerts.find(
        (a) => a.title === 'High Error Rate',
      );

      expect(criticalAlert?.type).toBe('error');
      expect(errorAlert?.type).toBe('error');
    });
  });
});
