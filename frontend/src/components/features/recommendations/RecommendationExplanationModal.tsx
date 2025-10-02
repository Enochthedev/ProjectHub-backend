'use client';

import React, { useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  Target, 
  User, 
  BookOpen, 
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { ProjectRecommendation, RecommendationExplanation } from '@/types/recommendation';
import { useRecommendationStore } from '@/stores/recommendation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';

interface RecommendationExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendation: ProjectRecommendation | null;
  recommendationId: string;
}

export const RecommendationExplanationModal: React.FC<RecommendationExplanationModalProps> = ({
  isOpen,
  onClose,
  recommendation,
  recommendationId,
}) => {
  const { 
    explanations, 
    isLoadingExplanation, 
    getExplanation 
  } = useRecommendationStore();

  const explanationKey = recommendation ? `${recommendationId}-${recommendation.projectId}` : null;
  const explanation = explanationKey ? explanations[explanationKey] : null;

  useEffect(() => {
    if (isOpen && recommendation && !explanation && !isLoadingExplanation) {
      getExplanation(recommendationId, recommendation.projectId);
    }
  }, [isOpen, recommendation, explanation, isLoadingExplanation, getExplanation, recommendationId]);

  if (!recommendation) return null;

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-gray-900';
    if (score >= 0.6) return 'text-gray-700';
    return 'text-gray-500';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 0.8) return <CheckCircle className="w-4 h-4 text-gray-900" />;
    if (score >= 0.6) return <AlertCircle className="w-4 h-4 text-gray-700" />;
    return <Info className="w-4 h-4 text-gray-500" />;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Why was this recommended?
            </h2>
            <h3 className="text-lg text-gray-700 font-medium">
              {recommendation.title}
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Loading State */}
        {isLoadingExplanation && (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoadingExplanation && explanation && (
          <div className="space-y-6">
            {/* Overall Reasoning */}
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Overall Match
              </h4>
              <p className="text-gray-700 mb-3">{explanation.reasoning}</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Confidence Score:</span>
                  <span className={`font-semibold ${getScoreColor(explanation.confidenceScore)}`}>
                    {formatScore(explanation.confidenceScore)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Similarity Score:</span>
                  <span className={`font-semibold ${getScoreColor(recommendation.similarityScore)}`}>
                    {formatScore(recommendation.similarityScore)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Matching Factors */}
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Matching Factors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Skills Match */}
                <div className="border border-gray-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Skills</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(explanation.matchingFactors.skills.score)}
                      <span className={`text-sm font-medium ${getScoreColor(explanation.matchingFactors.skills.score)}`}>
                        {formatScore(explanation.matchingFactors.skills.score)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {explanation.matchingFactors.skills.explanation}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {explanation.matchingFactors.skills.matched.map((skill, index) => (
                      <Badge key={index} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Interests Match */}
                <div className="border border-gray-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Interests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(explanation.matchingFactors.interests.score)}
                      <span className={`text-sm font-medium ${getScoreColor(explanation.matchingFactors.interests.score)}`}>
                        {formatScore(explanation.matchingFactors.interests.score)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {explanation.matchingFactors.interests.explanation}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {explanation.matchingFactors.interests.matched.map((interest, index) => (
                      <Badge key={index} variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Specialization Match */}
                <div className="border border-gray-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Specialization</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(explanation.matchingFactors.specialization.score)}
                      <span className={`text-sm font-medium ${getScoreColor(explanation.matchingFactors.specialization.score)}`}>
                        {explanation.matchingFactors.specialization.match ? 'Perfect Match' : 'Partial Match'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {explanation.matchingFactors.specialization.explanation}
                  </p>
                </div>

                {/* Difficulty Match */}
                <div className="border border-gray-200 p-4 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Difficulty</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getScoreIcon(explanation.matchingFactors.difficulty.score)}
                      <span className={`text-sm font-medium ${getScoreColor(explanation.matchingFactors.difficulty.score)}`}>
                        {explanation.matchingFactors.difficulty.appropriate ? 'Appropriate' : 'Challenging'}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {explanation.matchingFactors.difficulty.explanation}
                  </p>
                </div>
              </div>
            </div>

            {/* Diversity Factors */}
            {explanation.diversityFactors && explanation.diversityFactors.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Diversity Boost</h4>
                <div className="space-y-2">
                  {explanation.diversityFactors.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                      <span className="text-sm text-gray-700">{factor.reason}</span>
                      <span className="text-sm font-medium text-gray-900">
                        +{Math.round(factor.boost * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Projects */}
            {explanation.similarProjects.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Similar Projects You Might Like</h4>
                <div className="space-y-2">
                  {explanation.similarProjects.map((project, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                      <span className="text-sm text-gray-900">{project.title}</span>
                      <span className="text-sm text-gray-600">
                        {formatScore(project.similarityScore)}% similar
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {!isLoadingExplanation && !explanation && (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Explanation Not Available
            </h3>
            <p className="text-gray-600 mb-4">
              We couldn't load the detailed explanation for this recommendation.
            </p>
            <Button 
              variant="secondary" 
              onClick={() => recommendation && getExplanation(recommendationId, recommendation.projectId)}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RecommendationExplanationModal;