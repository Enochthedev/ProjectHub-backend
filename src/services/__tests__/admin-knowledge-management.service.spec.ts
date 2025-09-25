import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AdminKnowledgeManagementService } from '../admin-knowledge-management.service';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import {
  KnowledgeBaseVersion,
  ContentVersion,
} from '../../entities/knowledge-base-version.entity';
import {
  KnowledgeBaseApproval,
  ApprovalStatus,
} from '../../entities/knowledge-base-approval.entity';
import { AdminAuditService } from '../admin-audit.service';
import { EmbeddingService } from '../embedding.service';
import { SimilarityService } from '../similarity.service';
import { ContentType } from '../../common/enums';
import {
  CreateKnowledgeBaseEntryDto,
  UpdateKnowledgeBaseEntryDto,
  ContentApprovalDto,
  BulkKnowledgeBaseOperationDto,
  KnowledgeBaseFiltersDto,
  ContentDuplicationCheckDto,
} from '../../dto/admin/knowledge-base.dto';

describe('AdminKnowledgeManagementService', () => {
  let service: AdminKnowledgeManagementService;
  let entryRepository: jest.Mocked<Repository<KnowledgeBaseEntry>>;
  let versionRepository: jest.Mocked<Repository<KnowledgeBaseVersion>>;
  let approvalRepository: jest.Mocked<Repository<KnowledgeBaseApproval>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;
  let auditService: jest.Mocked<AdminAuditService>;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let similarityService: jest.Mocked<SimilarityService>;

  const mockEntry: KnowledgeBaseEntry = {
    id: 'entry-1',
    title: 'Test Knowledge Entry',
    content: 'This is test content for knowledge base',
    category: 'Guidelines',
    tags: ['test', 'knowledge'],
    keywords: ['test', 'knowledge', 'base'],
    contentType: ContentType.GUIDELINE,
    language: 'en',
    isActive: true,
    usageCount: 10,
    averageRating: 4.5,
    createdBy: null,
    createdById: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    searchVector: null,
    incrementUsage: jest.fn(),
    updateRating: jest.fn(),
    activate: jest.fn(),
    deactivate: jest.fn(),
    addTag: jest.fn(),
    removeTag: jest.fn(),
    addKeyword: jest.fn(),
    removeKeyword: jest.fn(),
    isGuideline: jest.fn().mockReturnValue(true),
    isTemplate: jest.fn().mockReturnValue(false),
    isExample: jest.fn().mockReturnValue(false),
    isFAQ: jest.fn().mockReturnValue(false),
    isPolicy: jest.fn().mockReturnValue(false),
    hasHighRating: jest.fn().mockReturnValue(true),
    isPopular: jest.fn().mockReturnValue(true),
    isMultilingual: jest.fn().mockReturnValue(false),
  } as any;

  const mockVersion: KnowledgeBaseVersion = {
    id: 'version-1',
    entry: mockEntry,
    entryId: 'entry-1',
    versionNumber: 1,
    title: 'Test Knowledge Entry',
    content: 'This is test content for knowledge base',
    category: 'Guidelines',
    tags: ['test', 'knowledge'],
    keywords: ['test', 'knowledge', 'base'],
    contentType: ContentType.GUIDELINE,
    language: 'en',
    status: ContentVersion.PUBLISHED,
    changes: 'Initial version',
    summary: null,
    source: null,
    relatedEntries: [],
    createdBy: null,
    createdById: 'admin-1',
    createdAt: new Date(),
    isDraft: jest.fn().mockReturnValue(false),
    isPublished: jest.fn().mockReturnValue(true),
    isArchived: jest.fn().mockReturnValue(false),
    publish: jest.fn(),
    archive: jest.fn(),
    toDraft: jest.fn(),
    hasChanges: jest.fn().mockReturnValue(true),
    getChangesSummary: jest.fn().mockReturnValue('Initial version'),
    toEntryData: jest.fn(),
  } as any;

  const mockApproval: KnowledgeBaseApproval = {
    id: 'approval-1',
    entry: mockEntry,
    entryId: 'entry-1',
    status: ApprovalStatus.PENDING,
    action: 'submit' as any,
    submitter: null,
    submitterId: 'admin-1',
    reviewer: null,
    reviewerId: null,
    comments: null,
    suggestedChanges: [],
    reason: null,
    priority: 2,
    dueDate: new Date(),
    reviewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPending: jest.fn().mockReturnValue(true),
    isApproved: jest.fn().mockReturnValue(false),
    isRejected: jest.fn().mockReturnValue(false),
    needsRevision: jest.fn().mockReturnValue(false),
    approve: jest.fn(),
    reject: jest.fn(),
    requestChanges: jest.fn(),
    resubmit: jest.fn(),
    isOverdue: jest.fn().mockReturnValue(false),
    getDaysUntilDue: jest.fn().mockReturnValue(5),
    getProcessingTime: jest.fn().mockReturnValue(null),
    hasComments: jest.fn().mockReturnValue(false),
    hasSuggestedChanges: jest.fn().mockReturnValue(false),
    isHighPriority: jest.fn().mockReturnValue(false),
    setHighPriority: jest.fn(),
    setLowPriority: jest.fn(),
  } as any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockEntry], 1]),
      select: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({}),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      },
    } as any;

    // Mock the manager methods
    (queryRunner.manager.findOne as jest.Mock) = jest.fn();
    (queryRunner.manager.save as jest.Mock) = jest.fn();
    (queryRunner.manager.remove as jest.Mock) = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminKnowledgeManagementService,
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeBaseVersion),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(KnowledgeBaseApproval),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
          },
        },
        {
          provide: AdminAuditService,
          useValue: {
            logAdminAction: jest.fn(),
          },
        },
        {
          provide: EmbeddingService,
          useValue: {
            generateEmbeddings: jest.fn(),
          },
        },
        {
          provide: SimilarityService,
          useValue: {
            calculateTextSimilarity: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminKnowledgeManagementService>(
      AdminKnowledgeManagementService,
    );
    entryRepository = module.get(getRepositoryToken(KnowledgeBaseEntry));
    versionRepository = module.get(getRepositoryToken(KnowledgeBaseVersion));
    approvalRepository = module.get(getRepositoryToken(KnowledgeBaseApproval));
    dataSource = module.get(DataSource);
    auditService = module.get(AdminAuditService);
    embeddingService = module.get(EmbeddingService);
    similarityService = module.get(SimilarityService);
  });

  describe('getEntries', () => {
    it('should return paginated entries with filters', async () => {
      const filters: KnowledgeBaseFiltersDto = {
        search: 'test',
        category: 'Guidelines',
        page: 1,
        limit: 20,
      };

      approvalRepository.findOne.mockResolvedValue(mockApproval);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.getEntries(filters);

      expect(result).toEqual({
        entries: expect.any(Array),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        filters,
      });
      expect(entryRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should apply content type filter', async () => {
      const filters: KnowledgeBaseFiltersDto = {
        contentType: ContentType.GUIDELINE,
      };

      approvalRepository.findOne.mockResolvedValue(mockApproval);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      await service.getEntries(filters);

      const queryBuilder = entryRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.contentType = :contentType',
        { contentType: ContentType.GUIDELINE },
      );
    });

    it('should apply tags filter', async () => {
      const filters: KnowledgeBaseFiltersDto = {
        tags: ['test', 'knowledge'],
      };

      approvalRepository.findOne.mockResolvedValue(mockApproval);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      await service.getEntries(filters);

      const queryBuilder = entryRepository.createQueryBuilder();
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'entry.tags && :tags',
        { tags: ['test', 'knowledge'] },
      );
    });
  });

  describe('getEntryById', () => {
    it('should return entry by ID', async () => {
      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(mockApproval);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.getEntryById('entry-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('entry-1');
      expect(entryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'entry-1' },
        relations: ['createdBy'],
      });
    });

    it('should throw NotFoundException when entry not found', async () => {
      entryRepository.findOne.mockResolvedValue(null);

      await expect(service.getEntryById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEntry', () => {
    const createDto: CreateKnowledgeBaseEntryDto = {
      title: 'New Knowledge Entry',
      content: 'This is new content',
      category: 'Guidelines',
      tags: ['new', 'test'],
      keywords: ['new', 'knowledge'],
      contentType: ContentType.GUIDELINE,
      language: 'en',
    };

    it('should create new entry successfully', async () => {
      similarityService.calculateTextSimilarity.mockResolvedValue(0.3);
      entryRepository.find.mockResolvedValue([]);
      entryRepository.create.mockReturnValue(mockEntry);
      versionRepository.create.mockReturnValue(mockVersion);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockEntry);

      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(mockApproval);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.createEntry(createDto, 'admin-1');

      expect(entryRepository.create).toHaveBeenCalledWith({
        ...createDto,
        createdById: 'admin-1',
        language: 'en',
        isActive: true,
      });
      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'create',
        'knowledge_base_entry',
        mockEntry.id,
        null,
        mockEntry,
      );
    });

    it('should throw ConflictException for high similarity content', async () => {
      const similarEntry = { ...mockEntry, id: 'similar-entry' };
      entryRepository.find.mockResolvedValue([similarEntry]);
      similarityService.calculateTextSimilarity.mockResolvedValue(0.9);

      await expect(service.createEntry(createDto, 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create approval workflow for inactive entries', async () => {
      const inactiveDto = { ...createDto, isActive: false };

      similarityService.calculateTextSimilarity.mockResolvedValue(0.3);
      entryRepository.find.mockResolvedValue([]);
      entryRepository.create.mockReturnValue(mockEntry);
      versionRepository.create.mockReturnValue(mockVersion);
      approvalRepository.create.mockReturnValue(mockApproval);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockEntry);

      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(mockApproval);
      versionRepository.findOne.mockResolvedValue(mockVersion);

      await service.createEntry(inactiveDto, 'admin-1');

      expect(approvalRepository.create).toHaveBeenCalled();
    });
  });

  describe('updateEntry', () => {
    const updateDto: UpdateKnowledgeBaseEntryDto = {
      title: 'Updated Title',
      content: 'Updated content',
    };

    it('should update entry successfully', async () => {
      entryRepository.findOne.mockResolvedValue(mockEntry);
      versionRepository.findOne.mockResolvedValue(mockVersion);
      versionRepository.create.mockReturnValue(mockVersion);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockEntry);

      approvalRepository.findOne.mockResolvedValue(mockApproval);

      const result = await service.updateEntry('entry-1', updateDto, 'admin-1');

      expect(queryRunner.manager.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'update',
        'knowledge_base_entry',
        'entry-1',
        mockEntry,
        expect.any(Object),
      );
    });

    it('should create new version when content changes', async () => {
      entryRepository.findOne.mockResolvedValue(mockEntry);
      versionRepository.findOne.mockResolvedValue(mockVersion);
      versionRepository.create.mockReturnValue(mockVersion);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockEntry);

      approvalRepository.findOne.mockResolvedValue(mockApproval);

      await service.updateEntry('entry-1', updateDto, 'admin-1');

      expect(versionRepository.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when entry not found', async () => {
      entryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateEntry('nonexistent', updateDto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEntry', () => {
    it('should delete entry successfully', async () => {
      const entryWithoutUsage = { ...mockEntry, usageCount: 0 };
      entryRepository.findOne.mockResolvedValue(entryWithoutUsage);

      await service.deleteEntry('entry-1', 'admin-1');

      expect(entryRepository.remove).toHaveBeenCalledWith(entryWithoutUsage);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'delete',
        'knowledge_base_entry',
        'entry-1',
        entryWithoutUsage,
        null,
      );
    });

    it('should throw NotFoundException when entry not found', async () => {
      entryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteEntry('nonexistent', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when entry has usage history', async () => {
      entryRepository.findOne.mockResolvedValue(mockEntry); // Has usageCount > 0

      await expect(service.deleteEntry('entry-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processApproval', () => {
    const approvalDto: ContentApprovalDto = {
      status: ApprovalStatus.APPROVED,
      comments: 'Content looks good',
    };

    it('should approve entry successfully', async () => {
      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(mockApproval);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockApproval);

      versionRepository.findOne.mockResolvedValue(mockVersion);

      const result = await service.processApproval(
        'entry-1',
        approvalDto,
        'admin-1',
      );

      expect(mockApproval.approve).toHaveBeenCalledWith(
        'admin-1',
        'Content looks good',
      );
      expect(queryRunner.manager.save).toHaveBeenCalledWith(mockApproval);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'approval_approved',
        'knowledge_base_entry',
        'entry-1',
        null,
        expect.objectContaining({ status: ApprovalStatus.APPROVED }),
      );
    });

    it('should reject entry successfully', async () => {
      const rejectDto: ContentApprovalDto = {
        status: ApprovalStatus.REJECTED,
        reason: 'Content needs improvement',
        comments: 'Please revise',
      };

      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(mockApproval);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockApproval);

      versionRepository.findOne.mockResolvedValue(mockVersion);

      await service.processApproval('entry-1', rejectDto, 'admin-1');

      expect(mockApproval.reject).toHaveBeenCalledWith(
        'admin-1',
        'Content needs improvement',
        'Please revise',
      );
    });

    it('should request changes successfully', async () => {
      const changesDto: ContentApprovalDto = {
        status: ApprovalStatus.NEEDS_REVISION,
        suggestedChanges: ['Fix grammar', 'Add examples'],
        comments: 'Needs minor improvements',
      };

      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(mockApproval);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockApproval);

      versionRepository.findOne.mockResolvedValue(mockVersion);

      await service.processApproval('entry-1', changesDto, 'admin-1');

      expect(mockApproval.requestChanges).toHaveBeenCalledWith(
        'admin-1',
        ['Fix grammar', 'Add examples'],
        'Needs minor improvements',
      );
    });

    it('should throw NotFoundException when no pending approval found', async () => {
      entryRepository.findOne.mockResolvedValue(mockEntry);
      approvalRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processApproval('entry-1', approvalDto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEntryVersions', () => {
    it('should return entry versions', async () => {
      const versions = [mockVersion];
      versionRepository.find.mockResolvedValue(versions);

      const result = await service.getEntryVersions('entry-1');

      expect(result).toHaveLength(1);
      expect(result[0].entryId).toBe('entry-1');
      expect(versionRepository.find).toHaveBeenCalledWith({
        where: { entryId: 'entry-1' },
        relations: ['createdBy'],
        order: { versionNumber: 'DESC' },
      });
    });
  });

  describe('bulkOperation', () => {
    const bulkDto: BulkKnowledgeBaseOperationDto = {
      entryIds: ['entry-1', 'entry-2'],
      operation: 'approve',
      comments: 'Bulk approval',
    };

    it('should perform bulk approval successfully', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockEntry);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockEntry);

      const result = await service.bulkOperation(bulkDto, 'admin-1');

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle partial failures in bulk operations', async () => {
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockEntry) // First entry found
        .mockResolvedValueOnce(null); // Second entry not found

      const result = await service.bulkOperation(bulkDto, 'admin-1');

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('checkForDuplicates', () => {
    const checkDto: ContentDuplicationCheckDto = {
      title: 'Test Title',
      content: 'Test content for duplication check',
      keywords: ['test', 'duplicate'],
    };

    it('should detect no duplicates for unique content', async () => {
      entryRepository.find.mockResolvedValue([]);

      const result = await service.checkForDuplicates(checkDto);

      expect(result.isDuplicate).toBe(false);
      expect(result.similarityScore).toBe(0);
      expect(result.duplicateEntries).toHaveLength(0);
    });

    it('should detect duplicates for similar content', async () => {
      entryRepository.find.mockResolvedValue([mockEntry]);
      similarityService.calculateTextSimilarity.mockResolvedValue(0.8);

      const result = await service.checkForDuplicates(checkDto);

      expect(result.isDuplicate).toBe(true);
      expect(result.similarityScore).toBe(0.8);
      expect(result.duplicateEntries).toHaveLength(1);
    });

    it('should provide suggestions based on similarity', async () => {
      entryRepository.find.mockResolvedValue([mockEntry]);
      similarityService.calculateTextSimilarity.mockResolvedValue(0.6);

      const result = await service.checkForDuplicates(checkDto);

      expect(result.isDuplicate).toBe(false);
      expect(result.suggestions).toContain(
        'Similar content exists - consider referencing it',
      );
    });
  });

  describe('getQualityMetrics', () => {
    it('should return comprehensive quality metrics', async () => {
      entryRepository.count.mockResolvedValue(100);
      entryRepository.find.mockResolvedValue([mockEntry]);

      const result = await service.getQualityMetrics();

      expect(result.totalEntries).toBe(100);
      expect(result).toHaveProperty('contentByType');
      expect(result).toHaveProperty('contentByCategory');
      expect(result).toHaveProperty('languageDistribution');
      expect(result).toHaveProperty('qualityScores');
      expect(result).toHaveProperty('usageMetrics');
    });
  });
});
