import { validate } from 'class-validator';
import {
  CreateAITemplateDto,
  UpdateAITemplateDto,
  TemplateSearchDto,
} from '../template-management.dto';

describe('Template Management DTOs', () => {
  describe('CreateAITemplateDto', () => {
    let dto: CreateAITemplateDto;

    beforeEach(() => {
      dto = new CreateAITemplateDto();
    });

    describe('name validation', () => {
      it('should pass with valid name', async () => {
        dto.name = 'Literature Review Guidance Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail with name too short', async () => {
        dto.name = 'Hi';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.minLength).toBeDefined();
      });

      it('should fail with name too long', async () => {
        dto.name = 'a'.repeat(201);
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.maxLength).toBeDefined();
      });

      it('should fail with non-string name', async () => {
        (dto as any).name = 123;
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isString).toBeDefined();
      });
    });

    describe('template validation', () => {
      it('should pass with valid template', async () => {
        dto.name = 'Valid Template';
        dto.template =
          'Hello {{studentName}}, here is guidance on {{topic}}...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail with template too short', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hi';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.minLength).toBeDefined();
      });

      it('should fail with template too long', async () => {
        dto.name = 'Valid Template';
        dto.template = 'a'.repeat(2001);
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.maxLength).toBeDefined();
      });
    });

    describe('triggerKeywords validation', () => {
      it('should pass with valid keywords array', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review', 'methodology'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail with non-array keywords', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        (dto as any).triggerKeywords = 'literature,review';

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isArray).toBeDefined();
      });

      it('should fail with non-string elements in keywords array', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        (dto as any).triggerKeywords = ['literature', 123, 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isString).toBeDefined();
      });

      it('should fail with too many keywords', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = Array(51).fill('keyword');

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
      });
    });

    describe('optional fields validation', () => {
      it('should pass with valid optional fields', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];
        dto.language = 'en';
        dto.confidenceThreshold = 0.5;
        dto.priority = 7;
        dto.metadata = { author: 'AI Team' };

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should pass with undefined optional fields', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail with invalid language', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];
        dto.language = 'invalid';

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.isIn).toBeDefined();
      });

      it('should fail with confidence threshold out of range', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];
        dto.confidenceThreshold = 1.5;

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.max).toBeDefined();
      });

      it('should fail with priority out of range', async () => {
        dto.name = 'Valid Template';
        dto.template = 'Hello {{studentName}}, here is guidance...';
        dto.category = 'methodology';
        dto.triggerKeywords = ['literature', 'review'];
        dto.priority = 15;

        const errors = await validate(dto);
        expect(errors).toHaveLength(1);
        expect(errors[0].constraints?.max).toBeDefined();
      });
    });
  });

  describe('UpdateAITemplateDto', () => {
    let dto: UpdateAITemplateDto;

    beforeEach(() => {
      dto = new UpdateAITemplateDto();
    });

    it('should pass with all undefined fields', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid partial updates', async () => {
      dto.name = 'Updated Template Name';
      dto.isActive = false;
      dto.priority = 8;

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid values', async () => {
      dto.name = 'Hi'; // Too short
      dto.priority = 15; // Out of range

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('TemplateSearchDto', () => {
    let dto: TemplateSearchDto;

    beforeEach(() => {
      dto = new TemplateSearchDto();
    });

    it('should pass with all undefined fields', async () => {
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass with valid search parameters', async () => {
      dto.query = 'literature review guidance';
      dto.category = 'methodology_guidance';
      dto.language = 'en';
      dto.activeOnly = true;
      dto.minEffectiveness = 3.5;
      dto.limit = 50;
      dto.offset = 10;
      dto.sortBy = 'effectiveness';
      dto.sortOrder = 'DESC';

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with invalid values', async () => {
      dto.language = 'invalid';
      dto.minEffectiveness = 6; // Out of range
      dto.limit = 0; // Below minimum
      dto.sortBy = 'invalid_field';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
