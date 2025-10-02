'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Progress from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Database, 
  Upload, 
  Download, 
  RefreshCw, 
  Play, 
  Pause, 
  X,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';
import type { BulkOperation } from '@/stores/admin';

interface BulkOperationsProps {
  className?: string;
}

export default function BulkOperations({ className }: BulkOperationsProps) {
  const {
    bulkOperations,
    isLoading,
    error,
    fetchBulkOperations,
    startBulkOperation,
    cancelBulkOperation,
    downloadBulkOperationResult,
    clearError,
  } = useAdminStore();

  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);

  useEffect(() => {
    fetchBulkOperations();
  }, [fetchBulkOperations]);

  const handleStartOperation = async (type: BulkOperation['type']) => {
    try {
      await startBulkOperation(type);
    } catch (error) {
      console.error('Failed to start bulk operation:', error);
    }
  };

  const handleCancelOperation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this operation?')) {
      return;
    }
    
    try {
      await cancelBulkOperation(id);
    } catch (error) {
      console.error('Failed to cancel bulk operation:', error);
    }
  };

  const handleDownloadResult = async (id: string) => {
    try {
      await downloadBulkOperationResult(id);
    } catch (error) {
      console.error('Failed to download result:', error);
    }
  };

  const getStatusIcon = (status: BulkOperation['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: BulkOperation['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      case 'running':
        return 'default';
      case 'pending':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const getOperationIcon = (type: BulkOperation['type']) => {
    switch (type) {
      case 'user_import':
        return <Upload className="w-5 h-5 text-blue-600" />;
      case 'user_export':
        return <Download className="w-5 h-5 text-green-600" />;
      case 'project_export':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'data_migration':
        return <Database className="w-5 h-5 text-orange-600" />;
      case 'backup':
        return <Database className="w-5 h-5 text-gray-600" />;
      default:
        return <Database className="w-5 h-5 text-gray-400" />;
    }
  };

  const getOperationTitle = (type: BulkOperation['type']) => {
    switch (type) {
      case 'user_import':
        return 'User Import';
      case 'user_export':
        return 'User Export';
      case 'project_export':
        return 'Project Export';
      case 'data_migration':
        return 'Data Migration';
      case 'backup':
        return 'System Backup';
      default:
        return 'Unknown Operation';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Database className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-black mb-2">Failed to Load Operations</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchBulkOperations(); }}>
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
              <Database className="w-6 h-6 mr-2" />
              Bulk Operations
            </h2>
            <p className="text-gray-600">
              Manage large-scale data operations and system maintenance tasks.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={fetchBulkOperations}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="p-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleStartOperation('user_export')}
            disabled={isLoading}
          >
            <Users className="w-4 h-4 mr-2" />
            Export Users
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleStartOperation('project_export')}
            disabled={isLoading}
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Projects
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleStartOperation('backup')}
            disabled={isLoading}
          >
            <Database className="w-4 h-4 mr-2" />
            Create Backup
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => handleStartOperation('data_migration')}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Data Migration
          </Button>
        </Card>
        
        <Card className="p-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => document.getElementById('import-file')?.click()}
            disabled={isLoading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Users
          </Button>
        </Card>
      </div>

      {/* Operations List */}
      <Card>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black">Recent Operations</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-5 w-5" />
                  <div>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-2 w-32" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : bulkOperations.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No Operations</h3>
            <p className="text-gray-500">No bulk operations have been performed yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {bulkOperations.map((operation) => (
              <div key={operation.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    {getOperationIcon(operation.type)}
                    <div>
                      <h4 className="text-lg font-medium text-black">
                        {getOperationTitle(operation.type)}
                      </h4>
                      <div className="text-sm text-gray-500">
                        Started: {formatDate(operation.startedAt)}
                        {operation.completedAt && (
                          <span> • Completed: {formatDate(operation.completedAt)}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created by: {operation.createdBy.name}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <Badge variant={getStatusBadgeVariant(operation.status)}>
                        {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">
                        {operation.processedItems} / {operation.totalItems} items
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {operation.status === 'running' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOperation(operation.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {operation.status === 'completed' && operation.downloadUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadResult(operation.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {operation.status === 'running' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{Math.round(operation.progress)}%</span>
                    </div>
                    <Progress value={operation.progress} className="h-2" />
                  </div>
                )}
                
                {/* Operation Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Items:</span>
                    <div className="font-medium">{operation.totalItems}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Processed:</span>
                    <div className="font-medium">{operation.processedItems}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Errors:</span>
                    <div className="font-medium text-red-600">{operation.errorCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="flex items-center">
                      {getStatusIcon(operation.status)}
                      <span className="ml-1 font-medium">
                        {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Errors */}
                {operation.errors && operation.errors.length > 0 && (
                  <div className="mt-4">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-red-600">
                        View Errors ({operation.errors.length})
                      </summary>
                      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm">
                        {operation.errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-red-700">
                            {error.item}: {error.error}
                          </div>
                        ))}
                        {operation.errors.length > 5 && (
                          <div className="text-red-600 mt-2">
                            ... and {operation.errors.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Hidden file input for import */}
      <input
        id="import-file"
        type="file"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleStartOperation('user_import');
          }
        }}
      />
    </div>
  );
}