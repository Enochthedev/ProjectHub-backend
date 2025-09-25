import { KnowledgeBaseEntry } from '../knowledge-base-entry.entity';
import { User } from '../user.entity';
import { ContentType } from '../../common/enums';

describe('KnowledgeBaseEntry Entity', () => {
  let knowledgeEntry: KnowledgeBaseEntry;
  let mockUser: User;

  beforeEach(() => {
    mockUser = new User();
    mockUser.id = 'user-123';
    mockUser.email = 'admin@ui.edu.ng';

    knowledgeEntry = new KnowledgeBaseEntry();
    knowledgeEntry.id = 'kb-123';
    knowledgeEntry.title = 'How to Write a Literature Review';
    knowledgeEntry.content =
      'A literature review is a comprehensive survey of scholarly sources...';
    knowledgeEntry.category = 'academic_writing';
    knowledgeEntry.tags = ['literature', 'review', 'research'];
    knowledgeEntry.keywords = [
      'literature review',
      'academic writing',
      'research methodology',
    ];
    knowledgeEntry.contentType = ContentType.GUIDELINE;
    knowledgeEntry.language = 'en';
    knowledgeEntry.isActive = true;
    knowledgeEntry.usageCount = 5;
    knowledgeEntry.averageRating = 4.2;
    knowledgeEntry.createdBy = mockUser;
    knowledgeEntry.createdById = mockUser.id;
  });

  describe('Entity Structure', () => {
    it('should create a knowledge base entry with all required fields', () => {
      expect(knowledgeEntry.id).toBe('kb-123');
      expect(knowledgeEntry.title).toBe('How to Write a Literature Review');
      expect(knowledgeEntry.content).toContain(
        'A literature review is a comprehensive survey',
      );
      expect(knowledgeEntry.category).toBe('academic_writing');
      expect(knowledgeEntry.contentType).toBe(ContentType.GUIDELINE);
      expect(knowledgeEntry.language).toBe('en');
      expect(knowledgeEntry.isActive).toBe(true);
      expect(knowledgeEntry.usageCount).toBe(5);
      expect(knowledgeEntry.averageRating).toBe(4.2);
      expect(knowledgeEntry.createdById).toBe('user-123');
    });

    it('should have default values for optional fields', () => {
      const newEntry = new KnowledgeBaseEntry();
      expect(newEntry.language).toBeUndefined(); // Will be set by TypeORM default
      expect(newEntry.isActive).toBeUndefined(); // Will be set by TypeORM default
      expect(newEntry.usageCount).toBeUndefined(); // Will be set by TypeORM default
      expect(newEntry.averageRating).toBeUndefined(); // Will be set by TypeORM default
      expect(newEntry.tags).toBeUndefined(); // Will be set by TypeORM default
      expect(newEntry.keywords).toBeUndefined(); // Will be set by TypeORM default
    });

    it('should allow nullable fields to be null', () => {
      knowledgeEntry.createdBy = null;
      knowledgeEntry.createdById = null;
      knowledgeEntry.searchVector = null;

      expect(knowledgeEntry.createdBy).toBeNull();
      expect(knowledgeEntry.createdById).toBeNull();
      expect(knowledgeEntry.searchVector).toBeNull();
    });

    it('should handle arrays for tags and keywords', () => {
      expect(knowledgeEntry.tags).toEqual(['literature', 'review', 'research']);
      expect(knowledgeEntry.keywords).toEqual([
        'literature review',
        'academic writing',
        'research methodology',
      ]);
    });
  });

  describe('Content Types', () => {
    it('should accept valid content types', () => {
      const types = [
        ContentType.GUIDELINE,
        ContentType.TEMPLATE,
        ContentType.EXAMPLE,
        ContentType.FAQ,
        ContentType.POLICY,
      ];

      types.forEach((type) => {
        knowledgeEntry.contentType = type;
        expect(knowledgeEntry.contentType).toBe(type);
      });
    });
  });

  describe('Usage Management Methods', () => {
    it('should increment usage count', () => {
      const initialCount = knowledgeEntry.usageCount;
      knowledgeEntry.incrementUsage();
      expect(knowledgeEntry.usageCount).toBe(initialCount + 1);
    });

    it('should update average rating correctly', () => {
      // Initial: 4.2 rating with 5 total ratings (hypothetical)
      // Add new rating of 5.0 (6th rating)
      knowledgeEntry.updateRating(5.0, 6);

      // Expected: ((4.2 * 5) + 5.0) / 6 = (21 + 5) / 6 = 4.33
      expect(knowledgeEntry.averageRating).toBeCloseTo(4.33, 2);
    });

    it('should handle first rating correctly', () => {
      knowledgeEntry.averageRating = 0;
      knowledgeEntry.updateRating(4.5, 1);
      expect(knowledgeEntry.averageRating).toBe(4.5);
    });
  });

  describe('Status Management Methods', () => {
    it('should activate entry', () => {
      knowledgeEntry.isActive = false;
      knowledgeEntry.activate();
      expect(knowledgeEntry.isActive).toBe(true);
    });

    it('should deactivate entry', () => {
      knowledgeEntry.deactivate();
      expect(knowledgeEntry.isActive).toBe(false);
    });
  });

  describe('Tag Management Methods', () => {
    it('should add new tag', () => {
      knowledgeEntry.addTag('methodology');
      expect(knowledgeEntry.tags).toContain('methodology');
      expect(knowledgeEntry.tags).toHaveLength(4);
    });

    it('should not add duplicate tag', () => {
      knowledgeEntry.addTag('literature');
      expect(knowledgeEntry.tags).toEqual(['literature', 'review', 'research']);
      expect(knowledgeEntry.tags).toHaveLength(3);
    });

    it('should remove existing tag', () => {
      knowledgeEntry.removeTag('review');
      expect(knowledgeEntry.tags).not.toContain('review');
      expect(knowledgeEntry.tags).toEqual(['literature', 'research']);
    });

    it('should handle removing non-existent tag', () => {
      const originalTags = [...knowledgeEntry.tags];
      knowledgeEntry.removeTag('nonexistent');
      expect(knowledgeEntry.tags).toEqual(originalTags);
    });
  });

  describe('Keyword Management Methods', () => {
    it('should add new keyword', () => {
      knowledgeEntry.addKeyword('systematic review');
      expect(knowledgeEntry.keywords).toContain('systematic review');
      expect(knowledgeEntry.keywords).toHaveLength(4);
    });

    it('should not add duplicate keyword', () => {
      knowledgeEntry.addKeyword('literature review');
      expect(knowledgeEntry.keywords).toEqual([
        'literature review',
        'academic writing',
        'research methodology',
      ]);
      expect(knowledgeEntry.keywords).toHaveLength(3);
    });

    it('should remove existing keyword', () => {
      knowledgeEntry.removeKeyword('academic writing');
      expect(knowledgeEntry.keywords).not.toContain('academic writing');
      expect(knowledgeEntry.keywords).toEqual([
        'literature review',
        'research methodology',
      ]);
    });

    it('should handle removing non-existent keyword', () => {
      const originalKeywords = [...knowledgeEntry.keywords];
      knowledgeEntry.removeKeyword('nonexistent');
      expect(knowledgeEntry.keywords).toEqual(originalKeywords);
    });
  });

  describe('Content Type Check Methods', () => {
    it('should correctly identify guideline', () => {
      knowledgeEntry.contentType = ContentType.GUIDELINE;
      expect(knowledgeEntry.isGuideline()).toBe(true);
      expect(knowledgeEntry.isTemplate()).toBe(false);
      expect(knowledgeEntry.isExample()).toBe(false);
      expect(knowledgeEntry.isFAQ()).toBe(false);
      expect(knowledgeEntry.isPolicy()).toBe(false);
    });

    it('should correctly identify template', () => {
      knowledgeEntry.contentType = ContentType.TEMPLATE;
      expect(knowledgeEntry.isGuideline()).toBe(false);
      expect(knowledgeEntry.isTemplate()).toBe(true);
      expect(knowledgeEntry.isExample()).toBe(false);
      expect(knowledgeEntry.isFAQ()).toBe(false);
      expect(knowledgeEntry.isPolicy()).toBe(false);
    });

    it('should correctly identify example', () => {
      knowledgeEntry.contentType = ContentType.EXAMPLE;
      expect(knowledgeEntry.isExample()).toBe(true);
    });

    it('should correctly identify FAQ', () => {
      knowledgeEntry.contentType = ContentType.FAQ;
      expect(knowledgeEntry.isFAQ()).toBe(true);
    });

    it('should correctly identify policy', () => {
      knowledgeEntry.contentType = ContentType.POLICY;
      expect(knowledgeEntry.isPolicy()).toBe(true);
    });
  });

  describe('Quality and Popularity Methods', () => {
    it('should correctly identify high rating', () => {
      knowledgeEntry.averageRating = 4.5;
      expect(knowledgeEntry.hasHighRating()).toBe(true);

      knowledgeEntry.averageRating = 4.0;
      expect(knowledgeEntry.hasHighRating()).toBe(true);

      knowledgeEntry.averageRating = 3.9;
      expect(knowledgeEntry.hasHighRating()).toBe(false);
    });

    it('should correctly identify popular content', () => {
      knowledgeEntry.usageCount = 15;
      expect(knowledgeEntry.isPopular()).toBe(true);

      knowledgeEntry.usageCount = 10;
      expect(knowledgeEntry.isPopular()).toBe(true);

      knowledgeEntry.usageCount = 9;
      expect(knowledgeEntry.isPopular()).toBe(false);
    });

    it('should correctly identify multilingual content', () => {
      knowledgeEntry.language = 'es';
      expect(knowledgeEntry.isMultilingual()).toBe(true);

      knowledgeEntry.language = 'en';
      expect(knowledgeEntry.isMultilingual()).toBe(false);
    });
  });

  describe('Relationships', () => {
    it('should have optional creator relationship', () => {
      expect(knowledgeEntry.createdBy).toBe(mockUser);
      expect(knowledgeEntry.createdById).toBe(mockUser.id);

      // Test nullable creator
      knowledgeEntry.createdBy = null;
      knowledgeEntry.createdById = null;
      expect(knowledgeEntry.createdBy).toBeNull();
      expect(knowledgeEntry.createdById).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      expect(knowledgeEntry.createdAt).toBeUndefined(); // Will be set by TypeORM
      expect(knowledgeEntry.updatedAt).toBeUndefined(); // Will be set by TypeORM
    });
  });

  describe('Full-text Search', () => {
    it('should have search vector field', () => {
      expect(knowledgeEntry.searchVector).toBeUndefined(); // Will be set by database trigger
    });
  });
});
