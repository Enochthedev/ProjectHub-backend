'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useProjectStore } from '@/stores/project';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { CurrentProjectWidget } from './CurrentProjectWidget';
import { ProjectStatusUpdate, StatusHistory } from './ProjectStatusUpdate';
import { ProjectCommunication } from './ProjectCommunication';
import { ProjectProgressVisualization } from './ProjectProgressVisualization';
import { DeadlineNotifications } from './DeadlineNotifications';
import { 
    FolderOpen, 
    MessageSquare, 
    BarChart3, 
    Bell,
    Settings,
    Calendar,
    Users,
    Clock,
    Target,
    TrendingUp
} from 'lucide-react';

interface CurrentProjectManagementProps {
    className?: string;
}

export const CurrentProjectManagement: React.FC<CurrentProjectManagementProps> = ({ className }) => {
    const { user } = useAuthStore();
    const { 
        studentCurrentProject, 
        supervisorCurrentProjects,
        isLoadingCurrentProject,
        refreshCurrentProjectData 
    } = useProjectStore();

    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        // Refresh data when component mounts
        refreshCurrentProjectData();
    }, [refreshCurrentProjectData]);

    // Auto-refresh data every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            refreshCurrentProjectData();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [refreshCurrentProjectData]);

    if (isLoadingCurrentProject) {
        return (
            <div className={`space-y-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded mb-4"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 h-64 bg-gray-200 rounded"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Student View
    if (user?.role === 'student') {
        if (!studentCurrentProject) {
            return (
                <div className={`${className}`}>
                    <NoCurrentProjectView role="student" />
                </div>
            );
        }

        const project = studentCurrentProject;

        return (
            <div className={`space-y-6 ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Current Project</h1>
                        <p className="text-gray-600">Manage your project progress and communication</p>
                    </div>
                    <div className="flex gap-2">
                        <ProjectStatusUpdate 
                            projectId={project.id}
                            currentStatus={project.projectStatus}
                        />
                        <Button variant="secondary" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                    </div>
                </div>

                {/* Project Overview Card */}
                <CurrentProjectWidget className="mb-6" />

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="progress" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Progress
                        </TabsTrigger>
                        <TabsTrigger value="communication" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Messages
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Notifications
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Project Details */}
                            <div className="lg:col-span-2">
                                <ProjectDetailsCard project={project} />
                            </div>
                            
                            {/* Quick Stats */}
                            <div className="space-y-4">
                                <QuickStatsCard project={project} />
                                <UpcomingDeadlinesCard project={project} />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="progress">
                        <ProjectProgressVisualization projectId={project.id} />
                    </TabsContent>

                    <TabsContent value="communication">
                        <ProjectCommunication
                            projectId={project.id}
                            recipientId={project.supervisor.id}
                            recipientType="supervisor"
                        />
                    </TabsContent>

                    <TabsContent value="notifications">
                        <DeadlineNotifications />
                    </TabsContent>

                    <TabsContent value="history">
                        <StatusHistory projectId={project.id} />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // Supervisor View
    if (user?.role === 'supervisor') {
        if (!supervisorCurrentProjects || supervisorCurrentProjects.length === 0) {
            return (
                <div className={`${className}`}>
                    <NoCurrentProjectView role="supervisor" />
                </div>
            );
        }

        return (
            <div className={`space-y-6 ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Current Projects</h1>
                        <p className="text-gray-600">Monitor and manage your students' projects</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="primary" size="sm">
                            <Users className="w-4 h-4 mr-2" />
                            Assign Project
                        </Button>
                        <Button variant="secondary" size="sm">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Analytics
                        </Button>
                    </div>
                </div>

                {/* Projects Overview */}
                <SupervisorProjectsOverview projects={supervisorCurrentProjects} />

                {/* Detailed Project Management */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="progress" className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Progress
                        </TabsTrigger>
                        <TabsTrigger value="communication" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Messages
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Notifications
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <SupervisorProjectsList projects={supervisorCurrentProjects} />
                    </TabsContent>

                    <TabsContent value="progress">
                        <SupervisorProgressOverview projects={supervisorCurrentProjects} />
                    </TabsContent>

                    <TabsContent value="communication">
                        <SupervisorCommunicationHub projects={supervisorCurrentProjects} />
                    </TabsContent>

                    <TabsContent value="notifications">
                        <DeadlineNotifications />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    return null;
};

// Helper Components

const NoCurrentProjectView: React.FC<{ role: 'student' | 'supervisor' }> = ({ role }) => (
    <Card className="p-12 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-semibold mb-3">
            {role === 'student' ? 'No Current Project' : 'No Active Projects'}
        </h2>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {role === 'student' 
                ? 'You don\'t have an assigned project yet. Browse available projects or contact your supervisor to get started.'
                : 'You don\'t have any students assigned to projects yet. Create a new project or wait for student applications.'
            }
        </p>
        <div className="flex gap-3 justify-center">
            <Button variant="primary">
                {role === 'student' ? 'Browse Projects' : 'Create Project'}
            </Button>
            <Button variant="secondary">
                {role === 'student' ? 'Contact Supervisor' : 'View Applications'}
            </Button>
        </div>
    </Card>
);

const ProjectDetailsCard: React.FC<{ project: any }> = ({ project }) => (
    <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Project Details</h3>
        <div className="space-y-4">
            <div>
                <h4 className="font-medium mb-2">{project.title}</h4>
                <p className="text-sm text-gray-600">{project.abstract}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-sm font-medium">Supervisor:</span>
                    <p className="text-sm text-gray-600">{project.supervisor.name}</p>
                </div>
                <div>
                    <span className="text-sm font-medium">Specialization:</span>
                    <p className="text-sm text-gray-600">{project.specialization}</p>
                </div>
                <div>
                    <span className="text-sm font-medium">Start Date:</span>
                    <p className="text-sm text-gray-600">
                        {new Date(project.startDate).toLocaleDateString()}
                    </p>
                </div>
                <div>
                    <span className="text-sm font-medium">Expected End:</span>
                    <p className="text-sm text-gray-600">
                        {new Date(project.expectedEndDate).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div>
                <span className="text-sm font-medium mb-2 block">Technology Stack:</span>
                <div className="flex flex-wrap gap-2">
                    {project.technologyStack.map((tech: string) => (
                        <Badge key={tech} variant="outline" className="text-xs">
                            {tech}
                        </Badge>
                    ))}
                </div>
            </div>
        </div>
    </Card>
);

const QuickStatsCard: React.FC<{ project: any }> = ({ project }) => (
    <Card className="p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Quick Stats
        </h4>
        <div className="space-y-3">
            <div className="flex justify-between">
                <span className="text-sm">Overall Progress:</span>
                <span className="font-medium">{project.overallProgress}%</span>
            </div>
            <div className="flex justify-between">
                <span className="text-sm">Milestones:</span>
                <span className="font-medium">
                    {project.completedMilestones}/{project.totalMilestones}
                </span>
            </div>
            <div className="flex justify-between">
                <span className="text-sm">Status:</span>
                <Badge className="text-xs">
                    {project.projectStatus.replace('_', ' ')}
                </Badge>
            </div>
        </div>
    </Card>
);

const UpcomingDeadlinesCard: React.FC<{ project: any }> = ({ project }) => (
    <Card className="p-4">
        <h4 className="font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Deadlines
        </h4>
        {project.upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming deadlines</p>
        ) : (
            <div className="space-y-2">
                {project.upcomingDeadlines.slice(0, 3).map((deadline: any) => (
                    <div key={deadline.milestoneId} className="flex justify-between items-center">
                        <span className="text-sm truncate">{deadline.title}</span>
                        <Badge variant="outline" className="text-xs">
                            {Math.ceil(
                                (new Date(deadline.dueDate).getTime() - new Date().getTime()) / 
                                (1000 * 60 * 60 * 24)
                            )}d
                        </Badge>
                    </div>
                ))}
            </div>
        )}
    </Card>
);

// Supervisor-specific components
const SupervisorProjectsOverview: React.FC<{ projects: any[] }> = ({ projects }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Active Projects</span>
            </div>
            <div className="text-2xl font-bold">{projects.length}</div>
        </Card>
        
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="font-medium">Avg Progress</span>
            </div>
            <div className="text-2xl font-bold">
                {Math.round(projects.reduce((sum, p) => sum + p.overallProgress, 0) / projects.length)}%
            </div>
        </Card>
        
        <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-medium">Needs Attention</span>
            </div>
            <div className="text-2xl font-bold">
                {projects.filter(p => p.hasUnreadUpdates || p.overdueMilestones > 0).length}
            </div>
        </Card>
    </div>
);

const SupervisorProjectsList: React.FC<{ projects: any[] }> = ({ projects }) => (
    <div className="space-y-4">
        {projects.map((project) => (
            <Card key={project.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="font-semibold">{project.title}</h3>
                        <p className="text-sm text-gray-600">Student: {project.student.name}</p>
                    </div>
                    <div className="flex gap-2">
                        {project.hasUnreadUpdates && (
                            <Badge className="bg-red-100 text-red-800">New Updates</Badge>
                        )}
                        <Badge variant="outline">{project.overallProgress}%</Badge>
                    </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="font-medium">Milestones:</span>
                        <span className="ml-2">{project.completedMilestones}/{project.totalMilestones}</span>
                    </div>
                    <div>
                        <span className="font-medium">Overdue:</span>
                        <span className="ml-2 text-red-600">{project.overdueMilestones}</span>
                    </div>
                    <div>
                        <span className="font-medium">Last Contact:</span>
                        <span className="ml-2">
                            {project.lastCommunication ? 
                                new Date(project.lastCommunication.timestamp).toLocaleDateString() : 
                                'None'
                            }
                        </span>
                    </div>
                </div>
            </Card>
        ))}
    </div>
);

const SupervisorProgressOverview: React.FC<{ projects: any[] }> = ({ projects }) => (
    <div className="space-y-6">
        {projects.map((project) => (
            <ProjectProgressVisualization key={project.id} projectId={project.id} />
        ))}
    </div>
);

const SupervisorCommunicationHub: React.FC<{ projects: any[] }> = ({ projects }) => (
    <div className="space-y-6">
        {projects.map((project) => (
            <Card key={project.id} className="p-6">
                <h3 className="font-semibold mb-4">
                    Communication with {project.student.name}
                </h3>
                <ProjectCommunication
                    projectId={project.id}
                    recipientId={project.student.id}
                    recipientType="student"
                />
            </Card>
        ))}
    </div>
);

export default CurrentProjectManagement;