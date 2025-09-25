import {
  Project,
  ProjectBookmark,
  ProjectView,
  BookmarkCategory,
} from '@/entities';
import {
  CreateProjectDto,
  UpdateProjectDto,
  SearchProjectsDto,
  ProjectDetailDto,
  ProjectSummaryDto,
  PaginatedProjectsDto,
} from '@/dto/project';
import {
  CreateBookmarkDto,
  BookmarkQueryDto,
  CompareProjectsDto,
} from '@/dto/bookmark';
import { DifficultyLevel, ApprovalStatus } from '@/common/enums';
import { SPECIALIZATIONS } from '@/common/constants/specializations';

export class ProjectFixtures {
  // Basic Project Entity Fixtures
  static createTestProject(overrides: Partial<Project> = {}): Partial<Project> {
    return {
      title: 'Test Project Title',
      abstract:
        'This is a comprehensive test project abstract that describes the project goals, methodology, and expected outcomes. It includes technical details and implementation approach.',
      specialization: SPECIALIZATIONS[0],
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2023,
      tags: ['Test', 'Project', 'Sample'],
      technologyStack: ['JavaScript', 'Node.js', 'React'],
      isGroupProject: false,
      approvalStatus: ApprovalStatus.APPROVED,
      githubUrl: 'https://github.com/test/test-project',
      demoUrl: 'https://test-project-demo.ui.edu.ng',
      notes: 'Test project notes and additional information',
      approvedAt: new Date(),
      ...overrides,
    };
  }

  static createPendingProject(
    overrides: Partial<Project> = {},
  ): Partial<Project> {
    return this.createTestProject({
      title: 'Pending Test Project',
      approvalStatus: ApprovalStatus.PENDING,
      approvedAt: null,
      approvedBy: null,
      ...overrides,
    });
  }

  static createRejectedProject(
    overrides: Partial<Project> = {},
  ): Partial<Project> {
    return this.createTestProject({
      title: 'Rejected Test Project',
      approvalStatus: ApprovalStatus.REJECTED,
      approvedAt: null,
      approvedBy: null,
      ...overrides,
    });
  }

  static createArchivedProject(
    overrides: Partial<Project> = {},
  ): Partial<Project> {
    return this.createTestProject({
      title: 'Archived Test Project',
      approvalStatus: ApprovalStatus.ARCHIVED,
      year: 2020,
      ...overrides,
    });
  }

  // DTO Fixtures
  static createValidCreateProjectDto(
    overrides: Partial<CreateProjectDto> = {},
  ): CreateProjectDto {
    return {
      title: 'Valid Test Project for Creation',
      abstract:
        'This is a valid project abstract that meets all the minimum length requirements and provides comprehensive information about the project scope, objectives, methodology, and expected deliverables.',
      specialization: SPECIALIZATIONS[1],
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
      tags: ['Web Development', 'Full Stack', 'Testing'],
      technologyStack: ['React', 'Node.js', 'PostgreSQL', 'TypeScript'],
      isGroupProject: false,
      githubUrl: 'https://github.com/ui-fyp/valid-test-project',
      demoUrl: 'https://valid-test-demo.ui.edu.ng',
      notes: 'Additional notes for the valid test project',
      ...overrides,
    };
  }

  static createValidUpdateProjectDto(
    overrides: Partial<UpdateProjectDto> = {},
  ): UpdateProjectDto {
    return {
      title: 'Updated Test Project Title',
      abstract:
        'This is an updated project abstract that provides new information about the project modifications, enhanced features, and improved implementation approach.',
      tags: ['Updated', 'Enhanced', 'Improved'],
      technologyStack: [
        'React',
        'Node.js',
        'PostgreSQL',
        'TypeScript',
        'Docker',
      ],
      githubUrl: 'https://github.com/ui-fyp/updated-test-project',
      demoUrl: 'https://updated-test-demo.ui.edu.ng',
      notes: 'Updated project notes with new information',
      ...overrides,
    };
  }

  static createValidSearchProjectsDto(
    overrides: Partial<SearchProjectsDto> = {},
  ): SearchProjectsDto {
    return {
      query: 'machine learning',
      specializations: [SPECIALIZATIONS[0]],
      difficultyLevels: [DifficultyLevel.INTERMEDIATE],
      yearFrom: 2022,
      yearTo: 2024,
      tags: ['AI', 'ML'],
      isGroupProject: false,
      limit: 20,
      offset: 0,
      ...overrides,
    };
  }

