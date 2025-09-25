import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { TemplateEffectiveness } from '../entities/template-effectiveness.entity';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { Milestone } from '../entities/milestone.entity';
import {
    MilestoneNotFoundException,
    MilestoneValidationException,
} from '../common/exceptions';

export interface TemplateEffectivenessStats {
    templateId: string;
    templateName: string;
    totalUsages: number;
    completionRate: number;
    averageCompletionTime: number | null;
    averageTimeVariance: number | null;
    averageDurationVariance: number | null;
    averageStudentRating: number | null;
    recommendationRate: number;
    effectivenessScore: number;
    commonCustomizations: Array<{
        type: string;
        frequency: number;
        description: string;
    }>;
    improvementSuggestions: Array<{
        category: string;
        suggestions: string[];
        priority: 'low' | 'medium' | 'high';
        frequency: number;
    }>;
    difficultyAnalysis: {
        overallDifficulty: number | null;
        milestoneDifficulty: Array<{
            title: string;
            averageDifficulty: number;
            completionRate: number;
        }>;
    };
}

export interface TemplateRecommendation {
    templateId: string;
    templateName: string;
    recommendationScore: number;
    reasons: string[];
    suitabilityFactors: {
        specialization: string;
        projectType: string;
        difficultyLevel: string;
        estimatedDuration: number;
    };
    similarSuccessfulProjects: Array<{
        projectId: string;
        completionRate: number;
        studentRating: number;
    }>;
}

export interface TemplateComparisonAnalysis {
    templates: Array<{
        templateId: string;
        templateName: string;
        effectivenessScore: number;
        completionRate: number;
        studentSatisfaction: number;
        timeEfficiency: number;
    }>;
    recommendations: {
        mostEffective: string;
        bestForBeginners: string;
        fastestCompletion: string;
        highestSatisfaction: string;
    };
}

@Injectable()
export class TemplateEffectivenessAnalysisService {
    private readonly logger = new Logger(
        TemplateEffectivenessAnalysisService.name,
    );

    constructor(
        @InjectRepository(TemplateEffectiveness)
        private readonly effectivenessRepository: Repository<TemplateEffectiveness>,
        @InjectRepository(MilestoneTemplate)
        private readonly templateRepository: Repository<MilestoneTemplate>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        private readonly dataSource: DataSource,
    ) { }

    async trackTemplateUsage(
        templateId: string,
        projectId: string,
        studentId: string,
    ): Promise<TemplateEffectiveness> {
        this.logger.log(
            `Tracking template usage: template=${templateId}, project=${projectId}, student=${studentId}`,
        );

        // Check if tracking already exists
        const existing = await this.effectivenessRepository.findOne({
            where: { templateId, projectId },
        });

        if (existing) {
            return existing;
        }

        // Get template and project data
        const template = await this.templateRepository.findOne({
            where: { id: templateId },
        });

        if (!template) {
            throw new MilestoneNotFoundException(`Template ${templateId} not found`);
        }

        const project = await this.projectRepository.findOne({
            where: { id: projectId },
        });

        if (!project) {
            throw new MilestoneNotFoundException(`Project ${projectId} not found`);
        }

        // Create effectiveness tracking
        const effectiveness = TemplateEffectiveness.createFromProject(
            templateId,
            projectId,
            studentId,
            template.getMilestoneCount(),
            template.estimatedDurationWeeks * 7,
            template.getTotalEstimatedHours(),
        );

        const savedEffectiveness =
            await this.effectivenessRepository.save(effectiveness);

        // Increment template usage count
        await this.templateRepository.update(templateId, {
            usageCount: () => 'usage_count + 1',
        });

        this.logger.log(`Created effectiveness tracking ${savedEffectiveness.id}`);
        return savedEffectiveness;
    }

    async updateMilestoneProgress(
        projectId: string,
        milestoneTitle: string,
        status: 'completed' | 'overdue' | 'pending',
        actualDays?: number,
    ): Promise<void> {
        this.logger.log(
            `Updating milestone progress: project=${projectId}, milestone=${milestoneTitle}, status=${status}`,
        );

        const effectiveness = await this.effectivenessRepository.findOne({
            where: { projectId },
        });

        if (!effectiveness) {
            this.logger.warn(
                `No effectiveness tracking found for project ${projectId}`,
            );
            return;
        }

        effectiveness.updateMilestoneProgress(milestoneTitle, status, actualDays);
        await this.effectivenessRepository.save(effectiveness);

        this.logger.log(`Updated milestone progress for project ${projectId}`);
    }

