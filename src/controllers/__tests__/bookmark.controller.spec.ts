import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookmarkController } from '../bookmark.controller';
import { BookmarkService } from '../../services/bookmark.service';
import {
  CreateBookmarkDto,
  BookmarkResponseDto,
  PaginatedBookmarksDto,
  BookmarkQueryDto,
  CompareProjectsDto,
  ProjectComparisonDto,
  CreateBookmarkCategoryDto,
  UpdateBookmarkCategoryDto,
  BookmarkCategoryDto,
  AssignBookmarkCategoryDto,
  ExportBookmarksDto,
  BookmarkExportData,
  ExportFormat,
} from '../../dto/bookmark';
import { UserRole, DifficultyLevel, ApprovalStatus } from '../../common/enums';

describe('BookmarkController', () => {
  let controller: BookmarkController;
  let bookmarkService: jest.Mocked<BookmarkService>;

  const mockStudentUser = {
    id: 'student-id',
    role: UserRole.STUDENT,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@university.edu',
  };

  const mockCreateBookmarkDto: CreateBookmarkDto = {
    projectId: '123e4567-e89b-12d3-a456-426614174000',
  };

  const mockBookmarkResponse: BookmarkResponseDto = {
    id: 'bookmark-id',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    createdAt: new Date(),
    project: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Project',
      abstract: 'Test project abstract',
      specialization: 'Web Development & Full Stack',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
      tags: ['react', 'nodejs'],
      technologyStack: ['React', 'Node.js'],
      isGroupProject: false,
      approvalStatus: ApprovalStatus.APPROVED,
      supervisor: {
        id: 'supervisor-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@university.edu',
      },
      createdAt: new Date(),
      approvedAt: new Date(),
    },
  };

  const mockPaginatedBookmarks: PaginatedBookmarksDto = {
    bookmarks: [mockBookmarkResponse],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockBookmarkCategory: BookmarkCategoryDto = {
    id: 'category-id',
    name: 'Favorites',
    description: 'My favorite projects',
    color: '#FF5733',
    createdAt: new Date(),
    updatedAt: new Date(),
    bookmarkCount: 5,
  };

  beforeEach(async () => {
    const mockBookmarkService = {
      createBookmark: jest.fn(),
      removeBookmark: jest.fn(),
      removeBookmarkByProjectId: jest.fn(),
      getUserBookmarks: jest.fn(),
      isProjectBookmarked: jest.fn(),
      compareBookmarkedProjects: jest.fn(),
      createCategory: jest.fn(),
      getUserCategories: jest.fn(),
      updateCategory: jest.fn(),
      deleteCategory: jest.fn(),
      assignBookmarkToCategory: jest.fn(),
      exportBookmarks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [{ provide: BookmarkService, useValue: mockBookmarkService }],
    }).compile();

    controller = module.get<BookmarkController>(BookmarkController);
    bookmarkService = module.get(BookmarkService);
  });

  describe('createBookmark', () => {
    it('should create bookmark successfully', async () => {
      const mockRequest = { user: mockStudentUser };

      bookmarkService.createBookmark.mockResolvedValue(mockBookmarkResponse);

      const result = await controller.createBookmark(
        mockRequest,
        mockCreateBookmarkDto,
      );

      expect(result).toEqual(mockBookmarkResponse);
      expect(bookmarkService.createBookmark).toHaveBeenCalledWith(
        mockStudentUser.id,
        mockCreateBookmarkDto,
      );
    });

    it('should handle duplicate bookmark error', async () => {
      const mockRequest = { user: mockStudentUser };

      bookmarkService.createBookmark.mockRejectedValue(
        new ConflictException('Project is already bookmarked'),
      );

      await expect(
        controller.createBookmark(mockRequest, mockCreateBookmarkDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle project not found error', async () => {
      const mockRequest = { user: mockStudentUser };

      bookmarkService.createBookmark.mockRejectedValue(
        new NotFoundException('Project not found or not approved'),
      );

      await expect(
        controller.createBookmark(mockRequest, mockCreateBookmarkDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark successfully', async () => {
      const mockRequest = { user: mockStudentUser };
      const bookmarkId = 'bookmark-id';

      bookmarkService.removeBookmark.mockResolvedValue(undefined);

      await controller.removeBookmark(mockRequest, bookmarkId);

      expect(bookmarkService.removeBookmark).toHaveBeenCalledWith(
        mockStudentUser.id,
        bookmarkId,
      );
    });

    it('should handle bookmark not found error', async () => {
      const mockRequest = { user: mockStudentUser };
      const bookmarkId = 'non-existent-id';

      bookmarkService.removeBookmark.mockRejectedValue(
        new NotFoundException('Bookmark not found'),
      );

      await expect(
        controller.removeBookmark(mockRequest, bookmarkId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeBookmarkByProjectId', () => {
    it('should remove bookmark by project ID successfully', async () => {
      const mockRequest = { user: mockStudentUser };
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      bookmarkService.removeBookmarkByProjectId.mockResolvedValue(undefined);

      await controller.removeBookmarkByProjectId(mockRequest, projectId);

      expect(bookmarkService.removeBookmarkByProjectId).toHaveBeenCalledWith(
        mockStudentUser.id,
        projectId,
      );
    });

    it('should handle bookmark not found error', async () => {
      const mockRequest = { user: mockStudentUser };
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      bookmarkService.removeBookmarkByProjectId.mockRejectedValue(
        new NotFoundException('Bookmark not found'),
      );

      await expect(
        controller.removeBookmarkByProjectId(mockRequest, projectId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserBookmarks', () => {
    it('should return user bookmarks with pagination', async () => {
      const mockRequest = { user: mockStudentUser };
      const query: BookmarkQueryDto = {
        limit: 20,
        page: 1,
      };

      bookmarkService.getUserBookmarks.mockResolvedValue(
        mockPaginatedBookmarks,
      );

      const result = await controller.getUserBookmarks(mockRequest, query);

      expect(result).toEqual(mockPaginatedBookmarks);
      expect(bookmarkService.getUserBookmarks).toHaveBeenCalledWith(
        mockStudentUser.id,
        query,
      );
    });

    it('should return filtered bookmarks by category', async () => {
      const mockRequest = { user: mockStudentUser };
      const query: BookmarkQueryDto = {
        limit: 10,
        page: 1,
      };

      bookmarkService.getUserBookmarks.mockResolvedValue(
        mockPaginatedBookmarks,
      );

      const result = await controller.getUserBookmarks(mockRequest, query);

      expect(result).toEqual(mockPaginatedBookmarks);
      expect(bookmarkService.getUserBookmarks).toHaveBeenCalledWith(
        mockStudentUser.id,
        query,
      );
    });
  });

  describe('checkBookmarkStatus', () => {
    it('should return true when project is bookmarked', async () => {
      const mockRequest = { user: mockStudentUser };
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      bookmarkService.isProjectBookmarked.mockResolvedValue(true);

      const result = await controller.checkBookmarkStatus(
        mockRequest,
        projectId,
      );

      expect(result).toEqual({ isBookmarked: true });
      expect(bookmarkService.isProjectBookmarked).toHaveBeenCalledWith(
        mockStudentUser.id,
        projectId,
      );
    });

    it('should return false when project is not bookmarked', async () => {
      const mockRequest = { user: mockStudentUser };
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      bookmarkService.isProjectBookmarked.mockResolvedValue(false);

      const result = await controller.checkBookmarkStatus(
        mockRequest,
        projectId,
      );

      expect(result).toEqual({ isBookmarked: false });
    });
  });

  describe('compareProjects', () => {
    it('should compare bookmarked projects successfully', async () => {
      const mockRequest = { user: mockStudentUser };
      const compareDto: CompareProjectsDto = {
        projectIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '987fcdeb-51a2-43d1-b789-123456789abc',
        ],
      };

      const mockComparison: ProjectComparisonDto = {
        projects: [
          mockBookmarkResponse.project as any,
          {
            ...mockBookmarkResponse.project,
            id: '987fcdeb-51a2-43d1-b789-123456789abc',
          } as any,
        ],
        comparisonMatrix: [
          {
            field: 'specialization',
            label: 'Specialization',
            values: {
              '123e4567-e89b-12d3-a456-426614174000':
                'Web Development & Full Stack',
              '987fcdeb-51a2-43d1-b789-123456789abc':
                'Web Development & Full Stack',
            },
          },
        ],
      };

      bookmarkService.compareBookmarkedProjects.mockResolvedValue(
        mockComparison,
      );

      const result = await controller.compareProjects(mockRequest, compareDto);

      expect(result).toEqual(mockComparison);
      expect(bookmarkService.compareBookmarkedProjects).toHaveBeenCalledWith(
        mockStudentUser.id,
        compareDto,
      );
    });

    it('should handle projects not bookmarked error', async () => {
      const mockRequest = { user: mockStudentUser };
      const compareDto: CompareProjectsDto = {
        projectIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '987fcdeb-51a2-43d1-b789-123456789abc',
        ],
      };

      bookmarkService.compareBookmarkedProjects.mockRejectedValue(
        new NotFoundException('One or more projects are not bookmarked'),
      );

      await expect(
        controller.compareProjects(mockRequest, compareDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Category Management', () => {
    describe('createCategory', () => {
      it('should create category successfully', async () => {
        const mockRequest = { user: mockStudentUser };
        const createCategoryDto: CreateBookmarkCategoryDto = {
          name: 'Favorites',
          description: 'My favorite projects',
          color: '#FF5733',
        };

        bookmarkService.createCategory.mockResolvedValue(mockBookmarkCategory);

        const result = await controller.createCategory(
          mockRequest,
          createCategoryDto,
        );

        expect(result).toEqual(mockBookmarkCategory);
        expect(bookmarkService.createCategory).toHaveBeenCalledWith(
          mockStudentUser.id,
          createCategoryDto,
        );
      });

      it('should handle duplicate category name error', async () => {
        const mockRequest = { user: mockStudentUser };
        const createCategoryDto: CreateBookmarkCategoryDto = {
          name: 'Favorites',
          description: 'My favorite projects',
          color: '#FF5733',
        };

        bookmarkService.createCategory.mockRejectedValue(
          new ConflictException('Category with this name already exists'),
        );

        await expect(
          controller.createCategory(mockRequest, createCategoryDto),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('getCategories', () => {
      it('should return user categories', async () => {
        const mockRequest = { user: mockStudentUser };
        const mockCategories = [mockBookmarkCategory];

        bookmarkService.getUserCategories.mockResolvedValue(mockCategories);

        const result = await controller.getCategories(mockRequest);

        expect(result).toEqual(mockCategories);
        expect(bookmarkService.getUserCategories).toHaveBeenCalledWith(
          mockStudentUser.id,
        );
      });
    });

    describe('updateCategory', () => {
      it('should update category successfully', async () => {
        const mockRequest = { user: mockStudentUser };
        const categoryId = 'category-id';
        const updateCategoryDto: UpdateBookmarkCategoryDto = {
          name: 'Updated Favorites',
          description: 'Updated description',
        };

        const updatedCategory = {
          ...mockBookmarkCategory,
          ...updateCategoryDto,
        };
        bookmarkService.updateCategory.mockResolvedValue(updatedCategory);

        const result = await controller.updateCategory(
          mockRequest,
          categoryId,
          updateCategoryDto,
        );

        expect(result).toEqual(updatedCategory);
        expect(bookmarkService.updateCategory).toHaveBeenCalledWith(
          mockStudentUser.id,
          categoryId,
          updateCategoryDto,
        );
      });

      it('should handle category not found error', async () => {
        const mockRequest = { user: mockStudentUser };
        const categoryId = 'non-existent-id';
        const updateCategoryDto: UpdateBookmarkCategoryDto = {
          name: 'Updated Name',
        };

        bookmarkService.updateCategory.mockRejectedValue(
          new NotFoundException('Category not found'),
        );

        await expect(
          controller.updateCategory(mockRequest, categoryId, updateCategoryDto),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteCategory', () => {
      it('should delete category successfully', async () => {
        const mockRequest = { user: mockStudentUser };
        const categoryId = 'category-id';

        bookmarkService.deleteCategory.mockResolvedValue(undefined);

        await controller.deleteCategory(mockRequest, categoryId);

        expect(bookmarkService.deleteCategory).toHaveBeenCalledWith(
          mockStudentUser.id,
          categoryId,
        );
      });

      it('should handle category not found error', async () => {
        const mockRequest = { user: mockStudentUser };
        const categoryId = 'non-existent-id';

        bookmarkService.deleteCategory.mockRejectedValue(
          new NotFoundException('Category not found'),
        );

        await expect(
          controller.deleteCategory(mockRequest, categoryId),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('assignCategory', () => {
      it('should assign bookmark to category successfully', async () => {
        const mockRequest = { user: mockStudentUser };
        const assignDto: AssignBookmarkCategoryDto = {
          bookmarkId: 'bookmark-id',
          categoryId: 'category-id',
        };

        const updatedBookmark = {
          ...mockBookmarkResponse,
          category: mockBookmarkCategory,
        };
        bookmarkService.assignBookmarkToCategory.mockResolvedValue(
          updatedBookmark,
        );

        const result = await controller.assignCategory(mockRequest, assignDto);

        expect(result).toEqual(updatedBookmark);
        expect(bookmarkService.assignBookmarkToCategory).toHaveBeenCalledWith(
          mockStudentUser.id,
          assignDto,
        );
      });

      it('should handle bookmark or category not found error', async () => {
        const mockRequest = { user: mockStudentUser };
        const assignDto: AssignBookmarkCategoryDto = {
          bookmarkId: 'non-existent-bookmark',
          categoryId: 'non-existent-category',
        };

        bookmarkService.assignBookmarkToCategory.mockRejectedValue(
          new NotFoundException('Bookmark or category not found'),
        );

        await expect(
          controller.assignCategory(mockRequest, assignDto),
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('exportBookmarks', () => {
    it('should export bookmarks successfully', async () => {
      const mockRequest = { user: mockStudentUser };
      const exportDto: ExportBookmarksDto = {
        format: ExportFormat.JSON,
        categoryId: undefined,
      };

      const mockExportData: BookmarkExportData = {
        bookmarks: [
          {
            id: 'bookmark-id',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            projectTitle: 'Test Project',
            projectAbstract: 'Test project abstract',
            specialization: 'Web Development & Full Stack',
            difficultyLevel: 'intermediate',
            year: 2024,
            tags: ['react', 'nodejs'],
            technologyStack: ['React', 'Node.js'],
            supervisorName: 'John Doe',
            supervisorEmail: 'john.doe@university.edu',
            bookmarkedAt: new Date(),
          },
        ],
        exportedAt: new Date(),
        totalCount: 1,
      };

      bookmarkService.exportBookmarks.mockResolvedValue(mockExportData);

      const result = await controller.exportBookmarks(mockRequest, exportDto);

      expect(result).toEqual(mockExportData);
      expect(bookmarkService.exportBookmarks).toHaveBeenCalledWith(
        mockStudentUser.id,
        exportDto,
      );
    });

    it('should export bookmarks with category filter', async () => {
      const mockRequest = { user: mockStudentUser };
      const exportDto: ExportBookmarksDto = {
        format: ExportFormat.CSV,
        categoryId: 'category-id',
      };

      const mockExportData: BookmarkExportData = {
        bookmarks: [
          {
            id: 'bookmark-id',
            projectId: '123e4567-e89b-12d3-a456-426614174000',
            projectTitle: 'Test Project',
            projectAbstract: 'Test project abstract',
            specialization: 'Web Development & Full Stack',
            difficultyLevel: 'intermediate',
            year: 2024,
            tags: ['react', 'nodejs'],
            technologyStack: ['React', 'Node.js'],
            supervisorName: 'John Doe',
            supervisorEmail: 'john.doe@university.edu',
            bookmarkedAt: new Date(),
          },
        ],
        exportedAt: new Date(),
        totalCount: 1,
      };

      bookmarkService.exportBookmarks.mockResolvedValue(mockExportData);

      const result = await controller.exportBookmarks(mockRequest, exportDto);

      expect(result).toEqual(mockExportData);
      expect(bookmarkService.exportBookmarks).toHaveBeenCalledWith(
        mockStudentUser.id,
        exportDto,
      );
    });
  });
});
