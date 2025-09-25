import { UserRole } from '../../common/enums/user-role.enum';

export class UserProfileDto {
  id: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Student profile fields (only present for students)
  studentProfile?: {
    id: string;
    name: string;
    skills: string[];
    interests: string[];
    preferredSpecializations: string[];
    currentYear?: number;
    gpa?: number;
    profileUpdatedAt: Date;
  };

  // Supervisor profile fields (only present for supervisors)
  supervisorProfile?: {
    id: string;
    name: string;
    specializations: string[];
    maxStudents: number;
    isAvailable: boolean;
    officeLocation?: string;
    phoneNumber?: string;
  };
}
