# Testing Guide

This document outlines the comprehensive testing strategy for the ProjectHub frontend application.

## Testing Stack

- **Unit Testing**: Jest + React Testing Library
- **End-to-End Testing**: Playwright
- **Accessibility Testing**: jest-axe + @axe-core/playwright
- **Visual Regression Testing**: Playwright screenshots
- **Performance Testing**: Lighthouse + Custom metrics
- **Error Tracking**: Custom monitoring service

## Test Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── **/__tests__/          # Component unit tests
│   ├── stores/
│   │   └── **/__tests__/          # Store unit tests
│   ├── lib/
│   │   └── **/__tests__/          # Utility unit tests
│   └── test-utils/                # Testing utilities
├── tests/
│   ├── e2e/                       # End-to-end tests
│   ├── accessibility/             # Accessibility tests
│   ├── performance/               # Performance tests
│   └── visual/                    # Visual regression tests
└── __mocks__/                     # Mock files
```

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run accessibility tests only
npm run test:a11y

# Run performance tests only
npm run test:performance
```

### End-to-End Tests
```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run E2E tests in headed mode
npm run test:e2e:headed

# Run visual regression tests
npm run test:visual
```

### All Tests
```bash
# Run complete test suite
npm run test:all
```

## Coverage Requirements

### Global Coverage Thresholds
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Critical Component Thresholds
- **UI Components**: 90%
- **Stores**: 85%
- **Utilities**: 85%

## Writing Tests

### Unit Tests

#### Component Testing
```typescript
import { render, screen, fireEvent } from '@/test-utils';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Store Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '../auth';

describe('Auth Store', () => {
  it('should login user successfully', async () => {
    const { result } = renderHook(() => useAuthStore());
    
    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123'
      });
    });
    
    expect(result.current.user).toBeDefined();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### End-to-End Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.url()).toContain('/dashboard');
  });
});
```

### Accessibility Tests

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('page should be accessible', async ({ page }) => {
  await page.goto('/dashboard');
  await injectAxe(page);
  await checkA11y(page);
});
```

### Performance Tests

```typescript
import { test, expect } from '@playwright/test';

test('page load should be fast', async ({ page }) => {
  const response = await page.goto('/dashboard');
  
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    };
  });
  
  expect(metrics.loadTime).toBeLessThan(3000);
  expect(metrics.domContentLoaded).toBeLessThan(1500);
});
```

## Test Utilities

### Mock Data
Use predefined mock data from `test-utils`:
```typescript
import { mockUser, mockProject, mockConversation } from '@/test-utils';
```

### API Mocking
```typescript
import { mockApiResponse, mockApiError } from '@/test-utils';

// Mock successful response
fetch.mockResolvedValue(mockApiResponse({ data: 'success' }));

// Mock error response
fetch.mockRejectedValue(mockApiError('Server error', 500));
```

### Form Testing
```typescript
import { fillForm } from '@/test-utils';

await fillForm({
  email: 'test@example.com',
  password: 'password123',
  firstName: 'John',
});
```

## Best Practices

### Unit Tests
1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **Follow AAA pattern** (Arrange, Act, Assert)
4. **Mock external dependencies**
5. **Test edge cases and error states**

### E2E Tests
1. **Test critical user journeys**
2. **Use data-testid for reliable selectors**
3. **Mock external APIs for consistency**
4. **Test responsive design**
5. **Include error scenarios**

### Accessibility Tests
1. **Test with keyboard navigation**
2. **Verify ARIA labels and roles**
3. **Check color contrast**
4. **Test screen reader compatibility**
5. **Validate form accessibility**

### Performance Tests
1. **Set realistic thresholds**
2. **Test on different devices**
3. **Monitor Core Web Vitals**
4. **Test with slow networks**
5. **Measure bundle sizes**

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:coverage
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Run accessibility tests
        run: npm run test:a11y
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Error Tracking

### Monitoring Setup
The application includes comprehensive error tracking:

```typescript
import { monitoring } from '@/lib/monitoring';

// Manual error reporting
monitoring.captureException(new Error('Something went wrong'), {
  context: 'user-action',
  userId: user.id,
});

// Performance tracking
const transaction = monitoring.startTransaction('api-call');
// ... perform operation
transaction.finish();

// User action tracking
monitoring.trackUserAction('button-click', {
  buttonId: 'submit-form',
  page: '/projects',
});
```

### Error Boundaries
Wrap components with error boundaries:

```typescript
import { ErrorBoundary } from '@/lib/monitoring';

<ErrorBoundary fallback={CustomErrorComponent}>
  <MyComponent />
</ErrorBoundary>
```

## Performance Monitoring

### Core Web Vitals
The application automatically tracks:
- **First Contentful Paint (FCP)**
- **Largest Contentful Paint (LCP)**
- **Cumulative Layout Shift (CLS)**
- **First Input Delay (FID)**

### Custom Metrics
- Page load times
- API response times
- User interaction delays
- Bundle sizes

## Debugging Tests

### Jest Debugging
```bash
# Debug specific test
npm test -- --testNamePattern="Button Component"

# Run tests with verbose output
npm test -- --verbose

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Playwright Debugging
```bash
# Debug with UI
npm run test:e2e:ui

# Debug with headed browser
npm run test:e2e:headed

# Debug specific test
npx playwright test auth.spec.ts --debug
```

## Test Data Management

### Fixtures
Store test data in fixtures:
```typescript
// fixtures/users.ts
export const testUsers = {
  student: { /* user data */ },
  supervisor: { /* user data */ },
  admin: { /* user data */ },
};
```

### Database Seeding
For E2E tests, use database seeding:
```typescript
test.beforeEach(async () => {
  await seedDatabase();
});

test.afterEach(async () => {
  await cleanDatabase();
});
```

## Reporting

### Coverage Reports
- HTML report: `coverage/lcov-report/index.html`
- JSON report: `coverage/coverage-final.json`
- LCOV report: `coverage/lcov.info`

### Test Reports
- JUnit XML: `test-results/junit.xml`
- HTML report: `test-results/report.html`
- Playwright report: `playwright-report/index.html`

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in jest.config.js
   - Use waitFor for async operations

2. **Flaky E2E tests**
   - Add proper waits
   - Mock external dependencies
   - Use stable selectors

3. **Coverage not meeting thresholds**
   - Add missing test cases
   - Remove unnecessary code
   - Update thresholds if appropriate

4. **Accessibility violations**
   - Add proper ARIA labels
   - Ensure keyboard navigation
   - Fix color contrast issues

For more help, check the test logs or create an issue in the project repository.