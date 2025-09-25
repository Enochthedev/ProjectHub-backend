import {
  UpdateStudentProfileDto,
  UpdateSupervisorProfileDto,
  ChangePasswordDto,
} from '../../dto/profile';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export class ProfileFixtures {
  static createValidUpdateStudentProfileDto(
    overrides: Partial<UpdateStudentProfileDto> = {},
  ): UpdateStudentProfileDto {
    return {
      name: 'Updated Student Name',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      interests: [
        'Web Development',
        'Full Stack Development',
        'Software Engineering',
      ],
      preferredSpecializations: [SPECIALIZATIONS[1], SPECIALIZATIONS[6]], // Web Dev & Software Engineering
      currentYear: 4,
      gpa: 3.8,
      ...overrides,
    };
  }

  static createValidUpdateSupervisorProfileDto(
    overrides: Partial<UpdateSupervisorProfileDto> = {},
  ): UpdateSupervisorProfileDto {
    return {
      name: 'Updated Supervisor Name',
      specializations: [SPECIALIZATIONS[0], SPECIALIZATIONS[4]], // AI & Data Science
      maxStudents: 6,
      isAvailable: true,
      officeLocation: 'Updated Office Location',
      phoneNumber: '+234-801-234-5678',
      ...overrides,
    };
  }

  static createValidChangePasswordDto(
    overrides: Partial<ChangePasswordDto> = {},
  ): ChangePasswordDto {
    return {
      currentPassword: 'CurrentPass123!',
      newPassword: 'NewSecurePass123!',
      ...overrides,
    };
  }

  // Invalid DTOs for negative testing
  static createInvalidUpdateStudentProfileDto(
    type: 'name' | 'skills' | 'gpa' | 'year',
  ): Partial<UpdateStudentProfileDto> {
    const base = this.createValidUpdateStudentProfileDto();

    switch (type) {
      case 'name':
        return { ...base, name: '' }; // Empty name
      case 'skills':
        return { ...base, skills: [] }; // Empty skills array
      case 'gpa':
        return { ...base, gpa: 5.0 }; // Invalid GPA (> 4.0)
      case 'year':
        return { ...base, currentYear: 6 }; // Invalid year
      default:
        return base;
    }
  }

  static createInvalidUpdateSupervisorProfileDto(
    type: 'name' | 'specializations' | 'maxStudents',
  ): Partial<UpdateSupervisorProfileDto> {
    const base = this.createValidUpdateSupervisorProfileDto();

    switch (type) {
      case 'name':
        return { ...base, name: '' }; // Empty name
      case 'specializations':
        return { ...base, specializations: [] }; // Empty specializations
      case 'maxStudents':
        return { ...base, maxStudents: 0 }; // Invalid max students
      default:
        return base;
    }
  }

  static createInvalidChangePasswordDto(
    type: 'current' | 'new' | 'weak',
  ): Partial<ChangePasswordDto> {
    const base = this.createValidChangePasswordDto();

    switch (type) {
      case 'current':
        return { ...base, currentPassword: '' }; // Empty current password
      case 'new':
        return { ...base, newPassword: '' }; // Empty new password
      case 'weak':
        return { ...base, newPassword: 'weak' }; // Weak new password
      default:
        return base;
    }
  }

  // Bulk data for performance testing
  static createBulkStudentProfileUpdates(
    count: number,
  ): UpdateStudentProfileDto[] {
    const profiles: UpdateStudentProfileDto[] = [];
    const skillsPool = [
      'JavaScript',
      'Python',
      'Java',
      'C++',
      'React',
      'Angular',
      'Vue.js',
      'Node.js',
      'Django',
      'Spring Boot',
    ];
    const interestsPool = [
      'Web Development',
      'Mobile Development',
      'Machine Learning',
      'Data Science',
      'Cybersecurity',
      'Cloud Computing',
    ];

    for (let i = 0; i < count; i++) {
      const randomSkills = this.getRandomItems(
        skillsPool,
        Math.floor(Math.random() * 4) + 2,
      );
      const randomInterests = this.getRandomItems(
        interestsPool,
        Math.floor(Math.random() * 3) + 1,
      );
      const randomSpecializations = this.getRandomItems(
        Array.from(SPECIALIZATIONS),
        Math.floor(Math.random() * 2) + 1,
      );

      profiles.push({
        name: `Bulk Student ${i + 1}`,
        skills: randomSkills,
        interests: randomInterests,
        preferredSpecializations: randomSpecializations,
        currentYear: Math.floor(Math.random() * 2) + 3, // 3 or 4
        gpa: Math.round((Math.random() * 2 + 2.5) * 100) / 100, // 2.5 to 4.5
      });
    }

    return profiles;
  }

  static createBulkSupervisorProfileUpdates(
    count: number,
  ): UpdateSupervisorProfileDto[] {
    const profiles: UpdateSupervisorProfileDto[] = [];

    for (let i = 0; i < count; i++) {
      const randomSpecializations = this.getRandomItems(
        Array.from(SPECIALIZATIONS),
        Math.floor(Math.random() * 3) + 1,
      );

      profiles.push({
        name: `Bulk Supervisor ${i + 1}`,
        specializations: randomSpecializations,
        maxStudents: Math.floor(Math.random() * 5) + 3, // 3 to 7
        isAvailable: Math.random() > 0.2, // 80% available
        officeLocation: `Bulk Office ${100 + i}`,
        phoneNumber: `+234-80${String(i).padStart(8, '0')}`,
      });
    }

    return profiles;
  }

  private static getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}
