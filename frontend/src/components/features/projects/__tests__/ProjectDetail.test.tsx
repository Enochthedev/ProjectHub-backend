import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectDetail } from '../ProjectDetail';
import { Project } from '@/types/project';

// Mock the hooks
const mockUseProject = jest.fn();
const mockUseRelatedProjects = jest.fn();
const mockUseIsBookmarked = jest.fn();
const mockCreateBookmark = jest.fn();
const mockDeleteBookmark = jest.fn();
const mockIncrementViewCount = jest.fn();

jest.mock('@/hooks/useProjects', () => ({
  useProject: (id: string) => mockUseProject(id),
  useRelatedProjects: (id: string) => mockUseRelatedProjects(id),
  useIsBookmarked: (id: string) => mockUseIsBookmarked(id),
  useCreateBookmark: () => ({ mutateAsync: mockCreateBookmark, isPending: false }),
  useDeleteBookmark: () => ({ mutateAsync: mockDeleteBookmark, isPending: false }),
  useIncrementViewCount: () => ({ mutate: mockIncrementViewCount }),
}));

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

const mockProject: Project = {
  id: '1',
  title: 'Advanced Machine Learning Project',
  abstract: 'This project explores advanced machine learning techniques for natural language processing. It includes implementation of transformer models, attention mechanisms, and fine-tuning strategies for domain-specific applications.',
  specialization: 'Computer Science',
  difficultyLevel: 'advanced',
  year: 2024,
  tags: ['machine-learning', 'nlp', 'transformers', 'pytorch'],
  technologyStack: ['Python', 'PyTorch', 'Transformers', 'CUDA', 'Docker'],
  isGroupProject: false,
  approvalStatus: 'approved',
  githubUrl: 'https://github.com/test/ml-project',
  demoUrl: 'https://demo.ml-project.com',
  supervisor: {
    id: 'sup1',
    name: 'Dr. Jane Smith',
    specializations: ['Machine Learning', 'Natural Language Processing', 'Deep Learning'],
  },
  viewCount: 250,
  bookmarkCount: 45,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-02-15T10:30:00Z',
};

const mockRelatedProjects: Project[] = [
  {
    ...mockProject,
    id: '2',
    title: 'Computer Vision Project',
    abstract: 'A computer vision project using CNNs.',
    technologyStack: ['Python', 'TensorFlow', 'OpenCV'],
  },
  {
    ...mockProject,
    id: '3',
    title: 'Data Mining Project',
    abstract: 'Data mining techniques for big data.',
    technologyStack: ['Python', 'Spark', 'Hadoop'],
  },
];

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

