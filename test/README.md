# Project Repository & Search - Test Suite

This directory contains comprehensive tests for the Project Repository & Search system, covering integration tests, performance tests, and end-to-end workflow tests.

## Test Structure

### Integration Tests

- **`projects.e2e-spec.ts`** - Tests for project search, browsing, and discovery endpoints
- **`bookmarks.e2e-spec.ts`** - Tests for bookmark management functionality
- **`admin-projects.e2e-spec.ts`** - Tests for admin project approval and management

### Performance Tests

- **`performance/project-search-load.test.ts`** - Load testing for search endpoints with realistic data volumes

### Workflow Tests

- **`workflows.e2e-spec.ts`** - End-to-end tests covering complete user workflows

## Running Tests

### All Tests

\`\`\`bash
npm run test:all
\`\`\`

### Integration Tests Only

\`\`\`bash
npm run test:integration
\`\`\`

### Individual Test Suites

\`\`\`bash
# Project search and browsing tests
npm run test:e2e:projects

# Bookmark management tests
npm run test:e2e:bookmarks

# Admin functionality tests
npm run test:e2e:admin

# Complete workflow tests
npm run test:e2e:workflows
\`\`\`

### Performance Tests

\`\`\`bash
npm run test:performance
\`\`\`

## Test Environment Setup

### Environment Variables

Create a `.env.test` file with test database configuration:

\`\`\`env
NODE_ENV=test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=test_user
DATABASE_PASSWORD=test_password
DATABASE_NAME=fyp_platform_test
JWT_SECRET=test_jwt_secret_key_for_testing_only
JWT_EXPIRES_IN=1h
\`\`\`

### Performance Test Environment

Create a `.env.performance` file for performance testing:

\`\`\`env
NODE_ENV=performance
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=perf_user
DATABASE_PASSWORD=perf_password
DATABASE_NAME=fyp_platform_performance
JWT_SECRET=performance_jwt_secret_key
JWT_EXPIRES_IN=1h
\`\`\`

### Database Setup

Ensure you have separate test databases:

\`\`\`sql
-- Test database
CREATE DATABASE fyp_platform_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE fyp_platform_test TO test_user;

-- Performance test database
CREATE DATABASE fyp_platform_performance;
CREATE USER perf_user WITH PASSWORD 'perf_password';
GRANT ALL PRIVILEGES ON DATABASE fyp_platform_performance TO perf_user;
\`\`\`

## Test Coverage

### Projects Controller (`projects.e2e-spec.ts`)

#### Search and Browse Functionality

- ✅ Basic project search without authentication
- ✅ Filtering by specialization, difficulty, year, tags, group status
- ✅ Full-text search with query sanitization
- ✅ Pagination and sorting
- ✅ Popular projects endpoint
- ✅ Project details with view tracking
- ✅ Related project suggestions
- ✅ Input validation and error handling

#### Performance Tests

- ✅ Large result set handling (50+ projects)
- ✅ Complex search query performance
- ✅ Concurrent request handling (10 simultaneous users)
- ✅ Response time validation (< 500ms for typical queries)

#### Security Tests

- ✅ Input sanitization (XSS prevention)
- ✅ SQL injection prevention
- ✅ Authentication requirements
- ✅ Rate limiting validation

### Bookmarks Controller (`bookmarks.e2e-spec.ts`)

#### Bookmark Management

- ✅ Create bookmarks with duplicate prevention
- ✅ List user bookmarks with pagination
- ✅ Check bookmark status for projects
- ✅ Remove bookmarks by ID and project ID
- ✅ Compare bookmarked projects
- ✅ Bookmark categories (if implemented)

#### Performance Tests

- ✅ Large bookmark list handling (100+ bookmarks)
- ✅ Concurrent bookmark operations
- ✅ Response time validation

#### Security Tests

- ✅ User isolation (users can only access their bookmarks)
- ✅ Authentication requirements
- ✅ Input validation

### Admin Projects Controller (`admin-projects.e2e-spec.ts`)

#### Project Approval Workflow

- ✅ List pending projects with filtering and pagination
- ✅ Approve projects with optional notes
- ✅ Reject projects with required reasons
- ✅ Archive projects
- ✅ Bulk operations (archive old, reject stale)

#### Analytics and Reporting

- ✅ System analytics with comprehensive metrics
- ✅ Project status statistics
- ✅ Projects requiring attention
- ✅ Performance metrics calculation

#### Security Tests

- ✅ Admin role requirements
- ✅ Authentication validation
- ✅ Concurrent operation handling

### Performance Tests (`performance/project-search-load.test.ts`)

#### Load Testing Scenarios

- ✅ **Basic Search Load**: 10 concurrent users, 15 seconds
  - Target: < 500ms average response time
  - Target: > 5 requests/second
  - Target: 0% failure rate

- ✅ **Filtered Search Load**: 15 concurrent users, 20 seconds
  - Target: < 800ms average response time
  - Target: > 3 requests/second
  - Target: 0% failure rate

- ✅ **Complex Query Load**: 8 concurrent users, 15 seconds
  - Target: < 1000ms average response time
  - Target: > 2 requests/second
  - Target: 0% failure rate

- ✅ **High Concurrency Stress**: 50 concurrent users, 20 seconds
  - Target: < 2000ms average response time
  - Target: < 5% failure rate

- ✅ **Sustained Load**: 15 concurrent users, 60 seconds
  - Target: < 800ms average response time
  - Target: < 2000ms 99th percentile

#### Performance Metrics Tracked

- Total requests and success rate
- Average, minimum, maximum response times
- 95th and 99th percentile response times
- Requests per second throughput
- Memory and resource usage patterns

### Workflow Tests (`workflows.e2e-spec.ts`)

#### Complete Project Lifecycle

- ✅ Supervisor creates project → Admin reviews → Admin approves → Student discovers → Student bookmarks → Analytics tracking

#### Project Rejection and Resubmission

- ✅ Supervisor creates problematic project → Admin rejects with feedback → Supervisor improves and resubmits → Admin approves

#### Student Project Discovery

- ✅ Search by multiple criteria → View details → Bookmark projects → Compare projects → Get suggestions → Manage bookmarks

#### Admin Management Workflow

- ✅ Review statistics → Process pending projects → Perform bulk operations → Generate analytics reports

#### Error Handling Scenarios

- ✅ Invalid input validation
- ✅ Unauthorized access attempts
- ✅ Non-existent resource handling
- ✅ Duplicate operation prevention
- ✅ Malformed request handling

## Test Data Management

### Automatic Cleanup

All tests include proper setup and teardown:

- Database cleanup before and after test suites
- Isolated test data for each test case
- No cross-test data contamination

### Realistic Test Data

- **1000+ projects** for performance testing
- **Multiple user roles** (student, supervisor, admin)
- **Diverse project data** across all specializations
- **Realistic abstracts and metadata**

### Performance Test Data

- Large datasets (1000 projects) for realistic load testing
- Varied project attributes for comprehensive search testing
- Multiple technology stacks and specializations
- Realistic text content for full-text search validation

## Continuous Integration

### Test Execution Order

1. Unit tests (existing)
2. Integration tests (projects, bookmarks, admin)
3. Workflow tests (end-to-end scenarios)
4. Performance tests (load and stress testing)

### Performance Benchmarks

Tests include performance assertions to catch regressions:

- Response time thresholds
- Throughput requirements
- Memory usage limits
- Concurrent user capacity

### Failure Handling

- Detailed error reporting with context
- Performance metrics logging
- Test data preservation for debugging
- Automatic retry for flaky network operations

## Extending the Test Suite

### Adding New Tests

1. Follow existing naming conventions
2. Include proper setup/teardown
3. Add performance assertions where applicable
4. Document test scenarios in this README

### Performance Test Guidelines

1. Use realistic data volumes
2. Test with multiple concurrent users
3. Validate both success and failure scenarios
4. Include memory and resource usage checks
5. Set appropriate timeouts for long-running tests

### Security Test Considerations

1. Test authentication and authorization
2. Validate input sanitization
3. Check for injection vulnerabilities
4. Verify rate limiting effectiveness
5. Test user data isolation

## Troubleshooting

### Common Issues

#### Database Connection Errors

- Ensure test databases exist and are accessible
- Check environment variable configuration
- Verify database user permissions

#### Performance Test Failures

- Check system resources during test execution
- Verify database performance and indexing
- Consider adjusting concurrency levels for slower systems

#### Timeout Issues

- Increase test timeouts for slower environments
- Check for database locks or connection pool exhaustion
- Monitor system resource usage during tests

#### Authentication Failures

- Verify JWT secret configuration
- Check token expiration settings
- Ensure user creation is successful in test setup

### Debug Mode

Run tests with additional logging:

\`\`\`bash
DEBUG=* npm run test:e2e
\`\`\`

### Selective Test Execution

Run specific test files or patterns:

\`\`\`bash
npx jest --testPathPattern=projects --verbose
npx jest --testNamePattern="should handle basic search"
\`\`\`
