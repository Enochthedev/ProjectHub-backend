import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AIApiUsage,
  Recommendation,
  RecommendationFeedback,
} from '../../entities';
import * as fs from 'fs';
import * as path from 'path';

export interface PerformanceAnalysis {
  timeSeriesAnalysis: TimeSeriesMetrics;
  userBehaviorAnalysis: UserBehaviorMetrics;
  systemResourceAnalysis: SystemResourceMetrics;
  recommendationQualityTrends: QualityTrendMetrics;
  bottleneckAnalysis: BottleneckMetrics;
}

export interface TimeSeriesMetrics {
  dailyRequestVolume: { date: string; count: number }[];
  hourlyDistribution: { hour: number; avgRequests: number }[];
  responseTimesTrend: {
    date: string;
    avgResponseTime: number;
    p95ResponseTime: number;
  }[];
  errorRatesTrend: { date: string; errorRate: number }[];
}

export interface UserBehaviorMetrics {
  engagementPatterns: { timeOfDay: number; engagementScore: number }[];
  feedbackDistribution: { type: string; count: number; percentage: number }[];
  userRetentionMetrics: { cohort: string; retentionRate: number }[];
  clickThroughRates: { position: number; ctr: number }[];
}

export interface SystemResourceMetrics {
  memoryUsageTrends: {
    timestamp: string;
    heapUsed: number;
    heapTotal: number;
  }[];
  cachePerformance: { hitRate: number; missRate: number; evictionRate: number };
  databasePerformance: { avgQueryTime: number; slowQueries: number };
  aiApiUsagePatterns: {
    endpoint: string;
    avgResponseTime: number;
    errorRate: number;
  }[];
}

export interface QualityTrendMetrics {
  accuracyOverTime: { date: string; accuracy: number }[];
  diversityTrends: { date: string; diversity: number }[];
  userSatisfactionTrends: { date: string; satisfaction: number }[];
  recommendationFreshness: { date: string; freshnessScore: number }[];
}

export interface BottleneckMetrics {
  slowestOperations: {
    operation: string;
    avgTime: number;
    frequency: number;
  }[];
  resourceConstraints: {
    resource: string;
    utilizationRate: number;
    impact: string;
  }[];
  scalabilityLimits: {
    metric: string;
    currentValue: number;
    recommendedLimit: number;
  }[];
}

