import { Injectable, Logger } from '@nestjs/common';

export interface SimilarityResult {
  score: number;
  normalizedScore: number;
  rank?: number;
}

export interface BatchSimilarityResult {
  similarities: SimilarityResult[];
  averageScore: number;
  maxScore: number;
  minScore: number;
  rankedIndices: number[];
}

export interface SimilarityCalculationOptions {
  normalizeScores?: boolean;
  includeRanking?: boolean;
  minThreshold?: number;
  maxResults?: number;
}

@Injectable()
export class SimilarityService {
  private readonly logger = new Logger(SimilarityService.name);

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(
    embedding1: number[],
    embedding2: number[],
  ): number {
    if (!embedding1 || !embedding2) {
      throw new Error('Both embeddings must be provided');
    }

    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    if (embedding1.length === 0) {
      throw new Error('Embeddings cannot be empty');
    }

    // Calculate dot product
    let dotProduct = 0;
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
    }

    // Calculate magnitudes
    let magnitude1 = 0;
    let magnitude2 = 0;
    for (let i = 0; i < embedding1.length; i++) {
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    // Avoid division by zero
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    // Calculate cosine similarity
    const similarity = dotProduct / (magnitude1 * magnitude2);

    // Clamp to [-1, 1] range to handle floating point precision issues
    return Math.max(-1, Math.min(1, similarity));
  }

  /**
   * Calculate similarity between one embedding and multiple embeddings
   */
  calculateBatchSimilarity(
    sourceEmbedding: number[],
    targetEmbeddings: number[][],
    options: SimilarityCalculationOptions = {},
  ): BatchSimilarityResult {
    if (!sourceEmbedding || !targetEmbeddings) {
      throw new Error(
        'Source embedding and target embeddings must be provided',
      );
    }

    if (targetEmbeddings.length === 0) {
      throw new Error('Target embeddings array cannot be empty');
    }

    this.logger.debug(
      `Calculating similarity for 1 source against ${targetEmbeddings.length} targets`,
    );

    const similarities: SimilarityResult[] = [];
    let totalScore = 0;
    let maxScore = -1;
    let minScore = 1;

    // Calculate similarities
    for (let i = 0; i < targetEmbeddings.length; i++) {
      try {
        const score = this.calculateCosineSimilarity(
          sourceEmbedding,
          targetEmbeddings[i],
        );

        // Apply minimum threshold if specified
        if (
          options.minThreshold !== undefined &&
          score < options.minThreshold
        ) {
          continue;
        }

        const result: SimilarityResult = {
          score,
          normalizedScore: score, // Will be updated if normalization is requested
        };

        similarities.push(result);
        totalScore += score;
        maxScore = Math.max(maxScore, score);
        minScore = Math.min(minScore, score);
      } catch (error) {
        this.logger.warn(
          `Error calculating similarity for embedding ${i}: ${error.message}`,
        );
        // Skip this embedding and continue
      }
    }

    if (similarities.length === 0) {
      return {
        similarities: [],
        averageScore: 0,
        maxScore: 0,
        minScore: 0,
        rankedIndices: [],
      };
    }

    // Normalize scores if requested
    if (options.normalizeScores && maxScore > minScore) {
      for (const result of similarities) {
        result.normalizedScore =
          (result.score - minScore) / (maxScore - minScore);
      }
    }

    // Create ranking if requested
    let rankedIndices: number[] = [];
    if (options.includeRanking) {
      rankedIndices = similarities
        .map((result, index) => ({ index, score: result.normalizedScore }))
        .sort((a, b) => b.score - a.score)
        .map((item) => item.index);

      // Add rank to results
      rankedIndices.forEach((originalIndex, rank) => {
        similarities[originalIndex].rank = rank + 1;
      });

      // Limit results if maxResults is specified
      if (options.maxResults && options.maxResults > 0) {
        rankedIndices = rankedIndices.slice(0, options.maxResults);
      }
    }

    const averageScore = totalScore / similarities.length;

    this.logger.debug(
      `Similarity calculation complete: ${similarities.length} results, avg: ${averageScore.toFixed(3)}, max: ${maxScore.toFixed(3)}, min: ${minScore.toFixed(3)}`,
    );

    return {
      similarities,
      averageScore,
      maxScore,
      minScore,
      rankedIndices,
    };
  }

