import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrivacyCompliantAnalyticsService } from '../privacy-compliant-analytics.service';
import { Project } from '../../entities/project.entity';
import { ProjectView } from '../../entities/project-view.entity';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { ApprovalStatus } from '../../common/enums/approval-status.enum';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';

describe('PrivacyCompliantAnalyticsService', () => {
  let service: PrivacyCompliantAnalyticsService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectViewRepository: jest.Mocked<Repository<ProjectView>>;
  let projectBookmarkRepository: jest.Mocked<Repository<ProjectBookmark>>;

  const mockStartDate = new Date('2024-01-01');
  const mockEndDate = new Date('2024-12-31');

  const mockProjects = [
    {
      id: 'project-1',
      specialization: 'Web Development',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      isGroupProject: false,
      createdAt: new Date('2024-06-01'),
      approvalStatus: ApprovalStatus.APPROVED,
      technologyStack: ['React', 'Node.js'],
    },
    {
      id: 'project-2',
      specialization: 'AI & ML',
      difficultyLevel: DifficultyLevel.ADVANCED,
      isGroupProject: true,
      createdAt: new Date('2024-07-01'),
      approvalStatus: ApprovalStatus.APPROVED,
      technologyStack: ['Python', 'TensorFlow'],
    },
    {
      id: 'project-3',
      specialization: 'Mobile Development',
      difficultyLevel: DifficultyLevel.BEGINNER,
      isGroupProject: false,
      createdAt: new Date('2024-08-01'),
      approvalStatus: ApprovalStatus.PENDING,
      technologyStack: ['React Native'],
    },
  ];

  beforeEach(async () => {
    const mockProjectRepository = {
      find: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
    };

    const mockProjectViewRepository = {
      count: jest.fn(),
    };

    const mockProjectBookmarkRepository = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrivacyCompliantAnalyticsService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(ProjectView),
          useValue: mockProjectViewRepository,
        },
        {
          provide: getRepositoryToken(ProjectBookmark),
          useValue: mockProjectBookmarkRepository,
        },
      ],
    }).compile();

    service = module.get<PrivacyCompliantAnalyticsService>(
      PrivacyCompliantAnalyticsService,
    );
    projectRepository = module.get(getRepositoryToken(Project));
    projectViewRepository = module.get(getRepositoryToken(ProjectView));
    projectBookmarkRepository = module.get(getRepositoryToken(ProjectBookmark));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSupervisorAnalytics', () => {
    it('should generate privacy-compliant supervisor analytics', async () => {
      projectRepository.find.mockResolvedValue(mockProjects as any);
      projectViewRepository.count
        .mockResolvedValueOnce(50) // Total views for approved projects
        .mockResolvedValueOnce(25) // Views for project-1
        .mockResolvedValueOnce(30); // Views for project-2

      projectBookmarkRepository.count
        .mockResolvedValueOnce(15) // Total bookmarks for approved projects
        .mockResolvedValueOnce(8) // Bookmarks for project-1
        .mockResolvedValueOnce(12); // Bookmarks for project-2

      // Mock technology insights query
      projectRepository.query.mockResolvedValue([
        {
          technology: 'React',
          usage_count: '1',
          average_engagement: '33.00',
        },
        {
          technology: 'Python',
          usage_count: '1',
          average_engagement: '54.00',
        },
      ]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      expect(result).toBeDefined();
      expect(result?.supervisorId).toBe('supervisor-1');
      expect(result?.projectMetrics.totalProjects).toBe(3);
      expect(result?.projectMetrics.approvedProjects).toBe(2);
      expect(result?.projectMetrics.pendingProjects).toBe(1);
      expect(result?.projectMetrics.totalEngagement).toBe(65); // 50 views + 15 bookmarks
      expect(result?.projectMetrics.averageEngagementPerProject).toBe(32.5); // 65 / 2 approved projects

      // Check anonymized project data
      expect(result?.anonymizedProjectData).toHaveLength(3);
      expect(result?.anonymizedProjectData[0]).toEqual({
        projectIndex: 1,
        engagementScore: 41, // 25 views + 8 bookmarks * 2 = 25 + 16 = 41
        specialization: 'Web Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        isGroupProject: false,
        submissionMonth: '2024-06',
      });

      // Check technology insights
      expect(result?.technologyInsights).toHaveLength(2);
      expect(result?.technologyInsights[0]).toEqual({
        technology: 'React',
        usageCount: 1,
        averageEngagement: 33.0,
      });
    });

    it('should return null when supervisor has no projects in the period', async () => {
      projectRepository.find.mockResolvedValue([]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      expect(result).toBeNull();
    });

    it('should handle projects with zero engagement', async () => {
      const projectsWithPending = [mockProjects[2]]; // Only pending project
      projectRepository.find.mockResolvedValue(projectsWithPending as any);
      projectViewRepository.count.mockResolvedValue(0);
      projectBookmarkRepository.count.mockResolvedValue(0);
      projectRepository.query.mockResolvedValue([]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      expect(result?.projectMetrics.totalEngagement).toBe(0);
      expect(result?.projectMetrics.averageEngagementPerProject).toBe(0);
      expect(result?.anonymizedProjectData[0].engagementScore).toBe(0);
    });

    it('should properly anonymize project data for privacy', async () => {
      projectRepository.find.mockResolvedValue([mockProjects[0]] as any);
      projectViewRepository.count.mockResolvedValue(10);
      projectBookmarkRepository.count.mockResolvedValue(5);
      projectRepository.query.mockResolvedValue([]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      const anonymizedProject = result?.anonymizedProjectData[0];
      expect(anonymizedProject?.projectIndex).toBe(1); // Anonymous identifier
      expect(anonymizedProject?.submissionMonth).toBe('2024-06'); // Only month precision
      expect(anonymizedProject).not.toHaveProperty('id'); // No project ID
      expect(anonymizedProject).not.toHaveProperty('title'); // No project title
    });
  });

  describe('generateAdminAnalytics', () => {
    it('should generate privacy-compliant admin analytics', async () => {
      projectRepository.count
        .mockResolvedValueOnce(100) // Total approved projects
        .mockResolvedValueOnce(25); // New projects this period

      projectViewRepository.count.mockResolvedValue(5000);
      projectBookmarkRepository.count.mockResolvedValue(1000);

      const result = await service.generateAdminAnalytics(
        mockStartDate,
        mockEndDate,
      );

      expect(result).toBeDefined();
      expect(result.reportPeriod.startDate).toEqual(mockStartDate);
      expect(result.reportPeriod.endDate).toEqual(mockEndDate);
      expect(result.platformMetrics.totalProjects).toBe(100);
      expect(result.platformMetrics.newProjectsThisPeriod).toBe(25);
      expect(result.platformMetrics.totalEngagement).toBe(7000); // 5000 + 1000*2
      expect(result.platformMetrics.totalUsers).toBe(0); // Privacy protection
      expect(result.platformMetrics.newUsersThisPeriod).toBe(0); // Privacy protection
    });

    it('should include anonymized user behavior metrics', async () => {
      projectRepository.count.mockResolvedValue(0);
      projectViewRepository.count.mockResolvedValue(0);
      projectBookmarkRepository.count.mockResolvedValue(0);

      const result = await service.generateAdminAnalytics(
        mockStartDate,
        mockEndDate,
      );

      expect(result.anonymizedUserBehavior).toBeDefined();
      expect(
        result.anonymizedUserBehavior.averageProjectsViewedPerSession,
      ).toBeDefined();
      expect(
        result.anonymizedUserBehavior.averageBookmarksPerUser,
      ).toBeDefined();
      expect(result.anonymizedUserBehavior.peakUsageHours).toBeDefined();
      expect(
        result.anonymizedUserBehavior.popularSpecializations,
      ).toBeDefined();
    });
  });

  describe('generatePublicTrendsReport', () => {
    it('should generate public trends report with privacy protection', async () => {
      projectRepository.count.mockResolvedValue(47); // Will be rounded to 50 for privacy

      const result = await service.generatePublicTrendsReport(
        mockStartDate,
        mockEndDate,
      );

      expect(result).toBeDefined();
      expect(result.reportPeriod.startDate).toEqual(mockStartDate);
      expect(result.reportPeriod.endDate).toEqual(mockEndDate);
      expect(result.generalInsights.totalProjectsRange).toBe('50-60'); // Rounded for privacy
      expect(result.generalInsights.mostPopularDifficulty).toBeDefined();
      expect(result.generalInsights.groupVsIndividualRatio).toBeDefined();
    });

    it('should include technology and specialization trends', async () => {
      projectRepository.count.mockResolvedValue(25);

      const result = await service.generatePublicTrendsReport(
        mockStartDate,
        mockEndDate,
      );

      expect(result.technologyTrends).toBeDefined();
      expect(Array.isArray(result.technologyTrends)).toBe(true);
      expect(result.specializationTrends).toBeDefined();
      expect(Array.isArray(result.specializationTrends)).toBe(true);
    });
  });

  describe('exportSupervisorAnalytics', () => {
    beforeEach(() => {
      projectRepository.find.mockResolvedValue([mockProjects[0]] as any);
      projectViewRepository.count.mockResolvedValue(10);
      projectBookmarkRepository.count.mockResolvedValue(5);
      projectRepository.query.mockResolvedValue([]);
    });

    it('should export analytics as JSON format', async () => {
      const result = await service.exportSupervisorAnalytics(
        'supervisor-1',
        'json',
        mockStartDate,
        mockEndDate,
      );

      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.supervisorId).toBe('supervisor-1');
      expect(parsed.projectMetrics).toBeDefined();
      expect(parsed.anonymizedProjectData).toBeDefined();
    });

    it('should export analytics as CSV format', async () => {
      const result = await service.exportSupervisorAnalytics(
        'supervisor-1',
        'csv',
        mockStartDate,
        mockEndDate,
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Report Type,Supervisor Analytics');
      expect(result).toContain('Project Metrics');
      expect(result).toContain('Anonymized Project Data');
      expect(result).toContain('Project Index,Engagement Score,Specialization');
    });

    it('should throw error when no analytics data available', async () => {
      projectRepository.find.mockResolvedValue([]);

      await expect(
        service.exportSupervisorAnalytics(
          'supervisor-1',
          'json',
          mockStartDate,
          mockEndDate,
        ),
      ).rejects.toThrow('No analytics data available for the specified period');
    });
  });

  describe('privacy compliance', () => {
    it('should not expose individual user identifiers', async () => {
      projectRepository.find.mockResolvedValue(mockProjects as any);
      projectViewRepository.count.mockResolvedValue(10);
      projectBookmarkRepository.count.mockResolvedValue(5);
      projectRepository.query.mockResolvedValue([]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      // Check that no individual user data is exposed
      result?.anonymizedProjectData.forEach((project) => {
        expect(project).not.toHaveProperty('userId');
        expect(project).not.toHaveProperty('viewerIds');
        expect(project).not.toHaveProperty('bookmarkedBy');
        expect(project.projectIndex).toBeGreaterThan(0); // Anonymous identifier only
      });
    });

    it('should aggregate data below minimum threshold', async () => {
      // Test that technology insights respect minimum data threshold
      projectRepository.find.mockResolvedValue(mockProjects as any);
      projectViewRepository.count.mockResolvedValue(10);
      projectBookmarkRepository.count.mockResolvedValue(5);

      // Mock query to return data below threshold (should be filtered out)
      projectRepository.query.mockResolvedValue([
        {
          technology: 'LowUsageTech',
          usage_count: '2', // Below minimum threshold of 5
          average_engagement: '10.00',
        },
      ]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      // Verify that the query was called with the minimum threshold parameter
      expect(projectRepository.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([5]), // Minimum threshold
      );
    });

    it('should round project counts for public reports', async () => {
      // Test different project counts and their rounding
      const testCases = [
        { actual: 7, expected: '10-20' },
        { actual: 23, expected: '20-30' },
        { actual: 45, expected: '50-60' },
      ];

      for (const testCase of testCases) {
        projectRepository.count.mockResolvedValue(testCase.actual);

        const result = await service.generatePublicTrendsReport(
          mockStartDate,
          mockEndDate,
        );

        expect(result.generalInsights.totalProjectsRange).toBe(
          testCase.expected,
        );
      }
    });

    it('should limit date precision to month level', async () => {
      projectRepository.find.mockResolvedValue([mockProjects[0]] as any);
      projectViewRepository.count.mockResolvedValue(10);
      projectBookmarkRepository.count.mockResolvedValue(5);
      projectRepository.query.mockResolvedValue([]);

      const result = await service.generateSupervisorAnalytics(
        'supervisor-1',
        mockStartDate,
        mockEndDate,
      );

      const anonymizedProject = result?.anonymizedProjectData[0];
      expect(anonymizedProject?.submissionMonth).toMatch(/^\d{4}-\d{2}$/); // YYYY-MM format only
      expect(anonymizedProject?.submissionMonth).toBe('2024-06');
    });
  });

  describe('error handling', () => {
    it('should handle database errors in generateSupervisorAnalytics', async () => {
      projectRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateSupervisorAnalytics(
          'supervisor-1',
          mockStartDate,
          mockEndDate,
        ),
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in generateAdminAnalytics', async () => {
      projectRepository.count.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generateAdminAnalytics(mockStartDate, mockEndDate),
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in generatePublicTrendsReport', async () => {
      projectRepository.count.mockRejectedValue(new Error('Database error'));

      await expect(
        service.generatePublicTrendsReport(mockStartDate, mockEndDate),
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in exportSupervisorAnalytics', async () => {
      projectRepository.find.mockRejectedValue(new Error('Export error'));

      await expect(
        service.exportSupervisorAnalytics(
          'supervisor-1',
          'json',
          mockStartDate,
          mockEndDate,
        ),
      ).rejects.toThrow('Export error');
    });
  });

  describe('CSV export formatting', () => {
    it('should properly format CSV with correct headers and data', async () => {
      projectRepository.find.mockResolvedValue([mockProjects[0]] as any);
      projectViewRepository.count.mockResolvedValue(10);
      projectBookmarkRepository.count.mockResolvedValue(5);
      projectRepository.query.mockResolvedValue([]);

      const result = await service.exportSupervisorAnalytics(
        'supervisor-1',
        'csv',
        mockStartDate,
        mockEndDate,
      );

      const lines = result.split('\n');
      expect(lines[0]).toBe('Report Type,Supervisor Analytics');
      expect(lines[1]).toContain('Report Period,');
      expect(lines).toContain('Project Metrics');
      expect(lines).toContain('Total Projects,1');
      expect(lines).toContain('Anonymized Project Data');

      // Check CSV header for project data
      const projectDataHeaderIndex = lines.findIndex(
        (line) =>
          line ===
          'Project Index,Engagement Score,Specialization,Difficulty Level,Is Group Project,Submission Month',
      );
      expect(projectDataHeaderIndex).toBeGreaterThan(-1);

      // Check project data row
      const projectDataRow = lines[projectDataHeaderIndex + 1];
      expect(projectDataRow).toContain(
        '1,20,Web Development,intermediate,false,2024-06',
      );
    });
  });
});
