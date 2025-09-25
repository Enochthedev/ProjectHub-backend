import {
  Recommendation,
  RecommendationFeedback,
  AIApiUsage,
  User,
  StudentProfile,
  Project,
} from '../../entities';
import {
  GenerateRecommendationsDto,
  RecommendationFeedbackDto,
  RecommendationResultDto,
  ProjectRecommendationDto,
} from '../../dto/recommendation';
import {
  RecommendationStatus,
  FeedbackType,
  DifficultyLevel,
  UserRole,
  ApprovalStatus,
} from '../../common/enums';
import { SPECIALIZATIONS } from '../../common/constants/specializations';
import type {
  ProjectRecommendation,
  StudentProfileSnapshot,
} from '../../entities/recommendation.entity';

export class RecommendationFixtures {
  // Core Recommendation Entity Fixtures
  static createTestRecommendation(
    overrides: Partial<Recommendation> = {},
  ): Partial<Recommendation> {
    const projectSuggestions: ProjectRecommendation[] = [
      {
        projectId: 'project-1-id',
        title: 'AI-Powered Student Performance Predictor',
        abstract:
          'A machine learning system that analyzes student data to predict academic performance and provide personalized learning recommendations.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        similarityScore: 0.92,
        matchingSkills: ['Python', 'Machine Learning', 'Data Analysis'],
        matchingInterests: ['AI', 'Data Science', 'Education Technology'],
        reasoning:
          'This project aligns perfectly with your machine learning skills and interest in educational technology. Your Python expertise and data analysis background make you an ideal candidate.',
        supervisor: {
          id: 'supervisor-1-id',
          name: 'Dr. Sarah Johnson',
          specialization: 'Artificial Intelligence & Machine Learning',
        },
        diversityBoost: 0.0,
      },
      {
        projectId: 'project-2-id',
        title: 'Blockchain-Based Voting System',
        abstract:
          'A secure, transparent voting system using blockchain technology to ensure election integrity and voter privacy.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.ADVANCED,
        similarityScore: 0.78,
        matchingSkills: ['JavaScript', 'Cryptography', 'Node.js'],
        matchingInterests: ['Security', 'Blockchain', 'Democracy'],
        reasoning:
          'Your cryptography knowledge and JavaScript skills are well-suited for this blockchain project. This offers great exposure to security concepts.',
        supervisor: {
          id: 'supervisor-2-id',
          name: 'Prof. Michael Chen',
          specialization: 'Cybersecurity & Information Security',
        },
        diversityBoost: 0.15,
      },
    ];

    const profileSnapshot: StudentProfileSnapshot = {
      skills: ['Python', 'JavaScript', 'Machine Learning', 'Data Analysis'],
      interests: ['AI', 'Data Science', 'Web Development'],
      specializations: [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
      ],
      preferredDifficulty: DifficultyLevel.ADVANCED,
      careerGoals: 'AI Research and Development',
      profileCompleteness: 0.95,
      snapshotDate: new Date(),
    };

    return {
      studentId: 'test-student-id',
      projectSuggestions,
      reasoning:
        'These recommendations are based on your strong background in machine learning and data analysis, with a focus on projects that match your career goals in AI research.',
      averageSimilarityScore: 0.85,
      profileSnapshot,
      status: RecommendationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      ...overrides,
    };
  }

  static createExpiredRecommendation(
    overrides: Partial<Recommendation> = {},
  ): Partial<Recommendation> {
    return this.createTestRecommendation({
      status: RecommendationStatus.EXPIRED,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      ...overrides,
    });
  }

  static createSupersededRecommendation(
    overrides: Partial<Recommendation> = {},
  ): Partial<Recommendation> {
    return this.createTestRecommendation({
      status: RecommendationStatus.SUPERSEDED,
      ...overrides,
    });
  }

  // Recommendation Feedback Fixtures
  static createTestRecommendationFeedback(
    overrides: Partial<RecommendationFeedback> = {},
  ): Partial<RecommendationFeedback> {
    return {
      recommendationId: 'test-recommendation-id',
      projectId: 'test-project-id',
      feedbackType: FeedbackType.LIKE,
      rating: 4.5,
      comment:
        'Great recommendation! This project aligns well with my interests.',
      ...overrides,
    };
  }

