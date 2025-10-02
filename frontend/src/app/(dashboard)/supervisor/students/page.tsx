'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Progress from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  MessageSquare,
  Calendar,
  Eye,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react';
import { useSupervisorStore } from '@/stores/supervisor';
import { supervisorApi } from '@/lib/supervisor-api';
import { StudentProgressSummary, AtRiskStudent } from '@/types/supervisor';

export default function SupervisorStudentsPage() {
  // Local state for students functionality
  const [studentProgress, setStudentProgress] = useState<StudentProgressSummary[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [filteredStudents, setFilteredStudents] = useState<StudentProgressSummary[]>([]);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        const [progressData, riskData] = await Promise.all([
          supervisorApi.getStudentProgress(),
          supervisorApi.getAtRiskStudents()
        ]);
        
        setStudentProgress(progressData);
        setAtRiskStudents(riskData);
        setError(null);
      } catch (err) {
        setError('Failed to load student data');
        console.error('Student data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [setStudentProgress, setAtRiskStudents, setLoading, setError]);

  useEffect(() => {
    let filtered = [...studentProgress];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(student =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply risk filter
    if (riskFilter !== 'all') {
      const riskStudentIds = atRiskStudents
        .filter(student => student.riskLevel === riskFilter)
        .map(student => student.studentId);
      
      filtered = filtered.filter(student => 
        riskFilter === 'at-risk' 
          ? riskStudentIds.includes(student.studentId)
          : !riskStudentIds.includes(student.studentId)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.studentName.localeCompare(b.studentName);
        case 'progress':
          return b.completionRate - a.completionRate;
        case 'risk':
          return b.riskScore - a.riskScore;
        case 'activity':
          if (!a.lastActivity && !b.lastActivity) return 0;
          if (!a.lastActivity) return 1;
          if (!b.lastActivity) return -1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        default:
          return 0;
      }
    });

    setFilteredStudents(filtered);
  }, [studentProgress, atRiskStudents, searchQuery, riskFilter, sortBy]);

  const getRiskLevel = (studentId: string): 'low' | 'medium' | 'high' | null => {
    const riskStudent = atRiskStudents.find(student => student.studentId === studentId);
    return riskStudent?.riskLevel || null;
  };

  const getRiskColor = (riskLevel: string | null) => {
    switch (riskLevel) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleViewStudent = async (studentId: string) => {
    try {
      const studentOverview = await supervisorApi.getStudentOverview(studentId);
      setSelectedStudent(studentOverview);
      // Navigate to student detail page or open modal
    } catch (err) {
      console.error('Failed to load student overview:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
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
            <h1 className="text-3xl font-bold text-black mb-2">Student Progress</h1>
            <p className="text-gray-600">
              Monitor and manage your supervised students' progress.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-black">{(studentProgress || []).length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Risk</p>
                <p className="text-2xl font-bold text-red-600">{(atRiskStudents || []).length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Progress</p>
                <p className="text-2xl font-bold text-black">
                  {(studentProgress || []).length > 0 
                    ? Math.round((studentProgress || []).reduce((sum, s) => sum + s.completionRate, 0) / (studentProgress || []).length)
                    : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">On Track</p>
                <p className="text-2xl font-bold text-green-600">
                  {(studentProgress || []).filter(s => s.completionRate >= 70).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="all">All Students</option>
              <option value="at-risk">At Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="name">Sort by Name</option>
              <option value="progress">Sort by Progress</option>
              <option value="risk">Sort by Risk</option>
              <option value="activity">Sort by Activity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      {(filteredStudents || []).length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-black mb-2">No Students Found</h3>
          <p className="text-gray-600">
            {searchQuery || riskFilter !== 'all' 
              ? 'No students match your current filters.' 
              : 'You don\'t have any supervised students yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredStudents.map((student) => {
            const riskLevel = getRiskLevel(student.studentId);
            const riskStudent = atRiskStudents.find(r => r.studentId === student.studentId);
            
            return (
              <Card key={student.studentId} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-gray-600">
                        {student.studentName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-black">
                          {student.studentName}
                        </h3>
                        {riskLevel && (
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskColor(riskLevel)}`}>
                            {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{student.studentEmail}</p>

                      {/* Progress Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Completion Rate</p>
                          <p className={`text-sm font-semibold ${getProgressColor(student.completionRate)}`}>
                            {student.completionRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Milestones</p>
                          <p className="text-sm font-semibold text-black">
                            {student.completedMilestones}/{student.totalMilestones}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Overdue</p>
                          <p className={`text-sm font-semibold ${student.overdueMilestones > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {student.overdueMilestones}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Last Activity</p>
                          <p className="text-sm font-semibold text-black">
                            {student.lastActivity 
                              ? new Date(student.lastActivity).toLocaleDateString()
                              : 'No activity'
                            }
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Overall Progress</span>
                          <span className="text-xs font-medium text-black">
                            {student.completionRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={student.completionRate} />
                      </div>

                      {/* Risk Factors */}
                      {riskStudent && (riskStudent.riskFactors || []).length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-2">Risk Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {(riskStudent.riskFactors || []).slice(0, 3).map((factor, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded border border-red-200"
                              >
                                {factor}
                              </span>
                            ))}
                            {(riskStudent.riskFactors || []).length > 3 && (
                              <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded border border-gray-200">
                                +{(riskStudent.riskFactors || []).length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Next Milestone */}
                      {student.nextMilestone && (
                        <div className="bg-gray-50 p-3 rounded border">
                          <p className="text-xs text-gray-500 mb-1">Next Milestone:</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-black">
                              {student.nextMilestone.title}
                            </span>
                            <span className="text-xs text-gray-600">
                              Due {new Date(student.nextMilestone.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleViewStudent(student.studentId)}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}