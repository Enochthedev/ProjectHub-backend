'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Star,
  BarChart3,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useProjectStore } from '@/stores/project';
import { supervisorApi } from '@/lib/supervisor-api';
import { Project } from '@/types/project';
import { useRouter } from 'next/navigation';

export default function SupervisorProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScoringModal, setShowScoringModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({
    title: '',
    abstract: '',
    specialization: '',
    difficultyLevel: 'intermediate',
    technologyStack: [] as string[]
  });

  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        const projectsData = await supervisorApi.getSupervisorProjects();
        setProjects(projectsData);
        setFilteredProjects(projectsData);
        setError(null);
      } catch (err) {
        setError('Failed to load projects');
        console.error('Projects error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  useEffect(() => {
    let filtered = projects;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.abstract.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.approvalStatus === statusFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'archived':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Action handlers
  const handleViewProject = (project: Project) => {
    router.push(`/projects/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    router.push(`/projects/${project.id}/edit`);
  };

  const handleViewStudents = (project: Project) => {
    router.push(`/supervisor/students?project=${project.id}`);
  };

  const handleViewAnalytics = (project: Project) => {
    router.push(`/supervisor/analytics?project=${project.id}`);
  };

  const handleScoreProject = (project: Project) => {
    setSelectedProject(project);
    setShowScoringModal(true);
  };

  const handleCreateProject = async () => {
    try {
      await supervisorApi.createProject(newProject);
      setShowCreateModal(false);
      setNewProject({
        title: '',
        abstract: '',
        specialization: '',
        difficultyLevel: 'intermediate',
        technologyStack: []
      });
      // Refresh projects
      const projectsData = await supervisorApi.getSupervisorProjects();
      setProjects(projectsData);
      setFilteredProjects(projectsData);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const addTechnology = (tech: string) => {
    if (tech && !newProject.technologyStack.includes(tech)) {
      setNewProject(prev => ({
        ...prev,
        technologyStack: [...prev.technologyStack, tech]
      }));
    }
  };

  const removeTechnology = (tech: string) => {
    setNewProject(prev => ({
      ...prev,
      technologyStack: prev.technologyStack.filter(t => t !== tech)
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-8 w-full" />
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
            <h1 className="text-3xl font-bold text-black mb-2">My Projects</h1>
            <p className="text-gray-600">
              Manage your supervised projects and applications.
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>

        {/* Project Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Projects</p>
                <p className="text-2xl font-bold text-black">{projects.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter(p => p.approvalStatus === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {projects.filter(p => p.approvalStatus === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Success</p>
                <p className="text-2xl font-bold text-black">
                  {projects.length > 0 
                    ? Math.round(projects.reduce((sum, p) => sum + (p.successScore || 0), 0) / projects.length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
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
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
            <select
              className="px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="all">All Years</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
            <Button variant="secondary">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-black mb-2">No Projects Found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || statusFilter !== 'all' 
              ? 'No projects match your current filters.' 
              : 'You haven\'t created any projects yet.'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-black mb-2 line-clamp-2">
                    {project.title}
                  </h3>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(project.approvalStatus)}`}>
                    {getStatusIcon(project.approvalStatus)}
                    {project.approvalStatus.charAt(0).toUpperCase() + project.approvalStatus.slice(1)}
                  </div>
                </div>
                <div className="relative">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {project.abstract}
              </p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Specialization:</span>
                  <span className="font-medium text-black">{project.specialization}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Difficulty:</span>
                  <span className="font-medium text-black capitalize">{project.difficultyLevel}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Views:</span>
                  <span className="font-medium text-black">{project.viewCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Bookmarks:</span>
                  <span className="font-medium text-black">{project.bookmarkCount}</span>
                </div>
                
                {/* Success Metrics */}
                {project.successScore && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Success Rate:</span>
                    <span className={`font-medium ${
                      project.successScore >= 80 ? 'text-green-600' :
                      project.successScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {project.successScore}%
                    </span>
                  </div>
                )}
                
                {project.averageGrade && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Avg Grade:</span>
                    <span className="font-medium text-black">{project.averageGrade}%</span>
                  </div>
                )}
                
                {project.completionRate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Completion:</span>
                    <span className="font-medium text-black">{project.completionRate}%</span>
                  </div>
                )}
              </div>

              {/* Technology Stack */}
              {project.technologyStack.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {project.technologyStack.slice(0, 3).map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tech}
                      </span>
                    ))}
                    {project.technologyStack.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        +{project.technologyStack.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => handleViewProject(project)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleEditProject(project)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => handleViewStudents(project)}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Students ({Math.floor(Math.random() * 5) + 1})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="flex-1"
                    onClick={() => handleViewAnalytics(project)}
                  >
                    <BarChart3 className="w-3 h-3 mr-1" />
                    Analytics
                  </Button>
                </div>
                {project.approvalStatus === 'approved' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleScoreProject(project)}
                  >
                    <Star className="w-3 h-3 mr-1" />
                    Score Project
                  </Button>
                )}
              </div>

              {/* Created Date */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  Created {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black">Create New Project</h2>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title *
                  </label>
                  <Input
                    value={newProject.title}
                    onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., AI-Powered Student Learning Analytics Platform"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Provide a clear, descriptive title for your project idea
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brief Description *
                  </label>
                  <textarea
                    value={newProject.abstract}
                    onChange={(e) => setNewProject(prev => ({ ...prev, abstract: e.target.value }))}
                    placeholder="Briefly describe what you want students to work on..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none h-24 resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    A short overview of the project concept. Students will work with you to develop detailed requirements.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization *
                    </label>
                    <select
                      value={newProject.specialization}
                      onChange={(e) => setNewProject(prev => ({ ...prev, specialization: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
                    >
                      <option value="">Select specialization</option>
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Data Science">Data Science</option>
                      <option value="Machine Learning">Machine Learning</option>
                      <option value="Web Development">Web Development</option>
                      <option value="Mobile Development">Mobile Development</option>
                      <option value="DevOps">DevOps</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Difficulty Level
                    </label>
                    <select
                      value={newProject.difficultyLevel}
                      onChange={(e) => setNewProject(prev => ({ ...prev, difficultyLevel: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suggested Technologies (Optional)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add technology (e.g., React, Python)"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addTechnology(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        addTechnology(input.value);
                        input.value = '';
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {newProject.technologyStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded flex items-center gap-1"
                      >
                        {tech}
                        <button
                          onClick={() => removeTechnology(tech)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Optional: Suggest technologies you'd like students to explore. Students can propose alternatives.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="font-medium text-sm mb-2">📝 What happens next?</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Your project idea will be published for students to discover</li>
                    <li>• Interested students will apply and propose detailed implementations</li>
                    <li>• You'll review applications and select the best student proposals</li>
                    <li>• Work with selected students to refine requirements and scope</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={!newProject.title || !newProject.abstract || !newProject.specialization}
                  className="flex-1"
                >
                  Publish Project Idea
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Project Scoring Modal */}
      {showScoringModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-black">Score Project</h2>
                <Button variant="ghost" onClick={() => setShowScoringModal(false)}>
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2">{selectedProject.title}</h3>
                <p className="text-gray-600 text-sm">{selectedProject.abstract}</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h4 className="font-medium mb-2">Current Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Success Rate:</span>
                        <span className="font-medium">{selectedProject.successScore || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completion Rate:</span>
                        <span className="font-medium">{selectedProject.completionRate || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Average Grade:</span>
                        <span className="font-medium">{selectedProject.averageGrade || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded">
                    <h4 className="font-medium mb-2">Project Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Views:</span>
                        <span className="font-medium">{selectedProject.viewCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bookmarks:</span>
                        <span className="font-medium">{selectedProject.bookmarkCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Difficulty:</span>
                        <span className="font-medium capitalize">{selectedProject.difficultyLevel}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Scoring Categories</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Learning Outcomes (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        defaultValue="7"
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Industry Relevance (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        defaultValue="8"
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Technical Complexity (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        defaultValue="6"
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Simple</span>
                        <span>Complex</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Engagement (1-10)
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        defaultValue="7"
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments
                  </label>
                  <textarea
                    placeholder="Add any additional feedback or observations..."
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                <Button
                  variant="secondary"
                  onClick={() => setShowScoringModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Here you would save the scoring data
                    setShowScoringModal(false);
                  }}
                  className="flex-1"
                >
                  Save Score
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}