  /**
   * Calculate pairwise similarities between multiple embeddings
   */
  calculatePairwiseSimilarities(embeddings: number[][]): number[][] {
    if (!embeddings || embeddings.length === 0) {
      throw new Error('Embeddings array cannot be empty');
    }

    this.logger.debug(
      `Calculating pairwise similarities for ${embeddings.length} embeddings`,
    );

    const n = embeddings.length;
    const similarities: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        if (i === j) {
          similarities[i][j] = 1.0; // Self-similarity is always 1
        } else {
          const similarity = this.calculateCosineSimilarity(
            embeddings[i],
            embeddings[j],
          );
          similarities[i][j] = similarity;
          similarities[j][i] = similarity; // Symmetric matrix
        }
      }
    }

    return similarities;
  }

  /**
   * Find the most similar embeddings to a source embedding
   */
  findMostSimilar(
    sourceEmbedding: number[],
    targetEmbeddings: number[][],
    topK: number = 10,
    minThreshold: number = 0.0,
  ): Array<{
    index: number;
    score: number;
    normalizedScore: number;
    rank: number;
  }> {
    const batchResult = this.calculateBatchSimilarity(
      sourceEmbedding,
      targetEmbeddings,
      {
        normalizeScores: true,
        includeRanking: true,
        minThreshold,
        maxResults: topK,
      },
    );

    return batchResult.rankedIndices.map((index) => ({
      index,
      score: batchResult.similarities[index].score,
      normalizedScore: batchResult.similarities[index].normalizedScore,
      rank: batchResult.similarities[index].rank!,
    }));
  }

  /**
   * Calculate similarity statistics for a set of similarities
   */
  calculateSimilarityStatistics(similarities: number[]): {
    mean: number;
    median: number;
    standardDeviation: number;
    min: number;
    max: number;
    percentile25: number;
    percentile75: number;
  } {
    if (!similarities || similarities.length === 0) {
      throw new Error('Similarities array cannot be empty');
    }

    const sorted = [...similarities].sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate mean
    const mean = similarities.reduce((sum, val) => sum + val, 0) / n;

    // Calculate median
    const median =
      n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // Calculate standard deviation
    const variance =
      similarities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Calculate percentiles
    const percentile25 = sorted[Math.floor(n * 0.25)];
    const percentile75 = sorted[Math.floor(n * 0.75)];

    return {
      mean,
      median,
      standardDeviation,
      min: sorted[0],
      max: sorted[n - 1],
      percentile25,
      percentile75,
    };
  }

  /**
   * Normalize similarity scores to a 0-1 range
   */
  normalizeScores(scores: number[]): number[] {
    if (!scores || scores.length === 0) {
      return [];
    }

    const min = Math.min(...scores);
    const max = Math.max(...scores);

    if (max === min) {
      return scores.map(() => 1.0); // All scores are the same
    }

    return scores.map((score) => (score - min) / (max - min));
  }

  /**
   * Apply weighted similarity calculation
   */
  calculateWeightedSimilarity(
    similarities: number[],
    weights: number[],
  ): number {
    if (!similarities || !weights) {
      throw new Error('Similarities and weights must be provided');
    }

    if (similarities.length !== weights.length) {
      throw new Error('Similarities and weights must have the same length');
    }

    if (similarities.length === 0) {
      return 0;
    }

    // Normalize weights to sum to 1
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    if (weightSum === 0) {
      throw new Error('Weight sum cannot be zero');
    }

    const normalizedWeights = weights.map((weight) => weight / weightSum);

    // Calculate weighted sum
    let weightedSum = 0;
    for (let i = 0; i < similarities.length; i++) {
      weightedSum += similarities[i] * normalizedWeights[i];
    }

    return weightedSum;
  }

  /**
   * Calculate diversity score for a set of embeddings
   */
  calculateDiversityScore(embeddings: number[][]): number {
    if (!embeddings || embeddings.length < 2) {
      return 1.0; // Maximum diversity for single or no embeddings
    }

    const pairwiseSimilarities = this.calculatePairwiseSimilarities(embeddings);
    let totalSimilarity = 0;
    let pairCount = 0;

    // Calculate average pairwise similarity (excluding self-similarities)
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        totalSimilarity += pairwiseSimilarities[i][j];
        pairCount++;
      }
    }

    if (pairCount === 0) {
      return 1.0;
    }

    const averageSimilarity = totalSimilarity / pairCount;

    // Diversity is inverse of similarity (1 - similarity)
    return Math.max(0, 1 - averageSimilarity);
  }

  /**
   * Filter embeddings by similarity threshold
   */
  filterBySimilarityThreshold(
    sourceEmbedding: number[],
    targetEmbeddings: number[][],
    threshold: number,
  ): Array<{ index: number; embedding: number[]; score: number }> {
    const results: Array<{
      index: number;
      embedding: number[];
      score: number;
    }> = [];

    for (let i = 0; i < targetEmbeddings.length; i++) {
      try {
        const score = this.calculateCosineSimilarity(
          sourceEmbedding,
          targetEmbeddings[i],
        );
        if (score >= threshold) {
          results.push({
            index: i,
            embedding: targetEmbeddings[i],
            score,
          });
        }
      } catch (error) {
        this.logger.warn(`Error filtering embedding ${i}: ${error.message}`);
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results;
  }
}
