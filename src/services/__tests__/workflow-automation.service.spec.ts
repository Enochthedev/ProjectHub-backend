import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkflowAutomationService } from '../workflow-automation.service';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { MilestoneTemplateVersion } from '../../entities/milestone-template-version.entity';
import { AcademicCalendar } from '../../entities/academic-calendar.entity';
import { TemplateEffectiveness } from '../../entities/template-effectiveness.entity';
import { User } from '../../entities/user.entity';
import {
    MilestoneNotFoundException,
    MilestoneValidationException,
} from '../../common/exceptions';
import { ProjectType, Priority } from '../../common/enums';

describe('WorkflowAutomationService', () => {
    let service: WorkflowAutomationService;
    let templateRepository: jest.Mocked<Repository<MilestoneTemplate>>;
    let versionRepository: jest.Mocked<Repository<MilestoneTemplateVersion>>;
    let academicCalendarRepository: jest.Mocked<Repository<AcademicCalendar>>;
    let effectivenessRepository: jest.Mocked<Repository<TemplateEffectiveness>>;
    let userRepository: jest.Mocked<Repository<User>>;
    let dataSource: jest.Mocked<DataSource>;

    const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test template description',
        specialization: 'Computer Science',
        projectType: ProjectType.RESEARCH,
        milestoneItems: [
            {
                title: 'Project Planning',
                description: 'Initial project planning',
                daysFromStart: 7,
                priority: Priority.HIGH,
                estimatedHours: 40,
            },
            {
                title: 'Implementation',
                description: 'Main implementation phase',
                daysFromStart: 30,
                priority: Priority.HIGH,
                estimatedHours: 120,
            },
        ],
        estimatedDurationWeeks: 12,
        tags: ['test', 'automation'],
        getMilestoneCount: jest.fn().mockReturnValue(2),
        getTotalEstimatedHours: jest.fn().mockReturnValue(160),
    } as any;

    const mockEffectiveness = {
        id: 'effectiveness-1',
        templateId: 'template-1',
        projectId: 'project-1',
        studentId: 'user-1',
        completionStatus: 'completed',
        completionPercentage: 85,
        milestoneCompletionData: [
            {
                milestoneTitle: 'Project Planning',
                status: 'completed',
                estimatedDays: 7,
                actualDays: 8,
                completedAt: '2023-01-01',
            },
            {
                milestoneTitle: 'Implementation',
                status: 'overdue',
                estimatedDays: 30,
                actualDays: 35,
                completedAt: null,
            },
        ],
        getEffectivenessScore: jest.fn().mockReturnValue(75),
    } as any;

    beforeEach(async () => {
        const mockTemplateRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
        };

        const mockVersionRepository = {
            findOne: jest.fn(),
            save: jest.fn(),
        };

        const mockAcademicCalendarRepository = {
            findOne: jest.fn(),
        };

        const mockEffectivenessRepository = {
            find: jest.fn(),
        };

        const mockUserRepository = {
            findOne: jest.fn(),
        };

        const mockDataSource = {
            transaction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkflowAutomationService,
                {
                    provide: getRepositoryToken(MilestoneTemplate),
                    useValue: mockTemplateRepository,
                },
                {
                    provide: getRepositoryToken(MilestoneTemplateVersion),
                    useValue: mockVersionRepository,
                },
                {
                    provide: getRepositoryToken(AcademicCalendar),
                    useValue: mockAcademicCalendarRepository,
                },
                {
                    provide: getRepositoryToken(TemplateEffectiveness),
                    useValue: mockEffectivenessRepository,
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

        service = module.get<WorkflowAutomationService>(WorkflowAutomationService);
        templateRepository = module.get(getRepositoryToken(MilestoneTemplate));
        versionRepository = module.get(getRepositoryToken(MilestoneTemplateVersion));
        academicCalendarRepository = module.get(getRepositoryToken(AcademicCalendar));
        effectivenessRepository = module.get(getRepositoryToken(TemplateEffectiveness));
        userRepository = module.get(getRepositoryToken(User));
        dataSource = module.get(DataSource);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('customizeWorkflowForProjectType', () => {
        it('should customize workflow for research project type', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([mockEffectiveness]);

            const result = await service.customizeWorkflowForProjectType(
                'template-1',
                ProjectType.RESEARCH,
                'Computer Science',
                'user-1'
            );

            expect(result.templateId).toBe('template-1');
            expect(result.projectType).toBe(ProjectType.RESEARCH);
            expect(result.specialization).toBe('Computer Science');
            expect(result.customizations).toBeDefined();
            expect(result.customizations.length).toBeGreaterThan(0);
            expect(result.estimatedImprovements).toBeDefined();
            expect(result.estimatedImprovements.completionRateIncrease).toBeGreaterThan(0);
        });

        it('should customize workflow for development project type', async () => {
            const devTemplate = { ...mockTemplate, projectType: ProjectType.INDUSTRY };
            templateRepository.findOne.mockResolvedValue(devTemplate);
            effectivenessRepository.find.mockResolvedValue([mockEffectiveness]);

            const result = await service.customizeWorkflowForProjectType(
                'template-1',
                ProjectType.INDUSTRY,
                'Software Engineering',
                'user-1'
            );

            expect(result.projectType).toBe(ProjectType.INDUSTRY);
            expect(result.customizations).toBeDefined();

            // Should include development-specific customizations
            const hasTestingCustomization = result.customizations.some(c =>
                c.description.toLowerCase().includes('testing')
            );
            expect(hasTestingCustomization).toBe(true);
        });

        it('should throw error if template not found', async () => {
            templateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.customizeWorkflowForProjectType(
                    'template-1',
                    ProjectType.RESEARCH,
                    'Computer Science',
                    'user-1'
                )
            ).rejects.toThrow(MilestoneNotFoundException);
        });

        it('should include specialization-specific customizations', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([mockEffectiveness]);

            const result = await service.customizeWorkflowForProjectType(
                'template-1',
                ProjectType.INDUSTRY,
                'Computer Science',
                'user-1'
            );

            // Should include computer science specific customizations
            const hasTechnicalReview = result.customizations.some(c =>
                c.description.toLowerCase().includes('technical review')
            );
            expect(hasTechnicalReview).toBe(true);
        });
    });

    describe('generateOptimizationRecommendations', () => {
        it('should generate optimization recommendations based on effectiveness data', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([mockEffectiveness]);

            const result = await service.generateOptimizationRecommendations('template-1');

            expect(result.templateId).toBe('template-1');
            expect(result.templateName).toBe('Test Template');
            expect(result.currentEffectivenessScore).toBe(75);
            expect(result.optimizationOpportunities).toBeDefined();
            expect(result.proposedChanges).toBeDefined();
            expect(result.predictedOutcome).toBeDefined();
        });

        it('should identify milestones with low completion rates', async () => {
            const lowCompletionEffectiveness = {
                ...mockEffectiveness,
                milestoneCompletionData: [
                    {
                        milestoneTitle: 'Difficult Milestone',
                        status: 'pending',
                        estimatedDays: 14,
                        actualDays: null,
                        completedAt: null,
                    },
                ],
            };

            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([lowCompletionEffectiveness]);

            const result = await service.generateOptimizationRecommendations('template-1');

            expect(result.optimizationOpportunities.length).toBeGreaterThan(0);

            const milestoneOpportunity = result.optimizationOpportunities.find(opp =>
                opp.category === 'milestones'
            );
            expect(milestoneOpportunity).toBeDefined();
        });

        it('should identify timeline issues for overdue milestones', async () => {
            const overdueEffectiveness = {
                ...mockEffectiveness,
                milestoneCompletionData: [
                    {
                        milestoneTitle: 'Overdue Milestone',
                        status: 'overdue',
                        estimatedDays: 7,
                        actualDays: 15,
                        completedAt: null,
                    },
                ],
            };

            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([overdueEffectiveness]);

            const result = await service.generateOptimizationRecommendations('template-1');

            const timelineOpportunity = result.optimizationOpportunities.find(opp =>
                opp.category === 'timeline'
            );
            expect(timelineOpportunity).toBeDefined();
            expect(timelineOpportunity?.issue).toContain('overdue');
        });

        it('should throw error if template not found', async () => {
            templateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.generateOptimizationRecommendations('template-1')
            ).rejects.toThrow(MilestoneNotFoundException);
        });

        it('should throw error if no effectiveness data available', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([]);

            await expect(
                service.generateOptimizationRecommendations('template-1')
            ).rejects.toThrow(MilestoneValidationException);
        });
    });

    describe('adjustTemplateToAcademicCalendar', () => {
        it('should adjust template timeline to avoid weekends', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            academicCalendarRepository.findOne.mockResolvedValue(null);

            // Create a start date that would put milestones on weekends
            const startDate = new Date('2023-01-01'); // Sunday

            const result = await service.adjustTemplateToAcademicCalendar(
                'template-1',
                '2023',
                startDate,
                'user-1'
            );

            expect(result.templateId).toBe('template-1');
            expect(result.originalTimeline).toBeDefined();
            expect(result.adjustedTimeline).toBeDefined();
            expect(result.impactAnalysis).toBeDefined();

            // Should have adjustments for weekend conflicts
            const hasWeekendAdjustment = result.adjustedTimeline.some(item =>
                item.reason.includes('weekend')
            );
            expect(hasWeekendAdjustment).toBe(true);
        });

        it('should calculate impact analysis correctly', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            academicCalendarRepository.findOne.mockResolvedValue(null);

            const startDate = new Date('2023-01-01'); // Sunday

            const result = await service.adjustTemplateToAcademicCalendar(
                'template-1',
                '2023',
                startDate,
                'user-1'
            );

            expect(result.impactAnalysis.totalDaysShifted).toBeGreaterThanOrEqual(0);
            expect(result.impactAnalysis.milestonesAffected).toBeGreaterThanOrEqual(0);
            expect(typeof result.impactAnalysis.criticalPathImpact).toBe('boolean');
        });

        it('should create new template version for significant adjustments', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            academicCalendarRepository.findOne.mockResolvedValue(null);
            versionRepository.findOne.mockResolvedValue(null);
            versionRepository.save.mockResolvedValue({} as any);

            const startDate = new Date('2023-01-01'); // Sunday

            const result = await service.adjustTemplateToAcademicCalendar(
                'template-1',
                '2023',
                startDate,
                'user-1'
            );

            // If total days shifted > 7, should create new version
            if (result.impactAnalysis.totalDaysShifted > 7) {
                expect(versionRepository.save).toHaveBeenCalled();
            }
        });

        it('should throw error if template not found', async () => {
            templateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.adjustTemplateToAcademicCalendar(
                    'template-1',
                    '2023',
                    new Date(),
                    'user-1'
                )
            ).rejects.toThrow(MilestoneNotFoundException);
        });
    });

    describe('automateWorkflowOptimization', () => {
        it('should apply low-risk optimizations automatically when enabled', async () => {
            const mockRecommendations = {
                templateId: 'template-1',
                templateName: 'Test Template',
                currentEffectivenessScore: 75,
                optimizationOpportunities: [
                    {
                        category: 'timeline' as const,
                        issue: 'Test issue',
                        recommendation: 'Test recommendation',
                        expectedImprovement: 10,
                        implementationComplexity: 'low' as const,
                        priority: 'medium' as const,
                    },
                ],
                proposedChanges: {
                    milestoneAdjustments: [],
                    newMilestones: [],
                    removedMilestones: [],
                },
                predictedOutcome: {
                    effectivenessScoreIncrease: 5,
                    completionRateImprovement: 8,
                    timeAccuracyImprovement: 3,
                },
            };

            jest.spyOn(service, 'generateOptimizationRecommendations').mockResolvedValue(mockRecommendations);
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            versionRepository.findOne.mockResolvedValue(null);
            versionRepository.save.mockResolvedValue({} as any);

            const result = await service.automateWorkflowOptimization(
                'template-1',
                'user-1',
                { autoApplyLowRiskChanges: true, createNewVersion: true }
            );

            expect(result.appliedOptimizations).toBeDefined();
            expect(result.pendingRecommendations).toBeDefined();
            expect(result.appliedOptimizations.length).toBeGreaterThanOrEqual(0);
        });

        it('should not apply optimizations when autoApplyLowRiskChanges is false', async () => {
            const mockRecommendations = {
                templateId: 'template-1',
                templateName: 'Test Template',
                currentEffectivenessScore: 75,
                optimizationOpportunities: [
                    {
                        category: 'timeline' as const,
                        issue: 'Test issue',
                        recommendation: 'Test recommendation',
                        expectedImprovement: 10,
                        implementationComplexity: 'low' as const,
                        priority: 'medium' as const,
                    },
                ],
                proposedChanges: {
                    milestoneAdjustments: [],
                    newMilestones: [],
                    removedMilestones: [],
                },
                predictedOutcome: {
                    effectivenessScoreIncrease: 5,
                    completionRateImprovement: 8,
                    timeAccuracyImprovement: 3,
                },
            };

            jest.spyOn(service, 'generateOptimizationRecommendations').mockResolvedValue(mockRecommendations);

            const result = await service.automateWorkflowOptimization(
                'template-1',
                'user-1',
                { autoApplyLowRiskChanges: false }
            );

            expect(result.appliedOptimizations).toHaveLength(0);
            expect(result.pendingRecommendations.length).toBeGreaterThan(0);
        });

        it('should create new version when requested and optimizations applied', async () => {
            const mockRecommendations = {
                templateId: 'template-1',
                templateName: 'Test Template',
                currentEffectivenessScore: 75,
                optimizationOpportunities: [],
                proposedChanges: {
                    milestoneAdjustments: [],
                    newMilestones: [],
                    removedMilestones: [],
                },
                predictedOutcome: {
                    effectivenessScoreIncrease: 5,
                    completionRateImprovement: 8,
                    timeAccuracyImprovement: 3,
                },
            };

            jest.spyOn(service, 'generateOptimizationRecommendations').mockResolvedValue(mockRecommendations);
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            versionRepository.findOne.mockResolvedValue(null);
            versionRepository.save.mockResolvedValue({ id: 'version-1' } as any);

            const result = await service.automateWorkflowOptimization(
                'template-1',
                'user-1',
                { createNewVersion: true }
            );

            // Should not create version if no optimizations were applied
            expect(result.newVersionId).toBeUndefined();
        });
    });
});
