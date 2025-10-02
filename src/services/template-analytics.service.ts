import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { TemplateEffectiveness } from '../entities/template-effectiveness.entity';
import { Milestone } from '../entities/milestone.entity';
import { Project } from '../entities/project.entity';
import { User } from '../entities/user.entity';
import { ProjectType } from '../common/enums/project-type.enum';

export interface TemplateUsageStats {
    templateId: string;
    templateName: string;
    totalUsage: number;
    recentUsage: number; // Last 30 days
    averageRating: number;
    ratingCount: number;
    completionRate: number;
    averageDuration: number;
    successRate: number;
    popularityRank: number;
    effectivenessScore: number;
    recommendationRate: number;
}

export interface TemplateAnalytics {
    overview: {
        totalTemplates: number;
        activeTemplates: number;
        totalUsage: number;
        averageEffectiveness: number;
        topPerformingTemplate: string;
    };
    usageBySpecialization: Record<string, number>;
    usageByProjectType: Record<string, number>;
    usageTrends: Array<{
        date: string;
        usage: number;
        newTemplates: number;
    }>;
    topTemplates: TemplateUsageStats[];
    effectivenessMetrics: {
        averageCompletionRate: number;
        averageDurationVariance: number;
        averageTimeVariance: number;
        studentSatisfaction: number;
    };
}

export interface TemplateRecommendation {
    templateId: string;
    templateName: string;
    score: number;
    reasons: string[];
    similarProjects: number;
    successRate: number;
    averageDuration: number;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface TemplateOptimizationSuggestion {
    templateId: string;
    templateName: string;
    category: 'timeline' | 'milestones' | 'resources' | 'guidance' | 'other';
    suggestion: string;
    priority: 'low' | 'medium' | 'high';
    impact: string;
    frequency: number; // How often this issue appears
}

@Injectable()
export class TemplateAnalyticsService {
    private readonly logger = new Logger(TemplateAnalyticsService.name);

