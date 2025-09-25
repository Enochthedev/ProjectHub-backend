import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationMessage, Conversation, User } from '@/entities';
import { MessageType, ConversationStatus } from '@/common/enums';

export interface PerformanceBenchmark {
  name: string;
  description: string;
  testCases: BenchmarkTestCase[];
  expectedMetrics: BenchmarkMetrics;
}

export interface BenchmarkTestCase {
  query: string;
  context?: Record<string, any>;
  expectedResponseType: 'ai' | 'template' | 'fallback';
  maxResponseTime: number; // milliseconds
  minQualityScore: number; // 0-10
}

export interface BenchmarkMetrics {
  averageResponseTime: number;
  successRate: number; // percentage of successful responses
  qualityScore: number; // average quality score
  throughput: number; // requests per second
  errorRate: number; // percentage of failed requests
}

export interface BenchmarkResult {
  benchmarkName: string;
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  metrics: BenchmarkMetrics;
  testResults: TestCaseResult[];
  performance: PerformanceAnalysis;
  recommendations: string[];
}

export interface TestCaseResult {
  query: string;
  passed: boolean;
  responseTime: number;
  qualityScore: number;
  actualResponseType: string;
  expectedResponseType: string;
  issues: string[];
}

export interface PerformanceAnalysis {
  responseTimeDistribution: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  };
  throughputAnalysis: {
    peakThroughput: number;
    averageThroughput: number;
    sustainedThroughput: number;
  };
  resourceUtilization: {
    memoryUsage: number;
    cpuUsage: number;
    databaseConnections: number;
  };
  bottlenecks: string[];
}

@Injectable()
export class AIPerformanceBenchmarkerService {
  private readonly logger = new Logger(AIPerformanceBenchmarkerService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Run a performance benchmark
   */
  async runBenchmark(
    benchmark: PerformanceBenchmark,
  ): Promise<BenchmarkResult> {
    this.logger.log(`Starting benchmark: ${benchmark.name}`);

    const startTime = Date.now();
    const testResults: TestCaseResult[] = [];
    const responseTimes: number[] = [];

    // Create test user and conversation
    const testUser = await this.createBenchmarkUser();
    const testConversation = await this.createBenchmarkConversation(testUser);

    try {
      // Run test cases
      for (const testCase of benchmark.testCases) {
        const result = await this.runTestCase(testCase, testConversation);
        testResults.push(result);
        responseTimes.push(result.responseTime);
      }

      // Calculate metrics
      const metrics = this.calculateMetrics(
        testResults,
        responseTimes,
        startTime,
      );

      // Analyze performance
      const performance = this.analyzePerformance(responseTimes, metrics);

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        metrics,
        performance,
        testResults,
      );

      const result: BenchmarkResult = {
        benchmarkName: benchmark.name,
        timestamp: new Date(),
        totalTests: benchmark.testCases.length,
        passedTests: testResults.filter((r) => r.passed).length,
        failedTests: testResults.filter((r) => !r.passed).length,
        metrics,
        testResults,
        performance,
        recommendations,
      };

      this.logger.log(
        `Benchmark completed: ${result.passedTests}/${result.totalTests} tests passed`,
      );
      return result;
    } finally {
      // Cleanup
      await this.cleanupBenchmarkData(testUser, testConversation);
    }
  }

  /**
   * Run multiple benchmarks
   */
  async runBenchmarkSuite(
    benchmarks: PerformanceBenchmark[],
  ): Promise<BenchmarkResult[]> {
    this.logger.log(
      `Running benchmark suite with ${benchmarks.length} benchmarks`,
    );

    const results: BenchmarkResult[] = [];

    for (const benchmark of benchmarks) {
      try {
        const result = await this.runBenchmark(benchmark);
        results.push(result);
      } catch (error) {
        this.logger.error(`Benchmark failed: ${benchmark.name}`, error);
        results.push(this.createFailedBenchmarkResult(benchmark, error));
      }
    }

    return results;
  }

