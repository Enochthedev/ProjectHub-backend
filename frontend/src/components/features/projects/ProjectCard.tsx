'use client';

import React from 'react';
import { Eye, Users, Calendar, ExternalLink, Github, Star } from 'lucide-react';
import { Project } from '@/types/project';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { BookmarkButton } from '@/components/features/bookmarks';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  variant?: 'compact' | 'detailed';
  loading?: boolean;
  onView?: (projectId: string) => void;
  className?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  variant = 'detailed',
  loading = false,
  onView,
  className,
}) => {


  const handleCardClick = () => {
    if (onView) {
      onView(project.id);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-gray-100 text-gray-800';
      case 'intermediate':
        return 'bg-gray-200 text-gray-900';
      case 'advanced':
        return 'bg-gray-800 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <ProjectCardSkeleton variant={variant} className={className} />;
  }

  return (
    <Card
      variant="outlined"
      clickable
      onClick={handleCardClick}
      className={cn(
        'group transition-all duration-200 hover:border-gray-400',
        variant === 'compact' ? 'p-4' : 'p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            'font-medium text-black group-hover:text-gray-700 transition-colors overflow-hidden',
            variant === 'compact' ? 'text-sm' : 'text-lg'
          )} style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {project.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            by {project.supervisor.name}
          </p>
        </div>
        
        <BookmarkButton
          project={project}
          variant="icon-only"
          size="sm"
          className="ml-2 flex-shrink-0"
        />
      </div>

      {/* Abstract */}
      {variant === 'detailed' && (
        <p className="text-sm text-gray-700 mb-4 overflow-hidden" style={{
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical'
        }}>
          {project.abstract}
        </p>
      )}

      {/* Metadata */}
      <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{project.year}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          <span>{project.viewCount}</span>
        </div>
        
        {project.isGroupProject && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>Group</span>
          </div>
        )}
      </div>

      {/* Success Metrics */}
      {(project.successScore || project.averageGrade || project.studentSatisfaction) && (
        <div className="flex items-center gap-3 mb-3 text-xs">
          {project.successScore && (
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                project.successScore >= 80 ? 'bg-green-500' :
                project.successScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-gray-600">Success: {project.successScore}%</span>
            </div>
          )}
          
          {project.averageGrade && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">Avg Grade: {project.averageGrade}%</span>
            </div>
          )}
          
          {project.studentSatisfaction && (
            <div className="flex items-center gap-1">
              <span className="text-gray-600">★ {project.studentSatisfaction.toFixed(1)}</span>
            </div>
          )}
        </div>
      )}

      {/* Tags and Technology Stack */}
      <div className="space-y-2 mb-4">
        {/* Difficulty and Specialization */}
        <div className="flex items-center gap-2">
          <Badge className={getDifficultyColor(project.difficultyLevel)}>
            {project.difficultyLevel}
          </Badge>
          <Badge variant="outline">
            {project.specialization}
          </Badge>
        </div>

        {/* Technology Stack */}
        {project.technologyStack.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.technologyStack.slice(0, variant === 'compact' ? 3 : 5).map((tech) => (
              <Badge key={tech} variant="secondary" className="text-xs">
                {tech}
              </Badge>
            ))}
            {project.technologyStack.length > (variant === 'compact' ? 3 : 5) && (
              <Badge variant="secondary" className="text-xs">
                +{project.technologyStack.length - (variant === 'compact' ? 3 : 5)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Links */}
      {(project.githubUrl || project.demoUrl) && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {project.githubUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(project.githubUrl, '_blank');
              }}
              className="text-xs"
            >
              <Github className="h-3 w-3 mr-1" />
              Code
            </Button>
          )}
          
          {project.demoUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                window.open(project.demoUrl, '_blank');
              }}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Demo
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

// Skeleton loader component
const ProjectCardSkeleton: React.FC<{ variant?: 'compact' | 'detailed'; className?: string }> = ({
  variant = 'detailed',
  className,
}) => {
  return (
    <Card
      variant="outlined"
      className={cn(
        'animate-pulse',
        variant === 'compact' ? 'p-4' : 'p-6',
        className
      )}
    >
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className={cn(
            'bg-gray-200 rounded',
            variant === 'compact' ? 'h-4 w-3/4' : 'h-5 w-4/5'
          )} />
          <div className="bg-gray-200 rounded h-3 w-1/2 mt-2" />
        </div>
        <div className="bg-gray-200 rounded h-8 w-8 ml-2" />
      </div>

      {/* Abstract skeleton */}
      {variant === 'detailed' && (
        <div className="space-y-2 mb-4">
          <div className="bg-gray-200 rounded h-3 w-full" />
          <div className="bg-gray-200 rounded h-3 w-4/5" />
          <div className="bg-gray-200 rounded h-3 w-3/5" />
        </div>
      )}

      {/* Metadata skeleton */}
      <div className="flex items-center gap-2 mb-3">
        <div className="bg-gray-200 rounded h-3 w-12" />
        <div className="bg-gray-200 rounded h-3 w-8" />
        <div className="bg-gray-200 rounded h-3 w-10" />
      </div>

      {/* Badges skeleton */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-gray-200 rounded h-5 w-16" />
          <div className="bg-gray-200 rounded h-5 w-20" />
        </div>
        <div className="flex flex-wrap gap-1">
          <div className="bg-gray-200 rounded h-4 w-12" />
          <div className="bg-gray-200 rounded h-4 w-16" />
          <div className="bg-gray-200 rounded h-4 w-14" />
        </div>
      </div>

      {/* Links skeleton */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <div className="bg-gray-200 rounded h-6 w-12" />
        <div className="bg-gray-200 rounded h-6 w-12" />
      </div>
    </Card>
  );
};

export default ProjectCard;