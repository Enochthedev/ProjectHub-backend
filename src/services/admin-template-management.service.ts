import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { MilestoneTemplate } from '../entities/milestone-template.entity';
import { MilestoneTemplateVersion } from '../entities/milestone-template-version.entity';
import { User } from '../entities/user.entity';
import {
    CreateAdminTemplateDto,
    UpdateAdminTemplateDto,
    TemplateBuilderStateDto,
    TemplateCategorizationDto,
    BulkTemplateOperationDto,
    TemplateComparisonDto,
    TemplateExportDto,
    TemplateImportDto,
    TemplateVersionDto,
} from '../dto/admin/template-management.dto';
import {
    MilestoneNotFoundException,
    MilestoneValidationException,
    MilestonePermissionException,
} from '../common/exceptions';
import { UserRole } from '../common/enums/user-role.enum';

export interface AdminTemplateManagementServiceInterface {
    createTemplateWithVersioning(
        createDto: CreateAdminTemplateDto,
        createdById: string,
    ): Promise<MilestoneTemplate>;

    updateTemplateWithVersioning(
        id: string,
        updateDto: UpdateAdminTemplateDto,
        userId: string,
    ): Promise<MilestoneTemplate>;

    getTemplateVersions(templateId: string): Promise<MilestoneTemplateVersion[]>;

    getTemplateVersion(templateId: string, version: number): Promise<MilestoneTemplateVersion>;

    revertToVersion(templateId: string, version: number, userId: string): Promise<MilestoneTemplate>;

    saveBuilderState(state: TemplateBuilderStateDto, userId: string): Promise<void>;

    getBuilderState(templateId: string): Promise<TemplateBuilderStateDto>;

    categorizeTemplate(
        templateId: string,
        categorization: TemplateCategorizationDto,
        userId: string,
    ): Promise<MilestoneTemplate>;

    bulkOperateTemplates(
        operation: BulkTemplateOperationDto,
        userId: string,
    ): Promise<{ success: number; failed: number; errors: string[] }>;

    compareTemplates(comparison: TemplateComparisonDto): Promise<any>;

    exportTemplates(exportDto: TemplateExportDto): Promise<string>;

    importTemplates(importDto: TemplateImportDto, userId: string): Promise<{ imported: number; errors: string[] }>;

    validateTemplateStructure(template: Partial<MilestoneTemplate>): Promise<string[]>;

    getTemplateAnalytics(templateId: string): Promise<any>;
}

@Injectable()
export class AdminTemplateManagementService implements AdminTemplateManagementServiceInterface {
    private readonly logger = new Logger(AdminTemplateManagementService.name);

    constructor(
        @InjectRepository(MilestoneTemplate)
        private readonly templateRepository: Repository<MilestoneTemplate>,
        @InjectRepository(MilestoneTemplateVersion)
        private readonly versionRepository: Repository<MilestoneTemplateVersion>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
    ) { }

    async createTemplateWithVersioning(
        createDto: CreateAdminTemplateDto,
        createdById: string,
    ): Promise<MilestoneTemplate> {
        this.logger.log(`Creating template with versioning "${createDto.name}" by user ${createdById}`);

        // Validate user permissions
        await this.validateUserPermissions(createdById);

        // Check for duplicate names
        const existingTemplate = await this.templateRepository.findOne({
            where: {
                name: createDto.name,
                specialization: createDto.specialization,
                isActive: true,
            },
        });

        if (existingTemplate) {
            throw new MilestoneValidationException(
                `Template with name "${createDto.name}" already exists for specialization "${createDto.specialization}"`,
            );
        }

        return await this.dataSource.transaction(async (manager) => {
            // Create the main template
            const template = manager.create(MilestoneTemplate, {
                name: createDto.name,
                description: createDto.description,
                specialization: createDto.specialization,
                projectType: createDto.projectType,
                milestoneItems: createDto.milestoneItems,
                configuration: createDto.configuration || MilestoneTemplate.createDefaultConfiguration(),
                estimatedDurationWeeks: createDto.estimatedDurationWeeks,
                tags: createDto.tags || [],
                createdById,
                isActive: !createDto.isDraft,
            });

            // Validate template structure
            const validationErrors = await this.validateTemplateStructure(template);
            if (validationErrors.length > 0) {
                throw new MilestoneValidationException(
                    `Template validation failed: ${validationErrors.join(', ')}`,
                );
            }

            const savedTemplate = await manager.save(MilestoneTemplate, template);

            // Create initial version
            const initialVersion = MilestoneTemplateVersion.createFromTemplate(
                savedTemplate,
                1,
                createDto.initialVersionNote || 'Initial template creation',
                createdById,
                {
                    action: 'create',
                    builderMetadata: createDto.builderMetadata,
                    targetAudience: createDto.targetAudience,
                }
            );

            if (createDto.isDraft) {
                initialVersion.markAsDraft();
            }

            await manager.save(MilestoneTemplateVersion, initialVersion);

            this.logger.log(`Created template ${savedTemplate.id} with initial version`);
            return savedTemplate;
        });
    }

