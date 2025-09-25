import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { CreateProjectDto } from '../create-project.dto';
import { DifficultyLevel } from '../../../common/enums';

describe('CreateProjectDto', () => {
  const validProjectData = {
    title: 'AI-Powered Web Application for Student Management',
    abstract:
      'This project involves developing a comprehensive web application that uses artificial intelligence to provide personalized recommendations for students. The system will include user authentication, data analytics, and machine learning algorithms.',
    specialization: 'Artificial Intelligence & Machine Learning',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['ai', 'web-app', 'machine-learning', 'student-management'],
    technologyStack: [
      'React',
      'Node.js',
      'TensorFlow',
      'PostgreSQL',
      'Express.js',
    ],
    isGroupProject: false,
    githubUrl: 'https://github.com/user/project',
    demoUrl: 'https://demo.project.com',
    notes:
      'This project requires knowledge of machine learning algorithms and web development.',
  };

  describe('Valid data', () => {
    it('should pass validation with all valid fields', async () => {
      const dto = plainToClass(CreateProjectDto, validProjectData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should pass validation without optional fields', async () => {
      const { githubUrl, demoUrl, notes, ...requiredData } = validProjectData;
      const dto = plainToClass(CreateProjectDto, requiredData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should trim whitespace from string fields', async () => {
      const dataWithWhitespace = {
        ...validProjectData,
        title: '  ' + validProjectData.title + '  ',
        abstract: '  ' + validProjectData.abstract + '  ',
        notes: '  ' + validProjectData.notes + '  ',
      };

      const dto = plainToClass(CreateProjectDto, dataWithWhitespace);

      expect(dto.title).toBe(validProjectData.title);
      expect(dto.abstract).toBe(validProjectData.abstract);
      expect(dto.notes).toBe(validProjectData.notes);
    });

    it('should filter and trim tags and technology stack', async () => {
      const dataWithUntrimmedArrays = {
        ...validProjectData,
        tags: ['  ai  ', '', 'web-app', '  machine-learning  '],
        technologyStack: ['  React  ', '', 'Node.js', '  PostgreSQL  '],
      };

      const dto = plainToClass(CreateProjectDto, dataWithUntrimmedArrays);

      expect(dto.tags).toEqual(['ai', 'web-app', 'machine-learning']);
      expect(dto.technologyStack).toEqual(['React', 'Node.js', 'PostgreSQL']);
    });
  });

  describe('Title validation', () => {
    it('should fail if title is too short', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        title: 'Short',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail if title is too long', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        title: 'A'.repeat(201),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should fail if title is not a string', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        title: 123,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isString).toBeDefined();
    });
  });

  describe('Abstract validation', () => {
    it('should fail if abstract is too short', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        abstract: 'Too short abstract',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.minLength).toBeDefined();
    });

    it('should fail if abstract is too long', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        abstract: 'A'.repeat(2001),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });
  });

  describe('Specialization validation', () => {
    it('should fail for invalid specialization', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        specialization: 'Invalid Specialization',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isIn).toBeDefined();
    });

    it('should pass for all valid specializations', async () => {
      const validSpecializations = [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
        'Mobile Application Development',
        'Cybersecurity & Information Security',
        'Data Science & Analytics',
        'Cloud Computing & DevOps',
        'Software Engineering & Architecture',
        'Human-Computer Interaction',
        'Database Systems & Management',
        'Network Systems & Administration',
      ];

      for (const specialization of validSpecializations) {
        const dto = plainToClass(CreateProjectDto, {
          ...validProjectData,
          specialization,
        });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Difficulty level validation', () => {
    it('should fail for invalid difficulty level', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        difficultyLevel: 'invalid' as any,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isEnum).toBeDefined();
    });

    it('should pass for all valid difficulty levels', async () => {
      const validLevels = [
        DifficultyLevel.BEGINNER,
        DifficultyLevel.INTERMEDIATE,
        DifficultyLevel.ADVANCED,
      ];

      for (const level of validLevels) {
        const dto = plainToClass(CreateProjectDto, {
          ...validProjectData,
          difficultyLevel: level,
        });
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });
  });

  describe('Year validation', () => {
    it('should fail for year before 2020', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        year: 2019,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.min).toBeDefined();
    });

    it('should fail for future year', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        year: new Date().getFullYear() + 1,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.max).toBeDefined();
    });

    it('should convert string year to number', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        year: '2024' as any,
      });

      expect(dto.year).toBe(2024);
      expect(typeof dto.year).toBe('number');
    });
  });

  describe('Tags validation', () => {
    it('should fail if tags exceed maximum count', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        tags: Array(11).fill('tag'),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
    });

    it('should filter out non-string values from tags', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        tags: ['valid-tag', 123, 'another-tag'] as any,
      });

      // The transform should filter out non-string values
      expect(dto.tags).toEqual(['valid-tag', 'another-tag']);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should convert non-array tags to empty array', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        tags: 'not-an-array' as any,
      });

      // The transform should convert non-array to empty array
      expect(dto.tags).toEqual([]);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Technology stack validation', () => {
    it('should fail if technology stack exceeds maximum count', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        technologyStack: Array(16).fill('Technology'),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.arrayMaxSize).toBeDefined();
    });

    it('should filter out non-string values from technology stack', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        technologyStack: ['React', 123, 'Node.js'] as any,
      });

      // The transform should filter out non-string values
      expect(dto.technologyStack).toEqual(['React', 'Node.js']);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('URL validation', () => {
    it('should fail for invalid GitHub URL', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        githubUrl: 'not-a-valid-url',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUrl).toBeDefined();
    });

    it('should fail for invalid demo URL', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        demoUrl: 'not-a-valid-url',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUrl).toBeDefined();
    });

    it('should fail if URL exceeds maximum length', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        githubUrl: longUrl,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });
  });

  describe('Boolean validation', () => {
    it('should convert string boolean to boolean', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        isGroupProject: 'true' as any,
      });

      expect(dto.isGroupProject).toBe(true);
      expect(typeof dto.isGroupProject).toBe('boolean');
    });

    it('should convert truthy string to true boolean', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        isGroupProject: 'invalid' as any,
      });

      // The Type(() => Boolean) transform converts truthy values to true
      expect(dto.isGroupProject).toBe(true);
      expect(typeof dto.isGroupProject).toBe('boolean');

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Notes validation', () => {
    it('should fail if notes exceed maximum length', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        notes: 'a'.repeat(1001),
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.maxLength).toBeDefined();
    });

    it('should pass with empty notes', async () => {
      const dto = plainToClass(CreateProjectDto, {
        ...validProjectData,
        notes: '',
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });
  });
});
