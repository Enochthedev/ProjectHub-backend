import { renderHook, act } from '@testing-library/react';
import { useBookmarkStore } from '../bookmark';
import { bookmarkApi } from '@/lib/project-api';
import { Bookmark, BookmarkCategory, Project } from '@/types/project';

// Mock the API
jest.mock('@/lib/project-api');
const mockBookmarkApi = bookmarkApi as jest.Mocked<typeof bookmarkApi>;

// Mock data
const mockProject: Project = {
    id: 'project-1',
    title: 'Test Project',
    abstract: 'Test abstract',
    specialization: 'Computer Science',
    difficultyLevel: 'intermediate',
    year: 2024,
    tags: ['react', 'typescript'],
    technologyStack: ['React', 'TypeScript'],
    isGroupProject: false,
    approvalStatus: 'approved',
    supervisor: {
        id: 'supervisor-1',
        name: 'Dr. Smith',
        specializations: ['Computer Science']
    },
    viewCount: 10,
    bookmarkCount: 5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
};

const mockBookmark: Bookmark = {
    id: 'bookmark-1',
    projectId: 'project-1',
    notes: 'Interesting project',
    createdAt: '2024-01-01T00:00:00Z',
    project: mockProject
};

const mockCategory: BookmarkCategory = {
    id: 'category-1',
    name: 'Favorites',
    description: 'My favorite projects',
    bookmarkCount: 1
};