  // Invalid DTOs for negative testing
  static createInvalidCreateProjectDto(
    type: 'title' | 'abstract' | 'specialization' | 'year',
  ): Partial<CreateProjectDto> {
    const base = this.createValidCreateProjectDto();

    switch (type) {
      case 'title':
        return { ...base, title: 'Short' }; // Too short
      case 'abstract':
        return { ...base, abstract: 'Too short abstract' }; // Below minimum length
      case 'specialization':
        return { ...base, specialization: 'Invalid Specialization' };
      case 'year':
        return { ...base, year: 2019 }; // Too old
      default:
        return base;
    }
  }

  // Bookmark Fixtures
  static createTestBookmark(
    overrides: Partial<ProjectBookmark> = {},
  ): Partial<ProjectBookmark> {
    return {
      studentId: 'test-student-id',
      projectId: 'test-project-id',
      categoryId: null,
      ...overrides,
    };
  }

  static createTestBookmarkCategory(
    overrides: Partial<BookmarkCategory> = {},
  ): Partial<BookmarkCategory> {
    return {
      name: 'Test Category',
      description: 'Test bookmark category description',
      color: '#FF6B6B',
      studentId: 'test-student-id',
      ...overrides,
    };
  }

  static createValidCreateBookmarkDto(
    overrides: Partial<CreateBookmarkDto> = {},
  ): CreateBookmarkDto {
    return {
      projectId: 'test-project-id',
      categoryId: null,
      ...overrides,
    };
  }

  static createValidBookmarkQueryDto(
    overrides: Partial<BookmarkQueryDto> = {},
  ): BookmarkQueryDto {
    return {
      categoryId: null,
      limit: 20,
      offset: 0,
      ...overrides,
    };
  }

  static createValidCompareProjectsDto(
    overrides: Partial<CompareProjectsDto> = {},
  ): CompareProjectsDto {
    return {
      projectIds: ['project-1-id', 'project-2-id'],
      ...overrides,
    };
  }

  // Project View Fixtures
  static createTestProjectView(
    overrides: Partial<ProjectView> = {},
  ): Partial<ProjectView> {
    return {
      projectId: 'test-project-id',
      viewerId: 'test-viewer-id',
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewedAt: new Date(),
      ...overrides,
    };
  }

  static createAnonymousProjectView(
    overrides: Partial<ProjectView> = {},
  ): Partial<ProjectView> {
    return this.createTestProjectView({
      viewerId: null,
      ipAddress: '10.0.0.50',
      ...overrides,
    });
  }

  // Response DTO Fixtures
  static createProjectDetailDto(
    overrides: Partial<ProjectDetailDto> = {},
  ): ProjectDetailDto {
    return {
      id: 'test-project-id',
      title: 'Test Project Detail',
      abstract: 'Detailed project abstract for testing purposes',
      specialization: SPECIALIZATIONS[0],
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2023,
      tags: ['Test', 'Detail', 'Response'],
      technologyStack: ['React', 'Node.js', 'PostgreSQL'],
      isGroupProject: false,
      approvalStatus: ApprovalStatus.APPROVED,
      githubUrl: 'https://github.com/test/detail-project',
      demoUrl: 'https://detail-demo.ui.edu.ng',
      notes: 'Detailed project notes',
      supervisor: {
        id: 'supervisor-id',
        firstName: 'Test',
        lastName: 'Supervisor',
        email: 'supervisor@ui.edu.ng',
        specializations: [SPECIALIZATIONS[0]],
      },
      viewCount: 150,
      bookmarkCount: 25,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: new Date(),
      approvedBy: 'admin-id',
      ...overrides,
    };
  }

  static createProjectSummaryDto(
    overrides: Partial<ProjectSummaryDto> = {},
  ): ProjectSummaryDto {
    return {
      id: 'test-project-summary-id',
      title: 'Test Project Summary',
      abstract: 'Summary project abstract',
      specialization: SPECIALIZATIONS[1],
      difficultyLevel: DifficultyLevel.BEGINNER,
      year: 2023,
      tags: ['Summary', 'Test'],
      technologyStack: ['Vue.js', 'Express'],
      isGroupProject: true,
      supervisorName: 'Test Supervisor',
      viewCount: 75,
      bookmarkCount: 12,
      createdAt: new Date(),
      ...overrides,
    };
  }