  static createNegativeFeedback(
    overrides: Partial<RecommendationFeedback> = {},
  ): Partial<RecommendationFeedback> {
    return this.createTestRecommendationFeedback({
      feedbackType: FeedbackType.DISLIKE,
      rating: 2.0,
      comment: "This project doesn't match my skill level or interests.",
      ...overrides,
    });
  }

  static createBookmarkFeedback(
    overrides: Partial<RecommendationFeedback> = {},
  ): Partial<RecommendationFeedback> {
    return this.createTestRecommendationFeedback({
      feedbackType: FeedbackType.BOOKMARK,
      rating: null,
      comment: null,
      ...overrides,
    });
  }

  // AI API Usage Fixtures
  static createTestAIApiUsage(
    overrides: Partial<AIApiUsage> = {},
  ): Partial<AIApiUsage> {
    return {
      endpoint: '/v1/embeddings',
      model: 'sentence-transformers/all-MiniLM-L6-v2',
      tokensUsed: 256,
      responseTimeMs: 1500,
      success: true,
      errorMessage: null,
      userId: 'test-user-id',
      ...overrides,
    };
  }

  static createFailedAIApiUsage(
    overrides: Partial<AIApiUsage> = {},
  ): Partial<AIApiUsage> {
    return this.createTestAIApiUsage({
      success: false,
      errorMessage: 'Rate limit exceeded',
      responseTimeMs: 5000,
      ...overrides,
    });
  }

  // DTO Fixtures
  static createValidGenerateRecommendationsDto(
    overrides: Partial<GenerateRecommendationsDto> = {},
  ): GenerateRecommendationsDto {
    return {
      limit: 10,
      excludeSpecializations: [],
      includeSpecializations: [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
      ],
      maxDifficulty: DifficultyLevel.ADVANCED,
      forceRefresh: false,
      minSimilarityScore: 0.3,
      includeDiversityBoost: true,
      ...overrides,
    };
  }

  static createValidRecommendationFeedbackDto(
    overrides: Partial<RecommendationFeedbackDto> = {},
  ): RecommendationFeedbackDto {
    return {
      feedbackType: FeedbackType.LIKE,
      rating: 4.0,
      comment: 'Excellent recommendation that matches my interests perfectly!',
      ...overrides,
    };
  }

  static createRecommendationResultDto(
    overrides: Partial<RecommendationResultDto> = {},
  ): RecommendationResultDto {
    const recommendations: ProjectRecommendationDto[] = [
      {
        projectId: 'project-1-id',
        title: 'AI-Powered Student Performance Predictor',
        abstract:
          'A machine learning system that analyzes student data to predict academic performance.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        similarityScore: 0.92,
        matchingSkills: ['Python', 'Machine Learning', 'Data Analysis'],
        matchingInterests: ['AI', 'Data Science', 'Education Technology'],
        reasoning:
          'Perfect match for your ML skills and educational technology interests.',
        supervisor: {
          id: 'supervisor-1-id',
          name: 'Dr. Sarah Johnson',
          specialization: 'Artificial Intelligence & Machine Learning',
        },
        diversityBoost: 0.0,
      },
    ];

    return {
      recommendations,
      reasoning:
        'Recommendations based on semantic analysis of your profile and project descriptions.',
      averageSimilarityScore: 0.85,
      fromCache: false,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      metadata: {
        method: 'ai-powered',
        fallback: false,
        projectsAnalyzed: 150,
        cacheHitRate: 0.25,
        processingTimeMs: 2500,
      },
      ...overrides,
    };
  }

