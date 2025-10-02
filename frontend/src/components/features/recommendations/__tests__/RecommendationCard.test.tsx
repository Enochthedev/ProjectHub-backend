import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRecommendationStore } from '@/stores/recommendation';
import RecommendationCard from '../RecommendationCard';
import { ProjectRecommendation } from '@/types/recommendation';

// Mock the store
jest.mock('@/stores/recommendation');
const mockUseRecommendationStore = useRecommendationStore as jest.MockedFunction<typeof useRecommendationStore>;

const mockRecommendation: ProjectRecommendation = {
  projectId: 'proj-1',
  title: 'AI-Powered Learning Management System',
  abstract: 'Develop an intelligent LMS that adapts to student learning patterns using machine learning algorithms.',
  specialization: 'Computer Science',
  difficultyLevel: 'intermediate',
  similarityScore: 0.92,
  matchingSkills: ['JavaScript', 'Python', 'Machine Learning'],
  matchingInterests: ['AI', 'Education Technology'],
  reasoning: 'This project matches your interests in AI and education, and aligns with your JavaScript and Python skills.',
  supervisor: {
    id: 'sup-1',
    name: 'Dr. Sarah Johnson',
    specialization: 'Artificial Intelligence',
  },
  diversityBoost: 0.1,
};

const mockStoreState = {
  submitFeedback: jest.fn(),
  isSubmittingFeedback: false,
};

