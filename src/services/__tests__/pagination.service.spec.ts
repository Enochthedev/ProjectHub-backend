import { Test, TestingModule } from '@nestjs/testing';
import { SelectQueryBuilder } from 'typeorm';
import { PaginationService, PaginationOptions } from '../pagination.service';
import { Project } from '../../entities/project.entity';

describe('PaginationService', () => {
  let service: PaginationService;
  let mockQueryBuilder: Partial<SelectQueryBuilder<Project>>;

  beforeEach(async () => {
    // Create a comprehensive mock query builder
    mockQueryBuilder = {
      clone: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
      getRawMany: jest.fn().mockResolvedValue([]),
      getSql: jest.fn().mockReturnValue('SELECT * FROM projects'),
      alias: 'project',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyOffsetPagination', () => {
    it('should apply default pagination when no options provided', () => {
      const options: PaginationOptions = {};

      service.applyOffsetPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20); // Default limit
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0); // Default offset
    });

    it('should apply custom limit and offset', () => {
      const options: PaginationOptions = {
        limit: 50,
        offset: 100,
      };

      service.applyOffsetPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(100);
    });

    it('should enforce maximum limit', () => {
      const options: PaginationOptions = {
        limit: 200, // Exceeds max limit of 100
      };

      service.applyOffsetPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100); // Capped at max
    });

    it('should enforce minimum offset', () => {
      const options: PaginationOptions = {
        offset: -10, // Negative offset
      };

      service.applyOffsetPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.offset).toHaveBeenCalledWith(0); // Minimum is 0
    });
  });

  describe('applyCursorPagination', () => {
    it('should apply cursor pagination with default options', () => {
      const options: PaginationOptions = {};

      service.applyCursorPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(21); // limit + 1
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.createdAt',
        'DESC',
      );
    });

    it('should apply cursor pagination with custom sort field and order', () => {
      const options: PaginationOptions = {
        sortField: 'title',
        sortOrder: 'ASC',
      };

      service.applyCursorPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'project.title',
        'ASC',
      );
    });

    it('should apply cursor filter when cursor is provided', () => {
      // Create a valid cursor
      const cursor = Buffer.from(
        JSON.stringify({ field: 'createdAt', value: '2024-01-01' }),
      ).toString('base64');

      const options: PaginationOptions = {
        cursor,
        sortOrder: 'DESC',
      };

      service.applyCursorPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'project.createdAt < :cursor',
        {
          cursor: '2024-01-01',
        },
      );
    });

    it('should handle invalid cursor gracefully', () => {
      const options: PaginationOptions = {
        cursor: 'invalid-cursor',
      };

      // Should not throw an error
      expect(() => {
        service.applyCursorPagination(
          mockQueryBuilder as SelectQueryBuilder<Project>,
          options,
        );
      }).not.toThrow();
    });
  });

  describe('executeOffsetPagination', () => {
    it('should execute offset pagination and return correct result', async () => {
      const mockItems = [
        { id: '1', title: 'Project 1' },
        { id: '2', title: 'Project 2' },
      ];

      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);
      mockQueryBuilder.getRawOne = jest.fn().mockResolvedValue({ count: '50' });

      const options: PaginationOptions = {
        limit: 20,
        offset: 0,
      };

      const result = await service.executeOffsetPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(result).toEqual({
        items: mockItems,
        total: 50,
        limit: 20,
        offset: 0,
        hasNext: true,
        hasPrevious: false,
        totalPages: 3,
        currentPage: 1,
      });
    });

    it('should handle pagination on last page', async () => {
      const mockItems = [{ id: '1', title: 'Project 1' }];

      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);
      mockQueryBuilder.getRawOne = jest.fn().mockResolvedValue({ count: '21' });

      const options: PaginationOptions = {
        limit: 20,
        offset: 20,
      };

      const result = await service.executeOffsetPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(result).toEqual({
        items: mockItems,
        total: 21,
        limit: 20,
        offset: 20,
        hasNext: false,
        hasPrevious: true,
        totalPages: 2,
        currentPage: 2,
      });
    });
  });

  describe('executeCursorPagination', () => {
    it('should execute cursor pagination and return correct result', async () => {
      const mockItems = [
        { id: '1', title: 'Project 1', createdAt: new Date('2024-01-01') },
        { id: '2', title: 'Project 2', createdAt: new Date('2024-01-02') },
      ];

      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);

      const options: PaginationOptions = {
        limit: 20,
      };

      const result = await service.executeCursorPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(result.items).toEqual(mockItems);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should detect next page when more items available', async () => {
      // Create 21 items (limit + 1)
      const mockItems = Array.from({ length: 21 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Project ${i + 1}`,
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
      }));

      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);

      const options: PaginationOptions = {
        limit: 20,
      };

      const result = await service.executeCursorPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(result.items).toHaveLength(20); // Extra item removed
      expect(result.hasNext).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('should indicate previous page when cursor is provided', async () => {
      const mockItems = [
        { id: '1', title: 'Project 1', createdAt: new Date('2024-01-01') },
      ];

      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(mockItems);

      const cursor = Buffer.from(
        JSON.stringify({ field: 'createdAt', value: '2024-01-01' }),
      ).toString('base64');

      const options: PaginationOptions = {
        cursor,
        limit: 20,
      };

      const result = await service.executeCursorPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(result.hasPrevious).toBe(true);
      expect(result.previousCursor).toBeDefined();
    });
  });

  describe('createLazyLoadingQuery', () => {
    it('should select only essential fields by default', () => {
      service.createLazyLoadingQuery(
        mockQueryBuilder as SelectQueryBuilder<Project>,
      );

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        'project.id',
        'project.title',
        'project.abstract',
        'project.specialization',
        'project.difficultyLevel',
        'project.year',
        'project.tags',
        'project.technologyStack',
        'project.isGroupProject',
        'project.approvalStatus',
        'project.createdAt',
        'project.approvedAt',
      ]);

      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith([
        'supervisor.id',
        'supervisor.firstName',
        'supervisor.lastName',
        'supervisor.email',
      ]);
    });

    it('should load additional relations when specified', () => {
      const relations = ['views', 'bookmarks'];

      service.createLazyLoadingQuery(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        relations,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.views',
        'views',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.bookmarks',
        'bookmarks',
      );
    });

    it('should handle supervisor profile relation', () => {
      const relations = ['supervisor.profile'];

      service.createLazyLoadingQuery(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        relations,
      );

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'supervisor.supervisorProfile',
        'supervisorProfile',
      );
    });
  });

  describe('validatePaginationOptions', () => {
    it('should apply default values for missing options', () => {
      const options: PaginationOptions = {};

      const result = service.validatePaginationOptions(options);

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it('should enforce minimum and maximum limits', () => {
      const options: PaginationOptions = {
        limit: 0, // Below minimum
        offset: -5, // Below minimum
      };

      const result = service.validatePaginationOptions(options);

      expect(result.limit).toBe(1); // Minimum limit
      expect(result.offset).toBe(0); // Minimum offset
    });

    it('should cap limit at maximum', () => {
      const options: PaginationOptions = {
        limit: 200, // Above maximum
      };

      const result = service.validatePaginationOptions(options);

      expect(result.limit).toBe(100); // Maximum limit
    });
  });

  describe('getPaginationMetadata', () => {
    it('should return correct pagination metadata', async () => {
      mockQueryBuilder.getRawOne = jest
        .fn()
        .mockResolvedValue({ count: '100' });

      const options: PaginationOptions = {
        limit: 20,
        offset: 40,
      };

      const result = await service.getPaginationMetadata(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        options,
      );

      expect(result).toEqual({
        total: 100,
        totalPages: 5,
        currentPage: 3,
        hasNext: true,
        hasPrevious: true,
      });
    });
  });

  describe('streamPagination', () => {
    it('should yield batches of data', async () => {
      const batch1 = [{ id: '1' }, { id: '2' }];
      const batch2 = [{ id: '3' }];

      mockQueryBuilder.getMany = jest
        .fn()
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)
        .mockResolvedValueOnce([]);

      const batches: any[] = [];
      for await (const batch of service.streamPagination(
        mockQueryBuilder as SelectQueryBuilder<Project>,
        2,
      )) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]).toEqual(batch1);
      expect(batches[1]).toEqual(batch2);
    });
  });

  describe('cursor encoding/decoding', () => {
    it('should encode and decode cursors correctly', () => {
      // Access private methods for testing
      const encodeCursor = (service as any).encodeCursor.bind(service);
      const decodeCursor = (service as any).decodeCursor.bind(service);

      const originalCursor = { field: 'createdAt', value: '2024-01-01' };
      const encoded = encodeCursor(originalCursor);
      const decoded = decodeCursor(encoded);

      expect(decoded).toEqual(originalCursor);
    });

    it('should handle invalid cursor gracefully', () => {
      const decodeCursor = (service as any).decodeCursor.bind(service);

      const result = decodeCursor('invalid-cursor');

      expect(result).toBeNull();
    });
  });
});