    async recordStudentFeedback(
        projectId: string,
        rating: number,
        feedback: string,
        isRecommended: boolean,
        difficultyRatings?: {
            overall: number;
            milestones: Array<{ title: string; difficulty: number }>;
        },
        improvementSuggestions?: Array<{
            category: 'timeline' | 'milestones' | 'resources' | 'guidance' | 'other';
            suggestion: string;
            priority: 'low' | 'medium' | 'high';
        }>,
    ): Promise<void> {
        this.logger.log(`Recording student feedback for project ${projectId}`);

        const effectiveness = await this.effectivenessRepository.findOne({
            where: { projectId },
        });

        if (!effectiveness) {
            throw new MilestoneNotFoundException(
                `No effectiveness tracking found for project ${projectId}`,
            );
        }

        effectiveness.setStudentFeedback(
            rating,
            feedback,
            isRecommended,
            difficultyRatings,
        );

        if (improvementSuggestions) {
            for (const suggestion of improvementSuggestions) {
                effectiveness.addImprovementSuggestion(
                    suggestion.category,
                    suggestion.suggestion,
                    suggestion.priority,
                );
            }
        }

        await this.effectivenessRepository.save(effectiveness);

        // Update template average rating
        await this.updateTemplateRating(effectiveness.templateId);

        this.logger.log(`Recorded student feedback for project ${projectId}`);
    }

