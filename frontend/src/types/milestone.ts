// Milestone-related type definitions

export interface Milestone {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'critical';
    progress: number; // 0-100
    projectId?: string;
    studentId: string;
    supervisorId?: string;
    templateId?: string;
    category: string;
    tags: string[];
    estimatedHours?: number;
    actualHours?: number;
    dependencies: string[]; // Array of milestone IDs
    attachments: MilestoneAttachment[];
    notes: MilestoneNote[];
    reminders: MilestoneReminder[];
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

export interface MilestoneAttachment {
    id: string;
    filename: string;
    url: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
}

export interface MilestoneNote {
    id: string;
    content: string;
    authorId: string;
    authorName: string;
    createdAt: string;
    updatedAt: string;
}

export interface MilestoneReminder {
    id: string;
    type: 'email' | 'push' | 'sms';
    scheduledFor: string;
    message: string;
    sent: boolean;
    sentAt?: string;
}

export interface MilestoneTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    milestones: MilestoneTemplateItem[];
    estimatedDuration: number; // in days
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    usageCount: number;
    rating: number;
    isPublic: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface MilestoneTemplateItem {
    title: string;
    description: string;
    estimatedHours: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    category: string;
    dependencies: number[]; // Array of indices in the template
    daysFromStart: number;
}

export interface CreateMilestoneData {
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    projectId?: string;
    category: string;
    tags: string[];
    estimatedHours?: number;
    dependencies: string[];
    templateId?: string;
}

export interface UpdateMilestoneData extends Partial<CreateMilestoneData> {
    status?: 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'blocked';
    progress?: number;
    actualHours?: number;
}

export interface MilestoneFilters {
    status: ('not_started' | 'in_progress' | 'completed' | 'overdue' | 'blocked')[];
    priority: ('low' | 'medium' | 'high' | 'critical')[];
    categories: string[];
    tags: string[];
    dateRange: {
        from: Date | null;
        to: Date | null;
    } | null;
    projectId?: string;
    hasOverdueTasks: boolean | null;
}

export interface MilestoneStats {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    blocked: number;
    completionRate: number;
    averageCompletionTime: number; // in days
    upcomingDeadlines: Milestone[];
}

export interface MilestoneCalendarEvent {
    id: string;
    title: string;
    date: string;
    status: Milestone['status'];
    priority: Milestone['priority'];
    progress: number;
}

export interface MilestoneSearchParams {
    query?: string;
    status?: Milestone['status'][];
    priority?: Milestone['priority'][];
    category?: string;
    tags?: string[];
    projectId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: 'dueDate' | 'priority' | 'progress' | 'createdAt' | 'title';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
}

export interface MilestoneSearchResponse {
    milestones: Milestone[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    stats: MilestoneStats;
}

// Calendar integration types
export interface CalendarIntegration {
    id: string;
    provider: 'google' | 'outlook' | 'apple' | 'caldav';
    accountEmail: string;
    calendarId: string;
    calendarName: string;
    syncEnabled: boolean;
    lastSyncAt?: string;
    syncStatus: 'connected' | 'error' | 'syncing';
    errorMessage?: string;
}

export interface CalendarSyncSettings {
    autoSync: boolean;
    syncInterval: number; // in minutes
    includeCompleted: boolean;
    reminderMinutes: number[];
    defaultCalendar?: string;
}

// Progress tracking types
export interface MilestoneProgress {
    milestoneId: string;
    progress: number;
    timeSpent: number; // in minutes
    lastUpdated: string;
    notes?: string;
    blockers?: string[];
}

export interface ProgressUpdate {
    progress: number;
    timeSpent?: number;
    notes?: string;
    status?: Milestone['status'];
    blockers?: string[];
}