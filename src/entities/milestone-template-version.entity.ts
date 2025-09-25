import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { MilestoneTemplate } from './milestone-template.entity';
import { User } from './user.entity';
import {
    TemplateMilestone,
    TemplateConfiguration,
} from './interfaces/template-milestone.interface';

@Entity('milestone_template_versions')
@Index(['templateId', 'version'], { unique: true })
@Index(['templateId', 'isActive'])
export class MilestoneTemplateVersion {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => MilestoneTemplate, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'template_id' })
    template: MilestoneTemplate;

    @Column({ name: 'template_id' })
    templateId: string;

    @Column({ type: 'integer' })
    version: number;

    @Column({ type: 'varchar', length: 200 })
    name: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'varchar', length: 100 })
    specialization: string;

    @Column({ type: 'varchar', length: 50 })
    projectType: string;

    @Column({ type: 'jsonb' })
    milestoneItems: TemplateMilestone[];

    @Column({ type: 'jsonb', nullable: true })
    configuration: TemplateConfiguration | null;

    @Column({ type: 'integer' })
    estimatedDurationWeeks: number;

    @Column({ type: 'text', array: true, default: '{}' })
    tags: string[];

    @Column({ type: 'text', array: true, default: '{}', nullable: true })
    targetAudience: string[] | null;

    @Column({ type: 'jsonb', nullable: true })
    builderMetadata: Record<string, any> | null;

    @Column({ type: 'varchar', length: 500 })
    changeDescription: string;

    @Column({ type: 'jsonb', nullable: true })
    changeDetails: Record<string, any> | null;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'changed_by' })
    changedBy: User;

    @Column({ name: 'changed_by' })
    changedById: string;

    @Column({ type: 'boolean', default: false })
    isActive: boolean;

    @Column({ type: 'boolean', default: false })
    isDraft: boolean;

    @CreateDateColumn()
    createdAt: Date;

    // Helper methods
    activate(): void {
        this.isActive = true;
        this.isDraft = false;
    }

    deactivate(): void {
        this.isActive = false;
    }

    markAsDraft(): void {
        this.isDraft = true;
        this.isActive = false;
    }

    getVersionString(): string {
        return `v${this.version}${this.isDraft ? '-draft' : ''}`;
    }

    getTotalEstimatedHours(): number {
        return this.milestoneItems.reduce(
            (total, item) => total + item.estimatedHours,
            0,
        );
    }

    getMilestoneCount(): number {
        return this.milestoneItems.length;
    }

    getRequiredMilestones(): TemplateMilestone[] {
        if (!this.configuration?.requiredMilestones) {
            return this.milestoneItems;
        }

        return this.milestoneItems.filter((item) =>
            this.configuration!.requiredMilestones.includes(item.title),
        );
    }

    getOptionalMilestones(): TemplateMilestone[] {
        if (!this.configuration?.optionalMilestones) {
            return [];
        }

        return this.milestoneItems.filter((item) =>
            this.configuration!.optionalMilestones.includes(item.title),
        );
    }

    compareWith(otherVersion: MilestoneTemplateVersion): {
        differences: Array<{
            field: string;
            oldValue: any;
            newValue: any;
            type: 'added' | 'removed' | 'modified';
        }>;
        summary: {
            milestonesAdded: number;
            milestonesRemoved: number;
            milestonesModified: number;
            configurationChanged: boolean;
            metadataChanged: boolean;
        };
    } {
        const differences: Array<{
            field: string;
            oldValue: any;
            newValue: any;
            type: 'added' | 'removed' | 'modified';
        }> = [];

        // Compare basic fields
        const basicFields = ['name', 'description', 'specialization', 'projectType', 'estimatedDurationWeeks'];
        for (const field of basicFields) {
            if (this[field] !== otherVersion[field]) {
                differences.push({
                    field,
                    oldValue: otherVersion[field],
                    newValue: this[field],
                    type: 'modified',
                });
            }
        }

        // Compare milestones
        const thisMilestones = new Map(this.milestoneItems.map(m => [m.title, m]));
        const otherMilestones = new Map(otherVersion.milestoneItems.map(m => [m.title, m]));

        let milestonesAdded = 0;
        let milestonesRemoved = 0;
        let milestonesModified = 0;

        // Check for added milestones
        for (const [title, milestone] of thisMilestones) {
            if (!otherMilestones.has(title)) {
                differences.push({
                    field: `milestone.${title}`,
                    oldValue: null,
                    newValue: milestone,
                    type: 'added',
                });
                milestonesAdded++;
            } else {
                // Check for modifications
                const otherMilestone = otherMilestones.get(title)!;
                if (JSON.stringify(milestone) !== JSON.stringify(otherMilestone)) {
                    differences.push({
                        field: `milestone.${title}`,
                        oldValue: otherMilestone,
                        newValue: milestone,
                        type: 'modified',
                    });
                    milestonesModified++;
                }
            }
        }

        // Check for removed milestones
        for (const [title, milestone] of otherMilestones) {
            if (!thisMilestones.has(title)) {
                differences.push({
                    field: `milestone.${title}`,
                    oldValue: milestone,
                    newValue: null,
                    type: 'removed',
                });
                milestonesRemoved++;
            }
        }

        // Compare configuration
        const configurationChanged = JSON.stringify(this.configuration) !== JSON.stringify(otherVersion.configuration);
        if (configurationChanged) {
            differences.push({
                field: 'configuration',
                oldValue: otherVersion.configuration,
                newValue: this.configuration,
                type: 'modified',
            });
        }

        // Compare metadata
        const metadataChanged = JSON.stringify(this.builderMetadata) !== JSON.stringify(otherVersion.builderMetadata);
        if (metadataChanged) {
            differences.push({
                field: 'builderMetadata',
                oldValue: otherVersion.builderMetadata,
                newValue: this.builderMetadata,
                type: 'modified',
            });
        }

        return {
            differences,
            summary: {
                milestonesAdded,
                milestonesRemoved,
                milestonesModified,
                configurationChanged,
                metadataChanged,
            },
        };
    }

    static createFromTemplate(
        template: MilestoneTemplate,
        version: number,
        changeDescription: string,
        changedById: string,
        changeDetails?: Record<string, any>
    ): MilestoneTemplateVersion {
        const templateVersion = new MilestoneTemplateVersion();

        templateVersion.templateId = template.id;
        templateVersion.version = version;
        templateVersion.name = template.name;
        templateVersion.description = template.description;
        templateVersion.specialization = template.specialization;
        templateVersion.projectType = template.projectType;
        templateVersion.milestoneItems = JSON.parse(JSON.stringify(template.milestoneItems));
        templateVersion.configuration = template.configuration ? JSON.parse(JSON.stringify(template.configuration)) : null;
        templateVersion.estimatedDurationWeeks = template.estimatedDurationWeeks;
        templateVersion.tags = [...template.tags];
        templateVersion.changeDescription = changeDescription;
        templateVersion.changeDetails = changeDetails || null;
        templateVersion.changedById = changedById;
        templateVersion.isActive = true;

        return templateVersion;
    }
}