describe('useBookmarkStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        useBookmarkStore.setState({
            bookmarks: [],
            categories: [],
            selectedCategory: null,
            comparisonProjects: [],
            maxComparisonItems: 3,
            isLoading: false,
            isCreatingCategory: false,
            error: null,
            selectedBookmarks: [],
            isBulkOperationInProgress: false
        });

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe('fetchBookmarks', () => {
        it('should fetch bookmarks successfully', async () => {
            mockBookmarkApi.getBookmarks.mockResolvedValue([mockBookmark]);

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.fetchBookmarks();
            });

            expect(mockBookmarkApi.getBookmarks).toHaveBeenCalledTimes(1);
            expect(result.current.bookmarks).toEqual([mockBookmark]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should handle fetch bookmarks error', async () => {
            const errorMessage = 'Failed to fetch bookmarks';
            mockBookmarkApi.getBookmarks.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.fetchBookmarks();
            });

            expect(result.current.bookmarks).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(errorMessage);
        });
    });

    describe('createBookmark', () => {
        it('should create bookmark successfully', async () => {
            mockBookmarkApi.createBookmark.mockResolvedValue(mockBookmark);

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.createBookmark({
                    projectId: 'project-1',
                    notes: 'Interesting project'
                });
            });

            expect(mockBookmarkApi.createBookmark).toHaveBeenCalledWith({
                projectId: 'project-1',
                notes: 'Interesting project'
            });
            expect(result.current.bookmarks).toEqual([mockBookmark]);
            expect(result.current.error).toBeNull();
        });

        it('should handle create bookmark error', async () => {
            const errorMessage = 'Failed to create bookmark';
            mockBookmarkApi.createBookmark.mockRejectedValue(new Error(errorMessage));

            const { result } = renderHook(() => useBookmarkStore());

            try {
                await act(async () => {
                    await result.current.createBookmark({
                        projectId: 'project-1',
                        notes: 'Interesting project'
                    });
                });
            } catch (error) {
                // Expected to throw
            }

            expect(result.current.bookmarks).toEqual([]);
            expect(result.current.error).toBe(errorMessage);
        });
    });

    describe('deleteBookmark', () => {
        it('should delete bookmark successfully', async () => {
            // Set initial state with bookmark
            useBookmarkStore.setState({ bookmarks: [mockBookmark] });
            mockBookmarkApi.deleteBookmark.mockResolvedValue();

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.deleteBookmark('bookmark-1');
            });

            expect(mockBookmarkApi.deleteBookmark).toHaveBeenCalledWith('bookmark-1');
            expect(result.current.bookmarks).toEqual([]);
            expect(result.current.error).toBeNull();
        });
    });

    describe('toggleBookmark', () => {
        it('should create bookmark when project is not bookmarked', async () => {
            mockBookmarkApi.createBookmark.mockResolvedValue(mockBookmark);

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.toggleBookmark(mockProject);
            });

            expect(mockBookmarkApi.createBookmark).toHaveBeenCalledWith({
                projectId: 'project-1'
            });
            expect(result.current.bookmarks).toEqual([mockBookmark]);
        });

        it('should delete bookmark when project is already bookmarked', async () => {
            // Set initial state with bookmark
            useBookmarkStore.setState({ bookmarks: [mockBookmark] });
            mockBookmarkApi.deleteBookmark.mockResolvedValue();

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.toggleBookmark(mockProject);
            });

            expect(mockBookmarkApi.deleteBookmark).toHaveBeenCalledWith('bookmark-1');
            expect(result.current.bookmarks).toEqual([]);
        });
    });

    describe('isProjectBookmarked', () => {
        it('should return true when project is bookmarked', () => {
            useBookmarkStore.setState({ bookmarks: [mockBookmark] });

            const { result } = renderHook(() => useBookmarkStore());

            expect(result.current.isProjectBookmarked('project-1')).toBe(true);
        });

        it('should return false when project is not bookmarked', () => {
            const { result } = renderHook(() => useBookmarkStore());

            expect(result.current.isProjectBookmarked('project-1')).toBe(false);
        });
    });

    describe('categories', () => {
        it('should fetch categories successfully', async () => {
            mockBookmarkApi.getCategories.mockResolvedValue([mockCategory]);

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.fetchCategories();
            });

            expect(mockBookmarkApi.getCategories).toHaveBeenCalledTimes(1);
            expect(result.current.categories).toEqual([mockCategory]);
            expect(result.current.error).toBeNull();
        });

        it('should create category successfully', async () => {
            mockBookmarkApi.createCategory.mockResolvedValue(mockCategory);

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.createCategory('Favorites', 'My favorite projects');
            });

            expect(mockBookmarkApi.createCategory).toHaveBeenCalledWith('Favorites', 'My favorite projects');
            expect(result.current.categories).toEqual([mockCategory]);
            expect(result.current.isCreatingCategory).toBe(false);
        });
    });

    describe('comparison', () => {
        it('should add project to comparison', () => {
            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.addToComparison(mockProject);
            });

            expect(result.current.comparisonProjects).toEqual([mockProject]);
            expect(result.current.isInComparison('project-1')).toBe(true);
        });

        it('should not add more than max comparison items', () => {
            // Set max to 1 for testing
            useBookmarkStore.setState({ maxComparisonItems: 1 });

            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.addToComparison(mockProject);
                result.current.addToComparison({ ...mockProject, id: 'project-2' });
            });

            expect(result.current.comparisonProjects).toHaveLength(1);
            expect(result.current.error).toContain('You can only compare up to 1 projects');
        });

        it('should remove project from comparison', () => {
            useBookmarkStore.setState({ comparisonProjects: [mockProject] });

            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.removeFromComparison('project-1');
            });

            expect(result.current.comparisonProjects).toEqual([]);
            expect(result.current.isInComparison('project-1')).toBe(false);
        });

        it('should clear all comparisons', () => {
            useBookmarkStore.setState({ comparisonProjects: [mockProject] });

            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.clearComparison();
            });

            expect(result.current.comparisonProjects).toEqual([]);
        });
    });

    describe('bulk operations', () => {
        beforeEach(() => {
            useBookmarkStore.setState({
                bookmarks: [mockBookmark, { ...mockBookmark, id: 'bookmark-2' }]
            });
        });

        it('should toggle bookmark selection', () => {
            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.toggleBookmarkSelection('bookmark-1');
            });

            expect(result.current.selectedBookmarks).toEqual(['bookmark-1']);

            act(() => {
                result.current.toggleBookmarkSelection('bookmark-1');
            });

            expect(result.current.selectedBookmarks).toEqual([]);
        });

        it('should select all bookmarks', () => {
            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.selectAllBookmarks();
            });

            expect(result.current.selectedBookmarks).toEqual(['bookmark-1', 'bookmark-2']);
        });

        it('should clear selection', () => {
            useBookmarkStore.setState({ selectedBookmarks: ['bookmark-1', 'bookmark-2'] });

            const { result } = renderHook(() => useBookmarkStore());

            act(() => {
                result.current.clearSelection();
            });

            expect(result.current.selectedBookmarks).toEqual([]);
        });

        it('should bulk delete bookmarks', async () => {
            useBookmarkStore.setState({ selectedBookmarks: ['bookmark-1', 'bookmark-2'] });
            mockBookmarkApi.deleteBookmark.mockResolvedValue();

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.bulkDeleteBookmarks();
            });

            expect(mockBookmarkApi.deleteBookmark).toHaveBeenCalledTimes(2);
            expect(result.current.selectedBookmarks).toEqual([]);
            expect(result.current.isBulkOperationInProgress).toBe(false);
        });

        it('should bulk move to category', async () => {
            useBookmarkStore.setState({ selectedBookmarks: ['bookmark-1', 'bookmark-2'] });
            mockBookmarkApi.updateBookmark.mockResolvedValue(mockBookmark);

            const { result } = renderHook(() => useBookmarkStore());

            await act(async () => {
                await result.current.bulkMoveToCategory('category-1');
            });

            expect(mockBookmarkApi.updateBookmark).toHaveBeenCalledTimes(2);
            expect(mockBookmarkApi.updateBookmark).toHaveBeenCalledWith('bookmark-1', { categoryId: 'category-1' });
            expect(mockBookmarkApi.updateBookmark).toHaveBeenCalledWith('bookmark-2', { categoryId: 'category-1' });
            expect(result.current.selectedBookmarks).toEqual([]);
            expect(result.current.isBulkOperationInProgress).toBe(false);
        });
    });
});