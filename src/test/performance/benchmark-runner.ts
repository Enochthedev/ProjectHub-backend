#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { RecommendationBenchmarkService } from './recommendation-benchmark.service';
import { RecommendationSeederService } from '../utils/recommendation-seeder.service';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkConfig {
  includeAccuracy: boolean;
  includeRelevance: boolean;
  includePerformance: boolean;
  includeDiversity: boolean;
  includeCoverage: boolean;
  includeLoadTest: boolean;
  includeABTest: boolean;
  outputFormat: 'json' | 'markdown' | 'both';
  outputDir: string;
}

interface BenchmarkResults {
  timestamp: string;
  config: BenchmarkConfig;
  metrics?: any;
  loadTestResults?: any[];
  abTestResults?: any;
  executionTime: number;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    memory: NodeJS.MemoryUsage;
  };
}

async function parseArgs(): Promise<BenchmarkConfig> {
  const args = process.argv.slice(2);
  const config: BenchmarkConfig = {
    includeAccuracy: true,
    includeRelevance: true,
    includePerformance: true,
    includeDiversity: true,
    includeCoverage: true,
    includeLoadTest: false,
    includeABTest: false,
    outputFormat: 'both',
    outputDir: './benchmark-results',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--accuracy-only':
        config.includeAccuracy = true;
        config.includeRelevance = false;
        config.includePerformance = false;
        config.includeDiversity = false;
        config.includeCoverage = false;
        break;
      case '--performance-only':
        config.includeAccuracy = false;
        config.includeRelevance = false;
        config.includePerformance = true;
        config.includeDiversity = false;
        config.includeCoverage = false;
        break;
      case '--load-test':
        config.includeLoadTest = true;
        break;
      case '--ab-test':
        config.includeABTest = true;
        break;
      case '--output-format':
        config.outputFormat = args[++i] as 'json' | 'markdown' | 'both';
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
    }
  }

  return config;
}

function printHelp(): void {
  console.log(`
Recommendation System Benchmark Runner

Usage: npm run benchmark:recommendations [options]

Options:
  --accuracy-only      Run only accuracy benchmarks
  --performance-only   Run only performance benchmarks
  --load-test         Include load testing scenarios
  --ab-test           Include A/B testing framework
  --output-format     Output format (json|markdown|both) [default: both]
  --output-dir        Output directory [default: ./benchmark-results]
  --help              Show this help message

Examples:
  npm run benchmark:recommendations
  npm run benchmark:recommendations --accuracy-only
  npm run benchmark:recommendations --load-test --output-format json
  npm run benchmark:recommendations --ab-test --output-dir ./results
`);
}

