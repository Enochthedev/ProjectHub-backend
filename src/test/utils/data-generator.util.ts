import { Repository } from 'typeorm';
import {
  User,
  StudentProfile,
  SupervisorProfile,
  Project,
  Recommendation,
  RecommendationFeedback,
  AIApiUsage,
} from '../../entities';
import {
  UserFixtures,
  ProjectFixtures,
  RecommendationFixtures,
} from '../fixtures';
import { UserRole, ApprovalStatus } from '../../common/enums';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export interface DataGenerationOptions {
  studentCount: number;
  supervisorCount: number;
  projectCount: number;
  recommendationCount: number;
  feedbackCount: number;
  apiUsageCount: number;
  batchSize?: number;
}

export interface GeneratedDataSummary {
  studentsCreated: number;
  supervisorsCreated: number;
  projectsCreated: number;
  recommendationsCreated: number;
  feedbackCreated: number;
  apiUsageCreated: number;
  totalExecutionTime: number;
  averageTimePerBatch: number;
}

export class DataGeneratorUtil {
  constructor(
    private userRepository: Repository<User>,
    private studentProfileRepository: Repository<StudentProfile>,
    private supervisorProfileRepository: Repository<SupervisorProfile>,
    private projectRepository: Repository<Project>,
    private recommendationRepository: Repository<Recommendation>,
    private feedbackRepository: Repository<RecommendationFeedback>,
    private apiUsageRepository: Repository<AIApiUsage>,
  ) {}

  /**
   * Generate comprehensive test data for recommendation system testing
   */
  async generateRecommendationTestData(
    options: DataGenerationOptions,
  ): Promise<GeneratedDataSummary> {
    const startTime = Date.now();
    const batchSize = options.batchSize || 50;
    let batchCount = 0;
    const batchTimes: number[] = [];

    console.log('Starting comprehensive test data generation...');

    // Step 1: Create supervisors first (needed for projects)
    console.log(`Creating ${options.supervisorCount} supervisors...`);
    const supervisors = await this.createSupervisorsInBatches(
      options.supervisorCount,
      batchSize,
    );
    batchCount++;

    // Step 2: Create students
    console.log(`Creating ${options.studentCount} students...`);
    const students = await this.createStudentsInBatches(
      options.studentCount,
      batchSize,
    );
    batchCount++;

    // Step 3: Create projects
    console.log(`Creating ${options.projectCount} projects...`);
    const projects = await this.createProjectsInBatches(
      options.projectCount,
      supervisors.map((s) => s.id),
      batchSize,
    );
    batchCount++;

    // Step 4: Create recommendations
    console.log(`Creating ${options.recommendationCount} recommendations...`);
    const recommendations = await this.createRecommendationsInBatches(
      options.recommendationCount,
      students.map((s) => s.id),
      projects.map((p) => p.id),
      batchSize,
    );
    batchCount++;

    // Step 5: Create feedback
    console.log(`Creating ${options.feedbackCount} feedback entries...`);
    const feedback = await this.createFeedbackInBatches(
      options.feedbackCount,
      recommendations.map((r) => r.id),
      projects.map((p) => p.id),
      batchSize,
    );
    batchCount++;

    // Step 6: Create API usage data
    console.log(`Creating ${options.apiUsageCount} API usage entries...`);
    const apiUsage = await this.createApiUsageInBatches(
      options.apiUsageCount,
      students.map((s) => s.id),
      batchSize,
    );
    batchCount++;

    const totalTime = Date.now() - startTime;
    const averageTimePerBatch =
      batchTimes.length > 0
        ? batchTimes.reduce((sum, time) => sum + time, 0) / batchTimes.length
        : 0;

    console.log('Test data generation completed!');

    return {
      studentsCreated: students.length,
      supervisorsCreated: supervisors.length,
      projectsCreated: projects.length,
      recommendationsCreated: recommendations.length,
      feedbackCreated: feedback.length,
      apiUsageCreated: apiUsage.length,
      totalExecutionTime: totalTime,
      averageTimePerBatch,
    };
  }