    async getTemplateEffectivenessStats(
        templateId: string,
    ): Promise<TemplateEffectivenessStats> {
        this.logger.log(`Getting effectiveness stats for template ${templateId}`);

        const template = await this.templateRepository.findOne({
            where: { id: templateId },
        });

        if (!template) {
            throw new MilestoneNotFoundException(`Template ${templateId} not found`);
        }

        const effectivenessRecords = await this.effectivenessRepository.find({
            where: { templateId },
            relations: ['student', 'project'],
        });

        if (effectivenessRecords.length === 0) {
            return {
                templateId,
                templateName: template.name,
                totalUsages: 0,
                completionRate: 0,
                averageCompletionTime: null,
                averageTimeVariance: null,
                averageDurationVariance: null,
                averageStudentRating: null,
                recommendationRate: 0,
                effectivenessScore: 0,
                commonCustomizations: [],
                improvementSuggestions: [],
                difficultyAnalysis: {
                    overallDifficulty: null,
                    milestoneDifficulty: [],
                },
            };
        }

        // Calculate completion rate
        const completedProjects = effectivenessRecords.filter(
            (r) => r.completionStatus === 'completed',
        ).length;
        const completionRate =
            (completedProjects / effectivenessRecords.length) * 100;

        // Calculate average completion time
        const completedRecords = effectivenessRecords.filter(
            (r) => r.actualDurationDays !== null,
        );
        const averageCompletionTime =
            completedRecords.length > 0
                ? completedRecords.reduce(
                    (sum, r) => sum + (r.actualDurationDays || 0),
                    0,
                ) / completedRecords.length
                : null;

        // Calculate average variances
        const timeVarianceRecords = effectivenessRecords.filter(
            (r) => r.timeVariance !== null,
        );
        const averageTimeVariance =
            timeVarianceRecords.length > 0
                ? timeVarianceRecords.reduce(
                    (sum, r) => sum + (r.timeVariance || 0),
                    0,
                ) / timeVarianceRecords.length
                : null;

        const durationVarianceRecords = effectivenessRecords.filter(
            (r) => r.durationVariance !== null,
        );
        const averageDurationVariance =
            durationVarianceRecords.length > 0
                ? durationVarianceRecords.reduce(
                    (sum, r) => sum + (r.durationVariance || 0),
                    0,
                ) / durationVarianceRecords.length
                : null;

        // Calculate average student rating
        const ratedRecords = effectivenessRecords.filter(
            (r) => r.studentRating !== null,
        );
        const averageStudentRating =
            ratedRecords.length > 0
                ? ratedRecords.reduce((sum, r) => sum + (r.studentRating || 0), 0) /
                ratedRecords.length
                : null;

        // Calculate recommendation rate
        const recommendedCount = effectivenessRecords.filter(
            (r) => r.isRecommended,
        ).length;
        const recommendationRate =
            (recommendedCount / effectivenessRecords.length) * 100;

        // Calculate overall effectiveness score
        const effectivenessScores = effectivenessRecords.map((r) =>
            r.getEffectivenessScore(),
        );
        const effectivenessScore =
            effectivenessScores.length > 0
                ? effectivenessScores.reduce((sum, score) => sum + score, 0) /
                effectivenessScores.length
                : 0;

        // Analyze common customizations
        const customizationMap = new Map<
            string,
            { count: number; descriptions: Set<string> }
        >();
        effectivenessRecords.forEach((record) => {
            if (record.customizations) {
                record.customizations.forEach((customization) => {
                    const key = customization.type;
                    if (!customizationMap.has(key)) {
                        customizationMap.set(key, { count: 0, descriptions: new Set() });
                    }
                    const entry = customizationMap.get(key)!;
                    entry.count++;
                    entry.descriptions.add(customization.description);
                });
            }
        });

        const commonCustomizations = Array.from(customizationMap.entries())
            .map(([type, data]) => ({
                type,
                frequency: data.count,
                description: Array.from(data.descriptions).join('; '),
            }))
            .sort((a, b) => b.frequency - a.frequency);

        // Analyze improvement suggestions
        const suggestionMap = new Map<
            string,
            Map<string, { count: number; priority: 'low' | 'medium' | 'high' }>
        >();
        effectivenessRecords.forEach((record) => {
            if (record.improvementSuggestions) {
                record.improvementSuggestions.forEach((suggestion) => {
                    if (!suggestionMap.has(suggestion.category)) {
                        suggestionMap.set(suggestion.category, new Map());
                    }
                    const categoryMap = suggestionMap.get(suggestion.category)!;
                    if (!categoryMap.has(suggestion.suggestion)) {
                        categoryMap.set(suggestion.suggestion, {
                            count: 0,
                            priority: suggestion.priority,
                        });
                    }
                    categoryMap.get(suggestion.suggestion)!.count++;
                });
            }
        });

        const improvementSuggestions = Array.from(suggestionMap.entries()).map(
            ([category, suggestions]) => {
                const sortedSuggestions = Array.from(suggestions.entries()).sort(
                    (a, b) => b[1].count - a[1].count,
                );

                return {
                    category,
                    suggestions: sortedSuggestions.map(([suggestion]) => suggestion),
                    priority: sortedSuggestions[0]?.[1].priority || 'medium',
                    frequency: sortedSuggestions.reduce(
                        (sum, [, data]) => sum + data.count,
                        0,
                    ),
                };
            },
        );

        // Analyze difficulty ratings
        const difficultyRecords = effectivenessRecords.filter(
            (r) => r.difficultyRatings?.overall != null,
        );
        const overallDifficulty =
            difficultyRecords.length > 0
                ? difficultyRecords.reduce(
                    (sum, r) => sum + (r.difficultyRatings?.overall || 0),
                    0,
                ) / difficultyRecords.length
                : null;

        // Analyze milestone-specific difficulty
        const milestoneMap = new Map<
            string,
            { difficulties: number[]; completions: number; total: number }
        >();
        effectivenessRecords.forEach((record) => {
            if (record.difficultyRatings?.milestones) {
                record.difficultyRatings.milestones.forEach((milestone) => {
                    if (!milestoneMap.has(milestone.title)) {
                        milestoneMap.set(milestone.title, {
                            difficulties: [],
                            completions: 0,
                            total: 0,
                        });
                    }
                    const entry = milestoneMap.get(milestone.title)!;
                    entry.difficulties.push(milestone.difficulty);
                    entry.total++;
                });
            }

            if (record.milestoneCompletionData) {
                record.milestoneCompletionData.forEach((milestone) => {
                    if (milestoneMap.has(milestone.milestoneTitle)) {
                        const entry = milestoneMap.get(milestone.milestoneTitle)!;
                        if (milestone.status === 'completed') {
                            entry.completions++;
                        }
                    }
                });
            }
        });

        const milestoneDifficulty = Array.from(milestoneMap.entries()).map(
            ([title, data]) => ({
                title,
                averageDifficulty:
                    data.difficulties.length > 0
                        ? data.difficulties.reduce((sum, d) => sum + d, 0) /
                        data.difficulties.length
                        : 0,
                completionRate:
                    data.total > 0 ? (data.completions / data.total) * 100 : 0,
            }),
        );

        return {
            templateId,
            templateName: template.name,
            totalUsages: effectivenessRecords.length,
            completionRate,
            averageCompletionTime,
            averageTimeVariance,
            averageDurationVariance,
            averageStudentRating,
            recommendationRate,
            effectivenessScore,
            commonCustomizations,
            improvementSuggestions,
            difficultyAnalysis: {
                overallDifficulty,
                milestoneDifficulty,
            },
        };
    }