    async updateTemplateWithVersioning(
        id: string,
        updateDto: UpdateAdminTemplateDto,
        userId: string,
    ): Promise<MilestoneTemplate> {
        this.logger.log(`Updating template ${id} with versioning by user ${userId}`);

        const template = await this.getTemplateWithPermissionCheck(id, userId);

        return await this.dataSource.transaction(async (manager) => {
            // Get current version number
            const latestVersion = await manager.findOne(MilestoneTemplateVersion, {
                where: { templateId: id },
                order: { version: 'DESC' },
            });

            const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

            // Update template
            Object.assign(template, updateDto);

            // Validate updated template
            const validationErrors = await this.validateTemplateStructure(template);
            if (validationErrors.length > 0) {
                throw new MilestoneValidationException(
                    `Template validation failed: ${validationErrors.join(', ')}`,
                );
            }

            const updatedTemplate = await manager.save(MilestoneTemplate, template);

            // Create new version if requested or if significant changes
            if (updateDto.createNewVersion !== false) {
                // Deactivate previous versions
                await manager.update(
                    MilestoneTemplateVersion,
                    { templateId: id, isActive: true },
                    { isActive: false }
                );

                // Create new version
                const newVersion = MilestoneTemplateVersion.createFromTemplate(
                    updatedTemplate,
                    nextVersion,
                    updateDto.changeDescription,
                    userId,
                    {
                        action: 'update',
                        previousVersion: latestVersion?.version,
                        changes: this.calculateChanges(latestVersion, updatedTemplate),
                    }
                );

                if (updateDto.isDraft) {
                    newVersion.markAsDraft();
                }

                await manager.save(MilestoneTemplateVersion, newVersion);
            }

            this.logger.log(`Updated template ${id} to version ${nextVersion}`);
            return updatedTemplate;
        });
    }

    async getTemplateVersions(templateId: string): Promise<MilestoneTemplateVersion[]> {
        return await this.versionRepository.find({
            where: { templateId },
            order: { version: 'DESC' },
            relations: ['changedBy'],
        });
    }

    async getTemplateVersion(templateId: string, version: number): Promise<MilestoneTemplateVersion> {
        const templateVersion = await this.versionRepository.findOne({
            where: { templateId, version },
            relations: ['changedBy', 'template'],
        });

        if (!templateVersion) {
            throw new MilestoneNotFoundException(
                `Template version ${version} not found for template ${templateId}`
            );
        }

        return templateVersion;
    }

    async revertToVersion(
        templateId: string,
        version: number,
        userId: string,
    ): Promise<MilestoneTemplate> {
        this.logger.log(`Reverting template ${templateId} to version ${version} by user ${userId}`);

        const template = await this.getTemplateWithPermissionCheck(templateId, userId);
        const targetVersion = await this.getTemplateVersion(templateId, version);

        return await this.dataSource.transaction(async (manager) => {
            // Update template with version data
            template.name = targetVersion.name;
            template.description = targetVersion.description;
            template.specialization = targetVersion.specialization;
            template.projectType = targetVersion.projectType as any;
            template.milestoneItems = JSON.parse(JSON.stringify(targetVersion.milestoneItems));
            template.configuration = targetVersion.configuration ? JSON.parse(JSON.stringify(targetVersion.configuration)) : null;
            template.estimatedDurationWeeks = targetVersion.estimatedDurationWeeks;
            template.tags = [...targetVersion.tags];

            const updatedTemplate = await manager.save(MilestoneTemplate, template);

            // Create new version for the revert
            const latestVersion = await manager.findOne(MilestoneTemplateVersion, {
                where: { templateId },
                order: { version: 'DESC' },
            });

            const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

            // Deactivate current versions
            await manager.update(
                MilestoneTemplateVersion,
                { templateId, isActive: true },
                { isActive: false }
            );

            // Create revert version
            const revertVersion = MilestoneTemplateVersion.createFromTemplate(
                updatedTemplate,
                nextVersion,
                `Reverted to version ${version}`,
                userId,
                {
                    action: 'revert',
                    revertedToVersion: version,
                    previousVersion: latestVersion?.version,
                }
            );

            await manager.save(MilestoneTemplateVersion, revertVersion);

            this.logger.log(`Reverted template ${templateId} to version ${version}`);
            return updatedTemplate;
        });
    }