  /**
   * Generate realistic recommendation test scenarios
   */
  async generateRecommendationScenarios(): Promise<{
    perfectMatchScenario: { student: User; projects: Project[] };
    partialMatchScenario: { student: User; projects: Project[] };
    poorMatchScenario: { student: User; projects: Project[] };
    diversityScenario: { student: User; projects: Project[] };
  }> {
    console.log('Generating recommendation test scenarios...');

    // Perfect Match Scenario: AI student with AI projects
    const aiStudent = await this.createSpecificStudent({
      email: 'ai.student@ui.edu.ng',
      profile: {
        name: 'AI Enthusiast',
        skills: ['Python', 'TensorFlow', 'Machine Learning', 'Deep Learning'],
        interests: ['Artificial Intelligence', 'Computer Vision', 'NLP'],
        preferredSpecializations: [
          'Artificial Intelligence & Machine Learning',
        ],
        currentYear: 4,
        gpa: 3.9,
      },
    });

    const aiProjects = await this.createSpecificProjects([
      {
        title: 'Deep Learning Image Recognition System',
        specialization: 'Artificial Intelligence & Machine Learning',
        tags: ['Deep Learning', 'Computer Vision', 'Image Recognition'],
        technologyStack: ['Python', 'TensorFlow', 'OpenCV'],
      },
      {
        title: 'Natural Language Processing Chatbot',
        specialization: 'Artificial Intelligence & Machine Learning',
        tags: ['NLP', 'Chatbot', 'Machine Learning'],
        technologyStack: ['Python', 'NLTK', 'TensorFlow'],
      },
    ]);

    // Partial Match Scenario: Web developer with mobile projects
    const webStudent = await this.createSpecificStudent({
      email: 'web.student@ui.edu.ng',
      profile: {
        name: 'Web Developer',
        skills: ['JavaScript', 'React', 'Node.js', 'CSS'],
        interests: ['Web Development', 'User Experience', 'Frontend'],
        preferredSpecializations: ['Web Development & Full Stack'],
        currentYear: 4,
        gpa: 3.7,
      },
    });

    const mobileProjects = await this.createSpecificProjects([
      {
        title: 'Cross-Platform Mobile App',
        specialization: 'Mobile Application Development',
        tags: ['Mobile Development', 'Cross-platform', 'User Experience'],
        technologyStack: ['React Native', 'JavaScript', 'Firebase'],
      },
      {
        title: 'Progressive Web Application',
        specialization: 'Web Development & Full Stack',
        tags: ['PWA', 'Web Development', 'Mobile-first'],
        technologyStack: ['JavaScript', 'React', 'Service Workers'],
      },
    ]);

    // Poor Match Scenario: Backend developer with AI projects
    const backendStudent = await this.createSpecificStudent({
      email: 'backend.student@ui.edu.ng',
      profile: {
        name: 'Backend Developer',
        skills: ['Java', 'Spring Boot', 'MySQL', 'REST APIs'],
        interests: [
          'Backend Development',
          'Database Design',
          'API Development',
        ],
        preferredSpecializations: ['Software Engineering & Architecture'],
        currentYear: 3,
        gpa: 3.5,
      },
    });

    // Diversity Scenario: Student with broad interests
    const diverseStudent = await this.createSpecificStudent({
      email: 'diverse.student@ui.edu.ng',
      profile: {
        name: 'Diverse Learner',
        skills: ['Python', 'JavaScript', 'SQL', 'Git'],
        interests: ['Technology', 'Innovation', 'Problem Solving'],
        preferredSpecializations: [
          'Web Development & Full Stack',
          'Data Science & Analytics',
          'Artificial Intelligence & Machine Learning',
        ],
        currentYear: 4,
        gpa: 3.6,
      },
    });

    const diverseProjects = await this.createSpecificProjects([
      {
        title: 'Web-based Data Visualization Tool',
        specialization: 'Data Science & Analytics',
        tags: ['Data Visualization', 'Web Development', 'Analytics'],
        technologyStack: ['JavaScript', 'D3.js', 'Python', 'Flask'],
      },
      {
        title: 'AI-Powered Web Application',
        specialization: 'Artificial Intelligence & Machine Learning',
        tags: ['AI', 'Web Development', 'Machine Learning'],
        technologyStack: ['Python', 'TensorFlow', 'React', 'Flask'],
      },
      {
        title: 'Full-Stack E-commerce Platform',
        specialization: 'Web Development & Full Stack',
        tags: ['E-commerce', 'Full Stack', 'Database Design'],
        technologyStack: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
      },
    ]);

    return {
      perfectMatchScenario: { student: aiStudent, projects: aiProjects },
      partialMatchScenario: { student: webStudent, projects: mobileProjects },
      poorMatchScenario: { student: backendStudent, projects: aiProjects },
      diversityScenario: { student: diverseStudent, projects: diverseProjects },
    };
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData(): Promise<void> {
    console.log('Cleaning up test data...');

    // Delete in reverse order of dependencies
    await this.apiUsageRepository.delete({});
    await this.feedbackRepository.delete({});
    await this.recommendationRepository.delete({});
    await this.projectRepository.delete({});
    await this.studentProfileRepository.delete({});
    await this.supervisorProfileRepository.delete({});
    await this.userRepository.delete({});

    console.log('Test data cleanup completed.');
  }

  // Private helper methods

  private async createStudentsInBatches(
    count: number,
    batchSize: number,
  ): Promise<User[]> {
    const students: User[] = [];
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const batchUsers = await UserFixtures.createMultipleStudents(batchCount);
      const batchProfiles =
        UserFixtures.createMultipleStudentProfiles(batchCount);

      // Create users first
      const createdUsers = await this.userRepository.save(batchUsers);

      // Create profiles with user references
      const profilesWithUsers = batchProfiles.map((profile, index) => ({
        ...profile,
        user: createdUsers[index],
      }));

      await this.studentProfileRepository.save(profilesWithUsers);

      students.push(...createdUsers);

      // Progress logging
      console.log(
        `Created student batch ${i + 1}/${batches} (${students.length}/${count})`,
      );
    }

    return students;
  }

