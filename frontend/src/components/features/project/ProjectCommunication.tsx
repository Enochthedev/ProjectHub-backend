'use client';

import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/stores/project';
import { useAuthStore } from '@/stores/auth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { 
    MessageSquare, 
    Send, 
    Calendar,
    Clock,
    User,
    AlertCircle,
    CheckCircle,
    Video,
    Paperclip,
    Reply
} from 'lucide-react';
import { ProjectCommunication as CommunicationType } from '@/types/project';

interface ProjectCommunicationProps {
    projectId: string;
    recipientId: string;
    recipientType: 'student' | 'supervisor';
    className?: string;
}

export const ProjectCommunication: React.FC<ProjectCommunicationProps> = ({
    projectId,
    recipientId,
    recipientType,
    className
}) => {
    const { user } = useAuthStore();
    const {
        communications,
        unreadCommunications,
        isSendingMessage,
        getCommunications,
        sendMessage,
        sendMeetingRequest,
        markMessageAsRead
    } = useProjectStore();

    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [messageType, setMessageType] = useState<'message' | 'meeting_request'>('message');
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [meetingDetails, setMeetingDetails] = useState({
        proposedTimes: [''],
        duration: 60,
        location: '',
        isVirtual: true,
        agenda: ''
    });

    useEffect(() => {
        getCommunications(projectId);
    }, [projectId, getCommunications]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!subject.trim() || !content.trim()) return;

        try {
            if (messageType === 'meeting_request') {
                await sendMeetingRequest(projectId, recipientId, {
                    ...meetingDetails,
                    agenda: content
                });
            } else {
                await sendMessage(projectId, recipientId, subject, content, messageType);
            }
            
            setIsComposeOpen(false);
            setSubject('');
            setContent('');
            setMeetingDetails({
                proposedTimes: [''],
                duration: 60,
                location: '',
                isVirtual: true,
                agenda: ''
            });
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleMarkAsRead = async (messageId: string) => {
        try {
            await markMessageAsRead(messageId);
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    };

    const addProposedTime = () => {
        setMeetingDetails(prev => ({
            ...prev,
            proposedTimes: [...prev.proposedTimes, '']
        }));
    };

    const updateProposedTime = (index: number, value: string) => {
        setMeetingDetails(prev => ({
            ...prev,
            proposedTimes: prev.proposedTimes.map((time, i) => i === index ? value : time)
        }));
    };

    const removeProposedTime = (index: number) => {
        setMeetingDetails(prev => ({
            ...prev,
            proposedTimes: prev.proposedTimes.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Communication
                    {unreadCommunications > 0 && (
                        <Badge className="bg-red-100 text-red-800">
                            {unreadCommunications} new
                        </Badge>
                    )}
                </h3>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsComposeOpen(true)}
                    className="flex items-center gap-2"
                >
                    <Send className="w-4 h-4" />
                    New Message
                </Button>
            </div>

            {/* Messages List */}
            <div className="space-y-4">
                {communications.length === 0 ? (
                    <Card className="p-8 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">No messages yet</p>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsComposeOpen(true)}
                        >
                            Start Conversation
                        </Button>
                    </Card>
                ) : (
                    communications.map((message) => (
                        <MessageCard
                            key={message.id}
                            message={message}
                            currentUserId={user?.id || ''}
                            onMarkAsRead={handleMarkAsRead}
                        />
                    ))
                )}
            </div>

            {/* Compose Message Modal */}
            <Modal
                isOpen={isComposeOpen}
                onClose={() => setIsComposeOpen(false)}
                title="New Message"
                size="lg"
            >
                <form onSubmit={handleSendMessage} className="space-y-6">
                    {/* Message Type */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Message Type</label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={messageType === 'message' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setMessageType('message')}
                            >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Message
                            </Button>
                            <Button
                                type="button"
                                variant={messageType === 'meeting_request' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setMessageType('meeting_request')}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Meeting Request
                            </Button>
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium mb-2">
                            Subject *
                        </label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter message subject..."
                            required
                        />
                    </div>

                    {/* Meeting Details (if meeting request) */}
                    {messageType === 'meeting_request' && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded">
                            <h4 className="font-medium">Meeting Details</h4>
                            
                            {/* Proposed Times */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Proposed Times
                                </label>
                                {meetingDetails.proposedTimes.map((time, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <Input
                                            type="datetime-local"
                                            value={time}
                                            onChange={(e) => updateProposedTime(index, e.target.value)}
                                            className="flex-1"
                                        />
                                        {meetingDetails.proposedTimes.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeProposedTime(index)}
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={addProposedTime}
                                >
                                    Add Another Time
                                </Button>
                            </div>

                            {/* Duration */}
                            <div>
                                <label htmlFor="duration" className="block text-sm font-medium mb-2">
                                    Duration (minutes)
                                </label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={meetingDetails.duration}
                                    onChange={(e) => setMeetingDetails(prev => ({
                                        ...prev,
                                        duration: parseInt(e.target.value) || 60
                                    }))}
                                    min="15"
                                    max="240"
                                />
                            </div>

                            {/* Meeting Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Meeting Type</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={meetingDetails.isVirtual ? 'primary' : 'secondary'}
                                        size="sm"
                                        onClick={() => setMeetingDetails(prev => ({ ...prev, isVirtual: true }))}
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        Virtual
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={!meetingDetails.isVirtual ? 'primary' : 'secondary'}
                                        size="sm"
                                        onClick={() => setMeetingDetails(prev => ({ ...prev, isVirtual: false }))}
                                    >
                                        <User className="w-4 h-4 mr-2" />
                                        In Person
                                    </Button>
                                </div>
                            </div>

                            {/* Location */}
                            {!meetingDetails.isVirtual && (
                                <div>
                                    <label htmlFor="location" className="block text-sm font-medium mb-2">
                                        Location
                                    </label>
                                    <Input
                                        id="location"
                                        value={meetingDetails.location}
                                        onChange={(e) => setMeetingDetails(prev => ({
                                            ...prev,
                                            location: e.target.value
                                        }))}
                                        placeholder="Enter meeting location..."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content/Agenda */}
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium mb-2">
                            {messageType === 'meeting_request' ? 'Agenda' : 'Message'} *
                        </label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={
                                messageType === 'meeting_request'
                                    ? 'Enter meeting agenda and topics to discuss...'
                                    : 'Enter your message...'
                            }
                            rows={6}
                            required
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsComposeOpen(false)}
                            disabled={isSendingMessage}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSendingMessage || !subject.trim() || !content.trim()}
                            loading={isSendingMessage}
                            className="flex-1"
                        >
                            {isSendingMessage ? 'Sending...' : 
                             messageType === 'meeting_request' ? 'Send Meeting Request' : 'Send Message'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// Message Card Component
interface MessageCardProps {
    message: CommunicationType;
    currentUserId: string;
    onMarkAsRead: (messageId: string) => void;
}

const MessageCard: React.FC<MessageCardProps> = ({ message, currentUserId, onMarkAsRead }) => {
    const isFromCurrentUser = message.fromUserId === currentUserId;
    const [showDetails, setShowDetails] = useState(false);

    const handleCardClick = () => {
        if (!message.isRead && !isFromCurrentUser) {
            onMarkAsRead(message.id);
        }
        setShowDetails(!showDetails);
    };

    const getMessageTypeIcon = () => {
        switch (message.type) {
            case 'meeting_request':
                return <Calendar className="w-4 h-4" />;
            case 'urgent':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            default:
                return <MessageSquare className="w-4 h-4" />;
        }
    };

    const getMessageTypeColor = () => {
        switch (message.type) {
            case 'meeting_request':
                return 'bg-blue-100 text-blue-800';
            case 'urgent':
                return 'bg-red-100 text-red-800';
            case 'milestone_feedback':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <Card 
            className={`p-4 cursor-pointer transition-colors ${
                !message.isRead && !isFromCurrentUser ? 'border-blue-200 bg-blue-50' : ''
            }`}
            onClick={handleCardClick}
        >
            <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isFromCurrentUser ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                    <User className="w-4 h-4" />
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                                {isFromCurrentUser ? 'You' : 
                                 message.fromUserType === 'supervisor' ? 'Supervisor' : 'Student'}
                            </span>
                            <Badge className={getMessageTypeColor()}>
                                {getMessageTypeIcon()}
                                <span className="ml-1">{message.type.replace('_', ' ')}</span>
                            </Badge>
                            {message.isUrgent && (
                                <Badge className="bg-red-100 text-red-800">
                                    Urgent
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {new Date(message.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                    
                    <h4 className="font-medium mb-1">{message.subject}</h4>
                    
                    <p className={`text-sm text-gray-600 ${showDetails ? '' : 'line-clamp-2'}`}>
                        {message.content}
                    </p>
                    
                    {message.meetingDetails && showDetails && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                            <h5 className="font-medium text-sm mb-2">Meeting Details</h5>
                            <div className="space-y-1 text-sm">
                                <div>Duration: {message.meetingDetails.duration} minutes</div>
                                <div>Type: {message.meetingDetails.isVirtual ? 'Virtual' : 'In Person'}</div>
                                {message.meetingDetails.location && (
                                    <div>Location: {message.meetingDetails.location}</div>
                                )}
                                <div>Proposed Times:</div>
                                <ul className="ml-4 space-y-1">
                                    {message.meetingDetails.proposedTimes.map((time, index) => (
                                        <li key={index}>
                                            {new Date(time).toLocaleString()}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                            <Paperclip className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                                {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                            {!message.isRead && !isFromCurrentUser && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            {message.isRead && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            )}
                        </div>
                        
                        {message.requiresResponse && (
                            <Button variant="ghost" size="sm">
                                <Reply className="w-4 h-4 mr-2" />
                                Reply
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};