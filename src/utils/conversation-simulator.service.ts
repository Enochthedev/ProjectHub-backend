import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Conversation,
  ConversationMessage,
  User,
  KnowledgeBaseEntry,
  ResponseTemplate,
} from '@/entities';
import {
  ConversationStatus,
  MessageType,
  MessageStatus,
  ContentType,
} from '@/common/enums';

export interface SimulationScenario {
  name: string;
  description: string;
  studentProfile: {
    specialization: string;
    projectPhase: string;
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  conversationFlow: ConversationStep[];
}

export interface ConversationStep {
  type: 'user_query' | 'ai_response' | 'template_response' | 'delay';
  content?: string;
  expectedResponseType?: 'ai' | 'template' | 'fallback';
  metadata?: Record<string, any>;
  delayMs?: number;
}

export interface SimulationResult {
  scenarioName: string;
  conversationId: string;
  totalMessages: number;
  aiResponses: number;
  templateResponses: number;
  fallbackResponses: number;
  averageResponseTime: number;
  qualityScore: number;
  issues: string[];
  recommendations: string[];
}

@Injectable()
export class ConversationSimulatorService {
  private readonly logger = new Logger(ConversationSimulatorService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
  ) {}

  /**
   * Run a conversation simulation scenario
   */
  async runSimulation(scenario: SimulationScenario): Promise<SimulationResult> {
    this.logger.log(`Running simulation: ${scenario.name}`);

    // Create test student user
    const testStudent = await this.createTestStudent(scenario.studentProfile);

    // Create conversation
    const conversation = await this.createTestConversation(
      testStudent,
      scenario,
    );

    // Execute conversation flow
    const result = await this.executeConversationFlow(conversation, scenario);

    // Cleanup test data
    await this.cleanupTestData(testStudent, conversation);

    return result;
  }

  /**
   * Run multiple simulation scenarios
   */
  async runBatchSimulations(
    scenarios: SimulationScenario[],
  ): Promise<SimulationResult[]> {
    this.logger.log(
      `Running batch simulation with ${scenarios.length} scenarios`,
    );

    const results: SimulationResult[] = [];

    for (const scenario of scenarios) {
      try {
        const result = await this.runSimulation(scenario);
        results.push(result);
        this.logger.log(`✅ Completed simulation: ${scenario.name}`);
      } catch (error) {
        this.logger.error(`❌ Failed simulation: ${scenario.name}`, error);
        results.push({
          scenarioName: scenario.name,
          conversationId: '',
          totalMessages: 0,
          aiResponses: 0,
          templateResponses: 0,
          fallbackResponses: 0,
          averageResponseTime: 0,
          qualityScore: 0,
          issues: [`Simulation failed: ${error.message}`],
          recommendations: ['Fix simulation setup and retry'],
        });
      }
    }

    return results;
  }

  /**
   * Generate default simulation scenarios
   */
  getDefaultScenarios(): SimulationScenario[] {
    return [
      {
        name: 'New Student Getting Started',
        description: 'Simulate a new student asking basic FYP questions',
        studentProfile: {
          specialization: 'Web Development & Full Stack',
          projectPhase: 'planning',
          experienceLevel: 'beginner',
        },
        conversationFlow: [
          {
            type: 'user_query',
            content:
              'Hi, I need help getting started with my final year project',
            expectedResponseType: 'template',
          },
          {
            type: 'delay',
            delayMs: 1000,
          },
          {
            type: 'user_query',
            content: 'What should I include in my project proposal?',
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content: 'How long should the literature review be?',
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content:
              'Can you help me choose between Agile and Waterfall methodology?',
            expectedResponseType: 'ai',
          },
        ],
      },
      {
        name: 'Advanced Student Technical Questions',
        description:
          'Simulate an advanced student asking technical implementation questions',
        studentProfile: {
          specialization: 'Artificial Intelligence & Machine Learning',
          projectPhase: 'implementation',
          experienceLevel: 'advanced',
        },
        conversationFlow: [
          {
            type: 'user_query',
            content:
              "I'm implementing a neural network for my project. What evaluation metrics should I use?",
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content:
              'How do I handle overfitting in my machine learning model?',
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content:
              "What's the best way to document my AI model architecture?",
            expectedResponseType: 'ai',
          },
        ],
      },
      {
        name: 'Literature Review Help Session',
        description: 'Student seeking comprehensive literature review guidance',
        studentProfile: {
          specialization: 'Cybersecurity & Information Security',
          projectPhase: 'research',
          experienceLevel: 'intermediate',
        },
        conversationFlow: [
          {
            type: 'user_query',
            content:
              'I need help with my literature review for a blockchain security project',
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content: 'How many sources do I need for my literature review?',
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content: 'What databases should I search for cybersecurity papers?',
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content: 'How do I organize my literature review by themes?',
            expectedResponseType: 'ai',
          },
        ],
      },
      {
        name: 'Methodology Selection Confusion',
        description: 'Student confused about choosing the right methodology',
        studentProfile: {
          specialization: 'Mobile Application Development',
          projectPhase: 'planning',
          experienceLevel: 'intermediate',
        },
        conversationFlow: [
          {
            type: 'user_query',
            content:
              "I'm not sure which development methodology to use for my mobile app project",
            expectedResponseType: 'template',
          },
          {
            type: 'user_query',
            content: "What's the difference between Agile and Waterfall?",
            expectedResponseType: 'ai',
          },
          {
            type: 'user_query',
            content:
              'My requirements might change during development. Which methodology is better?',
            expectedResponseType: 'ai',
          },
        ],
      },
      {
        name: 'Edge Case and Error Handling',
        description:
          'Test how the system handles unclear or problematic queries',
        studentProfile: {
          specialization: 'Data Science & Analytics',
          projectPhase: 'implementation',
          experienceLevel: 'beginner',
        },
        conversationFlow: [
          {
            type: 'user_query',
            content: 'help',
            expectedResponseType: 'template',
          },
          {
            type: 'user_query',
            content: 'asdfghjkl',
            expectedResponseType: 'fallback',
          },
          {
            type: 'user_query',
            content: 'Can you write my entire project for me?',
            expectedResponseType: 'template',
          },
          {
            type: 'user_query',
            content: 'What is the meaning of life?',
            expectedResponseType: 'fallback',
          },
        ],
      },
    ];
  }

