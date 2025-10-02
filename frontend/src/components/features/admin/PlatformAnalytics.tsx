'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  FileText, 
  MessageSquare,
  Calendar,
  Download,
  RefreshCw,
  Minus
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';

interface PlatformAnalyticsProps {
  className?: string;
}

export default function PlatformAnalytics({ className }: PlatformAnalyticsProps) {
  const {
    platformAnalytics,
    isLoading,
    error,
    fetchPlatformAnalytics,
    clearError,
  } = useAdminStore();

  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchPlatformAnalytics();
  }, [fetchPlatformAnalytics]);

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = () => {
    fetchPlatformAnalytics();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-black mb-2">Failed to Load Analytics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchPlatformAnalytics(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-black flex items-center">
              <BarChart3 className="w-6 h-6 mr-2" />
              Platform Analytics
            </h2>
            <p className="text-gray-600">
              Monitor platform usage, growth metrics, and user engagement.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={() => {/* TODO: Implement export */}}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="px-3 py-1 border-2 border-gray-300 focus:border-black text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="px-3 py-1 border-2 border-gray-300 focus:border-black text-sm"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDateRange({
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                });
              }}
            >
              Last 30 Days
            </Button>
          </div>
        </Card>
      </div>

      {isLoading && !platformAnalytics ? (
        <div className="space-y-6">
          {/* Key Metrics Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
          
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </Card>
            <Card className="p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-64 w-full" />
            </Card>
          </div>
        </div>
      ) : platformAnalytics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-black">Total Users</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-black mb-1">
                {formatNumber(platformAnalytics.totalUsers)}
              </div>
              <div className="text-sm text-gray-500">
                +{platformAnalytics.newUsersThisMonth} this month
              </div>
            </Card>

            {/* Active Users */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-black">Active Users</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-black mb-1">
                {formatNumber(platformAnalytics.activeUsers)}
              </div>
              <div className="text-sm text-gray-500">
                {Math.round((platformAnalytics.activeUsers / platformAnalytics.totalUsers) * 100)}% of total
              </div>
            </Card>

            {/* Total Projects */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="font-medium text-black">Projects</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-black mb-1">
                {formatNumber(platformAnalytics.totalProjects)}
              </div>
              <div className="text-sm text-gray-500">
                {platformAnalytics.pendingProjects} pending approval
              </div>
            </Card>

            {/* AI Interactions */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MessageSquare className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="font-medium text-black">AI Interactions</span>
                </div>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-black mb-1">
                {formatNumber(platformAnalytics.aiInteractions)}
              </div>
              <div className="text-sm text-gray-500">
                +{platformAnalytics.aiInteractionsThisMonth} this month
              </div>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* User Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-black mb-4">User Distribution</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Students</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${(platformAnalytics.userDistribution.students / platformAnalytics.totalUsers) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platformAnalytics.userDistribution.students}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Supervisors</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(platformAnalytics.userDistribution.supervisors / platformAnalytics.totalUsers) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platformAnalytics.userDistribution.supervisors}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Admins</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{
                          width: `${(platformAnalytics.userDistribution.admins / platformAnalytics.totalUsers) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platformAnalytics.userDistribution.admins}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Project Difficulty</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Beginner</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(platformAnalytics.projectDistribution.beginner / platformAnalytics.totalProjects) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platformAnalytics.projectDistribution.beginner}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Intermediate</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{
                          width: `${(platformAnalytics.projectDistribution.intermediate / platformAnalytics.totalProjects) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platformAnalytics.projectDistribution.intermediate}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Advanced</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${(platformAnalytics.projectDistribution.advanced / platformAnalytics.totalProjects) * 100}%`
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {platformAnalytics.projectDistribution.advanced}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Engagement Metrics */}
          {platformAnalytics.engagementData && platformAnalytics.engagementData.length > 0 && (
            <Card className="mb-8">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black">Engagement Metrics</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {platformAnalytics.engagementData.map((metric, index) => (
                    <div key={index} className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        {getTrendIcon(metric.trend)}
                        <span className={`ml-2 text-2xl font-bold ${getTrendColor(metric.trend)}`}>
                          {formatNumber(metric.value)}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 mb-1">
                        {metric.metric}
                      </div>
                      <div className={`text-xs ${getTrendColor(metric.trend)}`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}% from last period
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Top Specializations */}
          {platformAnalytics.topSpecializations && platformAnalytics.topSpecializations.length > 0 && (
            <Card>
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black">Top Specializations</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {platformAnalytics.topSpecializations.slice(0, 5).map((spec, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-black">{spec.name}</div>
                        <div className="text-sm text-gray-500">
                          {spec.userCount} users, {spec.projectCount} projects
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${(spec.userCount / platformAnalytics.totalUsers) * 100}%`
                            }}
                          />
                        </div>
                        <Badge variant="outline">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
          <p className="text-gray-500 mb-4">Unable to retrieve platform analytics.</p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Card>
      )}
    </div>
  );
}