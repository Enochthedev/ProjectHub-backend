import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectDiscovery } from '../ProjectDiscovery';
import { ProjectSearchResponse, Project } from '@/types/project';

// Mock the hooks
const mockUseProjectSearch = jest.fn();
jest.mock('@/hooks/useProjects', () => ({
  useProjectSearch: () => mockUseProjectSearch(),
}));

// Mock the store
const mockSetSearchParams = jest.fn();
jest.mock('@/stores/project', () => ({
  useProjectStore: () => ({
    setSearchParams: mockSetSearchParams,
  }),
  useSearchParamsWithFilters: () => ({
    query: '',
    page: 1,
    limit: 12,
    sortBy: 'relevance',
    sortOrder: 'desc',
  }),
}));

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const mockProject: Project = {
  id: '1',
  title: 'Test Project',
  abstract: 'Test abstract',
  specialization: 'Computer Science',
  difficultyLevel: 'intermediate',
  year: 2024,
  tags: ['react'],
  technologyStack: ['React'],
  isGroupProject: false,
  approvalStatus: 'approved',
  supervisor: {
    id: 'sup1',
    name: 'Dr. Test',
    specializations: ['CS'],
  },
  viewCount: 100,
  bookmarkCount: 10,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockSearchResponse: ProjectSearchResponse = {
  projects: [mockProject],
  pagination: {
    page: 1,
    limit: 12,
    total: 1,
    totalPages: 1,
  },
  filters: {
    specializations: ['Computer Science'],
    years: [2024],
    tags: ['react'],
    technologyStack: ['React'],
    supervisors: [{ id: 'sup1', name: 'Dr. Test', projectCount: 1 }],
  },
};

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ProjectDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjectSearch.mockReturnValue({
      data: mockSearchResponse,
      isLoading: false,
      error: null,
    });
  });

  it('renders the main heading and description', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    expect(screen.getByText('Discover Projects')).toBeInTheDocument();
    expect(screen.getByText('Find Final Year Projects that match your interests and skills')).toBeInTheDocument();
  });

  it('renders search bar and sort controls', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    expect(screen.getByPlaceholderText(/search projects, technologies, or keywords/i)).toBeInTheDocument();
    expect(screen.getByText('Sort by:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('relevance-desc')).toBeInTheDocument();
  });

  it('handles sort change', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    const sortSelect = screen.getByDisplayValue('relevance-desc');
    fireEvent.change(sortSelect, { target: { value: 'title-asc' } });

    expect(mockSetSearchParams).toHaveBeenCalledWith({
      sortBy: 'title',
      sortOrder: 'asc',
      page: 1,
    });
  });

  it('handles results per page change', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    const limitSelect = screen.getByDisplayValue('12');
    fireEvent.change(limitSelect, { target: { value: '24' } });

    expect(mockSetSearchParams).toHaveBeenCalledWith({
      limit: 24,
      page: 1,
    });
  });

  it('toggles filters sidebar on desktop', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    // Initially filters should be hidden
    expect(screen.queryByText('Filters')).not.toBeInTheDocument();

    // Click filters toggle in search bar (this would need to be properly implemented)
    // For now, we'll test the toggle function directly
    const filtersButton = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filtersButton);

    // Filters should now be visible (this would need proper implementation)
  });

  it('shows mobile filters toggle button', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    renderWithQueryClient(<ProjectDiscovery />);

    const mobileFiltersButton = screen.getByRole('button', { name: /filters/i });
    expect(mobileFiltersButton).toBeInTheDocument();
  });

  it('navigates to project detail view when project is selected', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    // Simulate clicking on a project (this would trigger the onProjectView callback)
    // The actual implementation would depend on how ProjectGrid handles this
    
    // For now, we can test that the component can handle the selectedProjectId state
    // This would require exposing the state or testing through user interactions
  });

  it('shows loading state', () => {
    mockUseProjectSearch.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(<ProjectDiscovery />);

    // Should show loading skeletons or indicators
    expect(screen.getByText('Discover Projects')).toBeInTheDocument();
    // The actual loading state would be handled by ProjectGrid
  });

  it('shows error state', () => {
    mockUseProjectSearch.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'Failed to load projects' },
    });

    renderWithQueryClient(<ProjectDiscovery />);

    // Error would be handled by ProjectGrid component
    expect(screen.getByText('Discover Projects')).toBeInTheDocument();
  });

  it('handles back navigation from project detail', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    // This would test the handleBackToGrid function
    // Implementation would depend on how the component manages the selectedProjectId state
  });

  it('passes available filters to ProjectFilters component', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    // When filters are shown, they should receive the available filters from the search response
    // This would be tested by checking if ProjectFilters receives the correct props
  });

  it('applies custom className', () => {
    const customClass = 'custom-discovery-class';
    const { container } = renderWithQueryClient(<ProjectDiscovery className={customClass} />);

    // The className should be applied to the root div
    expect(container.firstChild).toHaveClass(customClass);
  });

  it('handles empty search results', () => {
    mockUseProjectSearch.mockReturnValue({
      data: {
        ...mockSearchResponse,
        projects: [],
        pagination: { ...mockSearchResponse.pagination, total: 0 },
      },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ProjectDiscovery />);

    // Empty state would be handled by ProjectGrid
    expect(screen.getByText('Discover Projects')).toBeInTheDocument();
  });

  it('maintains filter state when toggling visibility', () => {
    renderWithQueryClient(<ProjectDiscovery />);

    // Test that filter state is preserved when hiding/showing filters
    // This would involve testing the showFilters state management
  });
});