  /**
   * Create a test student user
   */
  private async createTestStudent(profile: any): Promise<User> {
    const testEmail = `test-student-${Date.now()}@simulation.test`;

    const user = this.userRepository.create({
      email: testEmail,
      password: 'test-password',
      role: 'student' as any,
      isEmailVerified: true,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  /**
   * Create a test conversation
   */
  private async createTestConversation(
    student: User,
    scenario: SimulationScenario,
  ): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      studentId: student.id,
      title: `Simulation: ${scenario.name}`,
      status: ConversationStatus.ACTIVE,
      context: {
        specialization: scenario.studentProfile.specialization,
        projectPhase: scenario.studentProfile.projectPhase,
        // Note: experienceLevel is not part of ConversationContext interface
        // isSimulation: true, // This is also not part of the interface
      },
      language: 'en',
    });

    // Set the student relationship after creation
    conversation.student = student;

    return await this.conversationRepository.save(conversation);
  }

  /**
   * Execute the conversation flow
   */
  private async executeConversationFlow(
    conversation: Conversation,
    scenario: SimulationScenario,
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    let totalMessages = 0;
    let aiResponses = 0;
    let templateResponses = 0;
    let fallbackResponses = 0;
    const responseTimes: number[] = [];
    const issues: string[] = [];
    const recommendations: string[] = [];

    for (const step of scenario.conversationFlow) {
      if (step.type === 'delay') {
        await this.delay(step.delayMs || 1000);
        continue;
      }

      if (step.type === 'user_query') {
        const stepStartTime = Date.now();

        // Create user message
        const userMessage = await this.createMessage(
          conversation,
          MessageType.USER_QUERY,
          step.content!,
        );
        totalMessages++;

        // Simulate AI response generation
        const response = await this.simulateAIResponse(
          step.content!,
          conversation,
          step.expectedResponseType,
        );

        // Create AI response message
        const aiMessage = await this.createMessage(
          conversation,
          response.type,
          response.content,
          response.metadata,
        );
        totalMessages++;

        // Track response type
        switch (response.type) {
          case MessageType.AI_RESPONSE:
            aiResponses++;
            break;
          case MessageType.TEMPLATE_RESPONSE:
            templateResponses++;
            break;
          default:
            fallbackResponses++;
        }

        // Track response time
        const responseTime = Date.now() - stepStartTime;
        responseTimes.push(responseTime);

        // Check if response type matches expectation
        if (
          step.expectedResponseType &&
          !this.matchesExpectedType(response.type, step.expectedResponseType)
        ) {
          issues.push(
            `Expected ${step.expectedResponseType} response but got ${response.type} for query: "${step.content}"`,
          );
        }

        // Check response quality
        if (response.content.length < 50) {
          issues.push(`Very short response for query: "${step.content}"`);
        }

        await this.delay(500); // Simulate processing time
      }
    }

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Calculate quality score
    const qualityScore = this.calculateQualityScore({
      totalMessages,
      aiResponses,
      templateResponses,
      fallbackResponses,
      averageResponseTime,
      issuesCount: issues.length,
    });

    // Generate recommendations
    if (averageResponseTime > 5000) {
      recommendations.push(
        'Response times are too slow, consider optimization',
      );
    }

    if (fallbackResponses > aiResponses + templateResponses) {
      recommendations.push(
        'Too many fallback responses, improve AI training or templates',
      );
    }

    if (issues.length > 0) {
      recommendations.push('Address response type mismatches');
    }

    return {
      scenarioName: scenario.name,
      conversationId: conversation.id,
      totalMessages,
      aiResponses,
      templateResponses,
      fallbackResponses,
      averageResponseTime,
      qualityScore,
      issues,
      recommendations,
    };
  }

