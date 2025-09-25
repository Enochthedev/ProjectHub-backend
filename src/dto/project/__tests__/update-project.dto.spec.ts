import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { UpdateProjectDto } from '../update-project.dto';
import { DifficultyLevel } from '../../../common/enums';

describe('UpdateProjectDto', () => {
  const validUpdateData = {
    title: 'Updated AI-Powered Web Application',
    abstract:
      'This is an updated comprehensive web application that uses artificial intelligence to provide personalized recommendations for students with enhanced features.',
    specialization: 'Web Development & Full Stack',
    difficultyLevel: DifficultyLevel.ADVANCED,
    year: 2024,
    tags: ['ai', 'web-app', 'updated'],
    technologyStack: ['React', 'Node.js', 'MongoDB'],
    isGroupProject: true,
    githubUrl: 'https://github.com/user/updated-project',
    demoUrl: 'https://updated-demo.project.com',
    notes: 'Updated project with new requirements.',
  };

  describe('Valid data', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(UpdateProjectDto, validUpdateData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass validation with partial update', async () => {
      const partialUpdate = {
        title: 'Updated Title Only',
        notes: 'Updated notes only',
      };

      const dto = plainToClass(UpdateProjectDto, partialUpdate);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass validation with empty object', async () => {
      const dto = plainToClass(UpdateProjectDto, {});
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should trim whitespace from string fields', async () => {
      const dataWithWhitespace = {
        title: '  Updated Title  ',
        abstract: '  Updated abstract with whitespace  ',
        notes: '  Updated notes  ',
      };

      const dto = plainToClass(UpdateProjectDto, dataWithWhitespace);

      expect(dto.title).toBe('Updated Title');
      expect(dto.abstract).toBe('Updated abstract with whitespace');
      expect(dto.notes).toBe('Updated notes');
    });
  });

  describe('Title validation', () => {
    it('should fail if title is too short', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: 'Short',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail if title is too long', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: 'A'.repeat(201),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should pass with undefined title', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        abstract: validUpdateData.abstract,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Abstract validation', () => {
    it('should fail if abstract is too short', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        abstract: 'Too short',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail if abstract is too long', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        abstract: 'A'.repeat(2001),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should pass with undefined abstract', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Specialization validation', () => {
    it('should fail for invalid specialization', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        specialization: 'Invalid Specialization',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });

    it('should pass for valid specialization', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        specialization: 'Artificial Intelligence & Machine Learning',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined specialization', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Difficulty level validation', () => {
    it('should fail for invalid difficulty level', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        difficultyLevel: 'invalid' as any,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });

    it('should pass for valid difficulty level', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        difficultyLevel: DifficultyLevel.BEGINNER,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass with undefined difficulty level', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Year validation', () => {
    it('should fail for year before 2020', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        year: 2019,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail for future year', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        year: new Date().getFullYear() + 1,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.max).toBeDefined();
    });

    it('should convert string year to number', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        year: '2023' as any,
      });

      expect(dto.year).toBe(2023);
      expect(typeof dto.year).toBe('number');
    });

    it('should pass with undefined year', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Tags validation', () => {
    it('should fail if tags exceed maximum count', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        tags: Array(11).fill('tag'),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
    });

    it('should filter and trim tags', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        tags: ['  tag1  ', '', 'tag2', '  tag3  '],
      });

      expect(dto.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should pass with undefined tags', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Technology stack validation', () => {
    it('should fail if technology stack exceeds maximum count', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        technologyStack: Array(16).fill('Technology'),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
    });

    it('should filter and trim technology stack', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        technologyStack: ['  React  ', '', 'Node.js', '  PostgreSQL  '],
      });

      expect(dto.technologyStack).toEqual(['React', 'Node.js', 'PostgreSQL']);
    });

    it('should pass with undefined technology stack', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('URL validation', () => {
    it('should fail for invalid GitHub URL', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        githubUrl: 'not-a-valid-url',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUrl).toBeDefined();
    });

    it('should fail for invalid demo URL', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        demoUrl: 'not-a-valid-url',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUrl).toBeDefined();
    });

    it('should pass with undefined URLs', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Boolean validation', () => {
    it('should convert string boolean to boolean', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        isGroupProject: false as any,
      });

      expect(dto.isGroupProject).toBe(false);
      expect(typeof dto.isGroupProject).toBe('boolean');
    });

    it('should pass with undefined boolean', async () => {
      const dto = plainToClass(UpdateProjectDto, {
        title: validUpdateData.title,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Partial updates', () => {
    it('should validate only provided fields', async () => {
      const partialUpdate = {
        title: 'Valid Updated Title',
        year: 2019, // Invalid year
      };

      const dto = plainToClass(UpdateProjectDto, partialUpdate);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('year');
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should allow updating single field', async () => {
      const singleFieldUpdate = {
        notes: 'Just updating the notes field',
      };

      const dto = plainToClass(UpdateProjectDto, singleFieldUpdate);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
