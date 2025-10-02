'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { 
  FileText, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  Eye,
  Clock,
  User,
  Calendar,
  Tag,
  ExternalLink
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';
import ProjectApprovalModal from './ProjectApprovalModal';
import type { Project } from '@/stores/admin';

interface ProjectApprovalProps {
  className?: string;
}

export default function ProjectApproval({ className }: ProjectApprovalProps) {
  const {
    pendingProjects,
    selectedProjects,
    projectFilters,
    isLoading,
    error,
    fetchPendingProjects,
    approveProject,
    rejectProject,
    setProjectFilters,
    selectProjects,
    bulkApproveProjects,
    bulkRejectProjects,
    clearError,
    clearSelection,
  } = useAdminStore();

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingProjects();
  }, [fetchPendingProjects]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setProjectFilters({ search: searchQuery });
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, setProjectFilters]);

  const handleProjectAction = (project: Project, action: 'approve' | 'reject' | 'view') => {
    setSelectedProject(project);
    if (action === 'view' || action === 'approve' || action === 'reject') {
      setShowApprovalModal(true);
    }
  };

  const handleApprovalSubmit = async (action: 'approve' | 'reject', feedback?: string, reason?: string) => {
    if (!selectedProject) return;

    try {
      if (action === 'approve') {
        await approveProject(selectedProject.id, feedback);
      } else {
        await rejectProject(selectedProject.id, reason || 'No reason provided');
      }
      setShowApprovalModal(false);
      setSelectedProject(null);
    } catch (error) {
      console.error(`Failed to ${action} project:`, error);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedProjects.length === 0) return;

    if (!confirm(`Are you sure you want to approve ${selectedProjects.length} projects?`)) {
      return;
    }

    try {
      await bulkApproveProjects(selectedProjects);
      clearSelection();
    } catch (error) {
      console.error('Failed to bulk approve projects:', error);
    }
  };

  const handleBulkReject = async (reason: string) => {
    if (selectedProjects.length === 0) return;

    try {
      await bulkRejectProjects(selectedProjects, reason);
      clearSelection();
      setShowBulkRejectModal(false);
    } catch (error) {
      console.error('Failed to bulk reject projects:', error);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectProjects(filteredProjects.map(project => project.id));
    } else {
      selectProjects([]);
    }
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    if (checked) {
      selectProjects([...selectedProjects, projectId]);
    } else {
      selectProjects(selectedProjects.filter(id => id !== projectId));
    }
  };

  const filteredProjects = pendingProjects.filter(project => {
    if (projectFilters.specialization && project.specialization !== projectFilters.specialization) {
      return false;
    }
    return true;
  });

  const getDifficultyBadgeVariant = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'success';
      case 'intermediate':
        return 'warning';
      case 'advanced':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isAllSelected = filteredProjects.length > 0 && selectedProjects.length === filteredProjects.length;
  const isPartiallySelected = selectedProjects.length > 0 && selectedProjects.length < filteredProjects.length;

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchPendingProjects(); }}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-black flex items-center">
              <FileText className="w-6 h-6 mr-2" />
              Project Approval
            </h2>
            <p className="text-gray-600">
              Review and approve pending project submissions.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {filteredProjects.length} Pending
            </Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects by title, abstract, or technology..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="mt-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specialization
                </label>
                <select
                  value={projectFilters.specialization || ''}
                  onChange={(e) => setProjectFilters({ 
                    specialization: e.target.value || undefined 
                  })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  <option value="">All Specializations</option>
                  <option value="Software Engineering">Software Engineering</option>
                  <option value="Data Science & Analytics">Data Science & Analytics</option>
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Artificial Intelligence & Machine Learning">AI & Machine Learning</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App Development">Mobile App Development</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => setProjectFilters({})}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedProjects.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = isPartiallySelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black mr-3"
              />
              <span className="text-sm text-gray-600">
                {selectedProjects.length} project{selectedProjects.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkApprove}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Approve All
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkRejectModal(true)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Reject All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Projects List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start space-x-4">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No pending projects</h3>
            <p>All projects have been reviewed or no projects match your filters.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedProjects.includes(project.id)}
                  onChange={(e) => handleSelectProject(project.id, e.target.checked)}
                  className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black mt-1"
                />
                
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-1">
                        {project.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {project.supervisor.name}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {formatDate(project.createdAt)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending Review
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {project.abstract}
                  </p>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <Badge variant="outline">
                      {project.specialization}
                    </Badge>
                    <Badge variant={getDifficultyBadgeVariant(project.difficultyLevel)}>
                      {project.difficultyLevel.charAt(0).toUpperCase() + project.difficultyLevel.slice(1)}
                    </Badge>
                    {project.isGroupProject && (
                      <Badge variant="secondary">
                        Group Project
                      </Badge>
                    )}
                  </div>
                  
                  {project.technologyStack.length > 0 && (
                    <div className="flex items-center space-x-1 mb-4">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {project.technologyStack.slice(0, 5).map((tech, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded"
                          >
                            {tech}
                          </span>
                        ))}
                        {project.technologyStack.length > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                            +{project.technologyStack.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {(project.githubUrl || project.demoUrl) && (
                    <div className="flex items-center space-x-4 text-sm">
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          GitHub
                        </a>
                      )}
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Demo
                        </a>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleProjectAction(project, 'view')}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Review
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleProjectAction(project, 'approve')}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleProjectAction(project, 'reject')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Project Approval Modal */}
      {selectedProject && (
        <ProjectApprovalModal
          isOpen={showApprovalModal}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedProject(null);
          }}
          project={selectedProject}
          onSubmit={handleApprovalSubmit}
          isLoading={isLoading}
        />
      )}

      {/* Bulk Reject Modal */}
      <Modal
        isOpen={showBulkRejectModal}
        onClose={() => setShowBulkRejectModal(false)}
        title="Bulk Reject Projects"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You are about to reject {selectedProjects.length} projects. 
            Please provide a reason for rejection:
          </p>
          <textarea
            placeholder="Enter rejection reason..."
            className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
            rows={4}
            onChange={(e) => {
              // Store reason in state if needed
            }}
          />
          <div className="flex items-center justify-end space-x-4">
            <Button
              variant="secondary"
              onClick={() => setShowBulkRejectModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleBulkReject('Bulk rejection')}
            >
              Reject Projects
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}