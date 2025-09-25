import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminTemplateManagementService } from '../admin-template-management.service';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { MilestoneTemplateVersion } from '../../entities/milestone-template-version.entity';
import { User } from '../../entities/user.entity';
import {
    CreateAdminTemplateDto,
    UpdateAdminTemplateDto,
    BulkTemplateOperationDto,
} from '../../dto/admin/template-management.dto';
import {
    MilestoneNotFoundException,
    MilestoneValidationException,
    MilestonePermissionException,
} from '../../common/exceptions';
import { UserRole } from '../../common/enums/user-role.enum';
import { ProjectType, Priority } from '../../common/enums';

describe('AdminTemplateManagementService', () => {
    let service: AdminTemplateManagementService;
    let templateRepository: jest.Mocked<Repository<MilestoneTemplate>>;
    let versionRepository: jest.Mocked<Repository<MilestoneTemplateVersion>>;
    let userRepository: jest.Mocked<Repository<User>>;
    let dataSource: jest.Mocked<DataSource>;

    const mockUser = {
        id: 'user-1',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
    } as User;

    const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test template description',
        specialization: 'Computer Science',
        projectType: ProjectType.RESEARCH,
        milestoneItems: [
            {
                title: 'Milestone 1',
                description: 'First milestone',
                daysFromStart: 7,
                priority: Priority.HIGH,
                estimatedHours: 40,
            },
        ],
        configuration: {
            allowCustomization: true,
            minimumDurationWeeks: 4,
            maximumDurationWeeks: 52,
            requiredMilestones: [],
            optionalMilestones: [],
        },
        estimatedDurationWeeks: 12,
        tags: ['test'],
        createdById: 'user-1',
        isActive: true,
        usageCount: 0,
        averageRating: 0,
        ratingCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        getMilestoneCount: jest.fn().mockReturnValue(1),
        getTotalEstimatedHours: jest.fn().mockReturnValue(40),
        validateMilestoneItems: jest.fn().mockReturnValue([]),
    } as any;

    const mockCreateDto: CreateAdminTemplateDto = {
        name: 'New Template',
        description: 'New template description',
        specialization: 'Computer Science',
        projectType: ProjectType.RESEARCH,
        milestoneItems: [
            {
                title: 'Milestone 1',
                description: 'First milestone',
                daysFromStart: 7,
                priority: Priority.HIGH,
                estimatedHours: 40,
            },
        ],
        estimatedDurationWeeks: 12,
        tags: ['new'],
    };

    beforeEach(async () => {
        const mockTemplateRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
        };

        const mockVersionRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };

        const mockUserRepository = {
            findOne: jest.fn(),
        };

        const mockDataSource = {
            transaction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AdminTemplateManagementService,
                {
                    provide: getRepositoryToken(MilestoneTemplate),
                    useValue: mockTemplateRepository,
                },
                {
                    provide: getRepositoryToken(MilestoneTemplateVersion),
                    useValue: mockVersionRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        service = module.get<AdminTemplateManagementService>(AdminTemplateManagementService);
        templateRepository = module.get(getRepositoryToken(MilestoneTemplate));
        versionRepository = module.get(getRepositoryToken(MilestoneTemplateVersion));
        userRepository = module.get(getRepositoryToken(User));
        dataSource = module.get(DataSource);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createTemplateWithVersioning', () => {
        it('should create template with initial version successfully', async () => {
            userRepository.findOne.mockResolvedValue(mockUser);
            templateRepository.findOne.mockResolvedValue(null); // No existing template

            const mockManager = {
                create: jest.fn().mockReturnValue(mockTemplate),
                save: jest.fn().mockResolvedValue(mockTemplate),
            };

            dataSource.transaction.mockImplementation(async (callback: any) => {
                return await callback(mockManager);
            });

            const result = await service.createTemplateWithVersioning(mockCreateDto, 'user-1');

            expect(result).toEqual(mockTemplate);
            expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-1' } });
            expect(templateRepository.findOne).toHaveBeenCalledWith({
                where: {
                    name: mockCreateDto.name,
                    specialization: mockCreateDto.specialization,
                    isActive: true,
                },
            });
            expect(mockManager.create).toHaveBeenCalledWith(MilestoneTemplate, expect.any(Object));
            expect(mockManager.save).toHaveBeenCalledTimes(2); // Template and version
        });

        it('should throw validation exception for duplicate template name', async () => {
            userRepository.findOne.mockResolvedValue(mockUser);
            templateRepository.findOne.mockResolvedValue(mockTemplate); // Existing template

            await expect(
                service.createTemplateWithVersioning(mockCreateDto, 'user-1')
            ).rejects.toThrow(MilestoneValidationException);
        });

        it('should throw permission exception for non-admin/supervisor user', async () => {
            const studentUser = { ...mockUser, role: UserRole.STUDENT };
            userRepository.findOne.mockResolvedValue(studentUser);

            await expect(
                service.createTemplateWithVersioning(mockCreateDto, 'user-1')
            ).rejects.toThrow(MilestonePermissionException);
        });

        it('should throw validation exception for user not found', async () => {
            userRepository.findOne.mockResolvedValue(null);

            await expect(
                service.createTemplateWithVersioning(mockCreateDto, 'user-1')
            ).rejects.toThrow(MilestoneValidationException);
        });
    });

    describe('updateTemplateWithVersioning', () => {
        const updateDto: UpdateAdminTemplateDto = {
            name: 'Updated Template',
            changeDescription: 'Updated template name',
        };

        it('should update template and create new version', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            userRepository.findOne.mockResolvedValue(mockUser);

            const mockVersion = {
                id: 'version-1',
                version: 1,
                templateId: 'template-1',
                milestoneItems: [
                    {
                        title: 'Milestone 1',
                        description: 'First milestone',
                        daysFromStart: 7,
                        priority: Priority.HIGH,
                        estimatedHours: 40,
                    },
                ],
            };

            const mockManager = {
                findOne: jest.fn().mockResolvedValue(mockVersion),
                save: jest.fn().mockResolvedValue(mockTemplate),
                update: jest.fn(),
            };

            dataSource.transaction.mockImplementation(async (callback: any) => {
                return await callback(mockManager);
            });

            const result = await service.updateTemplateWithVersioning('template-1', updateDto, 'user-1');

            expect(result).toEqual(mockTemplate);
            expect(mockManager.update).toHaveBeenCalledWith(
                MilestoneTemplateVersion,
                { templateId: 'template-1', isActive: true },
                { isActive: false }
            );
        });

        it('should throw permission exception for unauthorized user', async () => {
            const otherUser = { ...mockUser, id: 'other-user', role: UserRole.SUPERVISOR };
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            userRepository.findOne.mockResolvedValue(otherUser);

            await expect(
                service.updateTemplateWithVersioning('template-1', updateDto, 'other-user')
            ).rejects.toThrow(MilestonePermissionException);
        });
    });

    describe('getTemplateVersions', () => {
        it('should return template versions', async () => {
            const mockVersions = [
                { id: 'version-1', version: 2, templateId: 'template-1' },
                { id: 'version-2', version: 1, templateId: 'template-1' },
            ];

            versionRepository.find.mockResolvedValue(mockVersions as any);

            const result = await service.getTemplateVersions('template-1');

            expect(result).toEqual(mockVersions);
            expect(versionRepository.find).toHaveBeenCalledWith({
                where: { templateId: 'template-1' },
                order: { version: 'DESC' },
                relations: ['changedBy'],
            });
        });
    });

    describe('getTemplateVersion', () => {
        it('should return specific template version', async () => {
            const mockVersion = {
                id: 'version-1',
                version: 1,
                templateId: 'template-1',
            };

            versionRepository.findOne.mockResolvedValue(mockVersion as any);

            const result = await service.getTemplateVersion('template-1', 1);

            expect(result).toEqual(mockVersion);
            expect(versionRepository.findOne).toHaveBeenCalledWith({
                where: { templateId: 'template-1', version: 1 },
                relations: ['changedBy', 'template'],
            });
        });

        it('should throw not found exception for non-existent version', async () => {
            versionRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getTemplateVersion('template-1', 999)
            ).rejects.toThrow(MilestoneNotFoundException);
        });
    });

    describe('bulkOperateTemplates', () => {
        const bulkOperation: BulkTemplateOperationDto = {
            templateIds: ['template-1', 'template-2'],
            operation: 'activate',
            reason: 'Bulk activation',
        };

        it('should perform bulk activation successfully', async () => {
            userRepository.findOne.mockResolvedValue(mockUser);
            templateRepository.findOne
                .mockResolvedValueOnce(mockTemplate)
                .mockResolvedValueOnce({ ...mockTemplate, id: 'template-2' });
            templateRepository.save.mockResolvedValue(mockTemplate);

            const result = await service.bulkOperateTemplates(bulkOperation, 'user-1');

            expect(result.success).toBe(2);
            expect(result.failed).toBe(0);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle partial failures in bulk operations', async () => {
            userRepository.findOne.mockResolvedValue(mockUser);
            templateRepository.findOne
                .mockResolvedValueOnce(mockTemplate)
                .mockResolvedValueOnce(null); // Second template not found

            const result = await service.bulkOperateTemplates(bulkOperation, 'user-1');

            expect(result.success).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toContain('template-2');
        });

        it('should prevent deletion of used templates', async () => {
            const deleteOperation: BulkTemplateOperationDto = {
                templateIds: ['template-1'],
                operation: 'delete',
                reason: 'Cleanup',
            };

            const usedTemplate = { ...mockTemplate, usageCount: 5 };
            userRepository.findOne.mockResolvedValue(mockUser);
            templateRepository.findOne.mockResolvedValue(usedTemplate);

            const result = await service.bulkOperateTemplates(deleteOperation, 'user-1');

            expect(result.success).toBe(0);
            expect(result.failed).toBe(1);
            expect(result.errors[0]).toContain('has been used');
        });
    });

    describe('validateTemplateStructure', () => {
        it('should return no errors for valid template', async () => {
            const validTemplate = {
                name: 'Valid Template',
                description: 'This is a valid template description',
                milestoneItems: [
                    {
                        title: 'Milestone 1',
                        description: 'First milestone',
                        daysFromStart: 7,
                        priority: Priority.HIGH,
                        estimatedHours: 40,
                    },
                ],
                estimatedDurationWeeks: 12,
            };

            const errors = await service.validateTemplateStructure(validTemplate);

            expect(errors).toHaveLength(0);
        });

        it('should return errors for invalid template', async () => {
            const invalidTemplate = {
                name: 'A', // Too short
                description: 'Short', // Too short
                milestoneItems: [], // Empty
                estimatedDurationWeeks: 12,
            };

            const errors = await service.validateTemplateStructure(invalidTemplate);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors).toContain('Template name must be at least 3 characters long');
            expect(errors).toContain('Template description must be at least 10 characters long');
            expect(errors).toContain('Template must have at least one milestone');
        });

        it('should detect duplicate milestone titles', async () => {
            const templateWithDuplicates = {
                name: 'Template with Duplicates',
                description: 'This template has duplicate milestone titles',
                milestoneItems: [
                    {
                        title: 'Milestone 1',
                        description: 'First milestone',
                        daysFromStart: 7,
                        priority: Priority.HIGH,
                        estimatedHours: 40,
                    },
                    {
                        title: 'Milestone 1', // Duplicate
                        description: 'Second milestone',
                        daysFromStart: 14,
                        priority: Priority.MEDIUM,
                        estimatedHours: 30,
                    },
                ],
                estimatedDurationWeeks: 12,
            };

            const errors = await service.validateTemplateStructure(templateWithDuplicates);

            expect(errors).toContain('Duplicate milestone title: Milestone 1');
        });

        it('should validate timeline against estimated duration', async () => {
            const templateWithLongTimeline = {
                name: 'Long Timeline Template',
                description: 'This template has a timeline longer than estimated duration',
                milestoneItems: [
                    {
                        title: 'Late Milestone',
                        description: 'Very late milestone',
                        daysFromStart: 100, // Much longer than 12 weeks (84 days)
                        priority: Priority.HIGH,
                        estimatedHours: 40,
                    },
                ],
                estimatedDurationWeeks: 12,
            };

            const errors = await service.validateTemplateStructure(templateWithLongTimeline);

            expect(errors).toContain('Milestone timeline exceeds estimated duration');
        });
    });

    describe('exportTemplates', () => {
        it('should export templates in JSON format', async () => {
            const exportDto = {
                templateIds: ['template-1'],
                format: 'json' as const,
            };

            templateRepository.find.mockResolvedValue([mockTemplate]);

            const result = await service.exportTemplates(exportDto);

            expect(typeof result).toBe('string');
            const exportData = JSON.parse(result);
            expect(exportData.templates).toHaveLength(1);
            expect(exportData.templates[0].id).toBe('template-1');
            expect(exportData.exportedAt).toBeDefined();
        });

        it('should export templates in CSV format', async () => {
            const exportDto = {
                templateIds: ['template-1'],
                format: 'csv' as const,
            };

            templateRepository.find.mockResolvedValue([mockTemplate]);

            const result = await service.exportTemplates(exportDto);

            expect(typeof result).toBe('string');
            expect(result).toContain('ID,Name,Description');
            expect(result).toContain('template-1');
        });
    });

    describe('getTemplateAnalytics', () => {
        it('should return comprehensive template analytics', async () => {
            const freshMockTemplate = { ...mockTemplate, name: 'Test Template' };
            templateRepository.findOne.mockResolvedValue(freshMockTemplate);

            const mockVersions = [
                { version: 1, changeDescription: 'Initial', createdAt: new Date(), isDraft: false, isActive: false },
                { version: 2, changeDescription: 'Update', createdAt: new Date(), isDraft: false, isActive: true },
            ];
            versionRepository.find.mockResolvedValue(mockVersions as any);

            const result = await service.getTemplateAnalytics('template-1');

            expect(result.templateId).toBe('template-1');
            expect(result.name).toBe('Test Template');
            expect(result.usageStats).toBeDefined();
            expect(result.versionHistory).toBeDefined();
            expect(result.structure).toBeDefined();
            expect(result.versionHistory.totalVersions).toBe(2);
        });

        it('should throw not found exception for non-existent template', async () => {
            templateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getTemplateAnalytics('non-existent')
            ).rejects.toThrow(MilestoneNotFoundException);
        });
    });
});
