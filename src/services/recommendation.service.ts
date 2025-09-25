import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Recommendation } from '../entities/recommendation.entity';
import { RecommendationFeedback } from '../entities/recommendation-feedback.entity';
import { User } from '../entities/user.entity';
import { Project } from '../entities/project.entity';
import { StudentProfile } from '../entities/student-profile.entity';

import { EmbeddingService } from './embedding.service';
import { SimilarityService } from './similarity.service';
import { TextProcessingService } from './text-processing.service';
import { RecommendationCacheService } from './recommendation-cache.service';
import { FeedbackLearningService } from './feedback-learning.service';
import {
  ExplanationService,
  AccessibleExplanation,
} from './explanation.service';
import {
  ProgressiveLoadingService,
  LoadingStage,
} from './progressive-loading.service';

import {
  GenerateRecommendationsDto,
  RecommendationResultDto,
  ProjectRecommendationDto,
  RecommendationFeedbackDto,
  RecommendationExplanationDto,
  RecommendationMetadata,
  SupervisorSummaryDto,
} from '../dto/recommendation';

import { RecommendationStatus } from '../common/enums/recommendation-status.enum';
import { FeedbackType } from '../common/enums/feedback-type.enum';
import { ApprovalStatus } from '../common/enums/approval-status.enum';

