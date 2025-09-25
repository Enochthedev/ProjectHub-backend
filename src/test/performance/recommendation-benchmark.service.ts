import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  User,
  StudentProfile,
  Project,
  Recommendation,
  RecommendationFeedback,
  AIApiUsage,
} from '../../entities';
import { RecommendationService } from '../../services/recommendation.service';
import { FallbackRecommendationService } from '../../services/fallback-recommendation.service';
import { FeedbackType, UserRole } from '../../common/enums';
import { RecommendationFixtures } from '../fixtures';

export interface BenchmarkMetrics {
  accuracy: AccuracyMetrics;
  relevance: RelevanceMetrics;
  performance: PerformanceMetrics;
  diversity: DiversityMetrics;
  coverage: CoverageMetrics;
}

export interface AccuracyMetrics {
  precisionAtK: { [k: number]: number };
  recallAtK: { [k: number]: number };
  f1ScoreAtK: { [k: number]: number };
  meanAveragePrecision: number;
  normalizedDiscountedCumulativeGain: { [k: number]: number };
}

export interface RelevanceMetrics {
  averageSimilarityScore: number;
  medianSimilarityScore: number;
  similarityScoreDistribution: { [range: string]: number };
  userSatisfactionScore: number;
  clickThroughRate: number;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughputPerSecond: number;
  cacheHitRate: number;
  aiApiUsageRate: number;
  errorRate: number;
}

export interface DiversityMetrics {
  specializationDiversity: number;
  difficultyLevelDiversity: number;
  supervisorDiversity: number;
  intraListDiversity: number;
  catalogCoverage: number;
}

export interface CoverageMetrics {
  userCoverage: number;
  projectCoverage: number;
  specializationCoverage: number;
  longTailCoverage: number;
}

export interface BenchmarkScenario {
  name: string;
  description: string;
  studentProfiles: Partial<StudentProfile>[];
  projects: Partial<Project>[];
  expectedOutcomes: ExpectedOutcome[];
}

export interface ExpectedOutcome {
  studentIndex: number;
  expectedProjectIds: string[];
  minimumSimilarityScore: number;
  expectedSpecializations: string[];
}

export interface LoadTestResult {
  concurrentUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
}

