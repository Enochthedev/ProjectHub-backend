import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRecommendationStore } from '@/stores/recommendation';
import RecommendationsDashboard from '../RecommendationsDashboard';
import { Recommendation } from '@/types/recommendation';

// Mock the store
jest.mock('@/stores/recommendation');
const mockUseRecommendationStore = useRecommendationStore as jest.MockedFunction<typeof useRecommendationStore>;

// Mock the selectors
jest.mock('@/stores/recommendation', () => ({
  useRecommendationStore: jest.fn(),
  useRecommendationStats: jest.fn(),
  useFilteredRecommendations: jest.fn(),
}));

const { useRecommendationStats, useFilteredRecommendations } = require('@/stores/recommendation');

const mockRecommendation: Recommendation = {
  id: 'rec-1',
  studentId: 'student-1',
  projectSuggestions: [
    {
      projectId: 'proj-1',
      title: 'AI-Powered Learning Management System',
      abstract: 'Develop an intelligent LMS that adapts to student learning patterns.',
      specialization: 'Computer Science',
      difficultyLevel: 'intermediate',
      similarityScore: 0.92,
      matchingSkills: ['JavaScript', 'Python'],
      matchingInterests: ['AI', 'Education'],
      reasoning: 'Good match for your skills',
      supervisor: {
        id: 'sup-1',
        name: 'Dr. Sarah Johnson',
        specialization: 'AI',
      },
    },
  ],
  reasoning: 'Based on your profile',
  averageSimilarityScore: 0.92,
  profileSnapshot: {
    skills: ['JavaScript', 'Python'],
    interests: ['AI'],
    specializations: ['Computer Science'],
    profileCompleteness: 85,
    snapshotDate: new Date(),
  },
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  feedback: [],
};

const mockMetadata = {
  totalProjects: 150,
  processingTime: 1200,
  algorithm: 'hybrid-similarity-v2',
  cacheHit: false,
  fallbackUsed: false,
};

const mockStats = {
  totalRecommendations: 1,
  averageScore: 0.92,
  feedbackCount: 0,
  positiveFeedbackCount: 0,
};

const mockStoreState = {
  currentRecommendations: mockRecommendation,
  recommendationMetadata: mockMetadata,
  isLoading: false,
  isRefreshing: false,
  error: null,
  selectedRecommendation: null,
  showExplanationModal: false,
  generateRecommendations: jest.fn(),
  refreshRecommendations: jest.fn(),
  showExplanation: jest.fn(),
  hideExplanation: jest.fn(),
  clearError: jest.fn(),
};

