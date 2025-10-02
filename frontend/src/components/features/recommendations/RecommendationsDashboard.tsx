'use client';

import React, { useEffect, useState } from 'react';
import { 
  RefreshCw, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Settings,
  History,
  Filter,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { GenerateRecommendationsParams } from '@/types/recommendation';
import { useRecommendationStore, useRecommendationStats, useFilteredRecommendations } from '@/stores/recommendation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import RecommendationCard from './RecommendationCard';
import RecommendationExplanationModal from './RecommendationExplanationModal';
import RecommendationHistory from './RecommendationHistory';

interface RecommendationsDashboardProps {
  onViewProject?: (projectId: string) => void;
}

export const RecommendationsDashboard: React.FC<RecommendationsDashboardProps> = ({
  onViewProject,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [generationParams, setGenerationParams] = useState<GenerateRecommendationsParams>({
    limit: 5,
    includeDiversityBoost: true,
  });

  const {
    currentRecommendations,
    recommendationMetadata,
    isLoading,
    isRefreshing,
    error,
    selectedRecommendation,
    showExplanationModal,
    generateRecommendations,
    refreshRecommendations,
    showExplanation,
    hideExplanation,
    clearError,
  } = useRecommendationStore();

  const filteredRecommendations = useFilteredRecommendations();
  const stats = useRecommendationStats();

  useEffect(() => {
    if (!currentRecommendations && !isLoading) {
      generateRecommendations(generationParams);
    }
  }, [currentRecommendations, isLoading, generateRecommendations, generationParams]);

  const handleGenerateRecommendations = () => {
    generateRecommendations({ ...generationParams, forceRefresh: true });
  };

  const handleRefreshRecommendations = () => {
    refreshRecommendations();
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getAlgorithmBadge = (algorithm: string) => {
    switch (algorithm) {
      case 'hybrid-similarity-v2':
        return <Badge variant="outline" className="bg-gray-900 text-white border-gray-900">AI-Powered</Badge>;
      case 'rule-based-fallback':
        return <Badge variant="outline" className="bg-gray-600 text-white border-gray-600">Rule-Based</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-400 text-white border-gray-400">Standard</Badge>;
    }
  };

  if (showHistory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setShowHistory(false)}
            className="flex items-center gap-2"
          >
            ← Back to Current Recommendations
          </Button>
        </div>
        <RecommendationHistory
          onExplainRecommendation={(recommendationId, projectId) => {
            const recommendation = currentRecommendations?.projectSuggestions.find(p => p.projectId === projectId);
            if (recommendation) {
              showExplanation(recommendation);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Recommendations</h1>
          <p className="text-gray-600 mt-1">
            Personalized project recommendations based on your profile and interests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
            <ChevronDown className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />
          </Button>
          <Button
            onClick={handleRefreshRecommendations}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="p-4">
          <h3 className="font-medium text-gray-900 mb-4">Recommendation Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Recommendations
              </label>
              <select
                value={generationParams.limit || 5}
                onChange={(e) => setGenerationParams(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value={3}>3 recommendations</option>
                <option value={5}>5 recommendations</option>
                <option value={10}>10 recommendations</option>
                <option value={15}>15 recommendations</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Difficulty
              </label>
              <select
                value={generationParams.maxDifficulty || ''}
                onChange={(e) => setGenerationParams(prev => ({ 
                  ...prev, 
                  maxDifficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' || undefined 
                }))}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="">Any difficulty</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Similarity Score
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={generationParams.minSimilarityScore || 0}
                onChange={(e) => setGenerationParams(prev => ({ 
                  ...prev, 
                  minSimilarityScore: parseFloat(e.target.value) 
                }))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">
                {Math.round((generationParams.minSimilarityScore || 0) * 100)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={generationParams.includeDiversityBoost || false}
                onChange={(e) => setGenerationParams(prev => ({ 
                  ...prev, 
                  includeDiversityBoost: e.target.checked 
                }))}
                className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <span className="text-sm text-gray-700">Include diversity boost</span>
            </label>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleGenerateRecommendations} disabled={isLoading}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate New Recommendations
            </Button>
          </div>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error generating recommendations</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
          <div className="flex gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-700 hover:text-red-900"
            >
              Dismiss
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateRecommendations}
              className="text-red-700 hover:text-red-900"
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      {currentRecommendations && recommendationMetadata && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Average Match</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(stats.averageScore * 100)}%
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Recommendations</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalRecommendations}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Processing Time</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {formatProcessingTime(recommendationMetadata.processingTime)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Algorithm</span>
            </div>
            <div className="mt-2">
              {getAlgorithmBadge(recommendationMetadata.algorithm)}
            </div>
          </Card>
        </div>
      )}

      {/* Metadata */}
      {recommendationMetadata && (
        <Card className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>Generated from {recommendationMetadata.totalProjects} available projects</span>
              </div>
              {recommendationMetadata.cacheHit && (
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span>Served from cache</span>
                </div>
              )}
              {recommendationMetadata.fallbackUsed && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-yellow-700">Fallback algorithm used</span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {currentRecommendations ? new Date(currentRecommendations.updatedAt).toLocaleString() : 'Never'}
            </div>
          </div>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !currentRecommendations && (
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {!isLoading && filteredRecommendations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Recommendations
            </h2>
            <div className="text-sm text-gray-600">
              Showing {filteredRecommendations.length} of {currentRecommendations?.projectSuggestions.length || 0} recommendations
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.projectId}
                recommendation={recommendation}
                recommendationId={currentRecommendations?.id || ''}
                onExplain={showExplanation}
                onViewProject={onViewProject}
                showFeedback={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !currentRecommendations && (
        <Card className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Recommendations Available
          </h3>
          <p className="text-gray-600 mb-4">
            We couldn't generate recommendations for you right now. This might be because your profile needs more information or there are no suitable projects available.
          </p>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" onClick={() => window.location.href = '/profile'}>
              Update Profile
            </Button>
            <Button onClick={handleGenerateRecommendations}>
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {/* Explanation Modal */}
      <RecommendationExplanationModal
        isOpen={showExplanationModal}
        onClose={hideExplanation}
        recommendation={selectedRecommendation}
        recommendationId={currentRecommendations?.id || ''}
      />
    </div>
  );
};

export default RecommendationsDashboard;