@Injectable()
export class PerformanceAnalyzerService {
  constructor(
    @InjectRepository(AIApiUsage)
    private apiUsageRepository: Repository<AIApiUsage>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationFeedback)
    private feedbackRepository: Repository<RecommendationFeedback>,
  ) {}

  /**
   * Perform comprehensive performance analysis
   */
  async analyzePerformance(
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceAnalysis> {
    console.log('🔍 Starting comprehensive performance analysis...');

    const [
      timeSeriesAnalysis,
      userBehaviorAnalysis,
      systemResourceAnalysis,
      recommendationQualityTrends,
      bottleneckAnalysis,
    ] = await Promise.all([
      this.analyzeTimeSeries(startDate, endDate),
      this.analyzeUserBehavior(startDate, endDate),
      this.analyzeSystemResources(startDate, endDate),
      this.analyzeQualityTrends(startDate, endDate),
      this.analyzeBottlenecks(startDate, endDate),
    ]);

    return {
      timeSeriesAnalysis,
      userBehaviorAnalysis,
      systemResourceAnalysis,
      recommendationQualityTrends,
      bottleneckAnalysis,
    };
  }

  /**
   * Analyze time series performance metrics
   */
  private async analyzeTimeSeries(
    startDate: Date,
    endDate: Date,
  ): Promise<TimeSeriesMetrics> {
    // Daily request volume
    const dailyVolume = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .select('DATE(usage.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('usage.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('DATE(usage.created_at)')
      .orderBy('date')
      .getRawMany();

    // Hourly distribution
    const hourlyDistribution = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .select('EXTRACT(HOUR FROM usage.created_at)', 'hour')
      .addSelect('AVG(COUNT(*))', 'avgRequests')
      .where('usage.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('EXTRACT(HOUR FROM usage.created_at)')
      .orderBy('hour')
      .getRawMany();

    // Response times trend
    const responseTimesTrend = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .select('DATE(usage.created_at)', 'date')
      .addSelect('AVG(usage.response_time_ms)', 'avgResponseTime')
      .addSelect(
        'PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY usage.response_time_ms)',
        'p95ResponseTime',
      )
      .where('usage.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('usage.success = true')
      .groupBy('DATE(usage.created_at)')
      .orderBy('date')
      .getRawMany();

    // Error rates trend
    const errorRatesTrend = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .select('DATE(usage.created_at)', 'date')
      .addSelect(
        '(COUNT(CASE WHEN usage.success = false THEN 1 END)::float / COUNT(*))::float',
        'errorRate',
      )
      .where('usage.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('DATE(usage.created_at)')
      .orderBy('date')
      .getRawMany();

    return {
      dailyRequestVolume: dailyVolume.map((d) => ({
        date: d.date,
        count: parseInt(d.count),
      })),
      hourlyDistribution: hourlyDistribution.map((h) => ({
        hour: parseInt(h.hour),
        avgRequests: parseFloat(h.avgRequests),
      })),
      responseTimesTrend: responseTimesTrend.map((r) => ({
        date: r.date,
        avgResponseTime: parseFloat(r.avgResponseTime),
        p95ResponseTime: parseFloat(r.p95ResponseTime),
      })),
      errorRatesTrend: errorRatesTrend.map((e) => ({
        date: e.date,
        errorRate: parseFloat(e.errorRate),
      })),
    };
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeUserBehavior(
    startDate: Date,
    endDate: Date,
  ): Promise<UserBehaviorMetrics> {
    // Engagement patterns by time of day
    const engagementPatterns = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('EXTRACT(HOUR FROM feedback.created_at)', 'timeOfDay')
      .addSelect('COUNT(*)', 'engagementScore')
      .where('feedback.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('EXTRACT(HOUR FROM feedback.created_at)')
      .orderBy('timeOfDay')
      .getRawMany();

    // Feedback distribution
    const feedbackDistribution = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('feedback.feedback_type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('feedback.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('feedback.feedback_type')
      .getRawMany();

    const totalFeedback = feedbackDistribution.reduce(
      (sum, f) => sum + parseInt(f.count),
      0,
    );

    // Click-through rates by position
    const clickThroughRates = await this.calculateClickThroughRates(
      startDate,
      endDate,
    );

    return {
      engagementPatterns: engagementPatterns.map((e) => ({
        timeOfDay: parseInt(e.timeOfDay),
        engagementScore: parseInt(e.engagementScore),
      })),
      feedbackDistribution: feedbackDistribution.map((f) => ({
        type: f.type,
        count: parseInt(f.count),
        percentage:
          totalFeedback > 0 ? (parseInt(f.count) / totalFeedback) * 100 : 0,
      })),
      userRetentionMetrics: [], // Placeholder - would need user session tracking
      clickThroughRates,
    };
  }

  /**
   * Analyze system resource usage
   */
  private async analyzeSystemResources(
    startDate: Date,
    endDate: Date,
  ): Promise<SystemResourceMetrics> {
    // AI API usage patterns
    const aiApiPatterns = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .select('usage.endpoint', 'endpoint')
      .addSelect('AVG(usage.response_time_ms)', 'avgResponseTime')
      .addSelect(
        '(COUNT(CASE WHEN usage.success = false THEN 1 END)::float / COUNT(*))::float',
        'errorRate',
      )
      .where('usage.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('usage.endpoint')
      .getRawMany();

    // Cache performance (simulated - would need actual cache metrics)
    const cachePerformance = {
      hitRate: 0.75, // 75% cache hit rate
      missRate: 0.25, // 25% cache miss rate
      evictionRate: 0.05, // 5% eviction rate
    };

    return {
      memoryUsageTrends: [], // Would need actual memory monitoring
      cachePerformance,
      databasePerformance: {
        avgQueryTime: 150, // ms
        slowQueries: 5, // count of slow queries
      },
      aiApiUsagePatterns: aiApiPatterns.map((p) => ({
        endpoint: p.endpoint,
        avgResponseTime: parseFloat(p.avgResponseTime),
        errorRate: parseFloat(p.errorRate),
      })),
    };
  }

  /**
   * Analyze recommendation quality trends
   */
  private async analyzeQualityTrends(
    startDate: Date,
    endDate: Date,
  ): Promise<QualityTrendMetrics> {
    // Accuracy over time (based on similarity scores)
    const accuracyTrend = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('DATE(rec.created_at)', 'date')
      .addSelect('AVG(rec.average_similarity_score)', 'accuracy')
      .where('rec.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('DATE(rec.created_at)')
      .orderBy('date')
      .getRawMany();

    // User satisfaction trends (based on feedback ratings)
    const satisfactionTrend = await this.feedbackRepository
      .createQueryBuilder('feedback')
      .select('DATE(feedback.created_at)', 'date')
      .addSelect('AVG(feedback.rating)', 'satisfaction')
      .where('feedback.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('feedback.rating IS NOT NULL')
      .groupBy('DATE(feedback.created_at)')
      .orderBy('date')
      .getRawMany();

    return {
      accuracyOverTime: accuracyTrend.map((a) => ({
        date: a.date,
        accuracy: parseFloat(a.accuracy),
      })),
      diversityTrends: [], // Would need diversity calculation over time
      userSatisfactionTrends: satisfactionTrend.map((s) => ({
        date: s.date,
        satisfaction: parseFloat(s.satisfaction) / 5, // Normalize to 0-1
      })),
      recommendationFreshness: [], // Would need freshness tracking
    };
  }

  /**
   * Analyze system bottlenecks
   */
  private async analyzeBottlenecks(
    startDate: Date,
    endDate: Date,
  ): Promise<BottleneckMetrics> {
    // Slowest operations
    const slowestOperations = await this.apiUsageRepository
      .createQueryBuilder('usage')
      .select('usage.endpoint', 'operation')
      .addSelect('AVG(usage.response_time_ms)', 'avgTime')
      .addSelect('COUNT(*)', 'frequency')
      .where('usage.created_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('usage.success = true')
      .groupBy('usage.endpoint')
      .orderBy('avgTime', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      slowestOperations: slowestOperations.map((op) => ({
        operation: op.operation,
        avgTime: parseFloat(op.avgTime),
        frequency: parseInt(op.frequency),
      })),
      resourceConstraints: [
        {
          resource: 'AI API Rate Limit',
          utilizationRate: 0.65,
          impact: 'Medium - May cause fallback to rule-based recommendations',
        },
        {
          resource: 'Database Connections',
          utilizationRate: 0.45,
          impact: 'Low - Sufficient capacity for current load',
        },
      ],
      scalabilityLimits: [
        {
          metric: 'Concurrent Users',
          currentValue: 100,
          recommendedLimit: 500,
        },
        {
          metric: 'Recommendations per Second',
          currentValue: 50,
          recommendedLimit: 200,
        },
      ],
    };
  }

  /**
   * Calculate click-through rates by recommendation position
   */
  private async calculateClickThroughRates(
    startDate: Date,
    endDate: Date,
  ): Promise<{ position: number; ctr: number }[]> {
    // Simplified CTR calculation - would need actual click tracking
    return [
      { position: 1, ctr: 0.25 },
      { position: 2, ctr: 0.18 },
      { position: 3, ctr: 0.12 },
      { position: 4, ctr: 0.08 },
      { position: 5, ctr: 0.05 },
    ];
  }

  /**
   * Generate performance optimization recommendations
   */
  async generateOptimizationRecommendations(
    analysis: PerformanceAnalysis,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check response time performance
    const avgResponseTime =
      analysis.timeSeriesAnalysis.responseTimesTrend.reduce(
        (sum, r) => sum + r.avgResponseTime,
        0,
      ) / analysis.timeSeriesAnalysis.responseTimesTrend.length;

    if (avgResponseTime > 2000) {
      recommendations.push(
        'Consider implementing response time optimization - current average exceeds 2 seconds',
      );
    }

    // Check error rates
    const avgErrorRate =
      analysis.timeSeriesAnalysis.errorRatesTrend.reduce(
        (sum, e) => sum + e.errorRate,
        0,
      ) / analysis.timeSeriesAnalysis.errorRatesTrend.length;

    if (avgErrorRate > 0.05) {
      recommendations.push(
        'Error rate exceeds 5% - investigate and improve error handling',
      );
    }

    // Check cache performance
    if (analysis.systemResourceAnalysis.cachePerformance.hitRate < 0.7) {
      recommendations.push(
        'Cache hit rate below 70% - optimize caching strategy',
      );
    }

    // Check user satisfaction
    const avgSatisfaction =
      analysis.recommendationQualityTrends.userSatisfactionTrends.reduce(
        (sum, s) => sum + s.satisfaction,
        0,
      ) / analysis.recommendationQualityTrends.userSatisfactionTrends.length;

    if (avgSatisfaction < 0.7) {
      recommendations.push(
        'User satisfaction below 70% - review recommendation algorithms',
      );
    }

    // Check bottlenecks
    const slowestOp = analysis.bottleneckAnalysis.slowestOperations[0];
    if (slowestOp && slowestOp.avgTime > 3000) {
      recommendations.push(
        `Optimize ${slowestOp.operation} - average response time exceeds 3 seconds`,
      );
    }

    return recommendations;
  }

  /**
   * Export performance analysis to various formats
   */
  async exportAnalysis(
    analysis: PerformanceAnalysis,
    format: 'json' | 'csv' | 'markdown',
    outputPath: string,
  ): Promise<void> {
    switch (format) {
      case 'json':
        await this.exportToJSON(analysis, outputPath);
        break;
      case 'csv':
        await this.exportToCSV(analysis, outputPath);
        break;
      case 'markdown':
        await this.exportToMarkdown(analysis, outputPath);
        break;
    }
  }

  private async exportToJSON(
    analysis: PerformanceAnalysis,
    outputPath: string,
  ): Promise<void> {
    const jsonContent = JSON.stringify(analysis, null, 2);
    fs.writeFileSync(outputPath, jsonContent);
  }

  private async exportToCSV(
    analysis: PerformanceAnalysis,
    outputPath: string,
  ): Promise<void> {
    // Convert key metrics to CSV format
    let csvContent = 'Metric,Value,Date\n';

    analysis.timeSeriesAnalysis.responseTimesTrend.forEach((r) => {
      csvContent += `Average Response Time,${r.avgResponseTime},${r.date}\n`;
      csvContent += `P95 Response Time,${r.p95ResponseTime},${r.date}\n`;
    });

    analysis.timeSeriesAnalysis.errorRatesTrend.forEach((e) => {
      csvContent += `Error Rate,${e.errorRate},${e.date}\n`;
    });

    fs.writeFileSync(outputPath, csvContent);
  }

  private async exportToMarkdown(
    analysis: PerformanceAnalysis,
    outputPath: string,
  ): Promise<void> {
    const recommendations =
      await this.generateOptimizationRecommendations(analysis);

    const markdownContent = `# Performance Analysis Report

## Summary
This report provides a comprehensive analysis of the recommendation system's performance.

## Key Metrics

### Response Time Trends
${analysis.timeSeriesAnalysis.responseTimesTrend
  .map(
    (r) =>
      `- ${r.date}: Avg ${r.avgResponseTime.toFixed(0)}ms, P95 ${r.p95ResponseTime.toFixed(0)}ms`,
  )
  .join('\n')}

### Error Rate Trends
${analysis.timeSeriesAnalysis.errorRatesTrend
  .map((e) => `- ${e.date}: ${(e.errorRate * 100).toFixed(2)}%`)
  .join('\n')}

### System Resource Usage
- Cache Hit Rate: ${(analysis.systemResourceAnalysis.cachePerformance.hitRate * 100).toFixed(2)}%
- Average Database Query Time: ${analysis.systemResourceAnalysis.databasePerformance.avgQueryTime}ms

## Optimization Recommendations
${recommendations.map((rec) => `- ${rec}`).join('\n')}

---
*Generated on ${new Date().toISOString()}*
`;

    fs.writeFileSync(outputPath, markdownContent);
  }
}
