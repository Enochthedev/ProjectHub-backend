import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Project } from '../entities/project.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import {
  ProjectRecommendationDto,
  RecommendationResultDto,
  RecommendationMetadata,
} from '../dto/recommendation';
import { ApprovalStatus } from '../common/enums/approval-status.enum';

export interface FallbackOptions {
  limit?: number;
  excludeSpecializations?: string[];
  includeSpecializations?: string[];
  maxDifficulty?: string;
  minSimilarityScore?: number;
}

@Injectable()
export class FallbackRecommendationService {
  private readonly logger = new Logger(FallbackRecommendationService.name);

  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * Generate rule-based recommendations when AI service is unavailable
   */
  async generateRuleBasedRecommendations(
    studentProfile: StudentProfile,
    options: FallbackOptions = {},
  ): Promise<RecommendationResultDto> {
    const startTime = Date.now();
    this.logger.warn(
      'Generating fallback rule-based recommendations due to AI service unavailability',
    );

    // Get available projects
    const projects = await this.getAvailableProjects(options);

    if (projects.length === 0) {
      return this.createEmptyResult(startTime);
    }

    // Score projects using rule-based matching
    const scoredProjects = projects
      .map((project) => ({
        project,
        score: this.calculateRuleBasedScore(studentProfile, project),
      }))
      .filter((item) => item.score >= (options.minSimilarityScore || 0.3))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 10);

    // Convert to recommendation DTOs
    const recommendations: ProjectRecommendationDto[] = scoredProjects.map(
      ({ project, score }) => {
        const matchingSkills = this.findMatchingSkills(studentProfile, project);
        const matchingInterests = this.findMatchingInterests(
          studentProfile,
          project,
        );

        return {
          projectId: project.id,
          title: project.title,
          abstract: project.abstract,
          specialization: project.specialization,
          difficultyLevel: project.difficultyLevel,
          similarityScore: score,
          matchingSkills,
          matchingInterests,
          reasoning: this.generateRuleBasedReasoning(
            studentProfile,
            project,
            matchingSkills,
            matchingInterests,
          ),
          supervisor: {
            id: project.supervisor.id,
            name: project.supervisor.supervisorProfile?.name || 'Unknown',
            specialization:
              project.supervisor.supervisorProfile?.specializations?.[0] ||
              'General',
          },
        };
      },
    );

    const result: RecommendationResultDto = {
      recommendations,
      reasoning: this.generateFallbackReasoning(
        studentProfile,
        recommendations,
      ),
      averageSimilarityScore: this.calculateAverageScore(recommendations),
      fromCache: false,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000), // 30 minutes for fallback
      metadata: {
        method: 'rule-based-fallback',
        fallback: true,
        projectsAnalyzed: projects.length,
        cacheHitRate: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };

    this.logger.debug(
      `Generated ${recommendations.length} fallback recommendations in ${result.metadata.processingTimeMs}ms`,
    );

