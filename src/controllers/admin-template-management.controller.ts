import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus,
    BadRequestException,
    ForbiddenException,
    ParseUUIDPipe,
    ParseIntPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { AdminTemplateManagementService } from '../services/admin-template-management.service';
import {
    CreateAdminTemplateDto,
    UpdateAdminTemplateDto,
    TemplateBuilderStateDto,
    TemplateCategorizationDto,
    BulkTemplateOperationDto,
    TemplateComparisonDto,
    TemplateExportDto,
    TemplateImportDto,
} from '../dto/admin/template-management.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('admin-template-management')
@ApiBearerAuth('JWT-auth')
@Controller('admin/templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
export class AdminTemplateManagementController {
    constructor(
        private readonly adminTemplateService: AdminTemplateManagementService,
    ) { }

    @Post()
    @ApiOperation({
        summary: 'Create template with versioning support',
        description: 'Create a new milestone template with automatic versioning and builder support',
    })
    @ApiResponse({
        status: 201,
        description: 'Template created successfully with initial version',
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid template data or validation failed',
    })
    @ApiResponse({
        status: 403,
        description: 'Only admins and supervisors can create templates',
    })
    async createTemplateWithVersioning(
        @Request() req: any,
        @Body() createDto: CreateAdminTemplateDto,
    ) {
        try {
            const template = await this.adminTemplateService.createTemplateWithVersioning(
                createDto,
                req.user.id,
            );
            return {
                success: true,
                data: template,
                message: 'Template created successfully with versioning',
            };
        } catch (error) {
            if (error.message.includes('validation') || error.message.includes('duplicate')) {
                throw new BadRequestException(error.message);
            }
            if (error.message.includes('permission')) {
                throw new ForbiddenException(error.message);
            }
            throw error;
        }
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Update template with versioning',
        description: 'Update template and create new version if significant changes',
    })
    @ApiResponse({
        status: 200,
        description: 'Template updated successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async updateTemplateWithVersioning(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() updateDto: UpdateAdminTemplateDto,
    ) {
        try {
            const template = await this.adminTemplateService.updateTemplateWithVersioning(
                id,
                updateDto,
                req.user.id,
            );
            return {
                success: true,
                data: template,
                message: 'Template updated successfully',
            };
        } catch (error) {
            if (error.message.includes('permission')) {
                throw new ForbiddenException(error.message);
            }
            if (error.message.includes('validation')) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }
    }

    @Get(':id/versions')
    @ApiOperation({
        summary: 'Get template version history',
        description: 'Retrieve all versions of a template',
    })
    @ApiResponse({
        status: 200,
        description: 'Version history retrieved successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async getTemplateVersions(@Param('id', ParseUUIDPipe) id: string) {
        const versions = await this.adminTemplateService.getTemplateVersions(id);
        return {
            success: true,
            data: versions,
            message: 'Version history retrieved successfully',
        };
    }

    @Get(':id/versions/:version')
    @ApiOperation({
        summary: 'Get specific template version',
        description: 'Retrieve a specific version of a template',
    })
    @ApiResponse({
        status: 200,
        description: 'Template version retrieved successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiParam({ name: 'version', description: 'Version number' })
    async getTemplateVersion(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('version', ParseIntPipe) version: number,
    ) {
        const templateVersion = await this.adminTemplateService.getTemplateVersion(id, version);
        return {
            success: true,
            data: templateVersion,
            message: 'Template version retrieved successfully',
        };
    }

    @Post(':id/revert/:version')
    @ApiOperation({
        summary: 'Revert template to specific version',
        description: 'Revert template to a previous version and create new version entry',
    })
    @ApiResponse({
        status: 200,
        description: 'Template reverted successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    @ApiParam({ name: 'version', description: 'Version number to revert to' })
    async revertToVersion(
        @Param('id', ParseUUIDPipe) id: string,
        @Param('version', ParseIntPipe) version: number,
        @Request() req: any,
    ) {
        try {
            const template = await this.adminTemplateService.revertToVersion(
                id,
                version,
                req.user.id,
            );
            return {
                success: true,
                data: template,
                message: `Template reverted to version ${version} successfully`,
            };
        } catch (error) {
            if (error.message.includes('permission')) {
                throw new ForbiddenException(error.message);
            }
            throw error;
        }
    }

    @Post(':id/builder/save')
    @ApiOperation({
        summary: 'Save template builder state',
        description: 'Save the current state of the drag-and-drop template builder',
    })
    @ApiResponse({
        status: 200,
        description: 'Builder state saved successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async saveBuilderState(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() state: TemplateBuilderStateDto,
    ) {
        // Ensure the template ID matches
        state.templateId = id;

        await this.adminTemplateService.saveBuilderState(state, req.user.id);
        return {
            success: true,
            message: 'Builder state saved successfully',
        };
    }

    @Get(':id/builder')
    @ApiOperation({
        summary: 'Get template builder state',
        description: 'Retrieve the current state for the template builder',
    })
    @ApiResponse({
        status: 200,
        description: 'Builder state retrieved successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async getBuilderState(@Param('id', ParseUUIDPipe) id: string) {
        const state = await this.adminTemplateService.getBuilderState(id);
        return {
            success: true,
            data: state,
            message: 'Builder state retrieved successfully',
        };
    }

    @Post(':id/categorize')
    @ApiOperation({
        summary: 'Categorize template',
        description: 'Add categorization and metadata to template',
    })
    @ApiResponse({
        status: 200,
        description: 'Template categorized successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async categorizeTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Request() req: any,
        @Body() categorization: TemplateCategorizationDto,
    ) {
        // Ensure the template ID matches
        categorization.templateId = id;

        try {
            const template = await this.adminTemplateService.categorizeTemplate(
                id,
                categorization,
                req.user.id,
            );
            return {
                success: true,
                data: template,
                message: 'Template categorized successfully',
            };
        } catch (error) {
            if (error.message.includes('permission')) {
                throw new ForbiddenException(error.message);
            }
            throw error;
        }
    }

    @Post('bulk-operation')
    @ApiOperation({
        summary: 'Perform bulk operations on templates',
        description: 'Perform bulk operations like activate, deactivate, archive, delete on multiple templates',
    })
    @ApiResponse({
        status: 200,
        description: 'Bulk operation completed',
    })
    async bulkOperateTemplates(
        @Request() req: any,
        @Body() operation: BulkTemplateOperationDto,
    ) {
        try {
            const results = await this.adminTemplateService.bulkOperateTemplates(
                operation,
                req.user.id,
            );
            return {
                success: true,
                data: results,
                message: `Bulk operation completed: ${results.success} successful, ${results.failed} failed`,
            };
        } catch (error) {
            if (error.message.includes('permission')) {
                throw new ForbiddenException(error.message);
            }
            throw error;
        }
    }

    @Post('compare')
    @ApiOperation({
        summary: 'Compare templates or versions',
        description: 'Compare two templates or different versions of templates',
    })
    @ApiResponse({
        status: 200,
        description: 'Template comparison completed',
    })
    async compareTemplates(@Body() comparison: TemplateComparisonDto) {
        const comparisonResult = await this.adminTemplateService.compareTemplates(comparison);
        return {
            success: true,
            data: comparisonResult,
            message: 'Template comparison completed successfully',
        };
    }

    @Post('export')
    @ApiOperation({
        summary: 'Export templates',
        description: 'Export selected templates in various formats',
    })
    @ApiResponse({
        status: 200,
        description: 'Templates exported successfully',
    })
    async exportTemplates(@Body() exportDto: TemplateExportDto) {
        const exportData = await this.adminTemplateService.exportTemplates(exportDto);
        return {
            success: true,
            data: exportData,
            message: `${exportDto.templateIds.length} templates exported successfully`,
        };
    }

    @Post('import')
    @ApiOperation({
        summary: 'Import templates',
        description: 'Import templates from various formats',
    })
    @ApiResponse({
        status: 200,
        description: 'Templates imported successfully',
    })
    async importTemplates(
        @Request() req: any,
        @Body() importDto: TemplateImportDto,
    ) {
        try {
            const results = await this.adminTemplateService.importTemplates(
                importDto,
                req.user.id,
            );
            return {
                success: true,
                data: results,
                message: `Import completed: ${results.imported} templates imported`,
            };
        } catch (error) {
            if (error.message.includes('permission')) {
                throw new ForbiddenException(error.message);
            }
            throw error;
        }
    }

    @Get(':id/analytics')
    @ApiOperation({
        summary: 'Get template analytics',
        description: 'Get detailed analytics and usage statistics for a template',
    })
    @ApiResponse({
        status: 200,
        description: 'Template analytics retrieved successfully',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async getTemplateAnalytics(@Param('id', ParseUUIDPipe) id: string) {
        const analytics = await this.adminTemplateService.getTemplateAnalytics(id);
        return {
            success: true,
            data: analytics,
            message: 'Template analytics retrieved successfully',
        };
    }

    @Post(':id/validate')
    @ApiOperation({
        summary: 'Validate template structure',
        description: 'Validate template structure and return validation errors',
    })
    @ApiResponse({
        status: 200,
        description: 'Template validation completed',
    })
    @ApiParam({ name: 'id', description: 'Template UUID' })
    async validateTemplate(@Param('id', ParseUUIDPipe) id: string) {
        // Get template first
        const template = await this.adminTemplateService.getTemplateAnalytics(id);
        const validationErrors = await this.adminTemplateService.validateTemplateStructure(template);

        return {
            success: true,
            data: {
                isValid: validationErrors.length === 0,
                errors: validationErrors,
                templateId: id,
            },
            message: validationErrors.length === 0 ? 'Template is valid' : 'Template has validation errors',
        };
    }
}