    constructor(
        @InjectRepository(MilestoneTemplate)
        private readonly templateRepository: Repository<MilestoneTemplate>,
        @InjectRepository(TemplateEffectiveness)
        private readonly effectivenessRepository: Repository<TemplateEffectiveness>,
        @InjectRepository(Milestone)
        private readonly milestoneRepository: Repository<Milestone>,
        @InjectRepository(Project)
        private readonly projectRepository: Repository<Project>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    /**
     * Track template usage when a project is created with a template
     */
    async trackTemplateUsage(
        templateId: string,
        projectId: string,
        studentId: string,
    ): Promise<TemplateEffectiveness> {
        const template = await this.templateRepository.findOne({
            where: { id: templateId },
        });

        if (!template) {
            throw new Error('Template not found');
        }

        // Increment template usage count
        template.incrementUsage();
        await this.templateRepository.save(template);

        // Create effectiveness tracking record
        const effectiveness = TemplateEffectiveness.createFromProject(
            templateId,
            projectId,
            studentId,
            template.getMilestoneCount(),
            template.estimatedDurationWeeks * 7, // Convert weeks to days
            template.getTotalEstimatedHours(),
        );

        const savedEffectiveness = await this.effectivenessRepository.save(effectiveness);

        this.logger.log(`Tracked template usage: ${templateId} for project ${projectId}`);
        return savedEffectiveness;
    }

    /**
     * Update milestone progress for template effectiveness tracking
     */
    async updateMilestoneProgress(
        projectId: string,
        milestoneTitle: string,
        status: 'completed' | 'overdue' | 'pending',
        actualDays?: number,
    ): Promise<void> {
        const effectiveness = await this.effectivenessRepository.findOne({
            where: { projectId },
        });

        if (!effectiveness) {
            this.logger.warn(`No effectiveness tracking found for project ${projectId}`);
            return;
        }

        effectiveness.updateMilestoneProgress(milestoneTitle, status, actualDays);
        await this.effectivenessRepository.save(effectiveness);

        this.logger.log(`Updated milestone progress for project ${projectId}: ${milestoneTitle} -> ${status}`);
    }

    /**
     * Record student feedback for a template
     */
    async recordStudentFeedback(
        projectId: string,
        rating: number,
        feedback: string,
        isRecommended: boolean,
        difficultyRatings?: {
            overall: number;
            milestones: Array<{ title: string; difficulty: number }>;
        },
    ): Promise<void> {
        const effectiveness = await this.effectivenessRepository.findOne({
            where: { projectId },
            relations: ['template'],
        });

        if (!effectiveness) {
            throw new Error('Template effectiveness record not found');
        }

        // Update effectiveness record
        effectiveness.setStudentFeedback(rating, feedback, isRecommended, difficultyRatings);
        await this.effectivenessRepository.save(effectiveness);

        // Update template average rating
        effectiveness.template.updateRating(rating);
        await this.templateRepository.save(effectiveness.template);

        this.logger.log(`Recorded student feedback for project ${projectId}: rating ${rating}`);
    }

    /**
     * Get template usage statistics
     */
    async getTemplateUsageStats(templateId: string): Promise<TemplateUsageStats> {
        const template = await this.templateRepository.findOne({
            where: { id: templateId },
        });

        if (!template) {
            throw new Error('Template not found');
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Get recent usage
        const recentUsage = await this.effectivenessRepository.count({
            where: {
                templateId,
                createdAt: Between(thirtyDaysAgo, new Date()),
            },
        });

        // Get completion rate
        const totalProjects = await this.effectivenessRepository.count({
            where: { templateId },
        });

        const completedProjects = await this.effectivenessRepository.count({
            where: {
                templateId,
                completionStatus: 'completed',
            },
        });

        const completionRate = totalProjects > 0 ? (completedProjects / totalProjects) * 100 : 0;

        // Get average duration
        const completedEffectiveness = await this.effectivenessRepository.find({
            where: {
                templateId,
                completionStatus: 'completed',
            },
        });

        const averageDuration = completedEffectiveness.length > 0
            ? completedEffectiveness.reduce((sum, e) => sum + (e.actualDurationDays || 0), 0) / completedEffectiveness.length
            : 0;

        // Get success rate (projects that are on track or completed)
        const successfulProjects = await this.effectivenessRepository.count({
            where: {
                templateId,
                completionStatus: In(['completed', 'in_progress']),
            },
        });

        const successRate = totalProjects > 0 ? (successfulProjects / totalProjects) * 100 : 0;

        // Get effectiveness score
        const allEffectiveness = await this.effectivenessRepository.find({
            where: { templateId },
        });

        const effectivenessScore = allEffectiveness.length > 0
            ? allEffectiveness.reduce((sum, e) => sum + e.getEffectivenessScore(), 0) / allEffectiveness.length
            : 0;

        // Get recommendation rate
        const recommendedCount = await this.effectivenessRepository.count({
            where: {
                templateId,
                isRecommended: true,
            },
        });

        const recommendationRate = totalProjects > 0 ? (recommendedCount / totalProjects) * 100 : 0;

        return {
            templateId,
            templateName: template.name,
            totalUsage: template.usageCount,
            recentUsage,
            averageRating: template.averageRating,
            ratingCount: template.ratingCount,
            completionRate,
            averageDuration,
            successRate,
            popularityRank: 0, // Will be calculated in getTemplateAnalytics
            effectivenessScore,
            recommendationRate,
        };
    }

    /**
     * Get comprehensive template analytics
     */
    async getTemplateAnalytics(
        specialization?: string,
        projectType?: ProjectType,
        dateRange?: { start: Date; end: Date },
    ): Promise<TemplateAnalytics> {
        const whereClause: any = { isActive: true };
        if (specialization) whereClause.specialization = specialization;
        if (projectType) whereClause.projectType = projectType;

        const templates = await this.templateRepository.find({
            where: whereClause,
            order: { usageCount: 'DESC' },
        });

        // Get template usage stats
        const templateStats = await Promise.all(
            templates.map(async (template, index) => {
                const stats = await this.getTemplateUsageStats(template.id);
                stats.popularityRank = index + 1;
                return stats;
            }),
        );

        // Calculate overview metrics
        const totalTemplates = templates.length;
        const activeTemplates = templates.filter(t => t.isActive).length;
        const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);
        const averageEffectiveness = templateStats.length > 0
            ? templateStats.reduce((sum, s) => sum + s.effectivenessScore, 0) / templateStats.length
            : 0;

        const topPerformingTemplate = templateStats.length > 0
            ? templateStats.reduce((best, current) =>
                current.effectivenessScore > best.effectivenessScore ? current : best
            ).templateName
            : '';

        // Usage by specialization
        const usageBySpecialization: Record<string, number> = {};
        templates.forEach(template => {
            usageBySpecialization[template.specialization] =
                (usageBySpecialization[template.specialization] || 0) + template.usageCount;
        });

        // Usage by project type
        const usageByProjectType: Record<string, number> = {};
        templates.forEach(template => {
            const type = template.projectType.toString();
            usageByProjectType[type] = (usageByProjectType[type] || 0) + template.usageCount;
        });

        // Usage trends (last 30 days)
        const usageTrends = await this.getUsageTrends(dateRange);

        // Effectiveness metrics
        const allEffectiveness = await this.effectivenessRepository.find({
            where: dateRange ? {
                createdAt: Between(dateRange.start, dateRange.end),
            } : {},
        });

        const effectivenessMetrics = {
            averageCompletionRate: allEffectiveness.length > 0
                ? allEffectiveness.reduce((sum, e) => sum + (e.completionPercentage || 0), 0) / allEffectiveness.length
                : 0,
            averageDurationVariance: allEffectiveness.length > 0
                ? allEffectiveness
                    .filter(e => e.durationVariance !== null)
                    .reduce((sum, e) => sum + (e.durationVariance || 0), 0) /
                allEffectiveness.filter(e => e.durationVariance !== null).length
                : 0,
            averageTimeVariance: allEffectiveness.length > 0
                ? allEffectiveness
                    .filter(e => e.timeVariance !== null)
                    .reduce((sum, e) => sum + (e.timeVariance || 0), 0) /
                allEffectiveness.filter(e => e.timeVariance !== null).length
                : 0,
            studentSatisfaction: allEffectiveness.length > 0
                ? allEffectiveness
                    .filter(e => e.studentRating !== null)
                    .reduce((sum, e) => sum + (e.studentRating || 0), 0) /
                allEffectiveness.filter(e => e.studentRating !== null).length
                : 0,
        };

        return {
            overview: {
                totalTemplates,
                activeTemplates,
                totalUsage,
                averageEffectiveness,
                topPerformingTemplate,
            },
            usageBySpecialization,
            usageByProjectType,
            usageTrends,
            topTemplates: templateStats.slice(0, 10), // Top 10 templates
            effectivenessMetrics,
        };
    }

    /**
     * Get template recommendations for a student
     */
    async getTemplateRecommendations(
        studentId: string,
        specialization: string,
        projectType: ProjectType,
        limit: number = 5,
    ): Promise<TemplateRecommendation[]> {
        // Get student's previous template usage
        const studentHistory = await this.effectivenessRepository.find({
            where: { studentId },
            relations: ['template'],
        });

        // Get templates for the specialization and project type
        const availableTemplates = await this.templateRepository.find({
            where: {
                specialization,
                projectType,
                isActive: true,
            },
        });

        const recommendations: TemplateRecommendation[] = [];

        for (const template of availableTemplates) {
            const stats = await this.getTemplateUsageStats(template.id);

            let score = 0;
            const reasons: string[] = [];

            // Base score from effectiveness
            score += stats.effectivenessScore * 0.3;

            // Popularity bonus
            if (stats.totalUsage > 10) {
                score += 20;
                reasons.push('Popular choice among students');
            }

            // High completion rate bonus
            if (stats.completionRate > 80) {
                score += 25;
                reasons.push('High completion rate');
            }

            // High recommendation rate bonus
            if (stats.recommendationRate > 70) {
                score += 20;
                reasons.push('Highly recommended by students');
            }

            // Good rating bonus
            if (stats.averageRating > 4.0) {
                score += 15;
                reasons.push('Excellent student ratings');
            }

            // Reasonable duration
            if (stats.averageDuration > 0 && stats.averageDuration <= template.estimatedDurationWeeks * 7 * 1.2) {
                score += 10;
                reasons.push('Realistic timeline');
            }

            // Penalty for student's previous poor performance with this template
            const studentPreviousUse = studentHistory.find(h => h.templateId === template.id);
            if (studentPreviousUse && studentPreviousUse.completionStatus === 'abandoned') {
                score -= 30;
                reasons.push('Consider alternatives based on your history');
            }

            // Determine difficulty
            let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
            const avgDifficulty = await this.getTemplateDifficulty(template.id);
            if (avgDifficulty < 2.5) difficulty = 'easy';
            else if (avgDifficulty > 3.5) difficulty = 'hard';

            recommendations.push({
                templateId: template.id,
                templateName: template.name,
                score: Math.max(0, Math.min(100, score)),
                reasons,
                similarProjects: stats.totalUsage,
                successRate: stats.successRate,
                averageDuration: stats.averageDuration,
                difficulty,
            });
        }

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Get template optimization suggestions
     */
    async getTemplateOptimizationSuggestions(
        templateId?: string,
    ): Promise<TemplateOptimizationSuggestion[]> {
        const whereClause = templateId ? { templateId } : {};

        const effectivenessRecords = await this.effectivenessRepository.find({
            where: whereClause,
            relations: ['template'],
        });

        const suggestionMap = new Map<string, TemplateOptimizationSuggestion>();

        for (const record of effectivenessRecords) {
            if (!record.improvementSuggestions) continue;

            for (const suggestion of record.improvementSuggestions) {
                const key = `${record.templateId}-${suggestion.category}-${suggestion.suggestion}`;

                if (suggestionMap.has(key)) {
                    suggestionMap.get(key)!.frequency += 1;
                } else {
                    suggestionMap.set(key, {
                        templateId: record.templateId,
                        templateName: record.template.name,
                        category: suggestion.category,
                        suggestion: suggestion.suggestion,
                        priority: suggestion.priority,
                        impact: this.calculateSuggestionImpact(suggestion.category, suggestion.priority),
                        frequency: 1,
                    });
                }
            }
        }

        return Array.from(suggestionMap.values())
            .sort((a, b) => {
                // Sort by priority (high first), then by frequency
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                return priorityDiff !== 0 ? priorityDiff : b.frequency - a.frequency;
            });
    }

    /**
     * Scheduled task to update template analytics
     */
    @Cron(CronExpression.EVERY_DAY_AT_2AM)
    async updateTemplateAnalytics(): Promise<void> {
        this.logger.log('Starting scheduled template analytics update...');

        try {
            const templates = await this.templateRepository.find({
                where: { isActive: true },
            });

            for (const template of templates) {
                await this.updateTemplateMetrics(template.id);
            }

            this.logger.log(`Updated analytics for ${templates.length} templates`);
        } catch (error) {
            this.logger.error('Error updating template analytics:', error);
        }
    }

    /**
     * Update metrics for a specific template
     */
    private async updateTemplateMetrics(templateId: string): Promise<void> {
        const effectiveness = await this.effectivenessRepository.find({
            where: { templateId },
        });

        // Update completion rates, average durations, etc.
        // This could include more sophisticated calculations

        this.logger.log(`Updated metrics for template ${templateId}`);
    }

    /**
     * Get usage trends over time
     */
    private async getUsageTrends(dateRange?: { start: Date; end: Date }): Promise<Array<{
        date: string;
        usage: number;
        newTemplates: number;
    }>> {
        const endDate = dateRange?.end || new Date();
        const startDate = dateRange?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        const trends: Array<{ date: string; usage: number; newTemplates: number }> = [];

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayStart = new Date(d);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(d);
            dayEnd.setHours(23, 59, 59, 999);

            const usage = await this.effectivenessRepository.count({
                where: {
                    createdAt: Between(dayStart, dayEnd),
                },
            });

            const newTemplates = await this.templateRepository.count({
                where: {
                    createdAt: Between(dayStart, dayEnd),
                },
            });

            trends.push({
                date: d.toISOString().split('T')[0],
                usage,
                newTemplates,
            });
        }

        return trends;
    }

    /**
     * Get average difficulty rating for a template
     */
    private async getTemplateDifficulty(templateId: string): Promise<number> {
        const effectiveness = await this.effectivenessRepository.find({
            where: { templateId },
        });

        const difficultyRatings = effectiveness
            .filter(e => e.difficultyRatings?.overall)
            .map(e => e.difficultyRatings!.overall!);

        return difficultyRatings.length > 0
            ? difficultyRatings.reduce((sum, rating) => sum + rating, 0) / difficultyRatings.length
            : 3; // Default to medium difficulty
    }

    /**
     * Calculate the impact of a suggestion
     */
    private calculateSuggestionImpact(
        category: 'timeline' | 'milestones' | 'resources' | 'guidance' | 'other',
        priority: 'low' | 'medium' | 'high',
    ): string {
        const impacts = {
            timeline: {
                high: 'Could significantly improve project completion rates',
                medium: 'May help students stay on track',
                low: 'Minor timeline adjustment needed',
            },
            milestones: {
                high: 'Critical milestone restructuring required',
                medium: 'Milestone adjustments could improve clarity',
                low: 'Minor milestone refinements suggested',
            },
            resources: {
                high: 'Essential resources missing or inadequate',
                medium: 'Additional resources would be helpful',
                low: 'Resource improvements could enhance experience',
            },
            guidance: {
                high: 'Students need more detailed guidance',
                medium: 'Additional guidance would be beneficial',
                low: 'Minor guidance improvements suggested',
            },
            other: {
                high: 'Significant improvement opportunity identified',
                medium: 'Moderate improvement opportunity',
                low: 'Minor enhancement suggested',
            },
        };

        return impacts[category][priority];
    }
}