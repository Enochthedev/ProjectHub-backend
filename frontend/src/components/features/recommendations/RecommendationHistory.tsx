'use client';

import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  TrendingUp, 
  Filter, 
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Archive,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Recommendation, RecommendationFilters } from '@/types/recommendation';
import { useRecommendationStore } from '@/stores/recommendation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import RecommendationCard from './RecommendationCard';

interface RecommendationHistoryProps {
  onViewRecommendation?: (recommendation: Recommendation) => void;
  onExplainRecommendation?: (recommendationId: string, projectId: string) => void;
}

export const RecommendationHistory: React.FC<RecommendationHistoryProps> = ({
  onViewRecommendation,
  onExplainRecommendation,
}) => {
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<Partial<RecommendationFilters>>({});

  const {
    recommendationHistory,
    historyTotal,
    historyHasMore,
    isLoadingHistory,
    filters,
    getRecommendationHistory,
    loadMoreHistory,
    setFilters,
    clearFilters,
  } = useRecommendationStore();

  useEffect(() => {
    if ((recommendationHistory || []).length === 0) {
      getRecommendationHistory();
    }
  }, [getRecommendationHistory, recommendationHistory]);

  const toggleExpanded = (recommendationId: string) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(recommendationId)) {
      newExpanded.delete(recommendationId);
    } else {
      newExpanded.add(recommendationId);
    }
    setExpandedRecommendations(newExpanded);
  };

  const handleApplyFilters = () => {
    setFilters(localFilters);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    clearFilters();
    setShowFilters(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-gray-900 text-white border-gray-900';
      case 'expired':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      case 'archived':
        return 'bg-gray-200 text-gray-700 border-gray-400';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Eye className="w-3 h-3" />;
      case 'expired':
        return <Clock className="w-3 h-3" />;
      case 'archived':
        return <Archive className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  if (isLoadingHistory && (recommendationHistory || []).length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Recommendation History</h2>
          <p className="text-gray-600 mt-1">
            {historyTotal > 0 ? `${historyTotal} recommendations found` : 'No recommendations yet'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => getRecommendationHistory()}
            disabled={isLoadingHistory}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specializations
              </label>
              <select
                multiple
                value={localFilters.specializations || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setLocalFilters(prev => ({ ...prev, specializations: values }));
                }}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Data Science">Data Science</option>
                <option value="Cybersecurity">Cybersecurity</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Levels
              </label>
              <select
                multiple
                value={localFilters.difficultyLevels || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value) as ('beginner' | 'intermediate' | 'advanced')[];
                  setLocalFilters(prev => ({ ...prev, difficultyLevels: values }));
                }}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              >
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
                value={localFilters.minSimilarityScore || 0}
                onChange={(e) => {
                  setLocalFilters(prev => ({ ...prev, minSimilarityScore: parseFloat(e.target.value) }));
                }}
                className="w-full"
              />
              <div className="text-sm text-gray-600 mt-1">
                {Math.round((localFilters.minSimilarityScore || 0) * 100)}%
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleClearFilters}>
              Clear Filters
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </Card>
      )}

      {/* History List */}
      {(recommendationHistory || []).length === 0 && !isLoadingHistory ? (
        <Card className="p-8 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations Yet</h3>
          <p className="text-gray-600 mb-4">
            You haven't received any recommendations yet. Generate your first set of recommendations to get started.
          </p>
          <Button onClick={() => window.location.href = '/recommendations'}>
            Get Recommendations
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {(recommendationHistory || []).map((recommendation) => (
            <Card key={recommendation.id} className="overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={getStatusColor(recommendation.status)}>
                      {getStatusIcon(recommendation.status)}
                      <span className="ml-1 capitalize">{recommendation.status}</span>
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Generated on {formatDate(recommendation.createdAt)}</span>
                    </div>
                    {recommendation.expiresAt && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(recommendation.expiresAt) > new Date() 
                            ? `Expires ${formatDate(recommendation.expiresAt)}`
                            : `Expired ${formatDate(recommendation.expiresAt)}`
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>{Math.round(recommendation.averageSimilarityScore * 100)}% avg match</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(recommendation.id)}
                    >
                      {expandedRecommendations.has(recommendation.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-3">
                  <p className="text-sm text-gray-700">{recommendation.reasoning}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    <span>{recommendation.projectSuggestions.length} projects recommended</span>
                    <span>{recommendation.feedback.length} feedback items</span>
                    <span>Profile completeness: {recommendation.profileSnapshot.profileCompleteness}%</span>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedRecommendations.has(recommendation.id) && (
                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    {recommendation.projectSuggestions.map((project) => (
                      <RecommendationCard
                        key={project.projectId}
                        recommendation={project}
                        recommendationId={recommendation.id}
                        onExplain={(rec) => onExplainRecommendation?.(recommendation.id, rec.projectId)}
                        onViewProject={(projectId) => window.location.href = `/projects/${projectId}`}
                        compact
                        showFeedback={recommendation.status === 'active'}
                      />
                    ))}
                  </div>

                  {/* Profile Snapshot */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Profile at Time of Recommendation</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recommendation.profileSnapshot.skills.map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Interests:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recommendation.profileSnapshot.interests.map((interest, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Specializations:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recommendation.profileSnapshot.specializations.map((spec, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {/* Load More */}
          {historyHasMore && (
            <div className="text-center pt-4">
              <Button
                variant="ghost"
                onClick={loadMoreHistory}
                disabled={isLoadingHistory}
                className="flex items-center gap-2"
              >
                {isLoadingHistory ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="w-4 h-4" />
                )}
                {isLoadingHistory ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecommendationHistory;