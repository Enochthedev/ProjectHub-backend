import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookmarkService } from '../bookmark.service';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { Project } from '../../entities/project.entity';
import { BookmarkCategory } from '../../entities/bookmark-category.entity';
import { ExportBookmarksDto, ExportFormat } from '../../dto/bookmark';
import { ApprovalStatus, DifficultyLevel } from '../../common/enums';

describe('BookmarkService - Export Features', () => {
  let service: BookmarkService;
  let bookmarkRepository: Repository<ProjectBookmark>;

  const mockBookmarkRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  const mockBookmarkWithProject = {
    id: 'bookmark-1',
    studentId: 'student-1',
    projectId: 'project-1',
    categoryId: 'category-1',
    createdAt: new Date('2024-01-15'),
    project: {
      id: 'project-1',
      title: 'React E-commerce App',
      abstract:
        'A full-stack e-commerce application built with React and Node.js',
      specialization: 'Web Development',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
      tags: ['react', 'nodejs', 'ecommerce'],
      technologyStack: ['React', 'Node.js', 'MongoDB'],
      supervisor: {
        id: 'supervisor-1',
        email: 'supervisor@example.com',
        supervisorProfile: {
          name: 'Dr. John Smith',
        },
      },
    },
    category: {
      id: 'category-1',
      name: 'Web Development Projects',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkService,
        {
          provide: getRepositoryToken(ProjectBookmark),
          useValue: mockBookmarkRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(BookmarkCategory),
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<BookmarkService>(BookmarkService);
    bookmarkRepository = module.get<Repository<ProjectBookmark>>(
      getRepositoryToken(ProjectBookmark),
    );

    // Reset mocks
    mockBookmarkRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('exportBookmarks', () => {
    const exportDto: ExportBookmarksDto = {
      format: ExportFormat.JSON,
    };

    it('should export bookmarks in JSON format', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([mockBookmarkWithProject]);

      const result = await service.exportBookmarks('student-1', exportDto);

      expect(mockBookmarkRepository.createQueryBuilder).toHaveBeenCalledWith(
        'bookmark',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'bookmark.project',
        'project',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'project.supervisor',
        'supervisor',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'supervisor.supervisorProfile',
        'supervisorProfile',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'bookmark.category',
        'category',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'bookmark.studentId = :studentId',
        { studentId: 'student-1' },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'bookmark.createdAt',
        'DESC',
      );

      expect(result.bookmarks).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.exportedAt).toBeInstanceOf(Date);

      const exportedBookmark = result.bookmarks[0];
      expect(exportedBookmark.id).toBe('bookmark-1');
      expect(exportedBookmark.projectTitle).toBe('React E-commerce App');
      expect(exportedBookmark.supervisorName).toBe('Dr. John Smith');
      expect(exportedBookmark.categoryName).toBe('Web Development Projects');
      expect(exportedBookmark.tags).toEqual(['react', 'nodejs', 'ecommerce']);
      expect(exportedBookmark.technologyStack).toEqual([
        'React',
        'Node.js',
        'MongoDB',
      ]);
    });

    it('should apply date filters when provided', async () => {
      const exportDtoWithDates: ExportBookmarksDto = {
        format: ExportFormat.JSON,
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockBookmarkWithProject]);

      await service.exportBookmarks('student-1', exportDtoWithDates);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bookmark.createdAt >= :fromDate',
        { fromDate: '2024-01-01' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bookmark.createdAt <= :toDate',
        { toDate: '2024-01-31' },
      );
    });

    it('should apply category filter when provided', async () => {
      const exportDtoWithCategory: ExportBookmarksDto = {
        format: ExportFormat.JSON,
        categoryId: 'category-1',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockBookmarkWithProject]);

      await service.exportBookmarks('student-1', exportDtoWithCategory);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bookmark.categoryId = :categoryId',
        { categoryId: 'category-1' },
      );
    });

    it('should handle bookmarks without categories', async () => {
      const bookmarkWithoutCategory = {
        ...mockBookmarkWithProject,
        category: null,
      };

      mockQueryBuilder.getMany.mockResolvedValue([bookmarkWithoutCategory]);

      const result = await service.exportBookmarks('student-1', exportDto);

      const exportedBookmark = result.bookmarks[0];
      expect(exportedBookmark.categoryName).toBeUndefined();
    });

    it('should handle bookmarks with missing supervisor profile', async () => {
      const bookmarkWithoutSupervisorProfile = {
        ...mockBookmarkWithProject,
        project: {
          ...mockBookmarkWithProject.project,
          supervisor: {
            id: 'supervisor-1',
            email: 'supervisor@example.com',
            supervisorProfile: null,
          },
        },
      };

      mockQueryBuilder.getMany.mockResolvedValue([
        bookmarkWithoutSupervisorProfile,
      ]);

      const result = await service.exportBookmarks('student-1', exportDto);

      const exportedBookmark = result.bookmarks[0];
      expect(exportedBookmark.supervisorName).toBe('Unknown');
    });

    it('should include filters in export data', async () => {
      const exportDtoWithFilters: ExportBookmarksDto = {
        format: ExportFormat.CSV,
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        categoryId: 'category-1',
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockBookmarkWithProject]);

      const result = await service.exportBookmarks(
        'student-1',
        exportDtoWithFilters,
      );

      expect(result.filters).toEqual({
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        categoryId: 'category-1',
      });
    });

    it('should handle empty bookmark list', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.exportBookmarks('student-1', exportDto);

      expect(result.bookmarks).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.exportedAt).toBeInstanceOf(Date);
    });

    it('should support different export formats', async () => {
      const csvExportDto: ExportBookmarksDto = {
        format: ExportFormat.CSV,
      };

      const pdfExportDto: ExportBookmarksDto = {
        format: ExportFormat.PDF,
      };

      mockQueryBuilder.getMany.mockResolvedValue([mockBookmarkWithProject]);

      // Test CSV format
      const csvResult = await service.exportBookmarks(
        'student-1',
        csvExportDto,
      );
      expect(csvResult.bookmarks).toHaveLength(1);

      // Test PDF format
      const pdfResult = await service.exportBookmarks(
        'student-1',
        pdfExportDto,
      );
      expect(pdfResult.bookmarks).toHaveLength(1);
    });
  });
});