  static createPaginatedProjectsDto(
    overrides: Partial<PaginatedProjectsDto> = {},
  ): PaginatedProjectsDto {
    return {
      projects: [
        this.createProjectSummaryDto({ id: 'project-1' }),
        this.createProjectSummaryDto({ id: 'project-2' }),
        this.createProjectSummaryDto({ id: 'project-3' }),
      ],
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
      hasNext: false,
      hasPrevious: false,
      ...overrides,
    };
  }

  // Bulk data generation for performance testing
  static createMultipleProjects(count: number): Partial<Project>[] {
    const projects: Partial<Project>[] = [];
    const techStacks = [
      ['React', 'Node.js', 'PostgreSQL'],
      ['Vue.js', 'Express', 'MongoDB'],
      ['Angular', 'NestJS', 'MySQL'],
      ['Python', 'Django', 'SQLite'],
      ['Java', 'Spring Boot', 'Oracle'],
    ];
    const tagPools = [
      ['Web Development', 'Frontend', 'Backend'],
      ['Mobile', 'iOS', 'Android'],
      ['AI', 'Machine Learning', 'Deep Learning'],
      ['Security', 'Encryption', 'Authentication'],
      ['Data Science', 'Analytics', 'Visualization'],
    ];

    for (let i = 0; i < count; i++) {
      const randomTechStack =
        techStacks[Math.floor(Math.random() * techStacks.length)];
      const randomTags = tagPools[Math.floor(Math.random() * tagPools.length)];
      const randomSpecialization =
        SPECIALIZATIONS[Math.floor(Math.random() * SPECIALIZATIONS.length)];
      const randomDifficulty =
        Object.values(DifficultyLevel)[Math.floor(Math.random() * 3)];
      const randomYear = 2020 + Math.floor(Math.random() * 4); // 2020-2023

      projects.push({
        title: `Bulk Test Project ${i + 1}`,
        abstract: `This is a bulk generated project abstract for project ${i + 1}. It contains comprehensive information about the project objectives, methodology, implementation approach, and expected outcomes. The project demonstrates various technical skills and knowledge areas.`,
        specialization: randomSpecialization,
        difficultyLevel: randomDifficulty,
        year: randomYear,
        tags: randomTags,
        technologyStack: randomTechStack,
        isGroupProject: Math.random() > 0.5,
        approvalStatus: ApprovalStatus.APPROVED,
        githubUrl: `https://github.com/bulk/project-${i + 1}`,
        demoUrl: Math.random() > 0.3 ? `https://demo-${i + 1}.ui.edu.ng` : null,
        notes: `Bulk generated notes for project ${i + 1}`,
        approvedAt: new Date(
          Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        ),
      });
    }

    return projects;
  }

  static createMultipleBookmarks(
    studentIds: string[],
    projectIds: string[],
  ): Partial<ProjectBookmark>[] {
    const bookmarks: Partial<ProjectBookmark>[] = [];

    for (const studentId of studentIds) {
      // Each student bookmarks 3-7 random projects
      const bookmarkCount = Math.floor(Math.random() * 5) + 3;
      const shuffledProjects = [...projectIds].sort(() => 0.5 - Math.random());
      const projectsToBookmark = shuffledProjects.slice(0, bookmarkCount);

      for (const projectId of projectsToBookmark) {
        bookmarks.push({
          studentId,
          projectId,
          categoryId: null, // No category for bulk data
        });
      }
    }

    return bookmarks;
  }

  static createMultipleProjectViews(
    projectIds: string[],
    viewerIds: string[],
  ): Partial<ProjectView>[] {
    const views: Partial<ProjectView>[] = [];
    const sampleIPs = [
      '192.168.1.100',
      '192.168.1.101',
      '10.0.0.50',
      '172.16.0.100',
    ];
    const sampleUserAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    ];

