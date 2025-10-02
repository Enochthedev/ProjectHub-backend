import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TemplateAnalyticsService } from '../template-analytics.service';
import { MilestoneTemplate } from '../../entities/milestone-template.entity';
import { TemplateEffectiveness } from '../../entities/template-effectiveness.entity';
import { Milestone } from '../../entities/milestone.entity';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { ProjectType } from '../../common/enums/project-type.enum';

describe('TemplateAnalyticsService', () => {
    let service: TemplateAnalyticsService;
    let templateRepository: Repository<MilestoneTemplate>;
    let effectivenessRepository: Repository<TemplateEffectiveness>;
    let milestoneRepository: Repository<Milestone>;
    let projectRepository: Repository<Project>;
    let userRepository: Repository<User>;

    const mockTemplateRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        count: jest.fn(),
    };

    const mockEffectivenessRepository = {
        findOne: jest.fn(),
        find: jest.fn(),
        save: jest.fn(),
        count: jest.fn(),
    };

    const mockMilestoneRepository = {
        find: jest.fn(),
    };

    const mockProjectRepository = {
        find: jest.fn(),
    };

    const mockUserRepository = {
        find: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TemplateAnalyticsService,
                {
                    provide: getRepositoryToken(MilestoneTemplate),
                    useValue: mockTemplateRepository,
                },
                {
                    provide: getRepositoryToken(TemplateEffectiveness),
                    useValue: mockEffectivenessRepository,
                },
                {
                    provide: getRepositoryToken(Milestone),
                    useValue: mockMilestoneRepository,
                },
                {
                    provide: getRepositoryToken(Project),
                    useValue: mockProjectRepository,
                },
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<TemplateAnalyticsService>(TemplateAnalyticsService);
        templateRepository = module.get<Repository<MilestoneTemplate>>(
            getRepositoryToken(MilestoneTemplate),
        );
        effectivenessRepository = module.get<Repository<TemplateEffectiveness>>(
            getRepositoryToken(TemplateEffectiveness),
        );
        milestoneRepository = module.get<Repository<Milestone>>(
            getRepositoryToken(Milestone),
        );
        projectRepository = module.get<Repository<Project>>(
            getRepositoryToken(Project),
        );
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('trackTemplateUsage', () => {
        it('should track template usage and create effectiveness record', async () => {
            const mockTemplate = {
                id: 'template-id',
                name: 'Test Template',
                usageCount: 5,
                estimatedDurationWeeks: 12,
                milestoneItems: [
                    { title: 'Milestone 1', estimatedHours: 10 },
                    { title: 'Milestone 2', estimatedHours: 15 },
                ],
                incrementUsage: jest.fn(),
                getMilestoneCount: jest.fn().mockReturnValue(2),
                getTotalEstimatedHours: jest.fn().mockReturnValue(25),
            };

            const mockEffectiveness = {
                id: 'effectiveness-id',
                templateId: 'template-id',
                projectId: 'project-id',
                studentId: 'student-id',
            };

            mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
            mockTemplateRepository.save.mockResolvedValue(mockTemplate);
            mockEffectivenessRepository.save.mockResolvedValue(mockEffectiveness);

            // Mock the static method
            jest.spyOn(TemplateEffectiveness, 'createFromProject').mockReturnValue(mockEffectiveness as any);

            const result = await service.trackTemplateUsage(
                'template-id',
                'project-id',
                'student-id',
            );

            expect(result).toEqual(mockEffectiveness);
            expect(mockTemplate.incrementUsage).toHaveBeenCalled();
            expect(mockTemplateRepository.save).toHaveBeenCalledWith(mockTemplate);
            expect(TemplateEffectiveness.createFromProject).toHaveBeenCalledWith(
                'template-id',
                'project-id',
                'student-id',
                2, // milestone count
                84, // duration in days (12 weeks * 7)
                25, // total estimated hours
            );
        });

        it('should throw error when template not found', async () => {
            mockTemplateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.trackTemplateUsage('non-existent-id', 'project-id', 'student-id'),
            ).rejects.toThrow('Template not found');
        });
    });

    describe('updateMilestoneProgress', () => {
        it('should update milestone progress for existing effectiveness record', async () => {
            const mockEffectiveness = {
                id: 'effectiveness-id',
                projectId: 'project-id',
                updateMilestoneProgress: jest.fn(),
            };

            mockEffectivenessRepository.findOne.mockResolvedValue(mockEffectiveness);
            mockEffectivenessRepository.save.mockResolvedValue(mockEffectiveness);

            await service.updateMilestoneProgress(
                'project-id',
                'Test Milestone',
                'completed',
                7,
            );

            expect(mockEffectiveness.updateMilestoneProgress).toHaveBeenCalledWith(
                'Test Milestone',
                'completed',
                7,
            );
            expect(mockEffectivenessRepository.save).toHaveBeenCalledWith(mockEffectiveness);
        });

        it('should handle missing effectiveness record gracefully', async () => {
            mockEffectivenessRepository.findOne.mockResolvedValue(null);

            // Should not throw error, just log warning
            await expect(
                service.updateMilestoneProgress('project-id', 'Test Milestone', 'completed'),
            ).resolves.not.toThrow();
        });
    });

    describe('recordStudentFeedback', () => {
        it('should record student feedback and update template rating', async () => {
            const mockTemplate = {
                id: 'template-id',
                updateRating: jest.fn(),
            };

            const mockEffectiveness = {
                id: 'effectiveness-id',
                projectId: 'project-id',
                template: mockTemplate,
                setStudentFeedback: jest.fn(),
            };

            mockEffectivenessRepository.findOne.mockResolvedValue(mockEffectiveness);
            mockEffectivenessRepository.save.mockResolvedValue(mockEffectiveness);
            mockTemplateRepository.save.mockResolvedValue(mockTemplate);

            await service.recordStudentFeedback(
                'project-id',
                4,
                'Great template!',
                true,
                { overall: 3, milestones: [] },
            );

            expect(mockEffectiveness.setStudentFeedback).toHaveBeenCalledWith(
                4,
                'Great template!',
                true,
                { overall: 3, milestones: [] },
            );
            expect(mockTemplate.updateRating).toHaveBeenCalledWith(4);
            expect(mockEffectivenessRepository.save).toHaveBeenCalledWith(mockEffectiveness);
            expect(mockTemplateRepository.save).toHaveBeenCalledWith(mockTemplate);
        });

        it('should throw error when effectiveness record not found', async () => {
            mockEffectivenessRepository.findOne.mockResolvedValue(null);

            await expect(
                service.recordStudentFeedback('project-id', 4, 'Great template!', true),
            ).rejects.toThrow('Template effectiveness record not found');
        });
    });

    describe('getTemplateUsageStats', () => {
        it('should return comprehensive usage statistics', async () => {
            const mockTemplate = {
                id: 'template-id',
                name: 'Test Template',
                usageCount: 10,
                averageRating: 4.2,
                ratingCount: 8,
                estimatedDurationWeeks: 12,
            };

            mockTemplateRepository.findOne.mockResolvedValue(mockTemplate);
            mockEffectivenessRepository.count
                .mockResolvedValueOnce(3) // recent usage
                .mockResolvedValueOnce(10) // total projects
                .mockResolvedValueOnce(8) // completed projects
                .mockResolvedValueOnce(9) // successful projects
                .mockResolvedValueOnce(7); // recommended count

            mockEffectivenessRepository.find
                .mockResolvedValueOnce([
                    { actualDurationDays: 80 },
                    { actualDurationDays: 90 },
                    { actualDurationDays: 85 },
                ]) // completed effectiveness
                .mockResolvedValueOnce([
                    { getEffectivenessScore: () => 85 },
                    { getEffectivenessScore: () => 90 },
                    { getEffectivenessScore: () => 80 },
                ]); // all effectiveness

            const result = await service.getTemplateUsageStats('template-id');

            expect(result).toEqual({
                templateId: 'template-id',
                templateName: 'Test Template',
                totalUsage: 10,
                recentUsage: 3,
                averageRating: 4.2,
                ratingCount: 8,
                completionRate: 80, // 8/10 * 100
                averageDuration: 85, // (80+90+85)/3
                successRate: 90, // 9/10 * 100
                popularityRank: 0,
                effectivenessScore: 85, // (85+90+80)/3
                recommendationRate: 70, // 7/10 * 100
            });
        });

        it('should throw error when template not found', async () => {
            mockTemplateRepository.findOne.mockResolvedValue(null);

            await expect(
                service.getTemplateUsageStats('non-existent-id'),
            ).rejects.toThrow('Template not found');
        });
    });

    describe('getTemplateRecommendations', () => {
        it('should return ranked template recommendations', async () => {
            const mockTemplates = [
                {
                    id: 'template-1',
                    name: 'Template 1',
                    specialization: 'Web Development',
                    projectType: ProjectType.WEB_APPLICATION,
                    isActive: true,
                    estimatedDurationWeeks: 12,
                },
                {
                    id: 'template-2',
                    name: 'Template 2',
                    specialization: 'Web Development',
                    projectType: ProjectType.WEB_APPLICATION,
                    isActive: true,
                    estimatedDurationWeeks: 10,
                },
            ];

            const mockStudentHistory = [];

            mockTemplateRepository.find.mockResolvedValue(mockTemplates);
            mockEffectivenessRepository.find.mockResolvedValue(mockStudentHistory);

            // Mock getTemplateUsageStats for each template
            jest.spyOn(service, 'getTemplateUsageStats')
                .mockResolvedValueOnce({
                    templateId: 'template-1',
                    templateName: 'Template 1',
                    totalUsage: 15,
                    recentUsage: 3,
                    averageRating: 4.5,
                    ratingCount: 10,
                    completionRate: 85,
                    averageDuration: 80,
                    successRate: 90,
                    popularityRank: 1,
                    effectivenessScore: 88,
                    recommendationRate: 80,
                })
                .mockResolvedValueOnce({
                    templateId: 'template-2',
                    templateName: 'Template 2',
                    totalUsage: 8,
                    recentUsage: 1,
                    averageRating: 3.8,
                    ratingCount: 5,
                    completionRate: 70,
                    averageDuration: 75,
                    successRate: 75,
                    popularityRank: 2,
                    effectivenessScore: 75,
                    recommendationRate: 60,
                });

            // Mock getTemplateDifficulty
            jest.spyOn(service as any, 'getTemplateDifficulty')
                .mockResolvedValueOnce(2.5) // easy
                .mockResolvedValueOnce(3.5); // medium

            const result = await service.getTemplateRecommendations(
                'student-id',
                'Web Development',
                ProjectType.WEB_APPLICATION,
                2,
            );

            expect(result).toHaveLength(2);
            expect(result[0].templateId).toBe('template-1'); // Should be ranked higher
            expect(result[0].score).toBeGreaterThan(result[1].score);
            expect(result[0].difficulty).toBe('easy');
            expect(result[1].difficulty).toBe('hard');
        });
    });

    describe('getTemplateOptimizationSuggestions', () => {
        it('should return optimization suggestions grouped by frequency', async () => {
            const mockEffectivenessRecords = [
                {
                    templateId: 'template-1',
                    template: { name: 'Template 1' },
                    improvementSuggestions: [
                        {
                            category: 'timeline',
                            suggestion: 'Extend milestone deadlines',
                            priority: 'high',
                        },
                        {
                            category: 'milestones',
                            suggestion: 'Add more detailed descriptions',
                            priority: 'medium',
                        },
                    ],
                },
                {
                    templateId: 'template-1',
                    template: { name: 'Template 1' },
                    improvementSuggestions: [
                        {
                            category: 'timeline',
                            suggestion: 'Extend milestone deadlines',
                            priority: 'high',
                        },
                    ],
                },
            ];

            mockEffectivenessRepository.find.mockResolvedValue(mockEffectivenessRecords);

            const result = await service.getTemplateOptimizationSuggestions();

            expect(result).toHaveLength(2);
            expect(result[0].suggestion).toBe('Extend milestone deadlines');
            expect(result[0].frequency).toBe(2);
            expect(result[0].priority).toBe('high');
            expect(result[1].suggestion).toBe('Add more detailed descriptions');
            expect(result[1].frequency).toBe(1);
            expect(result[1].priority).toBe('medium');
        });
    });
});