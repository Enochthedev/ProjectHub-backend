import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService } from '../search.service';
import { Project } from '../../entities/project.entity';

describe('SearchService - Simple Test', () => {
  let service: SearchService;

  beforeEach(async () => {
    const mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
        getRawAndEntities: jest
          .fn()
          .mockResolvedValue({ entities: [], raw: [] }),
      }),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle basic search without query', async () => {
    const result = await service.searchProjects({
      limit: 10,
      offset: 0,
    });

    expect(result).toBeDefined();
    expect(result.projects).toEqual([]);
    expect(result.total).toBe(0);
  });
});
