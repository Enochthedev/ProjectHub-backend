import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { RecommendationFixtures } from '../fixtures';
import {
  DataGeneratorUtil,
  DataGenerationOptions,
} from './data-generator.util';
import { UserRole, ApprovalStatus } from '../../common/enums';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export interface RecommendationSeedOptions {
  includeRealisticScenarios?: boolean;
  includeDiverseProfiles?: boolean;
  includePerformanceData?: boolean;
  performanceDataSize?: 'small' | 'medium' | 'large';
}

@Injectable()
export class RecommendationSeederService {
  private dataGenerator: DataGeneratorUtil;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(StudentProfile)
    private studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(SupervisorProfile)
    private supervisorProfileRepository: Repository<SupervisorProfile>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationFeedback)
    private feedbackRepository: Repository<RecommendationFeedback>,
    @InjectRepository(AIApiUsage)
    private apiUsageRepository: Repository<AIApiUsage>,
  ) {
    this.dataGenerator = new DataGeneratorUtil(
      this.userRepository,
      this.studentProfileRepository,
      this.supervisorProfileRepository,
      this.projectRepository,
      this.recommendationRepository,
      this.feedbackRepository,
      this.apiUsageRepository,
    );
  }

  /**
   * Seed comprehensive recommendation test data
   */
  async seedRecommendationData(
    options: RecommendationSeedOptions = {},
  ): Promise<void> {
    console.log('Starting recommendation data seeding...');

    // Clean existing test data
    await this.cleanupExistingTestData();

    // Seed basic data
    await this.seedBasicRecommendationData();

    if (options.includeRealisticScenarios) {
      await this.seedRealisticScenarios();
    }

    if (options.includeDiverseProfiles) {
      await this.seedDiverseProfiles();
    }

    if (options.includePerformanceData) {
      await this.seedPerformanceData(options.performanceDataSize || 'medium');
    }

    console.log('Recommendation data seeding completed!');
  }

  /**
   * Seed basic recommendation test data
   */
  private async seedBasicRecommendationData(): Promise<void> {
    console.log('Seeding basic recommendation data...');

    // Create supervisors for each specialization
    const supervisors = await this.createSupervisorsForAllSpecializations();
    console.log(`Created ${supervisors.length} supervisors`);

    // Create diverse student profiles
    const students = await this.createDiverseStudents();
    console.log(`Created ${students.length} students`);

    // Create projects for each specialization and difficulty level
    const projects =
      await this.createProjectsForAllSpecializations(supervisors);
    console.log(`Created ${projects.length} projects`);

    // Create sample recommendations
    const recommendations = await this.createSampleRecommendations(
      students,
      projects,
    );
    console.log(`Created ${recommendations.length} recommendations`);

    // Create sample feedback
    const feedback = await this.createSampleFeedback(recommendations, projects);
    console.log(`Created ${feedback.length} feedback entries`);

    // Create sample API usage data
    const apiUsage = await this.createSampleApiUsage(students);
    console.log(`Created ${apiUsage.length} API usage entries`);
  }

  /**
   * Seed realistic test scenarios for recommendation testing
   */
  private async seedRealisticScenarios(): Promise<void> {
    console.log('Seeding realistic recommendation scenarios...');

    const scenarios =
      await this.dataGenerator.generateRecommendationScenarios();

    // Create recommendations for each scenario
    for (const [scenarioName, scenario] of Object.entries(scenarios)) {
      console.log(`Creating recommendations for ${scenarioName}...`);

      const recommendationData =
        RecommendationFixtures.createTestRecommendation({
          studentId: scenario.student.id,
          projectSuggestions: scenario.projects.map((project, index) => ({
            projectId: project.id,
            title: project.title,
            abstract: project.abstract,
            specialization: project.specialization,
            difficultyLevel: project.difficultyLevel,
            similarityScore: this.calculateScenarioSimilarityScore(
              scenarioName,
              index,
            ),
            matchingSkills: this.extractMatchingSkills(
              scenario.student,
              project,
            ),
            matchingInterests: this.extractMatchingInterests(
              scenario.student,
              project,
            ),
            reasoning: this.generateScenarioReasoning(scenarioName, project),
            supervisor: {
              id: project.supervisorId,
              name: `Supervisor for ${project.specialization}`,
              specialization: project.specialization,
            },
            diversityBoost: scenarioName === 'diversityScenario' ? 0.2 : 0.0,
          })),
        });

      await this.recommendationRepository.save(recommendationData);
    }
  }

  /**
   * Seed diverse student and project profiles for comprehensive testing
   */
  private async seedDiverseProfiles(): Promise<void> {
    console.log('Seeding diverse profiles...');

    const diverseStudents =
      RecommendationFixtures.createDiverseStudentProfiles();
    const diverseProjects = RecommendationFixtures.createDiverseTestProjects();

    // Create users for diverse students
    for (const studentProfile of diverseStudents) {
      const userData = {
        email: `${studentProfile.name?.toLowerCase().replace(/\s+/g, '.')}@ui.edu.ng`,
        password: 'hashedPassword123',
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isActive: true,
      };

      const user = await this.userRepository.save(userData);
      await this.studentProfileRepository.save({
        ...studentProfile,
        user,
      });
    }

    // Create diverse projects with existing supervisors
    const supervisors = await this.userRepository.find({
      where: { role: UserRole.SUPERVISOR },
    });

    for (const projectData of diverseProjects) {
      const randomSupervisor =
        supervisors[Math.floor(Math.random() * supervisors.length)];
      await this.projectRepository.save({
        ...projectData,
        supervisorId: randomSupervisor.id,
        approvalStatus: ApprovalStatus.APPROVED,
      });
    }
  }

  /**
   * Seed performance test data
   */
  private async seedPerformanceData(
    size: 'small' | 'medium' | 'large',
  ): Promise<void> {
    console.log(`Seeding ${size} performance test data...`);

    const sizeConfig = {
      small: {
        students: 50,
        supervisors: 10,
        projects: 100,
        recommendations: 50,
      },
      medium: {
        students: 200,
        supervisors: 25,
        projects: 500,
        recommendations: 200,
      },
      large: {
        students: 1000,
        supervisors: 50,
        projects: 2000,
        recommendations: 1000,
      },
    };

    const config = sizeConfig[size];

    const options: DataGenerationOptions = {
      studentCount: config.students,
      supervisorCount: config.supervisors,
      projectCount: config.projects,
      recommendationCount: config.recommendations,
      feedbackCount: config.recommendations * 2, // 2 feedback per recommendation on average
      apiUsageCount: config.students * 10, // 10 API calls per student
      batchSize: 50,
    };

    await this.dataGenerator.generateRecommendationTestData(options);
  }

  /**
   * Clean up existing test data
   */
  private async cleanupExistingTestData(): Promise<void> {
    console.log('Cleaning up existing test data...');

    // Delete test data (identified by test email patterns)
    await this.apiUsageRepository
      .createQueryBuilder()
      .delete()
      .where('user_id IN (SELECT id FROM users WHERE email LIKE :pattern)', {
        pattern: '%@ui.edu.ng',
      })
      .execute();

    await this.feedbackRepository
      .createQueryBuilder()
      .delete()
      .where(
        'recommendation_id IN (SELECT id FROM recommendations WHERE student_id IN (SELECT id FROM users WHERE email LIKE :pattern))',
        {
          pattern: '%@ui.edu.ng',
        },
      )
      .execute();

    await this.recommendationRepository
      .createQueryBuilder()
      .delete()
      .where('student_id IN (SELECT id FROM users WHERE email LIKE :pattern)', {
        pattern: '%@ui.edu.ng',
      })
      .execute();

    await this.projectRepository
      .createQueryBuilder()
      .delete()
      .where(
        'supervisor_id IN (SELECT id FROM users WHERE email LIKE :pattern)',
        {
          pattern: '%@ui.edu.ng',
        },
      )
      .execute();

    await this.studentProfileRepository
      .createQueryBuilder()
      .delete()
      .where('user_id IN (SELECT id FROM users WHERE email LIKE :pattern)', {
        pattern: '%@ui.edu.ng',
      })
      .execute();

    await this.supervisorProfileRepository
      .createQueryBuilder()
      .delete()
      .where('user_id IN (SELECT id FROM users WHERE email LIKE :pattern)', {
        pattern: '%@ui.edu.ng',
      })
      .execute();

    await this.userRepository
      .createQueryBuilder()
      .delete()
      .where('email LIKE :pattern', { pattern: '%@ui.edu.ng' })
      .execute();
  }

  // Helper methods

  private async createSupervisorsForAllSpecializations(): Promise<User[]> {
    const supervisors: User[] = [];

    for (const specialization of SPECIALIZATIONS) {
      const userData = {
        email: `supervisor.${specialization.toLowerCase().replace(/\s+/g, '.')}@ui.edu.ng`,
        password: 'hashedPassword123',
        role: UserRole.SUPERVISOR,
        isEmailVerified: true,
        isActive: true,
      };

      const user = await this.userRepository.save(userData);

      const profileData = {
        name: `${specialization} Supervisor`,
        specializations: [specialization],
        maxStudents: 8,
        isAvailable: true,
        officeLocation: `${specialization} Department`,
        phoneNumber: '+234-800-000-0000',
        user,
      };

      await this.supervisorProfileRepository.save(profileData);
      supervisors.push(user);
    }

    return supervisors;
  }

  private async createDiverseStudents(): Promise<User[]> {
    const students: User[] = [];
    const diverseProfiles =
      RecommendationFixtures.createDiverseStudentProfiles();

    for (const profile of diverseProfiles) {
      const userData = {
        email: `${profile.name?.toLowerCase().replace(/\s+/g, '.')}@ui.edu.ng`,
        password: 'hashedPassword123',
        role: UserRole.STUDENT,
        isEmailVerified: true,
        isActive: true,
      };

      const user = await this.userRepository.save(userData);
      await this.studentProfileRepository.save({
        ...profile,
        user,
      });

      students.push(user);
    }

    return students;
  }

  private async createProjectsForAllSpecializations(
    supervisors: User[],
  ): Promise<Project[]> {
    const projects: Project[] = [];
    const diverseProjects = RecommendationFixtures.createDiverseTestProjects();

    // Create the diverse projects first
    for (const projectData of diverseProjects) {
      const supervisor =
        supervisors.find((s) =>
          s.supervisorProfile?.specializations?.includes(
            projectData.specialization || '',
          ),
        ) || supervisors[0];

      const project = await this.projectRepository.save({
        ...projectData,
        supervisorId: supervisor.id,
        approvalStatus: ApprovalStatus.APPROVED,
      });

      projects.push(project);
    }

    // Create additional projects for comprehensive coverage
    for (const specialization of SPECIALIZATIONS) {
      const supervisor =
        supervisors.find((s) =>
          s.supervisorProfile?.specializations?.includes(specialization || ''),
        ) || supervisors[0];

      for (let i = 0; i < 3; i++) {
        const projectData = {
          title: `${specialization} Test Project ${i + 1}`,
          abstract: `A comprehensive test project in ${specialization} that demonstrates various concepts and technologies in this field.`,
          specialization,
          difficultyLevel: ['beginner', 'intermediate', 'advanced'][i] as any,
          year: 2024,
          tags: [specialization.split(' ')[0], 'Test', 'Sample'],
          technologyStack: ['Technology1', 'Technology2', 'Technology3'],
          isGroupProject: i % 2 === 0,
          approvalStatus: ApprovalStatus.APPROVED,
          supervisorId: supervisor.id,
        };

        const project = await this.projectRepository.save(projectData);
        projects.push(project);
      }
    }

    return projects;
  }

  private async createSampleRecommendations(
    students: User[],
    projects: Project[],
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const student of students.slice(0, 5)) {
      // Create recommendations for first 5 students
      const studentProjects = projects.slice(0, 5); // Recommend first 5 projects

      const recommendationData =
        RecommendationFixtures.createTestRecommendation({
          studentId: student.id,
          projectSuggestions: studentProjects.map((project, index) => ({
            projectId: project.id,
            title: project.title,
            abstract: project.abstract,
            specialization: project.specialization,
            difficultyLevel: project.difficultyLevel,
            similarityScore: 0.9 - index * 0.1, // Decreasing similarity
            matchingSkills: ['Skill1', 'Skill2'],
            matchingInterests: ['Interest1', 'Interest2'],
            reasoning: `This project matches your interests in ${project.specialization}`,
            supervisor: {
              id: project.supervisorId,
              name: `Supervisor for ${project.specialization}`,
              specialization: project.specialization,
            },
          })),
        });

      const recommendation =
        await this.recommendationRepository.save(recommendationData);
      recommendations.push(recommendation);
    }

    return recommendations;
  }

  private async createSampleFeedback(
    recommendations: Recommendation[],
    projects: Project[],
  ): Promise<RecommendationFeedback[]> {
    const feedback: RecommendationFeedback[] = [];

    for (const recommendation of recommendations) {
      // Create 2-3 feedback entries per recommendation
      const feedbackCount = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < feedbackCount; i++) {
        const project = projects[i % projects.length];
        const feedbackData =
          RecommendationFixtures.createTestRecommendationFeedback({
            recommendationId: recommendation.id,
            projectId: project.id,
          });

        const feedbackEntry = await this.feedbackRepository.save(feedbackData);
        feedback.push(feedbackEntry);
      }
    }

    return feedback;
  }

  private async createSampleApiUsage(students: User[]): Promise<AIApiUsage[]> {
    const apiUsage: AIApiUsage[] = [];

    for (const student of students) {
      // Create 5-10 API usage entries per student
      const usageCount = Math.floor(Math.random() * 6) + 5;

      for (let i = 0; i < usageCount; i++) {
        const usageData = RecommendationFixtures.createTestAIApiUsage({
          userId: student.id,
        });

        const usage = await this.apiUsageRepository.save(usageData);
        apiUsage.push(usage);
      }
    }

    return apiUsage;
  }

  private calculateScenarioSimilarityScore(
    scenarioName: string,
    index: number,
  ): number {
    const baseScores = {
      perfectMatchScenario: 0.95,
      partialMatchScenario: 0.65,
      poorMatchScenario: 0.25,
      diversityScenario: 0.75,
    };

    return Math.max(0.1, (baseScores[scenarioName] || 0.5) - index * 0.05);
  }

  private extractMatchingSkills(student: User, project: Project): string[] {
    // Simplified skill matching for test data
    const studentSkills = student.studentProfile?.skills || [];
    const projectTech = project.technologyStack || [];

    return studentSkills
      .filter((skill) =>
        projectTech.some(
          (tech) =>
            skill.toLowerCase().includes(tech.toLowerCase()) ||
            tech.toLowerCase().includes(skill.toLowerCase()),
        ),
      )
      .slice(0, 3);
  }

  private extractMatchingInterests(student: User, project: Project): string[] {
    // Simplified interest matching for test data
    const studentInterests = student.studentProfile?.interests || [];
    const projectTags = project.tags || [];

    return studentInterests
      .filter((interest) =>
        projectTags.some(
          (tag) =>
            interest.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(interest.toLowerCase()),
        ),
      )
      .slice(0, 2);
  }

  private generateScenarioReasoning(
    scenarioName: string,
    project: Project,
  ): string {
    const reasoningTemplates = {
      perfectMatchScenario: `This project is an excellent match for your skills and interests in ${project.specialization}. Your background aligns perfectly with the project requirements.`,
      partialMatchScenario: `This project offers good learning opportunities in ${project.specialization}, building on your existing skills while introducing new concepts.`,
      poorMatchScenario: `While this project in ${project.specialization} may be challenging given your current background, it could provide valuable learning experiences.`,
      diversityScenario: `This ${project.specialization} project offers great diversity to your learning portfolio and complements your broad interests.`,
    };

    return (
      reasoningTemplates[scenarioName] ||
      `This project in ${project.specialization} matches your profile.`
    );
  }
}