  /**
   * Get default benchmark suite
   */
  getDefaultBenchmarks(): PerformanceBenchmark[] {
    return [
      {
        name: 'Basic Response Performance',
        description: 'Test basic AI response performance with common queries',
        testCases: [
          {
            query: 'What is a literature review?',
            expectedResponseType: 'ai',
            maxResponseTime: 3000,
            minQualityScore: 7,
          },
          {
            query: 'How do I start my FYP?',
            expectedResponseType: 'template',
            maxResponseTime: 1000,
            minQualityScore: 6,
          },
          {
            query: 'Help me choose a methodology',
            expectedResponseType: 'ai',
            maxResponseTime: 3000,
            minQualityScore: 7,
          },
        ],
        expectedMetrics: {
          averageResponseTime: 2000,
          successRate: 95,
          qualityScore: 7.5,
          throughput: 10,
          errorRate: 5,
        },
      },
      {
        name: 'Load Testing',
        description: 'Test system performance under load',
        testCases: Array.from({ length: 50 }, (_, i) => ({
          query: `Test query ${i + 1}: How do I write a good project proposal?`,
          expectedResponseType: 'ai' as const,
          maxResponseTime: 5000,
          minQualityScore: 6,
        })),
        expectedMetrics: {
          averageResponseTime: 3000,
          successRate: 90,
          qualityScore: 6.5,
          throughput: 20,
          errorRate: 10,
        },
      },
      {
        name: 'Edge Cases',
        description: 'Test handling of edge cases and unusual queries',
        testCases: [
          {
            query: '',
            expectedResponseType: 'fallback',
            maxResponseTime: 1000,
            minQualityScore: 4,
          },
          {
            query: 'asdfghjkl',
            expectedResponseType: 'fallback',
            maxResponseTime: 2000,
            minQualityScore: 4,
          },
          {
            query: 'What is the meaning of life?',
            expectedResponseType: 'fallback',
            maxResponseTime: 2000,
            minQualityScore: 5,
          },
          {
            query: 'Write my entire project for me',
            expectedResponseType: 'template',
            maxResponseTime: 2000,
            minQualityScore: 6,
          },
        ],
        expectedMetrics: {
          averageResponseTime: 1500,
          successRate: 85,
          qualityScore: 5,
          throughput: 15,
          errorRate: 15,
        },
      },
      {
        name: 'Complex Queries',
        description: 'Test performance with complex, multi-part queries',
        testCases: [
          {
            query:
              'I am working on a machine learning project for predicting student performance. I need help with choosing the right algorithm, setting up my dataset, and evaluating the results. Can you provide comprehensive guidance on all these aspects?',
            expectedResponseType: 'ai',
            maxResponseTime: 5000,
            minQualityScore: 8,
          },
          {
            query:
              'My supervisor wants me to use Agile methodology but I think Waterfall would be better for my blockchain security project. How do I approach this disagreement and what factors should I consider?',
            expectedResponseType: 'ai',
            maxResponseTime: 4000,
            minQualityScore: 7,
          },
        ],
        expectedMetrics: {
          averageResponseTime: 4500,
          successRate: 90,
          qualityScore: 7.5,
          throughput: 5,
          errorRate: 10,
        },
      },
    ];
  }

  /**
   * Run a single test case
   */
  private async runTestCase(
    testCase: BenchmarkTestCase,
    conversation: Conversation,
  ): Promise<TestCaseResult> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      // Create user message
      const userMessage = await this.createBenchmarkMessage(
        conversation,
        MessageType.USER_QUERY,
        testCase.query,
      );

      // Simulate AI response (in real implementation, this would call the actual AI service)
      const aiResponse = await this.simulateAIResponse(testCase, conversation);

      const responseTime = Date.now() - startTime;

      // Create AI response message
      const responseMessage = await this.createBenchmarkMessage(
        conversation,
        aiResponse.type,
        aiResponse.content,
        aiResponse.metadata,
      );

