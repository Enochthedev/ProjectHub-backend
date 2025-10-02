'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { 
    TrendingUp, 
    Calendar, 
    Clock, 
    Target,
    AlertTriangle,
    CheckCircle,
    BarChart3,
    Activity,
    Plus,
    Edit
} from 'lucide-react';

interface ProjectProgressVisualizationProps {
    projectId: string;
    className?: string;
}

export const ProjectProgressVisualization: React.FC<ProjectProgressVisualizationProps> = ({
    projectId,
    className
}) => {
    const {
        progressVisualization,
        getProgressVisualization,
        updateWeeklyProgress
    } = useProjectStore();

    const [selectedView, setSelectedView] = useState<'overview' | 'timeline' | 'milestones' | 'time'>('overview');
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [weeklyHours, setWeeklyHours] = useState('');
    const [weeklyNotes, setWeeklyNotes] = useState('');

    useEffect(() => {
        getProgressVisualization(projectId);
    }, [projectId, getProgressVisualization]);

    const handleUpdateWeeklyProgress = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const currentWeek = getCurrentWeek();
        const hours = parseFloat(weeklyHours);
        
        if (isNaN(hours) || hours < 0) return;

        try {
            await updateWeeklyProgress(projectId, currentWeek, hours, weeklyNotes);
            setIsUpdateModalOpen(false);
            setWeeklyHours('');
            setWeeklyNotes('');
            // Refresh data
            getProgressVisualization(projectId);
        } catch (error) {
            console.error('Failed to update weekly progress:', error);
        }
    };

    const getCurrentWeek = () => {
        const now = new Date();
        const year = now.getFullYear();
        const week = getWeekNumber(now);
        return `${year}-W${week.toString().padStart(2, '0')}`;
    };

    const getWeekNumber = (date: Date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    };

    if (!progressVisualization) {
        return (
            <Card className={`p-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="grid grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    const data = progressVisualization;

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <BarChart3 className="w-6 h-6" />
                    Project Progress
                </h2>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsUpdateModalOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Log Hours
                </Button>
            </div>

            {/* View Selector */}
            <div className="flex gap-2 mb-6">
                {[
                    { key: 'overview', label: 'Overview', icon: TrendingUp },
                    { key: 'timeline', label: 'Timeline', icon: Calendar },
                    { key: 'milestones', label: 'Milestones', icon: Target },
                    { key: 'time', label: 'Time Tracking', icon: Clock }
                ].map(({ key, label, icon: Icon }) => (
                    <Button
                        key={key}
                        variant={selectedView === key ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setSelectedView(key as any)}
                        className="flex items-center gap-2"
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </Button>
                ))}
            </div>

            {/* Overview View */}
            {selectedView === 'overview' && (
                <div className="space-y-6">
                    {/* Progress Summary */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Progress Summary</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Overall Progress */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Overall Progress</span>
                                    <span className="text-sm text-gray-600">{data.overallProgress}%</span>
                                </div>
                                <Progress value={data.overallProgress} className="h-3" />
                            </div>

                            {/* Milestone Progress */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Milestones</span>
                                    <span className="text-sm text-gray-600">
                                        {data.milestoneProgress.completed}/{data.milestoneProgress.total}
                                    </span>
                                </div>
                                <Progress value={data.milestoneProgress.percentage} className="h-3" />
                            </div>

                            {/* Time Efficiency */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Efficiency</span>
                                    <span className="text-sm text-gray-600">
                                        {Math.round(data.timeMetrics.efficiency * 100)}%
                                    </span>
                                </div>
                                <Progress value={data.timeMetrics.efficiency * 100} className="h-3" />
                            </div>
                        </div>
                    </Card>

                    {/* Performance Indicators */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Performance Indicators</h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className={`text-2xl font-bold ${
                                    data.performanceIndicators.onTrack ? 'text-green-600' : 'text-red-600'
                                }`}>
                                    {data.performanceIndicators.onTrack ? '✓' : '⚠'}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">On Track</div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className={`text-2xl font-bold ${
                                    data.performanceIndicators.riskLevel === 'low' ? 'text-green-600' :
                                    data.performanceIndicators.riskLevel === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                    {data.performanceIndicators.riskLevel.toUpperCase()}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Risk Level</div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-blue-600">
                                    {data.performanceIndicators.delayDays}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Days Delay</div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-purple-600">
                                    {data.performanceIndicators.qualityScore}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Quality Score</div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Timeline View */}
            {selectedView === 'timeline' && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Project Timeline</h3>
                    
                    <div className="space-y-4">
                        {data.timeline.map((event, index) => {
                            const isLatest = index === 0;
                            const eventTypeColors = {
                                milestone: 'bg-green-100 text-green-800',
                                status_change: 'bg-blue-100 text-blue-800',
                                communication: 'bg-purple-100 text-purple-800',
                                deadline: 'bg-red-100 text-red-800'
                            };

                            return (
                                <div key={index} className="flex gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isLatest ? 'bg-green-100' : 'bg-gray-100'
                                    }`}>
                                        {event.type === 'milestone' && <Target className="w-5 h-5 text-green-600" />}
                                        {event.type === 'status_change' && <Activity className="w-5 h-5 text-blue-600" />}
                                        {event.type === 'communication' && <Calendar className="w-5 h-5 text-purple-600" />}
                                        {event.type === 'deadline' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium">{event.event}</h4>
                                            <Badge className={eventTypeColors[event.type]}>
                                                {event.type.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span>{new Date(event.date).toLocaleDateString()}</span>
                                            <span>Progress: {event.progress}%</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Milestones View */}
            {selectedView === 'milestones' && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Milestone Breakdown</h3>
                    
                    <div className="space-y-4">
                        {data.milestoneBreakdown.map((milestone) => {
                            const statusColors = {
                                not_started: 'bg-gray-100 text-gray-800',
                                in_progress: 'bg-blue-100 text-blue-800',
                                completed: 'bg-green-100 text-green-800',
                                overdue: 'bg-red-100 text-red-800'
                            };

                            const isOverdue = milestone.status === 'overdue';
                            const isCompleted = milestone.status === 'completed';

                            return (
                                <div key={milestone.milestoneId} className="border rounded p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h4 className="font-medium mb-1">{milestone.title}</h4>
                                            <div className="flex items-center gap-2">
                                                <Badge className={statusColors[milestone.status]}>
                                                    {milestone.status.replace('_', ' ')}
                                                </Badge>
                                                {isOverdue && milestone.daysOverdue && (
                                                    <Badge className="bg-red-100 text-red-800">
                                                        {milestone.daysOverdue} days overdue
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-600">
                                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                                            </div>
                                            {isCompleted && milestone.completedDate && (
                                                <div className="text-sm text-green-600">
                                                    Completed: {new Date(milestone.completedDate).toLocaleDateString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-2">
                                        <Progress value={milestone.progress} className="flex-1 h-2" />
                                        <span className="text-sm text-gray-600">{milestone.progress}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Time Tracking View */}
            {selectedView === 'time' && (
                <div className="space-y-6">
                    {/* Time Summary */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Time Summary</h3>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-blue-600">
                                    {data.timeMetrics.totalHoursWorked}h
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Total Hours</div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-green-600">
                                    {data.timeMetrics.estimatedHours}h
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Estimated</div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-purple-600">
                                    {Math.round(data.timeMetrics.efficiency * 100)}%
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Efficiency</div>
                            </div>

                            <div className="text-center p-4 bg-gray-50 rounded">
                                <div className="text-2xl font-bold text-orange-600">
                                    {Math.round(data.timeMetrics.totalHoursWorked / data.timeMetrics.weeklyHours.length)}h
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Avg/Week</div>
                            </div>
                        </div>
                    </Card>

                    {/* Weekly Hours Chart */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Weekly Hours</h3>
                        
                        <div className="space-y-3">
                            {data.timeMetrics.weeklyHours.map((week) => (
                                <div key={week.week} className="flex items-center gap-4">
                                    <div className="w-16 text-sm text-gray-600">{week.week}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-500 h-2 rounded-full"
                                                    style={{ width: `${Math.min(100, (week.hours / 40) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm text-gray-600 w-12">{week.hours}h</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            {/* Weekly Progress Update Modal */}
            <Modal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                title="Log Weekly Hours"
                size="md"
            >
                <form onSubmit={handleUpdateWeeklyProgress} className="space-y-4">
                    <div>
                        <label htmlFor="hours" className="block text-sm font-medium mb-2">
                            Hours Worked This Week
                        </label>
                        <Input
                            id="hours"
                            type="number"
                            step="0.5"
                            min="0"
                            max="168"
                            value={weeklyHours}
                            onChange={(e) => setWeeklyHours(e.target.value)}
                            placeholder="Enter hours worked..."
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium mb-2">
                            Notes (Optional)
                        </label>
                        <Input
                            id="notes"
                            value={weeklyNotes}
                            onChange={(e) => setWeeklyNotes(e.target.value)}
                            placeholder="What did you work on this week?"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsUpdateModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={!weeklyHours}
                        >
                            Log Hours
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};