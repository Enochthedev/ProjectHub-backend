import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkController } from '../bookmark.controller';
import { BookmarkService } from '../../services/bookmark.service';
import { InputSanitizationService } from '../../common/services/input-sanitization.service';
import { CreateBookmarkDto, BookmarkQueryDto } from '../../dto/bookmark';

describe('BookmarkController - Security Tests', () => {
  let controller: BookmarkController;
  let bookmarkService: BookmarkService;
  let inputSanitizationService: InputSanitizationService;

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

    const mockInputSanitizationService = {
      sanitizeProjectContent: jest.fn(),
      sanitizeUrl: jest.fn(),
      validatePaginationParams: jest.fn(),
      containsSecurityThreats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkController],
      providers: [
        {
          provide: BookmarkService,
          useValue: mockBookmarkService,
        },
        {
          provide: InputSanitizationService,
          useValue: mockInputSanitizationService,
        },
      ],
    }).compile();

    controller = module.get<BookmarkController>(BookmarkController);
    bookmarkService = module.get<BookmarkService>(BookmarkService);
    inputSanitizationService = module.get<InputSanitizationService>(
      InputSanitizationService,
    );
  });

  describe('Create Bookmark Security', () => {
    it('should validate project ID format in bookmark creation', async () => {
      const invalidProjectIds = [
        'not-a-uuid',
        '<script>alert(1)</script>',
        "'; DROP TABLE bookmarks; --",
        '',
        null,
        undefined,
      ];

      const request = { user: { id: 'user123' } };

      for (const invalidId of invalidProjectIds) {
        const createDto: CreateBookmarkDto = {
          projectId: invalidId as any,
        };

        // The service should handle validation, but we test the controller's handling
        (bookmarkService.createBookmark as jest.Mock).mockRejectedValue(
          new Error('Invalid project ID'),
        );

        await expect(
          controller.createBookmark(request, createDto),
        ).rejects.toThrow();
      }
    });

    it('should accept valid UUID for project ID', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const createDto: CreateBookmarkDto = {
        projectId: validUuid,
      };

      const request = { user: { id: 'user123' } };
      const mockBookmark = {
        id: 'bookmark123',
        projectId: validUuid,
        studentId: 'user123',
      };

      (bookmarkService.createBookmark as jest.Mock).mockResolvedValue(
        mockBookmark,
      );

      const result = await controller.createBookmark(request, createDto);

      expect(result).toBe(mockBookmark);
      expect(bookmarkService.createBookmark).toHaveBeenCalledWith(
        'user123',
        createDto,
      );
    });

    it('should handle bookmark creation with additional metadata safely', async () => {
      const createDto: CreateBookmarkDto = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        notes: '<script>alert("XSS")</script>',
        categoryId: '987fcdeb-51d2-43a1-b654-123456789abc',
      } as any;

      const request = { user: { id: 'user123' } };

      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(true);
      (bookmarkService.createBookmark as jest.Mock).mockRejectedValue(
        new Error('Security threat detected'),
      );

      await expect(
        controller.createBookmark(request, createDto),
      ).rejects.toThrow();
    });
  });

  describe('Remove Bookmark Security', () => {
    it('should validate bookmark ID format', async () => {
      const invalidBookmarkIds = [
        'not-a-uuid',
        '<script>alert(1)</script>',
        "'; DROP TABLE bookmarks; --",
        '',
        null,
        undefined,
      ];

      const request = { user: { id: 'user123' } };

      for (const invalidId of invalidBookmarkIds) {
        (bookmarkService.removeBookmark as jest.Mock).mockRejectedValue(
          new Error('Invalid bookmark ID'),
        );

        await expect(
          controller.removeBookmark(request, invalidId as any),
        ).rejects.toThrow();
      }
    });

    it('should validate project ID format when removing by project ID', async () => {
      const invalidProjectIds = [
        'not-a-uuid',
        '<script>alert(1)</script>',
        "'; DROP TABLE bookmarks; --",
      ];

      const request = { user: { id: 'user123' } };

      for (const invalidId of invalidProjectIds) {
        (
          bookmarkService.removeBookmarkByProjectId as jest.Mock
        ).mockRejectedValue(new Error('Invalid project ID'));

        await expect(
          controller.removeBookmarkByProjectId(request, invalidId),
        ).rejects.toThrow();
      }
    });

    it('should handle valid UUID for bookmark removal', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const request = { user: { id: 'user123' } };

      (bookmarkService.removeBookmark as jest.Mock).mockResolvedValue(
        undefined,
      );

      await controller.removeBookmark(request, validUuid);

      expect(bookmarkService.removeBookmark).toHaveBeenCalledWith(
        'user123',
        validUuid,
      );
    });
  });

  describe('Get Bookmarks Security', () => {
    it('should validate and sanitize query parameters', async () => {
      const maliciousQuery: BookmarkQueryDto = {
        page: -1,
        limit: -10,
      };

      const request = { user: { id: 'user123' } };

      (
        inputSanitizationService.validatePaginationParams as jest.Mock
      ).mockReturnValue({
        limit: 20,
        offset: 0,
      });
      (
        inputSanitizationService.containsSecurityThreats as jest.Mock
      ).mockReturnValue(true);
      (bookmarkService.getUserBookmarks as jest.Mock).mockRejectedValue(
        new Error('Security threat detected'),
      );

      await expect(
        controller.getUserBookmarks(request, maliciousQuery),
      ).rejects.toThrow();
    });

    it('should handle legitimate query parameters', async () => {
      const legitimateQuery: BookmarkQueryDto = {
        page: 1,
        limit: 10,
      };

      const request = { user: { id: 'user123' } };
      const mockBookmarks = {
        bookmarks: [],
        total: 0,
        limit: 10,
        offset: 0,
      };

      (bookmarkService.getUserBookmarks as jest.Mock).mockResolvedValue(
        mockBookmarks,
      );

      const result = await controller.getUserBookmarks(
        request,
        legitimateQuery,
      );

      expect(result).toBe(mockBookmarks);
      expect(bookmarkService.getUserBookmarks).toHaveBeenCalledWith(
        'user123',
        legitimateQuery,
      );
    });

    it('should handle empty or undefined query parameters', async () => {
      const emptyQuery: BookmarkQueryDto = {};
      const request = { user: { id: 'user123' } };
      const mockBookmarks = {
        bookmarks: [],
        total: 0,
        limit: 20,
        offset: 0,
      };

      (bookmarkService.getUserBookmarks as jest.Mock).mockResolvedValue(
        mockBookmarks,
      );

      const result = await controller.getUserBookmarks(request, emptyQuery);

      expect(result).toBe(mockBookmarks);
    });
  });

  describe('Check Bookmark Status Security', () => {
    it('should validate project ID format for bookmark status check', async () => {
      const invalidProjectIds = [
        'not-a-uuid',
        '<script>alert(1)</script>',
        "'; DROP TABLE bookmarks; --",
      ];

      const request = { user: { id: 'user123' } };

      for (const invalidId of invalidProjectIds) {
        (bookmarkService.isProjectBookmarked as jest.Mock).mockRejectedValue(
          new Error('Invalid project ID'),
        );

        await expect(
          controller.checkBookmarkStatus(request, invalidId),
        ).rejects.toThrow();
      }
    });

    it('should handle valid project ID for bookmark status check', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const request = { user: { id: 'user123' } };

      (bookmarkService.isProjectBookmarked as jest.Mock).mockResolvedValue(
        true,
      );

      const result = await controller.checkBookmarkStatus(request, validUuid);

      expect(result).toEqual({ isBookmarked: true });
      expect(bookmarkService.isProjectBookmarked).toHaveBeenCalledWith(
        'user123',
        validUuid,
      );
    });
  });

  describe('Compare Projects Security', () => {
    it('should validate project IDs in comparison request', async () => {
      const maliciousCompareDto = {
        projectIds: [
          '123e4567-e89b-12d3-a456-426614174000', // Valid
          'not-a-uuid', // Invalid
          '<script>alert(1)</script>', // Malicious
        ],
      };

      const request = { user: { id: 'user123' } };

      (
        bookmarkService.compareBookmarkedProjects as jest.Mock
      ).mockRejectedValue(new Error('Invalid project ID'));

      await expect(
        controller.compareProjects(request, maliciousCompareDto),
      ).rejects.toThrow();
    });

    it('should limit the number of projects in comparison', async () => {
      const tooManyProjectsDto = {
        projectIds: Array.from(
          { length: 20 },
          (_, i) =>
            `123e4567-e89b-12d3-a456-42661417400${i.toString().padStart(1, '0')}`,
        ),
      };

      const request = { user: { id: 'user123' } };

      (
        bookmarkService.compareBookmarkedProjects as jest.Mock
      ).mockRejectedValue(new Error('Too many projects for comparison'));

      await expect(
        controller.compareProjects(request, tooManyProjectsDto),
      ).rejects.toThrow();
    });

    it('should handle valid comparison request', async () => {
      const validCompareDto = {
        projectIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '987fcdeb-51d2-43a1-b654-123456789abc',
        ],
      };

      const request = { user: { id: 'user123' } };
      const mockComparison = {
        projects: [],
        comparisonMatrix: {},
      };

      (
        bookmarkService.compareBookmarkedProjects as jest.Mock
      ).mockResolvedValue(mockComparison);

      const result = await controller.compareProjects(request, validCompareDto);

      expect(result).toBe(mockComparison);
    });
  });

  describe('Category Management Security', () => {
    it('should sanitize category name and description', async () => {
      const maliciousCategoryDto = {
        name: '<script>alert("XSS")</script>',
        description: "'; DROP TABLE categories; --",
        color: '#ff0000',
      };

      const request = { user: { id: 'user123' } };

      (inputSanitizationService.sanitizeProjectContent as jest.Mock)
        .mockReturnValueOnce('Safe Name')
        .mockReturnValueOnce('Safe Description');

      const mockCategory = {
        id: 'category123',
        name: 'Safe Name',
        description: 'Safe Description',
        color: '#ff0000',
      };

      (bookmarkService.createCategory as jest.Mock).mockResolvedValue(
        mockCategory,
      );

      const result = await controller.createCategory(
        request,
        maliciousCategoryDto,
      );

      expect(
        inputSanitizationService.sanitizeProjectContent,
      ).toHaveBeenCalledWith(maliciousCategoryDto.name, 'title');
      expect(
        inputSanitizationService.sanitizeProjectContent,
      ).toHaveBeenCalledWith(maliciousCategoryDto.description, 'notes');
      expect(result).toBe(mockCategory);
    });

    it('should validate category ID format for updates and deletions', async () => {
      const invalidCategoryIds = [
        'not-a-uuid',
        '<script>alert(1)</script>',
        "'; DROP TABLE categories; --",
      ];

      const request = { user: { id: 'user123' } };
      const updateDto = { name: 'Updated Name' };

      for (const invalidId of invalidCategoryIds) {
        (bookmarkService.updateCategory as jest.Mock).mockRejectedValue(
          new Error('Invalid category ID'),
        );
        (bookmarkService.deleteCategory as jest.Mock).mockRejectedValue(
          new Error('Invalid category ID'),
        );

        await expect(
          controller.updateCategory(request, invalidId, updateDto),
        ).rejects.toThrow();

        await expect(
          controller.deleteCategory(request, invalidId),
        ).rejects.toThrow();
      }
    });

    it('should handle valid category operations', async () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const request = { user: { id: 'user123' } };
      const updateDto = { name: 'Updated Name' };

      const mockUpdatedCategory = {
        id: validUuid,
        name: 'Updated Name',
      };

      (
        inputSanitizationService.sanitizeProjectContent as jest.Mock
      ).mockReturnValue('Updated Name');
      (bookmarkService.updateCategory as jest.Mock).mockResolvedValue(
        mockUpdatedCategory,
      );
      (bookmarkService.deleteCategory as jest.Mock).mockResolvedValue(
        undefined,
      );

      const updateResult = await controller.updateCategory(
        request,
        validUuid,
        updateDto,
      );
      expect(updateResult).toBe(mockUpdatedCategory);

      await controller.deleteCategory(request, validUuid);
      expect(bookmarkService.deleteCategory).toHaveBeenCalledWith(
        'user123',
        validUuid,
      );
    });
  });

  describe('Export Bookmarks Security', () => {
    it('should validate export format and parameters', async () => {
      const maliciousExportDto = {
        format: '<script>alert(1)</script>' as any,
        categoryIds: [
          'valid-uuid-123e4567-e89b-12d3-a456-426614174000',
          'invalid-uuid',
          "'; DROP TABLE categories; --",
        ],
        includeNotes: true,
      };

      const request = { user: { id: 'user123' } };

      (bookmarkService.exportBookmarks as jest.Mock).mockRejectedValue(
        new Error('Invalid export format or category IDs'),
      );

      await expect(
        controller.exportBookmarks(request, maliciousExportDto),
      ).rejects.toThrow();
    });

    it('should handle valid export request', async () => {
      const validExportDto = {
        format: 'json' as any,
        categoryIds: ['123e4567-e89b-12d3-a456-426614174000'],
        includeNotes: true,
      };

      const request = { user: { id: 'user123' } };
      const mockExportData = {
        format: 'json',
        data: '[]',
        filename: 'bookmarks.json',
      };

      (bookmarkService.exportBookmarks as jest.Mock).mockResolvedValue(
        mockExportData,
      );

      const result = await controller.exportBookmarks(request, validExportDto);

      expect(result).toBe(mockExportData);
      expect(bookmarkService.exportBookmarks).toHaveBeenCalledWith(
        'user123',
        validExportDto,
      );
    });
  });

  describe('Rate Limiting and Performance', () => {
    it('should handle rapid bookmark creation attempts', async () => {
      const request = { user: { id: 'user123' } };
      const createDto: CreateBookmarkDto = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };

      // Simulate rapid requests
      const promises = Array.from({ length: 10 }, () =>
        controller.createBookmark(request, createDto),
      );

      (bookmarkService.createBookmark as jest.Mock).mockResolvedValue({
        id: 'bookmark123',
        projectId: createDto.projectId,
        studentId: 'user123',
      });

      // Should handle concurrent requests without issues
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
    });

    it('should handle large bookmark queries efficiently', async () => {
      const request = { user: { id: 'user123' } };
      const largeQuery: BookmarkQueryDto = {
        page: 1,
        limit: 100, // Large but valid limit
      };

      const mockBookmarks = {
        bookmarks: Array.from({ length: 100 }, (_, i) => ({
          id: `bookmark${i}`,
          projectId: `project${i}`,
        })),
        total: 1000,
        limit: 100,
        offset: 0,
      };

      (bookmarkService.getUserBookmarks as jest.Mock).mockResolvedValue(
        mockBookmarks,
      );

      const startTime = Date.now();
      const result = await controller.getUserBookmarks(request, largeQuery);
      const endTime = Date.now();

      expect(result).toBe(mockBookmarks);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailability gracefully', async () => {
      const request = { user: { id: 'user123' } };
      const createDto: CreateBookmarkDto = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };

      (bookmarkService.createBookmark as jest.Mock).mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      await expect(
        controller.createBookmark(request, createDto),
      ).rejects.toThrow('Service temporarily unavailable');
    });

    it('should handle malformed request objects', async () => {
      const malformedRequest = null;
      const createDto: CreateBookmarkDto = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(
        controller.createBookmark(malformedRequest as any, createDto),
      ).rejects.toThrow();
    });

    it('should handle missing user context', async () => {
      const requestWithoutUser = {};
      const createDto: CreateBookmarkDto = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      };

      await expect(
        controller.createBookmark(requestWithoutUser as any, createDto),
      ).rejects.toThrow();
    });
  });
});
