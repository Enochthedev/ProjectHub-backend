'use client';

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Calendar, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  BookOpen,
  Target,
  RefreshCw
} from 'lucide-react';
import { useMilestoneStore, useUpcomingMilestones } from '@/stores/milestone';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import MilestoneList from './MilestoneList';
import MilestoneForm from './MilestoneForm';
import MilestoneTemplateSelector from './MilestoneTemplateSelector';

interface MilestonesDashboardProps {
  projectId?: string;
}

export const MilestonesDashboard: React.FC<MilestonesDashboardProps> = ({ projectId }) => {
  const [showForm, setShowForm] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  const {
    milestoneStats,
    getMilestones,
    isLoading,
  } = useMilestoneStore();

  const upcomingMilestones = useUpcomingMilestones(7);

  useEffect(() => {
    getMilestones({ projectId });
  }, [getMilestones, projectId]);

  const handleTemplateSelected = () => {
    setShowTemplateSelector(false);
    // Refresh milestones after template is used
    getMilestones({ projectId });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-gray-900" />;
      case 'in_progress':
        return <Play className="w-5 h-5 text-gray-700" />;
      case 'overdue':
        return <AlertCircle className="w-5 h-5 text-gray-800" />;
      case 'blocked':
        return <Pause className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0) return `In ${diffDays} days`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Milestones</h1>
          <p className="text-gray-600 mt-1">
            Track your project progress and manage deadlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => getMilestones({ projectId })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowTemplateSelector(true)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Use Template
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Milestone
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {milestoneStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Milestones</p>
                <p className="text-2xl font-bold text-gray-900">{milestoneStats.total}</p>
              </div>
              <Target className="w-8 h-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{milestoneStats.completed}</p>
                <p className="text-xs text-gray-500">
                  {milestoneStats.total > 0 ? Math.round((milestoneStats.completed / milestoneStats.total) * 100) : 0}% completion rate
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-900" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{milestoneStats.inProgress}</p>
              </div>
              <Play className="w-8 h-8 text-gray-700" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{milestoneStats.overdue}</p>
                {milestoneStats.blocked > 0 && (
                  <p className="text-xs text-gray-500">{milestoneStats.blocked} blocked</p>
                )}
              </div>
              <AlertCircle className="w-8 h-8 text-gray-800" />
            </div>
          </Card>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Upcoming Deadlines
            </h2>
            <Badge variant="outline" className="bg-gray-100">
              Next 7 days
            </Badge>
          </div>
          
          <div className="space-y-3">
            {upcomingMilestones.slice(0, 5).map((milestone) => (
              <div key={milestone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div className="flex items-center gap-3">
                  {getStatusIcon(milestone.status)}
                  <div>
                    <h3 className="font-medium text-gray-900">{milestone.title}</h3>
                    <p className="text-sm text-gray-600">{milestone.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(milestone.dueDate)}
                    </p>
                    <p className="text-xs text-gray-600">{milestone.progress}% complete</p>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${milestone.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            {upcomingMilestones.length > 5 && (
              <p className="text-sm text-gray-600 text-center pt-2">
                And {upcomingMilestones.length - 5} more upcoming milestones
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Progress Overview */}
      {milestoneStats && milestoneStats.total > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progress Overview
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Overall Progress</span>
                <span className="font-medium">{Math.round(milestoneStats.completionRate)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gray-900 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${milestoneStats.completionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-500">{milestoneStats.total - milestoneStats.completed}</div>
                <div className="text-xs text-gray-600">Not Started</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-700">{milestoneStats.inProgress}</div>
                <div className="text-xs text-gray-600">In Progress</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{milestoneStats.completed}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{milestoneStats.overdue}</div>
                <div className="text-xs text-gray-600">Overdue</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Milestone List */}
      <MilestoneList projectId={projectId} hideHeader />

      {/* Modals */}
      <MilestoneForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        projectId={projectId}
      />

      <MilestoneTemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelectTemplate={handleTemplateSelected}
        projectId={projectId}
      />
    </div>
  );
};

export default MilestonesDashboard;