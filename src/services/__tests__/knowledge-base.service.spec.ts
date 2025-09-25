import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { KnowledgeBaseService } from '../knowledge-base.service';
import { KnowledgeBaseEntry } from '../../entities/knowledge-base-entry.entity';
import { ContentType } from '../../common/enums';
import {
  CreateKnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
  SearchKnowledgeDto,
} from '../../dto/knowledge';

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService;
  let repository: jest.Mocked<Repository<KnowledgeBaseEntry>>;
  let queryBuilder: jest.Mocked<SelectQueryBuilder<KnowledgeBaseEntry>>;

  const mockKnowledgeEntry: KnowledgeBaseEntry = {
    id: 'test-id',
    title: 'Test Entry',
    content: 'Test content for knowledge base entry',
    category: 'guidelines',
    tags: ['fyp', 'guidelines'],
    keywords: ['project', 'guidelines', 'requirements'],
    contentType: ContentType.GUIDELINE,
    language: 'en',
    isActive: true,
    usageCount: 5,
    averageRating: 4.2,
    createdById: 'user-id',
    createdBy: null,
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
    isPopular: jest.fn().mockReturnValue(false),
    isMultilingual: jest.fn().mockReturnValue(false),
  };

  beforeEach(async () => {
    // Create mock query builder
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getCount: jest.fn(),
    } as any;

    // Create mock repository
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        {
          provide: getRepositoryToken(KnowledgeBaseEntry),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<KnowledgeBaseService>(KnowledgeBaseService);
    repository = module.get(getRepositoryToken(KnowledgeBaseEntry));
  });

  describe('createEntry', () => {
    it('should create a new knowledge base entry', async () => {
      const createDto: CreateKnowledgeEntryDto = {
        title: 'Test Entry',
        content: 'Test content for knowledge base entry',
        category: 'guidelines',
        tags: ['fyp', 'guidelines'],
        keywords: ['project', 'guidelines', 'requirements'],
        contentType: ContentType.GUIDELINE,
        language: 'en',
      };

      repository.create.mockReturnValue(mockKnowledgeEntry);
      repository.save.mockResolvedValue(mockKnowledgeEntry);

      const result = await service.createEntry(createDto, 'user-id');

      expect(repository.create).toHaveBeenCalledWith({
        ...createDto,
        createdById: 'user-id',
      });
      expect(repository.save).toHaveBeenCalledWith(mockKnowledgeEntry);
      expect(result).toEqual(mockKnowledgeEntry);
    });
  });

  describe('updateEntry', () => {
    it('should update an existing knowledge base entry', async () => {
      const updateDto: UpdateKnowledgeEntryDto = {
        title: 'Updated Title',
        isActive: false,
      };

      repository.findOne.mockResolvedValue(mockKnowledgeEntry);
      const updatedEntry = Object.assign({}, mockKnowledgeEntry, updateDto);
      repository.save.mockResolvedValue(updatedEntry);

      const result = await service.updateEntry('test-id', updateDto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        relations: ['createdBy'],
      });
      expect(repository.save).toHaveBeenCalled();
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException when entry not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateEntry('non-existent', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    it('should return knowledge base entry by id', async () => {
      repository.findOne.mockResolvedValue(mockKnowledgeEntry);

      const result = await service.findById('test-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        relations: ['createdBy'],
      });
      expect(result).toEqual(mockKnowledgeEntry);
    });

    it('should throw NotFoundException when entry not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteEntry', () => {
    it('should delete knowledge base entry', async () => {
      repository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteEntry('test-id');

      expect(repository.delete).toHaveBeenCalledWith('test-id');
    });

    it('should throw NotFoundException when entry not found', async () => {
      repository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.deleteEntry('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchKnowledge', () => {
    it('should search knowledge base with query', async () => {
      const searchDto: SearchKnowledgeDto = {
        query: 'test query',
        category: 'guidelines',
        limit: 10,
        offset: 0,
      };

      queryBuilder.getCount.mockResolvedValue(1);
      queryBuilder.getMany.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.searchKnowledge(searchDto);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'kb.isActive = :isActive',
        {
          isActive: true,
        },
      );
      expect(result.entries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should handle empty search results', async () => {
      const searchDto: SearchKnowledgeDto = {
        query: 'non-existent',
      };

      queryBuilder.getCount.mockResolvedValue(0);
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.searchKnowledge(searchDto);

      expect(result.entries).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('searchByQuery', () => {
    it('should perform full-text search with query', async () => {
      queryBuilder.getMany.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.searchByQuery('test query', 'guidelines', 5);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'kb.isActive = :isActive',
        {
          isActive: true,
        },
      );
      expect(queryBuilder.addSelect).toHaveBeenCalled();
      expect(queryBuilder.andWhere).toHaveBeenCalled();
      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual([mockKnowledgeEntry]);
    });

    it('should handle search without query', async () => {
      queryBuilder.getMany.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.searchByQuery('', undefined, 10);

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'kb.averageRating',
        'DESC',
      );
      expect(result).toEqual([mockKnowledgeEntry]);
    });
  });

  describe('getRelevantContent', () => {
    it('should return relevant content for query', async () => {
      const freshMockEntry = Object.assign({}, mockKnowledgeEntry);
      freshMockEntry.title = 'Test Entry';
      queryBuilder.getMany.mockResolvedValue([freshMockEntry]);

      const result = await service.getRelevantContent('test query');

      expect(result).toContain('Test Entry');
      expect(result).toContain('Test content for knowledge base entry');
    });

    it('should return empty string when no relevant content found', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getRelevantContent('non-existent query');

      expect(result).toBe('');
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage count', async () => {
      repository.increment.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.incrementUsage('test-id');

      expect(repository.increment).toHaveBeenCalledWith(
        { id: 'test-id' },
        'usageCount',
        1,
      );
    });
  });

  describe('updateRating', () => {
    it('should update average rating', async () => {
      repository.findOne.mockResolvedValue(mockKnowledgeEntry);
      repository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.updateRating('test-id', 5);

      expect(repository.update).toHaveBeenCalledWith('test-id', {
        averageRating: expect.any(Number),
      });
    });
  });

  describe('getByCategory', () => {
    it('should return entries by category', async () => {
      repository.find.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.getByCategory('guidelines');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          category: 'guidelines',
          isActive: true,
        },
        order: {
          averageRating: 'DESC',
          usageCount: 'DESC',
        },
      });
      expect(result).toEqual([mockKnowledgeEntry]);
    });
  });

  describe('getByContentType', () => {
    it('should return entries by content type', async () => {
      repository.find.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.getByContentType(ContentType.GUIDELINE);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          contentType: ContentType.GUIDELINE,
          isActive: true,
        },
        order: {
          averageRating: 'DESC',
          usageCount: 'DESC',
        },
      });
      expect(result).toEqual([mockKnowledgeEntry]);
    });
  });

  describe('getPopularEntries', () => {
    it('should return popular entries', async () => {
      repository.find.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.getPopularEntries(5);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: {
          usageCount: 'DESC',
          averageRating: 'DESC',
        },
        take: 5,
      });
      expect(result).toEqual([mockKnowledgeEntry]);
    });
  });

  describe('getRecentEntries', () => {
    it('should return recent entries', async () => {
      repository.find.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.getRecentEntries(5);

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: {
          createdAt: 'DESC',
        },
        take: 5,
      });
      expect(result).toEqual([mockKnowledgeEntry]);
    });
  });

  describe('getEntriesByLanguage', () => {
    it('should return entries by language', async () => {
      repository.find.mockResolvedValue([mockKnowledgeEntry]);

      const result = await service.getEntriesByLanguage('en');

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          language: 'en',
          isActive: true,
        },
        order: {
          averageRating: 'DESC',
          usageCount: 'DESC',
        },
      });
      expect(result).toEqual([mockKnowledgeEntry]);
    });
  });
});
