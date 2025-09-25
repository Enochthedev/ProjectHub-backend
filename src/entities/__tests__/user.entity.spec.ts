import { User } from '../user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
    user.email = 'test@ui.edu.ng';
    user.password = 'hashedPassword123';
    user.role = UserRole.STUDENT;
    user.isEmailVerified = false;
    user.isActive = true;
  });

  describe('Entity Structure', () => {
    it('should create a user with all required fields', () => {
      expect(user.email).toBe('test@ui.edu.ng');
      expect(user.password).toBe('hashedPassword123');
      expect(user.role).toBe(UserRole.STUDENT);
      expect(user.isEmailVerified).toBe(false);
      expect(user.isActive).toBe(true);
    });

    it('should have default values for boolean fields', () => {
      const newUser = new User();
      expect(newUser.isEmailVerified).toBeUndefined(); // Will be set by TypeORM default
      expect(newUser.isActive).toBeUndefined(); // Will be set by TypeORM default
    });

    it('should allow nullable fields to be null', () => {
      user.emailVerificationToken = null;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;

      expect(user.emailVerificationToken).toBeNull();
      expect(user.passwordResetToken).toBeNull();
      expect(user.passwordResetExpires).toBeNull();
    });
  });

  describe('Role Validation', () => {
    it('should accept valid user roles', () => {
      const roles = [UserRole.STUDENT, UserRole.SUPERVISOR, UserRole.ADMIN];

      roles.forEach((role) => {
        user.role = role;
        expect(user.role).toBe(role);
      });
    });
  });

  describe('Relationships', () => {
    it('should allow optional student profile relationship', () => {
      expect(user.studentProfile).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });

    it('should allow optional supervisor profile relationship', () => {
      expect(user.supervisorProfile).toBeUndefined();
      // In actual usage, this would be populated by TypeORM
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      expect(user.createdAt).toBeUndefined(); // Will be set by TypeORM
      expect(user.updatedAt).toBeUndefined(); // Will be set by TypeORM
    });
  });
});