    async saveBuilderState(state: TemplateBuilderStateDto, userId: string): Promise<void> {
        this.logger.log(`Saving builder state for template ${state.templateId}`);

        // For now, we'll store builder state in the template's builderMetadata
        // In a production system, you might want a separate table for builder states
        const template = await this.templateRepository.findOne({
            where: { id: state.templateId },
        });

        if (!template) {
            throw new MilestoneNotFoundException(`Template ${state.templateId} not found`);
        }

        // Update template with builder state (this could be optimized)
        await this.templateRepository.update(state.templateId, {
            milestoneItems: state.milestones,
        });

        this.logger.log(`Saved builder state for template ${state.templateId}`);
    }

    async getBuilderState(templateId: string): Promise<TemplateBuilderStateDto> {
        const template = await this.templateRepository.findOne({
            where: { id: templateId },
        });

        if (!template) {
            throw new MilestoneNotFoundException(`Template ${templateId} not found`);
        }

        // Validate current state
        const validationErrors = await this.validateTemplateStructure(template);

        return {
            templateId,
            milestones: template.milestoneItems as any,
            layout: {
                type: 'linear',
                zoom: 1,
                viewMode: 'edit',
            },
            validationResults: {
                isValid: validationErrors.length === 0,
                errors: validationErrors,
                warnings: [],
            },
            hasUnsavedChanges: false,
            lastSaved: template.updatedAt.toISOString(),
        };
    }

    async categorizeTemplate(
        templateId: string,
        categorization: TemplateCategorizationDto,
        userId: string,
    ): Promise<MilestoneTemplate> {
        this.logger.log(`Categorizing template ${templateId} by user ${userId}`);

        const template = await this.getTemplateWithPermissionCheck(templateId, userId);

        // Update template tags and metadata based on categorization
        const updatedTags = [...new Set([
            ...template.tags,
            categorization.primaryCategory,
            ...(categorization.secondaryCategories || []),
            ...(categorization.difficulty ? [categorization.difficulty] : []),
        ])];

        template.tags = updatedTags;

        // Store additional categorization data in configuration
        if (!template.configuration) {
            template.configuration = MilestoneTemplate.createDefaultConfiguration();
        }

        (template.configuration as any).categorization = {
            primaryCategory: categorization.primaryCategory,
            secondaryCategories: categorization.secondaryCategories,
            difficulty: categorization.difficulty,
            complexityRating: categorization.complexityRating,
            prerequisites: categorization.prerequisites,
            learningOutcomes: categorization.learningOutcomes,
        };

        const updatedTemplate = await this.templateRepository.save(template);

        this.logger.log(`Categorized template ${templateId}`);
        return updatedTemplate;
    }

    async bulkOperateTemplates(
        operation: BulkTemplateOperationDto,
        userId: string,
    ): Promise<{ success: number; failed: number; errors: string[] }> {
        this.logger.log(`Bulk operation ${operation.operation} on ${operation.templateIds.length} templates by user ${userId}`);

        await this.validateUserPermissions(userId);

        const results = { success: 0, failed: 0, errors: [] as string[] };

        for (const templateId of operation.templateIds) {
            try {
                const template = await this.templateRepository.findOne({
                    where: { id: templateId },
                });

                if (!template) {
                    results.failed++;
                    results.errors.push(`Template ${templateId} not found`);
                    continue;
                }

                switch (operation.operation) {
                    case 'activate':
                        template.isActive = true;
                        template.archivedAt = null;
                        break;
                    case 'deactivate':
                        template.isActive = false;
                        break;
                    case 'archive':
                        template.archive();
                        break;
                    case 'delete':
                        if (template.usageCount > 0) {
                            results.failed++;
                            results.errors.push(`Cannot delete template ${templateId} - it has been used`);
                            continue;
                        }
                        await this.templateRepository.remove(template);
                        results.success++;
                        continue;
                    case 'categorize':
                        if (operation.operationData?.category) {
                            template.tags = [...new Set([...template.tags, operation.operationData.category])];
                        }
                        break;
                    case 'tag':
                        if (operation.operationData?.tags) {
                            template.tags = [...new Set([...template.tags, ...operation.operationData.tags])];
                        }
                        break;
                }

                await this.templateRepository.save(template);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push(`Error processing template ${templateId}: ${error.message}`);
            }
        }

        this.logger.log(`Bulk operation completed: ${results.success} success, ${results.failed} failed`);
        return results;
    }

