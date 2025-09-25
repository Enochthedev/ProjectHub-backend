import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportingEngineService } from '../reporting-engine.service';
import { AnalyticsService } from '../analytics.service';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { Milestone } from '../../entities/milestone.entity';
import { PlatformAnalytics } from '../../entities/platform-analytics.entity';
import {
  GenerateReportDto,
  ReportFormat,
  ReportType,
  ReportMetadataDto,
} from '../../dto/admin/reporting.dto';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createReadStream: jest.fn(),
}));

describe('ReportingEngineService', () => {
  let service: ReportingEngineService;
  let analyticsService: jest.Mocked<AnalyticsService>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let analyticsRepository: jest.Mocked<Repository<PlatformAnalytics>>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    role: 'student',
    createdAt: new Date(),
    isActive: true,
  } as User;

  const mockProject = {
    id: 'project-1',
    title: 'Test Project',
    specialization: 'Computer Science',
    approvalStatus: 'approved',
    createdAt: new Date(),
  } as Project;

  const mockMilestone = {
    id: 'milestone-1',
    title: 'Test Milestone',
    status: 'completed',
    createdAt: new Date(),
    dueDate: new Date(),
  } as Milestone;

  const mockAnalytics = {
    id: 'analytics-1',
    metric: 'user_registrations',
    value: 10,
    date: new Date(),
    period: 'daily',
  } as PlatformAnalytics;

  beforeEach(async () => {
    const mockUserRepository = {
      count: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
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
      generateComprehensiveAnalytics: jest.fn(),
      getPlatformUsageMetrics: jest.fn(),
      getSystemHealthMetrics: jest.fn(),
      getTrendAnalysis: jest.fn(),
      getPatternRecognition: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingEngineService,
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

    service = module.get<ReportingEngineService>(ReportingEngineService);
    analyticsService = module.get(AnalyticsService);
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    analyticsRepository = module.get(getRepositoryToken(PlatformAnalytics));

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
    (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.stat as jest.Mock).mockResolvedValue({ size: 1024 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    const generateDto: GenerateReportDto = {
      type: ReportType.USER_ANALYTICS,
      format: ReportFormat.JSON,
      dateRange: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      },
      title: 'Test Report',
      includeCharts: true,
      includeDetails: true,
    };

    it('should generate a user analytics report successfully', async () => {
      // Arrange
      const adminId = 'admin-1';
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(generateDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(ReportType.USER_ANALYTICS);
      expect(result.format).toBe(ReportFormat.JSON);
      expect(result.title).toBe('Test Report');
      expect(result.generatedBy).toBe(adminId);
      expect(result.status).toBe('completed');
      expect(result.downloadUrl).toContain('/api/admin/reports/');
    });

    it('should generate a project analytics report successfully', async () => {
      // Arrange
      const adminId = 'admin-1';
      const projectDto = { ...generateDto, type: ReportType.PROJECT_ANALYTICS };
      projectRepository.count.mockResolvedValue(50);

      // Act
      const result = await service.generateReport(projectDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(ReportType.PROJECT_ANALYTICS);
      expect(result.generatedBy).toBe(adminId);
      expect(result.status).toBe('completed');
    });

    it('should generate a comprehensive report successfully', async () => {
      // Arrange
      const adminId = 'admin-1';
      const comprehensiveDto = {
        ...generateDto,
        type: ReportType.COMPREHENSIVE,
      };

      analyticsService.generateComprehensiveAnalytics.mockResolvedValue({
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
        usage: {
          totalUsers: 100,
          activeUsers: 80,
          newUsers: 20,
          userGrowthRate: 25,
          totalProjects: 50,
          approvedProjects: 40,
          pendingProjects: 10,
          projectApprovalRate: 80,
          totalMilestones: 200,
          completedMilestones: 150,
          milestoneCompletionRate: 75,
          totalConversations: 300,
          activeConversations: 250,
          totalMessages: 1000,
          averageMessagesPerConversation: 3.33,
        },
        trends: [],
        systemHealth: {
          uptime: 99.9,
          averageResponseTime: 150,
          errorRate: 0.1,
          activeConnections: 250,
          memoryUsage: 65,
          cpuUsage: 45,
          diskUsage: 70,
          healthScore: 85,
        },
        patterns: [],
        insights: [],
      });

      // Act
      const result = await service.generateReport(comprehensiveDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe(ReportType.COMPREHENSIVE);
      expect(
        analyticsService.generateComprehensiveAnalytics,
      ).toHaveBeenCalled();
    });

    it('should export report to CSV format', async () => {
      // Arrange
      const adminId = 'admin-1';
      const csvDto = { ...generateDto, format: ReportFormat.CSV };
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(csvDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.format).toBe(ReportFormat.CSV);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should export report to PDF format', async () => {
      // Arrange
      const adminId = 'admin-1';
      const pdfDto = { ...generateDto, format: ReportFormat.PDF };
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(pdfDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.format).toBe(ReportFormat.PDF);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should export report to Excel format', async () => {
      // Arrange
      const adminId = 'admin-1';
      const excelDto = { ...generateDto, format: ReportFormat.EXCEL };
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(excelDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.format).toBe(ReportFormat.EXCEL);
      expect(fs.promises.writeFile).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported report type', async () => {
      // Arrange
      const adminId = 'admin-1';
      const invalidDto = { ...generateDto, type: 'invalid_type' as ReportType };

      // Act & Assert
      await expect(service.generateReport(invalidDto, adminId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle file system errors gracefully', async () => {
      // Arrange
      const adminId = 'admin-1';
      userRepository.count.mockResolvedValue(100);
      (fs.promises.writeFile as jest.Mock).mockRejectedValue(
        new Error('File system error'),
      );

      // Act & Assert
      await expect(
        service.generateReport(generateDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include charts when requested', async () => {
      // Arrange
      const adminId = 'admin-1';
      const chartsDto = { ...generateDto, includeCharts: true };
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(chartsDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should exclude charts when not requested', async () => {
      // Arrange
      const adminId = 'admin-1';
      const noChartsDto = { ...generateDto, includeCharts: false };
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(noChartsDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should apply filters when provided', async () => {
      // Arrange
      const adminId = 'admin-1';
      const filteredDto = {
        ...generateDto,
        filters: {
          userRoles: ['student'],
          activeUsersOnly: true,
        },
      };
      userRepository.count.mockResolvedValue(100);

      // Act
      const result = await service.generateReport(filteredDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('completed');
    });
  });

  describe('report data generation', () => {
    it('should generate user analytics data correctly', async () => {
      // Arrange
      const adminId = 'admin-1';
      const generateDto: GenerateReportDto = {
        type: ReportType.USER_ANALYTICS,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      };

      userRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(20) // newUsers
        .mockResolvedValueOnce(15); // previousNewUsers

      // Act
      const result = await service.generateReport(generateDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(userRepository.count).toHaveBeenCalledTimes(3);
    });

    it('should generate milestone analytics data correctly', async () => {
      // Arrange
      const adminId = 'admin-1';
      const generateDto: GenerateReportDto = {
        type: ReportType.MILESTONE_ANALYTICS,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      };

      milestoneRepository.count
        .mockResolvedValueOnce(200) // totalMilestones
        .mockResolvedValueOnce(150) // completedMilestones
        .mockResolvedValueOnce(10); // overdueMilestones

      // Act
      const result = await service.generateReport(generateDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(milestoneRepository.count).toHaveBeenCalled();
    });

    it('should generate system health data correctly', async () => {
      // Arrange
      const adminId = 'admin-1';
      const generateDto: GenerateReportDto = {
        type: ReportType.SYSTEM_HEALTH,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      };

      analyticsService.getSystemHealthMetrics.mockResolvedValue({
        uptime: 99.9,
        averageResponseTime: 150,
        errorRate: 0.1,
        activeConnections: 250,
        memoryUsage: 65,
        cpuUsage: 45,
        diskUsage: 70,
        healthScore: 85,
      });

      // Act
      const result = await service.generateReport(generateDto, adminId);

      // Assert
      expect(result).toBeDefined();
      expect(analyticsService.getSystemHealthMetrics).toHaveBeenCalled();
    });
  });

  describe('export formats', () => {
    const baseGenerateDto: GenerateReportDto = {
      type: ReportType.USER_ANALYTICS,
      format: ReportFormat.JSON,
      dateRange: {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-31T23:59:59Z',
      },
    };

    beforeEach(() => {
      userRepository.count.mockResolvedValue(100);
    });

    it('should export to JSON format correctly', async () => {
      // Arrange
      const adminId = 'admin-1';
      const jsonDto = { ...baseGenerateDto, format: ReportFormat.JSON };

      // Act
      const result = await service.generateReport(jsonDto, adminId);

      // Assert
      expect(result.format).toBe(ReportFormat.JSON);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.json'),
        expect.any(String),
        'utf8',
      );
    });

    it('should export to CSV format correctly', async () => {
      // Arrange
      const adminId = 'admin-1';
      const csvDto = { ...baseGenerateDto, format: ReportFormat.CSV };

      // Act
      const result = await service.generateReport(csvDto, adminId);

      // Assert
      expect(result.format).toBe(ReportFormat.CSV);
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.csv'),
        expect.stringContaining('Report Metadata'),
        'utf8',
      );
    });

    it('should generate HTML content for PDF export', async () => {
      // Arrange
      const adminId = 'admin-1';
      const pdfDto = { ...baseGenerateDto, format: ReportFormat.PDF };

      // Act
      const result = await service.generateReport(pdfDto, adminId);

      // Assert
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.html'),
        expect.stringContaining('<!DOCTYPE html>'),
        'utf8',
      );
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      const adminId = 'admin-1';
      const generateDto: GenerateReportDto = {
        type: ReportType.USER_ANALYTICS,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      };

      userRepository.count.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        service.generateReport(generateDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle analytics service errors gracefully', async () => {
      // Arrange
      const adminId = 'admin-1';
      const generateDto: GenerateReportDto = {
        type: ReportType.COMPREHENSIVE,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      };

      analyticsService.generateComprehensiveAnalytics.mockRejectedValue(
        new Error('Analytics service error'),
      );

      // Act & Assert
      await expect(
        service.generateReport(generateDto, adminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('file management', () => {
    it('should create reports directory if it does not exist', async () => {
      // Arrange
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act
      const newService = new ReportingEngineService(
        analyticsService,
        userRepository,
        projectRepository,
        milestoneRepository,
        analyticsRepository,
      );

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('reports'),
        { recursive: true },
      );
    });

    it('should generate unique file names for reports', async () => {
      // Arrange
      const adminId = 'admin-1';
      const generateDto: GenerateReportDto = {
        type: ReportType.USER_ANALYTICS,
        format: ReportFormat.JSON,
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-31T23:59:59Z',
        },
      };

      userRepository.count.mockResolvedValue(100);

      // Act
      const result1 = await service.generateReport(generateDto, adminId);
      const result2 = await service.generateReport(generateDto, adminId);

      // Assert
      expect(result1.id).not.toBe(result2.id);
      expect(result1.downloadUrl).not.toBe(result2.downloadUrl);
    });
  });
});