    for (const projectId of projectIds) {
      // Each project gets 20-100 views
      const viewCount = Math.floor(Math.random() * 80) + 20;

      for (let i = 0; i < viewCount; i++) {
        // 60% authenticated views, 40% anonymous
        const isAuthenticated = Math.random() > 0.4;
        const viewerId =
          isAuthenticated && viewerIds.length > 0
            ? viewerIds[Math.floor(Math.random() * viewerIds.length)]
            : null;

        views.push({
          projectId,
          viewerId,
          ipAddress: sampleIPs[Math.floor(Math.random() * sampleIPs.length)],
          userAgent:
            sampleUserAgents[
              Math.floor(Math.random() * sampleUserAgents.length)
            ],
          viewedAt: new Date(
            Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000,
          ), // Last 6 months
        });
      }
    }

    return views;
  }

  // Search test data
  static createSearchTestProjects(): Partial<Project>[] {
    return [
      {
        title: 'Machine Learning Student Performance Predictor',
        abstract:
          'An advanced machine learning system that predicts student academic performance using various data points including attendance, assignment scores, and engagement metrics.',
        specialization: 'Artificial Intelligence & Machine Learning',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2023,
        tags: [
          'Machine Learning',
          'Predictive Analytics',
          'Student Performance',
          'Data Science',
        ],
        technologyStack: [
          'Python',
          'Scikit-learn',
          'TensorFlow',
          'Pandas',
          'Flask',
        ],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      {
        title: 'React Native E-Commerce Mobile Application',
        abstract:
          'A comprehensive mobile e-commerce application built with React Native, featuring user authentication, product catalog, shopping cart, and payment integration.',
        specialization: 'Mobile Application Development',
        difficultyLevel: DifficultyLevel.INTERMEDIATE,
        year: 2023,
        tags: [
          'React Native',
          'E-Commerce',
          'Mobile Development',
          'Payment Integration',
        ],
        technologyStack: ['React Native', 'Node.js', 'MongoDB', 'Stripe API'],
        isGroupProject: true,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      {
        title: 'Blockchain Voting System Security Analysis',
        abstract:
          'A comprehensive security analysis of blockchain-based voting systems, including implementation of a prototype and vulnerability assessment.',
        specialization: 'Cybersecurity & Information Security',
        difficultyLevel: DifficultyLevel.ADVANCED,
        year: 2022,
        tags: [
          'Blockchain',
          'Voting System',
          'Security Analysis',
          'Cryptography',
        ],
        technologyStack: ['Solidity', 'Ethereum', 'Web3.js', 'Node.js'],
        isGroupProject: false,
        approvalStatus: ApprovalStatus.APPROVED,
      },
    ];
  }

  // Filter test data
  static createFilterTestProjects(): Partial<Project>[] {
    const projects: Partial<Project>[] = [];

    // Create projects for each specialization
    SPECIALIZATIONS.forEach((specialization, index) => {
      Object.values(DifficultyLevel).forEach((difficulty, diffIndex) => {
        [2022, 2023, 2024].forEach((year, yearIndex) => {
          projects.push({
            title: `${specialization} ${difficulty} Project ${year}`,
            abstract: `A ${difficulty} level project in ${specialization} completed in ${year}. This project demonstrates comprehensive understanding of the subject matter.`,
            specialization,
            difficultyLevel: difficulty,
            year,
            tags: [
              `${specialization.split(' ')[0]}`,
              difficulty,
              `Year${year}`,
            ],
            technologyStack: ['Technology1', 'Technology2', 'Technology3'],
            isGroupProject: (index + diffIndex + yearIndex) % 2 === 0,
            approvalStatus: ApprovalStatus.APPROVED,
          });
        });
      });
    });

    return projects;
  }

  // Performance test data generators
  static generateLargeDataset(projectCount: number, userCount: number) {
    return {
      projects: this.createMultipleProjects(projectCount),
      users: Array.from({ length: userCount }, (_, i) => `user-${i + 1}`),
      bookmarks: this.createMultipleBookmarks(
        Array.from({ length: userCount }, (_, i) => `user-${i + 1}`),
        Array.from({ length: projectCount }, (_, i) => `project-${i + 1}`),
      ),
      views: this.createMultipleProjectViews(
        Array.from({ length: projectCount }, (_, i) => `project-${i + 1}`),
        Array.from({ length: userCount }, (_, i) => `user-${i + 1}`),
      ),
    };
  }
}
