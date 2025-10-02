'use client';

import React, { useEffect } from 'react';
import { useProjectStore } from '@/stores/project';
import { useAuthStore } from '@/stores/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { 
    Clock, 
    Calendar, 
    AlertTriangle, 
    CheckCircle, 
    MessageSquare,
    TrendingUp,
    Users,
    ExternalLink
} from 'lucide-react';

interface CurrentProjectWidgetProps {
    className?: string;
}

export const CurrentProjectWidget: React.FC<CurrentProjectWidgetProps> = ({ className }) => {
    const { user } = useAuthStore();
    const {
        studentCurrentProject,
        supervisorCurrentProjects,
        isLoadingCurrentProject,
        currentProjectError,
        getStudentCurrentProject,
        getSupervisorCurrentProjects,
        clearCurrentProjectError
    } = useProjectStore();

    useEffect(() => {
        if (user?.role === 'student') {
            getStudentCurrentProject();
        } else if (user?.role === 'supervisor') {
            getSupervisorCurrentProjects();
        }
    }, [user?.role, getStudentCurrentProject, getSupervisorCurrentProjects]);

    if (isLoadingCurrentProject) {
        return (
            <Card className={`p-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4 w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                </div>
            </Card>
        );
    }

    if (currentProjectError) {
        return (
            <Card className={`p-6 border-red-200 ${className}`}>
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">Error Loading Project</h3>
                </div>
                <p className="text-red-600 mb-4">{currentProjectError}</p>
                <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={clearCurrentProjectError}
                >
                    Dismiss
                </Button>
            </Card>
        );
    }

    // Student view
    if (user?.role === 'student') {
        if (!studentCurrentProject) {
            return (
                <Card className={`p-6 ${className}`}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Current Project</h3>
                        <p className="text-gray-600 mb-4">
                            You don't have an assigned project yet. Browse available projects to get started.
                        </p>
                        <Button variant="primary" size="sm">
                            Browse Projects
                        </Button>
                    </div>
                </Card>
            );
        }

        const project = studentCurrentProject;
        const statusColors = {
            assigned: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-green-100 text-green-800',
            on_hold: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-gray-100 text-gray-800',
            cancelled: 'bg-red-100 text-red-800'
        };

        return (
            <Card className={`p-6 ${className}`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                            {project.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-3">
                            <Badge className={statusColors[project.projectStatus]}>
                                {project.projectStatus.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline">
                                {project.specialization}
                            </Badge>
                        </div>
                    </div>
                    {project.hasUnreadUpdates && (
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    )}
                </div>

                {/* Progress Section */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-gray-600">{project.overallProgress}%</span>
                    </div>
                    <Progress value={project.overallProgress} className="h-2" />
                </div>

                {/* Milestones Summary */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">
                            {project.completedMilestones}
                        </div>
                        <div className="text-xs text-gray-600">Completed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">
                            {project.totalMilestones - project.completedMilestones - project.overdueMilestones}
                        </div>
                        <div className="text-xs text-gray-600">In Progress</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-semibold text-red-600">
                            {project.overdueMilestones}
                        </div>
                        <div className="text-xs text-gray-600">Overdue</div>
                    </div>
                </div>

                {/* Upcoming Deadlines */}
                {project.upcomingDeadlines.length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Upcoming Deadlines
                        </h4>
                        <div className="space-y-2">
                            {project.upcomingDeadlines.slice(0, 2).map((deadline) => {
                                const daysUntil = Math.ceil(
                                    (new Date(deadline.dueDate).getTime() - new Date().getTime()) / 
                                    (1000 * 60 * 60 * 24)
                                );
                                
                                return (
                                    <div key={deadline.milestoneId} className="flex items-center justify-between text-sm">
                                        <span className="truncate flex-1">{deadline.title}</span>
                                        <span className={`ml-2 ${daysUntil <= 3 ? 'text-red-600' : 'text-gray-600'}`}>
                                            {daysUntil}d
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Last Communication */}
                {project.lastCommunication && (
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium">Last Update</span>
                        </div>
                        <p className="text-sm text-gray-600">{project.lastCommunication.summary}</p>
                        <p className="text-xs text-gray-500 mt-1">
                            {new Date(project.lastCommunication.timestamp).toLocaleDateString()}
                        </p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button variant="primary" size="sm" className="flex-1">
                        View Details
                    </Button>
                    {project.pendingApprovals > 0 && (
                        <Button variant="secondary" size="sm">
                            <Badge className="bg-red-100 text-red-800 mr-2">
                                {project.pendingApprovals}
                            </Badge>
                            Approvals
                        </Button>
                    )}
                </div>
            </Card>
        );
    }

    // Supervisor view
    if (user?.role === 'supervisor') {
        if (!supervisorCurrentProjects || supervisorCurrentProjects.length === 0) {
            return (
                <Card className={`p-6 ${className}`}>
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No Active Projects</h3>
                        <p className="text-gray-600 mb-4">
                            You don't have any students assigned to projects yet.
                        </p>
                        <Button variant="primary" size="sm">
                            Create Project
                        </Button>
                    </div>
                </Card>
            );
        }

        const totalProjects = supervisorCurrentProjects.length;
        const avgProgress = Math.round(
            supervisorCurrentProjects.reduce((sum, p) => sum + p.overallProgress, 0) / totalProjects
        );
        const totalOverdue = supervisorCurrentProjects.reduce((sum, p) => sum + p.overdueMilestones, 0);
        const unreadUpdates = supervisorCurrentProjects.filter(p => p.hasUnreadUpdates).length;

        return (
            <Card className={`p-6 ${className}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Current Projects</h3>
                    <Badge variant="outline">{totalProjects} Active</Badge>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-lg font-semibold text-blue-600">{avgProgress}%</div>
                        <div className="text-xs text-gray-600">Avg Progress</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                        <div className="text-lg font-semibold text-red-600">{totalOverdue}</div>
                        <div className="text-xs text-gray-600">Overdue Items</div>
                    </div>
                </div>

                {/* Project List */}
                <div className="space-y-3 mb-4">
                    {supervisorCurrentProjects.slice(0, 3).map((project) => (
                        <div key={project.id} className="flex items-center justify-between p-3 border rounded">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">
                                        {project.student.name}
                                    </span>
                                    {project.hasUnreadUpdates && (
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 truncate">{project.title}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Progress value={project.overallProgress} className="h-1 flex-1" />
                                    <span className="text-xs text-gray-500">{project.overallProgress}%</span>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm">
                                <ExternalLink className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Notifications */}
                {unreadUpdates > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                                {unreadUpdates} project{unreadUpdates > 1 ? 's' : ''} need{unreadUpdates === 1 ? 's' : ''} attention
                            </span>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button variant="primary" size="sm" className="flex-1">
                        View All Projects
                    </Button>
                    <Button variant="secondary" size="sm">
                        <TrendingUp className="w-4 h-4" />
                    </Button>
                </div>
            </Card>
        );
    }

    return null;
};