    async getTemplateRecommendations(
        specialization: string,
        projectType?: string,
        studentLevel?: 'beginner' | 'intermediate' | 'advanced',
        maxDurationWeeks?: number,
    ): Promise<TemplateRecommendation[]> {
        this.logger.log(
            `Getting template recommendations for specialization=${specialization}, projectType=${projectType}`,
        );

        // Get templates matching criteria
        const queryBuilder = this.templateRepository
            .createQueryBuilder('template')
            .where('template.specialization = :specialization', { specialization })
            .andWhere('template.isActive = true');

        if (projectType) {
            queryBuilder.andWhere('template.projectType = :projectType', {
                projectType,
            });
        }

        if (maxDurationWeeks) {
            queryBuilder.andWhere('template.estimatedDurationWeeks <= :maxDuration', {
                maxDuration: maxDurationWeeks,
            });
        }

        const templates = await queryBuilder.getMany();

        const recommendations: TemplateRecommendation[] = [];

        for (const template of templates) {
            const stats = await this.getTemplateEffectivenessStats(template.id);

            let recommendationScore = 0;
            const reasons: string[] = [];

            // Base score from effectiveness
            recommendationScore += stats.effectivenessScore * 0.4;

            // Completion rate factor
            if (stats.completionRate > 80) {
                recommendationScore += 20;
                reasons.push('High completion rate');
            } else if (stats.completionRate > 60) {
                recommendationScore += 10;
                reasons.push('Good completion rate');
            }

            // Student satisfaction factor
            if (stats.averageStudentRating && stats.averageStudentRating > 4) {
                recommendationScore += 15;
                reasons.push('High student satisfaction');
            } else if (
                stats.averageStudentRating &&
                stats.averageStudentRating > 3.5
            ) {
                recommendationScore += 10;
                reasons.push('Good student satisfaction');
            }

            // Usage factor (popular templates)
            if (stats.totalUsages > 10) {
                recommendationScore += 10;
                reasons.push('Widely used template');
            } else if (stats.totalUsages > 5) {
                recommendationScore += 5;
                reasons.push('Moderately used template');
            }

            // Difficulty matching
            if (studentLevel && stats.difficultyAnalysis.overallDifficulty) {
                const difficulty = stats.difficultyAnalysis.overallDifficulty;
                let difficultyMatch = false;

                if (studentLevel === 'beginner' && difficulty <= 2.5) {
                    recommendationScore += 15;
                    reasons.push('Suitable for beginners');
                    difficultyMatch = true;
                } else if (
                    studentLevel === 'intermediate' &&
                    difficulty > 2.5 &&
                    difficulty <= 3.5
                ) {
                    recommendationScore += 15;
                    reasons.push('Suitable for intermediate level');
                    difficultyMatch = true;
                } else if (studentLevel === 'advanced' && difficulty > 3.5) {
                    recommendationScore += 15;
                    reasons.push('Suitable for advanced level');
                    difficultyMatch = true;
                }

                if (!difficultyMatch) {
                    recommendationScore -= 10;
                    reasons.push('Difficulty level may not match');
                }
            }

            // Time efficiency factor
            if (stats.averageTimeVariance && stats.averageTimeVariance < 1.2) {
                recommendationScore += 10;
                reasons.push('Good time estimation accuracy');
            }

            // Get similar successful projects
            const effectivenessRecords = await this.effectivenessRepository.find({
                where: { templateId: template.id, completionStatus: 'completed' },
                take: 5,
                order: { createdAt: 'DESC' },
            });

            const similarSuccessfulProjects = effectivenessRecords.map((record) => ({
                projectId: record.projectId,
                completionRate: record.completionPercentage || 0,
                studentRating: record.studentRating || 0,
            }));

            recommendations.push({
                templateId: template.id,
                templateName: template.name,
                recommendationScore: Math.min(100, Math.max(0, recommendationScore)),
                reasons,
                suitabilityFactors: {
                    specialization: template.specialization,
                    projectType: template.projectType,
                    difficultyLevel: this.getDifficultyLevel(
                        stats.difficultyAnalysis.overallDifficulty,
                    ),
                    estimatedDuration: template.estimatedDurationWeeks,
                },
                similarSuccessfulProjects,
            });
        }

        // Sort by recommendation score
        recommendations.sort(
            (a, b) => b.recommendationScore - a.recommendationScore,
        );

        this.logger.log(
            `Generated ${recommendations.length} template recommendations`,
        );
        return recommendations.slice(0, 10); // Return top 10
    }

