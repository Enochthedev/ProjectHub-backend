'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { 
    ArrowLeft, 
    Heart, 
    Github, 
    ExternalLink, 
    Calendar,
    User,
    Users,
    Tag,
    Code,
    BookOpen,
    AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { useBookmarkStore } from '@/stores/bookmark';
import { useSuccessToast, useErrorToast } from '@/components/ui/Toast';

interface Project {
    id: string;
    title: string;
    abstract: string;
    specialization: string;
    difficultyLevel: string;
    year: number;
    tags: string[];
    technologyStack: string[];
    isGroupProject: boolean;
    approvalStatus: string;
    githubUrl?: string;
    demoUrl?: string;
    notes?: string;
    supervisor?: {
        id: string;
        name: string;
        email: string;
    };
    student?: {
        id: string;
        name: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    
    const [project, setProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const { bookmarks, addBookmark, removeBookmark } = useBookmarkStore();
    const isBookmarked = bookmarks.some(b => b.project?.id === projectId);
    
    const showSuccess = useSuccessToast();
    const showError = useErrorToast();

    useEffect(() => {
        if (projectId) {
            loadProject();
        }
    }, [projectId]); // Re-run when projectId changes

    const loadProject = async () => {
        try {
            setIsLoading(true);
            setError(null);
            setProject(null); // Clear previous project data
            const response = await api.get<Project>(`${API_ENDPOINTS.PROJECTS.BASE}/${projectId}`);
            setProject(response);
        } catch (err: any) {
            console.error('Failed to load project:', err);
            setError(err?.response?.data?.message || 'Failed to load project details');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBookmarkToggle = async () => {
        if (!project) return;

        try {
            if (isBookmarked) {
                const bookmark = bookmarks.find(b => b.project?.id === projectId);
                if (bookmark) {
                    await removeBookmark(bookmark.id);
                    showSuccess('Removed from bookmarks');
                }
            } else {
                await addBookmark({ projectId });
                showSuccess('Added to bookmarks');
            }
        } catch (err: any) {
            showError(err?.message || 'Failed to update bookmark');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="p-8 text-center">
                    <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                        {error || 'Project not found'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        The project you're looking for doesn't exist or you don't have permission to view it.
                    </p>
                    <Button onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <Button variant="secondary" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
                <Button
                    variant={isBookmarked ? 'primary' : 'secondary'}
                    onClick={handleBookmarkToggle}
                >
                    <Heart className={`w-4 h-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                    {isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </Button>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Title and Status */}
                    <Card className="p-6">
                        <div className="flex items-start justify-between mb-4">
                            <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
                            <Badge variant={project.approvalStatus === 'approved' ? 'success' : 'warning'}>
                                {project.approvalStatus}
                            </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="secondary">
                                <BookOpen className="w-3 h-3 mr-1" />
                                {project.specialization}
                            </Badge>
                            <Badge variant="secondary">
                                {project.difficultyLevel}
                            </Badge>
                            <Badge variant="secondary">
                                <Calendar className="w-3 h-3 mr-1" />
                                {project.year}
                            </Badge>
                            {project.isGroupProject && (
                                <Badge variant="secondary">
                                    <Users className="w-3 h-3 mr-1" />
                                    Group Project
                                </Badge>
                            )}
                        </div>

                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Abstract</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{project.abstract}</p>
                    </Card>

                    {/* Technology Stack */}
                    {project.technologyStack && project.technologyStack.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Code className="w-5 h-5 mr-2" />
                                Technology Stack
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {project.technologyStack.map((tech, index) => (
                                    <Badge key={index} variant="primary">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Tags */}
                    {project.tags && project.tags.length > 0 && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Tag className="w-5 h-5 mr-2" />
                                Tags
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {project.tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Notes */}
                    {project.notes && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-2">Additional Notes</h2>
                            <p className="text-gray-700 whitespace-pre-wrap">{project.notes}</p>
                        </Card>
                    )}
                </div>

                {/* Right Column - Sidebar */}
                <div className="space-y-6">
                    {/* Links */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Links</h2>
                        <div className="space-y-3">
                            {project.githubUrl && (
                                <a
                                    href={project.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-600 hover:text-blue-700"
                                >
                                    <Github className="w-4 h-4 mr-2" />
                                    View on GitHub
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                            )}
                            {project.demoUrl && (
                                <a
                                    href={project.demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center text-blue-600 hover:text-blue-700"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Demo
                                </a>
                            )}
                            {!project.githubUrl && !project.demoUrl && (
                                <p className="text-gray-500 text-sm">No links available</p>
                            )}
                        </div>
                    </Card>

                    {/* Supervisor */}
                    {project.supervisor && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Supervisor
                            </h2>
                            <div>
                                <p className="font-medium text-gray-900">{project.supervisor.name}</p>
                                <p className="text-sm text-gray-600">{project.supervisor.email}</p>
                            </div>
                        </Card>
                    )}

                    {/* Student */}
                    {project.student && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Student
                            </h2>
                            <div>
                                <p className="font-medium text-gray-900">{project.student.name}</p>
                                <p className="text-sm text-gray-600">{project.student.email}</p>
                            </div>
                        </Card>
                    )}

                    {/* Metadata */}
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-gray-600">Created:</span>
                                <span className="ml-2 text-gray-900">
                                    {new Date(project.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-gray-600">Updated:</span>
                                <span className="ml-2 text-gray-900">
                                    {new Date(project.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
