import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAnalyticsService } from '../project-analytics.service';
import { Project } from '../../entities/project.entity';
import { ProjectView } from '../../entities/project-view.entity';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';

describe('ProjectAnalyticsService', () => {
  let service: ProjectAnalyticsService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let projectViewRepository: jest.Mocked<Repository<ProjectView>>;
  let projectBookmarkRepository: jest.Mocked<Repository<ProjectBookmark>>;

  const mockProject = {
    id: 'project-1',
    title: 'Test Project',
    specialization: 'Web Development',
    technologyStack: ['React', 'Node.js'],
  };

  beforeEach(async () => {
    const mockProjectRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      query: jest.fn(),
    };

    const mockProjectViewRepository = {
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockProjectBookmarkRepository = {
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAnalyticsService,
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

    service = module.get<ProjectAnalyticsService>(ProjectAnalyticsService);
    projectRepository = module.get(getRepositoryToken(Project));
    projectViewRepository = module.get(getRepositoryToken(ProjectView));
    projectBookmarkRepository = module.get(getRepositoryToken(ProjectBookmark));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProjectPopularityMetrics', () => {
    it('should return popularity metrics for existing project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject as any);
      projectViewRepository.count.mockResolvedValueOnce(100); // total views
      projectBookmarkRepository.count.mockResolvedValue(25);

      // Mock unique viewer count
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '15' }),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock recent view count
      projectViewRepository.count.mockResolvedValueOnce(20); // recent views

      const result = await service.getProjectPopularityMetrics('project-1');

      expect(result).toEqual({
        projectId: 'project-1',
        title: 'Test Project',
        viewCount: 100,
        bookmarkCount: 25,
        uniqueViewerCount: 15,
        popularityScore: 205, // 100*1 + 25*3 + 15*2 = 205
        recentViewCount: 20,
      });
    });

    it('should return null for non-existent project', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      const result = await service.getProjectPopularityMetrics('non-existent');

      expect(result).toBeNull();
      expect(projectViewRepository.count).not.toHaveBeenCalled();
    });

    it('should handle zero metrics gracefully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject as any);
      projectViewRepository.count.mockResolvedValue(0);
      projectBookmarkRepository.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getProjectPopularityMetrics('project-1');

      expect(result?.popularityScore).toBe(0);
      expect(result?.viewCount).toBe(0);
      expect(result?.bookmarkCount).toBe(0);
    });
  });

  describe('getTrendingProjects', () => {
    it('should return trending projects with correct trend scores', async () => {
      const mockTrendingData = [
        {
          projectId: 'project-1',
          title: 'Trending Project 1',
          specialization: 'AI & ML',
          technologyStack: ['Python', 'TensorFlow'],
          viewCount: '50',
          bookmarkCount: '10',
          trendScore: '100.0',
        },
        {
          projectId: 'project-2',
          title: 'Trending Project 2',
          specialization: 'Web Development',
          technologyStack: ['React', 'Node.js'],
          viewCount: '30',
          bookmarkCount: '8',
          trendScore: '80.0',
        },
      ];

      projectRepository.query.mockResolvedValue(mockTrendingData);

      const result = await service.getTrendingProjects(10, 7);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        projectId: 'project-1',
        title: 'Trending Project 1',
        specialization: 'AI & ML',
        technologyStack: ['Python', 'TensorFlow'],
        viewCount: 50,
        bookmarkCount: 10,
        trendScore: 100.0,
      });
      expect(projectRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY "trendScore" DESC'),
        [expect.any(Date), 10],
      );
    });

    it('should handle empty trending results', async () => {
      projectRepository.query.mockResolvedValue([]);

      const result = await service.getTrendingProjects();

      expect(result).toEqual([]);
    });
  });

  describe('getSupervisorAnalytics', () => {
    it('should return comprehensive supervisor analytics', async () => {
      const mockSupervisorData = [
        {
          supervisor_id: 'supervisor-1',
          supervisor_name: 'Dr. John Smith',
          total_projects: '5',
          total_views: '250',
          total_bookmarks: '50',
          average_views_per_project: '50.0',
          average_bookmarks_per_project: '10.0',
        },
      ];

      const mockMostPopularProject = {
        id: 'project-1',
        title: 'Most Popular Project',
        view_count: '100',
        bookmark_count: '20',
      };

      projectRepository.query
        .mockResolvedValueOnce(mockSupervisorData)
        .mockResolvedValueOnce([mockMostPopularProject]);

      const result = await service.getSupervisorAnalytics('supervisor-1');

      expect(result).toEqual({
        supervisorId: 'supervisor-1',
        supervisorName: 'Dr. John Smith',
        totalProjects: 5,
        totalViews: 250,
        totalBookmarks: 50,
        averageViewsPerProject: 50.0,
        averageBookmarksPerProject: 10.0,
        mostPopularProject: {
          id: 'project-1',
          title: 'Most Popular Project',
          viewCount: 100,
          bookmarkCount: 20,
        },
      });
    });

    it('should return null for non-existent supervisor', async () => {
      projectRepository.query.mockResolvedValue([]);

      const result = await service.getSupervisorAnalytics('non-existent');

      expect(result).toBeNull();
    });

    it('should handle supervisor with no popular projects', async () => {
      const mockSupervisorData = [
        {
          supervisor_id: 'supervisor-1',
          supervisor_name: 'Dr. Jane Doe',
          total_projects: '0',
          total_views: '0',
          total_bookmarks: '0',
          average_views_per_project: '0',
          average_bookmarks_per_project: '0',
        },
      ];

      projectRepository.query
        .mockResolvedValueOnce(mockSupervisorData)
        .mockResolvedValueOnce([]); // No popular projects

      const result = await service.getSupervisorAnalytics('supervisor-1');

      expect(result?.mostPopularProject).toBeNull();
      expect(result?.totalProjects).toBe(0);
    });
  });

  describe('getTechnologyTrends', () => {
    it('should return technology trends with popularity metrics', async () => {
      const mockTechnologyData = [
        {
          technology: 'React',
          project_count: '15',
          total_views: '500',
          total_bookmarks: '100',
          average_popularity: '46.67',
        },
        {
          technology: 'Python',
          project_count: '12',
          total_views: '400',
          total_bookmarks: '80',
          average_popularity: '46.67',
        },
      ];

      projectRepository.query.mockResolvedValue(mockTechnologyData);

      const result = await service.getTechnologyTrends(20);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        technology: 'React',
        projectCount: 15,
        totalViews: 500,
        totalBookmarks: 100,
        averagePopularity: 46.67,
      });
      expect(projectRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('UNNEST(p.technology_stack)'),
        [20],
      );
    });

    it('should handle empty technology trends', async () => {
      projectRepository.query.mockResolvedValue([]);

      const result = await service.getTechnologyTrends();

      expect(result).toEqual([]);
    });
  });

  describe('getSpecializationTrends', () => {
    it('should return specialization trends', async () => {
      const mockSpecializationData = [
        {
          specialization: 'AI & Machine Learning',
          project_count: '20',
          total_views: '800',
          total_bookmarks: '150',
          average_popularity: '55.0',
        },
        {
          specialization: 'Web Development',
          project_count: '25',
          total_views: '750',
          total_bookmarks: '120',
          average_popularity: '39.6',
        },
      ];

      projectRepository.query.mockResolvedValue(mockSpecializationData);

      const result = await service.getSpecializationTrends();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        specialization: 'AI & Machine Learning',
        projectCount: 20,
        totalViews: 800,
        totalBookmarks: 150,
        averagePopularity: 55.0,
      });
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should return comprehensive platform analytics', async () => {
      projectRepository.count.mockResolvedValue(100);
      projectViewRepository.count.mockResolvedValueOnce(5000); // total views
      projectBookmarkRepository.count.mockResolvedValueOnce(1000); // total bookmarks

      // Mock unique viewers
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '500' }),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Mock recent metrics
      projectViewRepository.count.mockResolvedValueOnce(300); // recent views
      projectBookmarkRepository.count.mockResolvedValueOnce(80); // recent bookmarks

      const result = await service.getPlatformAnalytics();

      expect(result).toEqual({
        totalProjects: 100,
        totalViews: 5000,
        totalBookmarks: 1000,
        totalUniqueViewers: 500,
        recentViews: 300,
        recentBookmarks: 80,
        averageViewsPerProject: 50,
        averageBookmarksPerProject: 10,
      });
    });

    it('should handle zero projects gracefully', async () => {
      projectRepository.count.mockResolvedValue(0);
      projectViewRepository.count.mockResolvedValue(0);
      projectBookmarkRepository.count.mockResolvedValue(0);

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await service.getPlatformAnalytics();

      expect(result.averageViewsPerProject).toBe(0);
      expect(result.averageBookmarksPerProject).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle database errors in getProjectPopularityMetrics', async () => {
      projectRepository.findOne.mockRejectedValue(new Error('Database error'));

      await expect(
        service.getProjectPopularityMetrics('project-1'),
      ).rejects.toThrow('Database error');
    });

    it('should handle database errors in getTrendingProjects', async () => {
      projectRepository.query.mockRejectedValue(new Error('Query error'));

      await expect(service.getTrendingProjects()).rejects.toThrow(
        'Query error',
      );
    });

    it('should handle database errors in getSupervisorAnalytics', async () => {
      projectRepository.query.mockRejectedValue(new Error('Analytics error'));

      await expect(
        service.getSupervisorAnalytics('supervisor-1'),
      ).rejects.toThrow('Analytics error');
    });
  });

  describe('popularity score calculation', () => {
    it('should calculate popularity score correctly', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject as any);
      projectViewRepository.count.mockResolvedValueOnce(10); // views
      projectBookmarkRepository.count.mockResolvedValue(5); // bookmarks

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '3' }), // unique viewers
      };
      projectViewRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );
      projectViewRepository.count.mockResolvedValueOnce(2); // recent views

      const result = await service.getProjectPopularityMetrics('project-1');

      // Expected: 10*1 + 5*3 + 3*2 = 10 + 15 + 6 = 31
      expect(result?.popularityScore).toBe(31);
    });
  });
});
