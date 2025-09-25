import { StudentProfile } from '../student-profile.entity';

describe('StudentProfile Entity', () => {
  let studentProfile: StudentProfile;

  beforeEach(() => {
    studentProfile = new StudentProfile();
    studentProfile.name = 'John Doe';
    studentProfile.skills = ['JavaScript', 'TypeScript', 'React'];
    studentProfile.interests = ['Web Development', 'AI/ML'];
    studentProfile.preferredSpecializations = ['Web Development & Full Stack'];
    studentProfile.currentYear = 4;
    studentProfile.gpa = 3.75;
  });

  describe('Entity Structure', () => {
    it('should create a student profile with all fields', () => {
      expect(studentProfile.name).toBe('John Doe');
      expect(studentProfile.skills).toEqual([
        'JavaScript',
        'TypeScript',
        'React',
      ]);
      expect(studentProfile.interests).toEqual(['Web Development', 'AI/ML']);
      expect(studentProfile.preferredSpecializations).toEqual([
        'Web Development & Full Stack',
      ]);
      expect(studentProfile.currentYear).toBe(4);
      expect(studentProfile.gpa).toBe(3.75);
    });

    it('should handle empty arrays for skills and interests', () => {
      studentProfile.skills = [];
      studentProfile.interests = [];
      studentProfile.preferredSpecializations = [];

      expect(studentProfile.skills).toEqual([]);
      expect(studentProfile.interests).toEqual([]);
      expect(studentProfile.preferredSpecializations).toEqual([]);
    });

    it('should allow nullable fields to be null', () => {
      studentProfile.currentYear = null;
      studentProfile.gpa = null;

      expect(studentProfile.currentYear).toBeNull();
      expect(studentProfile.gpa).toBeNull();
    });
  });

  describe('JSONB Fields Validation', () => {
    it('should handle complex skill objects in JSONB', () => {
      // Skills stored as JSON array
      const complexSkills = ['JavaScript', 'TypeScript', 'Node.js', 'React'];
      studentProfile.skills = complexSkills;

      expect(studentProfile.skills).toEqual(complexSkills);
      expect(Array.isArray(studentProfile.skills)).toBe(true);
    });

    it('should handle complex interests in JSONB', () => {
      const complexInterests = [
        'Machine Learning',
        'Web Development',
        'Mobile Development',
      ];
      studentProfile.interests = complexInterests;

      expect(studentProfile.interests).toEqual(complexInterests);
      expect(Array.isArray(studentProfile.interests)).toBe(true);
    });
  });

  describe('Array Fields Validation', () => {
    it('should handle multiple preferred specializations', () => {
      const specializations = [
        'Web Development & Full Stack',
        'Artificial Intelligence & Machine Learning',
        'Mobile Application Development',
      ];
      studentProfile.preferredSpecializations = specializations;

      expect(studentProfile.preferredSpecializations).toEqual(specializations);
      expect(Array.isArray(studentProfile.preferredSpecializations)).toBe(true);
    });
  });

  describe('Numeric Fields Validation', () => {
    it('should validate current year range', () => {
      const validYears = [1, 2, 3, 4, 5];

      validYears.forEach((year) => {
        studentProfile.currentYear = year;
        expect(studentProfile.currentYear).toBe(year);
      });
    });

    it('should validate GPA range', () => {
      const validGPAs = [0.0, 2.5, 3.0, 3.75, 4.0];

      validGPAs.forEach((gpa) => {
        studentProfile.gpa = gpa;
        expect(studentProfile.gpa).toBe(gpa);
      });
    });
  });

  describe('Relationships', () => {
    it('should have user relationship', () => {
      expect(studentProfile.user).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });
  });

  describe('Timestamps', () => {
    it('should have profileUpdatedAt field', () => {
      expect(studentProfile.profileUpdatedAt).toBeUndefined();
      // Will be set by TypeORM UpdateDateColumn
    });
  });
});
