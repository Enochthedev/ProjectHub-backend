'use client';

import React from 'react';
import { 
  Heart, 
  Eye, 
  Users, 
  Calendar, 
  ExternalLink, 
  Github, 
  ArrowLeft,
  Share2,
  BookOpen,
  User,
  Clock,
  Tag
} from 'lucide-react';
import { Project } from '@/types/project';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';
import { ProjectCard } from './ProjectCard';
import { 
  useProject, 
  useRelatedProjects, 
  useCreateBookmark, 
  useDeleteBookmark, 
  useIsBookmarked,
  useIncrementViewCount
} from '@/hooks/useProjects';
import { cn } from '@/lib/utils';

interface ProjectDetailProps {
  projectId: string;
  onBack?: () => void;
  onProjectView?: (projectId: string) => void;
  className?: string;
}

interface ProjectMetaProps {
  project: Project;
}

const ProjectMeta: React.FC<ProjectMetaProps> = ({ project }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded border-2 border-gray-200">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-gray-500" />
        <div>
          <div className="text-xs text-gray-500">Year</div>
          <div className="font-medium">{project.year}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 text-gray-500" />
        <div>
          <div className="text-xs text-gray-500">Views</div>
          <div className="font-medium">{project.viewCount}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-gray-500" />
        <div>
          <div className="text-xs text-gray-500">Bookmarks</div>
          <div className="font-medium">{project.bookmarkCount}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gray-500" />
        <div>
          <div className="text-xs text-gray-500">Type</div>
          <div className="font-medium">{project.isGroupProject ? 'Group' : 'Individual'}</div>
        </div>
      </div>
    </div>
  );
};

const ProjectDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-gray-200 rounded h-8 w-8" />
        <div className="bg-gray-200 rounded h-6 w-32" />
      </div>
      
      {/* Title and actions skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="bg-gray-200 rounded h-8 w-3/4 mb-2" />
          <div className="bg-gray-200 rounded h-4 w-1/2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-gray-200 rounded h-10 w-24" />
          <div className="bg-gray-200 rounded h-10 w-10" />
          <div className="bg-gray-200 rounded h-10 w-10" />
        </div>
      </div>
      
      {/* Meta skeleton */}
      <div className="bg-gray-200 rounded h-20 w-full" />
      
      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="bg-gray-200 rounded h-4 w-full" />
        <div className="bg-gray-200 rounded h-4 w-5/6" />
        <div className="bg-gray-200 rounded h-4 w-4/5" />
      </div>
      
      {/* Related projects skeleton */}
      <div className="space-y-4">
        <div className="bg-gray-200 rounded h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded h-64" />
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  projectId,
  onBack,
  onProjectView,
  className,
}) => {
  const { data: project, isLoading, error } = useProject(projectId);
  const { data: relatedProjects = [] } = useRelatedProjects(projectId);
  const { data: isBookmarked = false } = useIsBookmarked(projectId);
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();
  const incrementViewCount = useIncrementViewCount();

  // Increment view count when component mounts
  React.useEffect(() => {
    if (projectId) {
      incrementViewCount.mutate(projectId);
    }
  }, [projectId, incrementViewCount]);

  const handleBookmarkToggle = async () => {
    try {
      if (isBookmarked) {
        await deleteBookmark.mutateAsync(projectId);
      } else {
        await createBookmark.mutateAsync({ projectId });
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share && project) {
      try {
        await navigator.share({
          title: project.title,
          text: project.abstract,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
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

  if (isLoading) {
    return (
      <div className={className}>
        <ProjectDetailSkeleton />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Card variant="outlined" className={cn('p-8 text-center', className)}>
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          
          <h3 className="text-lg font-medium text-black mb-2">
            Project not found
          </h3>
          
          <p className="text-gray-600 mb-6">
            The project you're looking for doesn't exist or has been removed.
          </p>
          
          {onBack && (
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header with back button */}
      {onBack && (
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      )}

      {/* Project Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
            {project.title}
          </h1>
          
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Supervised by {project.supervisor.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            onClick={handleBookmarkToggle}
            disabled={createBookmark.isPending || deleteBookmark.isPending}
            className="flex items-center gap-2"
          >
            <Heart
              className={cn(
                'h-4 w-4',
                isBookmarked ? 'fill-black text-black' : 'text-gray-500'
              )}
            />
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project Metadata */}
      <ProjectMeta project={project} />

      {/* Badges */}
      <div className="flex flex-wrap gap-2 my-6">
        <Badge className={getDifficultyColor(project.difficultyLevel)}>
          {project.difficultyLevel}
        </Badge>
        
        <Badge variant="outline">
          {project.specialization}
        </Badge>
        
        <Badge variant="secondary">
          {project.approvalStatus}
        </Badge>
      </div>

      {/* Project Description */}
      <Card variant="outlined" className="p-6 mb-6">
        <h2 className="text-lg font-medium text-black mb-4">Abstract</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {project.abstract}
        </p>
      </Card>

      {/* Technology Stack */}
      {project.technologyStack.length > 0 && (
        <Card variant="outlined" className="p-6 mb-6">
          <h2 className="text-lg font-medium text-black mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Technology Stack
          </h2>
          <div className="flex flex-wrap gap-2">
            {project.technologyStack.map((tech) => (
              <Badge key={tech} variant="secondary">
                {tech}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <Card variant="outlined" className="p-6 mb-6">
          <h2 className="text-lg font-medium text-black mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* External Links */}
      {(project.githubUrl || project.demoUrl) && (
        <Card variant="outlined" className="p-6 mb-6">
          <h2 className="text-lg font-medium text-black mb-4">Links</h2>
          <div className="flex flex-wrap gap-3">
            {project.githubUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(project.githubUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <Github className="h-4 w-4" />
                View Source Code
              </Button>
            )}
            
            {project.demoUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(project.demoUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                View Demo
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Supervisor Information */}
      <Card variant="outlined" className="p-6 mb-6">
        <h2 className="text-lg font-medium text-black mb-4">Supervisor</h2>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-gray-500" />
          </div>
          
          <div>
            <h3 className="font-medium text-black">{project.supervisor.name}</h3>
            <div className="flex flex-wrap gap-1 mt-2">
              {project.supervisor.specializations.map((spec) => (
                <Badge key={spec} variant="secondary" size="sm">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-medium text-black mb-6">Related Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProjects.map((relatedProject) => (
              <ProjectCard
                key={relatedProject.id}
                project={relatedProject}
                variant="detailed"
                onView={onProjectView}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;