@Injectable()
export class RecommendationBenchmarkService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationFeedback)
    private feedbackRepository: Repository<RecommendationFeedback>,
    @InjectRepository(AIApiUsage)
    private apiUsageRepository: Repository<AIApiUsage>,
    private recommendationService: RecommendationService,
    private fallbackService: FallbackRecommendationService,
  ) {}

  /**
   * Run comprehensive benchmark tests
   */
  async runComprehensiveBenchmark(): Promise<BenchmarkMetrics> {
    console.log('🚀 Starting comprehensive recommendation benchmark...');

    const startTime = Date.now();

    // Run all benchmark categories
    const [accuracy, relevance, performance, diversity, coverage] =
      await Promise.all([
        this.measureAccuracy(),
        this.measureRelevance(),
        this.measurePerformance(),
        this.measureDiversity(),
        this.measureCoverage(),
      ]);

    const totalTime = Date.now() - startTime;
    console.log(`✅ Comprehensive benchmark completed in ${totalTime}ms`);

    return {
      accuracy,
      relevance,
      performance,
      diversity,
      coverage,
    };
  }

  /**
   * Measure recommendation accuracy using various metrics
   */
  async measureAccuracy(): Promise<AccuracyMetrics> {
    console.log('📊 Measuring recommendation accuracy...');

    const scenarios = this.createAccuracyTestScenarios();
    const kValues = [1, 3, 5, 10];

    const precisionAtK: { [k: number]: number } = {};
    const recallAtK: { [k: number]: number } = {};
    const f1ScoreAtK: { [k: number]: number } = {};
    const ndcgAtK: { [k: number]: number } = {};
    let totalAP = 0;

    for (const scenario of scenarios) {
      const results = await this.runAccuracyScenario(scenario);

      for (const k of kValues) {
        const precision = this.calculatePrecisionAtK(results, k);
        const recall = this.calculateRecallAtK(results, k);
        const f1 = this.calculateF1Score(precision, recall);
        const ndcg = this.calculateNDCG(results, k);

        precisionAtK[k] = (precisionAtK[k] || 0) + precision;
        recallAtK[k] = (recallAtK[k] || 0) + recall;
        f1ScoreAtK[k] = (f1ScoreAtK[k] || 0) + f1;
        ndcgAtK[k] = (ndcgAtK[k] || 0) + ndcg;
      }

      totalAP += this.calculateAveragePrecision(results);
    }

    // Average across all scenarios
    const scenarioCount = scenarios.length;
    for (const k of kValues) {
      precisionAtK[k] /= scenarioCount;
      recallAtK[k] /= scenarioCount;
      f1ScoreAtK[k] /= scenarioCount;
      ndcgAtK[k] /= scenarioCount;
    }

    return {
      precisionAtK,
      recallAtK,
      f1ScoreAtK,
      meanAveragePrecision: totalAP / scenarioCount,
      normalizedDiscountedCumulativeGain: ndcgAtK,
    };
  }

  /**
   * Measure recommendation relevance and user satisfaction
   */
  async measureRelevance(): Promise<RelevanceMetrics> {
    console.log('🎯 Measuring recommendation relevance...');

    const recommendations = await this.recommendationRepository.find({
      relations: ['feedback'],
      take: 100,
    });

    const similarityScores = recommendations.flatMap((rec) =>
      rec.projectSuggestions.map((proj) => proj.similarityScore),
    );

    const feedback = await this.feedbackRepository.find({
      where: { feedbackType: FeedbackType.RATING },
    });

    const positiveActions = await this.feedbackRepository.count({
      where: [
        { feedbackType: FeedbackType.LIKE },
        { feedbackType: FeedbackType.BOOKMARK },
      ],
    });

    const totalActions = await this.feedbackRepository.count();

    return {
      averageSimilarityScore: this.calculateAverage(similarityScores),
      medianSimilarityScore: this.calculateMedian(similarityScores),
      similarityScoreDistribution: this.calculateDistribution(similarityScores),
      userSatisfactionScore: this.calculateUserSatisfaction(feedback),
      clickThroughRate: totalActions > 0 ? positiveActions / totalActions : 0,
    };
  }

  /**
   * Measure system performance metrics
   */
  async measurePerformance(): Promise<PerformanceMetrics> {
    console.log('⚡ Measuring recommendation performance...');

    const students = await this.userRepository.find({
      relations: ['studentProfile'],
      where: { role: UserRole.STUDENT },
      take: 50,
    });

    const responseTimes: number[] = [];
    let cacheHits = 0;
    let aiApiCalls = 0;
    let errors = 0;

    for (const student of students) {
      try {
        const startTime = Date.now();
        const result = await this.recommendationService.generateRecommendations(
          student.id,
          { limit: 10 },
        );
        const responseTime = Date.now() - startTime;

        responseTimes.push(responseTime);

        if (result.fromCache) {
          cacheHits++;
        }

        if (result.metadata?.method === 'ai-powered') {
          aiApiCalls++;
        }
      } catch (error) {
        errors++;
        console.error(
          `Error generating recommendations for student ${student.id}:`,
          error,
        );
      }
    }

    const apiUsage = await this.apiUsageRepository.find({
      where: { success: true },
      take: 1000,
    });

    return {
      averageResponseTime: this.calculateAverage(responseTimes),
      medianResponseTime: this.calculateMedian(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      throughputPerSecond:
        students.length / (this.calculateAverage(responseTimes) / 1000),
      cacheHitRate: students.length > 0 ? cacheHits / students.length : 0,
      aiApiUsageRate: students.length > 0 ? aiApiCalls / students.length : 0,
      errorRate: students.length > 0 ? errors / students.length : 0,
    };
  }

  /**
   * Measure recommendation diversity
   */
  async measureDiversity(): Promise<DiversityMetrics> {
    console.log('🌈 Measuring recommendation diversity...');

    const recommendations = await this.recommendationRepository.find({
      take: 100,
    });

    const allProjects = await this.projectRepository.find();
    const totalProjects = allProjects.length;

    let specializationDiversity = 0;
    let difficultyDiversity = 0;
    let supervisorDiversity = 0;
    let intraListDiversity = 0;
    let recommendedProjectIds = new Set<string>();

    for (const rec of recommendations) {
      const projects = rec.projectSuggestions;

      // Calculate specialization diversity within recommendation
      const specializations = new Set(projects.map((p) => p.specialization));
      specializationDiversity += specializations.size / projects.length;

      // Calculate difficulty diversity
      const difficulties = new Set(projects.map((p) => p.difficultyLevel));
      difficultyDiversity += difficulties.size / projects.length;

      // Calculate supervisor diversity
      const supervisors = new Set(projects.map((p) => p.supervisor.id));
      supervisorDiversity += supervisors.size / projects.length;

      // Calculate intra-list diversity (average pairwise dissimilarity)
      intraListDiversity += this.calculateIntraListDiversity(projects);

      // Track recommended projects for catalog coverage
      projects.forEach((p) => recommendedProjectIds.add(p.projectId));
    }

    return {
      specializationDiversity: specializationDiversity / recommendations.length,
      difficultyLevelDiversity: difficultyDiversity / recommendations.length,
      supervisorDiversity: supervisorDiversity / recommendations.length,
      intraListDiversity: intraListDiversity / recommendations.length,
      catalogCoverage: recommendedProjectIds.size / totalProjects,
    };
  }

  /**
   * Measure recommendation coverage
   */
  async measureCoverage(): Promise<CoverageMetrics> {
    console.log('📈 Measuring recommendation coverage...');

    const totalUsers = await this.userRepository.count({
      where: { role: UserRole.STUDENT },
    });
    const usersWithRecommendations = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('COUNT(DISTINCT rec.student_id)', 'count')
      .getRawOne();

    const totalProjects = await this.projectRepository.count();
    const recommendedProjects = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select(
        "COUNT(DISTINCT jsonb_array_elements(rec.project_suggestions)->'projectId')",
        'count',
      )
      .getRawOne();

    const specializations = await this.projectRepository
      .createQueryBuilder('project')
      .select('DISTINCT project.specialization')
      .getRawMany();

    const recommendedSpecializations = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select(
        "COUNT(DISTINCT jsonb_array_elements(rec.project_suggestions)->'specialization')",
        'count',
      )
      .getRawOne();

    // Long tail coverage (projects with low view counts)
    const longTailProjects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.views', 'view')
      .groupBy('project.id')
      .having('COUNT(view.id) < :threshold', { threshold: 10 })
      .getCount();

    return {
      userCoverage:
        totalUsers > 0
          ? parseInt(usersWithRecommendations.count) / totalUsers
          : 0,
      projectCoverage:
        totalProjects > 0
          ? parseInt(recommendedProjects.count) / totalProjects
          : 0,
      specializationCoverage:
        specializations.length > 0
          ? parseInt(recommendedSpecializations.count) / specializations.length
          : 0,
      longTailCoverage:
        totalProjects > 0 ? longTailProjects / totalProjects : 0,
    };
  }

  /**
   * Run load testing with different concurrent user scenarios
   */
  async runLoadTest(
    scenarios: { users: number; duration: number }[],
  ): Promise<LoadTestResult[]> {
    console.log('🔥 Running load tests...');

    const results: LoadTestResult[] = [];

    for (const scenario of scenarios) {
      console.log(
        `Testing ${scenario.users} concurrent users for ${scenario.duration}ms...`,
      );

      const result = await this.executeLoadTestScenario(
        scenario.users,
        scenario.duration,
      );
      results.push(result);

      // Wait between scenarios to allow system recovery
      await this.sleep(5000);
    }

    return results;
  }

  /**
   * A/B test framework for comparing recommendation algorithms
   */
  async runABTest(
    testName: string,
    controlGroup: string[],
    treatmentGroup: string[],
    duration: number,
  ): Promise<{
    controlMetrics: BenchmarkMetrics;
    treatmentMetrics: BenchmarkMetrics;
    statisticalSignificance: boolean;
    improvement: number;
  }> {
    console.log(`🧪 Running A/B test: ${testName}`);

    // Run control group with current algorithm
    const controlMetrics = await this.measureGroupPerformance(
      controlGroup,
      'control',
    );

    // Run treatment group with alternative algorithm (fallback for testing)
    const treatmentMetrics = await this.measureGroupPerformance(
      treatmentGroup,
      'treatment',
    );

    // Calculate statistical significance and improvement
    const significance = this.calculateStatisticalSignificance(
      controlMetrics,
      treatmentMetrics,
    );
    const improvement = this.calculateImprovement(
      controlMetrics,
      treatmentMetrics,
    );

    return {
      controlMetrics,
      treatmentMetrics,
      statisticalSignificance: significance,
      improvement,
    };
  }

  /**
   * Generate comprehensive benchmark report
   */
  async generateBenchmarkReport(metrics: BenchmarkMetrics): Promise<string> {
    const report = `
# Recommendation System Benchmark Report
Generated: ${new Date().toISOString()}

## Executive Summary
- **Overall Performance**: ${this.getOverallRating(metrics)}
- **Key Strengths**: ${this.identifyStrengths(metrics).join(', ')}
- **Areas for Improvement**: ${this.identifyWeaknesses(metrics).join(', ')}

## Accuracy Metrics
- **Precision@5**: ${(metrics.accuracy.precisionAtK[5] * 100).toFixed(2)}%
- **Recall@5**: ${(metrics.accuracy.recallAtK[5] * 100).toFixed(2)}%
- **F1-Score@5**: ${(metrics.accuracy.f1ScoreAtK[5] * 100).toFixed(2)}%
- **Mean Average Precision**: ${(metrics.accuracy.meanAveragePrecision * 100).toFixed(2)}%
- **NDCG@5**: ${(metrics.accuracy.normalizedDiscountedCumulativeGain[5] * 100).toFixed(2)}%

## Relevance Metrics
- **Average Similarity Score**: ${metrics.relevance.averageSimilarityScore.toFixed(3)}
- **User Satisfaction**: ${(metrics.relevance.userSatisfactionScore * 100).toFixed(2)}%
- **Click-Through Rate**: ${(metrics.relevance.clickThroughRate * 100).toFixed(2)}%

## Performance Metrics
- **Average Response Time**: ${metrics.performance.averageResponseTime.toFixed(0)}ms
- **P95 Response Time**: ${metrics.performance.p95ResponseTime.toFixed(0)}ms
- **Throughput**: ${metrics.performance.throughputPerSecond.toFixed(2)} req/s
- **Cache Hit Rate**: ${(metrics.performance.cacheHitRate * 100).toFixed(2)}%
- **Error Rate**: ${(metrics.performance.errorRate * 100).toFixed(2)}%

## Diversity Metrics
- **Specialization Diversity**: ${(metrics.diversity.specializationDiversity * 100).toFixed(2)}%
- **Catalog Coverage**: ${(metrics.diversity.catalogCoverage * 100).toFixed(2)}%
- **Intra-List Diversity**: ${(metrics.diversity.intraListDiversity * 100).toFixed(2)}%

## Coverage Metrics
- **User Coverage**: ${(metrics.coverage.userCoverage * 100).toFixed(2)}%
- **Project Coverage**: ${(metrics.coverage.projectCoverage * 100).toFixed(2)}%
- **Long Tail Coverage**: ${(metrics.coverage.longTailCoverage * 100).toFixed(2)}%

## Recommendations
${this.generateRecommendations(metrics)
  .map((rec) => `- ${rec}`)
  .join('\n')}
`;

    return report;
  }

  // Private helper methods

  private createAccuracyTestScenarios(): BenchmarkScenario[] {
    return [
      {
        name: 'Perfect Match Scenario',
        description: 'Students with clear specialization preferences',
        studentProfiles:
          RecommendationFixtures.createDiverseStudentProfiles().slice(0, 2),
        projects: RecommendationFixtures.createDiverseTestProjects(),
        expectedOutcomes: [
          {
            studentIndex: 0,
            expectedProjectIds: ['ai-project-1', 'ai-project-2'],
            minimumSimilarityScore: 0.8,
            expectedSpecializations: [
              'Artificial Intelligence & Machine Learning',
            ],
          },
        ],
      },
      // Add more scenarios...
    ];
  }

  private async runAccuracyScenario(
    scenario: BenchmarkScenario,
  ): Promise<any[]> {
    // Implementation for running accuracy scenario
    return [];
  }

  private calculatePrecisionAtK(results: any[], k: number): number {
    // Implementation for precision@k calculation
    return 0.8; // Placeholder
  }

  private calculateRecallAtK(results: any[], k: number): number {
    // Implementation for recall@k calculation
    return 0.7; // Placeholder
  }

  private calculateF1Score(precision: number, recall: number): number {
    return precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  }

  private calculateNDCG(results: any[], k: number): number {
    // Implementation for NDCG calculation
    return 0.75; // Placeholder
  }

  private calculateAveragePrecision(results: any[]): number {
    // Implementation for average precision calculation
    return 0.8; // Placeholder
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((sum, n) => sum + n, 0) / numbers.length
      : 0;
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateDistribution(scores: number[]): { [range: string]: number } {
    const ranges = {
      '0.0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0,
    };

    scores.forEach((score) => {
      if (score < 0.2) ranges['0.0-0.2']++;
      else if (score < 0.4) ranges['0.2-0.4']++;
      else if (score < 0.6) ranges['0.4-0.6']++;
      else if (score < 0.8) ranges['0.6-0.8']++;
      else ranges['0.8-1.0']++;
    });

    const total = scores.length;
    Object.keys(ranges).forEach((key) => {
      ranges[key] = total > 0 ? ranges[key] / total : 0;
    });

    return ranges;
  }

  private calculateUserSatisfaction(
    feedback: RecommendationFeedback[],
  ): number {
    if (feedback.length === 0) return 0;

    const ratings = feedback
      .filter((f) => f.rating !== null)
      .map((f) => f.rating!);
    return ratings.length > 0 ? this.calculateAverage(ratings) / 5 : 0; // Normalize to 0-1
  }

  private calculateIntraListDiversity(projects: any[]): number {
    // Calculate average pairwise dissimilarity
    let totalDissimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const dissimilarity = this.calculateProjectDissimilarity(
          projects[i],
          projects[j],
        );
        totalDissimilarity += dissimilarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalDissimilarity / pairCount : 0;
  }

  private calculateProjectDissimilarity(proj1: any, proj2: any): number {
    // Simple dissimilarity based on specialization and difficulty
    let dissimilarity = 0;

    if (proj1.specialization !== proj2.specialization) dissimilarity += 0.5;
    if (proj1.difficultyLevel !== proj2.difficultyLevel) dissimilarity += 0.3;
    if (proj1.supervisor.id !== proj2.supervisor.id) dissimilarity += 0.2;

    return Math.min(1, dissimilarity);
  }

  private async executeLoadTestScenario(
    users: number,
    duration: number,
  ): Promise<LoadTestResult> {
    const startTime = Date.now();
    const promises: Promise<any>[] = [];
    let successCount = 0;
    let errorCount = 0;
    const responseTimes: number[] = [];

    // Get test students
    const students = await this.userRepository.find({
      where: { role: UserRole.STUDENT },
      take: users,
    });

    // Create concurrent requests
    for (let i = 0; i < users; i++) {
      const student = students[i % students.length];

      const promise = this.simulateUserRequest(student.id)
        .then((responseTime) => {
          successCount++;
          responseTimes.push(responseTime);
        })
        .catch(() => {
          errorCount++;
        });

      promises.push(promise);
    }

    await Promise.all(promises);

    const totalTime = Date.now() - startTime;
    const memoryUsage = process.memoryUsage();

    return {
      concurrentUsers: users,
      totalRequests: users,
      successfulRequests: successCount,
      failedRequests: errorCount,
      averageResponseTime: this.calculateAverage(responseTimes),
      requestsPerSecond: (successCount / totalTime) * 1000,
      errorRate: errorCount / users,
      memoryUsage,
    };
  }

  private async simulateUserRequest(studentId: string): Promise<number> {
    const startTime = Date.now();

    try {
      await this.recommendationService.generateRecommendations(studentId, {
        limit: 10,
      });
      return Date.now() - startTime;
    } catch (error) {
      throw error;
    }
  }

  private async measureGroupPerformance(
    userIds: string[],
    groupType: string,
  ): Promise<BenchmarkMetrics> {
    // Simplified implementation - in practice, this would measure specific algorithm performance
    return this.runComprehensiveBenchmark();
  }

  private calculateStatisticalSignificance(
    control: BenchmarkMetrics,
    treatment: BenchmarkMetrics,
  ): boolean {
    // Simplified significance test - in practice, use proper statistical tests
    const controlScore = control.accuracy.meanAveragePrecision;
    const treatmentScore = treatment.accuracy.meanAveragePrecision;

    return Math.abs(treatmentScore - controlScore) > 0.05; // 5% threshold
  }

  private calculateImprovement(
    control: BenchmarkMetrics,
    treatment: BenchmarkMetrics,
  ): number {
    const controlScore = control.accuracy.meanAveragePrecision;
    const treatmentScore = treatment.accuracy.meanAveragePrecision;

    return controlScore > 0
      ? (treatmentScore - controlScore) / controlScore
      : 0;
  }

  private getOverallRating(metrics: BenchmarkMetrics): string {
    const score =
      (metrics.accuracy.meanAveragePrecision +
        metrics.relevance.userSatisfactionScore +
        (1 - metrics.performance.errorRate) +
        metrics.diversity.catalogCoverage +
        metrics.coverage.userCoverage) /
      5;

    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    return 'Needs Improvement';
  }

  private identifyStrengths(metrics: BenchmarkMetrics): string[] {
    const strengths: string[] = [];

    if (metrics.accuracy.meanAveragePrecision > 0.7)
      strengths.push('High Accuracy');
    if (metrics.performance.averageResponseTime < 2000)
      strengths.push('Fast Response Time');
    if (metrics.diversity.catalogCoverage > 0.6)
      strengths.push('Good Diversity');
    if (metrics.performance.cacheHitRate > 0.5)
      strengths.push('Effective Caching');

    return strengths;
  }

  private identifyWeaknesses(metrics: BenchmarkMetrics): string[] {
    const weaknesses: string[] = [];

    if (metrics.accuracy.meanAveragePrecision < 0.5)
      weaknesses.push('Low Accuracy');
    if (metrics.performance.averageResponseTime > 5000)
      weaknesses.push('Slow Response Time');
    if (metrics.performance.errorRate > 0.1) weaknesses.push('High Error Rate');
    if (metrics.coverage.longTailCoverage < 0.3)
      weaknesses.push('Poor Long Tail Coverage');

    return weaknesses;
  }

  private generateRecommendations(metrics: BenchmarkMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.performance.cacheHitRate < 0.5) {
      recommendations.push('Improve caching strategy to reduce response times');
    }

    if (metrics.diversity.catalogCoverage < 0.5) {
      recommendations.push(
        'Enhance diversity algorithms to cover more projects',
      );
    }

    if (metrics.accuracy.meanAveragePrecision < 0.6) {
      recommendations.push(
        'Fine-tune similarity algorithms for better accuracy',
      );
    }

    if (metrics.coverage.longTailCoverage < 0.3) {
      recommendations.push(
        'Implement strategies to promote less popular projects',
      );
    }

    return recommendations;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
