'use client';

import React, { useEffect, useState } from 'react';
import { 
  X, 
  Search, 
  Star, 
  Clock, 
  Users, 
  BookOpen,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { MilestoneTemplate } from '@/types/milestone';
import { useMilestoneStore } from '@/stores/milestone';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui';

interface MilestoneTemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  projectId?: string;
}

export const MilestoneTemplateSelector: React.FC<MilestoneTemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  projectId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const { 
    templates, 
    isLoadingTemplates, 
    getTemplates, 
    createFromTemplate,
    isCreating 
  } = useMilestoneStore();

  useEffect(() => {
    if (isOpen && templates.length === 0) {
      getTemplates();
    }
  }, [isOpen, templates.length, getTemplates]);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    const matchesDifficulty = !selectedDifficulty || template.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));
  const difficulties = Array.from(new Set(templates.map(t => t.difficulty)));

  const handleSelectTemplate = async (templateId: string) => {
    try {
      await createFromTemplate(templateId, projectId);
      onSelectTemplate(templateId);
      onClose();
    } catch (error) {
      console.error('Failed to create milestones from template:', error);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'intermediate':
        return 'bg-gray-200 text-gray-900 border-gray-400';
      case 'advanced':
        return 'bg-gray-800 text-white border-gray-900';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDuration = (days: number) => {
    if (days < 7) return `${days} days`;
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    return `${Math.round(days / 30)} months`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Choose a Template</h2>
            <p className="text-gray-600 mt-1">Start with a pre-built milestone template</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="pl-10"
              />
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded border">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="">All Difficulties</option>
                  {difficulties.map(difficulty => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoadingTemplates ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, index) => (
                <Card key={index} className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedCategory || selectedDifficulty
                  ? 'Try adjusting your search or filters.'
                  : 'No milestone templates are available.'}
              </p>
            </Card>
          ) : (
            filteredTemplates.map((template) => (
              <Card key={template.id} className="p-4 hover:border-gray-400 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
                        {template.difficulty}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-3">{template.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(template.estimatedDuration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{template.milestones.length} milestones</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{template.usageCount} uses</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current text-gray-400" />
                        <span>{template.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Expandable milestone list */}
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedTemplate(
                          expandedTemplate === template.id ? null : template.id
                        )}
                        className="text-sm p-0 h-auto"
                      >
                        {expandedTemplate === template.id ? 'Hide' : 'Show'} milestones
                        {expandedTemplate === template.id ? 
                          <ChevronUp className="w-3 h-3 ml-1" /> : 
                          <ChevronDown className="w-3 h-3 ml-1" />
                        }
                      </Button>

                      {expandedTemplate === template.id && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                          {template.milestones.map((milestone, index) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium text-gray-900">{milestone.title}</div>
                              <div className="text-gray-600 text-xs">{milestone.description}</div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                <span>{milestone.estimatedHours}h</span>
                                <span>•</span>
                                <span className="capitalize">{milestone.priority}</span>
                                <span>•</span>
                                <span>Day {milestone.daysFromStart}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <Button
                      onClick={() => handleSelectTemplate(template.id)}
                      disabled={isCreating}
                      size="sm"
                    >
                      {isCreating ? 'Creating...' : 'Use Template'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MilestoneTemplateSelector;