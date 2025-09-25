import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TemplateEffectivenessAnalysisService } from '../template-effectiveness-analysis.service';
import { TemplateEffectiveness } from '../../entities/template-effectiveness.entity';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { Milestone } from '../../entities/milestone.entity';
import {
    MilestoneNotFoundException,
} from '../../common/exceptions';
import { ProjectType, Priority } from '../../common/enums';

describe('TemplateEffectivenessAnalysisService', () => {
    let service: TemplateEffectivenessAnalysisService;
    let effectivenessRepository: jest.Mocked<Repository<TemplateEffectiveness>>;
    let templateRepository: jest.Mocked<Repository<MilestoneTemplate>>;
    let projectRepository: jest.Mocked<Repository<Project>>;
    let userRepository: jest.Mocked<Repository<User>>;
    let milestoneRepository: jest.Mocked<Repository<Milestone>>;
    let dataSource: jest.Mocked<DataSource>;

    const mockTemplate = {
        id: 'template-1',
        name: 'Test Template',
        description: 'Test template description',
        specialization: 'Computer Science',
        projectType: ProjectType.RESEARCH,
        estimatedDurationWeeks: 12,
        usageCount: 5,
        averageRating: 4.2,
        ratingCount: 3,
        getMilestoneCount: jest.fn().mockReturnValue(5),
        getTotalEstimatedHours: jest.fn().mockReturnValue(200),
    } as any;

    const mockProject = {
        id: 'project-1',
        title: 'Test Project',
        description: 'Test project description',
    } as any;

    const mockUser = {
        id: 'user-1',
        email: 'student@test.com',
    } as any;

    const mockEffectiveness = {
        id: 'effectiveness-1',
        templateId: 'template-1',
        projectId: 'project-1',
        studentId: 'user-1',
        completionStatus: 'in_progress',
        totalMilestones: 5,
        completedMilestones: 3,
        overdueMilestones: 0,
        completionPercentage: 60,
        actualDurationDays: null,
        estimatedDurationDays: 84,
        studentRating: null,
        studentFeedback: null,
        isRecommended: false,
        startedAt: new Date(),
        completedAt: null,
        lastActivityAt: new Date(),
        updateMilestoneProgress: jest.fn(),
        setStudentFeedback: jest.fn(),
        addImprovementSuggestion: jest.fn(),
        getEffectivenessScore: jest.fn().mockReturnValue(75),
        isOnTrack: jest.fn().mockReturnValue(true),
    } as any;

    beforeEach(async () => {
        const mockEffectivenessRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
        };

        const mockTemplateRepository = {
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
        };

        const mockProjectRepository = {
            findOne: jest.fn(),
        };

        const mockUserRepository = {
            findOne: jest.fn(),
        };

        const mockMilestoneRepository = {
            find: jest.fn(),
        };

        const mockDataSource = {
            transaction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TemplateEffectivenessAnalysisService,
                {
                    provide: getRepositoryToken(TemplateEffectiveness),
                    useValue: mockEffectivenessRepository,
                },
                {
                    provide: getRepositoryToken(MilestoneTemplate),
                    useValue: mockTemplateRepository,
                },
                {
                    provide: getRepositoryToken(Project),
                    useValue: mockProjectRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(Milestone),
                    useValue: mockMilestoneRepository,
                },
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
            ],
        }).compile();

        service = module.get<TemplateEffectivenessAnalysisService>(TemplateEffectivenessAnalysisService);
        effectivenessRepository = module.get(getRepositoryToken(TemplateEffectiveness));
        templateRepository = module.get(getRepositoryToken(MilestoneTemplate));
        projectRepository = module.get(getRepositoryToken(Project));
        userRepository = module.get(getRepositoryToken(User));
        milestoneRepository = module.get(getRepositoryToken(Milestone));
        dataSource = module.get(DataSource);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('trackTemplateUsage', () => {
        it('should create new effectiveness tracking when none exists', async () => {
            effectivenessRepository.findOne.mockResolvedValue(null);
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            projectRepository.findOne.mockResolvedValue(mockProject);
            effectivenessRepository.save.mockResolvedValue(mockEffectiveness);
            templateRepository.update.mockResolvedValue(undefined as any);

            const result = await service.trackTemplateUsage('template-1', 'project-1', 'user-1');

            expect(result).toEqual(mockEffectiveness);
            expect(effectivenessRepository.save).toHaveBeenCalled();
            expect(templateRepository.update).toHaveBeenCalledWith('template-1', {
                usageCount: expect.any(Function),
            });
        });

        it('should return existing effectiveness tracking if it exists', async () => {
            effectivenessRepository.findOne.mockResolvedValue(mockEffectiveness);

            const result = await service.trackTemplateUsage('template-1', 'project-1', 'user-1');

            expect(result).toEqual(mockEffectiveness);
            expect(effectivenessRepository.save).not.toHaveBeenCalled();
        });

        it('should throw error if template not found', async () => {
            effectivenessRepository.findOne.mockResolvedValue(null);
            templateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.trackTemplateUsage('template-1', 'project-1', 'user-1')
            ).rejects.toThrow(MilestoneNotFoundException);
        });

        it('should throw error if project not found', async () => {
            effectivenessRepository.findOne.mockResolvedValue(null);
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            projectRepository.findOne.mockResolvedValue(null);

            await expect(
                service.trackTemplateUsage('template-1', 'project-1', 'user-1')
            ).rejects.toThrow(MilestoneNotFoundException);
        });
    });

    describe('updateMilestoneProgress', () => {
        it('should update milestone progress successfully', async () => {
            effectivenessRepository.findOne.mockResolvedValue(mockEffectiveness);
            effectivenessRepository.save.mockResolvedValue(mockEffectiveness);

            await service.updateMilestoneProgress('project-1', 'Milestone 1', 'completed', 7);

            expect(mockEffectiveness.updateMilestoneProgress).toHaveBeenCalledWith('Milestone 1', 'completed', 7);
            expect(effectivenessRepository.save).toHaveBeenCalledWith(mockEffectiveness);
        });

        it('should handle case when no effectiveness tracking exists', async () => {
            effectivenessRepository.findOne.mockResolvedValue(null);

            await service.updateMilestoneProgress('project-1', 'Milestone 1', 'completed', 7);

            expect(effectivenessRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('recordStudentFeedback', () => {
        it('should record student feedback successfully', async () => {
            effectivenessRepository.findOne.mockResolvedValue(mockEffectiveness);
            effectivenessRepository.save.mockResolvedValue(mockEffectiveness);

            // Mock the updateTemplateRating method by mocking the find call it makes
            effectivenessRepository.find.mockResolvedValue([mockEffectiveness]);
            templateRepository.update.mockResolvedValue(undefined as any);

            const difficultyRatings = {
                overall: 3,
                milestones: [{ title: 'Milestone 1', difficulty: 2 }],
            };

            const improvementSuggestions = [
                { category: 'timeline' as const, suggestion: 'More time needed', priority: 'medium' as const },
            ];

            await service.recordStudentFeedback(
                'project-1',
                4,
                'Great template!',
                true,
                difficultyRatings,
                improvementSuggestions
            );

            expect(mockEffectiveness.setStudentFeedback).toHaveBeenCalledWith(
                4,
                'Great template!',
                true,
                difficultyRatings
            );
            expect(mockEffectiveness.addImprovementSuggestion).toHaveBeenCalledWith(
                'timeline',
                'More time needed',
                'medium'
            );
            expect(effectivenessRepository.save).toHaveBeenCalledWith(mockEffectiveness);
        });

        it('should throw error if no effectiveness tracking found', async () => {
            effectivenessRepository.findOne.mockResolvedValue(null);

            await expect(
                service.recordStudentFeedback('project-1', 4, 'Great template!', true)
            ).rejects.toThrow(MilestoneNotFoundException);
        });
    });

    describe('getTemplateEffectivenessStats', () => {
        it('should return comprehensive effectiveness stats', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);

            const mockEffectivenessRecords = [
                {
                    ...mockEffectiveness,
                    completionStatus: 'completed',
                    actualDurationDays: 90,
                    timeVariance: 1.1,
                    durationVariance: 1.07,
                    studentRating: 4,
                    isRecommended: true,
                    customizations: [
                        { type: 'milestone_added', description: 'Added extra milestone', timestamp: '2023-01-01' },
                    ],
                    improvementSuggestions: [
                        { category: 'timeline', suggestion: 'More time needed', priority: 'medium' },
                    ],
                    difficultyRatings: {
                        overall: 3,
                        milestones: [{ title: 'Milestone 1', difficulty: 2 }],
                    },
                    milestoneCompletionData: [
                        { milestoneTitle: 'Milestone 1', status: 'completed', estimatedDays: 7, actualDays: 8, completedAt: '2023-01-01' },
                    ],
                },
                {
                    ...mockEffectiveness,
                    id: 'effectiveness-2',
                    completionStatus: 'in_progress',
                    studentRating: 5,
                    isRecommended: true,
                },
            ];

            effectivenessRepository.find.mockResolvedValue(mockEffectivenessRecords as any);

            const result = await service.getTemplateEffectivenessStats('template-1');

            expect(result.templateId).toBe('template-1');
            expect(result.templateName).toBe('Test Template');
            expect(result.totalUsages).toBe(2);
            expect(result.completionRate).toBe(50); // 1 out of 2 completed
            expect(result.averageCompletionTime).toBe(90);
            expect(result.averageStudentRating).toBe(4.5);
            expect(result.recommendationRate).toBe(100); // Both recommended
            expect(result.commonCustomizations).toHaveLength(1);
            expect(result.improvementSuggestions).toHaveLength(1);
            expect(result.difficultyAnalysis.overallDifficulty).toBe(3); // Only first record has difficulty rating
        });

        it('should return empty stats for template with no usage', async () => {
            templateRepository.findOne.mockResolvedValue(mockTemplate);
            effectivenessRepository.find.mockResolvedValue([]);

            const result = await service.getTemplateEffectivenessStats('template-1');

            expect(result.templateId).toBe('template-1');
            expect(result.totalUsages).toBe(0);
            expect(result.completionRate).toBe(0);
            expect(result.averageCompletionTime).toBeNull();
            expect(result.averageStudentRating).toBeNull();
            expect(result.effectivenessScore).toBe(0);
        });

        it('should throw error if template not found', async () => {
            templateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getTemplateEffectivenessStats('template-1')
            ).rejects.toThrow(MilestoneNotFoundException);
        });
    });

    describe('getTemplateRecommendations', () => {
        it('should return template recommendations based on criteria', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTemplate]),
            };

            templateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

            // Mock the getTemplateEffectivenessStats call
            const mockStats = {
                templateId: 'template-1',
                templateName: 'Test Template',
                totalUsages: 10,
                completionRate: 85,
                averageStudentRating: 4.2,
                effectivenessScore: 80,
                averageTimeVariance: 1.1,
                difficultyAnalysis: { overallDifficulty: 2.5 },
            };

            // Mock the service method call
            jest.spyOn(service, 'getTemplateEffectivenessStats').mockResolvedValue(mockStats as any);
            effectivenessRepository.find.mockResolvedValue([mockEffectiveness]);

            const result = await service.getTemplateRecommendations(
                'Computer Science',
                'RESEARCH',
                'beginner',
                16
            );

            expect(result).toHaveLength(1);
            expect(result[0].templateId).toBe('template-1');
            expect(result[0].templateName).toBe('Test Template');
            expect(result[0].recommendationScore).toBeGreaterThan(0);
            expect(result[0].reasons).toContain('High completion rate');
            expect(result[0].reasons).toContain('High student satisfaction');
            expect(result[0].reasons).toContain('Suitable for beginners');
        });

        it('should handle empty template list', async () => {
            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            };

            templateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

            const result = await service.getTemplateRecommendations('Computer Science');

            expect(result).toHaveLength(0);
        });
    });

    describe('compareTemplates', () => {
        it('should compare multiple templates and return analysis', async () => {
            const mockStats1 = {
                templateId: 'template-1',
                templateName: 'Template 1',
                effectivenessScore: 85,
                completionRate: 90,
                averageStudentRating: 4.5,
                averageTimeVariance: 1.0,
            };

            const mockStats2 = {
                templateId: 'template-2',
                templateName: 'Template 2',
                effectivenessScore: 75,
                completionRate: 80,
                averageStudentRating: 4.0,
                averageTimeVariance: 1.2,
            };

            jest.spyOn(service, 'getTemplateEffectivenessStats')
                .mockResolvedValueOnce(mockStats1 as any)
                .mockResolvedValueOnce(mockStats2 as any);

            const result = await service.compareTemplates(['template-1', 'template-2']);

            expect(result.templates).toHaveLength(2);
            expect(result.recommendations.mostEffective).toBe('template-1');
            expect(result.recommendations.highestSatisfaction).toBe('template-1');
            expect(result.templates[0].effectivenessScore).toBe(85);
            expect(result.templates[1].effectivenessScore).toBe(75);
        });

        it('should handle single template comparison', async () => {
            const mockStats = {
                templateId: 'template-1',
                templateName: 'Template 1',
                effectivenessScore: 85,
                completionRate: 90,
                averageStudentRating: 4.5,
                averageTimeVariance: 1.0,
            };

            jest.spyOn(service, 'getTemplateEffectivenessStats').mockResolvedValue(mockStats as any);

            const result = await service.compareTemplates(['template-1']);

            expect(result.templates).toHaveLength(1);
            expect(result.recommendations.mostEffective).toBe('template-1');
        });
    });
});
