'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Bot, 
  Settings, 
  Database, 
  BarChart3, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Brain
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';

interface AISystemManagementProps {
  className?: string;
}

export default function AISystemManagement({ className }: AISystemManagementProps) {
  const {
    aiSystemConfigs,
    isLoading,
    error,
    fetchAISystemConfigs,
    updateAISystemConfig,
    clearError,
  } = useAdminStore();

  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);

  useEffect(() => {
    fetchAISystemConfigs();
  }, [fetchAISystemConfigs]);

  const handleToggleConfig = async (configId: string, enabled: boolean) => {
    try {
      await updateAISystemConfig(configId, { enabled });
    } catch (error) {
      console.error('Failed to toggle AI config:', error);
    }
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircle className="w-5 h-5 text-green-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusBadgeVariant = (enabled: boolean) => {
    return enabled ? 'success' : 'destructive';
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-black mb-2">Failed to Load AI System</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchAISystemConfigs(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
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
              <Bot className="w-6 h-6 mr-2" />
              AI System Management
            </h2>
            <p className="text-gray-600">
              Configure and monitor AI services, knowledge base, and system performance.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={fetchAISystemConfigs}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* AI System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Brain className="w-5 h-5 text-purple-600 mr-2" />
              <span className="font-medium text-black">AI Services</span>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-black mb-1">
            {aiSystemConfigs.filter(config => config.enabled).length}
          </div>
          <div className="text-sm text-gray-500">
            Active configurations
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-blue-600 mr-2" />
              <span className="font-medium text-black">Knowledge Base</span>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-black mb-1">
            {aiSystemConfigs.filter(config => config.knowledgeBaseEnabled).length}
          </div>
          <div className="text-sm text-gray-500">
            Enabled knowledge bases
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-green-600 mr-2" />
              <span className="font-medium text-black">Performance</span>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-black mb-1">
            98%
          </div>
          <div className="text-sm text-gray-500">
            Average uptime
          </div>
        </Card>
      </div>

      {/* AI Configurations */}
      <Card className="mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            AI Service Configurations
          </h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : aiSystemConfigs.length === 0 ? (
          <div className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No AI Configurations</h3>
            <p className="text-gray-500">No AI system configurations found.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {aiSystemConfigs.map((config) => (
              <div key={config.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(config.enabled)}
                    <div>
                      <h4 className="text-lg font-medium text-black">
                        {config.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {config.description || 'AI service configuration'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Model: {config.model || 'Default'}</span>
                        <span>Max Tokens: {config.maxTokens || 'N/A'}</span>
                        <span>Temperature: {config.temperature || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge variant={getStatusBadgeVariant(config.enabled)}>
                        {config.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        Updated: {new Date(config.lastUpdated).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedConfig(config.id)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={config.enabled ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleConfig(config.id, !config.enabled)}
                        disabled={isLoading}
                      >
                        {config.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Configuration Details */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Rate Limit:</span>
                    <div className="font-medium">
                      {config.rateLimitPerMinute || 'Unlimited'} req/min
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Timeout:</span>
                    <div className="font-medium">
                      {config.responseTimeout || 30}s
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Knowledge Base:</span>
                    <div className="font-medium">
                      {config.knowledgeBaseEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Fallback:</span>
                    <div className="font-medium">
                      {config.fallbackEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <Button variant="secondary" className="w-full">
            <Database className="w-4 h-4 mr-2" />
            Manage Knowledge Base
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button variant="secondary" className="w-full">
            <BarChart3 className="w-4 h-4 mr-2" />
            View AI Metrics
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button variant="secondary" className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            System Settings
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button variant="secondary" className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Test AI Services
          </Button>
        </Card>
      </div>
    </div>
  );
}