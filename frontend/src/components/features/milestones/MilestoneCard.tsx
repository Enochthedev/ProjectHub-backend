'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Tag, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  Pause,
  MoreHorizontal,
  Edit,
  Trash2,
  Flag
} from 'lucide-react';
import { Milestone, ProgressUpdate } from '@/types/milestone';
import { useMilestoneStore } from '@/stores/milestone';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';

interface MilestoneCardProps {
  milestone: Milestone;
  onEdit?: (milestone: Milestone) => void;
  onDelete?: (milestoneId: string) => void;
  onViewDetails?: (milestone: Milestone) => void;
  compact?: boolean;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onEdit,
  onDelete,
  onViewDetails,
  compact = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  
  const { updateProgress, isUpdating } = useMilestoneStore();

  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-gray-900 text-white border-gray-900';
      case 'in_progress':
        return 'bg-gray-700 text-white border-gray-700';
      case 'overdue':
        return 'bg-gray-800 text-white border-gray-800';
      case 'blocked':
        return 'bg-gray-600 text-white border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityColor = (priority: Milestone['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-gray-900 text-white border-gray-900';
      case 'high':
        return 'bg-gray-700 text-white border-gray-700';
      case 'medium':
        return 'bg-gray-400 text-white border-gray-400';
      default:
        return 'bg-gray-200 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4" />;
      case 'blocked':
        return <Pause className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;

    return date.toLocaleDateString();
  };

  const isOverdue = () => {
    return milestone.status !== 'completed' && new Date(milestone.dueDate) < new Date();
  };

  const handleStatusChange = async (newStatus: Milestone['status']) => {
    setIsUpdatingProgress(true);
    try {
      const update: ProgressUpdate = {
        status: newStatus,
        progress: newStatus === 'completed' ? 100 : milestone.progress,
      };
      await updateProgress(milestone.id, update);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handleProgressChange = async (newProgress: number) => {
    setIsUpdatingProgress(true);
    try {
      const update: ProgressUpdate = {
        progress: newProgress,
        status: newProgress === 100 ? 'completed' : 
                newProgress > 0 ? 'in_progress' : 'not_started',
      };
      await updateProgress(milestone.id, update);
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  if (compact) {
    return (
      <Card className="p-3 hover:border-gray-400 transition-colors cursor-pointer" onClick={() => onViewDetails?.(milestone)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getStatusIcon(milestone.status)}
            <span className="font-medium text-gray-900 truncate">{milestone.title}</span>
            <Badge variant="outline" className={getPriorityColor(milestone.priority)}>
              {milestone.priority}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(milestone.dueDate)}</span>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{milestone.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-gray-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${milestone.progress}%` }}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:border-gray-400 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 mt-1">
            {getStatusIcon(milestone.status)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{milestone.title}</h3>
            <p className="text-gray-700 text-sm leading-relaxed">{milestone.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Badge variant="outline" className={getStatusColor(milestone.status)}>
            {milestone.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className={getPriorityColor(milestone.priority)}>
            <Flag className="w-3 h-3 mr-1" />
            {milestone.priority}
          </Badge>
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActions(!showActions)}
              className="p-1"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
            
            {showActions && (
              <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded shadow-lg py-1 z-10 min-w-[120px]">
                <button
                  onClick={() => {
                    onEdit?.(milestone);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDelete?.(milestone.id);
                    setShowActions(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span className="font-medium">{milestone.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const newProgress = Math.round((x / width) * 100);
          handleProgressChange(Math.max(0, Math.min(100, newProgress)));
        }}>
          <div 
            className="bg-gray-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${milestone.progress}%` }}
          />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>Due: {formatDate(milestone.dueDate)}</span>
          {isOverdue() && (
            <Badge variant="outline" className="bg-gray-800 text-white border-gray-800 text-xs">
              Overdue
            </Badge>
          )}
        </div>
        
        {milestone.estimatedHours && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>
              {milestone.actualHours ? 
                `${milestone.actualHours}/${milestone.estimatedHours}h` : 
                `${milestone.estimatedHours}h estimated`
              }
            </span>
          </div>
        )}
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>{milestone.category}</span>
        </div>
        
        {milestone.tags.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Tag className="w-4 h-4" />
            <div className="flex flex-wrap gap-1">
              {milestone.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {milestone.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{milestone.tags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          {milestone.status !== 'completed' && (
            <>
              {milestone.status === 'not_started' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange('in_progress')}
                  disabled={isUpdatingProgress || isUpdating}
                  className="text-sm"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
              
              {milestone.status === 'in_progress' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  disabled={isUpdatingProgress || isUpdating}
                  className="text-sm"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Complete
                </Button>
              )}
              
              {milestone.status !== 'blocked' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusChange('blocked')}
                  disabled={isUpdatingProgress || isUpdating}
                  className="text-sm text-gray-600"
                >
                  <Pause className="w-3 h-3 mr-1" />
                  Block
                </Button>
              )}
            </>
          )}
          
          {milestone.status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange('in_progress')}
              disabled={isUpdatingProgress || isUpdating}
              className="text-sm text-gray-600"
            >
              Reopen
            </Button>
          )}
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onViewDetails?.(milestone)}
        >
          View Details
        </Button>
      </div>
    </Card>
  );
};

export default MilestoneCard;