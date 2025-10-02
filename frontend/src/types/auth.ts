export interface User {
  id: string;
  email: string;
  role: 'student' | 'supervisor' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
  profile?: StudentProfile | SupervisorProfile | AdminProfile;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  studentId: string;
  specialization: string;
  year: number;
  interests: string[];
  skills: string[];
  profileUpdatedAt: string;
}

export interface SupervisorProfile {
  id: string;
  name: string;
  specializations: string[];
  isAvailable: boolean;
  capacity: number;
  profileUpdatedAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  role: 'student' | 'supervisor';
  name: string;
  specializations?: string[];
  skills?: string[];
  interests?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  name?: string;
  specialization?: string;
  specializations?: string[];
  interests?: string[];
  skills?: string[];
  year?: number;
  capacity?: number;
  isAvailable?: boolean;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  milestoneReminders: boolean;
  projectUpdates: boolean;
  aiAssistantUpdates: boolean;
  weeklyDigest: boolean;
  marketingEmails: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'contacts';
  showEmail: boolean;
  showProjects: boolean;
  allowDirectMessages: boolean;
  dataProcessingConsent: boolean;
}

export interface UserSettings {
  id: string;
  userId: string;
  notificationPreferences: NotificationPreferences;
  privacySettings: PrivacySettings;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}
