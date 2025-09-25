import { validate } from 'class-validator';
import { UserPreferencesDto } from '../user-preferences.dto';

describe('UserPreferencesDto', () => {
  let dto: UserPreferencesDto;

  beforeEach(() => {
    dto = new UserPreferencesDto();
  });

  describe('preferredLanguage validation', () => {
    it('should pass with valid language codes', async () => {
      const validLanguages = ['en', 'es', 'fr', 'de', 'pt', 'it'];

      for (const lang of validLanguages) {
        dto.preferredLanguage = lang;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined language', async () => {
      dto.preferredLanguage = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid language code', async () => {
      dto.preferredLanguage = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('detailLevel validation', () => {
    it('should pass with valid detail levels', async () => {
      const validLevels = ['brief', 'moderate', 'comprehensive'];

      for (const level of validLevels) {
        dto.detailLevel = level;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined detail level', async () => {
      dto.detailLevel = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid detail level', async () => {
      dto.detailLevel = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('responseStyle validation', () => {
    it('should pass with valid response styles', async () => {
      const validStyles = ['casual', 'professional', 'academic'];

      for (const style of validStyles) {
        dto.responseStyle = style;
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      }
    });

    it('should pass with undefined response style', async () => {
      dto.responseStyle = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid response style', async () => {
      dto.responseStyle = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });
  });

  describe('boolean field validation', () => {
    it('should pass with valid boolean values', async () => {
      dto.includeExamples = true;
      dto.includeReferences = false;
      dto.suggestFollowUps = true;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined boolean values', async () => {
      dto.includeExamples = undefined;
      dto.includeReferences = undefined;
      dto.suggestFollowUps = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-boolean values', async () => {
      (dto as any).includeExamples = 'true';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isBoolean).toBeDefined();
    });
  });

  describe('confidenceThreshold validation', () => {
    it('should pass with valid confidence threshold', async () => {
      dto.confidenceThreshold = 0.7;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with minimum value', async () => {
      dto.confidenceThreshold = 0;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with maximum value', async () => {
      dto.confidenceThreshold = 1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined confidence threshold', async () => {
      dto.confidenceThreshold = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with value below minimum', async () => {
      dto.confidenceThreshold = -0.1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail with value above maximum', async () => {
      dto.confidenceThreshold = 1.1;

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.max).toBeDefined();
    });

    it('should fail with non-number value', async () => {
      (dto as any).confidenceThreshold = '0.7';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isNumber).toBeDefined();
    });
  });

  describe('object field validation', () => {
    it('should pass with valid notification object', async () => {
      dto.notifications = {
        emailNotifications: true,
        pushNotifications: false,
        weeklyDigest: true,
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid custom settings object', async () => {
      dto.customSettings = {
        favoriteTopics: ['methodology', 'data_analysis'],
        learningGoals: ['improve_writing', 'research_skills'],
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined object values', async () => {
      dto.notifications = undefined;
      dto.customSettings = undefined;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with non-object values', async () => {
      (dto as any).notifications = 'invalid';

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isObject).toBeDefined();
    });
  });

  describe('complete DTO validation', () => {
    it('should pass with all valid fields', async () => {
      dto.preferredLanguage = 'en';
      dto.detailLevel = 'comprehensive';
      dto.responseStyle = 'academic';
      dto.includeExamples = true;
      dto.includeReferences = true;
      dto.suggestFollowUps = true;
      dto.confidenceThreshold = 0.7;
      dto.notifications = {
        emailNotifications: true,
        pushNotifications: false,
        weeklyDigest: true,
      };
      dto.customSettings = {
        favoriteTopics: ['methodology', 'data_analysis'],
        learningGoals: ['improve_writing', 'research_skills'],
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with all undefined fields', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