    return result;
  }

  /**
   * Calculate rule-based similarity score
   */
  private calculateRuleBasedScore(
    studentProfile: StudentProfile,
    project: Project,
  ): number {
    let score = 0;
    let maxScore = 0;

    // Specialization match (40% weight)
    maxScore += 0.4;
    if (
      studentProfile.preferredSpecializations?.includes(project.specialization)
    ) {
      score += 0.4;
    } else if (
      this.isRelatedSpecialization(
        studentProfile.preferredSpecializations || [],
        project.specialization,
      )
    ) {
      score += 0.2;
    }

    // Skills match (30% weight)
    maxScore += 0.3;
    const matchingSkills = this.findMatchingSkills(studentProfile, project);
    const skillMatchRatio = Math.min(
      1,
      matchingSkills.length /
        Math.max(1, (project.technologyStack || []).length),
    );
    score += skillMatchRatio * 0.3;

    // Interests match (20% weight)
    maxScore += 0.2;
    const matchingInterests = this.findMatchingInterests(
      studentProfile,
      project,
    );
    if (matchingInterests.length > 0) {
      const interestMatchRatio = Math.min(
        1,
        matchingInterests.length /
          Math.max(1, (studentProfile.interests || []).length),
      );
      score += interestMatchRatio * 0.2;
    }

    // Difficulty match (10% weight)
    maxScore += 0.1;
    if (this.isDifficultyMatch('intermediate', project.difficultyLevel)) {
      // Default since field doesn't exist
      score += 0.1;
    }

    // Normalize score to 0-1 range
    return maxScore > 0 ? Math.min(1, score / maxScore) : 0;
  }

  /**
   * Find matching skills using keyword matching
   */
  private findMatchingSkills(
    studentProfile: StudentProfile,
    project: Project,
  ): string[] {
    const studentSkills = (studentProfile.skills || []).map((s) =>
      s.toLowerCase(),
    );
    const projectSkills = (project.technologyStack || []).map((s) =>
      s.toLowerCase(),
    );

    return studentSkills.filter((studentSkill) =>
      projectSkills.some((projectSkill) =>
        this.isSkillMatch(studentSkill, projectSkill),
      ),
    );
  }

  /**
   * Find matching interests using keyword matching
   */
  private findMatchingInterests(
    studentProfile: StudentProfile,
    project: Project,
  ): string[] {
    const studentInterests = (studentProfile.interests || []).map((i) =>
      i.toLowerCase(),
    );
    const projectKeywords = [
      ...(project.tags || []),
      project.specialization,
      ...project.title.toLowerCase().split(' '),
      ...project.abstract.toLowerCase().split(' '),
    ].map((k) => k.toLowerCase());

    return studentInterests.filter((interest) =>
      projectKeywords.some((keyword) =>
        this.isInterestMatch(interest, keyword),
      ),
    );
  }

  /**
   * Check if two skills match using fuzzy matching
   */
  private isSkillMatch(studentSkill: string, projectSkill: string): boolean {
    // Exact match
    if (studentSkill === projectSkill) return true;

    // Substring match
    if (
      studentSkill.includes(projectSkill) ||
      projectSkill.includes(studentSkill)
    )
      return true;

    // Common programming language variations
    const skillMappings: Record<string, string[]> = {
      javascript: ['js', 'node', 'nodejs', 'react', 'vue', 'angular'],
      python: ['py', 'django', 'flask', 'pandas', 'numpy'],
      java: ['spring', 'hibernate', 'maven', 'gradle'],
      csharp: ['c#', '.net', 'dotnet', 'asp.net'],
      cpp: ['c++', 'cplusplus'],
      database: ['sql', 'mysql', 'postgresql', 'mongodb', 'sqlite'],
      web: ['html', 'css', 'frontend', 'backend', 'fullstack'],
      mobile: ['android', 'ios', 'react native', 'flutter'],
      ai: ['machine learning', 'ml', 'deep learning', 'neural networks'],
    };

    for (const [key, variations] of Object.entries(skillMappings)) {
      if (
        (studentSkill.includes(key) ||
          variations.some((v) => studentSkill.includes(v))) &&
        (projectSkill.includes(key) ||
          variations.some((v) => projectSkill.includes(v)))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if interest matches keyword
   */
  private isInterestMatch(interest: string, keyword: string): boolean {
    if (interest.length < 3 || keyword.length < 3) return false;

    return interest.includes(keyword) || keyword.includes(interest);
  }

  /**
   * Check if specializations are related
   */
  private isRelatedSpecialization(
    studentSpecs: string[],
    projectSpec: string,
  ): boolean {
    const relatedSpecs: Record<string, string[]> = {
      'software engineering': [
        'web development',
        'mobile development',
        'backend development',
      ],
      'artificial intelligence': [
        'machine learning',
        'data science',
        'computer vision',
      ],
      cybersecurity: [
        'network security',
        'information security',
        'ethical hacking',
      ],
      'data science': [
        'machine learning',
        'artificial intelligence',
        'big data',
      ],
      'web development': [
        'software engineering',
        'frontend development',
        'backend development',
      ],
      'mobile development': [
        'software engineering',
        'android development',
        'ios development',
      ],
    };

    const projectSpecLower = projectSpec.toLowerCase();

    return studentSpecs.some((studentSpec) => {
      const studentSpecLower = studentSpec.toLowerCase();
      const related = relatedSpecs[studentSpecLower] || [];
      return related.some(
        (r) => projectSpecLower.includes(r) || r.includes(projectSpecLower),
      );
    });
  }

  /**
   * Check if difficulty levels match
   */
  private isDifficultyMatch(
    preferredDifficulty: string | undefined,
    projectDifficulty: string,
  ): boolean {
    if (!preferredDifficulty) return true; // No preference means any difficulty is fine

    const difficultyOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
    const preferredIndex = difficultyOrder.indexOf(
      preferredDifficulty.toLowerCase(),
    );
    const projectIndex = difficultyOrder.indexOf(
      projectDifficulty.toLowerCase(),
    );

    if (preferredIndex === -1 || projectIndex === -1) return true;

    // Allow projects at or below preferred difficulty
    return projectIndex <= preferredIndex;
  }

  /**
   * Get available projects with filters
   */
  private async getAvailableProjects(
    options: FallbackOptions,
  ): Promise<Project[]> {
    const queryBuilder = this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect('supervisor.supervisorProfile', 'supervisorProfile')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      });

    // Apply filters
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
   * Generate reasoning for rule-based recommendation
   */
  private generateRuleBasedReasoning(
    studentProfile: StudentProfile,
    project: Project,
    matchingSkills: string[],
    matchingInterests: string[],
  ): string {
    const reasons: string[] = [];

    if (
      studentProfile.preferredSpecializations?.includes(project.specialization)
    ) {
      reasons.push(
        `This project matches your specialization in ${project.specialization}`,
      );
    }

    if (matchingSkills.length > 0) {
      reasons.push(
        `You have relevant skills: ${matchingSkills.slice(0, 3).join(', ')}`,
      );
    }

    if (matchingInterests.length > 0) {
      reasons.push(
        `This aligns with your interests in ${matchingInterests.slice(0, 2).join(' and ')}`,
      );
    }

    if (this.isDifficultyMatch('intermediate', project.difficultyLevel)) {
      // Default since field doesn't exist
      reasons.push(
        `The difficulty level (${project.difficultyLevel}) matches your preferences`,
      );
    }

    return reasons.length > 0
      ? reasons.join('. ') + '. (Generated using rule-based matching)'
      : 'This project was selected using rule-based matching algorithms.';
  }

  /**
   * Generate overall reasoning for fallback recommendations
   */
  private generateFallbackReasoning(
    studentProfile: StudentProfile,
    recommendations: ProjectRecommendationDto[],
  ): string {
    if (recommendations.length === 0) {
      return 'No suitable projects found using rule-based matching. Consider updating your profile or expanding your criteria.';
    }

    return (
      `These recommendations were generated using rule-based matching due to AI service unavailability. ` +
      `We found ${recommendations.length} projects that match your profile based on specialization, skills, and interests. ` +
      `For more accurate recommendations, please try again later when AI services are restored.`
    );
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
   * Create empty result when no projects are available
   */
  private createEmptyResult(startTime: number): RecommendationResultDto {
    return {
      recommendations: [],
      reasoning:
        'No projects available that match your criteria. Please try adjusting your filters or check back later.',
      averageSimilarityScore: 0,
      fromCache: false,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 1800000), // 30 minutes
      metadata: {
        method: 'rule-based-fallback',
        fallback: true,
        projectsAnalyzed: 0,
        cacheHitRate: 0,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }
}
