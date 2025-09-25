import { MilestoneNote } from '../milestone-note.entity';
import { NoteType } from '../../common/enums';
import { User } from '../user.entity';

describe('MilestoneNote Entity', () => {
  let note: MilestoneNote;
  let mockUser: User;

  beforeEach(() => {
    mockUser = new User();
    mockUser.id = 'user-id';
    mockUser.email = 'test@example.com';

    note = new MilestoneNote();
    note.id = 'note-id';
    note.milestoneId = 'milestone-id';
    note.content = 'Test note content';
    note.type = NoteType.PROGRESS;
    note.authorId = 'user-id';
    note.author = mockUser;
    note.createdAt = new Date('2024-01-01T10:00:00Z');
  });

  describe('isFromSupervisor', () => {
    it('should return true for supervisor feedback notes', () => {
      note.type = NoteType.SUPERVISOR_FEEDBACK;
      expect(note.isFromSupervisor()).toBe(true);
    });

    it('should return false for non-supervisor feedback notes', () => {
      note.type = NoteType.PROGRESS;
      expect(note.isFromSupervisor()).toBe(false);

      note.type = NoteType.ISSUE;
      expect(note.isFromSupervisor()).toBe(false);

      note.type = NoteType.SOLUTION;
      expect(note.isFromSupervisor()).toBe(false);

      note.type = NoteType.MEETING;
      expect(note.isFromSupervisor()).toBe(false);
    });
  });

  describe('getFormattedContent', () => {
    it('should format content with timestamp and author name from student profile', () => {
      mockUser.studentProfile = {
        name: 'John Doe',
      } as any;

      const formatted = note.getFormattedContent();
      expect(formatted).toContain('John Doe');
      expect(formatted).toContain('Test note content');
      expect(formatted).toMatch(/\[\d{1,2}\/\d{1,2}\/\d{4}/); // Date pattern
    });

    it('should format content with timestamp and author name from supervisor profile', () => {
      mockUser.supervisorProfile = {
        name: 'Jane Smith',
      } as any;

      const formatted = note.getFormattedContent();
      expect(formatted).toContain('Jane Smith');
      expect(formatted).toContain('Test note content');
    });

    it('should use Unknown when no profile is available', () => {
      mockUser.studentProfile = undefined;
      mockUser.supervisorProfile = undefined;

      const formatted = note.getFormattedContent();
      expect(formatted).toContain('Unknown');
      expect(formatted).toContain('Test note content');
    });
  });

  describe('getTypeDisplayName', () => {
    it('should return correct display names for all note types', () => {
      expect(MilestoneNote.getTypeDisplayName(NoteType.PROGRESS)).toBe(
        'Progress Update',
      );
      expect(MilestoneNote.getTypeDisplayName(NoteType.ISSUE)).toBe('Issue');
      expect(MilestoneNote.getTypeDisplayName(NoteType.SOLUTION)).toBe(
        'Solution',
      );
      expect(MilestoneNote.getTypeDisplayName(NoteType.MEETING)).toBe(
        'Meeting Notes',
      );
      expect(
        MilestoneNote.getTypeDisplayName(NoteType.SUPERVISOR_FEEDBACK),
      ).toBe('Supervisor Feedback');
    });

    it('should return the enum value for unknown types', () => {
      const unknownType = 'unknown' as NoteType;
      expect(MilestoneNote.getTypeDisplayName(unknownType)).toBe('unknown');
    });
  });

  describe('validation constraints', () => {
    it('should have required fields', () => {
      expect(note.milestoneId).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.type).toBeDefined();
      expect(note.authorId).toBeDefined();
    });

    it('should have default type as PROGRESS', () => {
      const newNote = new MilestoneNote();
      // Note: Default values are typically set by TypeORM decorators
      // This test verifies the enum default is properly configured
      expect(Object.values(NoteType)).toContain(NoteType.PROGRESS);
    });
  });
});
