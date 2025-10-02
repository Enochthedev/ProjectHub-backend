'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Target,
  Award,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Download
} from 'lucide-react';
import { useSupervisorStore } from '@/stores/supervisor';
import { supervisorApi } from '@/lib/supervisor-api';
import { SupervisorAnalytics } from '@/types/supervisor';

export default function SupervisorAnalyticsPage() {
  const [analytics, setAnalytics] = useState<SupervisorAnalytics | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        const mockAnalytics: SupervisorAnalytics = {
          supervisorId: '1',
          totalStudents: 8,
          overallMetrics: {
            totalMilestones: 32,
            completedMilestones: 24,
            overdueMilestones: 3,
            blockedMilestones: 1,
            overallCompletionRate: 75,
            averageProgressVelocity: 85,
            atRiskStudentCount: 2
          },
          studentPerformance: {
            topPerformers: [
              { studentId: '1', studentName: 'Alice Johnson', completionRate: 95 },
              { studentId: '2', studentName: 'Bob Chen', completionRate: 88 },
              { studentId: '3', studentName: 'Carol Davis', completionRate: 82 }
            ],
            strugglingStudents: [
              { studentId: '4', studentName: 'David Wilson', completionRate: 45 },
              { studentId: '5', studentName: 'Eva Martinez', completionRate: 38 }
            ],
            averageCompletionRate: 75,
            performanceDistribution: {
              excellent: 2,
              good: 3,
              average: 2,
              poor: 1
            }
          },
          trendAnalysis: {
            completionTrend: 'improving',
            velocityTrend: 'stable',
            riskTrend: 'decreasing',
            monthlyProgress: [
              { month: '2024-01', completionRate: 68 },
              { month: '2024-02', completionRate: 72 },
              { month: '2024-03', completionRate: 75 }
            ]
          },
          benchmarks: {
            departmentAverage: 72,
            universityAverage: 68,
            performanceRanking: 'above_average'
          },
          insights: [
            'Your students are performing 3% above the department average.',
            'Completion rates have improved by 7% over the last quarter.',
            'Consider providing additional support to 2 students who are falling behind.'
          ],
          generatedAt: new Date().toISOString()
        };
        setAnalytics(mockAnalytics);
        setError(null);
      } catch (err) {
        setError('Failed to load analytics data');
        console.error('Analytics error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const getTrendIcon = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: 'improving' | 'stable' | 'declining') => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceColor = (ranking: string) => {
    switch (ranking) {
      case 'excellent':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'above_average':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'average':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'below_average':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-48 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-gray-600 mb-4">No analytics data available</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Analytics & Insights</h1>
            <p className="text-gray-600">
              Comprehensive analytics and performance insights for your supervised students.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
            <Button variant="secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Overall Metrics */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Overall Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-gray-600">Total Students</span>
              </div>
              <span className="text-xl font-bold text-black">{analytics.totalStudents}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-gray-600">Completion Rate</span>
              </div>
              <span className="text-xl font-bold text-green-600">
                {analytics.overallMetrics.overallCompletionRate.toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span className="text-gray-600">At Risk</span>
              </div>
              <span className="text-xl font-bold text-red-600">
                {analytics.overallMetrics.atRiskStudentCount}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="text-gray-600">Avg. Velocity</span>
              </div>
              <span className="text-xl font-bold text-purple-600">
                {analytics.overallMetrics.averageProgressVelocity.toFixed(1)}/week
              </span>
            </div>
          </div>
        </Card>

        {/* Performance Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Performance Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Excellent (90%+)</span>
              </div>
              <span className="font-semibold text-black">
                {analytics.studentPerformance.performanceDistribution.excellent}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-gray-600">Good (70-89%)</span>
              </div>
              <span className="font-semibold text-black">
                {analytics.studentPerformance.performanceDistribution.good}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">Average (50-69%)</span>
              </div>
              <span className="font-semibold text-black">
                {analytics.studentPerformance.performanceDistribution.average}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">Poor (&lt;50%)</span>
              </div>
              <span className="font-semibold text-black">
                {analytics.studentPerformance.performanceDistribution.poor}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Average Completion Rate</span>
              <span className="font-semibold text-black">
                {analytics.studentPerformance.averageCompletionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>

        {/* Trend Analysis */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Trend Analysis</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Completion Trend</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.trendAnalysis.completionTrend)}
                <span className={`font-semibold capitalize ${getTrendColor(analytics.trendAnalysis.completionTrend)}`}>
                  {analytics.trendAnalysis.completionTrend}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Velocity Trend</span>
              <div className="flex items-center gap-2">
                {getTrendIcon(analytics.trendAnalysis.velocityTrend)}
                <span className={`font-semibold capitalize ${getTrendColor(analytics.trendAnalysis.velocityTrend)}`}>
                  {analytics.trendAnalysis.velocityTrend}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Risk Trend</span>
              <div className="flex items-center gap-2">
                {analytics.trendAnalysis.riskTrend === 'decreasing' ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : analytics.trendAnalysis.riskTrend === 'increasing' ? (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                ) : (
                  <BarChart3 className="w-4 h-4 text-gray-600" />
                )}
                <span className={`font-semibold capitalize ${
                  analytics.trendAnalysis.riskTrend === 'decreasing' ? 'text-green-600' :
                  analytics.trendAnalysis.riskTrend === 'increasing' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {analytics.trendAnalysis.riskTrend}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Top Performers */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Top Performers</h3>
          <div className="space-y-3">
            {analytics.studentPerformance.topPerformers.slice(0, 5).map((student, index) => (
              <div key={student.studentId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-yellow-100 rounded-full">
                    <span className="text-xs font-bold text-yellow-600">#{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-black">{student.studentName}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">
                  {student.completionRate.toFixed(1)}%
                </span>
              </div>
            ))}
            {analytics.studentPerformance.topPerformers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No top performers data available</p>
            )}
          </div>
        </Card>

        {/* Struggling Students */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Students Needing Support</h3>
          <div className="space-y-3">
            {analytics.studentPerformance.strugglingStudents.slice(0, 5).map((student) => (
              <div key={student.studentId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-black">{student.studentName}</span>
                </div>
                <span className="text-sm font-semibold text-red-600">
                  {student.completionRate.toFixed(1)}%
                </span>
              </div>
            ))}
            {analytics.studentPerformance.strugglingStudents.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No struggling students identified</p>
            )}
          </div>
        </Card>

        {/* Benchmarks */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Performance Benchmarks</h3>
          <div className="space-y-4">
            <div className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPerformanceColor(analytics.benchmarks.performanceRanking)}`}>
                <Award className="w-4 h-4 mr-2" />
                {analytics.benchmarks.performanceRanking.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Your Average</span>
                <span className="font-semibold text-black">
                  {analytics.studentPerformance.averageCompletionRate.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Department Avg</span>
                <span className="font-semibold text-blue-600">
                  {analytics.benchmarks.departmentAverage.toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">University Avg</span>
                <span className="font-semibold text-purple-600">
                  {analytics.benchmarks.universityAverage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Progress Chart */}
      {analytics.trendAnalysis.monthlyProgress.length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold text-black mb-4">Monthly Progress Trend</h3>
          <div className="space-y-2">
            {analytics.trendAnalysis.monthlyProgress.map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${month.completionRate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-black w-12 text-right">
                    {month.completionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Insights */}
      {analytics.insights.length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold text-black mb-4">AI-Generated Insights</h3>
          <div className="space-y-3">
            {analytics.insights.map((insight, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded border border-blue-200">
                <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Last Updated */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Last updated: {new Date(analytics.generatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}