'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Users,
  Target,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useSupervisorStore } from '@/stores/supervisor';
import { supervisorApi } from '@/lib/supervisor-api';
import { Milestone } from '@/types/milestone';

interface SupervisorMilestone extends Milestone {
  studentName: string;
  studentEmail: string;
  projectTitle: string;
  requiresApproval: boolean;
  lastSubmissionDate?: string;
}

export default function SupervisorMilestonesPage() {
  const [milestones, setMilestones] = useState<SupervisorMilestone[]>([]);
  const [filteredMilestones, setFilteredMilestones] = useState<SupervisorMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedMilestone, setSelectedMilestone] = useState<SupervisorMilestone | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'revision'>('approve');
  const [feedback, setFeedback] = useState('');

  const { studentProgress } = useSupervisorStore();

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        setIsLoading(true);
        
        // Mock data - in real implementation, this would come from an API endpoint
        // that returns all milestones for students supervised by this supervisor
        const mockMilestones: SupervisorMilestone[] = [
          {
            id: 'milestone-1',
            title: 'Literature Review Completion',
            description: 'Complete comprehensive literature review for the project',
            dueDate: '2024-04-15T23:59:59Z',
            status: 'in_progress',
            priority: 'high',
            progress: 75,
            projectId: 'project-1',
            studentId: 'student-1',
            supervisorId: 'supervisor-1',
            category: 'Research',
            tags: ['literature', 'research', 'analysis'],
            estimatedHours: 40,
            actualHours: 30,
            dependencies: [],
            attachments: [],
            notes: [],
            reminders: [],
            createdAt: '2024-03-01T10:00:00Z',
            updatedAt: '2024-03-15T14:30:00Z',
            studentName: 'John Doe',
            studentEmail: 'john.doe@university.edu',
            projectTitle: 'AI-Powered Recommendation System',
            requiresApproval: true,
            lastSubmissionDate: '2024-03-15T14:30:00Z'
          },
          {
            id: 'milestone-2',
            title: 'System Architecture Design',
            description: 'Design the overall system architecture and create technical specifications',
            dueDate: '2024-04-20T23:59:59Z',
            status: 'completed',
            priority: 'high',
            progress: 100,
            projectId: 'project-2',
            studentId: 'student-2',
            supervisorId: 'supervisor-1',
            category: 'Design',
            tags: ['architecture', 'design', 'technical'],
            estimatedHours: 25,
            actualHours: 28,
            dependencies: [],
            attachments: [],
            notes: [],
            reminders: [],
            createdAt: '2024-03-05T10:00:00Z',
            updatedAt: '2024-03-18T16:45:00Z',
            completedAt: '2024-03-18T16:45:00Z',
            studentName: 'Jane Smith',
            studentEmail: 'jane.smith@university.edu',
            projectTitle: 'Blockchain Voting System',
            requiresApproval: false
          },
          {
            id: 'milestone-3',
            title: 'Database Schema Implementation',
            description: 'Implement the database schema and set up initial data structures',
            dueDate: '2024-04-10T23:59:59Z',
            status: 'overdue',
            priority: 'medium',
            progress: 60,
            projectId: 'project-3',
            studentId: 'student-3',
            supervisorId: 'supervisor-1',
            category: 'Implementation',
            tags: ['database', 'schema', 'implementation'],
            estimatedHours: 20,
            actualHours: 15,
            dependencies: [],
            attachments: [],
            notes: [],
            reminders: [],
            createdAt: '2024-03-10T10:00:00Z',
            updatedAt: '2024-03-20T09:15:00Z',
            studentName: 'Mike Johnson',
            studentEmail: 'mike.johnson@university.edu',
            projectTitle: 'E-Learning Platform',
            requiresApproval: true,
            lastSubmissionDate: '2024-03-20T09:15:00Z'
          }
        ];

        setMilestones(mockMilestones);
        setFilteredMilestones(mockMilestones);
        setError(null);
      } catch (err) {
        setError('Failed to load milestones');
        console.error('Milestones error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMilestones();
  }, []);

  useEffect(() => {
    let filtered = [...milestones];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(milestone =>
        milestone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        milestone.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        milestone.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        milestone.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'requires_approval') {
        filtered = filtered.filter(milestone => milestone.requiresApproval);
      } else {
        filtered = filtered.filter(milestone => milestone.status === statusFilter);
      }
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(milestone => milestone.priority === priorityFilter);
    }

    // Sort by due date (most urgent first)
    filtered.sort((a, b) => {
      if (a.status === 'overdue' && b.status !== 'overdue') return -1;
      if (b.status === 'overdue' && a.status !== 'overdue') return 1;
      if (a.requiresApproval && !b.requiresApproval) return -1;
      if (b.requiresApproval && !a.requiresApproval) return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

    setFilteredMilestones(filtered);
  }, [milestones, searchQuery, statusFilter, priorityFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'overdue':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'blocked':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'low':
        return 'text-green-700 bg-green-100 border-green-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'blocked':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const handleApprovalAction = async (milestone: SupervisorMilestone, action: 'approve' | 'reject' | 'revision') => {
    setSelectedMilestone(milestone);
    setApprovalAction(action);
    setShowApprovalModal(true);
  };

  const submitApproval = async () => {
    if (!selectedMilestone) return;

    try {
      switch (approvalAction) {
        case 'approve':
          await supervisorApi.approveMilestone(selectedMilestone.id, feedback);
          break;
        case 'revision':
          await supervisorApi.requestMilestoneRevision(selectedMilestone.id, feedback);
          break;
        case 'reject':
          // This would need a reject endpoint
          await supervisorApi.addMilestoneComment(selectedMilestone.id, `Milestone rejected: ${feedback}`);
          break;
      }

      // Update local state
      setMilestones(prev => prev.map(m => 
        m.id === selectedMilestone.id 
          ? { ...m, requiresApproval: false, status: approvalAction === 'approve' ? 'completed' : m.status }
          : m
      ));

      setShowApprovalModal(false);
      setFeedback('');
      setSelectedMilestone(null);
    } catch (err) {
      console.error('Failed to process milestone approval:', err);
    }
  };

  const calculateStats = () => {
    const total = milestones.length;
    const completed = milestones.filter(m => m.status === 'completed').length;
    const inProgress = milestones.filter(m => m.status === 'in_progress').length;
    const overdue = milestones.filter(m => m.status === 'overdue').length;
    const requiresApproval = milestones.filter(m => m.requiresApproval).length;

    return { total, completed, inProgress, overdue, requiresApproval };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Milestone Management</h1>
            <p className="text-gray-600">
              Review and approve student milestones across all your supervised projects.
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Milestones</p>
                <p className="text-2xl font-bold text-black">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Requires Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.requiresApproval}</p>
              </div>
              <FileText className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search milestones, students, or projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="requires_approval">Requires Approval</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="blocked">Blocked</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Milestones List */}
      {filteredMilestones.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-black mb-2">No Milestones Found</h3>
          <p className="text-gray-600">
            {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'No milestones match your current filters.'
              : 'No milestones to review at this time.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMilestones.map((milestone) => (
            <Card key={milestone.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-black">{milestone.title}</h3>
                    
                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(milestone.status)}`}>
                      {getStatusIcon(milestone.status)}
                      {milestone.status.replace('_', ' ').charAt(0).toUpperCase() + milestone.status.replace('_', ' ').slice(1)}
                    </div>
                    
                    <div className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(milestone.priority)}`}>
                      {milestone.priority.charAt(0).toUpperCase() + milestone.priority.slice(1)}
                    </div>

                    {milestone.requiresApproval && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded border border-yellow-200">
                        Requires Approval
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 mb-4">{milestone.description}</p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Student</p>
                      <p className="text-sm font-medium text-black">{milestone.studentName}</p>
                      <p className="text-xs text-gray-500">{milestone.studentEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Project</p>
                      <p className="text-sm font-medium text-black">{milestone.projectTitle}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Due Date</p>
                      <p className="text-sm font-medium text-black">
                        {new Date(milestone.dueDate).toLocaleDateString()}
                      </p>
                      {milestone.status === 'overdue' && (
                        <p className="text-xs text-red-600">
                          {Math.ceil((new Date().getTime() - new Date(milestone.dueDate).getTime()) / (1000 * 60 * 60 * 24))} days overdue
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Progress</span>
                      <span className="text-xs font-medium text-black">{milestone.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-black h-2 rounded-full transition-all duration-300"
                        style={{ width: `${milestone.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Time Tracking */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span>Estimated: {milestone.estimatedHours}h</span>
                    <span>Actual: {milestone.actualHours}h</span>
                    {milestone.lastSubmissionDate && (
                      <span>Last updated: {new Date(milestone.lastSubmissionDate).toLocaleDateString()}</span>
                    )}
                  </div>

                  {/* Tags */}
                  {milestone.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {milestone.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  <Button size="sm" variant="secondary">
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                  
                  {milestone.requiresApproval && (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprovalAction(milestone, 'approve')}
                      >
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleApprovalAction(milestone, 'revision')}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Request Revision
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleApprovalAction(milestone, 'reject')}
                      >
                        <ThumbsDown className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  
                  <Button size="sm" variant="ghost">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Add Comment
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">
                {approvalAction === 'approve' ? 'Approve Milestone' :
                 approvalAction === 'revision' ? 'Request Revision' : 'Reject Milestone'}
              </h2>
              <Button variant="ghost" onClick={() => setShowApprovalModal(false)}>
                <XCircle className="w-5 h-5" />
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="font-medium text-black mb-2">{selectedMilestone.title}</h3>
              <p className="text-sm text-gray-600 mb-2">Student: {selectedMilestone.studentName}</p>
              <p className="text-sm text-gray-600">Project: {selectedMilestone.projectTitle}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-black mb-2">
                {approvalAction === 'approve' ? 'Feedback (Optional)' : 'Feedback (Required)'}
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={
                  approvalAction === 'approve' ? 'Add any feedback or congratulations...' :
                  approvalAction === 'revision' ? 'Explain what needs to be revised...' :
                  'Explain why this milestone is being rejected...'
                }
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={submitApproval}
                disabled={approvalAction !== 'approve' && !feedback.trim()}
                className="flex-1"
              >
                {approvalAction === 'approve' ? 'Approve' :
                 approvalAction === 'revision' ? 'Request Revision' : 'Reject'}
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowApprovalModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}