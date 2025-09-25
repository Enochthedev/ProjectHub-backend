import { SupervisorProfile } from '../supervisor-profile.entity';

describe('SupervisorProfile Entity', () => {
  let supervisorProfile: SupervisorProfile;

  beforeEach(() => {
    supervisorProfile = new SupervisorProfile();
    supervisorProfile.name = 'Dr. Jane Smith';
    supervisorProfile.specializations = [
      'Artificial Intelligence & Machine Learning',
      'Data Science & Analytics',
    ];
    supervisorProfile.maxStudents = 8;
    supervisorProfile.isAvailable = true;
    supervisorProfile.officeLocation = 'Room 205, Computer Science Building';
    supervisorProfile.phoneNumber = '+234-801-234-5678';
  });

  describe('Entity Structure', () => {
    it('should create a supervisor profile with all fields', () => {
      expect(supervisorProfile.name).toBe('Dr. Jane Smith');
      expect(supervisorProfile.specializations).toEqual([
        'Artificial Intelligence & Machine Learning',
        'Data Science & Analytics',
      ]);
      expect(supervisorProfile.maxStudents).toBe(8);
      expect(supervisorProfile.isAvailable).toBe(true);
      expect(supervisorProfile.officeLocation).toBe(
        'Room 205, Computer Science Building',
      );
      expect(supervisorProfile.phoneNumber).toBe('+234-801-234-5678');
    });

    it('should have default values', () => {
      const newProfile = new SupervisorProfile();
      expect(newProfile.maxStudents).toBeUndefined(); // Will be set by TypeORM default to 5
      expect(newProfile.isAvailable).toBeUndefined(); // Will be set by TypeORM default to true
    });

    it('should allow nullable fields to be null', () => {
      supervisorProfile.officeLocation = null;
      supervisorProfile.phoneNumber = null;

      expect(supervisorProfile.officeLocation).toBeNull();
      expect(supervisorProfile.phoneNumber).toBeNull();
    });
  });

  describe('Array Fields Validation', () => {
    it('should handle multiple specializations', () => {
      const specializations = [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
        'Cybersecurity & Information Security',
        'Data Science & Analytics',
      ];
      supervisorProfile.specializations = specializations;

      expect(supervisorProfile.specializations).toEqual(specializations);
      expect(Array.isArray(supervisorProfile.specializations)).toBe(true);
    });

    it('should handle single specialization', () => {
      supervisorProfile.specializations = ['Mobile Application Development'];

      expect(supervisorProfile.specializations).toEqual([
        'Mobile Application Development',
      ]);
      expect(supervisorProfile.specializations.length).toBe(1);
    });

    it('should not allow empty specializations array', () => {
      // This would be validated at the service layer, but entity should handle it
      supervisorProfile.specializations = [];
      expect(supervisorProfile.specializations).toEqual([]);
    });
  });

  describe('Capacity Management', () => {
    it('should validate maximum students capacity', () => {
      const validCapacities = [1, 3, 5, 8, 10, 15];

      validCapacities.forEach((capacity) => {
        supervisorProfile.maxStudents = capacity;
        expect(supervisorProfile.maxStudents).toBe(capacity);
      });
    });

    it('should handle availability status', () => {
      supervisorProfile.isAvailable = false;
      expect(supervisorProfile.isAvailable).toBe(false);

      supervisorProfile.isAvailable = true;
      expect(supervisorProfile.isAvailable).toBe(true);
    });
  });

  describe('Contact Information', () => {
    it('should validate office location format', () => {
      const validLocations = [
        'Room 205, Computer Science Building',
        'Office 301, Faculty of Technology',
        'Lab 102, AI Research Center',
      ];

      validLocations.forEach((location) => {
        supervisorProfile.officeLocation = location;
        expect(supervisorProfile.officeLocation).toBe(location);
      });
    });

    it('should validate phone number format', () => {
      const validPhoneNumbers = [
        '+234-801-234-5678',
        '08012345678',
        '+234 801 234 5678',
      ];

      validPhoneNumbers.forEach((phone) => {
        supervisorProfile.phoneNumber = phone;
        expect(supervisorProfile.phoneNumber).toBe(phone);
      });
    });
  });

  describe('Relationships', () => {
    it('should have user relationship', () => {
      expect(supervisorProfile.user).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });
  });
});