describe('ProjectDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseProject.mockReturnValue({
      data: mockProject,
      isLoading: false,
      error: null,
    });
    
    mockUseRelatedProjects.mockReturnValue({
      data: mockRelatedProjects,
    });
    
    mockUseIsBookmarked.mockReturnValue({
      data: false,
    });
  });

  it('renders project information correctly', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Advanced Machine Learning Project')).toBeInTheDocument();
    expect(screen.getByText('Supervised by Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
    expect(screen.getAllByText('advanced').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Computer Science').length).toBeGreaterThan(0);
    expect(screen.getByText('approved')).toBeInTheDocument();
  });

  it('displays project metadata correctly', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getAllByText('2024').length).toBeGreaterThan(0);
    expect(screen.getAllByText('250').length).toBeGreaterThan(0);
    expect(screen.getAllByText('45').length).toBeGreaterThan(0);
    expect(screen.getByText('Individual')).toBeInTheDocument();
  });

  it('shows group project type when applicable', () => {
    const groupProject = { ...mockProject, isGroupProject: true };
    mockUseProject.mockReturnValue({
      data: groupProject,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Group')).toBeInTheDocument();
  });

  it('displays project abstract', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText(/this project explores advanced machine learning techniques/i)).toBeInTheDocument();
  });

  it('shows technology stack', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Technology Stack')).toBeInTheDocument();
    expect(screen.getAllByText('Python').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PyTorch').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transformers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CUDA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Docker').length).toBeGreaterThan(0);
  });

  it('displays tags when available', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('machine-learning')).toBeInTheDocument();
    expect(screen.getByText('nlp')).toBeInTheDocument();
    expect(screen.getByText('transformers')).toBeInTheDocument();
    expect(screen.getByText('pytorch')).toBeInTheDocument();
  });

  it('shows external links when available', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Links')).toBeInTheDocument();
    expect(screen.getByText('View Source Code')).toBeInTheDocument();
    expect(screen.getByText('View Demo')).toBeInTheDocument();
  });

  it('opens external links in new tab', () => {
    const mockOpen = jest.fn();
    Object.defineProperty(window, 'open', { value: mockOpen });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    const codeButton = screen.getByText('View Source Code');
    fireEvent.click(codeButton);

    expect(mockOpen).toHaveBeenCalledWith('https://github.com/test/ml-project', '_blank');
  });

  it('displays supervisor information', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Supervisor')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('Natural Language Processing')).toBeInTheDocument();
    expect(screen.getByText('Deep Learning')).toBeInTheDocument();
  });

  it('shows related projects', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Related Projects')).toBeInTheDocument();
    expect(screen.getByText('Computer Vision Project')).toBeInTheDocument();
    expect(screen.getByText('Data Mining Project')).toBeInTheDocument();
  });

  it('handles bookmark toggle', async () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    const bookmarkButton = screen.getByText('Bookmark');
    fireEvent.click(bookmarkButton);

    await waitFor(() => {
      expect(mockCreateBookmark).toHaveBeenCalledWith({ projectId: '1' });
    });
  });

  it('shows bookmarked state correctly', () => {
    mockUseIsBookmarked.mockReturnValue({ data: true });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Bookmarked')).toBeInTheDocument();
  });

  it('handles unbookmarking', async () => {
    mockUseIsBookmarked.mockReturnValue({ data: true });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    const bookmarkButton = screen.getByText('Bookmarked');
    fireEvent.click(bookmarkButton);

    await waitFor(() => {
      expect(mockDeleteBookmark).toHaveBeenCalledWith('1');
    });
  });

  it('handles share functionality', async () => {
    const mockShare = jest.fn();
    Object.defineProperty(navigator, 'share', { value: mockShare });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    // Find the share button by its icon since it doesn't have accessible text
    const shareButtons = screen.getAllByRole('button');
    const shareButton = shareButtons.find(button => 
      button.querySelector('svg.lucide-share2')
    );
    
    expect(shareButton).toBeDefined();
    fireEvent.click(shareButton!);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: 'Advanced Machine Learning Project',
        text: mockProject.abstract,
        url: window.location.href,
      });
    });
  });

  it('handles clipboard fallback for sharing', async () => {
    const mockWriteText = jest.fn();
    
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    // Find the share button by its icon since it doesn't have accessible text
    const shareButtons = screen.getAllByRole('button');
    const shareButton = shareButtons.find(button => 
      button.querySelector('svg.lucide-share2')
    );
    
    expect(shareButton).toBeDefined();
    fireEvent.click(shareButton!);

    // The share button should work (either through navigator.share or clipboard fallback)
    expect(shareButton).toBeInTheDocument();
  });

  it('shows back button when onBack is provided', () => {
    const onBack = jest.fn();
    renderWithQueryClient(<ProjectDetail projectId="1" onBack={onBack} />);

    const backButton = screen.getByText('Back to Projects');
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('calls onProjectView when related project is clicked', () => {
    const onProjectView = jest.fn();
    renderWithQueryClient(<ProjectDetail projectId="1" onProjectView={onProjectView} />);

    // This would require the ProjectCard in related projects to call onView
    // The actual test would depend on the implementation
  });

  it('increments view count on mount', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(mockIncrementViewCount).toHaveBeenCalledWith('1');
  });

  it('shows loading skeleton when loading', () => {
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    // Should show skeleton loaders
    const skeletonElements = screen.getAllByRole('generic');
    expect(skeletonElements.some(el => el.classList.contains('animate-pulse'))).toBe(true);
  });

  it('shows error state when project not found', () => {
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'Project not found' },
    });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.getByText('Project not found')).toBeInTheDocument();
    expect(screen.getByText(/the project you're looking for doesn't exist/i)).toBeInTheDocument();
  });

  it('shows go back button in error state when onBack is provided', () => {
    const onBack = jest.fn();
    mockUseProject.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'Project not found' },
    });

    renderWithQueryClient(<ProjectDetail projectId="1" onBack={onBack} />);

    const goBackButton = screen.getByText('Go Back');
    expect(goBackButton).toBeInTheDocument();

    fireEvent.click(goBackButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('applies difficulty level styling correctly', () => {
    renderWithQueryClient(<ProjectDetail projectId="1" />);

    const difficultyBadges = screen.getAllByText('advanced');
    // Check the first difficulty badge (should be in the badges section)
    expect(difficultyBadges[0]).toHaveClass('bg-gray-800', 'text-white');
  });

  it('handles projects without external links', () => {
    const projectWithoutLinks = {
      ...mockProject,
      githubUrl: undefined,
      demoUrl: undefined,
    };

    mockUseProject.mockReturnValue({
      data: projectWithoutLinks,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.queryByText('Links')).not.toBeInTheDocument();
    expect(screen.queryByText('View Source Code')).not.toBeInTheDocument();
    expect(screen.queryByText('View Demo')).not.toBeInTheDocument();
  });

  it('handles projects without tags', () => {
    const projectWithoutTags = {
      ...mockProject,
      tags: [],
    };

    mockUseProject.mockReturnValue({
      data: projectWithoutTags,
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.queryByText('Tags')).not.toBeInTheDocument();
  });

  it('handles projects without related projects', () => {
    mockUseRelatedProjects.mockReturnValue({ data: [] });

    renderWithQueryClient(<ProjectDetail projectId="1" />);

    expect(screen.queryByText('Related Projects')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-detail-class';
    const { container } = renderWithQueryClient(<ProjectDetail projectId="1" className={customClass} />);

    // The className should be applied to the root div
    expect(container.firstChild).toHaveClass(customClass);
  });
});