export interface RecommendationOptions {
  limit?: number;
  excludeSpecializations?: string[];
  includeSpecializations?: string[];
  maxDifficulty?: string;
  forceRefresh?: boolean;
  minSimilarityScore?: number;
  includeDiversityBoost?: boolean;
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    @InjectRepository(RecommendationFeedback)
    private readonly feedbackRepository: Repository<RecommendationFeedback>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    private readonly embeddingService: EmbeddingService,
    private readonly similarityService: SimilarityService,
    private readonly textProcessingService: TextProcessingService,
    private readonly cacheService: RecommendationCacheService,
    private readonly feedbackLearningService: FeedbackLearningService,
    private readonly explanationService: ExplanationService,
    private readonly progressiveLoadingService: ProgressiveLoadingService,
  ) {}

  /**
   * Generate recommendations for a student
   */
  async generateRecommendations(
    studentId: string,
    options: RecommendationOptions = {},
    requestId?: string,
  ): Promise<RecommendationResultDto> {
    const startTime = Date.now();
    const trackingId =
      requestId ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.debug(`Generating recommendations for student: ${studentId}`);

    // Start progress tracking
    if (requestId) {
      this.progressiveLoadingService.startRequest(trackingId, studentId);
      this.progressiveLoadingService.updateProgress(
        trackingId,
        LoadingStage.VALIDATING_PROFILE,
        5,
        'Starting recommendation generation...',
      );
    }

    // Check cache first unless force refresh is requested
    if (!options.forceRefresh) {
      const cached =
        await this.cacheService.getCachedRecommendations(studentId);
      if (cached) {
        this.logger.debug(
          `Returning cached recommendations for student: ${studentId}`,
        );
        if (requestId) {
          this.progressiveLoadingService.completeRequest(trackingId);
        }
        return cached;
      }
    }

    try {
      // Validate student exists and get profile
      if (requestId) {
        this.progressiveLoadingService.updateProgress(
          trackingId,
          LoadingStage.VALIDATING_PROFILE,
          15,
          'Validating your profile...',
        );
      }

      const student = await this.userRepository.findOne({
        where: { id: studentId },
        relations: ['studentProfile'],
      });

      if (!student) {
        if (requestId) {
          this.progressiveLoadingService.failRequest(
            trackingId,
            'Student not found',
          );
        }
        throw new NotFoundException('Student not found');
      }

      if (!student.studentProfile) {
        if (requestId) {
          this.progressiveLoadingService.failRequest(
            trackingId,
            'Student profile not found',
          );
        }
        throw new BadRequestException('Student profile not found');
      }

      // Validate profile completeness
      this.validateProfileCompleteness(student.studentProfile);

      // Get available projects
      if (requestId) {
        this.progressiveLoadingService.updateProgress(
          trackingId,
          LoadingStage.FETCHING_PROJECTS,
          25,
          'Finding available projects...',
        );
      }

      const projects = await this.getAvailableProjects(options);

      if (projects.length === 0) {
        if (requestId) {
          this.progressiveLoadingService.failRequest(
            trackingId,
            'No available projects found',
          );
        }
        throw new BadRequestException('No available projects found');
      }

      // Generate recommendations using AI
      const recommendations = await this.generateAIRecommendations(
        student.studentProfile,
        projects,
        options,
        requestId ? trackingId : undefined,
      );

      // Create recommendation result
      const result: RecommendationResultDto = {
        recommendations,
        reasoning: this.generateOverallReasoning(
          student.studentProfile,
          recommendations,
        ),
        averageSimilarityScore: this.calculateAverageScore(recommendations),
        fromCache: false,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
        metadata: {
          method: 'ai-embeddings',
          fallback: false,
          projectsAnalyzed: projects.length,
          cacheHitRate: 0, // Will be updated by embedding service
          processingTimeMs: Date.now() - startTime,
        },
      };

      // Save to database
      await this.saveRecommendation(studentId, result, student.studentProfile);

      // Cache the result
      await this.cacheService.setCachedRecommendations(studentId, result);

      this.logger.debug(
        `Generated ${recommendations.length} recommendations for student ${studentId} in ${result.metadata.processingTimeMs}ms`,
      );

      // Complete progress tracking
      if (requestId) {
        this.progressiveLoadingService.completeRequest(trackingId);
      }

      return result;
    } catch (error) {
      // Handle errors and update progress tracking
      if (requestId) {
        this.progressiveLoadingService.failRequest(
          trackingId,
          error.message || 'Unknown error occurred',
        );
      }
      throw error;
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateAIRecommendations(
    studentProfile: StudentProfile,
    projects: Project[],
    options: RecommendationOptions,
    trackingId?: string,
  ): Promise<ProjectRecommendationDto[]> {
    // Process student profile text
    if (trackingId) {
      this.progressiveLoadingService.updateProgress(
        trackingId,
        LoadingStage.GENERATING_EMBEDDINGS,
        35,
        'Analyzing your profile and interests...',
      );
    }

    const studentTextResult =
      this.textProcessingService.processStudentProfile(studentProfile);
    const studentText = studentTextResult.combined.text;

    // Process project texts
    const projectTexts = projects.map((project) => {
      const projectResult = this.textProcessingService.processProject(project);
      return projectResult.combined.text;
    });

    // Generate embeddings
    if (trackingId) {
      this.progressiveLoadingService.updateProgress(
        trackingId,
        LoadingStage.GENERATING_EMBEDDINGS,
        45,
        'Processing project information with AI...',
      );
    }

    const studentEmbeddingResult =
      await this.embeddingService.generateEmbeddings([studentText]);
    const projectEmbeddingResult =
      await this.embeddingService.generateEmbeddings(projectTexts);

    const studentEmbedding = studentEmbeddingResult.embeddings[0];
    const projectEmbeddings = projectEmbeddingResult.embeddings;

    // Calculate similarities
    if (trackingId) {
      this.progressiveLoadingService.updateProgress(
        trackingId,
        LoadingStage.CALCULATING_SIMILARITY,
        65,
        'Finding the best project matches...',
      );
    }

    const similarityResult = this.similarityService.calculateBatchSimilarity(
      studentEmbedding,
      projectEmbeddings,
      {
        normalizeScores: true,
        includeRanking: true,
        minThreshold: options.minSimilarityScore || 0.3,
        maxResults: options.limit || 10,
      },
    );

    // Get feedback-based adjustments
    const feedbackAdjustments =
      await this.feedbackLearningService.getRecommendationAdjustments(
        studentProfile.user?.id || '',
      );

    // Apply filters and ranking
    if (trackingId) {
      this.progressiveLoadingService.updateProgress(
        trackingId,
        LoadingStage.APPLYING_FILTERS,
        75,
        'Applying your preferences and filters...',
      );
    }

    // Create recommendations with diversity boost and feedback adjustments
    const recommendations: ProjectRecommendationDto[] = [];
    const usedSpecializations = new Set<string>();

    for (const index of similarityResult.rankedIndices) {
      const project = projects[index];
      const similarity = similarityResult.similarities[index];

      // Apply diversity boost if enabled
      let diversityBoost = 0;
      if (
        options.includeDiversityBoost &&
        !usedSpecializations.has(project.specialization)
      ) {
        diversityBoost = 0.1; // 10% boost for new specializations
        usedSpecializations.add(project.specialization);
      }

      // Apply feedback-based adjustments
      let feedbackAdjustment = feedbackAdjustments.scoreAdjustment;

      // Boost preferred specializations
      if (
        feedbackAdjustments.boostSpecializations.includes(
          project.specialization,
        )
      ) {
        feedbackAdjustment += 0.15; // 15% boost for preferred specializations
      }

      // Penalize disliked specializations
      if (
        feedbackAdjustments.penalizeSpecializations.includes(
          project.specialization,
        )
      ) {
        feedbackAdjustment -= 0.2; // 20% penalty for disliked specializations
      }

      const finalScore = Math.min(
        1.0,
        Math.max(
          0.0,
          similarity.normalizedScore + diversityBoost + feedbackAdjustment,
        ),
      );

      // Find matching skills and interests
      const matchingSkills = this.findMatchingSkills(studentProfile, project);
      const matchingInterests = this.findMatchingInterests(
        studentProfile,
        project,
      );

      const recommendation: ProjectRecommendationDto = {
        projectId: project.id,
        title: project.title,
        abstract: project.abstract,
        specialization: project.specialization,
        difficultyLevel: project.difficultyLevel,
        similarityScore: finalScore,
        matchingSkills,
        matchingInterests,
        reasoning: this.generateProjectReasoningWithFeedback(
          studentProfile,
          project,
          matchingSkills,
          matchingInterests,
          finalScore,
          feedbackAdjustments,
        ),
        supervisor: {
          id: project.supervisor.id,
          name: project.supervisor.supervisorProfile?.name || 'Unknown',
          specialization:
            project.supervisor.supervisorProfile?.specializations?.[0] ||
            'General',
        },
        diversityBoost: diversityBoost > 0 ? diversityBoost : undefined,
      };

      recommendations.push(recommendation);

      if (recommendations.length >= (options.limit || 10)) {
        break;
      }
    }

    // Generate explanations
    if (trackingId) {
      this.progressiveLoadingService.updateProgress(
        trackingId,
        LoadingStage.GENERATING_EXPLANATIONS,
        95,
        'Creating explanations for your recommendations...',
      );
    }

    return recommendations;
  }

  /**
   * Get available projects for recommendations
   */
  private async getAvailableProjects(
    options: RecommendationOptions,
  ): Promise<Project[]> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect('supervisor.supervisorProfile', 'supervisorProfile')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      });

    // Apply specialization filters
    if (
      options.includeSpecializations &&
      options.includeSpecializations.length > 0
    ) {
      queryBuilder.andWhere('project.specialization IN (:...specializations)', {
        specializations: options.includeSpecializations,
      });
    }

    if (
      options.excludeSpecializations &&
      options.excludeSpecializations.length > 0
    ) {
      queryBuilder.andWhere(
        'project.specialization NOT IN (:...excludeSpecializations)',
        {
          excludeSpecializations: options.excludeSpecializations,
        },
      );
    }

    // Apply difficulty filter
    if (options.maxDifficulty) {
      const difficultyOrder = [
        'beginner',
        'intermediate',
        'advanced',
        'expert',
      ];
      const maxIndex = difficultyOrder.indexOf(
        options.maxDifficulty.toLowerCase(),
      );
      if (maxIndex >= 0) {
        const allowedDifficulties = difficultyOrder.slice(0, maxIndex + 1);
        queryBuilder.andWhere(
          'LOWER(project.difficultyLevel) IN (:...difficulties)',
          {
            difficulties: allowedDifficulties,
          },
        );
      }
    }

    return queryBuilder.getMany();
  }

  /**
   * Find matching skills between student and project
   */
  private findMatchingSkills(
    studentProfile: StudentProfile,
    project: Project,
  ): string[] {
    const studentSkills = studentProfile.skills || [];
    const projectSkills = project.technologyStack || [];

    return studentSkills.filter((skill) =>
      projectSkills.some(
        (projectSkill) =>
          skill.toLowerCase().includes(projectSkill.toLowerCase()) ||
          projectSkill.toLowerCase().includes(skill.toLowerCase()),
      ),
    );
  }

  /**
   * Find matching interests between student and project
   */
  private findMatchingInterests(
    studentProfile: StudentProfile,
    project: Project,
  ): string[] {
    const studentInterests = studentProfile.interests || [];
    const projectKeywords = [
      ...(project.tags || []),
      project.specialization,
      ...project.title.split(' '),
    ].flat();

    return studentInterests.filter((interest) =>
      projectKeywords.some(
        (keyword) =>
          interest.toLowerCase().includes(keyword.toLowerCase()) ||
          keyword.toLowerCase().includes(interest.toLowerCase()),
      ),
    );
  }

  /**
   * Generate reasoning for a specific project recommendation
   */
  private generateProjectReasoning(
    studentProfile: StudentProfile,
    project: Project,
    matchingSkills: string[],
    matchingInterests: string[],
    score: number,
  ): string {
    const reasons: string[] = [];

    if (matchingSkills.length > 0) {
      reasons.push(
        `Your skills in ${matchingSkills.slice(0, 3).join(', ')} align well with this project's requirements`,
      );
    }

    if (matchingInterests.length > 0) {
      reasons.push(
        `This project matches your interests in ${matchingInterests.slice(0, 2).join(' and ')}`,
      );
    }

    if (
      studentProfile.preferredSpecializations?.includes(project.specialization)
    ) {
      reasons.push(
        `This project is in your preferred specialization area of ${project.specialization}`,
      );
    }

    if (score > 0.8) {
      reasons.push(
        'This is a highly compatible match based on semantic analysis',
      );
    } else if (score > 0.6) {
      reasons.push('This project shows good compatibility with your profile');
    }

    return reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'This project was selected based on semantic similarity analysis of your profile.';
  }

  /**
   * Generate reasoning for a specific project recommendation with feedback adjustments
   */
  private generateProjectReasoningWithFeedback(
    studentProfile: StudentProfile,
    project: Project,
    matchingSkills: string[],
    matchingInterests: string[],
    score: number,
    feedbackAdjustments: any,
  ): string {
    const reasons: string[] = [];

    if (matchingSkills.length > 0) {
      reasons.push(
        `Your skills in ${matchingSkills.slice(0, 3).join(', ')} align well with this project's requirements`,
      );
    }

    if (matchingInterests.length > 0) {
      reasons.push(
        `This project matches your interests in ${matchingInterests.slice(0, 2).join(' and ')}`,
      );
    }

    if (
      studentProfile.preferredSpecializations?.includes(project.specialization)
    ) {
      reasons.push(
        `This project is in your preferred specialization area of ${project.specialization}`,
      );
    }

    // Add feedback-based reasoning
    if (
      feedbackAdjustments.boostSpecializations.includes(project.specialization)
    ) {
      reasons.push(
        `Based on your previous feedback, you've shown strong interest in ${project.specialization} projects`,
      );
    }

    if (feedbackAdjustments.scoreAdjustment > 0) {
      reasons.push(
        "Your positive feedback history suggests you'll find this type of project engaging",
      );
    }

    if (score > 0.8) {
      reasons.push(
        'This is a highly compatible match based on semantic analysis and your feedback patterns',
      );
    } else if (score > 0.6) {
      reasons.push(
        'This project shows good compatibility with your profile and preferences',
      );
    }

    return reasons.length > 0
      ? reasons.join('. ') + '.'
      : 'This project was selected based on semantic similarity analysis and your feedback history.';
  }

  /**
   * Generate overall reasoning for the recommendation set
   */
  private generateOverallReasoning(
    studentProfile: StudentProfile,
    recommendations: ProjectRecommendationDto[],
  ): string {
    if (recommendations.length === 0) {
      return 'No suitable recommendations found based on your current profile.';
    }

    const specializations = new Set(
      recommendations.map((r) => r.specialization),
    );
    const avgScore = this.calculateAverageScore(recommendations);

    let reasoning = `Based on your profile analysis, we found ${recommendations.length} projects that match your skills and interests. `;

    if (specializations.size > 1) {
      reasoning += `These recommendations span ${specializations.size} different specializations to provide you with diverse options. `;
    }

    if (avgScore > 0.7) {
      reasoning +=
        'The recommendations show strong alignment with your profile.';
    } else if (avgScore > 0.5) {
      reasoning +=
        'The recommendations show good potential matches for your interests.';
    } else {
      reasoning +=
        'Consider updating your profile with more specific skills and interests for better recommendations.';
    }

    return reasoning;
  }

  /**
   * Calculate average similarity score
   */
  private calculateAverageScore(
    recommendations: ProjectRecommendationDto[],
  ): number {
    if (recommendations.length === 0) return 0;
    const sum = recommendations.reduce(
      (acc, rec) => acc + rec.similarityScore,
      0,
    );
    return sum / recommendations.length;
  }

  /**
   * Validate student profile completeness
   */
  private validateProfileCompleteness(profile: StudentProfile): void {
    const missingFields: string[] = [];

    if (!profile.skills || profile.skills.length === 0) {
      missingFields.push('skills');
    }

    if (!profile.interests || profile.interests.length === 0) {
      missingFields.push('interests');
    }

    if (
      !profile.preferredSpecializations ||
      profile.preferredSpecializations.length === 0
    ) {
      missingFields.push('preferredSpecializations');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Profile incomplete. Please add: ${missingFields.join(', ')}`,
      );
    }
  }

  /**
   * Save recommendation to database
   */
  private async saveRecommendation(
    studentId: string,
    result: RecommendationResultDto,
    studentProfile: StudentProfile,
  ): Promise<void> {
    // Mark existing recommendations as superseded
    await this.recommendationRepository.update(
      { studentId, status: RecommendationStatus.ACTIVE },
      { status: RecommendationStatus.SUPERSEDED },
    );

    // Create new recommendation
    const recommendation = this.recommendationRepository.create({
      studentId,
      projectSuggestions: result.recommendations.map((r) => ({
        projectId: r.projectId,
        title: r.title,
        abstract: r.abstract,
        specialization: r.specialization,
        difficultyLevel: r.difficultyLevel,
        similarityScore: r.similarityScore,
        matchingSkills: r.matchingSkills,
        matchingInterests: r.matchingInterests,
        reasoning: r.reasoning,
        supervisor: r.supervisor,
        diversityBoost: r.diversityBoost,
      })),
      reasoning: result.reasoning,
      averageSimilarityScore: result.averageSimilarityScore,
      profileSnapshot: {
        skills: studentProfile.skills || [],
        interests: studentProfile.interests || [],
        specializations: studentProfile.preferredSpecializations || [],
        preferredDifficulty: 'intermediate', // Default since field doesn't exist
        careerGoals: '', // Default since field doesn't exist
        profileCompleteness: this.calculateProfileCompleteness(studentProfile),
        snapshotDate: new Date(),
      },
      status: RecommendationStatus.ACTIVE,
      expiresAt: result.expiresAt,
    });

    await this.recommendationRepository.save(recommendation);
  }

  /**
   * Calculate profile completeness percentage
   */
  private calculateProfileCompleteness(profile: StudentProfile): number {
    const fields = [
      profile.skills?.length > 0,
      profile.interests?.length > 0,
      profile.preferredSpecializations?.length > 0,
      true, // Default since preferredDifficulty doesn't exist
      true, // Default since careerGoals doesn't exist
      true, // Default since bio doesn't exist
    ];

    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }

  /**
   * Get recommendation history for a student
   */
  async getRecommendationHistory(studentId: string): Promise<Recommendation[]> {
    return this.recommendationRepository.find({
      where: { studentId },
      order: { createdAt: 'DESC' },
      take: 10,
    });
  }

  /**
   * Refresh recommendations (force regeneration)
   */
  async refreshRecommendations(
    studentId: string,
  ): Promise<RecommendationResultDto> {
    // Clear cache
    await this.cacheService.invalidateRecommendations(studentId);

    // Generate new recommendations
    return this.generateRecommendations(studentId, { forceRefresh: true });
  }

  /**
   * Submit feedback for a recommendation
   */
  async submitFeedback(
    recommendationId: string,
    projectId: string,
    feedbackDto: RecommendationFeedbackDto,
  ): Promise<void> {
    // Validate recommendation exists
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    // Validate project is in the recommendation
    const project = recommendation.getProjectById(projectId);
    if (!project) {
      throw new BadRequestException('Project not found in recommendation');
    }

    // Validate rating if feedback type is RATING
    if (
      feedbackDto.feedbackType === FeedbackType.RATING &&
      !feedbackDto.rating
    ) {
      throw new BadRequestException(
        'Rating is required for RATING feedback type',
      );
    }

    // Create feedback
    const feedback = this.feedbackRepository.create({
      recommendationId,
      projectId,
      feedbackType: feedbackDto.feedbackType,
      rating: feedbackDto.rating,
      comment: feedbackDto.comment,
    });

    await this.feedbackRepository.save(feedback);

    // Track implicit feedback for learning
    const studentId = recommendation.studentId;
    const action = this.mapFeedbackTypeToAction(feedbackDto.feedbackType);

    if (action) {
      await this.feedbackLearningService.trackImplicitFeedback({
        studentId,
        projectId,
        action,
        timestamp: new Date(),
        metadata: {
          explicit: true,
          rating: feedbackDto.rating,
          comment: feedbackDto.comment,
        },
      });
    }

    this.logger.debug(
      `Feedback submitted for recommendation ${recommendationId}, project ${projectId}: ${feedbackDto.feedbackType}`,
    );
  }

  /**
   * Get accessible explanation for a recommendation
   */
  async getAccessibleExplanation(
    recommendationId: string,
    projectId: string,
  ): Promise<AccessibleExplanation> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
      relations: ['student', 'student.studentProfile'],
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    const project = recommendation.getProjectById(projectId);
    if (!project) {
      throw new BadRequestException('Project not found in recommendation');
    }

    // Convert project data to ProjectRecommendationDto format
    const projectDto: ProjectRecommendationDto = {
      projectId: project.projectId,
      title: project.title,
      abstract: project.abstract,
      specialization: project.specialization,
      difficultyLevel: project.difficultyLevel,
      similarityScore: project.similarityScore,
      matchingSkills: project.matchingSkills,
      matchingInterests: project.matchingInterests,
      reasoning: project.reasoning,
      supervisor: project.supervisor,
      diversityBoost: project.diversityBoost,
    };

    if (!recommendation.student.studentProfile) {
      throw new BadRequestException(
        'Student profile not found for recommendation',
      );
    }

    return this.explanationService.generateAccessibleExplanation(
      projectDto,
      recommendation.student.studentProfile,
    );
  }

  /**
   * Get detailed explanation for a recommendation
   */
  async explainRecommendation(
    recommendationId: string,
    projectId: string,
  ): Promise<RecommendationExplanationDto> {
    const recommendation = await this.recommendationRepository.findOne({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      throw new NotFoundException('Recommendation not found');
    }

    const project = recommendation.getProjectById(projectId);
    if (!project) {
      throw new BadRequestException('Project not found in recommendation');
    }

    return {
      projectId,
      explanation: project.reasoning,
      scoreBreakdown: {
        skillsMatch: project.matchingSkills.length * 0.1,
        interestsMatch: project.matchingInterests.length * 0.1,
        specializationMatch:
          recommendation.profileSnapshot.specializations.includes(
            project.specialization,
          )
            ? 0.2
            : 0,
        difficultyMatch: 0.1, // Simplified
        supervisorMatch: 0.1, // Simplified
        diversityBoost: project.diversityBoost || 0,
        totalScore: project.similarityScore,
      },
      matchingElements: {
        skills: project.matchingSkills,
        interests: project.matchingInterests,
        specializations: [project.specialization],
        keywords: [], // Could be enhanced
      },
      improvementSuggestions: this.generateImprovementSuggestions(
        recommendation.profileSnapshot,
        project,
      ),
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovementSuggestions(
    profileSnapshot: any,
    project: any,
  ): string[] {
    const suggestions: string[] = [];

    if (project.matchingSkills.length === 0) {
      suggestions.push(
        'Consider adding more technical skills to your profile to improve project matching',
      );
    }

    if (project.matchingInterests.length === 0) {
      suggestions.push(
        'Add more specific interests related to your field of study',
      );
    }

    if (profileSnapshot.profileCompleteness < 80) {
      suggestions.push(
        'Complete your profile by adding career goals and a detailed bio',
      );
    }

    return suggestions;
  }

  /**
   * Get progress for a recommendation request
   */
  async getRecommendationProgress(requestId: string): Promise<any> {
    const progress = this.progressiveLoadingService.getProgress(requestId);
    const queueStatus =
      this.progressiveLoadingService.getQueueStatus(requestId);

    return {
      progress,
      queueStatus,
      systemLoad: this.progressiveLoadingService.getSystemLoad(),
    };
  }

  /**
   * Generate recommendations with progress tracking
   */
  async generateRecommendationsWithProgress(
    studentId: string,
    options: RecommendationOptions = {},
  ): Promise<{ requestId: string; message: string }> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start the recommendation generation in the background
    this.generateRecommendations(studentId, options, requestId).catch(
      (error) => {
        this.logger.error(
          `Background recommendation generation failed for ${requestId}:`,
          error,
        );
      },
    );

    return {
      requestId,
      message:
        'Recommendation generation started. Use the requestId to track progress.',
    };
  }

  /**
   * Map feedback type to implicit action for learning
   */
  private mapFeedbackTypeToAction(
    feedbackType: FeedbackType,
  ): 'bookmark' | 'view' | 'dismiss' | null {
    switch (feedbackType) {
      case FeedbackType.LIKE:
      case FeedbackType.BOOKMARK:
        return 'bookmark';
      case FeedbackType.DISLIKE:
        return 'dismiss';
      case FeedbackType.VIEW:
        return 'view';
      case FeedbackType.RATING:
        return 'bookmark'; // Treat ratings as positive engagement
      default:
        return null;
    }
  }
}
