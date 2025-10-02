import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookmarkButton, BookmarkStatus, BookmarkCount } from '../BookmarkButton';
import { useBookmarkStore } from '@/stores/bookmark';
import { Project } from '@/types/project';

// Mock the bookmark store
jest.mock('@/stores/bookmark');
const mockUseBookmarkStore = useBookmarkStore as jest.MockedFunction<typeof useBookmarkStore>;

// Mock project data
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

describe('BookmarkButton', () => {
    const mockToggleBookmark = jest.fn();
    const mockIsProjectBookmarked = jest.fn();
    const mockClearError = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockUseBookmarkStore.mockReturnValue({
            toggleBookmark: mockToggleBookmark,
            isProjectBookmarked: mockIsProjectBookmarked,
            error: null,
            clearError: mockClearError,
            // Add other required properties with default values
            bookmarks: [],
            categories: [],
            selectedCategory: null,
            comparisonProjects: [],
            maxComparisonItems: 3,
            isLoading: false,
            isCreatingCategory: false,
            selectedBookmarks: [],
            isBulkOperationInProgress: false,
            fetchBookmarks: jest.fn(),
            createBookmark: jest.fn(),
            updateBookmark: jest.fn(),
            deleteBookmark: jest.fn(),
            fetchCategories: jest.fn(),
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
    });

    it('should render bookmark button with text when not bookmarked', () => {
        mockIsProjectBookmarked.mockReturnValue(false);

        render(<BookmarkButton project={mockProject} />);

        expect(screen.getByText('Bookmark')).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveClass('bg-white', 'text-black');
    });

    it('should render bookmarked button with text when bookmarked', () => {
        mockIsProjectBookmarked.mockReturnValue(true);

        render(<BookmarkButton project={mockProject} />);

        expect(screen.getByText('Bookmarked')).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveClass('bg-black', 'text-white');
    });

    it('should render icon-only variant', () => {
        mockIsProjectBookmarked.mockReturnValue(false);

        render(<BookmarkButton project={mockProject} variant="icon-only" />);

        expect(screen.queryByText('Bookmark')).not.toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should call toggleBookmark when clicked', async () => {
        mockIsProjectBookmarked.mockReturnValue(false);
        mockToggleBookmark.mockResolvedValue(undefined);

        render(<BookmarkButton project={mockProject} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockToggleBookmark).toHaveBeenCalledWith(mockProject);
        });
    });

    it('should prevent event propagation when clicked', async () => {
        mockIsProjectBookmarked.mockReturnValue(false);
        mockToggleBookmark.mockResolvedValue(undefined);

        const handleParentClick = jest.fn();

        render(
            <div onClick={handleParentClick}>
                <BookmarkButton project={mockProject} />
            </div>
        );

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(handleParentClick).not.toHaveBeenCalled();
    });

    it('should show loading state when toggling', async () => {
        mockIsProjectBookmarked.mockReturnValue(false);
        
        // Mock a delayed response
        mockToggleBookmark.mockImplementation(() => 
            new Promise(resolve => setTimeout(resolve, 100))
        );

        render(<BookmarkButton project={mockProject} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        // Button should be disabled during loading
        expect(button).toBeDisabled();
    });

    it('should handle toggle error gracefully', async () => {
        mockIsProjectBookmarked.mockReturnValue(false);
        mockToggleBookmark.mockRejectedValue(new Error('Network error'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        render(<BookmarkButton project={mockProject} />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        await waitFor(() => {
            expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle bookmark:', expect.any(Error));
        });

        consoleSpy.mockRestore();
    });

    it('should not show text when showText is false', () => {
        mockIsProjectBookmarked.mockReturnValue(false);

        render(<BookmarkButton project={mockProject} showText={false} />);

        expect(screen.queryByText('Bookmark')).not.toBeInTheDocument();
    });
});

describe('BookmarkStatus', () => {
    const mockIsProjectBookmarked = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockUseBookmarkStore.mockReturnValue({
            isProjectBookmarked: mockIsProjectBookmarked,
            // Add other required properties with default values
            bookmarks: [],
            categories: [],
            selectedCategory: null,
            comparisonProjects: [],
            maxComparisonItems: 3,
            isLoading: false,
            isCreatingCategory: false,
            error: null,
            selectedBookmarks: [],
            isBulkOperationInProgress: false,
            fetchBookmarks: jest.fn(),
            createBookmark: jest.fn(),
            updateBookmark: jest.fn(),
            deleteBookmark: jest.fn(),
            toggleBookmark: jest.fn(),
            fetchCategories: jest.fn(),
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
            setError: jest.fn(),
            clearError: jest.fn()
        });
    });

    it('should render bookmark status when project is bookmarked', () => {
        mockIsProjectBookmarked.mockReturnValue(true);

        const { container } = render(<BookmarkStatus projectId="project-1" />);

        expect(container.firstChild).toBeInTheDocument();
        expect(container.querySelector('.inline-flex')).toBeInTheDocument();
    });

    it('should not render when project is not bookmarked', () => {
        mockIsProjectBookmarked.mockReturnValue(false);

        const { container } = render(<BookmarkStatus projectId="project-1" />);

        expect(container.firstChild).toBeNull();
    });
});

describe('BookmarkCount', () => {
    it('should render bookmark count', () => {
        render(<BookmarkCount count={5} />);

        expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should render zero count', () => {
        render(<BookmarkCount count={0} />);

        expect(screen.getByText('0')).toBeInTheDocument();
    });
});