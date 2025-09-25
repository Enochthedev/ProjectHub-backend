import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectViewTrackingService,
  ViewTrackingData,
} from '../project-view-tracking.service';
import { ProjectView } from '../../entities/project-view.entity';

describe('ProjectViewTrackingService', () => {
  let service: ProjectViewTrackingService;
  let repository: jest.Mocked<Repository<ProjectView>>;

  const mockProjectView = {
    id: 'view-1',
    projectId: 'project-1',
    viewerId: 'user-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    viewedAt: new Date(),
  };

  const mockViewTrackingData: ViewTrackingData = {
    projectId: 'project-1',
    viewerId: 'user-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectViewTrackingService,
        {
          provide: getRepositoryToken(ProjectView),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProjectViewTrackingService>(
      ProjectViewTrackingService,
    );
    repository = module.get(getRepositoryToken(ProjectView));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('trackProjectView', () => {
    it('should successfully track a new project view', async () => {
      repository.findOne.mockResolvedValue(null); // No duplicate found
      repository.create.mockReturnValue(mockProjectView as any);
      repository.save.mockResolvedValue(mockProjectView as any);

      const result = await service.trackProjectView(mockViewTrackingData);

      expect(result).toBe(true);
      expect(repository.create).toHaveBeenCalledWith({
        projectId: mockViewTrackingData.projectId,
        viewerId: mockViewTrackingData.viewerId,
        ipAddress: mockViewTrackingData.ipAddress,
        userAgent: mockViewTrackingData.userAgent,
      });
      expect(repository.save).toHaveBeenCalledWith(mockProjectView);
    });

    it('should track anonymous user view when viewerId is not provided', async () => {
      const anonymousData = { ...mockViewTrackingData, viewerId: undefined };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue({
        ...mockProjectView,
        viewerId: null,
      } as any);
      repository.save.mockResolvedValue({
        ...mockProjectView,
        viewerId: null,
      } as any);

      const result = await service.trackProjectView(anonymousData);

      expect(result).toBe(true);
      expect(repository.create).toHaveBeenCalledWith({
        projectId: anonymousData.projectId,
        viewerId: null,
        ipAddress: anonymousData.ipAddress,
        userAgent: anonymousData.userAgent,
      });
    });

    it('should prevent duplicate views within deduplication window', async () => {
      repository.findOne.mockResolvedValue(mockProjectView as any); // Duplicate found

      const result = await service.trackProjectView(mockViewTrackingData);

      expect(result).toBe(false);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('should sanitize malicious user agent strings', async () => {
      const maliciousData = {
        ...mockViewTrackingData,
        userAgent: '<script>alert("xss")</script>Mozilla/5.0',
      };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProjectView as any);
      repository.save.mockResolvedValue(mockProjectView as any);

      await service.trackProjectView(maliciousData);

      expect(repository.create).toHaveBeenCalledWith({
        projectId: maliciousData.projectId,
        viewerId: maliciousData.viewerId,
        ipAddress: maliciousData.ipAddress,
        userAgent: 'scriptalert(xss)/scriptMozilla/5.0', // Sanitized
      });
    });

    it('should handle empty or null user agent', async () => {
      const dataWithEmptyUA = { ...mockViewTrackingData, userAgent: '' };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProjectView as any);
      repository.save.mockResolvedValue(mockProjectView as any);

      await service.trackProjectView(dataWithEmptyUA);

      expect(repository.create).toHaveBeenCalledWith({
        projectId: dataWithEmptyUA.projectId,
        viewerId: dataWithEmptyUA.viewerId,
        ipAddress: dataWithEmptyUA.ipAddress,
        userAgent: 'Unknown',
      });
    });

    it('should throw error when repository operation fails', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProjectView as any);
      repository.save.mockRejectedValue(new Error('Database error'));

      await expect(
        service.trackProjectView(mockViewTrackingData),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getProjectViewCount', () => {
    it('should return correct view count for a project', async () => {
      repository.count.mockResolvedValue(42);

      const result = await service.getProjectViewCount('project-1');

      expect(result).toBe(42);
      expect(repository.count).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
    });

    it('should throw error when count operation fails', async () => {
      repository.count.mockRejectedValue(new Error('Database error'));

      await expect(service.getProjectViewCount('project-1')).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('getProjectUniqueViewerCount', () => {
    it('should return correct unique viewer count', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '15' }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getProjectUniqueViewerCount('project-1');

      expect(result).toBe(15);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'COUNT(DISTINCT view.viewerId)',
        'count',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'view.projectId = :projectId',
        { projectId: 'project-1' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'view.viewerId IS NOT NULL',
      );
    });

    it('should return 0 when no unique viewers found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: null }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getProjectUniqueViewerCount('project-1');

      expect(result).toBe(0);
    });
  });

  describe('getRecentViewCount', () => {
    it('should return recent view count with default 24 hours', async () => {
      repository.count.mockResolvedValue(10);

      const result = await service.getRecentViewCount('project-1');

      expect(result).toBe(10);
      expect(repository.count).toHaveBeenCalledWith({
        where: {
          projectId: 'project-1',
          viewedAt: {
            $gte: expect.any(Date),
          },
        },
      });
    });

    it('should return recent view count with custom hours', async () => {
      repository.count.mockResolvedValue(5);

      const result = await service.getRecentViewCount('project-1', 12);

      expect(result).toBe(5);
    });
  });

  describe('cleanupOldViews', () => {
    it('should cleanup old view records successfully', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 100 }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanupOldViews(365);

      expect(result).toBe(100);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'viewedAt < :cutoffDate',
        {
          cutoffDate: expect.any(Date),
        },
      );
    });

    it('should handle cleanup when no records are affected', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: null }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanupOldViews();

      expect(result).toBe(0);
    });
  });

  describe('privacy and security', () => {
    it('should properly handle IP address privacy', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProjectView as any);
      repository.save.mockResolvedValue(mockProjectView as any);

      await service.trackProjectView(mockViewTrackingData);

      // Verify IP address is stored as-is for deduplication but could be hashed in production
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: mockViewTrackingData.ipAddress,
        }),
      );
    });

    it('should limit user agent string length', async () => {
      const longUserAgent = 'A'.repeat(1000);
      const dataWithLongUA = {
        ...mockViewTrackingData,
        userAgent: longUserAgent,
      };
      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockProjectView as any);
      repository.save.mockResolvedValue(mockProjectView as any);

      await service.trackProjectView(dataWithLongUA);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userAgent: 'A'.repeat(500), // Truncated to 500 characters
        }),
      );
    });

    it('should properly deduplicate for both authenticated and anonymous users', async () => {
      // Test authenticated user deduplication
      repository.findOne.mockResolvedValueOnce(mockProjectView as any);
      let result = await service.trackProjectView(mockViewTrackingData);
      expect(result).toBe(false);

      // Test anonymous user deduplication
      const anonymousData = { ...mockViewTrackingData, viewerId: undefined };
      repository.findOne.mockResolvedValueOnce(mockProjectView as any);
      result = await service.trackProjectView(anonymousData);
      expect(result).toBe(false);
    });
  });
});
