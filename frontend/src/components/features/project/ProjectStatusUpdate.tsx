'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { 
    CheckCircle, 
    Clock, 
    AlertTriangle, 
    X, 
    Upload,
    FileText,
    Calendar
} from 'lucide-react';

interface ProjectStatusUpdateProps {
    projectId: string;
    currentStatus: string;
    onClose?: () => void;
}

export const ProjectStatusUpdate: React.FC<ProjectStatusUpdateProps> = ({
    projectId,
    currentStatus,
    onClose
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [newStatus, setNewStatus] = useState(currentStatus);
    const [description, setDescription] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    
    const { 
        updateProjectStatus, 
        isUpdatingStatus,
        currentProjectError 
    } = useProjectStore();

    const statusOptions = [
        { value: 'assigned', label: 'Assigned', color: 'bg-blue-100 text-blue-800' },
        { value: 'in_progress', label: 'In Progress', color: 'bg-green-100 text-green-800' },
        { value: 'on_hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-800' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!description.trim()) {
            return;
        }

        try {
            await updateProjectStatus(projectId, newStatus, description, attachments);
            setIsOpen(false);
            setDescription('');
            setAttachments([]);
            onClose?.();
        } catch (error) {
            console.error('Failed to update project status:', error);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setAttachments(prev => [...prev, ...files]);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2"
            >
                <Clock className="w-4 h-4" />
                Update Status
            </Button>

            <Modal 
                isOpen={isOpen} 
                onClose={() => setIsOpen(false)}
                title="Update Project Status"
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Status */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Current Status</label>
                        <Badge className={statusOptions.find(s => s.value === currentStatus)?.color}>
                            {statusOptions.find(s => s.value === currentStatus)?.label}
                        </Badge>
                    </div>

                    {/* New Status */}
                    <div>
                        <label className="block text-sm font-medium mb-2">New Status</label>
                        <div className="grid grid-cols-2 gap-2">
                            {statusOptions.map((status) => (
                                <button
                                    key={status.value}
                                    type="button"
                                    onClick={() => setNewStatus(status.value)}
                                    className={`p-3 border-2 rounded text-sm font-medium transition-colors ${
                                        newStatus === status.value
                                            ? 'border-black bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className={`inline-block px-2 py-1 rounded text-xs ${status.color} mb-1`}>
                                        {status.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium mb-2">
                            Description *
                        </label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe the reason for this status change and any relevant details..."
                            rows={4}
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            This will be visible to your supervisor and will be logged in the project history.
                        </p>
                    </div>

                    {/* File Attachments */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Attachments (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded p-4">
                            <input
                                type="file"
                                multiple
                                onChange={handleFileUpload}
                                className="hidden"
                                id="file-upload"
                                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                            />
                            <label 
                                htmlFor="file-upload"
                                className="flex flex-col items-center cursor-pointer"
                            >
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">
                                    Click to upload files or drag and drop
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    PDF, DOC, TXT, PNG, JPG up to 10MB each
                                </span>
                            </label>
                        </div>

                        {/* Attachment List */}
                        {attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {attachments.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm">{file.name}</span>
                                            <span className="text-xs text-gray-500">
                                                ({(file.size / 1024 / 1024).toFixed(1)} MB)
                                            </span>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeAttachment(index)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Status Change Impact */}
                    {newStatus !== currentStatus && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-medium text-blue-800 mb-1">
                                        Status Change Impact
                                    </h4>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        {newStatus === 'on_hold' && (
                                            <li>• Milestone deadlines will be paused</li>
                                        )}
                                        {newStatus === 'completed' && (
                                            <li>• All milestones will be marked as completed</li>
                                        )}
                                        {newStatus === 'cancelled' && (
                                            <li>• Project will be archived and removed from active projects</li>
                                        )}
                                        <li>• Your supervisor will be notified of this change</li>
                                        <li>• This update requires supervisor approval</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {currentProjectError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span className="text-sm text-red-800">{currentProjectError}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsOpen(false)}
                            disabled={isUpdatingStatus}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isUpdatingStatus || !description.trim()}
                            loading={isUpdatingStatus}
                            className="flex-1"
                        >
                            {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

// Status History Component
interface StatusHistoryProps {
    projectId: string;
}

export const StatusHistory: React.FC<StatusHistoryProps> = ({ projectId }) => {
    const { statusUpdates, getStatusUpdates } = useProjectStore();
    const [isLoading, setIsLoading] = useState(false);

    React.useEffect(() => {
        const loadStatusUpdates = async () => {
            setIsLoading(true);
            try {
                await getStatusUpdates(projectId);
            } catch (error) {
                console.error('Failed to load status updates:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStatusUpdates();
    }, [projectId, getStatusUpdates]);

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="flex-1">
                                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Status History
            </h3>
            
            {statusUpdates.length === 0 ? (
                <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No status updates yet</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {statusUpdates.map((update, index) => {
                        const isLatest = index === 0;
                        const statusColor = {
                            assigned: 'bg-blue-100 text-blue-800',
                            in_progress: 'bg-green-100 text-green-800',
                            on_hold: 'bg-yellow-100 text-yellow-800',
                            completed: 'bg-gray-100 text-gray-800',
                            cancelled: 'bg-red-100 text-red-800'
                        };

                        return (
                            <div key={update.id} className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isLatest ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                    {isLatest ? (
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-gray-500" />
                                    )}
                                </div>
                                
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className={statusColor[update.newStatus as keyof typeof statusColor]}>
                                            {update.newStatus.replace('_', ' ')}
                                        </Badge>
                                        {update.approvalStatus && (
                                            <Badge variant={
                                                update.approvalStatus === 'approved' ? 'success' :
                                                update.approvalStatus === 'rejected' ? 'error' : 'warning'
                                            }>
                                                {update.approvalStatus}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-700 mb-1">{update.description}</p>
                                    
                                    <div className="text-xs text-gray-500">
                                        {new Date(update.createdAt).toLocaleDateString()} at{' '}
                                        {new Date(update.createdAt).toLocaleTimeString()}
                                    </div>
                                    
                                    {update.approvalNotes && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                                            <span className="font-medium">Supervisor Notes: </span>
                                            {update.approvalNotes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};