'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Award, TrendingUp, Users, Star, Trophy } from 'lucide-react';
import { projectScoringApi } from '@/lib/project-scoring-api';
import { SupervisorRanking } from '@/types/project';

interface SupervisorRankingsProps {
  showTop?: number;
  className?: string;
}

export const SupervisorRankings: React.FC<SupervisorRankingsProps> = ({
  showTop = 10,
  className
}) => {
  const [rankings, setRankings] = useState<SupervisorRanking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true);
        const data = await projectScoringApi.getSupervisorRankings();
        setRankings(data.slice(0, showTop));
        setError(null);
      } catch (err) {
        setError('Failed to load supervisor rankings');
        console.error('Rankings error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, [showTop]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 2:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 3:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="mb-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No supervisor rankings available yet.</p>
      </Card>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-black mb-2">Top Supervisors</h3>
        <p className="text-sm text-gray-600">
          Based on student success rates and satisfaction scores
        </p>
      </div>

      <div className="space-y-4">
        {rankings.map((supervisor) => (
          <div
            key={supervisor.supervisorId}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-10 h-10">
              {getRankIcon(supervisor.overallRank || 0)}
            </div>

            {/* Supervisor Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-black truncate">
                  {supervisor.supervisorName}
                </h4>
                {supervisor.overallRank && supervisor.overallRank <= 3 && (
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getRankBadgeColor(supervisor.overallRank)}`}>
                    #{supervisor.overallRank}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{supervisor.totalProjects} projects</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{supervisor.completionRate.toFixed(1)}% completion</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>{supervisor.averageStudentSatisfaction.toFixed(1)}/5</span>
                </div>
              </div>
            </div>

            {/* Success Score */}
            <div className="text-right">
              <div className="text-lg font-bold text-black">
                {supervisor.averageProjectSuccess.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Success Rate</div>
            </div>
          </div>
        ))}
      </div>

      {rankings.length >= showTop && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Showing top {showTop} supervisors
          </p>
        </div>
      )}
    </Card>
  );
};

export default SupervisorRankings;