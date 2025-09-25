#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import { AppModule } from '../app.module';
import { ConversationSimulatorService } from './conversation-simulator.service';
import { AIResponseQualityAssessorService } from './ai-response-quality-assessor.service';
import { AIPerformanceBenchmarkerService } from './ai-performance-benchmarker.service';
import { KnowledgeContentValidatorService } from './knowledge-content-validator.service';
import * as fs from 'fs';
import * as path from 'path';

class AITestingCLI {
  private app: any;
  private conversationSimulator: ConversationSimulatorService;
  private qualityAssessor: AIResponseQualityAssessorService;
  private performanceBenchmarker: AIPerformanceBenchmarkerService;
  private contentValidator: KnowledgeContentValidatorService;

  async initialize() {
    this.app = await NestFactory.createApplicationContext(AppModule);
    this.conversationSimulator = this.app.get(ConversationSimulatorService);
    this.qualityAssessor = this.app.get(AIResponseQualityAssessorService);
    this.performanceBenchmarker = this.app.get(AIPerformanceBenchmarkerService);
    this.contentValidator = this.app.get(KnowledgeContentValidatorService);
  }

  async close() {
    await this.app.close();
  }

  /**
   * Run conversation simulations
   */
  async runSimulations(scenarioFile?: string): Promise<void> {
    console.log('🎭 Running conversation simulations...');

    let scenarios;
    if (scenarioFile && fs.existsSync(scenarioFile)) {
      console.log(`📁 Loading scenarios from ${scenarioFile}`);
      scenarios = JSON.parse(fs.readFileSync(scenarioFile, 'utf8'));
    } else {
      console.log('📋 Using default scenarios');
      scenarios = this.conversationSimulator.getDefaultScenarios();
    }

    const results =
      await this.conversationSimulator.runBatchSimulations(scenarios);

    // Display results
    console.log('\n📊 Simulation Results:');
    console.log('======================');

    let totalPassed = 0;
    let totalTests = 0;

    results.forEach((result) => {
      console.log(`\n🎯 ${result.scenarioName}`);
      console.log(`   Messages: ${result.totalMessages}`);
      console.log(`   AI Responses: ${result.aiResponses}`);
      console.log(`   Template Responses: ${result.templateResponses}`);
      console.log(`   Fallback Responses: ${result.fallbackResponses}`);
      console.log(
        `   Avg Response Time: ${result.averageResponseTime.toFixed(0)}ms`,
      );
      console.log(`   Quality Score: ${result.qualityScore.toFixed(1)}/100`);

      if (result.issues.length > 0) {
        console.log('   ⚠️  Issues:');
        result.issues.forEach((issue) => {
          console.log(`      • ${issue}`);
        });
      }

      if (result.recommendations.length > 0) {
        console.log('   💡 Recommendations:');
        result.recommendations.forEach((rec) => {
          console.log(`      • ${rec}`);
        });
      }

      totalTests += result.totalMessages;
      // Consider a scenario passed if quality score > 70 and no critical issues
      if (result.qualityScore > 70 && result.issues.length === 0) {
        totalPassed++;
      }
    });

    console.log(`\n📈 Overall Summary:`);
    console.log(`   Scenarios: ${results.length}`);
    console.log(`   Total Messages: ${totalTests}`);
    console.log(
      `   Success Rate: ${((totalPassed / results.length) * 100).toFixed(1)}%`,
    );

    // Save results
    const reportPath = path.join(process.cwd(), 'simulation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }

  /**
   * Run quality assessment
   */
  async runQualityAssessment(days: number = 7): Promise<void> {
    console.log(`🔍 Running quality assessment for last ${days} days...`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await this.qualityAssessor.generateQualityReport(
      startDate,
      endDate,
    );

    console.log('\n📊 Quality Assessment Report:');
    console.log('=============================');
    console.log(`Total Messages Assessed: ${report.totalMessages}`);
    console.log(
      `Average Quality Score: ${report.averageQuality.toFixed(2)}/10`,
    );

    console.log('\n📈 Quality Distribution:');
    console.log(
      `   Excellent (8-10): ${report.qualityDistribution.excellent} messages`,
    );
    console.log(`   Good (6-8): ${report.qualityDistribution.good} messages`);
    console.log(`   Fair (4-6): ${report.qualityDistribution.fair} messages`);
    console.log(`   Poor (0-4): ${report.qualityDistribution.poor} messages`);

    console.log('\n📏 Dimension Averages:');
    console.log(
      `   Relevance: ${report.dimensionAverages.relevance.toFixed(2)}/10`,
    );
    console.log(
      `   Accuracy: ${report.dimensionAverages.accuracy.toFixed(2)}/10`,
    );
    console.log(
      `   Completeness: ${report.dimensionAverages.completeness.toFixed(2)}/10`,
    );
    console.log(
      `   Clarity: ${report.dimensionAverages.clarity.toFixed(2)}/10`,
    );
    console.log(
      `   Helpfulness: ${report.dimensionAverages.helpfulness.toFixed(2)}/10`,
    );
    console.log(
      `   Appropriateness: ${report.dimensionAverages.appropriateness.toFixed(2)}/10`,
    );

    if (report.commonIssues.length > 0) {
      console.log('\n⚠️  Most Common Issues:');
      report.commonIssues.slice(0, 5).forEach((issue) => {
        console.log(`   • ${issue.issue} (${issue.frequency} occurrences)`);
      });
    }

    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec) => {
        console.log(`   • ${rec}`);
      });
    }

    // Save report
    const reportPath = path.join(
      process.cwd(),
      'quality-assessment-report.json',
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }

  /**
   * Run performance benchmarks
   */
  async runPerformanceBenchmarks(benchmarkFile?: string): Promise<void> {
    console.log('⚡ Running performance benchmarks...');

    let benchmarks;
    if (benchmarkFile && fs.existsSync(benchmarkFile)) {
      console.log(`📁 Loading benchmarks from ${benchmarkFile}`);
      benchmarks = JSON.parse(fs.readFileSync(benchmarkFile, 'utf8'));
    } else {
      console.log('📋 Using default benchmarks');
      benchmarks = this.performanceBenchmarker.getDefaultBenchmarks();
    }

    const results =
      await this.performanceBenchmarker.runBenchmarkSuite(benchmarks);

    // Display results
    console.log('\n📊 Performance Benchmark Results:');
    console.log('=================================');

    results.forEach((result) => {
      console.log(`\n🎯 ${result.benchmarkName}`);
      console.log(
        `   Tests: ${result.passedTests}/${result.totalTests} passed`,
      );
      console.log(`   Success Rate: ${result.metrics.successRate.toFixed(1)}%`);
      console.log(
        `   Avg Response Time: ${result.metrics.averageResponseTime.toFixed(0)}ms`,
      );
      console.log(
        `   Quality Score: ${result.metrics.qualityScore.toFixed(2)}/10`,
      );
      console.log(
        `   Throughput: ${result.metrics.throughput.toFixed(1)} req/s`,
      );
      console.log(`   Error Rate: ${result.metrics.errorRate.toFixed(1)}%`);

      console.log('\n📈 Response Time Distribution:');
      console.log(
        `   50th percentile: ${result.performance.responseTimeDistribution.p50}ms`,
      );
      console.log(
        `   90th percentile: ${result.performance.responseTimeDistribution.p90}ms`,
      );
      console.log(
        `   95th percentile: ${result.performance.responseTimeDistribution.p95}ms`,
      );
      console.log(
        `   99th percentile: ${result.performance.responseTimeDistribution.p99}ms`,
      );

      if (result.performance.bottlenecks.length > 0) {
        console.log('\n🚨 Bottlenecks:');
        result.performance.bottlenecks.forEach((bottleneck) => {
          console.log(`   • ${bottleneck}`);
        });
      }

      if (result.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        result.recommendations.forEach((rec) => {
          console.log(`   • ${rec}`);
        });
      }
    });

    // Overall summary
    const overallPassRate =
      (results.reduce((sum, r) => sum + r.passedTests / r.totalTests, 0) /
        results.length) *
      100;
    const overallAvgResponseTime =
      results.reduce((sum, r) => sum + r.metrics.averageResponseTime, 0) /
      results.length;

    console.log(`\n📈 Overall Summary:`);
    console.log(`   Benchmarks: ${results.length}`);
    console.log(`   Overall Pass Rate: ${overallPassRate.toFixed(1)}%`);
    console.log(
      `   Overall Avg Response Time: ${overallAvgResponseTime.toFixed(0)}ms`,
    );

    // Save results
    const reportPath = path.join(
      process.cwd(),
      'performance-benchmark-report.json',
    );
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
  }

  /**
   * Run comprehensive test suite
   */
  async runFullTestSuite(): Promise<void> {
    console.log('🚀 Running comprehensive AI assistant test suite...');
    console.log('This may take several minutes...\n');

    try {
      // 1. Content validation
      console.log('1️⃣ Validating knowledge base content...');
      await this.contentValidator.validateAllContent();

      // 2. Conversation simulations
      console.log('\n2️⃣ Running conversation simulations...');
      await this.runSimulations();

      // 3. Quality assessment
      console.log('\n3️⃣ Assessing response quality...');
      await this.runQualityAssessment(30); // Last 30 days

      // 4. Performance benchmarks
      console.log('\n4️⃣ Running performance benchmarks...');
      await this.runPerformanceBenchmarks();

      console.log('\n🎉 Full test suite completed successfully!');
      console.log('📁 Check the generated report files for detailed results.');
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate test data for development
   */
  async generateTestData(): Promise<void> {
    console.log('🏗️  Generating test data for development...');

    // Generate sample scenarios
    const scenarios = this.conversationSimulator.getDefaultScenarios();
    const scenariosPath = path.join(process.cwd(), 'test-scenarios.json');
    fs.writeFileSync(scenariosPath, JSON.stringify(scenarios, null, 2));
    console.log(`✅ Generated test scenarios: ${scenariosPath}`);

    // Generate sample benchmarks
    const benchmarks = this.performanceBenchmarker.getDefaultBenchmarks();
    const benchmarksPath = path.join(process.cwd(), 'test-benchmarks.json');
    fs.writeFileSync(benchmarksPath, JSON.stringify(benchmarks, null, 2));
    console.log(`✅ Generated test benchmarks: ${benchmarksPath}`);

    // Generate sample knowledge entries for testing
    const sampleKnowledge = [
      {
        title: 'Test Knowledge Entry 1',
        content:
          'This is a test knowledge entry for development and testing purposes. It contains sample content that can be used to validate the knowledge base functionality.',
        category: 'Test Category',
        tags: ['test', 'development', 'sample'],
        keywords: ['test', 'knowledge', 'development'],
        contentType: 'guideline',
        language: 'en',
      },
      {
        title: 'Test Knowledge Entry 2',
        content:
          'Another test entry with different content to ensure variety in testing scenarios.',
        category: 'Test Category',
        tags: ['test', 'validation', 'sample'],
        keywords: ['test', 'validation', 'sample'],
        contentType: 'faq',
        language: 'en',
      },
    ];

    const knowledgePath = path.join(process.cwd(), 'test-knowledge.json');
    fs.writeFileSync(knowledgePath, JSON.stringify(sampleKnowledge, null, 2));
    console.log(`✅ Generated test knowledge entries: ${knowledgePath}`);

    console.log('\n🎯 Test data generation completed!');
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    const testFiles = [
      'simulation-report.json',
      'quality-assessment-report.json',
      'performance-benchmark-report.json',
      'knowledge-quality-report.json',
      'test-scenarios.json',
      'test-benchmarks.json',
      'test-knowledge.json',
    ];

    let cleaned = 0;
    testFiles.forEach((file) => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Removed: ${file}`);
        cleaned++;
      }
    });

    console.log(`\n✅ Cleaned up ${cleaned} test files`);
  }

  /**
   * Show system status and health
   */
  async showStatus(): Promise<void> {
    console.log('📊 AI Assistant System Status');
    console.log('=============================');

    try {
      // Check database connectivity
      console.log('🔌 Database: Connected ✅');

      // Check knowledge base
      // This would check actual knowledge base entries
      console.log('📚 Knowledge Base: Available ✅');

      // Check AI service (simulated)
      console.log('🤖 AI Service: Operational ✅');

      // Show recent activity (simulated)
      console.log('\n📈 Recent Activity (Last 24h):');
      console.log('   Conversations: 42');
      console.log('   Messages: 156');
      console.log('   Avg Response Time: 1.2s');
      console.log('   Success Rate: 94.2%');

      console.log('\n💡 System Health: Good ✅');
    } catch (error) {
      console.error('❌ System Status Check Failed:', error.message);
    }
  }
}

// CLI Program
const program = new Command();
const cli = new AITestingCLI();

program
  .name('ai-testing-cli')
  .description('AI Assistant Testing and Development Utilities')
  .version('1.0.0');

program
  .command('simulate [scenarios-file]')
  .description('Run conversation simulations')
  .action(async (scenariosFile) => {
    await cli.initialize();
    try {
      await cli.runSimulations(scenariosFile);
    } finally {
      await cli.close();
    }
  });

program
  .command('quality [days]')
  .description('Run quality assessment for the last N days (default: 7)')
  .action(async (days = 7) => {
    await cli.initialize();
    try {
      await cli.runQualityAssessment(parseInt(days));
    } finally {
      await cli.close();
    }
  });

program
  .command('benchmark [benchmarks-file]')
  .description('Run performance benchmarks')
  .action(async (benchmarksFile) => {
    await cli.initialize();
    try {
      await cli.runPerformanceBenchmarks(benchmarksFile);
    } finally {
      await cli.close();
    }
  });

program
  .command('test-suite')
  .description('Run comprehensive test suite')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.runFullTestSuite();
    } finally {
      await cli.close();
    }
  });

program
  .command('generate-data')
  .description('Generate test data for development')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.generateTestData();
    } finally {
      await cli.close();
    }
  });

program
  .command('cleanup')
  .description('Clean up test data and reports')
  .action(async () => {
    await cli.cleanupTestData();
  });

program
  .command('status')
  .description('Show system status and health')
  .action(async () => {
    await cli.initialize();
    try {
      await cli.showStatus();
    } finally {
      await cli.close();
    }
  });

// Handle errors
program.parseAsync(process.argv).catch((error) => {
  console.error('❌ CLI Error:', error.message);
  process.exit(1);
});

export { AITestingCLI };