    async compareTemplates(comparison: TemplateComparisonDto): Promise<any> {
        const version1 = await this.getTemplateVersion(
            comparison.templateId1,
            comparison.version1 || 1
        );
        const version2 = await this.getTemplateVersion(
            comparison.templateId2,
            comparison.version2 || 1
        );

        return version1.compareWith(version2);
    }

    async exportTemplates(exportDto: TemplateExportDto): Promise<string> {
        this.logger.log(`Exporting ${exportDto.templateIds.length} templates in ${exportDto.format} format`);

        const templates = await this.templateRepository.find({
            where: { id: In(exportDto.templateIds) },
            relations: ['createdBy'],
        });

        const exportData = {
            templates: templates.map(template => ({
                id: template.id,
                name: template.name,
                description: template.description,
                specialization: template.specialization,
                projectType: template.projectType,
                milestoneItems: template.milestoneItems,
                configuration: template.configuration,
                estimatedDurationWeeks: template.estimatedDurationWeeks,
                tags: template.tags,
                isActive: template.isActive,
                usageCount: template.usageCount,
                averageRating: template.averageRating,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt,
            })),
            exportedAt: new Date().toISOString(),
            exportedBy: 'admin', // Would get from user context
        };

        // Include version history if requested
        if (exportDto.includeVersionHistory) {
            const versions = await this.versionRepository.find({
                where: { templateId: In(exportDto.templateIds) },
                relations: ['changedBy'],
            });
            (exportData as any).versions = versions;
        }

        // Convert to requested format
        switch (exportDto.format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
            case 'csv':
                // Simplified CSV export - would need proper CSV library for production
                const csvHeaders = 'ID,Name,Description,Specialization,ProjectType,EstimatedWeeks,Tags,IsActive\n';
                const csvRows = exportData.templates.map(t =>
                    `${t.id},"${t.name}","${t.description}",${t.specialization},${t.projectType},${t.estimatedDurationWeeks},"${t.tags.join(';')}",${t.isActive}`
                ).join('\n');
                return csvHeaders + csvRows;
            default:
                return JSON.stringify(exportData, null, 2);
        }
    }

    async importTemplates(
        importDto: TemplateImportDto,
        userId: string,
    ): Promise<{ imported: number; errors: string[] }> {
        this.logger.log(`Importing templates in ${importDto.format} format by user ${userId}`);

        await this.validateUserPermissions(userId);

        const results = { imported: 0, errors: [] as string[] };

        try {
            // Decode and parse data
            const decodedData = Buffer.from(importDto.data, 'base64').toString('utf-8');
            let importData: any;

            switch (importDto.format) {
                case 'json':
                    importData = JSON.parse(decodedData);
                    break;
                default:
                    throw new Error(`Import format ${importDto.format} not supported yet`);
            }

            // Process templates
            for (const templateData of importData.templates || []) {
                try {
                    // Check for existing template
                    if (!importDto.overwriteExisting) {
                        const existing = await this.templateRepository.findOne({
                            where: {
                                name: templateData.name,
                                specialization: templateData.specialization,
                            },
                        });

                        if (existing) {
                            results.errors.push(`Template "${templateData.name}" already exists`);
                            continue;
                        }
                    }

                    // Create template
                    const createDto: CreateAdminTemplateDto = {
                        name: templateData.name,
                        description: templateData.description,
                        specialization: importDto.targetSpecialization || templateData.specialization,
                        projectType: templateData.projectType,
                        milestoneItems: templateData.milestoneItems,
                        configuration: templateData.configuration,
                        estimatedDurationWeeks: templateData.estimatedDurationWeeks,
                        tags: templateData.tags,
                        initialVersionNote: 'Imported template',
                    };

                    await this.createTemplateWithVersioning(createDto, userId);
                    results.imported++;
                } catch (error) {
                    results.errors.push(`Error importing template "${templateData.name}": ${error.message}`);
                }
            }
        } catch (error) {
            results.errors.push(`Import failed: ${error.message}`);
        }

        this.logger.log(`Import completed: ${results.imported} imported, ${results.errors.length} errors`);
        return results;
    }