async function ensureOutputDirectory(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function saveResults(
  results: BenchmarkResults,
  config: BenchmarkConfig,
): Promise<void> {
  await ensureOutputDirectory(config.outputDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFilename = `benchmark-${timestamp}`;

  if (config.outputFormat === 'json' || config.outputFormat === 'both') {
    const jsonPath = path.join(config.outputDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
    console.log(`📄 JSON results saved to: ${jsonPath}`);
  }

  if (config.outputFormat === 'markdown' || config.outputFormat === 'both') {
    const markdownPath = path.join(config.outputDir, `${baseFilename}.md`);
    const markdownContent = await generateMarkdownReport(results);
    fs.writeFileSync(markdownPath, markdownContent);
    console.log(`📄 Markdown report saved to: ${markdownPath}`);
  }
}

async function generateMarkdownReport(
  results: BenchmarkResults,
): Promise<string> {
  const { metrics, loadTestResults, abTestResults, executionTime, systemInfo } =
    results;

  let report = `# Recommendation System Benchmark Report

**Generated:** ${results.timestamp}
**Execution Time:** ${(executionTime / 1000).toFixed(2)} seconds
**Node Version:** ${systemInfo.nodeVersion}
**Platform:** ${systemInfo.platform}

## System Information
- **Memory Usage:** ${(systemInfo.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
- **Total Memory:** ${(systemInfo.memory.heapTotal / 1024 / 1024).toFixed(2)} MB

`;

  if (metrics) {
    report += `## Performance Metrics

### Accuracy
- **Precision@5:** ${(metrics.accuracy.precisionAtK[5] * 100).toFixed(2)}%
- **Recall@5:** ${(metrics.accuracy.recallAtK[5] * 100).toFixed(2)}%
- **F1-Score@5:** ${(metrics.accuracy.f1ScoreAtK[5] * 100).toFixed(2)}%
- **Mean Average Precision:** ${(metrics.accuracy.meanAveragePrecision * 100).toFixed(2)}%

### Relevance
- **Average Similarity Score:** ${metrics.relevance.averageSimilarityScore.toFixed(3)}
- **User Satisfaction:** ${(metrics.relevance.userSatisfactionScore * 100).toFixed(2)}%
- **Click-Through Rate:** ${(metrics.relevance.clickThroughRate * 100).toFixed(2)}%

### Performance
- **Average Response Time:** ${metrics.performance.averageResponseTime.toFixed(0)}ms
- **P95 Response Time:** ${metrics.performance.p95ResponseTime.toFixed(0)}ms
- **Throughput:** ${metrics.performance.throughputPerSecond.toFixed(2)} req/s
- **Cache Hit Rate:** ${(metrics.performance.cacheHitRate * 100).toFixed(2)}%
- **Error Rate:** ${(metrics.performance.errorRate * 100).toFixed(2)}%

### Diversity
- **Specialization Diversity:** ${(metrics.diversity.specializationDiversity * 100).toFixed(2)}%
- **Catalog Coverage:** ${(metrics.diversity.catalogCoverage * 100).toFixed(2)}%
- **Intra-List Diversity:** ${(metrics.diversity.intraListDiversity * 100).toFixed(2)}%

### Coverage
- **User Coverage:** ${(metrics.coverage.userCoverage * 100).toFixed(2)}%
- **Project Coverage:** ${(metrics.coverage.projectCoverage * 100).toFixed(2)}%
- **Long Tail Coverage:** ${(metrics.coverage.longTailCoverage * 100).toFixed(2)}%

`;
  }

  if (loadTestResults && loadTestResults.length > 0) {
    report += `## Load Test Results

| Concurrent Users | Total Requests | Success Rate | Avg Response Time | Requests/sec | Error Rate |
|------------------|----------------|--------------|-------------------|--------------|------------|
`;

    loadTestResults.forEach((result) => {
      const successRate = (
        (result.successfulRequests / result.totalRequests) *
        100
      ).toFixed(2);
      report += `| ${result.concurrentUsers} | ${result.totalRequests} | ${successRate}% | ${result.averageResponseTime.toFixed(0)}ms | ${result.requestsPerSecond.toFixed(2)} | ${(result.errorRate * 100).toFixed(2)}% |\n`;
    });

    report += '\n';
  }

  if (abTestResults) {
    report += `## A/B Test Results

- **Statistical Significance:** ${abTestResults.statisticalSignificance ? 'Yes' : 'No'}
- **Improvement:** ${(abTestResults.improvement * 100).toFixed(2)}%

### Control Group Metrics
- **Accuracy:** ${(abTestResults.controlMetrics.accuracy.meanAveragePrecision * 100).toFixed(2)}%
- **Performance:** ${abTestResults.controlMetrics.performance.averageResponseTime.toFixed(0)}ms

### Treatment Group Metrics
- **Accuracy:** ${(abTestResults.treatmentMetrics.accuracy.meanAveragePrecision * 100).toFixed(2)}%
- **Performance:** ${abTestResults.treatmentMetrics.performance.averageResponseTime.toFixed(0)}ms

`;
  }

  report += `## Summary

This benchmark report provides comprehensive insights into the recommendation system's performance across multiple dimensions. Use these metrics to identify areas for optimization and track improvements over time.

---
*Generated by Recommendation System Benchmark Runner*
`;

  return report;
}

async function main(): Promise<void> {
  try {
    const config = await parseArgs();

    console.log('🚀 Starting Recommendation System Benchmark...');
    console.log('Configuration:', config);

    const app = await NestFactory.createApplicationContext(AppModule);
    const benchmarkService = app.get(RecommendationBenchmarkService);
    const seederService = app.get(RecommendationSeederService);

    const startTime = Date.now();
    const results: BenchmarkResults = {
      timestamp: new Date().toISOString(),
      config,
      executionTime: 0,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
      },
    };

    // Ensure we have test data
    console.log('📊 Preparing test data...');
    await seederService.seedRecommendationData({
      includeRealisticScenarios: true,
      includeDiverseProfiles: true,
      includePerformanceData: false, // Don't need large dataset for benchmarking
    });

    // Run comprehensive benchmark
    if (
      config.includeAccuracy ||
      config.includeRelevance ||
      config.includePerformance ||
      config.includeDiversity ||
      config.includeCoverage
    ) {
      console.log('📈 Running comprehensive benchmark...');
      results.metrics = await benchmarkService.runComprehensiveBenchmark();
    }

    // Run load tests
    if (config.includeLoadTest) {
      console.log('🔥 Running load tests...');
      const loadTestScenarios = [
        { users: 10, duration: 30000 },
        { users: 25, duration: 30000 },
        { users: 50, duration: 30000 },
      ];
      results.loadTestResults =
        await benchmarkService.runLoadTest(loadTestScenarios);
    }

    // Run A/B tests
    if (config.includeABTest) {
      console.log('🧪 Running A/B tests...');

      // Get test users for A/B testing
      const testUsers = await app.get('UserRepository').find({
        where: { role: 'student' },
        take: 100,
      });

      const controlGroup = testUsers.slice(0, 50).map((u) => u.id);
      const treatmentGroup = testUsers.slice(50, 100).map((u) => u.id);

      results.abTestResults = await benchmarkService.runABTest(
        'AI vs Fallback Algorithm',
        controlGroup,
        treatmentGroup,
        60000, // 1 minute test
      );
    }

    results.executionTime = Date.now() - startTime;

    // Generate and save results
    console.log('💾 Saving benchmark results...');
    await saveResults(results, config);

    // Generate summary report
    if (results.metrics) {
      console.log('\n📋 Benchmark Summary:');
      const report = await benchmarkService.generateBenchmarkReport(
        results.metrics,
      );
      console.log(report);
    }

    console.log(
      `✅ Benchmark completed in ${(results.executionTime / 1000).toFixed(2)} seconds!`,
    );

    await app.close();
  } catch (error) {
    console.error('❌ Error running benchmark:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

export { main as runBenchmark };