  private async createSupervisorsInBatches(
    count: number,
    batchSize: number,
  ): Promise<User[]> {
    const supervisors: User[] = [];
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const batchUsers =
        await UserFixtures.createMultipleSupervisors(batchCount);
      const batchProfiles =
        UserFixtures.createMultipleSupervisorProfiles(batchCount);

      // Create users first
      const createdUsers = await this.userRepository.save(batchUsers);

      // Create profiles with user references
      const profilesWithUsers = batchProfiles.map((profile, index) => ({
        ...profile,
        user: createdUsers[index],
      }));

      await this.supervisorProfileRepository.save(profilesWithUsers);

      supervisors.push(...createdUsers);

      console.log(
        `Created supervisor batch ${i + 1}/${batches} (${supervisors.length}/${count})`,
      );
    }

    return supervisors;
  }

  private async createProjectsInBatches(
    count: number,
    supervisorIds: string[],
    batchSize: number,
  ): Promise<Project[]> {
    const projects: Project[] = [];
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const batchProjects = ProjectFixtures.createMultipleProjects(batchCount);

      // Assign random supervisors
      const projectsWithSupervisors = batchProjects.map((project) => ({
        ...project,
        supervisorId:
          supervisorIds[Math.floor(Math.random() * supervisorIds.length)],
      }));

      const createdProjects = await this.projectRepository.save(
        projectsWithSupervisors,
      );
      projects.push(...createdProjects);

      console.log(
        `Created project batch ${i + 1}/${batches} (${projects.length}/${count})`,
      );
    }

    return projects;
  }

  private async createRecommendationsInBatches(
    count: number,
    studentIds: string[],
    projectIds: string[],
    batchSize: number,
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const batchRecommendations =
        RecommendationFixtures.createBulkRecommendations(batchCount);

      // Assign random students
      const recommendationsWithStudents = batchRecommendations.map(
        (rec, index) => ({
          ...rec,
          studentId: studentIds[Math.floor(Math.random() * studentIds.length)],
        }),
      );

      const createdRecommendations = await this.recommendationRepository.save(
        recommendationsWithStudents,
      );
      recommendations.push(...createdRecommendations);

      console.log(
        `Created recommendation batch ${i + 1}/${batches} (${recommendations.length}/${count})`,
      );
    }

    return recommendations;
  }

  private async createFeedbackInBatches(
    count: number,
    recommendationIds: string[],
    projectIds: string[],
    batchSize: number,
  ): Promise<RecommendationFeedback[]> {
    const feedback: RecommendationFeedback[] = [];
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const batchFeedback = RecommendationFixtures.createBulkFeedback(
        recommendationIds.slice(
          0,
          Math.min(recommendationIds.length, batchCount),
        ),
        projectIds,
      );

      const createdFeedback = await this.feedbackRepository.save(batchFeedback);
      feedback.push(...createdFeedback);

      console.log(
        `Created feedback batch ${i + 1}/${batches} (${feedback.length}/${count})`,
      );
    }

    return feedback;
  }

  private async createApiUsageInBatches(
    count: number,
    userIds: string[],
    batchSize: number,
  ): Promise<AIApiUsage[]> {
    const apiUsage: AIApiUsage[] = [];
    const batches = Math.ceil(count / batchSize);

    for (let i = 0; i < batches; i++) {
      const batchStart = i * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);
      const batchCount = batchEnd - batchStart;

      const batchUsage =
        RecommendationFixtures.createBulkAIApiUsage(batchCount);

      // Assign random users
      const usageWithUsers = batchUsage.map((usage) => ({
        ...usage,
        userId: userIds[Math.floor(Math.random() * userIds.length)],
      }));

      const createdUsage = await this.apiUsageRepository.save(usageWithUsers);
      apiUsage.push(...createdUsage);

      console.log(
        `Created API usage batch ${i + 1}/${batches} (${apiUsage.length}/${count})`,
      );
    }

    return apiUsage;
  }

  private async createSpecificStudent(data: {
    email: string;
    profile: Partial<StudentProfile>;
  }): Promise<User> {
    const userData = await UserFixtures.createTestStudent({
      email: data.email,
    });
    const user = await this.userRepository.save(userData);

    const profileData = {
      ...data.profile,
      user,
    };
    await this.studentProfileRepository.save(profileData);

    return user;
  }

  private async createSpecificProjects(
    projectsData: Array<{
      title: string;
      specialization: string;
      tags: string[];
      technologyStack: string[];
    }>,
  ): Promise<Project[]> {
    // Get a random supervisor for these projects
    const supervisors = await this.userRepository.find({
      where: { role: UserRole.SUPERVISOR },
      take: 1,
    });

    if (supervisors.length === 0) {
      throw new Error(
        'No supervisors available for creating specific projects',
      );
    }

    const supervisorId = supervisors[0].id;

    const projects = projectsData.map((data) => ({
      ...ProjectFixtures.createTestProject(),
      title: data.title,
      specialization: data.specialization,
      tags: data.tags,
      technologyStack: data.technologyStack,
      supervisorId,
      approvalStatus: ApprovalStatus.APPROVED,
    }));

    return await this.projectRepository.save(projects);
  }
}

/**
 * Factory function to create DataGeneratorUtil with repositories
 */
export function createDataGenerator(repositories: {
  userRepository: Repository<User>;
  studentProfileRepository: Repository<StudentProfile>;
  supervisorProfileRepository: Repository<SupervisorProfile>;
  projectRepository: Repository<Project>;
  recommendationRepository: Repository<Recommendation>;
  feedbackRepository: Repository<RecommendationFeedback>;
  apiUsageRepository: Repository<AIApiUsage>;
}): DataGeneratorUtil {
  return new DataGeneratorUtil(
    repositories.userRepository,
    repositories.studentProfileRepository,
    repositories.supervisorProfileRepository,
    repositories.projectRepository,
    repositories.recommendationRepository,
    repositories.feedbackRepository,
    repositories.apiUsageRepository,
  );
}
