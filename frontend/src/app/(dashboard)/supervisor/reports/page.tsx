'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Download, 
  FileText, 
  Calendar, 
  Filter,
  Users,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  X
} from 'lucide-react';
import { useSupervisorStore } from '@/stores/supervisor';
import { supervisorApi } from '@/lib/supervisor-api';
import { ProgressReportFilters, SupervisorReport } from '@/types/supervisor';

export default function SupervisorReportsPage() {
  // Local state for reports functionality
  const [currentReport, setCurrentReport] = useState<SupervisorReport | null>(null);
  const [reportFilters, setReportFilters] = useState<ProgressReportFilters>({});
  const [exportedReport, setExportedReport] = useState<any>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [showAllReports, setShowAllReports] = useState(false);
  const [viewingReport, setViewingReport] = useState<string | null>(null);

  const clearReportFilters = () => {
    setReportFilters({});
    setSelectedStudents([]);
    setDateRange({
      startDate: '',
      endDate: ''
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    // Set default date range to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setDateRange({
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0]
    });
  }, []);

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const filters: ProgressReportFilters = {
        ...reportFilters,
        studentIds: selectedStudents.length > 0 ? selectedStudents : undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      };

      const report = await supervisorApi.generateReport(filters);
      setCurrentReport(report);
      setReportFilters(filters);
    } catch (err) {
      setError('Failed to generate report');
      console.error('Report generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportReport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      setError(null);

      const filters: ProgressReportFilters = {
        ...reportFilters,
        studentIds: selectedStudents.length > 0 ? selectedStudents : undefined,
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
      };

      const exportedReport = await supervisorApi.exportReport(format, filters);
      setExportedReport(exportedReport);

      // Download the file
      const blob = new Blob([atob(exportedReport.content)], { type: exportedReport.mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportedReport.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export report');
      console.error('Report export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleStudentSelection = (studentId: string, selected: boolean) => {
    if (selected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAllStudents = () => {
    const studentProgressArray = studentProgress || [];
    if (selectedStudents.length === studentProgressArray.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(studentProgressArray.map(s => s.studentId));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <Skeleton className="h-64 w-full" />
          </Card>
          <Card className="lg:col-span-2 p-6">
            <Skeleton className="h-64 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Progress Reports</h1>
            <p className="text-gray-600">
              Generate and export comprehensive progress reports for your students.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.location.href = '/supervisor/reports/templates'}>
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-black mb-6">Report Configuration</h2>

          {/* Date Range */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Date Range
            </label>
            <div className="space-y-2">
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Student Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-black">
                Students ({selectedStudents.length} selected)
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSelectAllStudents}
              >
                {selectedStudents.length === (studentProgress || []).length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded">
              {studentProgress.map((student) => (
                <label
                  key={student.studentId}
                  className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.studentId)}
                    onChange={(e) => handleStudentSelection(student.studentId, e.target.checked)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black">{student.studentName}</p>
                    <p className="text-xs text-gray-500">{student.completionRate.toFixed(1)}% complete</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Milestone Status
            </label>
            <select
              value={reportFilters.status || 'all'}
              onChange={(e) => setReportFilters({ status: e.target.value === 'all' ? undefined : e.target.value as any })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-black mb-2">
              Priority Level
            </label>
            <select
              value={reportFilters.priority || 'all'}
              onChange={(e) => setReportFilters({ priority: e.target.value === 'all' ? undefined : e.target.value as any })}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              fullWidth
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>

            {currentReport && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleExportReport('pdf')}
                  disabled={isExporting}
                >
                  <Download className="w-3 h-3 mr-1" />
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => handleExportReport('csv')}
                  disabled={isExporting}
                >
                  <Download className="w-3 h-3 mr-1" />
                  CSV
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              fullWidth
              onClick={clearReportFilters}
            >
              Clear Filters
            </Button>
          </div>
        </Card>

        {/* Report Display */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-black">Report Results</h2>
            {currentReport && (
              <span className="text-sm text-gray-500">
                Generated {new Date(currentReport.generatedAt).toLocaleString()}
              </span>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!currentReport ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-black mb-2">No Report Generated</h3>
              <p className="text-gray-600 mb-6">
                Configure your report settings and click "Generate Report" to view results.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-black">{currentReport.summary.totalStudents}</p>
                  <p className="text-sm text-gray-600">Students</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-black">{currentReport.summary.totalMilestones}</p>
                  <p className="text-sm text-gray-600">Milestones</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-black">{currentReport.summary.completionRate.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Completion</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-black">{currentReport.summary.atRiskStudents}</p>
                  <p className="text-sm text-gray-600">At Risk</p>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="text-lg font-semibold text-black mb-4">Detailed Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Milestones:</span>
                    <span className="font-medium text-black">{currentReport.metrics.totalMilestones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium text-green-600">{currentReport.metrics.completedMilestones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Overdue:</span>
                    <span className="font-medium text-red-600">{currentReport.metrics.overdueMilestones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Blocked:</span>
                    <span className="font-medium text-yellow-600">{currentReport.metrics.blockedMilestones}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Velocity:</span>
                    <span className="font-medium text-black">{currentReport.metrics.averageProgressVelocity.toFixed(1)}/week</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">At Risk Count:</span>
                    <span className="font-medium text-red-600">{currentReport.metrics.atRiskStudentCount}</span>
                  </div>
                </div>
              </div>

              {/* Student Data Preview */}
              <div>
                <h3 className="text-lg font-semibold text-black mb-4">Student Progress Overview</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {(currentReport.studentData || []).slice(0, 10).map((studentData) => (
                    <div key={studentData.studentId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-medium text-black">{studentData.studentName}</p>
                        <p className="text-sm text-gray-600">
                          {studentData.progressSummary.completedMilestones}/{studentData.progressSummary.totalMilestones} milestones
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-black">
                          {studentData.progressSummary.completionRate.toFixed(1)}%
                        </p>
                        {studentData.progressSummary.overdueMilestones > 0 && (
                          <p className="text-xs text-red-600">
                            {studentData.progressSummary.overdueMilestones} overdue
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(currentReport.studentData || []).length > 10 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... and {(currentReport.studentData || []).length - 10} more students
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Reports History */}
      <Card className="mt-6 p-6">
        <h2 className="text-xl font-semibold text-black mb-4">Recent Reports</h2>
        <div className="space-y-3">
          {[
            {
              id: 'report-1',
              name: 'Monthly Progress Report - March 2024',
              generatedAt: '2024-03-15T14:30:00Z',
              studentsCount: 8,
              format: 'PDF',
              size: '2.4 MB'
            },
            {
              id: 'report-2',
              name: 'At-Risk Students Analysis',
              generatedAt: '2024-03-10T09:15:00Z',
              studentsCount: 3,
              format: 'CSV',
              size: '156 KB'
            },
            {
              id: 'report-3',
              name: 'Weekly Progress Summary',
              generatedAt: '2024-03-08T16:45:00Z',
              studentsCount: 8,
              format: 'PDF',
              size: '1.8 MB'
            }
          ].map((report) => (
            <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="font-medium text-black">{report.name}</p>
                  <p className="text-sm text-gray-600">
                    {report.studentsCount} students • {report.format} • {report.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {new Date(report.generatedAt).toLocaleDateString()}
                </span>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDownloadReport(report.id, report.format.toLowerCase())}
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setViewingReport(report.id)}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAllReports(true)}
          >
            View All Reports History
          </Button>
        </div>
      </Card>

      {/* All Reports History Modal */}
      {showAllReports && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">All Reports History</h2>
                <p className="text-sm text-gray-600 mt-1">Complete history of generated reports</p>
              </div>
              <button 
                onClick={() => setShowAllReports(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[
                  { id: 'report-1', name: 'Monthly Progress Report - March 2024', generatedAt: '2024-03-15T14:30:00Z', studentsCount: 8, format: 'PDF', size: '2.4 MB' },
                  { id: 'report-2', name: 'At-Risk Students Analysis', generatedAt: '2024-03-10T09:15:00Z', studentsCount: 3, format: 'CSV', size: '156 KB' },
                  { id: 'report-3', name: 'Weekly Progress Summary', generatedAt: '2024-03-08T16:45:00Z', studentsCount: 8, format: 'PDF', size: '1.8 MB' },
                  { id: 'report-4', name: 'Q1 Comprehensive Report', generatedAt: '2024-03-01T10:00:00Z', studentsCount: 8, format: 'PDF', size: '3.2 MB' },
                  { id: 'report-5', name: 'February Progress Report', generatedAt: '2024-02-28T15:30:00Z', studentsCount: 7, format: 'PDF', size: '2.1 MB' },
                  { id: 'report-6', name: 'Mid-Semester Review', generatedAt: '2024-02-15T11:00:00Z', studentsCount: 8, format: 'PDF', size: '2.8 MB' },
                ].map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded border hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-black">{report.name}</p>
                        <p className="text-sm text-gray-600">
                          {report.studentsCount} students • {report.format} • {report.size} • {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDownloadReport(report.id, report.format.toLowerCase())}
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setViewingReport(report.id);
                          setShowAllReports(false);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Viewer Modal */}
      {viewingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Report Preview</h2>
                <p className="text-sm text-gray-600 mt-1">Viewing report details</p>
              </div>
              <button 
                onClick={() => setViewingReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Summary</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">8</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Milestones</p>
                    <p className="text-2xl font-bold text-gray-900">96</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">70.5%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">At-Risk Students</p>
                    <p className="text-2xl font-bold text-red-600">2</p>
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 mb-3">Student Progress</h4>
                <div className="space-y-2">
                  {['Sarah Johnson', 'Mike Kumar', 'Anna Lee', 'John Smith', 'Lisa Chen', 'Emma Davis', 'Tom Wilson', 'Jane Brown'].map((student, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border">
                      <span className="text-sm font-medium text-gray-900">{student}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">12 milestones</span>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.floor(Math.random() * 40) + 60}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{Math.floor(Math.random() * 40) + 60}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function handleDownloadReport(reportId: string, format: string) {
  // Mock download functionality
  console.log(`Downloading report ${reportId} in ${format} format`);
  alert(`Downloading report in ${format.toUpperCase()} format. This would trigger an actual download in production.`);
}