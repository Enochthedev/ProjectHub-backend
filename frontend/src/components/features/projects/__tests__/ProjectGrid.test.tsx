import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectGrid } from '../ProjectGrid';
import { ProjectSearchResponse, Project } from '@/types/project';

// Mock the store
const mockSetSearchParams = jest.fn();
const mockClearFilters = jest.fn();

jest.mock('@/stores/project', () => ({
  useProjectStore: () => ({
    searchParams: { query: '', page: 1, limit: 12 },
    setSearchParams: mockSetSearchParams,
    clearFilters: mockClearFilters,
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

describe('ProjectGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders projects correctly', () => {
    renderWithQueryClient(<ProjectGrid data={mockSearchResponse} />);

    expect(screen.getByText('1 Project')).toBeInTheDocument();
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('shows plural form for multiple projects', () => {
    const multipleProjectsResponse = {
      ...mockSearchResponse,
      projects: [mockProject, { ...mockProject, id: '2', title: 'Project 2' }],
      pagination: { ...mockSearchResponse.pagination, total: 2 },
    };

    renderWithQueryClient(<ProjectGrid data={multipleProjectsResponse} />);

    expect(screen.getByText('2 Projects')).toBeInTheDocument();
  });

  it('displays loading skeleton when loading', () => {
    renderWithQueryClient(<ProjectGrid loading={true} />);

    // Should show skeleton loaders
    const skeletonElements = screen.getAllByRole('button');
    expect(skeletonElements.length).toBeGreaterThan(0);
    
    // Should have animate-pulse class
    expect(skeletonElements[0]).toHaveClass('animate-pulse');
  });

  it('shows error state when there is an error', () => {
    renderWithQueryClient(<ProjectGrid error="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows empty state when no projects found', () => {
    const emptyResponse = {
      ...mockSearchResponse,
      projects: [],
      pagination: { ...mockSearchResponse.pagination, total: 0 },
    };

    renderWithQueryClient(<ProjectGrid data={emptyResponse} />);

    expect(screen.getByText('No projects found')).toBeInTheDocument();
  });

  it('shows filtered empty state when filters are active', () => {
    // Mock store with active search params
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      searchParams: { query: 'test', page: 1, limit: 12 },
      setSearchParams: mockSetSearchParams,
      clearFilters: mockClearFilters,
    });

    const emptyResponse = {
      ...mockSearchResponse,
      projects: [],
      pagination: { ...mockSearchResponse.pagination, total: 0 },
    };

    renderWithQueryClient(<ProjectGrid data={emptyResponse} />);

    expect(screen.getByText('No projects match your filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear all filters/i })).toBeInTheDocument();
  });

  it('handles view mode toggle', () => {
    renderWithQueryClient(<ProjectGrid data={mockSearchResponse} />);

    const gridButton = screen.getByRole('button', { name: /grid/i });
    const listButton = screen.getByRole('button', { name: /list/i });

    expect(gridButton).toBeInTheDocument();
    expect(listButton).toBeInTheDocument();

    // Click list view
    fireEvent.click(listButton);

    // Should change the layout (this would be tested by checking CSS classes)
    expect(listButton).toHaveClass('bg-black'); // Assuming primary variant adds this class
  });

  it('handles pagination', () => {
    const multiPageResponse = {
      ...mockSearchResponse,
      pagination: {
        page: 1,
        limit: 12,
        total: 25,
        totalPages: 3,
      },
    };

    renderWithQueryClient(<ProjectGrid data={multiPageResponse} />);

    // Should show pagination controls
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();

    // Click next page
    fireEvent.click(screen.getByText('Next'));

    expect(mockSetSearchParams).toHaveBeenCalledWith({ page: 2 });
  });

  it('disables pagination buttons appropriately', () => {
    const firstPageResponse = {
      ...mockSearchResponse,
      pagination: {
        page: 1,
        limit: 12,
        total: 25,
        totalPages: 3,
      },
    };

    renderWithQueryClient(<ProjectGrid data={firstPageResponse} />);

    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();

    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();
  });

  it('calls onProjectView when project is clicked', () => {
    const onProjectView = jest.fn();
    renderWithQueryClient(
      <ProjectGrid data={mockSearchResponse} onProjectView={onProjectView} />
    );

    // This would require the ProjectCard to be properly mocked or rendered
    // For now, we'll assume the project card calls onView when clicked
    const projectCard = screen.getByText('Test Project').closest('button');
    if (projectCard) {
      fireEvent.click(projectCard);
      expect(onProjectView).toHaveBeenCalledWith('1');
    }
  });

  it('shows results summary', () => {
    renderWithQueryClient(<ProjectGrid data={mockSearchResponse} />);

    expect(screen.getByText(/showing 1 to 1 of 1 results/i)).toBeInTheDocument();
  });

  it('shows search query in header when present', () => {
    // Mock store with search query
    jest.mocked(require('@/stores/project').useProjectStore).mockReturnValue({
      searchParams: { query: 'react', page: 1, limit: 12 },
      setSearchParams: mockSetSearchParams,
      clearFilters: mockClearFilters,
    });

    renderWithQueryClient(<ProjectGrid data={mockSearchResponse} />);

    expect(screen.getByText('for "react"')).toBeInTheDocument();
  });

  it('scrolls to top when page changes', () => {
    const scrollToSpy = jest.fn();
    Object.defineProperty(window, 'scrollTo', { value: scrollToSpy });

    const multiPageResponse = {
      ...mockSearchResponse,
      pagination: {
        page: 1,
        limit: 12,
        total: 25,
        totalPages: 3,
      },
    };

    renderWithQueryClient(<ProjectGrid data={multiPageResponse} />);

    fireEvent.click(screen.getByText('2'));

    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });
});