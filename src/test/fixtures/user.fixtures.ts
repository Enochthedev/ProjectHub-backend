import * as bcrypt from 'bcrypt';
import { User, StudentProfile, SupervisorProfile } from '../../entities';
import { UserRole } from '../../common/enums/user-role.enum';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export class UserFixtures {
  static async createTestUser(
    overrides: Partial<User> = {},
  ): Promise<Partial<User>> {
    const hashedPassword = await bcrypt.hash('TestPass123!', 12);

    return {
      email: 'test.user@ui.edu.ng',
      password: hashedPassword,
      role: UserRole.STUDENT,
      isEmailVerified: true,
      isActive: true,
      emailVerificationToken: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      ...overrides,
    };
  }

  static async createTestStudent(
    overrides: Partial<User> = {},
  ): Promise<Partial<User>> {
    return this.createTestUser({
      email: 'student.test@ui.edu.ng',
      role: UserRole.STUDENT,
      ...overrides,
    });
  }

  static async createTestSupervisor(
    overrides: Partial<User> = {},
  ): Promise<Partial<User>> {
    return this.createTestUser({
      email: 'supervisor.test@ui.edu.ng',
      role: UserRole.SUPERVISOR,
      ...overrides,
    });
  }

  static async createTestAdmin(
    overrides: Partial<User> = {},
  ): Promise<Partial<User>> {
    return this.createTestUser({
      email: 'admin.test@ui.edu.ng',
      role: UserRole.ADMIN,
      ...overrides,
    });
  }

  static createTestStudentProfile(
    overrides: Partial<StudentProfile> = {},
  ): Partial<StudentProfile> {
    return {
      name: 'Test Student',
      skills: ['JavaScript', 'Python', 'React'],
      interests: ['Web Development', 'Machine Learning'],
      preferredSpecializations: [SPECIALIZATIONS[0], SPECIALIZATIONS[1]],
      currentYear: 4,
      gpa: 3.5,
      ...overrides,
    };
  }

  static createTestSupervisorProfile(
    overrides: Partial<SupervisorProfile> = {},
  ): Partial<SupervisorProfile> {
    return {
      name: 'Test Supervisor',
      specializations: [SPECIALIZATIONS[0], SPECIALIZATIONS[2]],
      maxStudents: 5,
      isAvailable: true,
      officeLocation: 'Test Office 101',
      phoneNumber: '+234-800-000-0000',
      ...overrides,
    };
  }

  // Batch creation methods for performance testing
  static async createMultipleStudents(count: number): Promise<Partial<User>[]> {
    const users: Partial<User>[] = [];
    const hashedPassword = await bcrypt.hash('TestPass123!', 12);

    for (let i = 0; i < count; i++) {
      users.push({
        email: `student${i}@ui.edu.ng`,
        password: hashedPassword,
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isActive: true,
      });
    }

    return users;
  }

  static async createMultipleSupervisors(
    count: number,
  ): Promise<Partial<User>[]> {
    const users: Partial<User>[] = [];
    const hashedPassword = await bcrypt.hash('TestPass123!', 12);

    for (let i = 0; i < count; i++) {
      users.push({
        email: `supervisor${i}@ui.edu.ng`,
        password: hashedPassword,
        role: UserRole.SUPERVISOR,
        isEmailVerified: true,
        isActive: true,
      });
    }

    return users;
  }

  static createMultipleStudentProfiles(
    count: number,
  ): Partial<StudentProfile>[] {
    const profiles: Partial<StudentProfile>[] = [];
    const skillsPool = [
      'JavaScript',
      'Python',
      'Java',
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
        name: `Test Student ${i + 1}`,
        skills: randomSkills,
        interests: randomInterests,
        preferredSpecializations: randomSpecializations,
        currentYear: Math.floor(Math.random() * 2) + 3, // 3 or 4
        gpa: Math.round((Math.random() * 2 + 2.5) * 100) / 100, // 2.5 to 4.5
      });
    }

    return profiles;
  }

  static createMultipleSupervisorProfiles(
    count: number,
  ): Partial<SupervisorProfile>[] {
    const profiles: Partial<SupervisorProfile>[] = [];

    for (let i = 0; i < count; i++) {
      const randomSpecializations = this.getRandomItems(
        Array.from(SPECIALIZATIONS),
        Math.floor(Math.random() * 3) + 1,
      );

      profiles.push({
        name: `Test Supervisor ${i + 1}`,
        specializations: randomSpecializations,
        maxStudents: Math.floor(Math.random() * 5) + 3, // 3 to 7
        isAvailable: Math.random() > 0.2, // 80% available
        officeLocation: `Office ${100 + i}`,
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