describe('RecommendationsDashboard', () => {
  beforeEach(() => {
    mockUseRecommendationStore.mockReturnValue(mockStoreState as any);
    useRecommendationStats.mockReturnValue(mockStats);
    useFilteredRecommendations.mockReturnValue(mockRecommendation.projectSuggestions);
    jest.clearAllMocks();
  });

  it('renders the dashboard header correctly', () => {
    render(<RecommendationsDashboard />);

    expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
    expect(screen.getByText(/Personalized project recommendations/)).toBeInTheDocument();
  });

  it('displays recommendation stats', () => {
    render(<RecommendationsDashboard />);

    expect(screen.getByText('92%')).toBeInTheDocument(); // Average match
    expect(screen.getByText('1')).toBeInTheDocument(); // Total recommendations
    expect(screen.getByText('1.2s')).toBeInTheDocument(); // Processing time
  });

  it('displays algorithm badge', () => {
    render(<RecommendationsDashboard />);

    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
  });

  it('shows metadata information', () => {
    render(<RecommendationsDashboard />);

    expect(screen.getByText(/Generated from 150 available projects/)).toBeInTheDocument();
  });

  it('renders recommendation cards', () => {
    render(<RecommendationsDashboard />);

    expect(screen.getByText('AI-Powered Learning Management System')).toBeInTheDocument();
    expect(screen.getByText(/Develop an intelligent LMS/)).toBeInTheDocument();
  });

  it('calls generateRecommendations when refresh button is clicked', async () => {
    render(<RecommendationsDashboard />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockStoreState.refreshRecommendations).toHaveBeenCalled();
    });
  });

  it('shows settings panel when settings button is clicked', () => {
    render(<RecommendationsDashboard />);

    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    expect(screen.getByText('Recommendation Settings')).toBeInTheDocument();
    expect(screen.getByText('Number of Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Maximum Difficulty')).toBeInTheDocument();
  });

  it('generates new recommendations with custom settings', async () => {
    render(<RecommendationsDashboard />);

    // Open settings
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    // Change limit
    const limitSelect = screen.getByDisplayValue('5 recommendations');
    fireEvent.change(limitSelect, { target: { value: '10' } });

    // Generate new recommendations
    const generateButton = screen.getByText('Generate New Recommendations');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockStoreState.generateRecommendations).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          forceRefresh: true,
        })
      );
    });
  });

  it('shows loading state', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      isLoading: true,
      currentRecommendations: null,
    } as any);

    render(<RecommendationsDashboard />);

    // Should show skeleton loaders (they use animate-pulse class)
    const skeletonElements = document.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('shows error state', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      error: 'Failed to generate recommendations',
    } as any);

    render(<RecommendationsDashboard />);

    expect(screen.getByText('Error generating recommendations')).toBeInTheDocument();
    expect(screen.getByText('Failed to generate recommendations')).toBeInTheDocument();
  });

  it('shows empty state when no recommendations', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      currentRecommendations: null,
    } as any);
    useFilteredRecommendations.mockReturnValue([]);

    render(<RecommendationsDashboard />);

    expect(screen.getByText('No Recommendations Available')).toBeInTheDocument();
    expect(screen.getByText(/We couldn't generate recommendations/)).toBeInTheDocument();
  });

  it('handles error dismissal', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      error: 'Test error',
    } as any);

    render(<RecommendationsDashboard />);

    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    expect(mockStoreState.clearError).toHaveBeenCalled();
  });

  it('shows history when history button is clicked', () => {
    // Mock the history store state
    const mockHistoryStoreState = {
      ...mockStoreState,
      recommendationHistory: [],
      historyTotal: 0,
      historyHasMore: false,
      isLoadingHistory: false,
      getRecommendationHistory: jest.fn(),
      loadMoreHistory: jest.fn(),
      setFilters: jest.fn(),
      clearFilters: jest.fn(),
    };
    
    mockUseRecommendationStore.mockReturnValue(mockHistoryStoreState as any);

    render(<RecommendationsDashboard />);

    const historyButton = screen.getByText('History');
    fireEvent.click(historyButton);

    expect(screen.getByText('Recommendation History')).toBeInTheDocument();
  });

  it('shows refreshing state', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      isRefreshing: true,
    } as any);

    render(<RecommendationsDashboard />);

    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    const refreshButton = screen.getByText('Refreshing...');
    expect(refreshButton).toBeDisabled();
  });

  it('shows fallback algorithm warning', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      recommendationMetadata: {
        ...mockMetadata,
        fallbackUsed: true,
        algorithm: 'rule-based-fallback',
      },
    } as any);

    render(<RecommendationsDashboard />);

    expect(screen.getByText('Fallback algorithm used')).toBeInTheDocument();
    expect(screen.getByText('Rule-Based')).toBeInTheDocument();
  });

  it('shows cache hit indicator', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      recommendationMetadata: {
        ...mockMetadata,
        cacheHit: true,
      },
    } as any);

    render(<RecommendationsDashboard />);

    expect(screen.getByText('Served from cache')).toBeInTheDocument();
  });

  it('calls onViewProject when provided', () => {
    const mockOnViewProject = jest.fn();

    render(<RecommendationsDashboard onViewProject={mockOnViewProject} />);

    const viewButton = screen.getByText('View Project');
    fireEvent.click(viewButton);

    expect(mockOnViewProject).toHaveBeenCalledWith('proj-1');
  });

  it('opens explanation modal when explain button is clicked', () => {
    render(<RecommendationsDashboard />);

    const explainButton = screen.getByText('Why?');
    fireEvent.click(explainButton);

    expect(mockStoreState.showExplanation).toHaveBeenCalledWith(
      mockRecommendation.projectSuggestions[0]
    );
  });

  it('updates settings correctly', () => {
    render(<RecommendationsDashboard />);

    // Open settings
    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    // Change difficulty
    const difficultySelect = screen.getByDisplayValue('Any difficulty');
    fireEvent.change(difficultySelect, { target: { value: 'intermediate' } });

    // Change diversity boost
    const diversityCheckbox = screen.getByRole('checkbox', { name: /Include diversity boost/ });
    fireEvent.click(diversityCheckbox);

    // The settings should be updated in component state
    expect(difficultySelect).toHaveValue('intermediate');
  });
});