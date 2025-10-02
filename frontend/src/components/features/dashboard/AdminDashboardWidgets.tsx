'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import { 
  Users, 
  FileText, 
  BarChart3, 
  Shield,
  Database,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Server,
  Clock
} from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { DashboardWidget as WidgetType, DashboardMetrics } from './types';

interface AdminDashboardWidgetsProps {
  metrics: DashboardMetrics;
  platformStatistics: any;
  recentActivity: any[];
  systemHealth: any;
  userGrowth: any[];
  isEditing?: boolean;
  onWidgetUpdate?: (widgetId: string, data: any) => void;
  onWidgetRemove?: (widgetId: string) => void;
  onWidgetResize?: (widgetId: string, size: WidgetType['size']) => void;
}

const AdminDashboardWidgets: React.FC<AdminDashboardWidgetsProps> = ({
  metrics,
  platformStatistics,
  recentActivity,
  systemHealth,
  userGrowth,
  isEditing = false,
  onWidgetUpdate,
  onWidgetRemove,
  onWidgetResize
}) => {
  const widgets: WidgetType[] = [
    {
      id: 'platform-overview',
      title: 'Platform Overview',
      type: 'metric',
      size: 'full',
      position: { x: 0, y: 0, w: 4, h: 1 },
      isVisible: true,
      isCustomizable: false,
      permissions: ['admin']
    },
    {
      id: 'system-health',
      title: 'System Health',
      type: 'metric',
      size: 'medium',
      position: { x: 0, y: 1, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['admin']
    },
    {
      id: 'user-growth',
      title: 'User Growth',
      type: 'chart',
      size: 'medium',
      position: { x: 2, y: 1, w: 2, h: 1 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['admin']
    },
    {
      id: 'recent-activity',
      title: 'Recent Activity',
      type: 'activity',
      size: 'medium',
      position: { x: 0, y: 2, w: 2, h: 2 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['admin']
    },
    {
      id: 'pending-approvals',
      title: 'Pending Approvals',
      type: 'list',
      size: 'medium',
      position: { x: 2, y: 2, w: 2, h: 2 },
      isVisible: true,
      isCustomizable: true,
      permissions: ['admin']
    }
  ];

  const renderPlatformOverviewWidget = () => (
    <DashboardWidget
      widget={widgets[0]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="grid grid-cols-4 gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-3">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.totalUsers || 0}</p>
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-xs text-green-600 mt-1">+12% this month</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mx-auto mb-3">
            <FileText className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.activeProjects || 0}</p>
          <p className="text-sm text-gray-600">Active Projects</p>
          <p className="text-xs text-green-600 mt-1">+8% this month</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-lg mx-auto mb-3">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-black">{metrics.pendingApprovals || 0}</p>
          <p className="text-sm text-gray-600">Pending Approvals</p>
          <p className="text-xs text-yellow-600 mt-1">Requires attention</p>
        </div>
        <div className="text-center">
          <div className={`flex items-center justify-center w-16 h-16 rounded-lg mx-auto mb-3 ${
            metrics.systemHealth === 'healthy' ? 'bg-green-100' :
            metrics.systemHealth === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
          }`}>
            {metrics.systemHealth === 'healthy' ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : metrics.systemHealth === 'warning' ? (
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <p className="text-3xl font-bold text-black">
            {metrics.systemHealth === 'healthy' ? '100%' :
             metrics.systemHealth === 'warning' ? '85%' : '60%'}
          </p>
          <p className="text-sm text-gray-600">System Health</p>
          <p className={`text-xs mt-1 ${
            metrics.systemHealth === 'healthy' ? 'text-green-600' :
            metrics.systemHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {metrics.systemHealth === 'healthy' ? 'All systems operational' :
             metrics.systemHealth === 'warning' ? 'Minor issues detected' : 'Critical issues'}
          </p>
        </div>
      </div>
    </DashboardWidget>
  );

  const renderSystemHealthWidget = () => (
    <DashboardWidget
      widget={widgets[1]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Server className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-black">Database</p>
            <p className="text-xs text-green-600">Connected</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Activity className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-black">API</p>
            <p className="text-xs text-green-600">Operational</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">CPU Usage</span>
              <span className="font-medium text-black">45%</span>
            </div>
            <Progress value={45} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Memory Usage</span>
              <span className="font-medium text-black">62%</span>
            </div>
            <Progress value={62} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">Storage</span>
              <span className="font-medium text-black">38%</span>
            </div>
            <Progress value={38} />
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-200">
          <Button size="sm" fullWidth variant="secondary">
            <Settings className="w-4 h-4 mr-2" />
            System Settings
          </Button>
        </div>
      </div>
    </DashboardWidget>
  );

  const renderUserGrowthWidget = () => (
    <DashboardWidget
      widget={widgets[2]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-black">156</p>
            <p className="text-xs text-gray-600">Students</p>
          </div>
          <div>
            <p className="text-lg font-bold text-black">24</p>
            <p className="text-xs text-gray-600">Supervisors</p>
          </div>
          <div>
            <p className="text-lg font-bold text-black">3</p>
            <p className="text-xs text-gray-600">Admins</p>
          </div>
        </div>
        
        {/* Simple growth visualization */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">This Month</span>
            <span className="text-green-600 font-medium">+15 users</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Last Month</span>
            <span className="text-gray-600">+12 users</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Growth Rate</span>
            <span className="text-green-600 font-medium">+25%</span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-200">
          <Button size="sm" fullWidth variant="secondary">
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>
    </DashboardWidget>
  );

  const renderRecentActivityWidget = () => (
    <DashboardWidget
      widget={widgets[3]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-3">
        {recentActivity.length > 0 ? (
          recentActivity.slice(0, 6).map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'user' && <Users className="w-4 h-4 text-blue-600" />}
                {activity.type === 'project' && <FileText className="w-4 h-4 text-green-600" />}
                {activity.type === 'system' && <Settings className="w-4 h-4 text-gray-600" />}
                {activity.type === 'security' && <Shield className="w-4 h-4 text-red-600" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-black">{activity.description}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-500">
                    {activity.user && `${activity.user} • `}
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </p>
                  {activity.type === 'security' && (
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Security
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    </DashboardWidget>
  );

  const renderPendingApprovalsWidget = () => (
    <DashboardWidget
      widget={widgets[4]}
      isEditing={isEditing}
      onUpdate={onWidgetUpdate}
      onRemove={onWidgetRemove}
      onResize={onWidgetResize}
    >
      <div className="space-y-4">
        {/* Mock pending approvals data */}
        {[
          { id: '1', type: 'project', title: 'AI-Powered Recommendation System', user: 'Dr. Johnson', timestamp: new Date() },
          { id: '2', type: 'user', title: 'New Supervisor Registration', user: 'Prof. Smith', timestamp: new Date() },
          { id: '3', type: 'project', title: 'Blockchain Voting System', user: 'Dr. Wilson', timestamp: new Date() }
        ].map((approval) => (
          <div key={approval.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {approval.type === 'project' ? (
                  <FileText className="w-4 h-4 text-yellow-600" />
                ) : (
                  <Users className="w-4 h-4 text-yellow-600" />
                )}
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                  {approval.type}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {approval.timestamp.toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm font-medium text-black mb-1">{approval.title}</p>
            <p className="text-xs text-gray-600 mb-3">Submitted by {approval.user}</p>
            <div className="flex space-x-2">
              <Button size="sm" className="flex-1">
                Approve
              </Button>
              <Button size="sm" variant="secondary" className="flex-1">
                Review
              </Button>
            </div>
          </div>
        ))}
        
        <div className="pt-2 border-t border-gray-200">
          <Button size="sm" fullWidth variant="secondary">
            View All Approvals
          </Button>
        </div>
      </div>
    </DashboardWidget>
  );

  return (
    <div className="grid grid-cols-4 gap-6 auto-rows-min">
      {renderPlatformOverviewWidget()}
      {renderSystemHealthWidget()}
      {renderUserGrowthWidget()}
      {renderRecentActivityWidget()}
      {renderPendingApprovalsWidget()}
    </div>
  );
};

export default AdminDashboardWidgets;