describe('RecommendationCard', () => {
  beforeEach(() => {
    mockUseRecommendationStore.mockReturnValue(mockStoreState as any);
    jest.clearAllMocks();
  });

  it('renders recommendation information correctly', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    expect(screen.getByText('AI-Powered Learning Management System')).toBeInTheDocument();
    expect(screen.getByText(/Develop an intelligent LMS/)).toBeInTheDocument();
    expect(screen.getByText('intermediate')).toBeInTheDocument();
    expect(screen.getByText('92% match')).toBeInTheDocument();
    expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Artificial Intelligence')).toBeInTheDocument();
  });

  it('displays matching skills and interests', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    expect(screen.getByText('Matching Skills')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();

    expect(screen.getByText('Matching Interests')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Education Technology')).toBeInTheDocument();
  });

  it('displays reasoning', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    expect(screen.getByText(mockRecommendation.reasoning)).toBeInTheDocument();
  });

  it('shows diversity boost when present', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    expect(screen.getByText('+10% diversity')).toBeInTheDocument();
  });

  it('calls onExplain when explain button is clicked', () => {
    const mockOnExplain = jest.fn();

    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
        onExplain={mockOnExplain}
      />
    );

    const explainButton = screen.getByText('Why?');
    fireEvent.click(explainButton);

    expect(mockOnExplain).toHaveBeenCalledWith(mockRecommendation);
  });

  it('calls onViewProject when view project button is clicked', () => {
    const mockOnViewProject = jest.fn();

    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
        onViewProject={mockOnViewProject}
      />
    );

    const viewButton = screen.getByText('View Project');
    fireEvent.click(viewButton);

    expect(mockOnViewProject).toHaveBeenCalledWith('proj-1');
  });

  it('submits like feedback when thumbs up is clicked', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    const buttons = screen.getAllByRole('button');
    const likeButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-thumbs-up"]')
    );
    
    expect(likeButton).toBeTruthy();
    fireEvent.click(likeButton!);

    await waitFor(() => {
      expect(mockStoreState.submitFeedback).toHaveBeenCalledWith(
        'rec-1',
        'proj-1',
        { feedbackType: 'like' }
      );
    });
  });

  it('submits dislike feedback when thumbs down is clicked', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    const buttons = screen.getAllByRole('button');
    const dislikeButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-thumbs-down"]')
    );
    
    expect(dislikeButton).toBeTruthy();
    fireEvent.click(dislikeButton!);

    await waitFor(() => {
      expect(mockStoreState.submitFeedback).toHaveBeenCalledWith(
        'rec-1',
        'proj-1',
        { feedbackType: 'dislike' }
      );
    });
  });

  it('submits bookmark feedback when bookmark button is clicked', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    const buttons = screen.getAllByRole('button');
    const bookmarkButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-bookmark"]')
    );
    
    expect(bookmarkButton).toBeTruthy();
    fireEvent.click(bookmarkButton!);

    await waitFor(() => {
      expect(mockStoreState.submitFeedback).toHaveBeenCalledWith(
        'rec-1',
        'proj-1',
        { feedbackType: 'bookmark' }
      );
    });
  });

  it('shows rating interface when star button is clicked', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    // Find star button by its SVG icon
    const starButtons = screen.getAllByRole('button');
    const starButton = starButtons.find(button => 
      button.querySelector('svg[class*="lucide-star"]')
    );
    
    expect(starButton).toBeTruthy();
    fireEvent.click(starButton!);

    expect(screen.getByText('Rate')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('submits rating when rating is selected and submitted', async () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    // Find star button by its SVG icon
    const starButtons = screen.getAllByRole('button');
    const starButton = starButtons.find(button => 
      button.querySelector('svg[class*="lucide-star"]')
    );
    
    expect(starButton).toBeTruthy();
    fireEvent.click(starButton!);

    // Click on 4th star (rating stars appear after clicking the star button)
    await waitFor(() => {
      // Find all star buttons that have the Star icon
      const allButtons = screen.getAllByRole('button');
      const starButtons = allButtons.filter(button => 
        button.querySelector('svg[class*="lucide-star"]')
      );
      // The rating stars should be the last 5 star buttons
      const ratingStars = starButtons.slice(-5);
      const fourthStar = ratingStars[3]; // 4th star (0-indexed)
      fireEvent.click(fourthStar);
    });

    // Click rate button
    const rateButton = screen.getByText('Rate');
    fireEvent.click(rateButton);

    await waitFor(() => {
      expect(mockStoreState.submitFeedback).toHaveBeenCalledWith(
        'rec-1',
        'proj-1',
        { feedbackType: 'rating', rating: 4 }
      );
    });
  });

  it('renders in compact mode', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
        compact={true}
      />
    );

    // In compact mode, should not show detailed information
    expect(screen.queryByText('Matching Skills')).not.toBeInTheDocument();
    expect(screen.queryByText('Matching Interests')).not.toBeInTheDocument();
    expect(screen.queryByText(mockRecommendation.reasoning)).not.toBeInTheDocument();

    // But should still show basic info
    expect(screen.getByText('AI-Powered Learning Management System')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument(); // Text is split across elements
  });

  it('hides feedback when showFeedback is false', () => {
    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
        showFeedback={false}
      />
    );

    expect(screen.queryByRole('button', { name: /thumbs up/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /thumbs down/i })).not.toBeInTheDocument();
  });

  it('disables feedback buttons when submitting', () => {
    mockUseRecommendationStore.mockReturnValue({
      ...mockStoreState,
      isSubmittingFeedback: true,
    } as any);

    render(
      <RecommendationCard
        recommendation={mockRecommendation}
        recommendationId="rec-1"
      />
    );

    // Find buttons by their SVG icons since they don't have accessible names
    const buttons = screen.getAllByRole('button');
    const likeButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-thumbs-up"]')
    );
    const dislikeButton = buttons.find(button => 
      button.querySelector('svg[class*="lucide-thumbs-down"]')
    );

    expect(likeButton).toBeDisabled();
    expect(dislikeButton).toBeDisabled();
  });

  it('applies correct difficulty colors', () => {
    const beginnerRecommendation = { ...mockRecommendation, difficultyLevel: 'beginner' as const };
    const advancedRecommendation = { ...mockRecommendation, difficultyLevel: 'advanced' as const };

    const { rerender } = render(
      <RecommendationCard
        recommendation={beginnerRecommendation}
        recommendationId="rec-1"
      />
    );

    let difficultyBadge = screen.getByText('beginner');
    expect(difficultyBadge).toHaveClass('bg-gray-100', 'text-gray-800');

    rerender(
      <RecommendationCard
        recommendation={advancedRecommendation}
        recommendationId="rec-1"
      />
    );

    difficultyBadge = screen.getByText('advanced');
    expect(difficultyBadge).toHaveClass('bg-gray-800', 'text-white');
  });
});