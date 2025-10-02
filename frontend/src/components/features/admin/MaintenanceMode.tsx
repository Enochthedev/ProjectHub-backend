'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Power,
  PowerOff
} from 'lucide-react';
import { useAdminStore } from '@/stores/admin';

interface MaintenanceModeProps {
  className?: string;
}

export default function MaintenanceMode({ className }: MaintenanceModeProps) {
  const {
    maintenanceMode,
    isLoading,
    error,
    toggleMaintenanceMode,
    clearError,
  } = useAdminStore();

  const [message, setMessage] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');

  const handleToggleMaintenanceMode = async () => {
    const newState = !maintenanceMode;
    
    if (newState) {
      // Enabling maintenance mode
      if (!confirm('Are you sure you want to enable maintenance mode? This will prevent users from accessing the application.')) {
        return;
      }
    } else {
      // Disabling maintenance mode
      if (!confirm('Are you sure you want to disable maintenance mode? Users will be able to access the application again.')) {
        return;
      }
    }

    try {
      await toggleMaintenanceMode(newState, newState ? message : undefined);
      if (newState) {
        setMessage('');
        setScheduledEnd('');
      }
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-black mb-2">Failed to Load Maintenance Settings</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={clearError}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black flex items-center">
          <Settings className="w-6 h-6 mr-2" />
          Maintenance Mode
        </h2>
        <p className="text-gray-600">
          Control system maintenance mode to perform updates and maintenance tasks.
        </p>
      </div>

      {/* Current Status */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {maintenanceMode ? (
              <AlertTriangle className="w-8 h-8 text-orange-600 mr-4" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
            )}
            <div>
              <h3 className="text-xl font-semibold text-black">
                System Status
              </h3>
              <p className="text-gray-600">
                {maintenanceMode 
                  ? 'Maintenance mode is currently active'
                  : 'System is operational and accessible to users'
                }
              </p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={maintenanceMode ? 'warning' : 'success'} className="mb-2">
              {maintenanceMode ? 'Maintenance Mode' : 'Operational'}
            </Badge>
            <div className="text-sm text-gray-500">
              {maintenanceMode ? 'Users cannot access the system' : 'All services available'}
            </div>
          </div>
        </div>
      </Card>

      {/* Maintenance Mode Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enable/Disable Controls */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
            {maintenanceMode ? (
              <PowerOff className="w-5 h-5 mr-2 text-red-600" />
            ) : (
              <Power className="w-5 h-5 mr-2 text-green-600" />
            )}
            {maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
          </h3>
          
          {!maintenanceMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maintenance Message (Optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter a message to display to users during maintenance..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This message will be shown to users when they try to access the system.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scheduled End Time (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledEnd}
                  onChange={(value) => setScheduledEnd(value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Estimated time when maintenance will be completed.
                </p>
              </div>
              
              <Button
                onClick={handleToggleMaintenanceMode}
                loading={isLoading}
                className="w-full"
                variant="secondary"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Enable Maintenance Mode
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded">
                <div className="flex items-center">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="font-medium text-orange-800">
                    Maintenance mode is currently active
                  </span>
                </div>
                <p className="text-orange-700 mt-2 text-sm">
                  Users are unable to access the application. Click the button below to restore normal operation.
                </p>
              </div>
              
              <Button
                onClick={handleToggleMaintenanceMode}
                loading={isLoading}
                className="w-full"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Disable Maintenance Mode
              </Button>
            </div>
          )}
        </Card>

        {/* Information Panel */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Maintenance Information
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <h4 className="font-medium text-blue-800 mb-2">What happens during maintenance mode?</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Users will see a maintenance page instead of the application</li>
                <li>• All user sessions will be terminated</li>
                <li>• API endpoints will return maintenance status</li>
                <li>• Admin users can still access the system</li>
              </ul>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">Best Practices</h4>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• Notify users in advance when possible</li>
                <li>• Provide clear maintenance messages</li>
                <li>• Set realistic completion times</li>
                <li>• Monitor system status during maintenance</li>
              </ul>
            </div>
            
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <h4 className="font-medium text-gray-800 mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  View System Logs
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Run Health Check
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Send User Notification
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}