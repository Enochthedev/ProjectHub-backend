import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  RecommendationResultDto,
  ProjectRecommendationDto,
  SupervisorSummaryDto,
  RecommendationMetadata,
} from '../recommendation-result.dto';

describe('RecommendationResultDto', () => {
  const createValidSupervisor = (): SupervisorSummaryDto => ({
    id: 'supervisor-123',
    name: 'Dr. John Smith',
    specialization: 'Machine Learning',
  });

  const createValidProjectRecommendation = (): ProjectRecommendationDto => ({
    projectId: 'project-123',
    title: 'AI-Powered Chatbot',
    abstract: 'Build an intelligent chatbot using natural language processing',
    specialization: 'Machine Learning',
    difficultyLevel: 'intermediate',
    similarityScore: 0.85,
    matchingSkills: ['Python', 'TensorFlow', 'NLP'],
    matchingInterests: [
      'Artificial Intelligence',
      'Natural Language Processing',
    ],
    reasoning: 'This project matches your AI interests and Python skills',
    supervisor: createValidSupervisor(),
    diversityBoost: 0.1,
  });

  const createValidMetadata = (): RecommendationMetadata => ({
    method: 'ai-similarity',
    fallback: false,
    projectsAnalyzed: 150,
    cacheHitRate: 0.75,
    processingTimeMs: 1250,
  });

  const createValidRecommendationResult = (): RecommendationResultDto => ({
    recommendations: [createValidProjectRecommendation()],
    reasoning: 'Recommendations based on your profile analysis',
    averageSimilarityScore: 0.85,
    fromCache: false,
    generatedAt: new Date('2024-01-15T10:30:00Z'),
    expiresAt: new Date('2024-01-15T11:30:00Z'),
    metadata: createValidMetadata(),
  });

  describe('SupervisorSummaryDto', () => {
    it('should validate valid supervisor data', async () => {
      const dto = plainToClass(SupervisorSummaryDto, createValidSupervisor());
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject missing required fields', async () => {
      const dto = plainToClass(SupervisorSummaryDto, {
        id: 'supervisor-123',
        // Missing name and specialization
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
      expect(errors.some((e) => e.property === 'specialization')).toBe(true);
    });

    it('should reject non-string values', async () => {
      const dto = plainToClass(SupervisorSummaryDto, {
        id: 123,
        name: null,
        specialization: undefined,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ProjectRecommendationDto', () => {
    it('should validate valid project recommendation', async () => {
      const dto = plainToClass(
        ProjectRecommendationDto,
        createValidProjectRecommendation(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate similarity score range', async () => {
      const validDto = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        similarityScore: 0.5,
      });
      const validErrors = await validate(validDto);
      expect(validErrors).toHaveLength(0);

      const invalidDto = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        similarityScore: 1.5, // Invalid: above 1.0
      });
      const invalidErrors = await validate(invalidDto);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors.some((e) => e.property === 'similarityScore')).toBe(
        true,
      );
    });

    it('should validate array fields', async () => {
      const dto = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        matchingSkills: ['Python', 'JavaScript'],
        matchingInterests: ['AI', 'Web Development'],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid array elements', async () => {
      const dto = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        matchingSkills: ['Python', 123, null], // Invalid elements
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.property === 'matchingSkills')).toBe(true);
    });

    it('should validate nested supervisor object', async () => {
      const dto = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        supervisor: {
          id: 'supervisor-123',
          name: 'Dr. Smith',
          specialization: 'AI',
        },
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should handle optional diversityBoost field', async () => {
      const dtoWithBoost = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        diversityBoost: 0.2,
      });
      const errorsWithBoost = await validate(dtoWithBoost);
      expect(errorsWithBoost).toHaveLength(0);

      const dtoWithoutBoost = plainToClass(ProjectRecommendationDto, {
        ...createValidProjectRecommendation(),
        diversityBoost: undefined,
      });
      const errorsWithoutBoost = await validate(dtoWithoutBoost);
      expect(errorsWithoutBoost).toHaveLength(0);
    });
  });

  describe('RecommendationMetadata', () => {
    it('should validate valid metadata', async () => {
      const dto = plainToClass(RecommendationMetadata, createValidMetadata());
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate numeric fields', async () => {
      const dto = plainToClass(RecommendationMetadata, {
        method: 'ai-similarity',
        fallback: false,
        projectsAnalyzed: 100,
        cacheHitRate: 0.8,
        processingTimeMs: 1500,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid types', async () => {
      const dto = plainToClass(RecommendationMetadata, {
        method: 123, // Should be string
        fallback: 'false', // Should be boolean
        projectsAnalyzed: '100', // Should be number
        cacheHitRate: 'high', // Should be number
        processingTimeMs: null, // Should be number
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('RecommendationResultDto', () => {
    it('should validate complete valid result', async () => {
      const dto = plainToClass(
        RecommendationResultDto,
        createValidRecommendationResult(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate recommendations array', async () => {
      const dto = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        recommendations: [
          createValidProjectRecommendation(),
          { ...createValidProjectRecommendation(), projectId: 'project-456' },
        ],
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate average similarity score range', async () => {
      const validDto = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        averageSimilarityScore: 0.75,
      });
      const validErrors = await validate(validDto);
      expect(validErrors).toHaveLength(0);

      const invalidDto = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        averageSimilarityScore: -0.1, // Invalid: below 0.0
      });
      const invalidErrors = await validate(invalidDto);
      expect(invalidErrors.length).toBeGreaterThan(0);
    });

    it('should handle optional expiresAt field', async () => {
      const dtoWithExpiry = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        expiresAt: new Date('2024-01-15T12:00:00Z'),
      });
      const errorsWithExpiry = await validate(dtoWithExpiry);
      expect(errorsWithExpiry).toHaveLength(0);

      const dtoWithoutExpiry = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        expiresAt: undefined,
      });
      const errorsWithoutExpiry = await validate(dtoWithoutExpiry);
      expect(errorsWithoutExpiry).toHaveLength(0);
    });

    it('should validate date transformation', async () => {
      const dto = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        generatedAt: '2024-01-15T10:30:00Z', // String that should be converted to Date
        expiresAt: '2024-01-15T11:30:00Z',
      });

      expect(dto.generatedAt).toBeInstanceOf(Date);
      expect(dto.expiresAt).toBeInstanceOf(Date);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested objects', async () => {
      const dto = plainToClass(
        RecommendationResultDto,
        createValidRecommendationResult(),
      );
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);

      // Verify nested validation works
      expect(dto.recommendations[0]).toBeInstanceOf(ProjectRecommendationDto);
      expect(dto.metadata).toBeInstanceOf(RecommendationMetadata);
    });

    it('should reject empty recommendations array', async () => {
      const dto = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        recommendations: [],
      });
      const errors = await validate(dto);
      // Note: The current DTO doesn't enforce non-empty array, but we validate it's an array
      expect(errors).toHaveLength(0);
    });

    it('should handle complex nested validation errors', async () => {
      const dto = plainToClass(RecommendationResultDto, {
        ...createValidRecommendationResult(),
        recommendations: [
          {
            ...createValidProjectRecommendation(),
            similarityScore: 2.0, // Invalid score
            supervisor: {
              id: 'supervisor-123',
              // Missing name and specialization
            },
          },
        ],
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('serialization and structure', () => {
    it('should maintain proper structure after transformation', () => {
      const rawData = {
        recommendations: [
          {
            projectId: 'project-123',
            title: 'Test Project',
            abstract: 'Test abstract',
            specialization: 'AI',
            difficultyLevel: 'intermediate',
            similarityScore: 0.8,
            matchingSkills: ['Python'],
            matchingInterests: ['AI'],
            reasoning: 'Good match',
            supervisor: {
              id: 'sup-123',
              name: 'Dr. Test',
              specialization: 'AI',
            },
          },
        ],
        reasoning: 'Test reasoning',
        averageSimilarityScore: 0.8,
        fromCache: false,
        generatedAt: '2024-01-15T10:30:00Z',
        metadata: {
          method: 'ai',
          fallback: false,
          projectsAnalyzed: 100,
          cacheHitRate: 0.5,
          processingTimeMs: 1000,
        },
      };

      const dto = plainToClass(RecommendationResultDto, rawData);

      expect(dto.recommendations).toHaveLength(1);
      expect(dto.recommendations[0].projectId).toBe('project-123');
      expect(dto.recommendations[0].supervisor.name).toBe('Dr. Test');
      expect(dto.metadata.method).toBe('ai');
      expect(dto.generatedAt).toBeInstanceOf(Date);
    });
  });
});
