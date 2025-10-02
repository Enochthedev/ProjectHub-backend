import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectComparison, ComparisonButton } from '../ProjectComparison';
import { useBookmarkStore, useComparisonCount } from '@/stores/bookmark';
import { Project } from '@/types/project';

// Mock the bookmark store and selectors
jest.mock('@/stores/bookmark');
const mockUseBookmarkStore = useBookmarkStore as jest.MockedFunction<typeof useBookmarkStore>;
const mockUseComparisonCount = useComparisonCount as jest.MockedFunction<typeof useComparisonCount>;

// Mock data
const mockProject1: Project = {
    id: 'project-1',
    title: 'React Project',
    abstract: 'A React-based web application',
    specialization: 'Computer Science',
    difficultyLevel: 'intermediate',
    year: 2024,
    tags: ['react', 'typescript', 'web'],
    technologyStack: ['React', 'TypeScript', 'Node.js'],
    isGroupProject: false,
    approvalStatus: 'approved',
    supervisor: {
        id: 'supervisor-1',
        name: 'Dr. Smith',
        specializations: ['Computer Science']
    },
    viewCount: 15,
    bookmarkCount: 8,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    githubUrl: 'https://github.com/example/react-project',
    demoUrl: 'https://demo.example.com'
};

const mockProject2: Project = {
    id: 'project-2',
    title: 'Vue.js Project',
    abstract: 'A Vue.js-based mobile application',
    specialization: 'Software Engineering',
    difficultyLevel: 'advanced',
    year: 2024,
    tags: ['vue', 'javascript', 'mobile'],
    technologyStack: ['Vue.js', 'JavaScript', 'Cordova'],
    isGroupProject: true,
    approvalStatus: 'approved',
    supervisor: {
        id: 'supervisor-2',
        name: 'Dr. Johnson',
        specializations: ['Software Engineering']
    },
    viewCount: 22,
    bookmarkCount: 12,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
};

describe('ProjectComparison', () => {
    const mockRemoveFromComparison = jest.fn();
    const mockClearComparison = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockUseBookmarkStore.mockReturnValue({
            comparisonProjects: [mockProject1, mockProject2],
            removeFromComparison: mockRemoveFromComparison,
            clearComparison: mockClearComparison,
            // Add other required properties with default values
            bookmarks: [],
            categories: [],
            selectedCategory: null,
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
            isProjectBookmarked: jest.fn(),
            toggleBookmark: jest.fn(),
            fetchCategories: jest.fn(),
            createCategory: jest.fn(),
            updateCategory: jest.fn(),
            deleteCategory: jest.fn(),
            setSelectedCategory: jest.fn(),
            addToComparison: jest.fn(),
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

    it('should render comparison modal with projects', () => {
        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        expect(screen.getByText('Comparing 2 Projects')).toBeInTheDocument();
        expect(screen.getByText('React Project')).toBeInTheDocument();
        expect(screen.getByText('Vue.js Project')).toBeInTheDocument();
        expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should show empty state when no projects to compare', () => {
        mockUseBookmarkStore.mockReturnValue({
            ...mockUseBookmarkStore(),
            comparisonProjects: []
        });

        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        expect(screen.getByText('No projects to compare')).toBeInTheDocument();
        expect(screen.getByText('Add projects to comparison from your bookmarks to see them here.')).toBeInTheDocument();
    });

    it('should remove project from comparison when X button is clicked', () => {
        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        const removeButtons = screen.getAllByRole('button', { name: '' }); // X buttons
        fireEvent.click(removeButtons[0]);

        expect(mockRemoveFromComparison).toHaveBeenCalledWith('project-1');
    });

    it('should clear all comparisons when Clear All is clicked', () => {
        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        const clearAllButton = screen.getByText('Clear All');
        fireEvent.click(clearAllButton);

        expect(mockClearComparison).toHaveBeenCalledTimes(1);
    });

    it('should display project details correctly', () => {
        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        // Check project 1 details
        expect(screen.getAllByText('Dr. Smith')).toHaveLength(2); // Once in project card, once in summary
        expect(screen.getAllByText('Computer Science')).toHaveLength(2);
        expect(screen.getAllByText('2024')).toHaveLength(2);
        expect(screen.getByText('intermediate')).toBeInTheDocument();

        // Check project 2 details
        expect(screen.getByText('Dr. Johnson')).toBeInTheDocument();
        expect(screen.getByText('Software Engineering')).toBeInTheDocument();
        expect(screen.getByText('advanced')).toBeInTheDocument();
    });

    it('should display comparison summary', () => {
        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        expect(screen.getByText('Comparison Summary')).toBeInTheDocument();
        expect(screen.getByText('Specializations')).toBeInTheDocument();
        expect(screen.getByText('Difficulty Levels')).toBeInTheDocument();
        expect(screen.getAllByText('Technologies')).toHaveLength(3); // Once per project card + once in summary
    });

    it('should open external links when clicked', () => {
        // Mock window.open
        const mockOpen = jest.fn();
        Object.defineProperty(window, 'open', {
            value: mockOpen,
            writable: true
        });

        render(<ProjectComparison isOpen={true} onClose={jest.fn()} />);

        // Find and click GitHub link for project 1
        const githubButtons = screen.getAllByRole('button');
        const githubButton = githubButtons.find(button => 
            button.querySelector('svg')?.getAttribute('data-lucide') === 'github'
        );
        
        if (githubButton) {
            fireEvent.click(githubButton);
            expect(mockOpen).toHaveBeenCalledWith('https://github.com/example/react-project', '_blank');
        }
    });

    it('should not render when modal is closed', () => {
        render(<ProjectComparison isOpen={false} onClose={jest.fn()} />);

        expect(screen.queryByText('Comparing 2 Projects')).not.toBeInTheDocument();
    });
});

describe('ComparisonButton', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render comparison button when there are projects to compare', () => {
        mockUseComparisonCount.mockReturnValue(2);

        render(<ComparisonButton />);

        expect(screen.getByText('Compare (2)')).toBeInTheDocument();
    });

    it('should not render when there are no projects to compare', () => {
        mockUseComparisonCount.mockReturnValue(0);

        const { container } = render(<ComparisonButton />);

        expect(container.firstChild).toBeNull();
    });

    it('should open comparison modal when clicked', () => {
        mockUseComparisonCount.mockReturnValue(2);
        mockUseBookmarkStore.mockReturnValue({
            comparisonProjects: [mockProject1, mockProject2],
            removeFromComparison: jest.fn(),
            clearComparison: jest.fn(),
            // Add other required properties
            bookmarks: [],
            categories: [],
            selectedCategory: null,
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
            isProjectBookmarked: jest.fn(),
            toggleBookmark: jest.fn(),
            fetchCategories: jest.fn(),
            createCategory: jest.fn(),
            updateCategory: jest.fn(),
            deleteCategory: jest.fn(),
            setSelectedCategory: jest.fn(),
            addToComparison: jest.fn(),
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

        render(<ComparisonButton />);

        const compareButton = screen.getByText('Compare (2)');
        fireEvent.click(compareButton);

        // Modal should open
        expect(screen.getByText('Comparing 2 Projects')).toBeInTheDocument();
    });
});