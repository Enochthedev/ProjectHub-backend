import { ResponseTemplate } from '../response-template.entity';

describe('ResponseTemplate Entity', () => {
  let template: ResponseTemplate;

  beforeEach(() => {
    template = new ResponseTemplate();
    template.id = 'template-123';
    template.name = 'Literature Review Help';
    template.template =
      'A literature review is {{definition}}. For your {{project_type}} project, you should {{recommendation}}.';
    template.category = 'academic_writing';
    template.triggerKeywords = ['literature review', 'literature', 'review'];
    template.variables = {
      definition: 'a comprehensive survey of scholarly sources',
      recommendation: 'focus on recent publications from the last 5 years',
    };
    template.language = 'en';
    template.isActive = true;
    template.usageCount = 10;
    template.effectivenessScore = 4.2;
  });

  describe('Entity Structure', () => {
    it('should create a response template with all required fields', () => {
      expect(template.id).toBe('template-123');
      expect(template.name).toBe('Literature Review Help');
      expect(template.template).toContain(
        'A literature review is {{definition}}',
      );
      expect(template.category).toBe('academic_writing');
      expect(template.triggerKeywords).toEqual([
        'literature review',
        'literature',
        'review',
      ]);
      expect(template.language).toBe('en');
      expect(template.isActive).toBe(true);
      expect(template.usageCount).toBe(10);
      expect(template.effectivenessScore).toBe(4.2);
    });

    it('should have default values for optional fields', () => {
      const newTemplate = new ResponseTemplate();
      expect(newTemplate.language).toBeUndefined(); // Will be set by TypeORM default
      expect(newTemplate.isActive).toBeUndefined(); // Will be set by TypeORM default
      expect(newTemplate.usageCount).toBeUndefined(); // Will be set by TypeORM default
      expect(newTemplate.effectivenessScore).toBeUndefined(); // Will be set by TypeORM default
      expect(newTemplate.triggerKeywords).toBeUndefined(); // Will be set by TypeORM default
    });

    it('should allow nullable fields to be null', () => {
      template.variables = null;
      expect(template.variables).toBeNull();
    });

    it('should handle JSONB variables field', () => {
      const variables = {
        definition: 'a comprehensive survey',
        project_type: 'machine learning',
        recommendation: 'focus on recent ML papers',
      };

      template.variables = variables;
      expect(template.variables).toEqual(variables);
      expect(template.variables?.definition).toBe('a comprehensive survey');
    });
  });

  describe('Usage Management Methods', () => {
    it('should increment usage count', () => {
      const initialCount = template.usageCount;
      template.incrementUsage();
      expect(template.usageCount).toBe(initialCount + 1);
    });

    it('should update effectiveness score correctly', () => {
      // Initial: 4.2 score with 5 total scores (hypothetical)
      // Add new score of 5.0 (6th score)
      template.updateEffectiveness(5.0, 6);

      // Expected: ((4.2 * 5) + 5.0) / 6 = (21 + 5) / 6 = 4.33
      expect(template.effectivenessScore).toBeCloseTo(4.33, 2);
    });

    it('should handle first effectiveness score correctly', () => {
      template.effectivenessScore = 0;
      template.updateEffectiveness(4.5, 1);
      expect(template.effectivenessScore).toBe(4.5);
    });
  });

  describe('Status Management Methods', () => {
    it('should activate template', () => {
      template.isActive = false;
      template.activate();
      expect(template.isActive).toBe(true);
    });

    it('should deactivate template', () => {
      template.deactivate();
      expect(template.isActive).toBe(false);
    });
  });

  describe('Trigger Keyword Management', () => {
    it('should add new trigger keyword', () => {
      template.addTriggerKeyword('Survey');
      expect(template.triggerKeywords).toContain('survey');
      expect(template.triggerKeywords).toHaveLength(4);
    });

    it('should convert keywords to lowercase', () => {
      template.addTriggerKeyword('METHODOLOGY');
      expect(template.triggerKeywords).toContain('methodology');
      expect(template.triggerKeywords).not.toContain('METHODOLOGY');
    });

    it('should not add duplicate keywords', () => {
      template.addTriggerKeyword('Literature Review');
      expect(template.triggerKeywords).toEqual([
        'literature review',
        'literature',
        'review',
      ]);
      expect(template.triggerKeywords).toHaveLength(3);
    });

    it('should remove existing keyword', () => {
      template.removeTriggerKeyword('Literature');
      expect(template.triggerKeywords).not.toContain('literature');
      expect(template.triggerKeywords).toEqual(['literature review', 'review']);
    });

    it('should handle removing non-existent keyword', () => {
      const originalKeywords = [...template.triggerKeywords];
      template.removeTriggerKeyword('nonexistent');
      expect(template.triggerKeywords).toEqual(originalKeywords);
    });
  });

  describe('Variable Management', () => {
    it('should set new variable', () => {
      template.setVariable('new_key', 'new_value');
      expect(template.getVariable('new_key')).toBe('new_value');
    });

    it('should initialize variables object if null', () => {
      template.variables = null;
      template.setVariable('key', 'value');
      expect(template.variables).toEqual({ key: 'value' });
    });

    it('should get existing variable', () => {
      expect(template.getVariable('definition')).toBe(
        'a comprehensive survey of scholarly sources',
      );
    });

    it('should return undefined for non-existent variable', () => {
      expect(template.getVariable('nonexistent')).toBeUndefined();
    });

    it('should remove existing variable', () => {
      template.removeVariable('definition');
      expect(template.getVariable('definition')).toBeUndefined();
      expect(template.variables?.definition).toBeUndefined();
    });

    it('should handle removing variable when variables is null', () => {
      template.variables = null;
      expect(() => template.removeVariable('key')).not.toThrow();
    });
  });

  describe('Template Processing', () => {
    it('should process template with substitutions', () => {
      const substitutions = {
        definition: 'a critical analysis of existing research',
        project_type: 'web development',
        recommendation: 'include both academic and industry sources',
      };

      const result = template.processTemplate(substitutions);
      expect(result).toBe(
        'A literature review is a critical analysis of existing research. For your web development project, you should include both academic and industry sources.',
      );
    });

    it('should use default variables when no substitutions provided', () => {
      const result = template.processTemplate({ project_type: 'AI research' });
      expect(result).toContain('a comprehensive survey of scholarly sources');
      expect(result).toContain('AI research');
      expect(result).toContain(
        'focus on recent publications from the last 5 years',
      );
    });

    it('should handle template with no variables', () => {
      template.template = 'This is a simple template without variables.';
      const result = template.processTemplate();
      expect(result).toBe('This is a simple template without variables.');
    });

    it('should handle empty substitutions', () => {
      const result = template.processTemplate({});
      expect(result).toContain('a comprehensive survey of scholarly sources');
    });
  });

  describe('Keyword Matching', () => {
    it('should match keywords in query', () => {
      expect(
        template.matchesKeywords('How to write a literature review?'),
      ).toBe(true);
      expect(template.matchesKeywords('What is literature?')).toBe(true);
      expect(template.matchesKeywords('I need help with my review')).toBe(true);
    });

    it('should not match when no keywords present', () => {
      expect(template.matchesKeywords('How to write methodology?')).toBe(false);
      expect(template.matchesKeywords('What is data analysis?')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(template.matchesKeywords('LITERATURE REVIEW help')).toBe(true);
      expect(template.matchesKeywords('Literature Review')).toBe(true);
    });
  });

  describe('Match Scoring', () => {
    it('should return 0 for no matches', () => {
      const score = template.getMatchScore('methodology help');
      expect(score).toBe(0);
    });

    it('should return positive score for matches', () => {
      const score = template.getMatchScore('literature review help');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should give higher score for more keyword matches', () => {
      const singleMatch = template.getMatchScore('literature help');
      const multipleMatch = template.getMatchScore('literature review help');
      expect(multipleMatch).toBeGreaterThan(singleMatch);
    });

    it('should consider keyword position in query', () => {
      const earlyMatch = template.getMatchScore(
        'literature review at the beginning',
      );
      const lateMatch = template.getMatchScore(
        'help with literature review at the end',
      );
      expect(earlyMatch).toBeGreaterThan(lateMatch);
    });
  });

  describe('Status Check Methods', () => {
    it('should correctly identify effective template', () => {
      template.effectivenessScore = 4.0;
      expect(template.isEffective()).toBe(true);

      template.effectivenessScore = 3.5;
      expect(template.isEffective()).toBe(true);

      template.effectivenessScore = 3.4;
      expect(template.isEffective()).toBe(false);
    });

    it('should correctly identify popular template', () => {
      template.usageCount = 10;
      expect(template.isPopular()).toBe(true);

      template.usageCount = 5;
      expect(template.isPopular()).toBe(true);

      template.usageCount = 4;
      expect(template.isPopular()).toBe(false);
    });

    it('should correctly identify multilingual template', () => {
      template.language = 'es';
      expect(template.isMultilingual()).toBe(true);

      template.language = 'en';
      expect(template.isMultilingual()).toBe(false);
    });

    it('should correctly identify templates with variables', () => {
      expect(template.hasVariables()).toBe(true);

      template.variables = null;
      expect(template.hasVariables()).toBe(false);

      template.variables = {};
      expect(template.hasVariables()).toBe(false);
    });

    it('should get variable keys', () => {
      const keys = template.getVariableKeys();
      expect(keys).toEqual(['definition', 'recommendation']);

      template.variables = null;
      expect(template.getVariableKeys()).toEqual([]);
    });
  });

  describe('Template Validation', () => {
    it('should validate correct template', () => {
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect unclosed variable placeholders', () => {
      template.template = 'This has an unclosed {{variable';
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Template contains unclosed variable placeholders',
      );
    });

    it('should detect unopened variable placeholders', () => {
      template.template = 'This has an unopened variable}}';
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        'Template contains unopened variable placeholders',
      );
    });

    it('should detect empty template content', () => {
      template.template = '   ';
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Template content cannot be empty');
    });

    it('should detect empty template name', () => {
      template.name = '   ';
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Template name cannot be empty');
    });

    it('should detect empty template category', () => {
      template.category = '   ';
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Template category cannot be empty');
    });

    it('should return multiple errors when multiple issues exist', () => {
      template.template = '';
      template.name = '';
      template.category = '';
      const validation = template.validateTemplate();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(3);
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', () => {
      expect(template.createdAt).toBeUndefined(); // Will be set by TypeORM
      expect(template.updatedAt).toBeUndefined(); // Will be set by TypeORM
    });
  });
});
