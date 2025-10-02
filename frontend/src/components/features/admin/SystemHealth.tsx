'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { 
  Activity, 
  Server, 
  Database, 
  Cpu, 
  HardDrive, 
  Wifi, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';
import type { SystemHealth as SystemHealthType } from '@/stores/admin';

interface SystemHealthProps {
  className?: string;
}

export default function SystemHealth({ className }: SystemHealthProps) {
  const {
    systemHealth,
    isLoading,
    error,
    fetchSystemHealth,
    clearError,
  } = useAdminStore();

  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    setLastRefresh(new Date());
  }, [fetchSystemHealth]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSystemHealth();
      setLastRefresh(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, fetchSystemHealth]);

  const handleManualRefresh = () => {
    fetchSystemHealth();
    setLastRefresh(new Date());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
      case 'degraded':
      case 'slow':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
      case 'down':
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'connected':
        return 'success';
      case 'warning':
      case 'degraded':
      case 'slow':
        return 'warning';
      case 'critical':
      case 'down':
      case 'disconnected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatLastChecked = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffSeconds < 3600) {
      const minutes = Math.floor(diffSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-black mb-2">Failed to Load System Health</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => { clearError(); fetchSystemHealth(); }}>
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
              <Activity className="w-6 h-6 mr-2" />
              System Health
            </h2>
            <p className="text-gray-600">
              Monitor system performance and service status in real-time.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="flex items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black mr-2"
                />
                Auto-refresh
              </label>
            </div>
            <Button
              variant="secondary"
              onClick={handleManualRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {lastRefresh && (
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}
      </div>

      {isLoading && !systemHealth ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-20" />
            </Card>
          ))}
        </div>
      ) : systemHealth ? (
        <>
          {/* Overall Status */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(systemHealth.status)}
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-black">
                    System Status
                  </h3>
                  <p className="text-gray-600">
                    Overall system health and performance
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={getStatusBadgeVariant(systemHealth.status)} className="mb-2">
                  {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                </Badge>
                <div className="text-sm text-gray-500">
                  Uptime: {formatUptime(systemHealth.uptime)}
                </div>
              </div>
            </div>
          </Card>

          {/* System Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* CPU Usage */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Cpu className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-black">CPU Usage</span>
                </div>
                <span className={`text-2xl font-bold ${getUsageColor(systemHealth.cpuUsage)}`}>
                  {formatPercentage(systemHealth.cpuUsage)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.cpuUsage >= 90 ? 'bg-red-500' :
                    systemHealth.cpuUsage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${systemHealth.cpuUsage}%` }}
                />
              </div>
            </Card>

            {/* Memory Usage */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="font-medium text-black">Memory</span>
                </div>
                <span className={`text-2xl font-bold ${getUsageColor(systemHealth.memoryUsage)}`}>
                  {formatPercentage(systemHealth.memoryUsage)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.memoryUsage >= 90 ? 'bg-red-500' :
                    systemHealth.memoryUsage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${systemHealth.memoryUsage}%` }}
                />
              </div>
            </Card>

            {/* Disk Usage */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <HardDrive className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="font-medium text-black">Disk Space</span>
                </div>
                <span className={`text-2xl font-bold ${getUsageColor(systemHealth.diskUsage)}`}>
                  {formatPercentage(systemHealth.diskUsage)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    systemHealth.diskUsage >= 90 ? 'bg-red-500' :
                    systemHealth.diskUsage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${systemHealth.diskUsage}%` }}
                />
              </div>
            </Card>

            {/* Active Connections */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Wifi className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-black">Connections</span>
                </div>
                <span className="text-2xl font-bold text-black">
                  {systemHealth.activeConnections}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                Active user sessions
              </div>
            </Card>
          </div>

          {/* Service Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Database Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="font-medium text-black">Database</span>
                </div>
                {getStatusIcon(systemHealth.databaseStatus)}
              </div>
              <Badge variant={getStatusBadgeVariant(systemHealth.databaseStatus)}>
                {systemHealth.databaseStatus.charAt(0).toUpperCase() + systemHealth.databaseStatus.slice(1)}
              </Badge>
              <div className="text-sm text-gray-500 mt-2">
                Primary database connection
              </div>
            </Card>

            {/* Redis Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Server className="w-5 h-5 text-red-600 mr-2" />
                  <span className="font-medium text-black">Redis Cache</span>
                </div>
                {getStatusIcon(systemHealth.redisStatus)}
              </div>
              <Badge variant={getStatusBadgeVariant(systemHealth.redisStatus)}>
                {systemHealth.redisStatus.charAt(0).toUpperCase() + systemHealth.redisStatus.slice(1)}
              </Badge>
              <div className="text-sm text-gray-500 mt-2">
                Caching and session storage
              </div>
            </Card>

            {/* AI Service Status */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Zap className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="font-medium text-black">AI Service</span>
                </div>
                {getStatusIcon(systemHealth.aiServiceStatus)}
              </div>
              <Badge variant={getStatusBadgeVariant(systemHealth.aiServiceStatus)}>
                {systemHealth.aiServiceStatus.charAt(0).toUpperCase() + systemHealth.aiServiceStatus.slice(1)}
              </Badge>
              <div className="text-sm text-gray-500 mt-2">
                AI assistant and recommendations
              </div>
            </Card>
          </div>

          {/* Detailed Service Status */}
          {systemHealth.services && systemHealth.services.length > 0 && (
            <Card className="mt-6">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-black">Service Details</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {systemHealth.services.map((service, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(service.status)}
                      <div className="ml-3">
                        <div className="font-medium text-black">{service.name}</div>
                        <div className="text-sm text-gray-500">
                          Response time: {service.responseTime}ms
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={getStatusBadgeVariant(service.status)}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </Badge>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatLastChecked(service.lastChecked)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No System Health Data</h3>
          <p className="text-gray-500 mb-4">Unable to retrieve system health information.</p>
          <Button onClick={handleManualRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </Card>
      )}
    </div>
  );
}