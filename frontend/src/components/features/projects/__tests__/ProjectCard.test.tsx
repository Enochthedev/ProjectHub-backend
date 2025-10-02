import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectCard } from '../ProjectCard';
import { Project } from '@/types/project';

// Mock the hooks
jest.mock('@/hooks/useProjects', () => ({
  useIsBookmarked: jest.fn(() => ({ data: false })),
  useCreateBookmark: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useDeleteBookmark: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
}));

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const mockProject: Project = {
  id: '1',
  title: 'Test Project',
  abstract: 'This is a test project abstract that describes the project in detail.',
  specialization: 'Computer Science',
  difficultyLevel: 'intermediate',
  year: 2024,
  tags: ['react', 'typescript', 'testing'],
  technologyStack: ['React', 'TypeScript', 'Jest'],
  isGroupProject: false,
  approvalStatus: 'approved',
  githubUrl: 'https://github.com/test/project',
  demoUrl: 'https://demo.test.com',
  supervisor: {
    id: 'sup1',
    name: 'Dr. Test Supervisor',
    specializations: ['Computer Science', 'Software Engineering'],
  },
  viewCount: 150,
  bookmarkCount: 25,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
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

describe('ProjectCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders project information correctly', () => {
    renderWithQueryClient(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('by Dr. Test Supervisor')).toBeInTheDocument();
    expect(screen.getByText('This is a test project abstract that describes the project in detail.')).toBeInTheDocument();
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
  });

  it('displays technology stack badges', () => {
    renderWithQueryClient(<ProjectCard project={mockProject} />);

    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Jest')).toBeInTheDocument();
  });

  it('shows group project indicator when applicable', () => {
    const groupProject = { ...mockProject, isGroupProject: true };
    renderWithQueryClient(<ProjectCard project={groupProject} />);

    expect(screen.getByText('Group')).toBeInTheDocument();
  });

  it('displays external links when available', () => {
    renderWithQueryClient(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('calls onView when card is clicked', () => {
    const onView = jest.fn();
    renderWithQueryClient(<ProjectCard project={mockProject} onView={onView} />);

    fireEvent.click(screen.getByRole('button', { name: /test project/i }));
    expect(onView).toHaveBeenCalledWith('1');
  });

  it('handles bookmark toggle', async () => {
    const { useCreateBookmark } = require('@/hooks/useProjects');
    const mockCreateBookmark = jest.fn();
    useCreateBookmark.mockReturnValue({ mutateAsync: mockCreateBookmark, isPending: false });

    renderWithQueryClient(<ProjectCard project={mockProject} />);

    const bookmarkButton = screen.getByRole('button', { name: /bookmark/i });
    fireEvent.click(bookmarkButton);

    await waitFor(() => {
      expect(mockCreateBookmark).toHaveBeenCalledWith({ projectId: '1' });
    });
  });

  it('renders compact variant correctly', () => {
    renderWithQueryClient(<ProjectCard project={mockProject} variant="compact" />);

    // In compact mode, abstract should not be visible
    expect(screen.queryByText('This is a test project abstract')).not.toBeInTheDocument();
    
    // But title should still be visible
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders loading skeleton when loading prop is true', () => {
    renderWithQueryClient(<ProjectCard project={mockProject} loading={true} />);

    // Should show skeleton instead of actual content
    expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    
    // Should have animate-pulse class
    const skeletonCard = screen.getByRole('button');
    expect(skeletonCard).toHaveClass('animate-pulse');
  });

  it('applies correct difficulty level styling', () => {
    const beginnerProject = { ...mockProject, difficultyLevel: 'beginner' as const };
    renderWithQueryClient(<ProjectCard project={beginnerProject} />);

    const difficultyBadge = screen.getByText('beginner');
    expect(difficultyBadge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('limits technology stack display in compact mode', () => {
    const projectWithManyTechs = {
      ...mockProject,
      technologyStack: ['React', 'TypeScript', 'Jest', 'Node.js', 'Express', 'MongoDB'],
    };

    renderWithQueryClient(<ProjectCard project={projectWithManyTechs} variant="compact" />);

    // Should show only first 3 technologies plus a "+3" indicator
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Jest')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    
    // Should not show the remaining technologies
    expect(screen.queryByText('Node.js')).not.toBeInTheDocument();
  });

  it('opens external links in new tab', () => {
    // Mock window.open
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    renderWithQueryClient(<ProjectCard project={mockProject} />);

    const codeButton = screen.getByText('Code');
    fireEvent.click(codeButton);

    expect(mockOpen).toHaveBeenCalledWith('https://github.com/test/project', '_blank');
  });

  it('prevents event propagation when clicking external links', () => {
    const onView = jest.fn();
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    renderWithQueryClient(<ProjectCard project={mockProject} onView={onView} />);

    const codeButton = screen.getByText('Code');
    fireEvent.click(codeButton);

    // onView should not be called when clicking external links
    expect(onView).not.toHaveBeenCalled();
    expect(mockOpen).toHaveBeenCalled();
  });
});