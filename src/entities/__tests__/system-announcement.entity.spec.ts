import { SystemAnnouncement } from '../system-announcement.entity';
import { AnnouncementType } from '../../common/enums/announcement-type.enum';
import { AnnouncementStatus } from '../../common/enums/announcement-status.enum';
import { TargetAudience } from '../../common/enums/target-audience.enum';
import { Priority } from '../../common/enums/priority.enum';

describe('SystemAnnouncement Entity', () => {
  let announcement: SystemAnnouncement;

  beforeEach(() => {
    announcement = new SystemAnnouncement();
    announcement.title = 'Test Announcement';
    announcement.content = 'This is a test announcement content';
    announcement.type = AnnouncementType.GENERAL;
    announcement.priority = Priority.MEDIUM;
    announcement.status = AnnouncementStatus.DRAFT;
    announcement.isPublished = false;
    announcement.viewCount = 0;
    announcement.clickCount = 0;
    announcement.shareCount = 0;
  });

  describe('isActive', () => {
    it('should return true for published announcement without expiration', () => {
      announcement.isPublished = true;
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.publishAt = new Date(Date.now() - 1000); // 1 second ago
      announcement.expiresAt = null;

      expect(announcement.isActive()).toBe(true);
    });

    it('should return false for unpublished announcement', () => {
      announcement.isPublished = false;
      announcement.status = AnnouncementStatus.PUBLISHED;

      expect(announcement.isActive()).toBe(false);
    });

    it('should return false for non-published status', () => {
      announcement.isPublished = true;
      announcement.status = AnnouncementStatus.DRAFT;

      expect(announcement.isActive()).toBe(false);
    });

    it('should return false for future publish date', () => {
      announcement.isPublished = true;
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.publishAt = new Date(Date.now() + 10000); // 10 seconds in future

      expect(announcement.isActive()).toBe(false);
    });

    it('should return false for expired announcement', () => {
      announcement.isPublished = true;
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.publishAt = new Date(Date.now() - 10000); // 10 seconds ago
      announcement.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      expect(announcement.isActive()).toBe(false);
    });
  });

  describe('isScheduled', () => {
    it('should return true for scheduled announcement with future publish date', () => {
      announcement.status = AnnouncementStatus.SCHEDULED;
      announcement.publishAt = new Date(Date.now() + 10000); // 10 seconds in future

      expect(announcement.isScheduled()).toBe(true);
    });

    it('should return false for non-scheduled status', () => {
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.publishAt = new Date(Date.now() + 10000);

      expect(announcement.isScheduled()).toBe(false);
    });

    it('should return false when publishAt is null', () => {
      announcement.status = AnnouncementStatus.SCHEDULED;
      announcement.publishAt = null;

      expect(announcement.isScheduled()).toBe(false);
    });

    it('should return false when publishAt is in the past', () => {
      announcement.status = AnnouncementStatus.SCHEDULED;
      announcement.publishAt = new Date(Date.now() - 1000);

      expect(announcement.isScheduled()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return true when expiration date is in the past', () => {
      announcement.expiresAt = new Date(Date.now() - 1000);

      expect(announcement.isExpired()).toBe(true);
    });

    it('should return false when expiration date is in the future', () => {
      announcement.expiresAt = new Date(Date.now() + 10000);

      expect(announcement.isExpired()).toBe(false);
    });

    it('should return false when expiresAt is null', () => {
      announcement.expiresAt = null;

      expect(announcement.isExpired()).toBe(false);
    });
  });

  describe('getCurrentStatus', () => {
    it('should return EXPIRED for expired announcements', () => {
      announcement.expiresAt = new Date(Date.now() - 1000);

      expect(announcement.getCurrentStatus()).toBe(AnnouncementStatus.EXPIRED);
    });

    it('should return SCHEDULED for scheduled announcements', () => {
      announcement.status = AnnouncementStatus.SCHEDULED;
      announcement.publishAt = new Date(Date.now() + 10000);

      expect(announcement.getCurrentStatus()).toBe(
        AnnouncementStatus.SCHEDULED,
      );
    });

    it('should return PUBLISHED for active announcements', () => {
      announcement.isPublished = true;
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.publishAt = new Date(Date.now() - 1000);

      expect(announcement.getCurrentStatus()).toBe(
        AnnouncementStatus.PUBLISHED,
      );
    });

    it('should return original status for inactive announcements', () => {
      announcement.status = AnnouncementStatus.DRAFT;

      expect(announcement.getCurrentStatus()).toBe(AnnouncementStatus.DRAFT);
    });
  });

  describe('matchesTargetAudience', () => {
    it('should return true when no target audience is specified', () => {
      announcement.targetAudience = [];

      expect(announcement.matchesTargetAudience('student')).toBe(true);
    });

    it('should return true when target audience includes ALL', () => {
      announcement.targetAudience = [TargetAudience.ALL];

      expect(announcement.matchesTargetAudience('student')).toBe(true);
      expect(announcement.matchesTargetAudience('supervisor')).toBe(true);
      expect(announcement.matchesTargetAudience('admin')).toBe(true);
    });

    it('should return true for matching role-based targeting', () => {
      announcement.targetAudience = [TargetAudience.STUDENTS];

      expect(announcement.matchesTargetAudience('student')).toBe(true);
      expect(announcement.matchesTargetAudience('supervisor')).toBe(false);
    });

    it('should return true for supervisor role targeting', () => {
      announcement.targetAudience = [TargetAudience.SUPERVISORS];

      expect(announcement.matchesTargetAudience('supervisor')).toBe(true);
      expect(announcement.matchesTargetAudience('student')).toBe(false);
    });

    it('should return true for admin role targeting', () => {
      announcement.targetAudience = [TargetAudience.ADMINS];

      expect(announcement.matchesTargetAudience('admin')).toBe(true);
      expect(announcement.matchesTargetAudience('student')).toBe(false);
    });

    it('should handle multiple target audiences', () => {
      announcement.targetAudience = [
        TargetAudience.STUDENTS,
        TargetAudience.SUPERVISORS,
      ];

      expect(announcement.matchesTargetAudience('student')).toBe(true);
      expect(announcement.matchesTargetAudience('supervisor')).toBe(true);
      expect(announcement.matchesTargetAudience('admin')).toBe(false);
    });

    it('should use advanced filters when provided', () => {
      announcement.targetAudience = [TargetAudience.SPECIFIC_SPECIALIZATION];
      announcement.targetFilters = { specialization: 'AI' };

      expect(
        announcement.matchesTargetAudience('student', { specialization: 'AI' }),
      ).toBe(true);
      expect(
        announcement.matchesTargetAudience('student', {
          specialization: 'Web Dev',
        }),
      ).toBe(false);
    });

    it('should handle array values in advanced filters', () => {
      announcement.targetAudience = [TargetAudience.SPECIFIC_YEAR];
      announcement.targetFilters = { year: ['2023', '2024'] };

      expect(
        announcement.matchesTargetAudience('student', { year: '2023' }),
      ).toBe(true);
      expect(
        announcement.matchesTargetAudience('student', { year: '2024' }),
      ).toBe(true);
      expect(
        announcement.matchesTargetAudience('student', { year: '2022' }),
      ).toBe(false);
    });
  });

  describe('getEngagementRate', () => {
    it('should return 0 when viewCount is 0', () => {
      announcement.viewCount = 0;
      announcement.clickCount = 5;
      announcement.shareCount = 2;

      expect(announcement.getEngagementRate()).toBe(0);
    });

    it('should calculate engagement rate correctly', () => {
      announcement.viewCount = 100;
      announcement.clickCount = 10;
      announcement.shareCount = 5;

      expect(announcement.getEngagementRate()).toBe(15); // (10 + 5) / 100 * 100 = 15%
    });

    it('should round to 2 decimal places', () => {
      announcement.viewCount = 333;
      announcement.clickCount = 10;
      announcement.shareCount = 0;

      expect(announcement.getEngagementRate()).toBe(3); // 10/333 * 100 = 3.003... rounded to 3
    });
  });

  describe('increment methods', () => {
    it('should increment view count', () => {
      announcement.viewCount = 5;
      announcement.incrementViewCount();

      expect(announcement.viewCount).toBe(6);
    });

    it('should increment click count', () => {
      announcement.clickCount = 3;
      announcement.incrementClickCount();

      expect(announcement.clickCount).toBe(4);
    });

    it('should increment share count', () => {
      announcement.shareCount = 1;
      announcement.incrementShareCount();

      expect(announcement.shareCount).toBe(2);
    });
  });

  describe('getPriorityLevel', () => {
    it('should return correct priority levels', () => {
      announcement.priority = Priority.LOW;
      expect(announcement.getPriorityLevel()).toBe(1);

      announcement.priority = Priority.MEDIUM;
      expect(announcement.getPriorityLevel()).toBe(2);

      announcement.priority = Priority.HIGH;
      expect(announcement.getPriorityLevel()).toBe(3);

      announcement.priority = Priority.CRITICAL;
      expect(announcement.getPriorityLevel()).toBe(4);
    });
  });

  describe('isHighPriority', () => {
    it('should return true for HIGH priority', () => {
      announcement.priority = Priority.HIGH;

      expect(announcement.isHighPriority()).toBe(true);
    });

    it('should return true for CRITICAL priority', () => {
      announcement.priority = Priority.CRITICAL;

      expect(announcement.isHighPriority()).toBe(true);
    });

    it('should return false for MEDIUM priority', () => {
      announcement.priority = Priority.MEDIUM;

      expect(announcement.isHighPriority()).toBe(false);
    });

    it('should return false for LOW priority', () => {
      announcement.priority = Priority.LOW;

      expect(announcement.isHighPriority()).toBe(false);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return null when expiresAt is null', () => {
      announcement.expiresAt = null;

      expect(announcement.getTimeUntilExpiration()).toBeNull();
    });

    it('should return positive time for future expiration', () => {
      announcement.expiresAt = new Date(Date.now() + 10000); // 10 seconds in future

      const timeUntil = announcement.getTimeUntilExpiration();
      expect(timeUntil).toBeGreaterThan(0);
      expect(timeUntil).toBeLessThanOrEqual(10000);
    });

    it('should return negative time for past expiration', () => {
      announcement.expiresAt = new Date(Date.now() - 5000); // 5 seconds ago

      const timeUntil = announcement.getTimeUntilExpiration();
      expect(timeUntil).toBeLessThan(0);
    });
  });

  describe('getDaysUntilExpiration', () => {
    it('should return null when expiresAt is null', () => {
      announcement.expiresAt = null;

      expect(announcement.getDaysUntilExpiration()).toBeNull();
    });

    it('should return correct days for future expiration', () => {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      announcement.expiresAt = twoDaysFromNow;

      expect(announcement.getDaysUntilExpiration()).toBe(2);
    });

    it('should return negative days for past expiration', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      announcement.expiresAt = twoDaysAgo;

      expect(announcement.getDaysUntilExpiration()).toBe(-2);
    });
  });

  describe('getSummary', () => {
    it('should return summary when provided', () => {
      announcement.summary = 'Custom summary';
      announcement.content =
        'This is a much longer content that should not be used';

      expect(announcement.getSummary()).toBe('Custom summary');
    });

    it('should return truncated content when no summary', () => {
      announcement.summary = null;
      announcement.content = 'A'.repeat(200); // 200 characters

      const summary = announcement.getSummary();
      expect(summary).toHaveLength(153); // 150 + '...'
      expect(summary.endsWith('...')).toBe(true);
    });

    it('should return full content when shorter than 150 characters', () => {
      announcement.summary = null;
      announcement.content = 'Short content';

      expect(announcement.getSummary()).toBe('Short content');
    });
  });

  describe('getDisplayTitle', () => {
    it('should return title without indicator for LOW priority', () => {
      announcement.priority = Priority.LOW;
      announcement.title = 'Test Title';

      expect(announcement.getDisplayTitle()).toBe('Test Title');
    });

    it('should return title without indicator for MEDIUM priority', () => {
      announcement.priority = Priority.MEDIUM;
      announcement.title = 'Test Title';

      expect(announcement.getDisplayTitle()).toBe('Test Title');
    });

    it('should return title with warning for HIGH priority', () => {
      announcement.priority = Priority.HIGH;
      announcement.title = 'Test Title';

      expect(announcement.getDisplayTitle()).toBe('⚠️ Test Title');
    });

    it('should return title with alert for CRITICAL priority', () => {
      announcement.priority = Priority.CRITICAL;
      announcement.title = 'Test Title';

      expect(announcement.getDisplayTitle()).toBe('🚨 Test Title');
    });
  });

  describe('canBeEdited', () => {
    it('should return true for DRAFT status', () => {
      announcement.status = AnnouncementStatus.DRAFT;

      expect(announcement.canBeEdited()).toBe(true);
    });

    it('should return true for SCHEDULED status with future publish date', () => {
      announcement.status = AnnouncementStatus.SCHEDULED;
      announcement.publishAt = new Date(Date.now() + 10000);

      expect(announcement.canBeEdited()).toBe(true);
    });

    it('should return false for SCHEDULED status with past publish date', () => {
      announcement.status = AnnouncementStatus.SCHEDULED;
      announcement.publishAt = new Date(Date.now() - 1000);

      expect(announcement.canBeEdited()).toBe(false);
    });

    it('should return false for PUBLISHED status', () => {
      announcement.status = AnnouncementStatus.PUBLISHED;

      expect(announcement.canBeEdited()).toBe(false);
    });
  });

  describe('publish', () => {
    it('should set announcement as published', () => {
      announcement.isPublished = false;
      announcement.status = AnnouncementStatus.DRAFT;
      announcement.publishAt = null;

      announcement.publish();

      expect(announcement.isPublished).toBe(true);
      expect(announcement.status).toBe(AnnouncementStatus.PUBLISHED);
      expect(announcement.publishAt).toBeInstanceOf(Date);
    });

    it('should not override existing publishAt date', () => {
      const existingDate = new Date('2024-01-01');
      announcement.publishAt = existingDate;

      announcement.publish();

      expect(announcement.publishAt).toBe(existingDate);
    });
  });

  describe('archive', () => {
    it('should archive the announcement', () => {
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.isPublished = true;

      announcement.archive();

      expect(announcement.status).toBe(AnnouncementStatus.ARCHIVED);
      expect(announcement.isPublished).toBe(false);
    });
  });

  describe('Entity Properties', () => {
    it('should allow setting all properties', () => {
      const testDate = new Date('2024-01-01');
      const testFilters = { specialization: 'AI', year: '2024' };
      const testMetadata = { source: 'admin', campaign: 'welcome' };

      announcement.title = 'Test Title';
      announcement.content = 'Test Content';
      announcement.summary = 'Test Summary';
      announcement.type = AnnouncementType.FEATURE;
      announcement.priority = Priority.HIGH;
      announcement.status = AnnouncementStatus.PUBLISHED;
      announcement.targetAudience = [TargetAudience.STUDENTS];
      announcement.targetFilters = testFilters;
      announcement.isPublished = true;
      announcement.isPinned = true;
      announcement.allowComments = false;
      announcement.publishAt = testDate;
      announcement.expiresAt = testDate;
      announcement.viewCount = 100;
      announcement.clickCount = 10;
      announcement.shareCount = 5;
      announcement.metadata = testMetadata;
      announcement.tags = ['important', 'feature'];
      announcement.actionUrl = 'https://example.com';
      announcement.actionText = 'Learn More';

      expect(announcement.title).toBe('Test Title');
      expect(announcement.content).toBe('Test Content');
      expect(announcement.summary).toBe('Test Summary');
      expect(announcement.type).toBe(AnnouncementType.FEATURE);
      expect(announcement.priority).toBe(Priority.HIGH);
      expect(announcement.status).toBe(AnnouncementStatus.PUBLISHED);
      expect(announcement.targetAudience).toEqual([TargetAudience.STUDENTS]);
      expect(announcement.targetFilters).toEqual(testFilters);
      expect(announcement.isPublished).toBe(true);
      expect(announcement.isPinned).toBe(true);
      expect(announcement.allowComments).toBe(false);
      expect(announcement.publishAt).toBe(testDate);
      expect(announcement.expiresAt).toBe(testDate);
      expect(announcement.viewCount).toBe(100);
      expect(announcement.clickCount).toBe(10);
      expect(announcement.shareCount).toBe(5);
      expect(announcement.metadata).toEqual(testMetadata);
      expect(announcement.tags).toEqual(['important', 'feature']);
      expect(announcement.actionUrl).toBe('https://example.com');
      expect(announcement.actionText).toBe('Learn More');
    });
  });
});
