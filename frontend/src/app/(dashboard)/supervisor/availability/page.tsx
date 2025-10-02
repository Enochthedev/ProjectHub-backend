'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { 
  Clock, 
  Users, 
  Calendar, 
  MapPin,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { api } from '@/lib/api';

// Types based on backend DTOs
interface AvailabilitySlot {
  id: string;
  type: 'office_hours' | 'meeting_slots' | 'unavailable';
  dayOfWeek: number; // 0=Monday, 6=Sunday
  startTime: string;
  endTime: string;
  location: string | null;
  notes: string | null;
  maxCapacity: number;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupervisorAvailabilityData {
  supervisorId: string;
  supervisorName: string;
  availabilitySlots: AvailabilitySlot[];
  totalWeeklyCapacity: number;
  utilizationRate: number;
  nextAvailableSlot: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location: string | null;
  } | null;
  lastUpdated: string;
}

interface NewSlotForm {
  type: 'office_hours' | 'meeting_slots' | 'unavailable';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  maxCapacity: number;
  effectiveFrom: string;
  effectiveUntil: string;
}

export default function SupervisorAvailabilityPage() {
  const [availabilityData, setAvailabilityData] = useState<SupervisorAvailabilityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [newSlot, setNewSlot] = useState<NewSlotForm>({
    type: 'office_hours',
    dayOfWeek: 0, // Monday
    startTime: '09:00',
    endTime: '17:00',
    location: '',
    notes: '',
    maxCapacity: 1,
    effectiveFrom: '',
    effectiveUntil: ''
  });

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const SLOT_TYPES = [
    { value: 'office_hours', label: 'Office Hours', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'meeting_slots', label: 'Meeting Slots', color: 'bg-green-100 text-green-800 border-green-200' },
    { value: 'unavailable', label: 'Unavailable', color: 'bg-red-100 text-red-800 border-red-200' }
  ];

  useEffect(() => {
    fetchAvailabilityData();
  }, []);

  const fetchAvailabilityData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get('/supervisor/availability');
      setAvailabilityData(response);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load availability data');
      console.error('Availability fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSlot = async () => {
    try {
      const createData = {
        type: newSlot.type,
        dayOfWeek: newSlot.dayOfWeek,
        startTime: newSlot.startTime,
        endTime: newSlot.endTime,
        location: newSlot.location || null,
        notes: newSlot.notes || null,
        maxCapacity: newSlot.maxCapacity,
        effectiveFrom: newSlot.effectiveFrom || null,
        effectiveUntil: newSlot.effectiveUntil || null
      };

      await api.post('/supervisor/availability', createData);
      await fetchAvailabilityData(); // Refresh data
      setShowAddForm(false);
      resetNewSlotForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create availability slot');
    }
  };

  const handleUpdateSlot = async (slotId: string, updates: Partial<AvailabilitySlot>) => {
    try {
      await api.put(`/supervisor/availability/${slotId}`, updates);
      await fetchAvailabilityData(); // Refresh data
      setEditingSlot(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update availability slot');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;
    
    try {
      await api.delete(`/supervisor/availability/${slotId}`);
      await fetchAvailabilityData(); // Refresh data
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete availability slot');
    }
  };

  const resetNewSlotForm = () => {
    setNewSlot({
      type: 'office_hours',
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '17:00',
      location: '',
      notes: '',
      maxCapacity: 1,
      effectiveFrom: '',
      effectiveUntil: ''
    });
  };

  const getSlotTypeInfo = (type: string) => {
    return SLOT_TYPES.find(t => t.value === type) || SLOT_TYPES[0];
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS[dayOfWeek] || 'Unknown';
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return 'text-red-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const groupSlotsByDay = (slots: AvailabilitySlot[]) => {
    const grouped: { [key: number]: AvailabilitySlot[] } = {};
    slots.forEach(slot => {
      if (!grouped[slot.dayOfWeek]) {
        grouped[slot.dayOfWeek] = [];
      }
      grouped[slot.dayOfWeek].push(slot);
    });
    
    // Sort slots within each day by start time
    Object.keys(grouped).forEach(day => {
      grouped[parseInt(day)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-48 w-full" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-black mb-2">Failed to Load Availability</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAvailabilityData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!availabilityData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium mb-2">No Availability Data</h3>
          <p className="text-gray-500 mb-4">Start by adding your first availability slot.</p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Availability Slot
          </Button>
        </Card>
      </div>
    );
  }

  const groupedSlots = groupSlotsByDay(availabilityData.availabilitySlots);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">Availability Management</h1>
            <p className="text-gray-600">
              Manage your office hours, meeting slots, and availability for students.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={fetchAvailabilityData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Slot
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Weekly Capacity</p>
              <p className="text-2xl font-bold text-black">{availabilityData.totalWeeklyCapacity}</p>
              <p className="text-xs text-gray-500">hours per week</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Utilization Rate</p>
              <p className={`text-2xl font-bold ${getUtilizationColor(availabilityData.utilizationRate)}`}>
                {availabilityData.utilizationRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">current usage</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Slots</p>
              <p className="text-2xl font-bold text-black">{availabilityData.availabilitySlots.length}</p>
              <p className="text-xs text-gray-500">availability slots</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Next Available Slot */}
      {availabilityData.nextAvailableSlot && (
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Next Available Slot</h3>
              <p className="text-gray-600">
                {getDayName(availabilityData.nextAvailableSlot.dayOfWeek)} at{' '}
                {formatTime(availabilityData.nextAvailableSlot.startTime)} -{' '}
                {formatTime(availabilityData.nextAvailableSlot.endTime)}
                {availabilityData.nextAvailableSlot.location && (
                  <span className="ml-2">• {availabilityData.nextAvailableSlot.location}</span>
                )}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Weekly Schedule */}
      <Card className="mb-8">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-black">Weekly Schedule</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="border border-gray-200 rounded-lg p-4 min-h-[200px]">
                <h4 className="font-semibold text-black mb-3 text-center">{day}</h4>
                <div className="space-y-2">
                  {groupedSlots[dayIndex]?.map((slot) => {
                    const typeInfo = getSlotTypeInfo(slot.type);
                    return (
                      <div
                        key={slot.id}
                        className={`p-3 rounded border ${typeInfo.color} relative group`}
                      >
                        <div className="text-xs font-medium mb-1">
                          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                        </div>
                        <div className="text-xs mb-1">{typeInfo.label}</div>
                        {slot.location && (
                          <div className="text-xs text-gray-600 flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {slot.location}
                          </div>
                        )}
                        {slot.maxCapacity > 1 && (
                          <div className="text-xs text-gray-600 flex items-center mt-1">
                            <Users className="w-3 h-3 mr-1" />
                            Capacity: {slot.maxCapacity}
                          </div>
                        )}
                        
                        {/* Action buttons - show on hover */}
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex space-x-1">
                            <button
                              onClick={() => setEditingSlot(slot)}
                              className="w-6 h-6 bg-white rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Edit className="w-3 h-3 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="w-6 h-6 bg-white rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </button>
                          </div>
                        </div>
                        
                        {!slot.isActive && (
                          <div className="absolute inset-0 bg-gray-500 bg-opacity-50 rounded flex items-center justify-center">
                            <span className="text-xs text-white font-medium">Inactive</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {!groupedSlots[dayIndex]?.length && (
                    <div className="text-center text-gray-400 py-8">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No slots</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Add Slot Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-black">Add Availability Slot</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  resetNewSlotForm();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={newSlot.type}
                  onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value as any })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  {SLOT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                <select
                  value={newSlot.dayOfWeek}
                  onChange={(e) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <Input
                    type="time"
                    value={newSlot.startTime}
                    onChange={(value) => setNewSlot({ ...newSlot, startTime: value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <Input
                    type="time"
                    value={newSlot.endTime}
                    onChange={(value) => setNewSlot({ ...newSlot, endTime: value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <Input
                  value={newSlot.location}
                  onChange={(value) => setNewSlot({ ...newSlot, location: value })}
                  placeholder="e.g., Office 123, Building A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={newSlot.maxCapacity.toString()}
                  onChange={(value) => setNewSlot({ ...newSlot, maxCapacity: parseInt(value) || 1 })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={newSlot.notes}
                  onChange={(e) => setNewSlot({ ...newSlot, notes: e.target.value })}
                  placeholder="Additional notes about this slot..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleCreateSlot} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slot
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    resetNewSlotForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-black">Edit Availability Slot</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingSlot(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={editingSlot.type}
                  onChange={(e) => setEditingSlot({ ...editingSlot, type: e.target.value as any })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  {SLOT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                <select
                  value={editingSlot.dayOfWeek}
                  onChange={(e) => setEditingSlot({ ...editingSlot, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black"
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <Input
                    type="time"
                    value={editingSlot.startTime}
                    onChange={(value) => setEditingSlot({ ...editingSlot, startTime: value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <Input
                    type="time"
                    value={editingSlot.endTime}
                    onChange={(value) => setEditingSlot({ ...editingSlot, endTime: value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <Input
                  value={editingSlot.location || ''}
                  onChange={(value) => setEditingSlot({ ...editingSlot, location: value })}
                  placeholder="e.g., Office 123, Building A"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Capacity</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={editingSlot.maxCapacity.toString()}
                  onChange={(value) => setEditingSlot({ ...editingSlot, maxCapacity: parseInt(value) || 1 })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editingSlot.notes || ''}
                  onChange={(e) => setEditingSlot({ ...editingSlot, notes: e.target.value })}
                  placeholder="Additional notes about this slot..."
                  className="w-full px-3 py-2 border-2 border-gray-300 focus:border-black resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editingSlot.isActive}
                  onChange={(e) => setEditingSlot({ ...editingSlot, isActive: e.target.checked })}
                  className="w-4 h-4 text-black border-2 border-gray-300 focus:ring-black"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Active slot
                </label>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleUpdateSlot(editingSlot.id, editingSlot)}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditingSlot(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Last updated: {new Date(availabilityData.lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}