    async compareTemplates(
        templateIds: string[],
    ): Promise<TemplateComparisonAnalysis> {
        this.logger.log(`Comparing templates: ${templateIds.join(', ')}`);

        const templates: Array<{
            templateId: string;
            templateName: string;
            effectivenessScore: number;
            completionRate: number;
            studentSatisfaction: number;
            timeEfficiency: number;
        }> = [];

        for (const templateId of templateIds) {
            const stats = await this.getTemplateEffectivenessStats(templateId);

            templates.push({
                templateId,
                templateName: stats.templateName,
                effectivenessScore: stats.effectivenessScore,
                completionRate: stats.completionRate,
                studentSatisfaction: stats.averageStudentRating || 0,
                timeEfficiency: stats.averageTimeVariance
                    ? Math.max(0, 2 - stats.averageTimeVariance) * 50
                    : 0,
            });
        }

        // Sort templates by different criteria to find recommendations
        const sortedByEffectiveness = [...templates].sort(
            (a, b) => b.effectivenessScore - a.effectivenessScore,
        );
        const sortedByCompletion = [...templates].sort(
            (a, b) => b.completionRate - a.completionRate,
        );
        const sortedBySatisfaction = [...templates].sort(
            (a, b) => b.studentSatisfaction - a.studentSatisfaction,
        );
        const sortedByTimeEfficiency = [...templates].sort(
            (a, b) => b.timeEfficiency - a.timeEfficiency,
        );

        // Determine best for beginners (lower difficulty, higher completion rate)
        const beginnerFriendly = [...templates].sort((a, b) => {
            const aScore = a.completionRate * 0.6 + a.studentSatisfaction * 20 * 0.4;
            const bScore = b.completionRate * 0.6 + b.studentSatisfaction * 20 * 0.4;
            return bScore - aScore;
        });

        return {
            templates,
            recommendations: {
                mostEffective: sortedByEffectiveness[0]?.templateId || '',
                bestForBeginners: beginnerFriendly[0]?.templateId || '',
                fastestCompletion: sortedByTimeEfficiency[0]?.templateId || '',
                highestSatisfaction: sortedBySatisfaction[0]?.templateId || '',
            },
        };
    }

    private async updateTemplateRating(templateId: string): Promise<void> {
        const effectivenessRecords = await this.effectivenessRepository.find({
            where: {
                templateId,
                studentRating: Not(null as any),
            },
        });

        if (effectivenessRecords.length === 0) return;

        const totalRating = effectivenessRecords.reduce(
            (sum, record) => sum + (record.studentRating || 0),
            0,
        );
        const averageRating = totalRating / effectivenessRecords.length;

        await this.templateRepository.update(templateId, {
            averageRating: Number(averageRating.toFixed(2)),
            ratingCount: effectivenessRecords.length,
        });
    }

    private getDifficultyLevel(overallDifficulty: number | null): string {
        if (!overallDifficulty) return 'unknown';

        if (overallDifficulty <= 2) return 'beginner';
        if (overallDifficulty <= 3.5) return 'intermediate';
        return 'advanced';
    }
}
