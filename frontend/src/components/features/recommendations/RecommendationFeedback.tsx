'use client';

import React, { useState } from 'react';
import { 
  ThumbsUp, 
  ThumbsDown, 
  Star, 
  MessageSquare, 
  Send,
  X,
  Bookmark,
  EyeOff
} from 'lucide-react';
import { CreateRecommendationFeedbackData } from '@/types/recommendation';
import { useRecommendationStore } from '@/stores/recommendation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';

interface RecommendationFeedbackProps {
  recommendationId: string;
  projectId: string;
  projectTitle: string;
  onFeedbackSubmitted?: (feedbackType: string) => void;
  compact?: boolean;
}

export const RecommendationFeedback: React.FC<RecommendationFeedbackProps> = ({
  recommendationId,
  projectId,
  projectTitle,
  onFeedbackSubmitted,
  compact = false,
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const { submitFeedback, isSubmittingFeedback } = useRecommendationStore();

  const handleQuickFeedback = async (feedbackType: CreateRecommendationFeedbackData['feedbackType']) => {
    try {
      await submitFeedback(recommendationId, projectId, { feedbackType });
      setSelectedFeedback(feedbackType);
      setFeedbackSubmitted(true);
      onFeedbackSubmitted?.(feedbackType);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) return;

    try {
      await submitFeedback(recommendationId, projectId, {
        feedbackType: 'rating',
        rating,
        comment: comment.trim() || undefined,
      });
      setSelectedFeedback('rating');
      setFeedbackSubmitted(true);
      setShowRatingModal(false);
      setComment('');
      onFeedbackSubmitted?.('rating');
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;

    try {
      await submitFeedback(recommendationId, projectId, {
        feedbackType: 'rating',
        rating: 0,
        comment: comment.trim(),
      });
      setSelectedFeedback('comment');
      setFeedbackSubmitted(true);
      setShowCommentModal(false);
      setComment('');
      onFeedbackSubmitted?.('comment');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    }
  };

  const resetFeedback = () => {
    setSelectedFeedback(null);
    setFeedbackSubmitted(false);
    setRating(0);
    setComment('');
  };

  if (feedbackSubmitted) {
    return (
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            {selectedFeedback === 'like' && <ThumbsUp className="w-4 h-4 text-gray-900" />}
            {selectedFeedback === 'dislike' && <ThumbsDown className="w-4 h-4 text-gray-900" />}
            {selectedFeedback === 'bookmark' && <Bookmark className="w-4 h-4 text-gray-900" />}
            {selectedFeedback === 'not_interested' && <EyeOff className="w-4 h-4 text-gray-900" />}
            {selectedFeedback === 'rating' && <Star className="w-4 h-4 text-gray-900 fill-current" />}
            {selectedFeedback === 'comment' && <MessageSquare className="w-4 h-4 text-gray-900" />}
            <span>Thanks for your feedback!</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFeedback}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Change
          </Button>
        </div>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('like')}
          disabled={isSubmittingFeedback}
          className="text-gray-600 hover:text-gray-900 p-1"
          title="Like this recommendation"
        >
          <ThumbsUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('dislike')}
          disabled={isSubmittingFeedback}
          className="text-gray-600 hover:text-gray-900 p-1"
          title="Dislike this recommendation"
        >
          <ThumbsDown className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleQuickFeedback('bookmark')}
          disabled={isSubmittingFeedback}
          className="text-gray-600 hover:text-gray-900 p-1"
          title="Bookmark this project"
        >
          <Bookmark className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card className="p-4 border-gray-200">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            How do you feel about this recommendation?
          </h4>
          <p className="text-xs text-gray-600">
            Your feedback helps us improve future recommendations
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickFeedback('like')}
            disabled={isSubmittingFeedback}
            className="flex items-center gap-2 justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Like it</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickFeedback('dislike')}
            disabled={isSubmittingFeedback}
            className="flex items-center gap-2 justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Not for me</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickFeedback('bookmark')}
            disabled={isSubmittingFeedback}
            className="flex items-center gap-2 justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <Bookmark className="w-4 h-4" />
            <span>Save for later</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickFeedback('not_interested')}
            disabled={isSubmittingFeedback}
            className="flex items-center gap-2 justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
          >
            <EyeOff className="w-4 h-4" />
            <span>Not interested</span>
          </Button>
        </div>

        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRatingModal(true)}
            disabled={isSubmittingFeedback}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <Star className="w-4 h-4" />
            <span>Rate</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCommentModal(true)}
            disabled={isSubmittingFeedback}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
          </Button>
        </div>
      </Card>

      {/* Rating Modal */}
      <Modal isOpen={showRatingModal} onClose={() => setShowRatingModal(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rate this recommendation</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowRatingModal(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <p className="text-gray-600 mb-4">
            How well does "{projectTitle}" match your interests and goals?
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`p-2 rounded transition-colors ${
                  star <= rating
                    ? 'text-gray-900'
                    : 'text-gray-300 hover:text-gray-600'
                }`}
              >
                <Star className="w-8 h-8 fill-current" />
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional comments (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your rating..."
              className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowRatingModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRatingSubmit}
              disabled={rating === 0 || isSubmittingFeedback}
            >
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Comment Modal */}
      <Modal isOpen={showCommentModal} onClose={() => setShowCommentModal(false)}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Share your thoughts</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowCommentModal(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <p className="text-gray-600 mb-4">
            What do you think about this recommendation for "{projectTitle}"?
          </p>

          <div className="mb-4">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts about this recommendation..."
              className="w-full p-3 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setShowCommentModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommentSubmit}
              disabled={!comment.trim() || isSubmittingFeedback}
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Comment'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default RecommendationFeedback;