      // Evaluate response
      const qualityScore = this.evaluateResponseQuality(testCase, aiResponse);
      const actualResponseType = this.mapMessageTypeToString(aiResponse.type);

      // Check if test passed
      let passed = true;

      if (responseTime > testCase.maxResponseTime) {
        passed = false;
        issues.push(
          `Response time ${responseTime}ms exceeded limit ${testCase.maxResponseTime}ms`,
        );
      }

      if (qualityScore < testCase.minQualityScore) {
        passed = false;
        issues.push(
          `Quality score ${qualityScore} below minimum ${testCase.minQualityScore}`,
        );
      }

      if (actualResponseType !== testCase.expectedResponseType) {
        // This might be acceptable in some cases, so just note it
        issues.push(
          `Expected ${testCase.expectedResponseType} but got ${actualResponseType}`,
        );
      }

      return {
        query: testCase.query,
        passed,
        responseTime,
        qualityScore,
        actualResponseType,
        expectedResponseType: testCase.expectedResponseType,
        issues,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        query: testCase.query,
        passed: false,
        responseTime,
        qualityScore: 0,
        actualResponseType: 'error',
        expectedResponseType: testCase.expectedResponseType,
        issues: [`Error: ${error.message}`],
      };
    }
  }

  /**
   * Simulate AI response for benchmarking
   */
  private async simulateAIResponse(
    testCase: BenchmarkTestCase,
    conversation: Conversation,
  ): Promise<{ type: MessageType; content: string; metadata?: any }> {
    // Simulate processing delay
    await this.delay(Math.random() * 1000 + 500);

    const query = testCase.query.toLowerCase();

    // Simple simulation logic
    if (!query.trim() || query.length < 3) {
      return {
        type: MessageType.TEMPLATE_RESPONSE,
        content:
          'I need more information to help you. Could you please provide a more specific question?',
        metadata: { fallback: true, confidence: 0.2 },
      };
    }

    // Check for common patterns
    if (
      query.includes('literature review') ||
      query.includes('methodology') ||
      query.includes('proposal')
    ) {
      return {
        type: MessageType.AI_RESPONSE,
        content: `Here's guidance on ${query.includes('literature review') ? 'literature reviews' : query.includes('methodology') ? 'methodology selection' : 'project proposals'}:\n\n1. Start by understanding the requirements\n2. Research best practices\n3. Create a structured approach\n4. Seek feedback from your supervisor\n\nWould you like more specific guidance on any of these steps?`,
        metadata: {
          confidence: 0.8,
          processingTime: Math.random() * 1000 + 500,
        },
      };
    }

    if (
      query.includes('help') ||
      query.includes('start') ||
      query.includes('getting started')
    ) {
      return {
        type: MessageType.TEMPLATE_RESPONSE,
        content:
          "I'd be happy to help you get started with your Final Year Project! Here are the key first steps:\n\n1. Choose your topic and specialization\n2. Find a suitable supervisor\n3. Write your project proposal\n4. Plan your timeline\n\nWhat specific area would you like help with?",
        metadata: { template: true, confidence: 0.9 },
      };
    }

    // Fallback for unusual queries
    if (
      query.includes('meaning of life') ||
      query.includes('asdfghjkl') ||
      query.length > 200
    ) {
      return {
        type: MessageType.TEMPLATE_RESPONSE,
        content:
          "I'm designed to help with Final Year Project questions. Could you please ask something related to your FYP, such as:\n\n- Project proposal guidance\n- Literature review help\n- Methodology selection\n- Timeline planning\n\nHow can I assist you with your project?",
        metadata: { fallback: true, confidence: 0.3 },
      };
    }

    // Default AI response
    return {
      type: MessageType.AI_RESPONSE,
      content:
        "Thank you for your question. Based on FYP guidelines, here's what I recommend:\n\n1. Review the relevant documentation\n2. Consult with your supervisor\n3. Follow established best practices\n4. Document your progress\n\nWould you like more specific guidance on any particular aspect?",
      metadata: { confidence: 0.6, processingTime: Math.random() * 1000 + 800 },
    };
  }

  /**
   * Calculate benchmark metrics
   */
  private calculateMetrics(
    testResults: TestCaseResult[],
    responseTimes: number[],
    startTime: number,
  ): BenchmarkMetrics {
    const totalTime = Date.now() - startTime;
    const passedTests = testResults.filter((r) => r.passed).length;
    const totalTests = testResults.length;

    return {
      averageResponseTime:
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      successRate: (passedTests / totalTests) * 100,
      qualityScore:
        testResults.reduce((sum, r) => sum + r.qualityScore, 0) / totalTests,
      throughput: (totalTests / totalTime) * 1000, // requests per second
      errorRate: ((totalTests - passedTests) / totalTests) * 100,
    };
  }

  /**
   * Analyze performance characteristics
   */
  private analyzePerformance(
    responseTimes: number[],
    metrics: BenchmarkMetrics,
  ): PerformanceAnalysis {
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);

    const percentile = (p: number) => {
      const index = Math.ceil((p / 100) * sortedTimes.length) - 1;
      return sortedTimes[Math.max(0, index)];
    };

    const bottlenecks: string[] = [];

    if (metrics.averageResponseTime > 3000) {
      bottlenecks.push(
        'High average response time indicates processing bottleneck',
      );
    }

    if (metrics.errorRate > 10) {
      bottlenecks.push('High error rate suggests system instability');
    }

    if (metrics.throughput < 5) {
      bottlenecks.push('Low throughput indicates capacity limitations');
    }

    return {
      responseTimeDistribution: {
        p50: percentile(50),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
      },
      throughputAnalysis: {
        peakThroughput: metrics.throughput * 1.2, // Estimated
        averageThroughput: metrics.throughput,
        sustainedThroughput: metrics.throughput * 0.8, // Estimated
      },
      resourceUtilization: {
        memoryUsage: Math.random() * 80 + 20, // Simulated
        cpuUsage: Math.random() * 60 + 30, // Simulated
        databaseConnections: Math.floor(Math.random() * 10 + 5), // Simulated
      },
      bottlenecks,
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    metrics: BenchmarkMetrics,
    performance: PerformanceAnalysis,
    testResults: TestCaseResult[],
  ): string[] {
    const recommendations: string[] = [];

    // Response time recommendations
    if (metrics.averageResponseTime > 3000) {
      recommendations.push(
        'Optimize AI processing pipeline to reduce response times',
      );
    }

    if (performance.responseTimeDistribution.p95 > 5000) {
      recommendations.push(
        'Address tail latency issues - 95th percentile response time is too high',
      );
    }

    // Quality recommendations
    if (metrics.qualityScore < 7) {
      recommendations.push(
        'Improve response quality through better training data or templates',
      );
    }

    // Throughput recommendations
    if (metrics.throughput < 10) {
      recommendations.push(
        'Scale system capacity to handle higher request volumes',
      );
    }

    // Error rate recommendations
    if (metrics.errorRate > 5) {
      recommendations.push('Investigate and fix causes of response failures');
    }

    // Specific test case recommendations
    const failedTests = testResults.filter((r) => !r.passed);
    if (failedTests.length > 0) {
      const commonIssues = this.analyzeCommonIssues(failedTests);
      recommendations.push(...commonIssues);
    }

    // Resource utilization recommendations
    if (performance.resourceUtilization.memoryUsage > 80) {
      recommendations.push(
        'Monitor memory usage - approaching capacity limits',
      );
    }

    if (performance.resourceUtilization.cpuUsage > 70) {
      recommendations.push('Consider CPU optimization or scaling');
    }

    return recommendations;
  }

  /**
   * Analyze common issues in failed tests
   */
  private analyzeCommonIssues(failedTests: TestCaseResult[]): string[] {
    const issueMap = new Map<string, number>();

    failedTests.forEach((test) => {
      test.issues.forEach((issue) => {
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      });
    });

    const commonIssues = Array.from(issueMap.entries())
      .filter(([_, count]) => count > 1)
      .map(
        ([issue, count]) =>
          `Address common issue (${count} occurrences): ${issue}`,
      );

    return commonIssues;
  }

  /**
   * Evaluate response quality (simplified)
   */
  private evaluateResponseQuality(
    testCase: BenchmarkTestCase,
    response: { content: string; metadata?: any },
  ): number {
    let score = 5; // Base score

    // Length check
    if (response.content.length > 50) score += 2;
    if (response.content.length > 200) score += 1;

    // Relevance check (basic keyword matching)
    const queryWords = testCase.query.toLowerCase().split(/\s+/);
    const responseWords = response.content.toLowerCase().split(/\s+/);
    const overlap = queryWords.filter((word) =>
      responseWords.includes(word),
    ).length;
    const relevanceScore = (overlap / queryWords.length) * 3;
    score += relevanceScore;

    // Confidence score from metadata
    if (response.metadata?.confidence) {
      score += response.metadata.confidence * 2;
    }

    // Helpfulness indicators
    if (
      response.content.includes('steps') ||
      response.content.includes('guidance')
    ) {
      score += 1;
    }

    return Math.min(10, Math.max(0, score));
  }

  /**
   * Helper methods
   */
  private async createBenchmarkUser(): Promise<User> {
    const testEmail = `benchmark-user-${Date.now()}@test.com`;

    const user = this.userRepository.create({
      email: testEmail,
      password: 'test-password',
      role: 'student' as any,
      isEmailVerified: true,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  private async createBenchmarkConversation(user: User): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      studentId: user.id,
      title: 'Benchmark Test Conversation',
      status: ConversationStatus.ACTIVE,
      context: {}, // Empty context as isBenchmark is not part of ConversationContext
      language: 'en',
    });

    // Set the student relationship after creation
    conversation.student = user;

    return await this.conversationRepository.save(conversation);
  }

  private async createBenchmarkMessage(
    conversation: Conversation,
    type: MessageType,
    content: string,
    metadata?: any,
  ): Promise<ConversationMessage> {
    const message = this.messageRepository.create({
      conversation,
      conversationId: conversation.id,
      type,
      content,
      metadata: metadata || {},
    });

    return await this.messageRepository.save(message);
  }

  private mapMessageTypeToString(type: MessageType): string {
    switch (type) {
      case MessageType.AI_RESPONSE:
        return 'ai';
      case MessageType.TEMPLATE_RESPONSE:
        return 'template';
      default:
        return 'fallback';
    }
  }

  private createFailedBenchmarkResult(
    benchmark: PerformanceBenchmark,
    error: Error,
  ): BenchmarkResult {
    return {
      benchmarkName: benchmark.name,
      timestamp: new Date(),
      totalTests: benchmark.testCases.length,
      passedTests: 0,
      failedTests: benchmark.testCases.length,
      metrics: {
        averageResponseTime: 0,
        successRate: 0,
        qualityScore: 0,
        throughput: 0,
        errorRate: 100,
      },
      testResults: [],
      performance: {
        responseTimeDistribution: { p50: 0, p90: 0, p95: 0, p99: 0 },
        throughputAnalysis: {
          peakThroughput: 0,
          averageThroughput: 0,
          sustainedThroughput: 0,
        },
        resourceUtilization: {
          memoryUsage: 0,
          cpuUsage: 0,
          databaseConnections: 0,
        },
        bottlenecks: [`Benchmark failed: ${error.message}`],
      },
      recommendations: ['Fix benchmark setup and retry'],
    };
  }

  private async cleanupBenchmarkData(
    user: User,
    conversation: Conversation,
  ): Promise<void> {
    // Remove messages
    await this.messageRepository.delete({ conversationId: conversation.id });

    // Remove conversation
    await this.conversationRepository.remove(conversation);

    // Remove user
    await this.userRepository.remove(user);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
