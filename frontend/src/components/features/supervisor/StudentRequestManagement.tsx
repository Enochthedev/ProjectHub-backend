'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Mail,
  Calendar,
  Star,
  Award,
  TrendingUp,
  MessageSquare,
  User,
  GraduationCap,
  BookOpen
} from 'lucide-react';

interface StudentRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentProfile: {
    year: number;
    specialization: string;
    gpa: number;
    skills: string[];
    interests: string[];
    previousProjects: Array<{
      title: string;
      description: string;
      technologies: string[];
      outcome: string;
    }>;
  };
  requestMessage: string;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  priority: 'low' | 'normal' | 'high';
  matchScore: number;
  preferredProject?: {
    title: string;
    description: string;
    specialization: string;
  };
}

interface StudentRequestManagementProps {
  supervisorId: string;
  onAcceptRequest: (requestId: string, message?: string) => Promise<void>;
  onRejectRequest: (requestId: string, reason: string) => Promise<void>;
}

export default function StudentRequestManagement({ 
  supervisorId, 
  onAcceptRequest, 
  onRejectRequest 
}: StudentRequestManagementProps) {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedRequest, setSelectedRequest] = useState<StudentRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  const [acceptMessage, setAcceptMessage] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [sortBy, setSortBy] = useState<'date' | 'match' | 'priority'>('date');

  useEffect(() => {
    fetchRequests();
  }, [supervisorId]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const mockRequests: StudentRequest[] = [
        {
          id: '1',
          studentId: 'student1',
          studentName: 'Alice Johnson',
          studentEmail: 'alice.johnson@student.edu',
          studentProfile: {
            year: 3,
            specialization: 'Machine Learning',
            gpa: 3.8,
            skills: ['Python', 'TensorFlow', 'React', 'Node.js'],
            interests: ['Computer Vision', 'Deep Learning', 'AI Ethics'],
            previousProjects: [
              {
                title: 'Image Classification System',
                description: 'Built a CNN model for medical image classification',
                technologies: ['Python', 'TensorFlow', 'OpenCV'],
                outcome: 'A+ Grade, Presented at Student Conference'
              }
            ]
          },
          requestMessage: 'Dear Dr. Smith, I am very interested in working under your supervision for my final year project. I have a strong background in machine learning and would love to contribute to your research in computer vision. I have completed several projects in this area and am particularly interested in medical AI applications.',
          requestedAt: '2024-01-15T10:30:00Z',
          status: 'pending',
          priority: 'high',
          matchScore: 92,
          preferredProject: {
            title: 'AI-Powered Medical Diagnosis System',
            description: 'Develop a machine learning system for automated medical diagnosis',
            specialization: 'Machine Learning'
          }
        },
        {
          id: '2',
          studentId: 'student2',
          studentName: 'Bob Chen',
          studentEmail: 'bob.chen@student.edu',
          studentProfile: {
            year: 4,
            specialization: 'Data Science',
            gpa: 3.6,
            skills: ['Python', 'R', 'SQL', 'Tableau'],
            interests: ['Data Analytics', 'Business Intelligence', 'Statistics'],
            previousProjects: [
              {
                title: 'Sales Prediction Model',
                description: 'Created predictive models for retail sales forecasting',
                technologies: ['Python', 'Scikit-learn', 'Pandas'],
                outcome: 'B+ Grade, Used by Local Business'
              }
            ]
          },
          requestMessage: 'Hello Professor, I would like to request your supervision for my capstone project. I have experience in data science and analytics, and I believe your expertise would be invaluable for my project on predictive modeling.',
          requestedAt: '2024-01-14T14:20:00Z',
          status: 'pending',
          priority: 'normal',
          matchScore: 78,
        },
        {
          id: '3',
          studentId: 'student3',
          studentName: 'Carol Davis',
          studentEmail: 'carol.davis@student.edu',
          studentProfile: {
            year: 3,
            specialization: 'Software Engineering',
            gpa: 3.9,
            skills: ['Java', 'Spring Boot', 'React', 'Docker'],
            interests: ['Web Development', 'Microservices', 'Cloud Computing'],
            previousProjects: [
              {
                title: 'E-Commerce Platform',
                description: 'Full-stack web application with microservices architecture',
                technologies: ['Java', 'Spring Boot', 'React', 'PostgreSQL'],
                outcome: 'A Grade, Open Source Project'
              }
            ]
          },
          requestMessage: 'Dear Dr. Smith, I am reaching out to express my interest in having you as my supervisor. While my background is in software engineering, I am very interested in exploring the intersection of AI and web development.',
          requestedAt: '2024-01-13T09:15:00Z',
          status: 'accepted',
          priority: 'normal',
          matchScore: 65,
        }
      ];
      
      setRequests(mockRequests);
      setError(null);
    } catch (err) {
      setError('Failed to load student requests');
      console.error('Request fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest) return;
    
    try {
      await onAcceptRequest(selectedRequest.id, acceptMessage);
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'accepted' as const }
          : req
      ));
      setShowAcceptModal(false);
      setAcceptMessage('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    
    try {
      await onRejectRequest(selectedRequest.id, rejectReason);
      setRequests(prev => prev.map(req => 
        req.id === selectedRequest.id 
          ? { ...req, status: 'rejected' as const }
          : req
      ));
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'normal':
        return <Badge variant="outline">Normal</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Priority</Badge>;
      default:
        return null;
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredRequests = requests
    .filter(req => filterStatus === 'all' || req.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
        case 'match':
          return b.matchScore - a.matchScore;
        case 'priority':
          const priorityOrder = { high: 3, normal: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-32 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchRequests}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Student Requests</h2>
          <p className="text-gray-600">
            Review and manage student supervision requests.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border-2 border-gray-300 focus:border-black"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border-2 border-gray-300 focus:border-black"
          >
            <option value="date">Sort by Date</option>
            <option value="match">Sort by Match Score</option>
            <option value="priority">Sort by Priority</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
          <p className="text-2xl font-bold text-black">
            {requests.filter(r => r.status === 'pending').length}
          </p>
          <p className="text-sm text-gray-600">Pending</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
          <p className="text-2xl font-bold text-black">
            {requests.filter(r => r.status === 'accepted').length}
          </p>
          <p className="text-sm text-gray-600">Accepted</p>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
          <p className="text-2xl font-bold text-black">
            {requests.filter(r => r.status === 'rejected').length}
          </p>
          <p className="text-sm text-gray-600">Rejected</p>
        </Card>
        <Card className="p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-blue-600" />
          <p className="text-2xl font-bold text-black">
            {Math.round(requests.reduce((sum, r) => sum + r.matchScore, 0) / requests.length) || 0}%
          </p>
          <p className="text-sm text-gray-600">Avg Match</p>
        </Card>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">{request.studentName}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-3 h-3" />
                    <span>{request.studentEmail}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <GraduationCap className="w-3 h-3" />
                    <span>Year {request.studentProfile.year} • {request.studentProfile.specialization}</span>
                    <span>• GPA: {request.studentProfile.gpa}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {getPriorityBadge(request.priority)}
                {getStatusBadge(request.status)}
              </div>
            </div>

            {/* Match Score */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Match Score</span>
                <span className={`text-sm font-bold ${getMatchScoreColor(request.matchScore)}`}>
                  {request.matchScore}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    request.matchScore >= 90 ? 'bg-green-500' :
                    request.matchScore >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${request.matchScore}%` }}
                />
              </div>
            </div>

            {/* Skills */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
              <div className="flex flex-wrap gap-1">
                {request.studentProfile.skills.map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Request Message Preview */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {request.requestMessage}
              </p>
            </div>

            {/* Preferred Project */}
            {request.preferredProject && (
              <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="flex items-center space-x-2 mb-1">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Preferred Project</span>
                </div>
                <p className="text-sm font-medium text-black">{request.preferredProject.title}</p>
                <p className="text-xs text-gray-600">{request.preferredProject.description}</p>
              </div>
            )}

            {/* Request Date */}
            <div className="mb-4 text-xs text-gray-500">
              <Calendar className="w-3 h-3 inline mr-1" />
              Requested on {new Date(request.requestedAt).toLocaleDateString()}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedRequest(request);
                  setShowDetailModal(true);
                }}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Details
              </Button>
              
              {request.status === 'pending' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowAcceptModal(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedRequest(request);
                      setShowRejectModal(true);
                    }}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No requests found</h3>
          <p className="text-gray-500">
            {filterStatus === 'all' 
              ? 'No student requests yet.' 
              : `No ${filterStatus} requests.`}
          </p>
        </Card>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-black">
                Request from {selectedRequest.studentName}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailModal(false)}
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Student Profile Details */}
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-black mb-2">Student Profile</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Year:</span>
                    <span className="ml-2 font-medium">{selectedRequest.studentProfile.year}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">GPA:</span>
                    <span className="ml-2 font-medium">{selectedRequest.studentProfile.gpa}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Specialization:</span>
                    <span className="ml-2 font-medium">{selectedRequest.studentProfile.specialization}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Match Score:</span>
                    <span className={`ml-2 font-bold ${getMatchScoreColor(selectedRequest.matchScore)}`}>
                      {selectedRequest.matchScore}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-black mb-2">Skills & Interests</h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-600">Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedRequest.studentProfile.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Interests:</span>
                    <p className="text-sm text-black mt-1">
                      {selectedRequest.studentProfile.interests.join(', ')}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-black mb-2">Previous Projects</h4>
                <div className="space-y-3">
                  {selectedRequest.studentProfile.previousProjects.map((project, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <h5 className="font-medium text-black">{project.title}</h5>
                      <p className="text-sm text-gray-600 mb-2">{project.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {project.technologies.map((tech, techIndex) => (
                          <Badge key={techIndex} variant="secondary" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-green-600">
                        <Award className="w-3 h-3" />
                        <span>{project.outcome}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-black mb-2">Request Message</h4>
                <div className="p-3 bg-gray-50 rounded border">
                  <p className="text-sm text-gray-700">{selectedRequest.requestMessage}</p>
                </div>
              </div>

              {selectedRequest.preferredProject && (
                <div>
                  <h4 className="font-medium text-black mb-2">Preferred Project</h4>
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <h5 className="font-medium text-black">{selectedRequest.preferredProject.title}</h5>
                    <p className="text-sm text-gray-600">{selectedRequest.preferredProject.description}</p>
                    <Badge variant="outline" className="text-xs mt-2">
                      {selectedRequest.preferredProject.specialization}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Accept Modal */}
      {showAcceptModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-black mb-4">
              Accept Request from {selectedRequest.studentName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message (Optional)
                </label>
                <textarea
                  value={acceptMessage}
                  onChange={(e) => setAcceptMessage(e.target.value)}
                  placeholder="Welcome message for the student..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleAccept} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Request
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAcceptModal(false);
                    setAcceptMessage('');
                    setSelectedRequest(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-black mb-4">
              Reject Request from {selectedRequest.studentName}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection (Required)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please provide a constructive reason for rejection..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={3}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={handleReject}
                  disabled={!rejectReason.trim()}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Request
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedRequest(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}