# Recommendation System Benchmarking

This directory contains comprehensive benchmarking and performance analysis tools for the AI-powered recommendation system.

## Overview

The benchmarking system provides:

- **Accuracy Metrics**: Precision@K, Recall@K, F1-Score, MAP, NDCG
- **Relevance Metrics**: Similarity scores, user satisfaction, click-through rates
- **Performance Metrics**: Response times, throughput, cache hit rates, error rates
- **Diversity Metrics**: Specialization diversity, catalog coverage, intra-list diversity
- **Coverage Metrics**: User coverage, project coverage, long-tail coverage
- **Load Testing**: Concurrent user scenarios with performance measurement
- **A/B Testing**: Framework for comparing recommendation algorithms
- **Performance Analysis**: Time-series analysis, bottleneck identification, optimization recommendations

## Quick Start

### 1. Seed Test Data

Before running benchmarks, ensure you have sufficient test data:

\`\`\`bash
# Seed basic recommendation test data
npm run seed:recommendations:scenarios

# Seed performance test data (medium dataset)
npm run seed:recommendations:performance

# Seed comprehensive test data
npm run seed:recommendations:all
\`\`\`

### 2. Run Benchmarks

\`\`\`bash
# Run comprehensive benchmark (all metrics)
npm run benchmark:recommendations

# Run specific benchmark categories
npm run benchmark:recommendations:accuracy
npm run benchmark:recommendations:performance

# Run with load testing
npm run benchmark:recommendations:load

# Run with A/B testing
npm run benchmark:recommendations:ab

# Run full benchmark suite
npm run benchmark:recommendations:full
\`\`\`

### 3. View Results

Benchmark results are saved to `./benchmark-results/` directory in both JSON and Markdown formats.

## Detailed Usage

### Benchmark Categories

#### Accuracy Benchmarking

Measures how well the recommendation system predicts user preferences:

- **Precision@K**: Fraction of recommended items that are relevant
- **Recall@K**: Fraction of relevant items that are recommended
- **F1-Score@K**: Harmonic mean of precision and recall
- **Mean Average Precision (MAP)**: Average precision across all users
- **NDCG@K**: Normalized Discounted Cumulative Gain

\`\`\`bash
npm run benchmark:recommendations:accuracy
\`\`\`

#### Performance Benchmarking

Measures system performance and scalability:

- **Response Times**: Average, median, P95, P99 response times
- **Throughput**: Requests per second
- **Cache Performance**: Hit rates, miss rates
- **Error Rates**: Percentage of failed requests
- **Resource Usage**: Memory, CPU, database performance

\`\`\`bash
npm run benchmark:recommendations:performance
\`\`\`

#### Load Testing

Tests system behavior under various load conditions:

\`\`\`bash
npm run benchmark:recommendations:load
\`\`\`

This runs scenarios with:

- 10 concurrent users for 30 seconds
- 25 concurrent users for 30 seconds
- 50 concurrent users for 30 seconds

#### A/B Testing

Compares different recommendation algorithms:

\`\`\`bash
npm run benchmark:recommendations:ab
\`\`\`

This compares:

- Control group: AI-powered recommendations
- Treatment group: Fallback rule-based recommendations

### Custom Benchmark Configuration

You can customize benchmark runs with command-line options:

\`\`\`bash
# Run only accuracy benchmarks
npm run benchmark:recommendations -- --accuracy-only

# Run only performance benchmarks
npm run benchmark:recommendations -- --performance-only

# Specify output format
npm run benchmark:recommendations -- --output-format json

# Specify output directory
npm run benchmark:recommendations -- --output-dir ./my-results

# Run with load testing
npm run benchmark:recommendations -- --load-test

# Run with A/B testing
npm run benchmark:recommendations -- --ab-test
\`\`\`

### Performance Analysis

The system includes advanced performance analysis capabilities:

\`\`\`typescript
import { PerformanceAnalyzerService } from './performance-analyzer.service';

// Analyze performance over time period
const analysis = await analyzerService.analyzePerformance(
  new Date('2024-01-01'),
  new Date('2024-01-31'),
);

// Generate optimization recommendations
const recommendations =
  await analyzerService.generateOptimizationRecommendations(analysis);

// Export analysis results
await analyzerService.exportAnalysis(
  analysis,
  'markdown',
  './analysis-report.md',
);
\`\`\`

## Benchmark Metrics Explained

### Accuracy Metrics

- **Precision@K**: Of the K recommendations shown, how many were relevant?
  - Formula: `relevant_recommended / K`
  - Higher is better (0-1 scale)

- **Recall@K**: Of all relevant items, how many were in the top K recommendations?
  - Formula: `relevant_recommended / total_relevant`
  - Higher is better (0-1 scale)

- **F1-Score@K**: Harmonic mean of precision and recall
  - Formula: `2 * (precision * recall) / (precision + recall)`
  - Higher is better (0-1 scale)

- **Mean Average Precision (MAP)**: Average precision across all users
  - Considers ranking order of recommendations
  - Higher is better (0-1 scale)

- **NDCG@K**: Normalized Discounted Cumulative Gain
  - Considers both relevance and ranking position
  - Higher is better (0-1 scale)

### Performance Metrics

- **Response Time**: Time to generate recommendations
  - Average, median, P95, P99 percentiles
  - Lower is better (milliseconds)

- **Throughput**: Recommendations generated per second
  - Higher is better (req/s)

- **Cache Hit Rate**: Percentage of requests served from cache
  - Higher is better (0-100%)

- **Error Rate**: Percentage of failed requests
  - Lower is better (0-100%)

### Diversity Metrics

- **Specialization Diversity**: Variety of specializations in recommendations
  - Higher indicates better diversity (0-1 scale)

- **Catalog Coverage**: Percentage of available projects recommended
  - Higher indicates better coverage (0-1 scale)

- **Intra-List Diversity**: Average dissimilarity between recommended items
  - Higher indicates more diverse recommendations (0-1 scale)

## Interpreting Results

### Good Performance Indicators

- **Accuracy**: MAP > 0.7, Precision@5 > 0.6
- **Performance**: Response time < 2s, Error rate < 5%
- **Diversity**: Specialization diversity > 0.6, Catalog coverage > 0.5
- **Cache**: Hit rate > 70%

### Warning Signs

- **Accuracy**: MAP < 0.5, Precision@5 < 0.4
- **Performance**: Response time > 5s, Error rate > 10%
- **Diversity**: Catalog coverage < 0.3
- **Cache**: Hit rate < 50%

### Optimization Recommendations

The system automatically generates optimization recommendations based on benchmark results:

- **High Response Times**: Implement caching, optimize algorithms
- **Low Accuracy**: Tune similarity algorithms, improve training data
- **Poor Diversity**: Implement diversity boosting, explore-exploit strategies
- **High Error Rates**: Improve error handling, add circuit breakers

## Continuous Monitoring

### Automated Benchmarking

Set up automated benchmarking in your CI/CD pipeline:

\`\`\`yaml
# .github/workflows/benchmark.yml
name: Recommendation Benchmark
on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday at 2 AM
  workflow_dispatch:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Seed test data
        run: npm run seed:recommendations:scenarios
      - name: Run benchmarks
        run: npm run benchmark:recommendations
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: benchmark-results/
\`\`\`

### Performance Monitoring

Monitor key metrics in production:

\`\`\`typescript
// Monitor recommendation performance
const metrics = await benchmarkService.measurePerformance();

// Alert if performance degrades
if (metrics.averageResponseTime > 3000) {
  await alertService.sendAlert('High response time detected');
}

if (metrics.errorRate > 0.1) {
  await alertService.sendAlert('High error rate detected');
}
\`\`\`

## Troubleshooting

### Common Issues

1. **No test data**: Run `npm run seed:recommendations:scenarios` first
2. **Out of memory**: Reduce batch sizes in load testing
3. **Database timeouts**: Increase connection pool size
4. **AI API rate limits**: Implement proper rate limiting and fallbacks

### Debug Mode

Enable debug logging for detailed benchmark execution:

\`\`\`bash
DEBUG=benchmark:* npm run benchmark:recommendations
\`\`\`

### Performance Profiling

Use Node.js profiling tools for detailed analysis:

\`\`\`bash
node --prof src/test/performance/benchmark-runner.ts
node --prof-process isolate-*.log > profile.txt
\`\`\`

## Contributing

When adding new benchmark metrics:

1. Add metric calculation to `RecommendationBenchmarkService`
2. Add corresponding tests in `recommendation-benchmark.spec.ts`
3. Update report generation in `generateBenchmarkReport()`
4. Document the new metric in this README

## References

- [Information Retrieval Evaluation Metrics](<https://en.wikipedia.org/wiki/Evaluation_measures_(information_retrieval)>)
- [Recommender System Evaluation](https://surprise.readthedocs.io/en/stable/accuracy.html)
- [A/B Testing Best Practices](https://blog.statsig.com/ab-testing-best-practices)
- [Performance Testing Guidelines](https://martinfowler.com/articles/practical-test-pyramid.html)
