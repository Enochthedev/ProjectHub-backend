'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar, 
  Tag, 
  ExternalLink,
  FileText,
  Users,
  Star
} from 'lucide-react';
import type { Project } from '@/stores/admin';

interface ProjectApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSubmit: (action: 'approve' | 'reject', feedback?: string, reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function ProjectApprovalModal({
  isOpen,
  onClose,
  project,
  onSubmit,
  isLoading,
}: ProjectApprovalModalProps) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!action) return;
    
    try {
      await onSubmit(action, feedback, reason);
      // Reset form
      setAction(null);
      setFeedback('');
      setReason('');
    } catch (error) {
      console.error('Failed to submit approval:', error);
    }
  };

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Project Review"
      size="xl"
    >
      <div className="space-y-6">
        {/* Project Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="text-xl font-bold text-black mb-2">
            {project.title}
          </h2>
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <span className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              Supervisor: {project.supervisor.name}
            </span>
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Submitted: {formatDate(project.createdAt)}
            </span>
            <span className="flex items-center">
              <FileText className="w-4 h-4 mr-1" />
              Status: Pending Review
            </span>
          </div>
        </div>

        {/* Project Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Abstract */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-black mb-3">Abstract</h3>
              <p className="text-gray-700 leading-relaxed">
                {project.abstract}
              </p>
            </Card>

            {/* Technology Stack */}
            {project.technologyStack.length > 0 && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold text-black mb-3 flex items-center">
                  <Tag className="w-5 h-5 mr-2" />
                  Technology Stack
                </h3>
                <div className="flex flex-wrap gap-2">
                  {project.technologyStack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-sm text-gray-700 rounded-md"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Project Links */}
            {(project.githubUrl || project.demoUrl) && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold text-black mb-3">Project Links</h3>
                <div className="space-y-2">
                  {project.githubUrl && (
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      GitHub Repository
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Live Demo
                    </a>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Project Metadata */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-black mb-3">Project Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-600">Specialization</label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      {project.specialization}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Difficulty Level</label>
                  <div className="mt-1">
                    <Badge variant={getDifficultyBadgeVariant(project.difficultyLevel)}>
                      {project.difficultyLevel.charAt(0).toUpperCase() + project.difficultyLevel.slice(1)}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Academic Year</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {project.year}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Project Type</label>
                  <div className="mt-1">
                    <Badge variant={project.isGroupProject ? 'secondary' : 'outline'}>
                      {project.isGroupProject ? (
                        <>
                          <Users className="w-3 h-3 mr-1" />
                          Group Project
                        </>
                      ) : (
                        'Individual Project'
                      )}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Supervisor Info */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-black mb-3">Supervisor</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-gray-600">
                      {project.supervisor.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {project.supervisor.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {project.supervisor.specializations.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Project Stats */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-black mb-3">Statistics</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Views</span>
                  <span className="font-medium">{project.viewCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bookmarks</span>
                  <span className="font-medium">{project.bookmarkCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tags</span>
                  <span className="font-medium">{project.tags.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Selection */}
        {!action && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-black mb-4">Review Decision</h3>
            <div className="flex items-center space-x-4">
              <Button
                variant="secondary"
                onClick={() => setAction('approve')}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Project
              </Button>
              <Button
                variant="secondary"
                onClick={() => setAction('reject')}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Project
              </Button>
            </div>
          </div>
        )}

        {/* Approval Form */}
        {action === 'approve' && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              Approve Project
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feedback for Supervisor (Optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide any feedback or suggestions for the supervisor..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-end space-x-4">
                <Button
                  variant="secondary"
                  onClick={() => setAction(null)}
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  loading={isLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Project
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Form */}
        {action === 'reject' && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
              <XCircle className="w-5 h-5 mr-2 text-red-600" />
              Reject Project
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejection..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={4}
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-4">
                <Button
                  variant="secondary"
                  onClick={() => setAction(null)}
                >
                  Back
                </Button>
                <Button
                  variant="danger"
                  onClick={handleSubmit}
                  loading={isLoading}
                  disabled={!reason.trim()}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Project
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        {!action && (
          <div className="flex items-center justify-end">
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}