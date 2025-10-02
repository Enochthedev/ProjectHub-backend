'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2,
  Copy,
  Star,
  Clock,
  Users,
  BarChart3,
  Settings,
  Save,
  X
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  filters: {
    dateRange: { startDate: string; endDate: string } | null;
    studentIds: string[];
    status: string[];
    priority: string[];
  };
  sections: string[];
  isDefault: boolean;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
}

export default function SupervisorReportTemplatesPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    filters: {
      dateRange: null,
      studentIds: [],
      status: [],
      priority: []
    },
    sections: ['summary', 'detailed_metrics', 'student_progress']
  });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        
        // Mock data - in real implementation, this would come from API
        const mockTemplates: ReportTemplate[] = [
          {
            id: 'template-1',
            name: 'Monthly Progress Report',
            description: 'Comprehensive monthly progress report for all students',
            filters: {
              dateRange: null, // Current month
              studentIds: [],
              status: [],
              priority: []
            },
            sections: ['summary', 'detailed_metrics', 'student_progress', 'at_risk_analysis'],
            isDefault: true,
            createdAt: '2024-01-15T10:00:00Z',
            lastUsed: '2024-03-15T14:30:00Z',
            usageCount: 25
          },
          {
            id: 'template-2',
            name: 'At-Risk Students Report',
            description: 'Focus on students who need additional support',
            filters: {
              dateRange: null,
              studentIds: [],
              status: ['overdue', 'blocked'],
              priority: ['high', 'critical']
            },
            sections: ['summary', 'at_risk_analysis', 'recommendations'],
            isDefault: false,
            createdAt: '2024-02-01T10:00:00Z',
            lastUsed: '2024-03-10T09:15:00Z',
            usageCount: 12
          },
          {
            id: 'template-3',
            name: 'Semester Summary',
            description: 'End-of-semester comprehensive report',
            filters: {
              dateRange: { startDate: '2024-01-01', endDate: '2024-05-31' },
              studentIds: [],
              status: [],
              priority: []
            },
            sections: ['summary', 'detailed_metrics', 'student_progress', 'achievements', 'recommendations'],
            isDefault: false,
            createdAt: '2024-01-20T10:00:00Z',
            usageCount: 3
          }
        ];

        setTemplates(mockTemplates);
      } catch (err) {
        console.error('Failed to load report templates:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleCreateTemplate = () => {
    const template: ReportTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      filters: newTemplate.filters,
      sections: newTemplate.sections,
      isDefault: false,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    setTemplates(prev => [...prev, template]);
    setShowCreateModal(false);
    setNewTemplate({
      name: '',
      description: '',
      filters: {
        dateRange: null,
        studentIds: [],
        status: [],
        priority: []
      },
      sections: ['summary', 'detailed_metrics', 'student_progress']
    });
  };

  const handleUseTemplate = (template: ReportTemplate) => {
    // This would navigate to the reports page with the template filters applied
    const params = new URLSearchParams();
    if (template.filters.dateRange) {
      params.append('startDate', template.filters.dateRange.startDate);
      params.append('endDate', template.filters.dateRange.endDate);
    }
    template.filters.status.forEach(status => params.append('status', status));
    template.filters.priority.forEach(priority => params.append('priority', priority));
    
    window.location.href = `/supervisor/reports?${params.toString()}`;
  };

  const handleDuplicateTemplate = (template: ReportTemplate) => {
    const duplicated: ReportTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      lastUsed: undefined
    };

    setTemplates(prev => [...prev, duplicated]);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
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
              <Skeleton className="h-48 w-full" />
            </Card>
          ))}
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
            <h1 className="text-3xl font-bold text-black mb-2">Report Templates</h1>
            <p className="text-gray-600">
              Create and manage reusable report templates for consistent reporting.
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                {template.isDefault && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => handleDuplicateTemplate(template)}>
                  <Copy className="w-3 h-3" />
                </Button>
                {!template.isDefault && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditingTemplate(template)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteTemplate(template.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold text-black mb-2">{template.name}</h3>
            <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>

            {/* Template Details */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Sections:</span>
                <span className="font-medium text-black">{template.sections.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Usage Count:</span>
                <span className="font-medium text-black">{template.usageCount}</span>
              </div>
              {template.lastUsed && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Last Used:</span>
                  <span className="font-medium text-black">
                    {new Date(template.lastUsed).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Filters Preview */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Active Filters:</p>
              <div className="flex flex-wrap gap-1">
                {template.filters.status.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Status: {template.filters.status.length}
                  </span>
                )}
                {template.filters.priority.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    Priority: {template.filters.priority.length}
                  </span>
                )}
                {template.filters.dateRange && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                    Date Range
                  </span>
                )}
                {template.filters.status.length === 0 && 
                 template.filters.priority.length === 0 && 
                 !template.filters.dateRange && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    No filters
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => handleUseTemplate(template)}
              >
                <BarChart3 className="w-3 h-3 mr-1" />
                Use Template
              </Button>
            </div>

            {/* Created Date */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center text-xs text-gray-500">
                <Clock className="w-3 h-3 mr-1" />
                Created {new Date(template.createdAt).toLocaleDateString()}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-black">Create Report Template</h2>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Template Name
                </label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Weekly Progress Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Description
                </label>
                <textarea
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this template is used for..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:border-black focus:outline-none resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Report Sections
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'summary', label: 'Executive Summary' },
                    { id: 'detailed_metrics', label: 'Detailed Metrics' },
                    { id: 'student_progress', label: 'Student Progress' },
                    { id: 'at_risk_analysis', label: 'At-Risk Analysis' },
                    { id: 'achievements', label: 'Achievements & Highlights' },
                    { id: 'recommendations', label: 'Recommendations' }
                  ].map((section) => (
                    <label key={section.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newTemplate.sections.includes(section.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewTemplate(prev => ({
                              ...prev,
                              sections: [...prev.sections, section.id]
                            }));
                          } else {
                            setNewTemplate(prev => ({
                              ...prev,
                              sections: prev.sections.filter(s => s !== section.id)
                            }));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-black">{section.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name.trim() || newTemplate.sections.length === 0}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                Create Template
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => setShowCreateModal(false)}
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