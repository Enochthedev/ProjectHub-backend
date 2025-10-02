'use client';

import React, { useState } from 'react';
import { 
  Heart, 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  Info, 
  Bookmark,
  User,
  TrendingUp,
  Clock,
  Target
} from 'lucide-react';
import { ProjectRecommendation, CreateRecommendationFeedbackData } from '@/types/recommendation';
import { useRecommendationStore } from '@/stores/recommendation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';

interface RecommendationCardProps {
  recommendation: ProjectRecommendation;
  recommendationId: string;
  onExplain?: (recommendation: ProjectRecommendation) => void;
  onViewProject?: (projectId: string) => void;
  compact?: boolean;
  showFeedback?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  recommendationId,
  onExplain,
  onViewProject,
  compact = false,
  showFeedback = true,
}) => {
  const [feedbackGiven, setFeedbackGiven] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  
  const { submitFeedback, isSubmittingFeedback } = useRecommendationStore();

  const handleFeedback = async (feedbackType: CreateRecommendationFeedbackData['feedbackType'], ratingValue?: number) => {
    try {
      await submitFeedback(recommendationId, recommendation.projectId, {
        feedbackType,
        rating: ratingValue,
      });
      setFeedbackGiven(feedbackType);
      if (feedbackType === 'rating') {
        setShowRating(false);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleRatingSubmit = () => {
    if (rating > 0) {
      handleFeedback('rating', rating);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'intermediate':
        return 'bg-gray-200 text-gray-900 border-gray-400';
      case 'advanced':
        return 'bg-gray-800 text-white border-gray-900';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  if (compact) {
    return (
      <Card className="p-4 hover:border-gray-400 transition-colors cursor-pointer" onClick={() => onViewProject?.(recommendation.projectId)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{recommendation.title}</h3>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{recommendation.abstract}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={getDifficultyColor(recommendation.difficultyLevel)}>
                {recommendation.difficultyLevel}
              </Badge>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <TrendingUp className="w-3 h-3" />
                {formatScore(recommendation.similarityScore)}%
              </div>
            </div>
          </div>
          {onExplain && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExplain(recommendation);
              }}
              className="ml-2 flex-shrink-0"
            >
              <Info className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:border-gray-400 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={getDifficultyColor(recommendation.difficultyLevel)}>
              {recommendation.difficultyLevel}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">{formatScore(recommendation.similarityScore)}% match</span>
            </div>
            {recommendation.diversityBoost && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Target className="w-4 h-4" />
                <span>+{Math.round(recommendation.diversityBoost * 100)}% diversity</span>
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{recommendation.title}</h3>
        </div>
        {onExplain && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExplain(recommendation)}
            className="ml-4 flex-shrink-0"
          >
            <Info className="w-4 h-4 mr-1" />
            Why?
          </Button>
        )}
      </div>

      {/* Abstract */}
      <p className="text-gray-700 mb-4 leading-relaxed">{recommendation.abstract}</p>

      {/* Matching Skills and Interests */}
      <div className="space-y-3 mb-4">
        {recommendation.matchingSkills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Matching Skills</h4>
            <div className="flex flex-wrap gap-1">
              {recommendation.matchingSkills.map((skill, index) => (
                <Badge key={index} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {recommendation.matchingInterests.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Matching Interests</h4>
            <div className="flex flex-wrap gap-1">
              {recommendation.matchingInterests.map((interest, index) => (
                <Badge key={index} variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">
                  {interest}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reasoning */}
      <div className="bg-gray-50 p-3 rounded border mb-4">
        <p className="text-sm text-gray-700 italic">{recommendation.reasoning}</p>
      </div>

      {/* Supervisor */}
      <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
        <User className="w-4 h-4" />
        <span>
          <span className="font-medium">{recommendation.supervisor.name}</span>
          {' • '}
          <span>{recommendation.supervisor.specialization}</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewProject?.(recommendation.projectId)}
          >
            View Project
          </Button>
        </div>

        {showFeedback && (
          <div className="flex items-center gap-2">
            {!showRating && !feedbackGiven && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('like')}
                  disabled={isSubmittingFeedback}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('dislike')}
                  disabled={isSubmittingFeedback}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFeedback('bookmark')}
                  disabled={isSubmittingFeedback}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRating(true)}
                  disabled={isSubmittingFeedback}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <Star className="w-4 h-4" />
                </Button>
              </>
            )}

            {showRating && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`p-1 rounded ${
                        star <= rating
                          ? 'text-gray-900'
                          : 'text-gray-300 hover:text-gray-600'
                      }`}
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRatingSubmit}
                  disabled={rating === 0 || isSubmittingFeedback}
                  className="text-sm"
                >
                  Rate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowRating(false);
                    setRating(0);
                  }}
                  className="text-sm text-gray-500"
                >
                  Cancel
                </Button>
              </div>
            )}

            {feedbackGiven && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {feedbackGiven === 'like' && <ThumbsUp className="w-4 h-4 text-gray-900" />}
                {feedbackGiven === 'dislike' && <ThumbsDown className="w-4 h-4 text-gray-900" />}
                {feedbackGiven === 'bookmark' && <Bookmark className="w-4 h-4 text-gray-900" />}
                {feedbackGiven === 'rating' && <Star className="w-4 h-4 text-gray-900 fill-current" />}
                <span>Thanks for your feedback!</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecommendationCard;