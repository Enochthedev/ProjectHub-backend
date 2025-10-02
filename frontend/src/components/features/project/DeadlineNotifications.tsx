'use client';

import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/project';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
    Bell, 
    Clock, 
    AlertTriangle, 
    Calendar,
    CheckCircle,
    X,
    ExternalLink,
    Filter
} from 'lucide-react';
import { ProjectDeadlineNotification } from '@/types/project';

interface DeadlineNotificationsProps {
    className?: string;
}

export const DeadlineNotifications: React.FC<DeadlineNotificationsProps> = ({ className }) => {
    const {
        deadlineNotifications,
        getDeadlineNotifications,
        dismissNotification,
        markNotificationAsRead
    } = useProjectStore();

    const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadNotifications = async () => {
            setIsLoading(true);
            try {
                await getDeadlineNotifications();
            } catch (error) {
                console.error('Failed to load notifications:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadNotifications();
    }, [getDeadlineNotifications]);

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleDismiss = async (notificationId: string) => {
        try {
            await dismissNotification(notificationId);
        } catch (error) {
            console.error('Failed to dismiss notification:', error);
        }
    };

    const filteredNotifications = deadlineNotifications.filter(notification => {
        if (notification.isDismissed) return false;
        
        switch (filter) {
            case 'unread':
                return !notification.isRead;
            case 'urgent':
                return notification.urgency === 'high' || notification.urgency === 'critical';
            default:
                return true;
        }
    });

    const unreadCount = deadlineNotifications.filter(n => !n.isRead && !n.isDismissed).length;
    const urgentCount = deadlineNotifications.filter(n => 
        (n.urgency === 'high' || n.urgency === 'critical') && !n.isDismissed
    ).length;

    if (isLoading) {
        return (
            <Card className={`p-6 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className={className}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notifications
                    {unreadCount > 0 && (
                        <Badge className="bg-red-100 text-red-800">
                            {unreadCount}
                        </Badge>
                    )}
                </h3>
                
                {/* Filter Buttons */}
                <div className="flex gap-2">
                    <Button
                        variant={filter === 'all' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilter('all')}
                    >
                        All
                    </Button>
                    <Button
                        variant={filter === 'unread' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilter('unread')}
                        className="flex items-center gap-1"
                    >
                        <Filter className="w-3 h-3" />
                        Unread {unreadCount > 0 && `(${unreadCount})`}
                    </Button>
                    <Button
                        variant={filter === 'urgent' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setFilter('urgent')}
                        className="flex items-center gap-1"
                    >
                        <AlertTriangle className="w-3 h-3" />
                        Urgent {urgentCount > 0 && `(${urgentCount})`}
                    </Button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">
                            {filter === 'all' ? 'No notifications' :
                             filter === 'unread' ? 'No unread notifications' :
                             'No urgent notifications'}
                        </p>
                    </Card>
                ) : (
                    filteredNotifications.map((notification) => (
                        <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={handleMarkAsRead}
                            onDismiss={handleDismiss}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

// Notification Card Component
interface NotificationCardProps {
    notification: ProjectDeadlineNotification;
    onMarkAsRead: (id: string) => void;
    onDismiss: (id: string) => void;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
    notification,
    onMarkAsRead,
    onDismiss
}) => {
    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'critical':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'high':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'upcoming_deadline':
                return <Clock className="w-4 h-4" />;
            case 'overdue':
                return <AlertTriangle className="w-4 h-4" />;
            case 'milestone_due':
                return <Calendar className="w-4 h-4" />;
            default:
                return <Bell className="w-4 h-4" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'overdue':
                return 'bg-red-100 text-red-800';
            case 'upcoming_deadline':
                return 'bg-yellow-100 text-yellow-800';
            case 'milestone_due':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleCardClick = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
    };

    const handleActionClick = () => {
        if (notification.actionUrl) {
            window.open(notification.actionUrl, '_blank');
        }
    };

    return (
        <Card 
            className={`p-4 cursor-pointer transition-all ${
                !notification.isRead ? 'border-l-4 border-l-blue-500 bg-blue-50' : ''
            } ${getUrgencyColor(notification.urgency)}`}
            onClick={handleCardClick}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    notification.urgency === 'critical' ? 'bg-red-100' :
                    notification.urgency === 'high' ? 'bg-orange-100' :
                    notification.urgency === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                    {getTypeIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h4 className="font-medium">{notification.title}</h4>
                            <Badge className={getTypeColor(notification.type)}>
                                {notification.type.replace('_', ' ')}
                            </Badge>
                            <Badge className={getUrgencyColor(notification.urgency)}>
                                {notification.urgency}
                            </Badge>
                        </div>
                        
                        {/* Status Indicators */}
                        <div className="flex items-center gap-2">
                            {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDismiss(notification.id);
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{notification.message}</p>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <div className="flex items-center gap-4">
                            <span>
                                Scheduled: {new Date(notification.scheduledFor).toLocaleDateString()}
                            </span>
                            {notification.sentAt && (
                                <span>
                                    Sent: {new Date(notification.sentAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        
                        {/* Delivery Status */}
                        <div className="flex items-center gap-2">
                            {notification.deliveryStatus.email && (
                                <Badge variant="outline" className="text-xs">
                                    Email: {notification.deliveryStatus.email}
                                </Badge>
                            )}
                            {notification.deliveryStatus.inApp && (
                                <Badge variant="outline" className="text-xs">
                                    App: {notification.deliveryStatus.inApp}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    {notification.actionRequired && notification.actionUrl && (
                        <div className="flex gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleActionClick();
                                }}
                                className="flex items-center gap-2"
                            >
                                <ExternalLink className="w-3 h-3" />
                                {notification.actionType === 'update_status' && 'Update Status'}
                                {notification.actionType === 'submit_milestone' && 'Submit Milestone'}
                                {notification.actionType === 'schedule_meeting' && 'Schedule Meeting'}
                                {notification.actionType === 'provide_feedback' && 'Provide Feedback'}
                                {!notification.actionType && 'Take Action'}
                            </Button>
                            
                            {!notification.isRead && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsRead(notification.id);
                                    }}
                                >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Mark Read
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

// Notification Summary Widget (for dashboard)
export const NotificationSummaryWidget: React.FC<{ className?: string }> = ({ className }) => {
    const { deadlineNotifications, getDeadlineNotifications } = useProjectStore();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const loadNotifications = async () => {
            setIsLoading(true);
            try {
                await getDeadlineNotifications();
            } finally {
                setIsLoading(false);
            }
        };

        loadNotifications();
    }, [getDeadlineNotifications]);

    const activeNotifications = deadlineNotifications.filter(n => !n.isDismissed);
    const unreadCount = activeNotifications.filter(n => !n.isRead).length;
    const urgentCount = activeNotifications.filter(n => 
        n.urgency === 'high' || n.urgency === 'critical'
    ).length;

    if (isLoading) {
        return (
            <Card className={`p-4 ${className}`}>
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                </div>
            </Card>
        );
    }

    return (
        <Card className={`p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Notifications
                </h4>
                {unreadCount > 0 && (
                    <Badge className="bg-red-100 text-red-800">
                        {unreadCount}
                    </Badge>
                )}
            </div>

            {activeNotifications.length === 0 ? (
                <p className="text-sm text-gray-500">No active notifications</p>
            ) : (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>Total Active:</span>
                        <span className="font-medium">{activeNotifications.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Unread:</span>
                        <span className="font-medium text-blue-600">{unreadCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span>Urgent:</span>
                        <span className="font-medium text-red-600">{urgentCount}</span>
                    </div>
                </div>
            )}

            {activeNotifications.length > 0 && (
                <Button variant="secondary" size="sm" className="w-full mt-3">
                    View All Notifications
                </Button>
            )}
        </Card>
    );
};