'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { DashboardLayout, DashboardWidget, DashboardCustomization as CustomizationType } from './types';

interface DashboardCustomizationProps {
  customization: CustomizationType;
  onSave: (customization: CustomizationType) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const DashboardCustomization: React.FC<DashboardCustomizationProps> = ({
  customization,
  onSave,
  onReset,
  isOpen,
  onClose
}) => {
  const [editingLayout, setEditingLayout] = useState<DashboardLayout | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [showNewLayoutForm, setShowNewLayoutForm] = useState(false);
  const [localCustomization, setLocalCustomization] = useState<CustomizationType>(customization);

  const handleCreateLayout = () => {
    if (!newLayoutName.trim()) return;

    const newLayout: DashboardLayout = {
      id: `layout_${Date.now()}`,
      name: newLayoutName,
      role: customization.role,
      widgets: getDefaultWidgetsForRole(customization.role),
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLocalCustomization(prev => ({
      ...prev,
      layouts: [...prev.layouts, newLayout]
    }));

    setNewLayoutName('');
    setShowNewLayoutForm(false);
  };

  const handleDeleteLayout = (layoutId: string) => {
    if (localCustomization.layouts.length <= 1) return; // Keep at least one layout

    setLocalCustomization(prev => ({
      ...prev,
      layouts: prev.layouts.filter(layout => layout.id !== layoutId),
      activeLayoutId: prev.activeLayoutId === layoutId 
        ? prev.layouts.find(l => l.id !== layoutId)?.id || prev.layouts[0].id
        : prev.activeLayoutId
    }));
  };

  const handleToggleWidget = (layoutId: string, widgetId: string) => {
    setLocalCustomization(prev => ({
      ...prev,
      layouts: prev.layouts.map(layout => 
        layout.id === layoutId
          ? {
              ...layout,
              widgets: layout.widgets.map(widget =>
                widget.id === widgetId
                  ? { ...widget, isVisible: !widget.isVisible }
                  : widget
              ),
              updatedAt: new Date().toISOString()
            }
          : layout
      )
    }));
  };

  const handleSetActiveLayout = (layoutId: string) => {
    setLocalCustomization(prev => ({
      ...prev,
      activeLayoutId: layoutId
    }));
  };

  const handleUpdatePreferences = (key: keyof CustomizationType['preferences'], value: any) => {
    setLocalCustomization(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    onSave(localCustomization);
    onClose();
  };

  const handleReset = () => {
    onReset();
    setLocalCustomization(customization);
  };

  const getDefaultWidgetsForRole = (role: string): DashboardWidget[] => {
    const baseWidgets: Record<string, DashboardWidget[]> = {
      student: [
        {
          id: 'current-project',
          title: 'Current Project',
          type: 'progress',
          size: 'large',
          position: { x: 0, y: 0, w: 2, h: 2 },
          isVisible: true,
          isCustomizable: false,
          permissions: ['student']
        },
        {
          id: 'project-metrics',
          title: 'Project Metrics',
          type: 'metric',
          size: 'medium',
          position: { x: 2, y: 0, w: 2, h: 1 },
          isVisible: true,
          isCustomizable: true,
          permissions: ['student']
        }
      ],
      supervisor: [
        {
          id: 'supervisor-metrics',
          title: 'Overview Metrics',
          type: 'metric',
          size: 'full',
          position: { x: 0, y: 0, w: 4, h: 1 },
          isVisible: true,
          isCustomizable: false,
          permissions: ['supervisor']
        }
      ],
      admin: [
        {
          id: 'platform-overview',
          title: 'Platform Overview',
          type: 'metric',
          size: 'full',
          position: { x: 0, y: 0, w: 4, h: 1 },
          isVisible: true,
          isCustomizable: false,
          permissions: ['admin']
        }
      ]
    };

    return baseWidgets[role] || [];
  };

  const activeLayout = localCustomization.layouts.find(l => l.id === localCustomization.activeLayoutId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dashboard Customization">
      <div className="space-y-6">
        {/* Layout Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-black">Dashboard Layouts</h3>
            <Button
              size="sm"
              onClick={() => setShowNewLayoutForm(true)}
              disabled={showNewLayoutForm}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Layout
            </Button>
          </div>

          {showNewLayoutForm && (
            <Card className="p-4 mb-4 border-dashed">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Layout name"
                  value={newLayoutName}
                  onChange={(value) => setNewLayoutName(value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={handleCreateLayout}>
                  <Save className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => {
                    setShowNewLayoutForm(false);
                    setNewLayoutName('');
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-2">
            {localCustomization.layouts.map((layout) => (
              <Card 
                key={layout.id} 
                className={`p-4 ${
                  layout.id === localCustomization.activeLayoutId 
                    ? 'border-black bg-gray-50' 
                    : 'hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-black">{layout.name}</p>
                      <p className="text-xs text-gray-500">
                        {layout.widgets.filter(w => w.isVisible).length} widgets visible
                      </p>
                    </div>
                    {layout.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant={layout.id === localCustomization.activeLayoutId ? 'primary' : 'secondary'}
                      onClick={() => handleSetActiveLayout(layout.id)}
                    >
                      {layout.id === localCustomization.activeLayoutId ? 'Active' : 'Use'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingLayout(layout)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!layout.isDefault && localCustomization.layouts.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteLayout(layout.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Widget Configuration */}
        {activeLayout && (
          <div>
            <h3 className="font-medium text-black mb-4">Widget Configuration</h3>
            <div className="space-y-2">
              {activeLayout.widgets.map((widget) => (
                <div 
                  key={widget.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleWidget(activeLayout.id, widget.id)}
                      disabled={!widget.isCustomizable}
                    >
                      {widget.isVisible ? (
                        <Eye className="w-4 h-4 text-green-600" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <div>
                      <p className="text-sm font-medium text-black">{widget.title}</p>
                      <p className="text-xs text-gray-500">
                        {widget.type} • {widget.size}
                        {!widget.isCustomizable && ' • Required'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    widget.isVisible ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {widget.isVisible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        <div>
          <h3 className="font-medium text-black mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Refresh Interval</p>
                <p className="text-xs text-gray-500">How often to update dashboard data</p>
              </div>
              <select
                value={localCustomization.preferences.refreshInterval}
                onChange={(e) => handleUpdatePreferences('refreshInterval', parseInt(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value={30}>30 seconds</option>
                <option value={60}>1 minute</option>
                <option value={300}>5 minutes</option>
                <option value={600}>10 minutes</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Show Notifications</p>
                <p className="text-xs text-gray-500">Display real-time notifications</p>
              </div>
              <Button
                size="sm"
                variant={localCustomization.preferences.showNotifications ? 'primary' : 'secondary'}
                onClick={() => handleUpdatePreferences('showNotifications', !localCustomization.preferences.showNotifications)}
              >
                {localCustomization.preferences.showNotifications ? 'On' : 'Off'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Compact Mode</p>
                <p className="text-xs text-gray-500">Use smaller widgets and spacing</p>
              </div>
              <Button
                size="sm"
                variant={localCustomization.preferences.compactMode ? 'primary' : 'secondary'}
                onClick={() => handleUpdatePreferences('compactMode', !localCustomization.preferences.compactMode)}
              >
                {localCustomization.preferences.compactMode ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DashboardCustomization;