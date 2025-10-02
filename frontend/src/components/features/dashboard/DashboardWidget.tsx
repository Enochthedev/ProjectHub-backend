'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoreHorizontal, X, Maximize2, Minimize2 } from 'lucide-react';
import { WidgetProps } from './types';

interface DashboardWidgetProps extends WidgetProps {
  children?: React.ReactNode;
}

const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widget,
  onUpdate,
  onRemove,
  onResize,
  isEditing = false,
  children
}) => {
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-2 row-span-1';
      case 'large':
        return 'col-span-2 row-span-2';
      case 'full':
        return 'col-span-full row-span-1';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  const handleResize = (newSize: 'small' | 'medium' | 'large' | 'full') => {
    if (onResize) {
      onResize(widget.id, newSize);
    }
  };

  return (
    <Card 
      className={`
        ${getSizeClasses(widget.size)} 
        ${isEditing ? 'border-2 border-dashed border-gray-300' : ''}
        ${!widget.isVisible ? 'opacity-50' : ''}
        relative group transition-all duration-200
      `}
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-medium text-black">{widget.title}</h3>
        
        {isEditing && (
          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Resize Controls */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleResize('small')}
                className={widget.size === 'small' ? 'bg-gray-100' : ''}
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleResize('medium')}
                className={widget.size === 'medium' ? 'bg-gray-100' : ''}
              >
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleResize('large')}
                className={widget.size === 'large' ? 'bg-gray-100' : ''}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Remove Widget */}
            {onRemove && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemove(widget.id)}
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        {!isEditing && (
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Widget Content */}
      <div className="p-4 h-full">
        {children}
      </div>

      {/* Drag Handle for Editing */}
      {isEditing && (
        <div className="absolute top-2 left-2 w-2 h-2 bg-gray-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-move" />
      )}
    </Card>
  );
};

export default DashboardWidget;