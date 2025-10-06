'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import { 
  BookOpen, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Target,
  Clock,
  CheckCircle
} from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { DashboardWidget as WidgetType, DashboardMetrics } from './types';

interface StudentDashboardWidgetsProps {
  metrics: DashboardMetrics;
  recentActivity: any[];
  upcomingMilestones: any[];
  aiConversations: any[];
  trendingProjects: any[];
  currentProject: any;
  isEditing?: boolean;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetResize?: (widgetId: string, size: WidgetType['size']) => void;
}

const StudentDashboardWidgets: React.FC<StudentDashboardWidgetsProps> = ({
  metrics,
  recentActivity,
  upcomingMilestones,
  aiConversations,
  trendingProjects,
  currentProject,
  isEditing = false,
  onWidgetUpdate,
  onWidgetRemove,
  onWidgetResize
}) => {
  const router = useRouter();
  const widgets: WidgetType[] = [
    {
      id: 'current-project',
      title: 'Current Project',
      type: 'progress',
      size: 'large',
      position: { x: 0, y: 0, w: 2, h: 2 },
      isVisible: true,
      isCustomizable: false,
      permissions: ['student']
    },
    {
      id: 'project-metrics',
      title: 'Project Metrics',
      type: 'metric',
      size: 'medium',
      position: { x: 2, y: 0, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['student']
    },
    {
      id: 'upcoming-milestones',
      title: 'Upcoming Milestones',
      type: 'list',
      size: 'medium',
      position: { x: 0, y: 2, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['student']
    },
    {
      id: 'recent-activity',
      title: 'Recent Activity',
      type: 'activity',
      size: 'medium',
      position: { x: 2, y: 2, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['student']
    },
    {
      id: 'ai-conversations',
      title: 'AI Assistant',
      type: 'list',
      size: 'medium',
      position: { x: 0, y: 3, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['student']
    },
    {
      id: 'trending-projects',
      title: 'Trending Projects',
      type: 'list',
      size: 'medium',
      position: { x: 2, y: 3, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['student']
    }
  ];

  const renderCurrentProjectWidget = () => (
    <DashboardWidget
      widget={widgets[0]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      {currentProject ? (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-black mb-2">{currentProject.title}</h4>
            <p className="text-sm text-gray-600 mb-4">{currentProject.description}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Progress</p>
              <Progress value={currentProject.progress?.percentage || 0} className="mb-2" />
              <p className="text-xs text-gray-500">{currentProject.progress?.percentage || 0}% Complete</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Next Milestone</p>
              <p className="text-sm font-medium text-black">{currentProject.progress?.nextMilestone?.title}</p>
              <p className="text-xs text-gray-500">Due in {currentProject.progress?.nextMilestone?.daysRemaining} days</p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Button size="sm" onClick={() => router.push('/current-project')}>
              <BookOpen className="w-4 h-4 mr-2" />
              Continue Work
            </Button>
            <Button size="sm" variant="secondary" onClick={() => router.push('/ai-assistant')}>
              Ask AI Assistant
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-black mb-2">No Current Project</h4>
          <p className="text-sm text-gray-600 mb-4">You haven't been assigned to a project yet.</p>
          <Button size="sm" onClick={() => router.push('/projects')}>Browse Projects</Button>
        </div>
      )}
    </DashboardWidget>
  );

  const renderProjectMetricsWidget = () => (
    <DashboardWidget
      widget={widgets[1]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2">
            <Target className="w-6 h-6 text-black" />
          </div>
          <p className="text-2xl font-bold text-black">{metrics.milestonesCompleted || 0}</p>
          <p className="text-xs text-gray-600">Milestones</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2">
            <MessageSquare className="w-6 h-6 text-black" />
          </div>
          <p className="text-2xl font-bold text-black">{metrics.aiInteractions || 0}</p>
          <p className="text-xs text-gray-600">AI Chats</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2">
            <Heart className="w-6 h-6 text-black" />
          </div>
          <p className="text-2xl font-bold text-black">{metrics.bookmarksCount || 0}</p>
          <p className="text-xs text-gray-600">Bookmarks</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2">
            <TrendingUp className="w-6 h-6 text-black" />
          </div>
          <p className="text-2xl font-bold text-black">{metrics.projectProgress || 0}%</p>
          <p className="text-xs text-gray-600">Progress</p>
        </div>
      </div>
    </DashboardWidget>
  );

  const renderUpcomingMilestonesWidget = () => (
    <DashboardWidget
      widget={widgets[2]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-3">
        {upcomingMilestones.length > 0 ? (
          upcomingMilestones.slice(0, 4).map((milestone) => (
            <div key={milestone.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-black">{milestone.title}</p>
                  <p className="text-xs text-gray-500">
                    Due: {new Date(milestone.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                {milestone.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No upcoming milestones</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  const renderRecentActivityWidget = () => (
    <DashboardWidget
      widget={widgets[3]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-3">
        {recentActivity.length > 0 ? (
          recentActivity.slice(0, 4).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 py-2">
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'milestone' && <Target className="w-4 h-4 text-green-600" />}
                {activity.type === 'ai_chat' && <MessageSquare className="w-4 h-4 text-blue-600" />}
                {activity.type === 'bookmark' && <Heart className="w-4 h-4 text-red-600" />}
                {activity.type === 'view' && <BookOpen className="w-4 h-4 text-gray-600" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-black">{activity.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  const renderAIConversationsWidget = () => (
    <DashboardWidget
      widget={widgets[4]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-3">
        {aiConversations.length > 0 ? (
          aiConversations.slice(0, 3).map((conversation) => (
            <div key={conversation.id} className="py-2 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-black">{conversation.title}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {conversation.lastMessage}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(conversation.timestamp).toLocaleDateString()}
                  </p>
                </div>
                {conversation.projectRelated && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
                    Project
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No AI conversations yet</p>
            <Button size="sm" className="mt-2">Start AI Chat</Button>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  const renderTrendingProjectsWidget = () => (
    <DashboardWidget
      widget={widgets[5]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-3">
        {trendingProjects.length > 0 ? (
          trendingProjects.slice(0, 4).map((project) => (
            <div key={project.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div>
                <p className="text-sm font-medium text-black">{project.title}</p>
                <p className="text-xs text-gray-500">
                  {project.specialization} • {project.difficultyLevel}
                </p>
              </div>
              <Heart 
                className={`w-4 h-4 cursor-pointer transition-colors ${
                  project.isBookmarked 
                    ? 'text-black fill-current' 
                    : 'text-gray-400 hover:text-black'
                }`}
              />
            </div>
          ))
        ) : (
          <div className="text-center py-4">
            <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No trending projects</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  return (
    <div className="grid grid-cols-4 gap-6 auto-rows-min">
      {renderCurrentProjectWidget()}
      {renderProjectMetricsWidget()}
      {renderUpcomingMilestonesWidget()}
      {renderRecentActivityWidget()}
      {renderAIConversationsWidget()}
      {renderTrendingProjectsWidget()}
    </div>
  );
};

export default StudentDashboardWidgets;