import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookmarkGrid } from '../BookmarkGrid';
import { useBookmarkStore, useFilteredBookmarks } from '@/stores/bookmark';
import { Bookmark } from '@/types/project';

// Mock the bookmark store and selectors
jest.mock('@/stores/bookmark');
const mockUseBookmarkStore = useBookmarkStore as jest.MockedFunction<typeof useBookmarkStore>;
const mockUseFilteredBookmarks = useFilteredBookmarks as jest.MockedFunction<typeof useFilteredBookmarks>;

// Mock child components
jest.mock('../BookmarkCard', () => ({
    BookmarkCard: ({ bookmark }: { bookmark: Bookmark }) => (
        <div data-testid={`bookmark-card-${bookmark.id}`}>
            {bookmark.project.title}
        </div>
    )
}));

jest.mock('../BookmarkFilters', () => ({
    BookmarkFilters: () => <div data-testid="bookmark-filters">Filters</div>
}));

jest.mock('../BulkActions', () => ({
    BulkActions: () => <div data-testid="bulk-actions">Bulk Actions</div>
}));

// Mock data
const mockBookmark: Bookmark = {
    id: 'bookmark-1',
    projectId: 'project-1',
    notes: 'Test notes',
    createdAt: '2024-01-01T00:00:00Z',
    project: {
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
    }
};

describe('BookmarkGrid', () => {
    const mockFetchBookmarks = jest.fn();
    const mockFetchCategories = jest.fn();
    const mockClearError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockUseBookmarkStore.mockReturnValue({
            fetchBookmarks: mockFetchBookmarks,
            fetchCategories: mockFetchCategories,
            isLoading: false,
            error: null,
            selectedBookmarks: [],
            clearError: mockClearError,
            // Add other required properties with default values
            bookmarks: [],
            categories: [],
            selectedCategory: null,
            comparisonProjects: [],
            maxComparisonItems: 3,
            isCreatingCategory: false,
            isBulkOperationInProgress: false,
            createBookmark: jest.fn(),
            updateBookmark: jest.fn(),
            deleteBookmark: jest.fn(),
            isProjectBookmarked: jest.fn(),
            toggleBookmark: jest.fn(),
            createCategory: jest.fn(),
            updateCategory: jest.fn(),
            deleteCategory: jest.fn(),
            setSelectedCategory: jest.fn(),
            addToComparison: jest.fn(),
            removeFromComparison: jest.fn(),
            clearComparison: jest.fn(),
            isInComparison: jest.fn(),
            toggleBookmarkSelection: jest.fn(),
            selectAllBookmarks: jest.fn(),
            clearSelection: jest.fn(),
            bulkDeleteBookmarks: jest.fn(),
            bulkMoveToCategory: jest.fn(),
            setLoading: jest.fn(),
            setError: jest.fn()
        });

        mockUseFilteredBookmarks.mockReturnValue([mockBookmark]);
    });

    it('should render bookmark grid with bookmarks', async () => {
        render(<BookmarkGrid />);

        expect(screen.getByText('My Bookmarks')).toBeInTheDocument();
        expect(screen.getByText('1 bookmark')).toBeInTheDocument();
        
        await waitFor(() => {
            expect(mockFetchBookmarks).toHaveBeenCalledTimes(1);
            expect(mockFetchCategories).toHaveBeenCalledTimes(1);
        });

        expect(screen.getByTestId('bookmark-card-bookmark-1')).toBeInTheDocument();
    });

    it('should show loading state', () => {
        mockUseBookmarkStore.mockReturnValue({
            ...mockUseBookmarkStore(),
            isLoading: true
        });

        render(<BookmarkGrid />);

        // Should show skeleton loaders in grid layout
        expect(screen.getByText('My Bookmarks')).toBeInTheDocument();
        // Check for the grid container that would contain skeletons
        const gridContainer = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
        expect(gridContainer).toBeInTheDocument();
    });

    it('should show error state', () => {
        const errorMessage = 'Failed to load bookmarks';
        mockUseBookmarkStore.mockReturnValue({
            ...mockUseBookmarkStore(),
            error: errorMessage
        });

        render(<BookmarkGrid />);

        expect(screen.getByText(`Failed to load bookmarks: ${errorMessage}`)).toBeInTheDocument();
        expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should retry loading on error button click', () => {
        const errorMessage = 'Failed to load bookmarks';
        mockUseBookmarkStore.mockReturnValue({
            ...mockUseBookmarkStore(),
            error: errorMessage
        });

        render(<BookmarkGrid />);

        const retryButton = screen.getByText('Try Again');
        fireEvent.click(retryButton);

        expect(mockClearError).toHaveBeenCalledTimes(1);
        expect(mockFetchBookmarks).toHaveBeenCalledTimes(2); // Once on mount, once on retry
    });

    it('should show empty state when no bookmarks', () => {
        mockUseFilteredBookmarks.mockReturnValue([]);

        render(<BookmarkGrid />);

        expect(screen.getByText('No bookmarks found')).toBeInTheDocument();
        expect(screen.getByText('Start bookmarking projects to see them here.')).toBeInTheDocument();
        expect(screen.getByText('Browse Projects')).toBeInTheDocument();
    });

    it('should toggle view mode between grid and list', () => {
        render(<BookmarkGrid />);

        // Find the list view button by its icon
        const buttons = screen.getAllByRole('button');
        const listViewButton = buttons.find(button => 
            button.querySelector('svg')?.classList.contains('lucide-list')
        );
        
        expect(listViewButton).toBeInTheDocument();
        
        if (listViewButton) {
            fireEvent.click(listViewButton);
            // The button should now have primary variant styles
            expect(listViewButton).toHaveClass('bg-black');
        }
    });

    it('should toggle filters visibility', () => {
        render(<BookmarkGrid />);

        const filtersButton = screen.getByText('Filters');
        fireEvent.click(filtersButton);

        expect(screen.getByTestId('bookmark-filters')).toBeInTheDocument();

        // Click again to hide
        fireEvent.click(filtersButton);
        expect(screen.queryByTestId('bookmark-filters')).not.toBeInTheDocument();
    });

    it('should show bulk actions when bookmarks are selected', () => {
        mockUseBookmarkStore.mockReturnValue({
            ...mockUseBookmarkStore(),
            selectedBookmarks: ['bookmark-1']
        });

        render(<BookmarkGrid />);

        expect(screen.getByTestId('bulk-actions')).toBeInTheDocument();
    });

    it('should not show bulk actions when no bookmarks are selected', () => {
        mockUseBookmarkStore.mockReturnValue({
            ...mockUseBookmarkStore(),
            selectedBookmarks: []
        });

        render(<BookmarkGrid />);

        expect(screen.queryByTestId('bulk-actions')).not.toBeInTheDocument();
    });

    it('should display correct bookmark count', () => {
        mockUseFilteredBookmarks.mockReturnValue([mockBookmark, { ...mockBookmark, id: 'bookmark-2' }]);

        render(<BookmarkGrid />);

        expect(screen.getByText('2 bookmarks')).toBeInTheDocument();
    });

    it('should display singular bookmark text for one bookmark', () => {
        mockUseFilteredBookmarks.mockReturnValue([mockBookmark]);

        render(<BookmarkGrid />);

        expect(screen.getByText('1 bookmark')).toBeInTheDocument();
    });
});