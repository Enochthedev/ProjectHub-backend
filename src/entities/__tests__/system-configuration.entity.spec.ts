import { SystemConfiguration } from '../system-configuration.entity';
import { ConfigType } from '../../common/enums/config-type.enum';
import { ConfigCategory } from '../../common/enums/config-category.enum';

describe('SystemConfiguration Entity', () => {
  let config: SystemConfiguration;

  beforeEach(() => {
    config = new SystemConfiguration();
    config.key = 'test.config';
    config.category = ConfigCategory.SYSTEM;
    config.type = ConfigType.STRING;
    config.isActive = true;
    config.isReadOnly = false;
    config.isSecret = false;
  });

  describe('getParsedValue', () => {
    it('should parse string values correctly', () => {
      config.type = ConfigType.STRING;
      config.value = 'test string';

      expect(config.getParsedValue()).toBe('test string');
    });

    it('should parse boolean values correctly', () => {
      config.type = ConfigType.BOOLEAN;
      config.value = 'true';

      expect(config.getParsedValue()).toBe(true);

      config.value = 'false';
      expect(config.getParsedValue()).toBe(false);

      config.value = 'TRUE';
      expect(config.getParsedValue()).toBe(true);
    });

    it('should parse number values correctly', () => {
      config.type = ConfigType.NUMBER;
      config.value = '42.5';

      expect(config.getParsedValue()).toBe(42.5);

      config.value = '100';
      expect(config.getParsedValue()).toBe(100);
    });

    it('should parse JSON values correctly', () => {
      config.type = ConfigType.JSON;
      config.value = '{"key": "value", "number": 42}';

      const parsed = config.getParsedValue();
      expect(parsed).toEqual({ key: 'value', number: 42 });
    });

    it('should parse date values correctly', () => {
      config.type = ConfigType.DATE;
      const testDate = '2024-01-01T00:00:00.000Z';
      config.value = testDate;

      const parsed = config.getParsedValue();
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe(testDate);
    });

    it('should return default value when main value is invalid', () => {
      config.type = ConfigType.JSON;
      config.value = 'invalid json';
      config.defaultValue = '{"default": true}';

      const parsed = config.getParsedValue();
      expect(parsed).toEqual({ default: true });
    });

    it('should return null when both value and default are invalid', () => {
      config.type = ConfigType.JSON;
      config.value = 'invalid json';
      config.defaultValue = 'also invalid';

      expect(config.getParsedValue()).toBeNull();
    });
  });

  describe('getDefaultParsedValue', () => {
    it('should return null when no default value is set', () => {
      config.defaultValue = null;

      expect(config.getDefaultParsedValue()).toBeNull();
    });

    it('should parse default boolean values correctly', () => {
      config.type = ConfigType.BOOLEAN;
      config.defaultValue = 'true';

      expect(config.getDefaultParsedValue()).toBe(true);
    });

    it('should parse default number values correctly', () => {
      config.type = ConfigType.NUMBER;
      config.defaultValue = '10';

      expect(config.getDefaultParsedValue()).toBe(10);
    });

    it('should return null for invalid default values', () => {
      config.type = ConfigType.JSON;
      config.defaultValue = 'invalid json';

      expect(config.getDefaultParsedValue()).toBeNull();
    });
  });

  describe('isValidValue', () => {
    it('should validate string values', () => {
      config.type = ConfigType.STRING;

      expect(config.isValidValue('any string')).toBe(true);
      expect(config.isValidValue('')).toBe(true);
    });

    it('should validate boolean values', () => {
      config.type = ConfigType.BOOLEAN;

      expect(config.isValidValue('true')).toBe(true);
      expect(config.isValidValue('false')).toBe(true);
      expect(config.isValidValue('TRUE')).toBe(true);
      expect(config.isValidValue('FALSE')).toBe(true);
      expect(config.isValidValue('invalid')).toBe(false);
    });

    it('should validate number values', () => {
      config.type = ConfigType.NUMBER;

      expect(config.isValidValue('42')).toBe(true);
      expect(config.isValidValue('42.5')).toBe(true);
      expect(config.isValidValue('-10')).toBe(true);
      expect(config.isValidValue('not a number')).toBe(false);
    });

    it('should validate JSON values', () => {
      config.type = ConfigType.JSON;

      expect(config.isValidValue('{"valid": "json"}')).toBe(true);
      expect(config.isValidValue('[]')).toBe(true);
      expect(config.isValidValue('invalid json')).toBe(false);
    });

    it('should validate date values', () => {
      config.type = ConfigType.DATE;

      expect(config.isValidValue('2024-01-01')).toBe(true);
      expect(config.isValidValue('2024-01-01T00:00:00.000Z')).toBe(true);
      expect(config.isValidValue('invalid date')).toBe(false);
    });

    it('should validate email values', () => {
      config.type = ConfigType.EMAIL;

      expect(config.isValidValue('test@example.com')).toBe(true);
      expect(config.isValidValue('user.name+tag@domain.co.uk')).toBe(true);
      expect(config.isValidValue('invalid-email')).toBe(false);
      expect(config.isValidValue('test@')).toBe(false);
    });

    it('should validate URL values', () => {
      config.type = ConfigType.URL;

      expect(config.isValidValue('https://example.com')).toBe(true);
      expect(config.isValidValue('http://localhost:3000')).toBe(true);
      expect(config.isValidValue('ftp://files.example.com')).toBe(true);
      expect(config.isValidValue('invalid-url')).toBe(false);
      expect(config.isValidValue('not a url')).toBe(false);
    });
  });

  describe('isEditable', () => {
    it('should return true for active, non-readonly configurations', () => {
      config.isActive = true;
      config.isReadOnly = false;

      expect(config.isEditable()).toBe(true);
    });

    it('should return false for inactive configurations', () => {
      config.isActive = false;
      config.isReadOnly = false;

      expect(config.isEditable()).toBe(false);
    });

    it('should return false for readonly configurations', () => {
      config.isActive = true;
      config.isReadOnly = true;

      expect(config.isEditable()).toBe(false);
    });

    it('should return false for inactive and readonly configurations', () => {
      config.isActive = false;
      config.isReadOnly = true;

      expect(config.isEditable()).toBe(false);
    });
  });

  describe('getMaskedValue', () => {
    it('should return actual value for non-secret configurations', () => {
      config.isSecret = false;
      config.value = 'sensitive-data';

      expect(config.getMaskedValue()).toBe('sensitive-data');
    });

    it('should return masked value for secret configurations', () => {
      config.isSecret = true;
      config.value = 'secret-password';

      expect(config.getMaskedValue()).toBe('********');
    });

    it('should handle short secret values', () => {
      config.isSecret = true;
      config.value = 'abc';

      expect(config.getMaskedValue()).toBe('***');
    });

    it('should handle empty secret values', () => {
      config.isSecret = true;
      config.value = '';

      expect(config.getMaskedValue()).toBe('');
    });
  });

  describe('getSummary', () => {
    it('should return configuration summary with actual value', () => {
      config.key = 'app.name';
      config.category = ConfigCategory.SYSTEM;
      config.value = 'My Application';
      config.isSecret = false;

      expect(config.getSummary()).toBe('app.name (system): My Application');
    });

    it('should return configuration summary with masked value for secrets', () => {
      config.key = 'api.secret';
      config.category = ConfigCategory.SECURITY;
      config.value = 'secret-key';
      config.isSecret = true;

      expect(config.getSummary()).toBe('api.secret (security): ********');
    });
  });

  describe('Entity Properties', () => {
    it('should have correct default values', () => {
      const newConfig = new SystemConfiguration();

      expect(newConfig.isActive).toBeUndefined(); // Will be set by database default
      expect(newConfig.isReadOnly).toBeUndefined(); // Will be set by database default
      expect(newConfig.isSecret).toBeUndefined(); // Will be set by database default
    });

    it('should allow setting all properties', () => {
      config.key = 'test.key';
      config.value = 'test value';
      config.description = 'Test description';
      config.category = ConfigCategory.ACADEMIC;
      config.type = ConfigType.JSON;
      config.isActive = false;
      config.isReadOnly = true;
      config.isSecret = true;
      config.validationSchema = '{"type": "object"}';
      config.defaultValue = '{}';
      config.metadata = { source: 'test' };
      config.version = '1.0.0';

      expect(config.key).toBe('test.key');
      expect(config.value).toBe('test value');
      expect(config.description).toBe('Test description');
      expect(config.category).toBe(ConfigCategory.ACADEMIC);
      expect(config.type).toBe(ConfigType.JSON);
      expect(config.isActive).toBe(false);
      expect(config.isReadOnly).toBe(true);
      expect(config.isSecret).toBe(true);
      expect(config.validationSchema).toBe('{"type": "object"}');
      expect(config.defaultValue).toBe('{}');
      expect(config.metadata).toEqual({ source: 'test' });
      expect(config.version).toBe('1.0.0');
    });
  });
});
