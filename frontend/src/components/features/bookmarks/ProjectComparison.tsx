'use client';

import React from 'react';
import { useBookmarkStore, useComparisonCount } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { 
    X, 
    ExternalLink, 
    Github, 
    Globe, 
    User, 
    Calendar,
    Tag,
    BarChart3,
    Eye,
    Heart
} from 'lucide-react';

interface ProjectComparisonProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectComparison: React.FC<ProjectComparisonProps> = ({ isOpen, onClose }) => {
    const { comparisonProjects, removeFromComparison, clearComparison } = useBookmarkStore();

    if (comparisonProjects.length === 0) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Project Comparison">
                <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No projects to compare
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Add projects to comparison from your bookmarks to see them here.
                    </p>
                    <Button onClick={onClose}>
                        Close
                    </Button>
                </div>
            </Modal>
        );
    }

    const comparisonData = {
        specializations: [...new Set(comparisonProjects.map(p => p.specialization))],
        difficultyLevels: [...new Set(comparisonProjects.map(p => p.difficultyLevel))],
        allTags: [...new Set(comparisonProjects.flatMap(p => p.tags))],
        allTechnologies: [...new Set(comparisonProjects.flatMap(p => p.technologyStack))],
        supervisors: [...new Set(comparisonProjects.map(p => p.supervisor.name))],
        years: [...new Set(comparisonProjects.map(p => p.year))].sort((a, b) => b - a),
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Project Comparison"
            className="max-w-6xl"
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-medium text-black">
                            Comparing {comparisonProjects.length} Projects
                        </h3>
                        <p className="text-gray-600">
                            Side-by-side comparison of your selected projects
                        </p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={clearComparison}
                    >
                        Clear All
                    </Button>
                </div>

                {/* Projects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {comparisonProjects.map((project) => (
                        <Card key={project.id} className="p-6">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <h4 className="font-medium text-black flex-1 overflow-hidden" style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                }}>
                                    {project.title}
                                </h4>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFromComparison(project.id)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Abstract */}
                            <p className="text-sm text-gray-600 mb-4 overflow-hidden" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical'
                            }}>
                                {project.abstract}
                            </p>

                            {/* Key Details */}
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center text-sm">
                                    <User className="w-4 h-4 mr-2 text-gray-400" />
                                    <span className="text-gray-600">{project.supervisor.name}</span>
                                </div>
                                
                                <div className="flex items-center text-sm">
                                    <Tag className="w-4 h-4 mr-2 text-gray-400" />
                                    <span className="text-gray-600">{project.specialization}</span>
                                </div>
                                
                                <div className="flex items-center text-sm">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    <span className="text-gray-600">{project.year}</span>
                                </div>
                            </div>

                            {/* Difficulty */}
                            <div className="mb-4">
                                <Badge 
                                    variant={
                                        project.difficultyLevel === 'beginner' ? 'secondary' :
                                        project.difficultyLevel === 'intermediate' ? 'outline' : 'default'
                                    }
                                    className="capitalize"
                                >
                                    {project.difficultyLevel}
                                </Badge>
                            </div>

                            {/* Tags */}
                            <div className="mb-4">
                                <div className="text-xs font-medium text-gray-700 mb-2">Tags</div>
                                <div className="flex flex-wrap gap-1">
                                    {project.tags.slice(0, 3).map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                    {project.tags.length > 3 && (
                                        <Badge variant="outline" className="text-xs">
                                            +{project.tags.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Technology Stack */}
                            <div className="mb-4">
                                <div className="text-xs font-medium text-gray-700 mb-2">Technologies</div>
                                <div className="flex flex-wrap gap-1">
                                    {project.technologyStack.slice(0, 3).map((tech) => (
                                        <Badge key={tech} variant="secondary" className="text-xs">
                                            {tech}
                                        </Badge>
                                    ))}
                                    {project.technologyStack.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                            +{project.technologyStack.length - 3}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                                <div className="flex items-center">
                                    <Eye className="w-4 h-4 mr-1" />
                                    {project.viewCount}
                                </div>
                                <div className="flex items-center">
                                    <Heart className="w-4 h-4 mr-1" />
                                    {project.bookmarkCount}
                                </div>
                            </div>

                            {/* External Links */}
                            <div className="flex gap-2 mb-4">
                                {project.githubUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(project.githubUrl, '_blank')}
                                    >
                                        <Github className="w-4 h-4" />
                                    </Button>
                                )}
                                {project.demoUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(project.demoUrl, '_blank')}
                                    >
                                        <Globe className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            {/* View Project */}
                            <Button
                                variant="secondary"
                                size="sm"
                                fullWidth
                                onClick={() => window.open(`/projects/${project.id}`, '_blank')}
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Project
                            </Button>
                        </Card>
                    ))}
                </div>

                {/* Comparison Summary */}
                <Card className="p-6 bg-gray-50">
                    <h4 className="font-medium text-black mb-4">Comparison Summary</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Specializations */}
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Specializations</div>
                            <div className="space-y-1">
                                {comparisonData.specializations.map((spec) => (
                                    <div key={spec} className="text-sm text-gray-600">
                                        {spec} ({comparisonProjects.filter(p => p.specialization === spec).length})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Difficulty Levels */}
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Difficulty Levels</div>
                            <div className="space-y-1">
                                {comparisonData.difficultyLevels.map((level) => (
                                    <div key={level} className="text-sm text-gray-600 capitalize">
                                        {level} ({comparisonProjects.filter(p => p.difficultyLevel === level).length})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Years */}
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Years</div>
                            <div className="space-y-1">
                                {comparisonData.years.map((year) => (
                                    <div key={year} className="text-sm text-gray-600">
                                        {year} ({comparisonProjects.filter(p => p.year === year).length})
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Common Tags */}
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Common Tags</div>
                            <div className="flex flex-wrap gap-1">
                                {comparisonData.allTags.slice(0, 6).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                                {comparisonData.allTags.length > 6 && (
                                    <Badge variant="outline" className="text-xs">
                                        +{comparisonData.allTags.length - 6}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Common Technologies */}
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Technologies</div>
                            <div className="flex flex-wrap gap-1">
                                {comparisonData.allTechnologies.slice(0, 6).map((tech) => (
                                    <Badge key={tech} variant="secondary" className="text-xs">
                                        {tech}
                                    </Badge>
                                ))}
                                {comparisonData.allTechnologies.length > 6 && (
                                    <Badge variant="secondary" className="text-xs">
                                        +{comparisonData.allTechnologies.length - 6}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Supervisors */}
                        <div>
                            <div className="text-sm font-medium text-gray-700 mb-2">Supervisors</div>
                            <div className="space-y-1">
                                {comparisonData.supervisors.map((supervisor) => (
                                    <div key={supervisor} className="text-sm text-gray-600">
                                        {supervisor}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </Modal>
    );
};

// Comparison Button Component
export const ComparisonButton: React.FC = () => {
    const comparisonCount = useComparisonCount();
    const [showComparison, setShowComparison] = React.useState(false);

    if (comparisonCount === 0) return null;

    return (
        <>
            <Button
                variant="primary"
                onClick={() => setShowComparison(true)}
                className="fixed bottom-6 right-6 z-50 shadow-brutal"
            >
                <BarChart3 className="w-4 h-4 mr-2" />
                Compare ({comparisonCount})
            </Button>

            <ProjectComparison
                isOpen={showComparison}
                onClose={() => setShowComparison(false)}
            />
        </>
    );
};