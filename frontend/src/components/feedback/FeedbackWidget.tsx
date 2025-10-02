'use client';

import React, { useState } from 'react';
import { X, MessageSquare, Star, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general';
  rating: number;
  message: string;
  email?: string;
  page: string;
  userAgent: string;
  timestamp: string;
}

interface FeedbackWidgetProps {
  className?: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'type' | 'rating' | 'message' | 'success'>('type');
  const [feedback, setFeedback] = useState<Partial<FeedbackData>>({
    type: 'general',
    rating: 0,
    message: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    { id: 'bug', label: 'Report a Bug', description: 'Something isn\'t working correctly' },
    { id: 'feature', label: 'Request Feature', description: 'Suggest a new feature or enhancement' },
    { id: 'improvement', label: 'Suggest Improvement', description: 'How can we make this better?' },
    { id: 'general', label: 'General Feedback', description: 'Share your thoughts with us' },
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const feedbackData: FeedbackData = {
        ...feedback,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      } as FeedbackData;

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackData),
      });

      if (response.ok) {
        setStep('success');
        setTimeout(() => {
          setIsOpen(false);
          resetForm();
        }, 2000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('type');
    setFeedback({
      type: 'general',
      rating: 0,
      message: '',
      email: '',
    });
  };

  const renderStepContent = () => {
    switch (step) {
      case 'type':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">What type of feedback do you have?</h3>
            <div className="space-y-2">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    setFeedback({ ...feedback, type: type.id as FeedbackData['type'] });
                    setStep('rating');
                  }}
                  className={cn(
                    'w-full text-left p-3 border-2 border-gray-200 hover:border-gray-400 transition-colors',
                    feedback.type === type.id && 'border-black bg-gray-50'
                  )}
                >
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-gray-600">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 'rating':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">How would you rate your experience?</h3>
            <div className="flex justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setFeedback({ ...feedback, rating: star })}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={cn(
                      'w-8 h-8',
                      star <= (feedback.rating || 0)
                        ? 'fill-black text-black'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep('type')}
                className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400"
              >
                Back
              </button>
              <button
                onClick={() => setStep('message')}
                disabled={!feedback.rating}
                className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tell us more</h3>
            <textarea
              value={feedback.message}
              onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
              placeholder="Please provide details about your feedback..."
              className="w-full h-32 p-3 border-2 border-gray-300 focus:border-black resize-none"
              maxLength={1000}
            />
            <div className="text-sm text-gray-500 text-right">
              {feedback.message?.length || 0}/1000
            </div>
            
            <input
              type="email"
              value={feedback.email}
              onChange={(e) => setFeedback({ ...feedback, email: e.target.value })}
              placeholder="Email (optional - for follow-up)"
              className="w-full p-3 border-2 border-gray-300 focus:border-black"
            />
            
            <div className="flex justify-between">
              <button
                onClick={() => setStep('rating')}
                className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!feedback.message?.trim() || isSubmitting}
                className="px-4 py-2 bg-black text-white border-2 border-black hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-black text-white rounded-full flex items-center justify-center">
              ✓
            </div>
            <h3 className="text-lg font-medium">Thank you for your feedback!</h3>
            <p className="text-gray-600">
              We appreciate your input and will use it to improve the application.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-brutal hover:shadow-brutal-lg transition-all duration-200 hover:scale-110 flex items-center justify-center z-50',
          className
        )}
        aria-label="Open feedback widget"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black max-w-md w-full p-6 shadow-brutal">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Feedback</h2>
          <button
            onClick={() => {
              setIsOpen(false);
              resetForm();
            }}
            className="p-1 hover:bg-gray-100"
            aria-label="Close feedback widget"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {renderStepContent()}
      </div>
    </div>
  );
};

export { FeedbackWidget };