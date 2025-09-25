import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { MilestoneTemplate } from './milestone-template.entity';
import { User } from './user.entity';
import { Project } from './project.entity';

@Entity('template_effectiveness')
@Index(['templateId', 'projectId'], { unique: true })
@Index(['templateId', 'completionStatus'])
@Index(['templateId', 'createdAt'])
export class TemplateEffectiveness {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => MilestoneTemplate, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'template_id' })
    template: MilestoneTemplate;

    @Column({ name: 'template_id' })
    templateId: string;

    @ManyToOne(() => Project, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'project_id' })
    project: Project;

    @Column({ name: 'project_id' })
    projectId: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'student_id' })
    student: User;

    @Column({ name: 'student_id' })
    studentId: string;

    @Column({ type: 'enum', enum: ['not_started', 'in_progress', 'completed', 'abandoned'] })
    completionStatus: 'not_started' | 'in_progress' | 'completed' | 'abandoned';

    @Column({ type: 'integer', default: 0 })
    totalMilestones: number;

    @Column({ type: 'integer', default: 0 })
    completedMilestones: number;

    @Column({ type: 'integer', default: 0 })
    overdueMilestones: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    completionPercentage: number | null;

    @Column({ type: 'integer', nullable: true })
    actualDurationDays: number | null;

    @Column({ type: 'integer', nullable: true })
    estimatedDurationDays: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    durationVariance: number | null; // Actual vs Estimated duration ratio

    @Column({ type: 'integer', nullable: true })
    totalTimeSpentHours: number | null;

    @Column({ type: 'integer', nullable: true })
    estimatedTimeHours: number | null;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    timeVariance: number | null; // Actual vs Estimated time ratio

    @Column({ type: 'jsonb', nullable: true })
    milestoneCompletionData: Array<{
        milestoneTitle: string;
        estimatedDays: number;
        actualDays: number | null;
        status: 'completed' | 'overdue' | 'pending';
        completedAt: string | null;
    }> | null;

    @Column({ type: 'jsonb', nullable: true })
    customizations: Array<{
        type: 'milestone_added' | 'milestone_removed' | 'milestone_modified' | 'timeline_adjusted';
        description: string;
        timestamp: string;
    }> | null;

    @Column({ type: 'integer', nullable: true })
    studentRating: number | null; // 1-5 rating

    @Column({ type: 'text', nullable: true })
    studentFeedback: string | null;

    @Column({ type: 'jsonb', nullable: true })
    difficultyRatings: {
        overall: number | null;
        milestones: Array<{
            title: string;
            difficulty: number; // 1-5 scale
        }>;
    } | null;

    @Column({ type: 'jsonb', nullable: true })
    improvementSuggestions: Array<{
        category: 'timeline' | 'milestones' | 'resources' | 'guidance' | 'other';
        suggestion: string;
        priority: 'low' | 'medium' | 'high';
    }> | null;

    @Column({ type: 'boolean', default: false })
    isRecommended: boolean; // Whether student would recommend this template

    @Column({ type: 'timestamp', nullable: true })
    startedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    completedAt: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    lastActivityAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Helper methods
    calculateCompletionPercentage(): number {
        if (this.totalMilestones === 0) return 0;
        return Math.round((this.completedMilestones / this.totalMilestones) * 100);
    }

    calculateDurationVariance(): number | null {
        if (!this.actualDurationDays || !this.estimatedDurationDays) return null;
        return this.actualDurationDays / this.estimatedDurationDays;
    }

    calculateTimeVariance(): number | null {
        if (!this.totalTimeSpentHours || !this.estimatedTimeHours) return null;
        return this.totalTimeSpentHours / this.estimatedTimeHours;
    }

    updateCompletionStatus(): void {
        const percentage = this.calculateCompletionPercentage();

        if (percentage === 0) {
            this.completionStatus = 'not_started';
        } else if (percentage === 100) {
            this.completionStatus = 'completed';
            this.completedAt = new Date();
        } else {
            this.completionStatus = 'in_progress';
        }

        this.completionPercentage = percentage;
        this.lastActivityAt = new Date();
    }

    addCustomization(
        type: 'milestone_added' | 'milestone_removed' | 'milestone_modified' | 'timeline_adjusted',
        description: string
    ): void {
        if (!this.customizations) {
            this.customizations = [];
        }

        this.customizations.push({
            type,
            description,
            timestamp: new Date().toISOString(),
        });
    }

    addImprovementSuggestion(
        category: 'timeline' | 'milestones' | 'resources' | 'guidance' | 'other',
        suggestion: string,
        priority: 'low' | 'medium' | 'high' = 'medium'
    ): void {
        if (!this.improvementSuggestions) {
            this.improvementSuggestions = [];
        }

        this.improvementSuggestions.push({
            category,
            suggestion,
            priority,
        });
    }

    setStudentFeedback(
        rating: number,
        feedback: string,
        isRecommended: boolean,
        difficultyRatings?: {
            overall: number;
            milestones: Array<{ title: string; difficulty: number }>;
        }
    ): void {
        this.studentRating = Math.max(1, Math.min(5, rating)); // Ensure 1-5 range
        this.studentFeedback = feedback;
        this.isRecommended = isRecommended;

        if (difficultyRatings) {
            this.difficultyRatings = difficultyRatings;
        }
    }

    updateMilestoneProgress(
        milestoneTitle: string,
        status: 'completed' | 'overdue' | 'pending',
        actualDays?: number
    ): void {
        if (!this.milestoneCompletionData) {
            this.milestoneCompletionData = [];
        }

        const existingIndex = this.milestoneCompletionData.findIndex(
            m => m.milestoneTitle === milestoneTitle
        );

        const milestoneData = {
            milestoneTitle,
            estimatedDays: 0, // This should be set from template data
            actualDays: actualDays || null,
            status,
            completedAt: status === 'completed' ? new Date().toISOString() : null,
        };

        if (existingIndex >= 0) {
            this.milestoneCompletionData[existingIndex] = milestoneData;
        } else {
            this.milestoneCompletionData.push(milestoneData);
        }

        // Update counters
        this.completedMilestones = this.milestoneCompletionData.filter(m => m.status === 'completed').length;
        this.overdueMilestones = this.milestoneCompletionData.filter(m => m.status === 'overdue').length;

        this.updateCompletionStatus();
    }

    getEffectivenessScore(): number {
        let score = 0;
        let factors = 0;

        // Completion rate (40% weight)
        if (this.completionPercentage !== null) {
            score += (this.completionPercentage / 100) * 0.4;
            factors += 0.4;
        }

        // Time efficiency (20% weight)
        if (this.timeVariance !== null) {
            const timeEfficiency = Math.max(0, Math.min(1, 2 - this.timeVariance)); // Better if closer to 1
            score += timeEfficiency * 0.2;
            factors += 0.2;
        }

        // Duration efficiency (20% weight)
        if (this.durationVariance !== null) {
            const durationEfficiency = Math.max(0, Math.min(1, 2 - this.durationVariance));
            score += durationEfficiency * 0.2;
            factors += 0.2;
        }

        // Student satisfaction (20% weight)
        if (this.studentRating !== null) {
            score += (this.studentRating / 5) * 0.2;
            factors += 0.2;
        }

        return factors > 0 ? Math.round((score / factors) * 100) : 0;
    }

    isOnTrack(): boolean {
        if (this.completionStatus === 'completed') return true;
        if (this.completionStatus === 'abandoned') return false;

        const now = new Date();
        const daysSinceStart = this.startedAt
            ? Math.floor((now.getTime() - this.startedAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const expectedProgress = this.estimatedDurationDays
            ? (daysSinceStart / this.estimatedDurationDays) * 100
            : 0;

        const actualProgress = this.completionPercentage || 0;

        // Consider on track if within 10% of expected progress
        return actualProgress >= (expectedProgress - 10);
    }

    static createFromProject(
        templateId: string,
        projectId: string,
        studentId: string,
        totalMilestones: number,
        estimatedDurationDays: number,
        estimatedTimeHours: number
    ): TemplateEffectiveness {
        const effectiveness = new TemplateEffectiveness();

        effectiveness.templateId = templateId;
        effectiveness.projectId = projectId;
        effectiveness.studentId = studentId;
        effectiveness.completionStatus = 'not_started';
        effectiveness.totalMilestones = totalMilestones;
        effectiveness.completedMilestones = 0;
        effectiveness.overdueMilestones = 0;
        effectiveness.estimatedDurationDays = estimatedDurationDays;
        effectiveness.estimatedTimeHours = estimatedTimeHours;
        effectiveness.startedAt = new Date();

        return effectiveness;
    }
}
