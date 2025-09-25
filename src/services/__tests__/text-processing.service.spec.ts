import { Test, TestingModule } from '@nestjs/testing';
import {
  TextProcessingService,
  ProcessedText,
  StudentProfileText,
  ProjectText,
} from '../text-processing.service';
import { StudentProfile } from '../../entities/student-profile.entity';
import { Project } from '../../entities/project.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { DifficultyLevel } from '../../common/enums/difficulty-level.enum';

describe('TextProcessingService', () => {
  let service: TextProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TextProcessingService],
    }).compile();

    service = module.get<TextProcessingService>(TextProcessingService);
  });

  describe('processText', () => {
    it('should process text with default options', () => {
      const text = '  Hello World! This is a TEST.  ';
      const result = service.processText(text);

      expect(result.text).toBe('hello world test.');
      expect(result.tokens).toEqual(['hello', 'world', 'test.']);
      expect(result.wordCount).toBe(3);
      expect(result.characterCount).toBe(result.text.length);
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('should remove stop words', () => {
      const text = 'This is a test with the and of words';
      const result = service.processText(text, { removeStopWords: true });

      expect(result.tokens).not.toContain('is');
      expect(result.tokens).not.toContain('a');
      expect(result.tokens).not.toContain('the');
      expect(result.tokens).not.toContain('and');
      expect(result.tokens).not.toContain('of');
      expect(result.tokens).toContain('test');
      expect(result.tokens).toContain('words');
    });

    it('should apply word length filters', () => {
      const text = 'a bb ccc dddd eeeee';
      const result = service.processText(text, {
        minWordLength: 3,
        maxWordLength: 4,
        removeStopWords: false,
      });

      expect(result.tokens).toEqual(['ccc', 'dddd']);
    });

    it('should handle empty or null text', () => {
      expect(service.processText('')).toEqual({
        text: '',
        tokens: [],
        wordCount: 0,
        characterCount: 0,
        processedAt: expect.any(Date),
      });

      expect(service.processText(null as any)).toEqual({
        text: '',
        tokens: [],
        wordCount: 0,
        characterCount: 0,
        processedAt: expect.any(Date),
      });
    });

    it('should normalize case when enabled', () => {
      const text = 'Hello WORLD Test';
      const result = service.processText(text, { normalizeCase: true });

      expect(result.text).toBe('hello world test');
    });

    it('should preserve case when disabled', () => {
      const text = 'Hello WORLD Test';
      const result = service.processText(text, {
        normalizeCase: false,
        removeStopWords: false,
      });

      expect(result.tokens).toContain('Hello');
      expect(result.tokens).toContain('WORLD');
    });

    it('should remove special characters', () => {
      const text = 'Hello@#$%World!';
      const result = service.processText(text, { removeSpecialChars: true });

      expect(result.text).toBe('hello world');
    });

    it('should apply simple stemming', () => {
      const text = 'running jumped testing';
      const result = service.processText(text, {
        stemWords: true,
        removeStopWords: false,
      });

      expect(result.tokens).toContain('runn'); // 'running' -> 'runn'
      expect(result.tokens).toContain('jump'); // 'jumped' -> 'jump'
      expect(result.tokens).toContain('test'); // 'testing' -> 'test'
    });
  });

  describe('processTextArray', () => {
    it('should process array of texts', () => {
      const texts = ['hello world', 'test text'];
      const result = service.processTextArray(texts);

      expect(result.text).toBe('hello world test text');
      expect(result.tokens).toEqual(['hello', 'world', 'test', 'text']);
    });

    it('should handle empty array', () => {
      const result = service.processTextArray([]);

      expect(result.text).toBe('');
      expect(result.tokens).toEqual([]);
      expect(result.wordCount).toBe(0);
    });
  });

  describe('processStudentProfile', () => {
    const mockStudentProfile: Partial<StudentProfile> = {
      id: 'student-1',
      skills: ['JavaScript', 'Python', 'React'],
      interests: ['Web Development', 'Machine Learning'],
      preferredSpecializations: ['Software Engineering', 'AI'],
      currentYear: 3,
      gpa: 3.8,
    };

    it('should process student profile correctly', () => {
      const result = service.processStudentProfile(
        mockStudentProfile as StudentProfile,
      );

      expect(result.metadata.profileId).toBe('student-1');
      expect(result.metadata.currentYear).toBe(3);
      expect(result.metadata.gpa).toBe(3.8);

      expect(result.skills.tokens).toContain('javascript');
      expect(result.skills.tokens).toContain('python');
      expect(result.skills.tokens).toContain('react');

      expect(result.interests.tokens).toContain('web');
      expect(result.interests.tokens).toContain('development');
      expect(result.interests.tokens).toContain('machine');
      expect(result.interests.tokens).toContain('learning');

      expect(result.specializations.tokens).toContain('software');
      expect(result.specializations.tokens).toContain('engineering');

      // Combined text should include weighted repetitions
      expect(result.combined.text).toContain('javascript');
      expect(result.combined.text).toContain('software');
    });

    it('should handle profile with missing fields', () => {
      const incompleteProfile: Partial<StudentProfile> = {
        id: 'student-2',
        skills: ['Java'],
      };

      const result = service.processStudentProfile(
        incompleteProfile as StudentProfile,
      );

      expect(result.metadata.profileId).toBe('student-2');
      expect(result.metadata.currentYear).toBeUndefined();
      expect(result.metadata.gpa).toBeUndefined();

      expect(result.skills.tokens).toContain('java');
      expect(result.interests.tokens).toEqual([]);
      expect(result.specializations.tokens).toEqual([]);
    });

    it('should include metadata in combined text when enabled', () => {
      const result = service.processStudentProfile(
        mockStudentProfile as StudentProfile,
        { includeMetadata: true },
      );

      expect(result.combined.text).toContain('year');
      expect(result.combined.text).toContain('high');
    });

    it('should exclude metadata when disabled', () => {
      const result = service.processStudentProfile(
        mockStudentProfile as StudentProfile,
        { includeMetadata: false },
      );

      expect(result.combined.text).not.toContain('year');
      expect(result.combined.text).not.toContain('high');
    });
  });

  describe('processProject', () => {
    const mockProject: Partial<Project> = {
      id: 'project-1',
      title: 'Machine Learning Web Application',
      abstract:
        'A web application that uses machine learning algorithms for data analysis',
      specialization: 'Software Engineering',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      tags: ['ML', 'Web', 'Python'],
      technologyStack: ['React', 'Flask', 'TensorFlow'],
      year: 2024,
      isGroupProject: true,
    };

    it('should process project correctly', () => {
      const result = service.processProject(mockProject as Project);

      expect(result.metadata.projectId).toBe('project-1');
      expect(result.metadata.specialization).toBe('Software Engineering');
      expect(result.metadata.difficultyLevel).toBe(
        DifficultyLevel.INTERMEDIATE,
      );
      expect(result.metadata.year).toBe(2024);
      expect(result.metadata.isGroupProject).toBe(true);

      expect(result.title.tokens).toContain('machine');
      expect(result.title.tokens).toContain('learning');
      expect(result.title.tokens).toContain('web');
      expect(result.title.tokens).toContain('application');

      expect(result.abstract.tokens).toContain('web');
      expect(result.abstract.tokens).toContain('application');
      expect(result.abstract.tokens).toContain('machine');
      expect(result.abstract.tokens).toContain('learning');

      expect(result.tags.tokens).toContain('ml');
      expect(result.tags.tokens).toContain('web');
      expect(result.tags.tokens).toContain('python');

      expect(result.technologyStack.tokens).toContain('react');
      expect(result.technologyStack.tokens).toContain('flask');
      expect(result.technologyStack.tokens).toContain('tensorflow');

      // Combined text should include weighted repetitions (title appears 4 times)
      const titleOccurrences = (result.combined.text.match(/machine/g) || [])
        .length;
      expect(titleOccurrences).toBeGreaterThan(2);
    });

    it('should handle project with missing fields', () => {
      const incompleteProject: Partial<Project> = {
        id: 'project-2',
        title: 'Simple Project',
        specialization: 'Computer Science',
        difficultyLevel: DifficultyLevel.BEGINNER,
        year: 2024,
        isGroupProject: false,
      };

      const result = service.processProject(incompleteProject as Project);

      expect(result.metadata.projectId).toBe('project-2');
      expect(result.title.tokens).toContain('simple');
      expect(result.title.tokens).toContain('project');
      expect(result.abstract.tokens).toEqual([]);
      expect(result.tags.tokens).toEqual([]);
      expect(result.technologyStack.tokens).toEqual([]);
    });

    it('should include metadata in combined text', () => {
      const result = service.processProject(mockProject as Project, {
        includeMetadata: true,
      });

      expect(result.combined.text).toContain('intermediate');
      expect(result.combined.text).toContain('group');
      expect(result.combined.text).toContain('collaboration');
    });
  });

  describe('processSupervisorProfile', () => {
    const mockSupervisorProfile: Partial<SupervisorProfile> = {
      id: 'supervisor-1',
      specializations: ['Machine Learning', 'Data Science', 'AI'],
      maxStudents: 5,
      isAvailable: true,
    };

    it('should process supervisor profile correctly', () => {
      const result = service.processSupervisorProfile(
        mockSupervisorProfile as SupervisorProfile,
      );

      expect(result.metadata.supervisorId).toBe('supervisor-1');
      expect(result.metadata.maxStudents).toBe(5);
      expect(result.metadata.isAvailable).toBe(true);

      expect(result.specializations.tokens).toContain('machine');
      expect(result.specializations.tokens).toContain('learning');
      expect(result.specializations.tokens).toContain('data');
      expect(result.specializations.tokens).toContain('science');

      expect(result.combined.text).toContain('machine');
      expect(result.combined.text).toContain('learning');
    });

    it('should handle supervisor with no specializations', () => {
      const emptySupervisor: Partial<SupervisorProfile> = {
        id: 'supervisor-2',
        maxStudents: 3,
        isAvailable: false,
      };

      const result = service.processSupervisorProfile(
        emptySupervisor as SupervisorProfile,
      );

      expect(result.metadata.supervisorId).toBe('supervisor-2');
      expect(result.specializations.tokens).toEqual([]);
      expect(result.combined.tokens).toEqual([]);
    });
  });

  describe('extractKeywords', () => {
    it('should extract keywords from processed text', () => {
      const processedText: ProcessedText = {
        text: 'machine learning data science python machine learning',
        tokens: [
          'machine',
          'learning',
          'data',
          'science',
          'python',
          'machine',
          'learning',
        ],
        wordCount: 7,
        characterCount: 50,
        processedAt: new Date(),
      };

      const keywords = service.extractKeywords(processedText, 3);

      expect(keywords).toHaveLength(3);
      expect(keywords[0]).toBe('machine'); // Most frequent
      expect(keywords[1]).toBe('learning'); // Second most frequent
    });

    it('should handle empty processed text', () => {
      const emptyText: ProcessedText = {
        text: '',
        tokens: [],
        wordCount: 0,
        characterCount: 0,
        processedAt: new Date(),
      };

      const keywords = service.extractKeywords(emptyText);
      expect(keywords).toEqual([]);
    });
  });

  describe('calculateKeywordSimilarity', () => {
    const text1: ProcessedText = {
      text: 'machine learning python data',
      tokens: ['machine', 'learning', 'python', 'data'],
      wordCount: 4,
      characterCount: 25,
      processedAt: new Date(),
    };

    const text2: ProcessedText = {
      text: 'machine learning javascript web',
      tokens: ['machine', 'learning', 'javascript', 'web'],
      wordCount: 4,
      characterCount: 30,
      processedAt: new Date(),
    };

    it('should calculate keyword similarity', () => {
      const similarity = service.calculateKeywordSimilarity(text1, text2);

      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 for identical texts', () => {
      const similarity = service.calculateKeywordSimilarity(text1, text1);
      expect(similarity).toBe(1.0);
    });

    it('should handle empty texts', () => {
      const emptyText: ProcessedText = {
        text: '',
        tokens: [],
        wordCount: 0,
        characterCount: 0,
        processedAt: new Date(),
      };

      const similarity1 = service.calculateKeywordSimilarity(
        emptyText,
        emptyText,
      );
      expect(similarity1).toBe(1.0);

      const similarity2 = service.calculateKeywordSimilarity(text1, emptyText);
      expect(similarity2).toBe(0.0);
    });
  });

  describe('validateProcessedText', () => {
    it('should validate good quality text', () => {
      const goodText: ProcessedText = {
        text: 'machine learning artificial intelligence data science',
        tokens: [
          'machine',
          'learning',
          'artificial',
          'intelligence',
          'data',
          'science',
        ],
        wordCount: 6,
        characterCount: 50,
        processedAt: new Date(),
      };

      const validation = service.validateProcessedText(goodText);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect short text issues', () => {
      const shortText: ProcessedText = {
        text: 'hi',
        tokens: ['hi'],
        wordCount: 1,
        characterCount: 2,
        processedAt: new Date(),
      };

      const validation = service.validateProcessedText(shortText);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        'Text is too short (less than 3 words)',
      );
      expect(validation.suggestions).toContain('Add more descriptive content');
    });

    it('should detect long text issues', () => {
      const longTokens = Array(250).fill('word');
      const longText: ProcessedText = {
        text: longTokens.join(' '),
        tokens: longTokens,
        wordCount: 250,
        characterCount: 1000,
        processedAt: new Date(),
      };

      const validation = service.validateProcessedText(longText);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain(
        'Text is very long (more than 200 words)',
      );
    });

    it('should detect high repetition', () => {
      const repetitiveText: ProcessedText = {
        text: 'test test test test different',
        tokens: ['test', 'test', 'test', 'test', 'different'],
        wordCount: 5,
        characterCount: 25,
        processedAt: new Date(),
      };

      const validation = service.validateProcessedText(repetitiveText);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('High word repetition detected');
    });

    it('should detect many short words', () => {
      const shortWordsText: ProcessedText = {
        text: 'a b c d e f g h i j',
        tokens: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'],
        wordCount: 10,
        characterCount: 19,
        processedAt: new Date(),
      };

      const validation = service.validateProcessedText(shortWordsText);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Many very short words detected');
    });
  });

  describe('getProcessingStats', () => {
    const processedTexts: ProcessedText[] = [
      {
        text: 'machine learning python',
        tokens: ['machine', 'learning', 'python'],
        wordCount: 3,
        characterCount: 20,
        processedAt: new Date(),
      },
      {
        text: 'data science machine',
        tokens: ['data', 'science', 'machine'],
        wordCount: 3,
        characterCount: 18,
        processedAt: new Date(),
      },
    ];

    it('should calculate processing statistics', () => {
      const stats = service.getProcessingStats(processedTexts);

      expect(stats.totalTexts).toBe(2);
      expect(stats.averageWordCount).toBe(3);
      expect(stats.averageCharCount).toBe(19);
      expect(stats.totalTokens).toBe(6);
      expect(stats.uniqueTokens).toBe(5); // machine appears twice
      expect(stats.mostCommonTokens).toHaveLength(5);
      expect(stats.mostCommonTokens[0].token).toBe('machine');
      expect(stats.mostCommonTokens[0].count).toBe(2);
    });

    it('should handle empty array', () => {
      const stats = service.getProcessingStats([]);

      expect(stats.totalTexts).toBe(0);
      expect(stats.averageWordCount).toBe(0);
      expect(stats.averageCharCount).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.uniqueTokens).toBe(0);
      expect(stats.mostCommonTokens).toEqual([]);
    });
  });
});