  /**
   * Simulate AI response generation
   */
  private async simulateAIResponse(
    query: string,
    conversation: Conversation,
    expectedType?: string,
  ): Promise<{ type: MessageType; content: string; metadata?: any }> {
    // This is a simulation - in real implementation, this would call the actual AI service

    // Check for template matches first
    const template = await this.findMatchingTemplate(query);
    if (template) {
      return {
        type: MessageType.TEMPLATE_RESPONSE,
        content: this.processTemplate(template, conversation.context),
        metadata: { templateId: template.id, confidence: 0.8 },
      };
    }

    // Check knowledge base
    const knowledgeEntry = await this.findRelevantKnowledge(query);
    if (knowledgeEntry) {
      return {
        type: MessageType.AI_RESPONSE,
        content: this.generateAIResponse(query, knowledgeEntry),
        metadata: { knowledgeId: knowledgeEntry.id, confidence: 0.7 },
      };
    }

    // Fallback response
    return {
      type: MessageType.TEMPLATE_RESPONSE,
      content: this.generateFallbackResponse(query),
      metadata: { confidence: 0.2, fallback: true },
    };
  }

  /**
   * Find matching response template
   */
  private async findMatchingTemplate(
    query: string,
  ): Promise<ResponseTemplate | null> {
    const templates = await this.templateRepository.find({
      where: { isActive: true },
    });

    const queryLower = query.toLowerCase();

    for (const template of templates) {
      const matches = template.triggerKeywords.some((keyword) =>
        queryLower.includes(keyword.toLowerCase()),
      );

      if (matches) {
        return template;
      }
    }

    return null;
  }

  /**
   * Find relevant knowledge base entry
   */
  private async findRelevantKnowledge(
    query: string,
  ): Promise<KnowledgeBaseEntry | null> {
    const entries = await this.knowledgeRepository.find({
      where: { isActive: true },
    });

    const queryLower = query.toLowerCase();

    for (const entry of entries) {
      const matches =
        entry.keywords.some((keyword) =>
          queryLower.includes(keyword.toLowerCase()),
        ) || entry.title.toLowerCase().includes(queryLower);

      if (matches) {
        return entry;
      }
    }

    return null;
  }

  /**
   * Process template with context
   */
  private processTemplate(template: ResponseTemplate, context: any): string {
    let processed = template.template;

    // Replace context variables
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processed = processed.replace(
          new RegExp(placeholder, 'g'),
          String(value),
        );
      });
    }

    return processed;
  }

  /**
   * Generate AI response based on knowledge
   */
  private generateAIResponse(
    query: string,
    knowledge: KnowledgeBaseEntry,
  ): string {
    // Simulate AI response generation
    const excerpt = knowledge.content.substring(0, 300) + '...';

    return `Based on the FYP guidelines, here's what I can help you with:

${excerpt}

Would you like me to provide more specific information about any particular aspect?`;
  }

  /**
   * Generate fallback response
   */
  private generateFallbackResponse(query: string): string {
    return `I'm not sure I understand your question completely. Could you please rephrase it or be more specific? 

Here are some topics I can help you with:
- Project proposal writing
- Literature review guidance  
- Methodology selection
- Timeline planning
- Technical implementation advice

You can also contact your supervisor for personalized guidance.`;
  }

  /**
   * Create a conversation message
   */
  private async createMessage(
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
      status: MessageStatus.DELIVERED,
    });

    return await this.messageRepository.save(message);
  }

  /**
   * Check if response type matches expectation
   */
  private matchesExpectedType(
    actualType: MessageType,
    expectedType: string,
  ): boolean {
    switch (expectedType) {
      case 'ai':
        return actualType === MessageType.AI_RESPONSE;
      case 'template':
        return actualType === MessageType.TEMPLATE_RESPONSE;
      case 'fallback':
        return actualType === MessageType.TEMPLATE_RESPONSE; // Fallback uses template
      default:
        return true;
    }
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(metrics: {
    totalMessages: number;
    aiResponses: number;
    templateResponses: number;
    fallbackResponses: number;
    averageResponseTime: number;
    issuesCount: number;
  }): number {
    let score = 100;

    // Deduct for slow responses
    if (metrics.averageResponseTime > 3000) {
      score -= 20;
    } else if (metrics.averageResponseTime > 1000) {
      score -= 10;
    }

    // Deduct for too many fallback responses
    const fallbackRatio = metrics.fallbackResponses / metrics.totalMessages;
    if (fallbackRatio > 0.5) {
      score -= 30;
    } else if (fallbackRatio > 0.3) {
      score -= 15;
    }

    // Deduct for issues
    score -= metrics.issuesCount * 10;

    return Math.max(0, score);
  }

  /**
   * Cleanup test data
   */
  private async cleanupTestData(
    user: User,
    conversation: Conversation,
  ): Promise<void> {
    // Remove messages
    await this.messageRepository.delete({ conversationId: conversation.id });

    // Remove conversation
    await this.conversationRepository.remove(conversation);

    // Remove test user
    await this.userRepository.remove(user);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
