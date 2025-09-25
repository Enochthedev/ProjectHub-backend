# Test Data and Performance Utilities

This directory contains comprehensive testing utilities for the Final Year Project platform, including data fixtures, performance testing tools, and database management utilities.

## Overview

The testing infrastructure provides:

- **Fixtures**: Realistic test data for unit and integration tests
- **Performance Testing**: Tools for generating large datasets and measuring performance
- **Database Management**: Utilities for cleaning up and resetting test data
- **Data Seeding**: Comprehensive project repository seeding with realistic content

## Quick Start

### Basic Data Seeding

\`\`\`bash
# Seed all data (users, projects, bookmarks, views)
npm run seed

# Seed only projects (requires existing users)
npm run seed:projects

# Clean up all seeded data
npm run seed:rollback

# Clean up only project data
npm run seed:cleanup
\`\`\`

### Performance Test Data

\`\`\`bash
# Generate small dataset (100 projects, 50 users)
npm run test:data:small

# Generate medium dataset (500 projects, 200 users)
npm run test:data:medium

# Generate large dataset (2000 projects, 500 users)
npm run test:data:large

# Generate custom dataset
npm run test:data custom 1000 100 50 10

# Clean up all test data
npm run test:data:cleanup

# Show database statistics
npm run test:data:stats
\`\`\`

### Performance Testing

\`\`\`bash
# Run minimal performance test
npm run test:perf:minimal

# Run realistic performance test
npm run test:perf:realistic

# Run stress test
npm run test:perf:stress

# Run comprehensive benchmark
npm run test:perf:benchmark
\`\`\`

## Directory Structure

\`\`\`
src/test/
├── fixtures/           # Test data fixtures
│   ├── auth.fixtures.ts       # Authentication-related test data
│   ├── user.fixtures.ts       # User and profile test data
│   ├── profile.fixtures.ts    # Profile update test data
│   └── project.fixtures.ts    # Project-related test data
├── utils/              # Testing utilities
│   ├── database-cleanup.util.ts    # Database cleanup utilities
│   ├── test-database.util.ts       # Test database management
│   └── test-data.util.ts           # Comprehensive data management
├── performance/        # Performance testing tools
│   ├── data-generator.ts           # Performance data generator
│   └── performance-test.script.ts  # Performance test runner
├── integration/        # Integration test examples
└── examples/          # Test examples and templates
\`\`\`

## Fixtures Usage

### Project Fixtures

\`\`\`typescript
import { ProjectFixtures } from '../fixtures';

// Create test project data
const project = ProjectFixtures.createTestProject({
  title: 'Custom Test Project',
  specialization: 'Web Development & Full Stack',
});

// Create search test data
const searchDto = ProjectFixtures.createValidSearchProjectsDto({
  query: 'machine learning',
  specializations: ['Artificial Intelligence & Machine Learning'],
});

// Generate bulk test data
const projects = ProjectFixtures.createMultipleProjects(100);
\`\`\`

### User Fixtures

\`\`\`typescript
import { UserFixtures } from '../fixtures';

// Create test users
const student = await UserFixtures.createTestStudent();
const supervisor = await UserFixtures.createTestSupervisor();

// Create bulk users for performance testing
const students = await UserFixtures.createMultipleStudents(50);
const supervisors = await UserFixtures.createMultipleSupervisors(10);
\`\`\`

## Test Data Utility

The `TestDataUtil` class provides comprehensive database management:

\`\`\`typescript
import { TestDataUtil } from '../utils';

// Initialize with repositories
const testDataUtil = new TestDataUtil(
  dataSource,
  userRepository,
  // ... other repositories
);

// Clean all data
await testDataUtil.cleanupAllTestData();

// Reset to clean state with basic data
await testDataUtil.resetToCleanState();

// Seed comprehensive test data
const { projects, bookmarks, views } = await testDataUtil.seedProjectTestData();

// Generate performance test data
await testDataUtil.seedPerformanceTestData({
  projectCount: 1000,
  userCount: 100,
  viewsPerProject: 50,
  bookmarksPerUser: 10,
});
\`\`\`

## Performance Testing

### Data Generation

The performance data generator supports multiple dataset sizes:

- **Small**: 100 projects, 50 users (development testing)
- **Medium**: 500 projects, 200 users (integration testing)
- **Large**: 2000 projects, 500 users (stress testing)
- **XLarge**: 5000 projects, 1000 users (extreme stress testing)
- **Custom**: User-defined sizes

### Benchmark Testing

The benchmark suite measures:

- Data generation performance
- Database query performance
- Search and filter operations
- Pagination efficiency
- Memory usage patterns

### Example Performance Test

\`\`\`typescript
// Run benchmark with different dataset sizes
const testCases = [
  { projectCount: 50, userCount: 20, name: 'Small' },
  { projectCount: 500, userCount: 100, name: 'Large' },
];

for (const testCase of testCases) {
  const startTime = Date.now();

  await testDataUtil.seedPerformanceTestData(testCase);

  const endTime = Date.now();
  const stats = await testDataUtil.getDatabaseStats();

  console.log(
    `${testCase.name}: ${endTime - startTime}ms, ${stats.projects} projects`,
  );
}
\`\`\`

## Integration with Tests

### Unit Tests

\`\`\`typescript
import { ProjectFixtures } from '../fixtures';

describe('ProjectService', () => {
  it('should create project', async () => {
    const projectData = ProjectFixtures.createValidCreateProjectDto();
    const result = await projectService.createProject(
      projectData,
      supervisorId,
    );

    expect(result.title).toBe(projectData.title);
  });
});
\`\`\`

### Integration Tests

\`\`\`typescript
import { TestDataUtil } from '../utils';

describe('Project API', () => {
  let testDataUtil: TestDataUtil;

  beforeEach(async () => {
    await testDataUtil.resetToCleanState();
  });

  afterEach(async () => {
    await testDataUtil.cleanupProjectData();
  });

  it('should search projects', async () => {
    const { projects } = await testDataUtil.seedProjectTestData();

    const response = await request(app)
      .get('/projects')
      .query({ query: 'machine learning' })
      .expect(200);

    expect(response.body.projects).toBeDefined();
  });
});
\`\`\`

## Environment Configuration

### Test Database

Create a separate test database configuration in `.env.test`:

\`\`\`env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=test_user
DATABASE_PASSWORD=test_password
DATABASE_NAME=fyp_test
\`\`\`

### Performance Testing

For performance testing, use `.env.performance`:

\`\`\`env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=perf_user
DATABASE_PASSWORD=perf_password
DATABASE_NAME=fyp_performance
\`\`\`

## Best Practices

### Test Data Management

1. **Isolation**: Each test should start with a clean state
2. **Cleanup**: Always clean up test data after tests
3. **Realistic Data**: Use fixtures that mirror production data
4. **Performance**: Use bulk operations for large datasets

### Performance Testing

1. **Separate Environment**: Use dedicated performance test database
2. **Baseline Measurements**: Establish performance baselines
3. **Gradual Scaling**: Test with incrementally larger datasets
4. **Resource Monitoring**: Monitor memory and CPU usage

### Fixture Design

1. **Modularity**: Create focused, reusable fixtures
2. **Flexibility**: Support customization through overrides
3. **Relationships**: Maintain proper entity relationships
4. **Validation**: Ensure fixtures pass validation rules

## Troubleshooting

### Common Issues

1. **Foreign Key Constraints**: Clean up data in correct order
2. **Memory Issues**: Use batch processing for large datasets
3. **Test Timeouts**: Increase timeout for performance tests
4. **Database Locks**: Ensure proper transaction handling

### Performance Issues

1. **Slow Data Generation**: Use bulk insert operations
2. **Query Performance**: Check database indexes
3. **Memory Usage**: Monitor heap usage during tests
4. **Connection Limits**: Use connection pooling

## Contributing

When adding new test utilities:

1. Follow existing patterns and naming conventions
2. Add comprehensive documentation
3. Include usage examples
4. Update this README with new features
5. Ensure proper error handling and cleanup
