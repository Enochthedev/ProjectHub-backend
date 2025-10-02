'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Search, 
  Filter, 
  Star, 
  Users, 
  Clock, 
  MapPin,
  Mail,
  CheckCircle,
  XCircle,
  Heart,
  MessageSquare,
  Calendar,
  Award,
  TrendingUp
} from 'lucide-react';

interface Supervisor {
  id: string;
  name: string;
  email: string;
  specializations: string[];
  currentStudents: number;
  maxCapacity: number;
  isAvailable: boolean;
  averageRating: number;
  totalRatings: number;
  researchInterests: string[];
  officeLocation: string;
  officeHours: string;
  responseTime: string;
  successRate: number;
  recentProjects: Array<{
    title: string;
    year: number;
    outcome: string;
  }>;
  isPreferred?: boolean;
  requestStatus?: 'none' | 'pending' | 'accepted' | 'rejected';
}

interface SupervisorSelectionProps {
  studentId: string;
  onSupervisorRequest: (supervisorId: string, message: string) => Promise<void>;
  onPreferenceUpdate: (supervisorId: string, isPreferred: boolean) => Promise<void>;
}

export default function SupervisorSelection({ 
  studentId, 
  onSupervisorRequest, 
  onPreferenceUpdate 
}: SupervisorSelectionProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [filteredSupervisors, setFilteredSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    fetchSupervisors();
  }, []);

  useEffect(() => {
    filterAndSortSupervisors();
  }, [supervisors, searchQuery, selectedSpecialization, availabilityFilter, sortBy]);

  const fetchSupervisors = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const mockSupervisors: Supervisor[] = [
        {
          id: '1',
          name: 'Dr. Sarah Johnson',
          email: 'sarah.johnson@university.edu',
          specializations: ['Machine Learning', 'Data Science', 'AI'],
          currentStudents: 3,
          maxCapacity: 5,
          isAvailable: true,
          averageRating: 4.8,
          totalRatings: 24,
          researchInterests: ['Deep Learning', 'Computer Vision', 'NLP'],
          officeLocation: 'CS Building, Room 301',
          officeHours: 'Mon-Wed 2-4 PM',
          responseTime: '< 24 hours',
          successRate: 95,
          recentProjects: [
            { title: 'AI-Powered Medical Diagnosis', year: 2024, outcome: 'Published' },
            { title: 'Smart Traffic Management', year: 2023, outcome: 'Award Winner' }
          ],
          isPreferred: false,
          requestStatus: 'none'
        },
        {
          id: '2',
          name: 'Prof. Michael Chen',
          email: 'michael.chen@university.edu',
          specializations: ['Software Engineering', 'Web Development', 'Mobile Apps'],
          currentStudents: 4,
          maxCapacity: 6,
          isAvailable: true,
          averageRating: 4.6,
          totalRatings: 18,
          researchInterests: ['Full-Stack Development', 'Cloud Computing', 'DevOps'],
          officeLocation: 'CS Building, Room 205',
          officeHours: 'Tue-Thu 1-3 PM',
          responseTime: '< 48 hours',
          successRate: 88,
          recentProjects: [
            { title: 'E-Commerce Platform', year: 2024, outcome: 'Industry Partnership' },
            { title: 'Mobile Banking App', year: 2023, outcome: 'Published' }
          ],
          isPreferred: true,
          requestStatus: 'pending'
        },
        {
          id: '3',
          name: 'Dr. Emily Rodriguez',
          email: 'emily.rodriguez@university.edu',
          specializations: ['Cybersecurity', 'Network Security', 'Cryptography'],
          currentStudents: 5,
          maxCapacity: 5,
          isAvailable: false,
          averageRating: 4.9,
          totalRatings: 31,
          researchInterests: ['Blockchain Security', 'IoT Security', 'Privacy'],
          officeLocation: 'CS Building, Room 401',
          officeHours: 'Mon-Fri 10-12 PM',
          responseTime: '< 12 hours',
          successRate: 97,
          recentProjects: [
            { title: 'Blockchain Voting System', year: 2024, outcome: 'Patent Filed' },
            { title: 'IoT Security Framework', year: 2023, outcome: 'Published' }
          ],
          isPreferred: false,
          requestStatus: 'none'
        }
      ];
      
      setSupervisors(mockSupervisors);
      setError(null);
    } catch (err) {
      setError('Failed to load supervisors');
      console.error('Supervisor fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortSupervisors = () => {
    let filtered = [...supervisors];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(supervisor =>
        supervisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supervisor.specializations.some(spec => 
          spec.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        supervisor.researchInterests.some(interest => 
          interest.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Apply specialization filter
    if (selectedSpecialization) {
      filtered = filtered.filter(supervisor =>
        supervisor.specializations.includes(selectedSpecialization)
      );
    }

    // Apply availability filter
    if (availabilityFilter === 'available') {
      filtered = filtered.filter(supervisor => supervisor.isAvailable);
    } else if (availabilityFilter === 'unavailable') {
      filtered = filtered.filter(supervisor => !supervisor.isAvailable);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.averageRating - a.averageRating;
        case 'availability':
          return (b.maxCapacity - b.currentStudents) - (a.maxCapacity - a.currentStudents);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'success':
          return b.successRate - a.successRate;
        default:
          return 0;
      }
    });

    setFilteredSupervisors(filtered);
  };

  const handlePreferenceToggle = async (supervisorId: string) => {
    try {
      const supervisor = supervisors.find(s => s.id === supervisorId);
      if (!supervisor) return;

      const newPreferenceState = !supervisor.isPreferred;
      await onPreferenceUpdate(supervisorId, newPreferenceState);

      setSupervisors(prev => prev.map(s => 
        s.id === supervisorId 
          ? { ...s, isPreferred: newPreferenceState }
          : s
      ));
    } catch (error) {
      console.error('Failed to update preference:', error);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedSupervisor || !requestMessage.trim()) return;

    try {
      await onSupervisorRequest(selectedSupervisor.id, requestMessage);
      
      setSupervisors(prev => prev.map(s => 
        s.id === selectedSupervisor.id 
          ? { ...s, requestStatus: 'pending' }
          : s
      ));
      
      setShowRequestModal(false);
      setRequestMessage('');
      setSelectedSupervisor(null);
    } catch (error) {
      console.error('Failed to send request:', error);
    }
  };

  const getAvailabilityBadge = (supervisor: Supervisor) => {
    const availableSlots = supervisor.maxCapacity - supervisor.currentStudents;
    
    if (!supervisor.isAvailable) {
      return <Badge variant="destructive">Unavailable</Badge>;
    } else if (availableSlots === 0) {
      return <Badge variant="warning">Full Capacity</Badge>;
    } else if (availableSlots <= 1) {
      return <Badge variant="warning">{availableSlots} Slot Left</Badge>;
    } else {
      return <Badge variant="success">{availableSlots} Slots Available</Badge>;
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Request Pending</Badge>;
      case 'accepted':
        return <Badge variant="success">Request Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Request Rejected</Badge>;
      default:
        return null;
    }
  };

  const specializations = Array.from(
    new Set(supervisors.flatMap(s => s.specializations))
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-64 w-full" />
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
        <Button onClick={fetchSupervisors}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-black">Choose Your Supervisor</h2>
          <p className="text-gray-600">
            Browse available supervisors and send requests to those who match your interests.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name, specialization, or research interests..."
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              className="pl-10"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 focus:border-black"
          >
            <option value="rating">Sort by Rating</option>
            <option value="availability">Sort by Availability</option>
            <option value="name">Sort by Name</option>
            <option value="success">Sort by Success Rate</option>
          </select>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
              >
                <option value="">All Specializations</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
              >
                <option value="all">All Supervisors</option>
                <option value="available">Available Only</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Supervisors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSupervisors.map((supervisor) => (
          <Card key={supervisor.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-600">
                    {supervisor.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-black">{supervisor.name}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-3 h-3" />
                    <span>{supervisor.email}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreferenceToggle(supervisor.id)}
                  className={supervisor.isPreferred ? 'text-red-600' : 'text-gray-400'}
                >
                  <Heart className={`w-4 h-4 ${supervisor.isPreferred ? 'fill-current' : ''}`} />
                </Button>
                {getRequestStatusBadge(supervisor.requestStatus || 'none')}
              </div>
            </div>

            {/* Rating and Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-center">
              <div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="font-bold text-black">{supervisor.averageRating}</span>
                </div>
                <p className="text-xs text-gray-600">{supervisor.totalRatings} reviews</p>
              </div>
              <div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-black">
                    {supervisor.currentStudents}/{supervisor.maxCapacity}
                  </span>
                </div>
                <p className="text-xs text-gray-600">Students</p>
              </div>
              <div>
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-black">{supervisor.successRate}%</span>
                </div>
                <p className="text-xs text-gray-600">Success Rate</p>
              </div>
            </div>

            {/* Availability Status */}
            <div className="mb-4">
              {getAvailabilityBadge(supervisor)}
            </div>

            {/* Specializations */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Specializations:</p>
              <div className="flex flex-wrap gap-1">
                {supervisor.specializations.map((spec, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {spec}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Research Interests */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Research Interests:</p>
              <p className="text-sm text-gray-600">
                {supervisor.researchInterests.join(', ')}
              </p>
            </div>

            {/* Office Info */}
            <div className="mb-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2 mb-1">
                <MapPin className="w-3 h-3" />
                <span>{supervisor.officeLocation}</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <Clock className="w-3 h-3" />
                <span>{supervisor.officeHours}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3 h-3" />
                <span>Responds in {supervisor.responseTime}</span>
              </div>
            </div>

            {/* Recent Projects */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Recent Projects:</p>
              <div className="space-y-1">
                {supervisor.recentProjects.slice(0, 2).map((project, index) => (
                  <div key={index} className="text-xs text-gray-600">
                    <span className="font-medium">{project.title}</span> ({project.year}) - {project.outcome}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                disabled={!supervisor.isAvailable || supervisor.requestStatus === 'pending'}
                onClick={() => {
                  setSelectedSupervisor(supervisor);
                  setShowRequestModal(true);
                }}
              >
                {supervisor.requestStatus === 'pending' ? 'Request Sent' : 'Send Request'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // TODO: Open supervisor profile modal
                  console.log('View profile:', supervisor.id);
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredSupervisors.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No supervisors found</h3>
          <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
        </Card>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedSupervisor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-black mb-4">
              Send Request to {selectedSupervisor.name}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (Required)
                </label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Introduce yourself and explain why you'd like this supervisor to guide your project..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={4}
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleSendRequest}
                  disabled={!requestMessage.trim()}
                  className="flex-1"
                >
                  Send Request
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestMessage('');
                    setSelectedSupervisor(null);
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