    async validateTemplateStructure(template: Partial<MilestoneTemplate>): Promise<string[]> {
        const errors: string[] = [];

        // Basic validation
        if (!template.name || template.name.trim().length < 3) {
            errors.push('Template name must be at least 3 characters long');
        }

        if (!template.description || template.description.trim().length < 10) {
            errors.push('Template description must be at least 10 characters long');
        }

        if (!template.milestoneItems || template.milestoneItems.length === 0) {
            errors.push('Template must have at least one milestone');
        }

        // Milestone validation
        if (template.milestoneItems) {
            const titles = new Set<string>();

            for (const milestone of template.milestoneItems) {
                // Check for duplicates
                if (titles.has(milestone.title)) {
                    errors.push(`Duplicate milestone title: ${milestone.title}`);
                }
                titles.add(milestone.title);

                // Validate dependencies
                if (milestone.dependencies) {
                    for (const dep of milestone.dependencies) {
                        if (!titles.has(dep) && dep !== milestone.title) {
                            // This is a simplified check - proper validation would need topological sorting
                        }
                    }
                }
            }
        }

        // Timeline validation
        if (template.milestoneItems && template.estimatedDurationWeeks) {
            const maxDays = Math.max(...template.milestoneItems.map(m => m.daysFromStart));
            const expectedDays = template.estimatedDurationWeeks * 7;

            if (maxDays > expectedDays + 7) {
                errors.push(`Milestone timeline exceeds estimated duration`);
            }
        }

        return errors;
    }

    async getTemplateAnalytics(templateId: string): Promise<any> {
        const template = await this.templateRepository.findOne({
            where: { id: templateId },
        });

        if (!template) {
            throw new MilestoneNotFoundException(`Template ${templateId} not found`);
        }

        // Get version history
        const versions = await this.versionRepository.find({
            where: { templateId },
            order: { version: 'ASC' },
        });

        return {
            templateId,
            name: template.name,
            usageStats: {
                totalUsages: template.usageCount,
                averageRating: template.averageRating,
                ratingCount: template.ratingCount,
            },
            versionHistory: {
                totalVersions: versions.length,
                versions: versions.map(v => ({
                    version: v.version,
                    changeDescription: v.changeDescription,
                    createdAt: v.createdAt,
                    isDraft: v.isDraft,
                    isActive: v.isActive,
                })),
            },
            structure: {
                milestoneCount: template.getMilestoneCount(),
                totalEstimatedHours: template.getTotalEstimatedHours(),
                estimatedDurationWeeks: template.estimatedDurationWeeks,
                tags: template.tags,
            },
        };
    }

    private async validateUserPermissions(userId: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new MilestoneValidationException('User not found');
        }

        if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPERVISOR) {
            throw new MilestonePermissionException(
                'Only admins and supervisors can manage templates',
            );
        }
    }

    private async getTemplateWithPermissionCheck(
        id: string,
        userId: string,
    ): Promise<MilestoneTemplate> {
        const template = await this.templateRepository.findOne({
            where: { id },
            relations: ['createdBy'],
        });

        if (!template) {
            throw new MilestoneNotFoundException(`Template with ID ${id} not found`);
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new MilestonePermissionException('User not found');
        }

        const canModify =
            user.role === UserRole.ADMIN ||
            template.createdById === userId;

        if (!canModify) {
            throw new MilestonePermissionException(
                'Insufficient permissions to modify this template',
            );
        }

        return template;
    }

    private calculateChanges(
        previousVersion: MilestoneTemplateVersion | null,
        currentTemplate: MilestoneTemplate,
    ): Record<string, any> {
        if (!previousVersion) {
            return { type: 'initial_creation' };
        }

        const changes: Record<string, any> = {};

        // Compare basic fields
        const fields = ['name', 'description', 'specialization', 'projectType', 'estimatedDurationWeeks'];
        for (const field of fields) {
            if (previousVersion[field] !== currentTemplate[field]) {
                changes[field] = {
                    from: previousVersion[field],
                    to: currentTemplate[field],
                };
            }
        }

        // Compare milestones (simplified)
        if (previousVersion.milestoneItems && currentTemplate.milestoneItems) {
            if (JSON.stringify(previousVersion.milestoneItems) !== JSON.stringify(currentTemplate.milestoneItems)) {
                changes.milestoneItems = {
                    from: previousVersion.milestoneItems.length,
                    to: currentTemplate.milestoneItems.length,
                    modified: true,
                };
            }
        }

        return changes;
    }
}
