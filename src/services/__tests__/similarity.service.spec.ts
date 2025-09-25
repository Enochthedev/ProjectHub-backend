import { Test, TestingModule } from '@nestjs/testing';
import {
  SimilarityService,
  SimilarityResult,
  BatchSimilarityResult,
} from '../similarity.service';

describe('SimilarityService', () => {
  let service: SimilarityService;

  const embedding1 = [1, 0, 0];
  const embedding2 = [0, 1, 0];
  const embedding3 = [1, 1, 0];
  const embedding4 = [1, 0, 0]; // Same as embedding1

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SimilarityService],
    }).compile();

    service = module.get<SimilarityService>(SimilarityService);
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      // Test identical vectors (should be 1.0)
      const similarity1 = service.calculateCosineSimilarity(
        embedding1,
        embedding4,
      );
      expect(similarity1).toBeCloseTo(1.0, 5);

      // Test orthogonal vectors (should be 0.0)
      const similarity2 = service.calculateCosineSimilarity(
        embedding1,
        embedding2,
      );
      expect(similarity2).toBeCloseTo(0.0, 5);

      // Test partial similarity
      const similarity3 = service.calculateCosineSimilarity(
        embedding1,
        embedding3,
      );
      expect(similarity3).toBeCloseTo(0.7071, 3); // 1/sqrt(2)
    });

    it('should handle zero vectors', () => {
      const zeroVector = [0, 0, 0];
      const similarity = service.calculateCosineSimilarity(
        embedding1,
        zeroVector,
      );
      expect(similarity).toBe(0);
    });

    it('should throw error for mismatched dimensions', () => {
      const shortVector = [1, 0];
      expect(() => {
        service.calculateCosineSimilarity(embedding1, shortVector);
      }).toThrow('Embeddings must have the same dimensions');
    });

    it('should throw error for empty embeddings', () => {
      expect(() => {
        service.calculateCosineSimilarity([], []);
      }).toThrow('Embeddings cannot be empty');
    });

    it('should throw error for null embeddings', () => {
      expect(() => {
        service.calculateCosineSimilarity(null as any, embedding1);
      }).toThrow('Both embeddings must be provided');

      expect(() => {
        service.calculateCosineSimilarity(embedding1, null as any);
      }).toThrow('Both embeddings must be provided');
    });

    it('should clamp results to [-1, 1] range', () => {
      // Test with very small numbers that might cause precision issues
      const smallEmbedding1 = [1e-10, 1e-10, 1e-10];
      const smallEmbedding2 = [1e-10, 1e-10, 1e-10];

      const similarity = service.calculateCosineSimilarity(
        smallEmbedding1,
        smallEmbedding2,
      );
      expect(similarity).toBeGreaterThanOrEqual(-1);
      expect(similarity).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateBatchSimilarity', () => {
    const targetEmbeddings = [embedding1, embedding2, embedding3, embedding4];

    it('should calculate batch similarities correctly', () => {
      const result = service.calculateBatchSimilarity(
        embedding1,
        targetEmbeddings,
      );

      expect(result.similarities).toHaveLength(4);
      expect(result.similarities[0].score).toBeCloseTo(1.0, 5); // Same as source
      expect(result.similarities[1].score).toBeCloseTo(0.0, 5); // Orthogonal
      expect(result.similarities[3].score).toBeCloseTo(1.0, 5); // Same as source
      expect(result.averageScore).toBeGreaterThan(0);
    });

    it('should apply minimum threshold filter', () => {
      const options = { minThreshold: 0.5 };
      const result = service.calculateBatchSimilarity(
        embedding1,
        targetEmbeddings,
        options,
      );

      // Should only include similarities >= 0.5
      expect(result.similarities.length).toBeLessThan(4);
      result.similarities.forEach((sim) => {
        expect(sim.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should normalize scores when requested', () => {
      const options = { normalizeScores: true };
      const result = service.calculateBatchSimilarity(
        embedding1,
        targetEmbeddings,
        options,
      );

      const normalizedScores = result.similarities.map(
        (s) => s.normalizedScore,
      );
      const minScore = Math.min(...normalizedScores);
      const maxScore = Math.max(...normalizedScores);

      expect(minScore).toBeGreaterThanOrEqual(0);
      expect(maxScore).toBeLessThanOrEqual(1);
    });

    it('should include ranking when requested', () => {
      const options = { includeRanking: true };
      const result = service.calculateBatchSimilarity(
        embedding1,
        targetEmbeddings,
        options,
      );

      expect(result.rankedIndices).toHaveLength(4);
      result.similarities.forEach((sim) => {
        expect(sim.rank).toBeDefined();
        expect(sim.rank).toBeGreaterThan(0);
      });
    });

    it('should limit results when maxResults is specified', () => {
      const options = { includeRanking: true, maxResults: 2 };
      const result = service.calculateBatchSimilarity(
        embedding1,
        targetEmbeddings,
        options,
      );

      expect(result.rankedIndices).toHaveLength(2);
    });

    it('should handle empty target embeddings', () => {
      expect(() => {
        service.calculateBatchSimilarity(embedding1, []);
      }).toThrow('Target embeddings array cannot be empty');
    });

    it('should handle invalid embeddings gracefully', () => {
      const invalidEmbeddings = [embedding1, null as any, embedding2];
      const result = service.calculateBatchSimilarity(
        embedding1,
        invalidEmbeddings,
      );

      // Should skip the null embedding
      expect(result.similarities.length).toBeLessThan(3);
    });

    it('should return empty result when no similarities meet threshold', () => {
      const options = { minThreshold: 2.0 }; // Impossible threshold
      const result = service.calculateBatchSimilarity(
        embedding1,
        targetEmbeddings,
        options,
      );

      expect(result.similarities).toHaveLength(0);
      expect(result.averageScore).toBe(0);
      expect(result.rankedIndices).toHaveLength(0);
    });
  });

  describe('calculatePairwiseSimilarities', () => {
    it('should calculate pairwise similarities matrix', () => {
      const embeddings = [embedding1, embedding2, embedding3];
      const matrix = service.calculatePairwiseSimilarities(embeddings);

      expect(matrix).toHaveLength(3);
      expect(matrix[0]).toHaveLength(3);

      // Diagonal should be 1.0 (self-similarity)
      expect(matrix[0][0]).toBeCloseTo(1.0, 5);
      expect(matrix[1][1]).toBeCloseTo(1.0, 5);
      expect(matrix[2][2]).toBeCloseTo(1.0, 5);

      // Matrix should be symmetric
      expect(matrix[0][1]).toBeCloseTo(matrix[1][0], 5);
      expect(matrix[0][2]).toBeCloseTo(matrix[2][0], 5);
      expect(matrix[1][2]).toBeCloseTo(matrix[2][1], 5);
    });

    it('should handle single embedding', () => {
      const embeddings = [embedding1];
      const matrix = service.calculatePairwiseSimilarities(embeddings);

      expect(matrix).toHaveLength(1);
      expect(matrix[0]).toHaveLength(1);
      expect(matrix[0][0]).toBeCloseTo(1.0, 5);
    });

    it('should throw error for empty embeddings array', () => {
      expect(() => {
        service.calculatePairwiseSimilarities([]);
      }).toThrow('Embeddings array cannot be empty');
    });
  });

  describe('findMostSimilar', () => {
    const targetEmbeddings = [embedding1, embedding2, embedding3, embedding4];

    it('should find most similar embeddings', () => {
      const results = service.findMostSimilar(embedding1, targetEmbeddings, 3);

      expect(results).toHaveLength(3);
      expect(results[0].rank).toBe(1);
      expect(results[0].score).toBeCloseTo(1.0, 5); // Should be most similar

      // Results should be sorted by rank
      for (let i = 1; i < results.length; i++) {
        expect(results[i].rank).toBeGreaterThan(results[i - 1].rank);
      }
    });

    it('should apply minimum threshold', () => {
      const results = service.findMostSimilar(
        embedding1,
        targetEmbeddings,
        10,
        0.8,
      );

      // Should only include high similarity results
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should limit results to topK', () => {
      const results = service.findMostSimilar(embedding1, targetEmbeddings, 2);

      expect(results).toHaveLength(2);
    });
  });

  describe('calculateSimilarityStatistics', () => {
    const similarities = [0.1, 0.3, 0.5, 0.7, 0.9];

    it('should calculate statistics correctly', () => {
      const stats = service.calculateSimilarityStatistics(similarities);

      expect(stats.mean).toBeCloseTo(0.5, 5);
      expect(stats.median).toBeCloseTo(0.5, 5);
      expect(stats.min).toBe(0.1);
      expect(stats.max).toBe(0.9);
      expect(stats.standardDeviation).toBeGreaterThan(0);
      expect(stats.percentile25).toBeDefined();
      expect(stats.percentile75).toBeDefined();
    });

    it('should handle single value', () => {
      const stats = service.calculateSimilarityStatistics([0.5]);

      expect(stats.mean).toBe(0.5);
      expect(stats.median).toBe(0.5);
      expect(stats.min).toBe(0.5);
      expect(stats.max).toBe(0.5);
      expect(stats.standardDeviation).toBe(0);
    });

    it('should throw error for empty array', () => {
      expect(() => {
        service.calculateSimilarityStatistics([]);
      }).toThrow('Similarities array cannot be empty');
    });
  });

  describe('normalizeScores', () => {
    it('should normalize scores to 0-1 range', () => {
      const scores = [0.2, 0.4, 0.6, 0.8];
      const normalized = service.normalizeScores(scores);

      expect(normalized[0]).toBeCloseTo(0.0, 5);
      expect(normalized[3]).toBeCloseTo(1.0, 5);
      expect(Math.min(...normalized)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...normalized)).toBeLessThanOrEqual(1);
    });

    it('should handle identical scores', () => {
      const scores = [0.5, 0.5, 0.5];
      const normalized = service.normalizeScores(scores);

      normalized.forEach((score) => {
        expect(score).toBeCloseTo(1.0, 5);
      });
    });

    it('should handle empty array', () => {
      const normalized = service.normalizeScores([]);
      expect(normalized).toEqual([]);
    });
  });

  describe('calculateWeightedSimilarity', () => {
    it('should calculate weighted similarity correctly', () => {
      const similarities = [0.8, 0.6, 0.4];
      const weights = [0.5, 0.3, 0.2];

      const weighted = service.calculateWeightedSimilarity(
        similarities,
        weights,
      );

      expect(weighted).toBeCloseTo(0.66, 2); // (0.8*0.5 + 0.6*0.3 + 0.4*0.2)
    });

    it('should normalize weights automatically', () => {
      const similarities = [0.8, 0.6];
      const weights = [2, 1]; // Will be normalized to [0.67, 0.33]

      const weighted = service.calculateWeightedSimilarity(
        similarities,
        weights,
      );

      expect(weighted).toBeCloseTo(0.733, 2);
    });

    it('should throw error for mismatched lengths', () => {
      expect(() => {
        service.calculateWeightedSimilarity([0.5], [0.3, 0.7]);
      }).toThrow('Similarities and weights must have the same length');
    });

    it('should throw error for zero weight sum', () => {
      expect(() => {
        service.calculateWeightedSimilarity([0.5], [0]);
      }).toThrow('Weight sum cannot be zero');
    });

    it('should handle empty arrays', () => {
      const weighted = service.calculateWeightedSimilarity([], []);
      expect(weighted).toBe(0);
    });
  });

  describe('calculateDiversityScore', () => {
    it('should calculate diversity score correctly', () => {
      const diverseEmbeddings = [embedding1, embedding2]; // Orthogonal vectors
      const similarEmbeddings = [embedding1, embedding4]; // Same vectors

      const diverseScore = service.calculateDiversityScore(diverseEmbeddings);
      const similarScore = service.calculateDiversityScore(similarEmbeddings);

      expect(diverseScore).toBeGreaterThan(similarScore);
      expect(diverseScore).toBeCloseTo(1.0, 1); // High diversity
      expect(similarScore).toBeCloseTo(0.0, 1); // Low diversity
    });

    it('should return maximum diversity for single embedding', () => {
      const score = service.calculateDiversityScore([embedding1]);
      expect(score).toBe(1.0);
    });

    it('should return maximum diversity for empty array', () => {
      const score = service.calculateDiversityScore([]);
      expect(score).toBe(1.0);
    });
  });

  describe('filterBySimilarityThreshold', () => {
    const targetEmbeddings = [embedding1, embedding2, embedding3, embedding4];

    it('should filter embeddings by threshold', () => {
      const results = service.filterBySimilarityThreshold(
        embedding1,
        targetEmbeddings,
        0.5,
      );

      // Should only include embeddings with similarity >= 0.5
      results.forEach((result) => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });

      // Results should be sorted by score descending
      for (let i = 1; i < results.length; i++) {
        expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score);
      }
    });

    it('should include index and embedding in results', () => {
      const results = service.filterBySimilarityThreshold(
        embedding1,
        targetEmbeddings,
        0.0,
      );

      results.forEach((result) => {
        expect(result.index).toBeDefined();
        expect(result.embedding).toBeDefined();
        expect(result.score).toBeDefined();
        expect(Array.isArray(result.embedding)).toBe(true);
      });
    });

    it('should handle high threshold with no matches', () => {
      const results = service.filterBySimilarityThreshold(
        embedding1,
        targetEmbeddings,
        2.0,
      );
      expect(results).toHaveLength(0);
    });

    it('should handle invalid embeddings gracefully', () => {
      const invalidEmbeddings = [embedding1, null as any, embedding2];
      const results = service.filterBySimilarityThreshold(
        embedding1,
        invalidEmbeddings,
        0.0,
      );

      // Should skip null embeddings
      expect(results.length).toBeLessThan(3);
    });
  });
});