  // Test Data for Different Student Profiles
  static createDiverseStudentProfiles(): Partial<StudentProfile>[] {
    return [
      {
        // AI/ML focused student
        name: 'Alice Chen',
        skills: [
          'Python',
          'TensorFlow',
          'Scikit-learn',
          'Data Analysis',
          'Statistics',
        ],
        interests: [
          'Machine Learning',
          'Deep Learning',
          'Computer Vision',
          'Natural Language Processing',
        ],
        preferredSpecializations: [
          'Artificial Intelligence & Machine Learning',
        ],
        currentYear: 4,
        gpa: 3.8,
      },
      {
        // Full-stack web developer
        name: 'Bob Johnson',
        skills: [
          'JavaScript',
          'TypeScript',
          'React',
          'Node.js',
          'PostgreSQL',
          'Docker',
        ],
        interests: [
          'Web Development',
          'User Experience',
          'API Design',
          'Cloud Computing',
        ],
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Cloud Computing & DevOps',
        ],
        currentYear: 4,
        gpa: 3.6,
      },
      {
        // Cybersecurity enthusiast
        name: 'Carol Davis',
        skills: [
          'Network Security',
          'Cryptography',
          'Penetration Testing',
          'Python',
          'Linux',
        ],
        interests: [
          'Cybersecurity',
          'Ethical Hacking',
          'Digital Forensics',
          'Privacy Protection',
        ],
        preferredSpecializations: ['Cybersecurity & Information Security'],
        currentYear: 3,
        gpa: 3.9,
      },
      {
        // Mobile development focused
        name: 'David Wilson',
        skills: [
          'React Native',
          'Flutter',
          'Swift',
          'Kotlin',
          'Firebase',
          'REST APIs',
        ],
        interests: [
          'Mobile Development',
          'User Interface Design',
          'Cross-platform Development',
          'Mobile Gaming',
        ],
        preferredSpecializations: ['Mobile Application Development'],
        currentYear: 4,
        gpa: 3.7,
      },
      {
        // Data science oriented
        name: 'Eva Martinez',
        skills: [
          'Python',
          'R',
          'SQL',
          'Tableau',
          'Pandas',
          'NumPy',
          'Statistical Analysis',
        ],
        interests: [
          'Data Science',
          'Business Intelligence',
          'Data Visualization',
          'Predictive Analytics',
        ],
        preferredSpecializations: ['Data Science & Analytics'],
        currentYear: 3,
        gpa: 3.85,
      },
    ];
  }

  // Test Projects for Different Specializations
  static createDiverseTestProjects(): Partial<Project>[] {
    return [
      {
        // AI/ML Project
        title: 'Intelligent Tutoring System with Adaptive Learning',
        abstract:
          'An AI-powered tutoring system that adapts to individual student learning patterns using machine learning algorithms to provide personalized educational content and assessments.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: [
          'Machine Learning',
          'Educational Technology',
          'Adaptive Learning',
          'Natural Language Processing',
        ],
        technologyStack: [
          'Python',
          'TensorFlow',
          'Flask',
          'PostgreSQL',
          'React',
        ],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: 'supervisor-ai-1',
      },
      {
        // Web Development Project
        title: 'Real-time Collaborative Code Editor',
        abstract:
          'A web-based collaborative code editor with real-time synchronization, syntax highlighting, and integrated chat functionality for remote pair programming.',
        specialization: 'Web Development & Full Stack',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: [
          'Real-time Collaboration',
          'WebSockets',
          'Code Editor',
          'Pair Programming',
        ],
        technologyStack: [
          'TypeScript',
          'React',
          'Node.js',
          'Socket.io',
          'MongoDB',
        ],
        isGroupProject: true,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: 'supervisor-web-1',
      },
      {
        // Cybersecurity Project
        title: 'Blockchain-Based Identity Verification System',
        abstract:
          'A decentralized identity verification system using blockchain technology to ensure secure and privacy-preserving authentication for digital services.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2024,
        tags: [
          'Blockchain',
          'Identity Verification',
          'Cryptography',
          'Privacy Protection',
        ],
        technologyStack: ['Solidity', 'Ethereum', 'Web3.js', 'React', 'IPFS'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: 'supervisor-security-1',
      },
      {
        // Mobile Development Project
        title: 'Cross-Platform Health Monitoring App',
        abstract:
          'A mobile application for health monitoring that tracks vital signs, medication schedules, and provides health insights using wearable device integration.',
        specialization: 'Mobile Application Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: [
          'Health Monitoring',
          'Wearable Integration',
          'Cross-platform',
          'Healthcare',
        ],
        technologyStack: [
          'React Native',
          'Firebase',
          'HealthKit',
          'Google Fit',
          'Node.js',
        ],
        isGroupProject: true,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: 'supervisor-mobile-1',
      },
      {
        // Data Science Project
        title: 'Social Media Sentiment Analysis Dashboard',
        abstract:
          'A comprehensive dashboard for analyzing social media sentiment trends using natural language processing and data visualization techniques.',
        specialization: 'Data Science & Analytics',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2024,
        tags: [
          'Sentiment Analysis',
          'Social Media',
          'Data Visualization',
          'NLP',
        ],
        technologyStack: [
          'Python',
          'Pandas',
          'NLTK',
          'Plotly',
          'Streamlit',
          'Twitter API',
        ],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
        supervisorId: 'supervisor-data-1',
      },
    ];
  }

  // Recommendation Test Scenarios
  static createRecommendationTestScenarios() {
    return {
      perfectMatch: {
        student: {
          skills: ['Python', 'Machine Learning', 'TensorFlow'],
          interests: ['AI', 'Deep Learning', 'Computer Vision'],
          specializations: ['Artificial Intelligence & Machine Learning'],
        },
        project: {
          title: 'Deep Learning Image Classification System',
          specialization: 'Artificial Intelligence & Machine Learning',
          tags: ['Deep Learning', 'Computer Vision', 'Image Classification'],
          technologyStack: ['Python', 'TensorFlow', 'OpenCV'],
        },
        expectedSimilarityScore: 0.9,
      },
      partialMatch: {
        student: {
          skills: ['JavaScript', 'React', 'Node.js'],
          interests: ['Web Development', 'User Experience'],
          specializations: ['Web Development & Full Stack'],
        },
        project: {
          title: 'Mobile E-commerce Application',
          specialization: 'Mobile Application Development',
          tags: ['E-commerce', 'Mobile Development', 'User Experience'],
          technologyStack: ['React Native', 'Node.js', 'MongoDB'],
        },
        expectedSimilarityScore: 0.6,
      },
      poorMatch: {
        student: {
          skills: ['Java', 'Spring Boot', 'MySQL'],
          interests: ['Backend Development', 'Database Design'],
          specializations: ['Software Engineering & Architecture'],
        },
        project: {
          title: 'Machine Learning Recommendation Engine',
          specialization: 'Artificial Intelligence & Machine Learning',
          tags: ['Machine Learning', 'Recommendation Systems', 'AI'],
          technologyStack: ['Python', 'Scikit-learn', 'TensorFlow'],
        },
        expectedSimilarityScore: 0.2,
      },
    };
  }

  // Bulk Data Generation for Performance Testing
  static createBulkRecommendations(count: number): Partial<Recommendation>[] {
    const recommendations: Partial<Recommendation>[] = [];
    const specializations = Array.from(SPECIALIZATIONS);
    const difficulties = Object.values(DifficultyLevel);

    for (let i = 0; i < count; i++) {
      const projectCount = Math.floor(Math.random() * 8) + 3; // 3-10 projects
      const projectSuggestions: ProjectRecommendation[] = [];
      const randomMainSpec =
        specializations[Math.floor(Math.random() * specializations.length)];

      for (let j = 0; j < projectCount; j++) {
        const randomSpec =
          specializations[Math.floor(Math.random() * specializations.length)];
        const randomDifficulty =
          difficulties[Math.floor(Math.random() * difficulties.length)];

        projectSuggestions.push({
          projectId: `bulk-project-${i}-${j}`,
          title: `Bulk Test Project ${i}-${j}`,
          abstract: `Generated project abstract for bulk testing purposes ${i}-${j}`,
          specialization: randomSpec,
          difficultyLevel: randomDifficulty,
          similarityScore: Math.round((Math.random() * 0.7 + 0.3) * 100) / 100, // 0.3-1.0
          matchingSkills: ['Skill1', 'Skill2', 'Skill3'],
          matchingInterests: ['Interest1', 'Interest2'],
          reasoning: `Generated reasoning for project ${i}-${j}`,
          supervisor: {
            id: `supervisor-${j % 5}`,
            name: `Supervisor ${j % 5}`,
            specialization: randomSpec,
          },
          diversityBoost: Math.random() * 0.2,
        });
      }

      const profileSnapshot: StudentProfileSnapshot = {
        skills: ['BulkSkill1', 'BulkSkill2', 'BulkSkill3'],
        interests: ['BulkInterest1', 'BulkInterest2'],
        specializations: [randomMainSpec],
        profileCompleteness:
          Math.round((Math.random() * 0.5 + 0.5) * 100) / 100,
        snapshotDate: new Date(),
      };

      recommendations.push({
        studentId: `bulk-student-${i}`,
        projectSuggestions,
        reasoning: `Bulk generated recommendation ${i}`,
        averageSimilarityScore:
          projectSuggestions.reduce((sum, p) => sum + p.similarityScore, 0) /
          projectSuggestions.length,
        profileSnapshot,
        status: RecommendationStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    return recommendations;
  }

  static createBulkFeedback(
    recommendationIds: string[],
    projectIds: string[],
  ): Partial<RecommendationFeedback>[] {
    const feedback: Partial<RecommendationFeedback>[] = [];
    const feedbackTypes = Object.values(FeedbackType);

    for (const recommendationId of recommendationIds) {
      // Each recommendation gets 0-5 feedback items
      const feedbackCount = Math.floor(Math.random() * 6);

      for (let i = 0; i < feedbackCount; i++) {
        const randomProjectId =
          projectIds[Math.floor(Math.random() * projectIds.length)];
        const randomFeedbackType =
          feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)];

        let rating: number | null = null;
        let comment: string | null = null;

        if (randomFeedbackType === FeedbackType.RATING) {
          rating = Math.round((Math.random() * 4 + 1) * 10) / 10; // 1.0-5.0
        }

        if (Math.random() > 0.5) {
          comment = `Bulk generated feedback comment for ${recommendationId}`;
        }

        feedback.push({
          recommendationId,
          projectId: randomProjectId,
          feedbackType: randomFeedbackType,
          rating,
          comment,
        });
      }
    }

    return feedback;
  }

  static createBulkAIApiUsage(count: number): Partial<AIApiUsage>[] {
    const usage: Partial<AIApiUsage>[] = [];
    const endpoints = ['/v1/embeddings', '/v1/similarity', '/v1/models'];
    const models = [
      'sentence-transformers/all-MiniLM-L6-v2',
      'sentence-transformers/all-mpnet-base-v2',
    ];

    for (let i = 0; i < count; i++) {
      const randomEndpoint =
        endpoints[Math.floor(Math.random() * endpoints.length)];
      const randomModel = models[Math.floor(Math.random() * models.length)];
      const isSuccess = Math.random() > 0.1; // 90% success rate

      usage.push({
        endpoint: randomEndpoint,
        model: randomModel,
        tokensUsed: Math.floor(Math.random() * 500) + 50, // 50-550 tokens
        responseTimeMs: Math.floor(Math.random() * 3000) + 500, // 500-3500ms
        success: isSuccess,
        errorMessage: isSuccess ? null : 'Simulated API error',
        userId: `bulk-user-${i % 100}`, // Distribute across 100 users
      });
    }

    return usage;
  }

  // Performance Test Data Generator
  static generateRecommendationPerformanceData(
    studentCount: number,
    projectCount: number,
  ) {
    const studentIds = Array.from(
      { length: studentCount },
      (_, i) => `perf-student-${i}`,
    );
    const projectIds = Array.from(
      { length: projectCount },
      (_, i) => `perf-project-${i}`,
    );
    const recommendationIds = Array.from(
      { length: studentCount },
      (_, i) => `perf-recommendation-${i}`,
    );

    return {
      students: this.createDiverseStudentProfiles().concat(
        Array.from({ length: studentCount - 5 }, (_, i) => ({
          name: `Performance Student ${i + 6}`,
          skills: ['Skill1', 'Skill2', 'Skill3'],
          interests: ['Interest1', 'Interest2'],
          preferredSpecializations: [
            SPECIALIZATIONS[i % SPECIALIZATIONS.length],
          ],
          currentYear: 4,
          gpa: 3.5,
        })),
      ),
      projects: this.createDiverseTestProjects().concat(
        Array.from({ length: projectCount - 5 }, (_, i) => ({
          title: `Performance Project ${i + 6}`,
          abstract: `Performance test project abstract ${i + 6}`,
          specialization: SPECIALIZATIONS[i % SPECIALIZATIONS.length],
          difficultyLevel: DifficultyLevel.INTERMEDIATE,
          year: 2024,
          tags: ['Performance', 'Test'],
          technologyStack: ['Tech1', 'Tech2'],
          isGroupProject: false,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: `perf-supervisor-${i % 10}`,
        })),
      ),
      recommendations: this.createBulkRecommendations(studentCount),
      feedback: this.createBulkFeedback(recommendationIds, projectIds),
      apiUsage: this.createBulkAIApiUsage(studentCount * 10), // 10 API calls per student
    };
  }
}
