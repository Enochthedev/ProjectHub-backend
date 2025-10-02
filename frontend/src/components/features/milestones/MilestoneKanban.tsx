'use client';

import React from 'react';
import { 
  Clock, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Pause,
  Plus
} from 'lucide-react';
import { Milestone } from '@/types/milestone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import MilestoneCard from './MilestoneCard';

interface MilestoneKanbanProps {
  milestonesByStatus: {
    notStarted: Milestone[];
    inProgress: Milestone[];
    completed: Milestone[];
    overdue: Milestone[];
    blocked: Milestone[];
  };
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestoneId: string) => void;
}

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  count: number;
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  onDelete: (milestoneId: string) => void;
  color: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  icon,
  count,
  milestones,
  onEdit,
  onDelete,
  color,
}) => {
  return (
    <div className="flex-1 min-w-[300px]">
      <div className={`p-3 rounded-t border-b-2 ${color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          <Badge variant="outline" className="bg-white">
            {count}
          </Badge>
        </div>
      </div>
      
      <div className="bg-gray-50 min-h-[400px] p-3 space-y-3 rounded-b">
        {milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.id}
            milestone={milestone}
            onEdit={onEdit}
            onDelete={onDelete}
            compact
          />
        ))}
        
        {milestones.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No milestones</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const MilestoneKanban: React.FC<MilestoneKanbanProps> = ({
  milestonesByStatus,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      title: 'Not Started',
      icon: <Clock className="w-4 h-4 text-gray-600" />,
      milestones: milestonesByStatus.notStarted,
      color: 'border-gray-300',
    },
    {
      title: 'In Progress',
      icon: <Play className="w-4 h-4 text-gray-700" />,
      milestones: milestonesByStatus.inProgress,
      color: 'border-gray-700',
    },
    {
      title: 'Completed',
      icon: <CheckCircle className="w-4 h-4 text-gray-900" />,
      milestones: milestonesByStatus.completed,
      color: 'border-gray-900',
    },
    {
      title: 'Overdue',
      icon: <AlertCircle className="w-4 h-4 text-gray-800" />,
      milestones: milestonesByStatus.overdue,
      color: 'border-gray-800',
    },
    {
      title: 'Blocked',
      icon: <Pause className="w-4 h-4 text-gray-600" />,
      milestones: milestonesByStatus.blocked,
      color: 'border-gray-600',
    },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.title}
            title={column.title}
            icon={column.icon}
            count={column.milestones.length}
            milestones={column.milestones}
            onEdit={onEdit}
            onDelete={onDelete}
            color={column.color}
          />
        ))}
      </div>
    </div>
  );
};

export default MilestoneKanban;