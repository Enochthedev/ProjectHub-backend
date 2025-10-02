'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Calendar
} from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { DashboardWidget as WidgetType, DashboardMetrics } from './types';

interface SupervisorDashboardWidgetsProps {
  metrics: DashboardMetrics;
  recentApplications: any[];
  studentProgress: any[];
  projectStatistics: any;
  aiInteractions: any[];
  isEditing?: boolean;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetResize?: (widgetId: string, size: WidgetType['size']) => void;
}

const SupervisorDashboardWidgets: React.FC<SupervisorDashboardWidgetsProps> = ({
  metrics,
  recentApplications,
  studentProgress,
  projectStatistics,
  aiInteractions,
  isEditing = false,
  onWidgetUpdate,
  onWidgetRemove,
  onWidgetResize
}) => {
  const widgets: WidgetType[] = [
    {
      id: 'supervisor-metrics',
      title: 'Overview Metrics',
      type: 'metric',
      size: 'full',
      position: { x: 0, y: 0, w: 4, h: 1 },
      isVisible: true,
      isCustomizable: false,
      permissions: ['supervisor']
    },
    {
      id: 'recent-applications',
      title: 'Recent Applications',
      type: 'list',
      size: 'medium',
      position: { x: 0, y: 1, w: 2, h: 2 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['supervisor']
    },
    {
      id: 'student-progress',
      title: 'Student Progress',
      type: 'progress',
      size: 'medium',
      position: { x: 2, y: 1, w: 2, h: 2 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['supervisor']
    },
    {
      id: 'project-statistics',
      title: 'Project Statistics',
      type: 'chart',
      size: 'medium',
      position: { x: 0, y: 3, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['supervisor']
    },
    {
      id: 'ai-monitoring',
      title: 'AI Interactions',
      type: 'activity',
      size: 'medium',
      position: { x: 2, y: 3, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['supervisor']
    }
  ];

  const renderSupervisorMetricsWidget = () => (
    <DashboardWidget
      widget={widgets[0]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="grid grid-cols-4 gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-3">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.totalProjects || 0}</p>
          <p className="text-sm text-gray-600">Total Projects</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mx-auto mb-3">
            <Users className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.activeStudents || 0}</p>
          <p className="text-sm text-gray-600">Active Students</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg mx-auto mb-3">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.pendingApplications || 0}</p>
          <p className="text-sm text-gray-600">Pending Applications</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-3">
            <CheckCircle className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.completedProjects || 0}</p>
          <p className="text-sm text-gray-600">Completed Projects</p>
        </div>
      </div>
    </DashboardWidget>
  );

  const renderRecentApplicationsWidget = () => (
    <DashboardWidget
      widget={widgets[1]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        {recentApplications.length > 0 ? (
          recentApplications.slice(0, 5).map((application) => (
            <div key={application.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-black">{application.studentName}</p>
                  <p className="text-xs text-gray-600">Applied to "{application.projectTitle}"</p>
                  <p className="text-xs text-gray-500">
                    {new Date(application.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  application.status === 'approved' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {application.status}
                </span>
                <Button size="sm" variant="secondary">
                  Review
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No recent applications</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  const renderStudentProgressWidget = () => (
    <DashboardWidget
      widget={widgets[2]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        {studentProgress.length > 0 ? (
          studentProgress.slice(0, 5).map((student) => (
            <div key={student.studentId} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-black">{student.studentName}</p>
                  <p className="text-xs text-gray-600">{student.projectTitle}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {student.progressPercentage}%
                </span>
              </div>
              <Progress value={student.progressPercentage} className="mb-2" />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Last activity: {new Date(student.lastActivity).toLocaleDateString()}
                </p>
                <div className="flex space-x-1">
                  <Button size="sm" variant="ghost">
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Calendar className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No student progress data</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  const renderProjectStatisticsWidget = () => (
    <DashboardWidget
      widget={widgets[3]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-black">{projectStatistics?.totalProjects || 0}</p>
            <p className="text-xs text-gray-600">Total Projects</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-black">{projectStatistics?.activeApplications || 0}</p>
            <p className="text-xs text-gray-600">Active Applications</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Completion Rate</span>
            <span className="font-medium text-black">
              {projectStatistics?.totalProjects > 0 
                ? Math.round((projectStatistics.completedProjects / projectStatistics.totalProjects) * 100)
                : 0}%
            </span>
          </div>
          <Progress 
            value={projectStatistics?.totalProjects > 0 
              ? (projectStatistics.completedProjects / projectStatistics.totalProjects) * 100
              : 0} 
          />
        </div>
        
        <div className="pt-2 border-t border-gray-200">
          <Button size="sm" fullWidth variant="secondary">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Detailed Analytics
          </Button>
        </div>
      </div>
    </DashboardWidget>
  );

  const renderAIMonitoringWidget = () => (
    <DashboardWidget
      widget={widgets[4]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        {aiInteractions.length > 0 ? (
          aiInteractions.slice(0, 4).map((interaction) => (
            <div key={interaction.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
              <div className="flex-shrink-0 mt-1">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-black">{interaction.studentName}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    interaction.requiresReview ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {interaction.requiresReview ? 'Review' : 'Normal'}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{interaction.topic}</p>
                <p className="text-xs text-gray-500">
                  {new Date(interaction.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No AI interactions to monitor</p>
          </div>
        )}
        
        <div className="pt-2 border-t border-gray-200">
          <Button size="sm" fullWidth variant="secondary">
            View All AI Interactions
          </Button>
        </div>
      </div>
    </DashboardWidget>
  );

  return (
    <div className="grid grid-cols-4 gap-6 auto-rows-min">
      {renderSupervisorMetricsWidget()}
      {renderRecentApplicationsWidget()}
      {renderStudentProgressWidget()}
      {renderProjectStatisticsWidget()}
      {renderAIMonitoringWidget()}
    </div>
  );
};

export default SupervisorDashboardWidgets;