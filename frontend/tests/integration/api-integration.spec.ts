import { test, expect } from '@playwright/test';

test.describe('API Integration Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock API responses for consistent testing
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        id: '1',
                        email: 'test@test.com',
                        role: 'student',
                        profile: {
                            firstName: 'Test',
                            lastName: 'User',
                            specialization: 'Computer Science',
                            year: 2024
                        }
                    },
                    token: 'mock-jwt-token',
                    refreshToken: 'mock-refresh-token'
                })
            });
        });

        await page.route('**/api/projects/search', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'AI-Powered Chat Application',
                            abstract: 'Building a modern chat app with AI integration',
                            specialization: 'Computer Science',
                            difficultyLevel: 'intermediate',
                            tags: ['AI', 'React', 'Node.js'],
                            supervisor: { name: 'Dr. Smith' },
                            isBookmarked: false
                        }
                    ],
                    total: 1,
                    page: 1,
                    limit: 10
                })
            });
        });
    });

    test('authentication API integration', async ({ page }) => {
        await page.goto('/login');

        // Test login API call
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');

        const loginRequest = page.waitForRequest('**/api/auth/login');
        await page.click('[data-testid="login-button"]');

        const request = await loginRequest;
        expect(request.method()).toBe('POST');

        const requestBody = request.postDataJSON();
        expect(requestBody.email).toBe('test@test.com');
        expect(requestBody.password).toBe('password');

        // Verify successful login redirect
        await expect(page).toHaveURL('/dashboard/student');
    });

    test('project search API integration', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Navigate to projects
        await page.goto('/projects');

        // Test search API call
        const searchRequest = page.waitForRequest('**/api/projects/search*');
        await page.fill('[data-testid="search-input"]', 'AI');

        const request = await searchRequest;
        expect(request.method()).toBe('GET');
        expect(request.url()).toContain('query=AI');

        // Verify search results display
        await expect(page.locator('[data-testid="project-card"]')).toBeVisible();
        await expect(page.locator('text=AI-Powered Chat Application')).toBeVisible();
    });

    test('bookmark API integration', async ({ page }) => {
        // Mock bookmark API
        await page.route('**/api/bookmarks', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 201,
                    contentType: 'application/json',
                    body: JSON.stringify({ success: true, bookmarkId: 'bookmark-1' })
                });
            }
        });

        // Login and navigate to projects
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');
        await page.goto('/projects');

        // Test bookmark creation
        const bookmarkRequest = page.waitForRequest('**/api/bookmarks');
        await page.locator('[data-testid="bookmark-button"]').first().click();

        const request = await bookmarkRequest;
        expect(request.method()).toBe('POST');

        const requestBody = request.postDataJSON();
        expect(requestBody.projectId).toBeDefined();

        // Verify bookmark state update
        await expect(page.locator('[data-testid="bookmark-button"][data-bookmarked="true"]')).toBeVisible();
    });

    test('AI assistant API integration', async ({ page }) => {
        // Mock AI assistant API
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: 'msg-1',
                        content: 'This is a mock AI response about project requirements.',
                        type: 'assistant',
                        timestamp: new Date().toISOString(),
                        confidenceScore: 0.95,
                        sources: [
                            { title: 'Project Guidelines', url: '/docs/guidelines' }
                        ]
                    }
                })
            });
        });

        // Login first
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Open AI assistant
        await page.keyboard.press('Meta+k');
        await expect(page.locator('[data-testid="ai-assistant-modal"]')).toBeVisible();

        // Test chat API call
        const chatRequest = page.waitForRequest('**/api/ai-assistant/chat');
        await page.fill('[data-testid="ai-input"]', 'What are the project requirements?');
        await page.click('[data-testid="send-message"]');

        const request = await chatRequest;
        expect(request.method()).toBe('POST');

        const requestBody = request.postDataJSON();
        expect(requestBody.message).toBe('What are the project requirements?');

        // Verify AI response display
        await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
        await expect(page.locator('text=This is a mock AI response')).toBeVisible();
        await expect(page.locator('[data-testid="confidence-score"]')).toContainText('95%');
    });

    test('error handling for API failures', async ({ page }) => {
        // Mock API error responses
        await page.route('**/api/projects/search', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({
                    statusCode: 500,
                    message: 'Internal server error',
                    error: 'Server Error'
                })
            });
        });

        // Login first
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Navigate to projects and trigger error
        await page.goto('/projects');
        await page.fill('[data-testid="search-input"]', 'test');

        // Verify error handling
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('text=Server error. Please try again later.')).toBeVisible();

        // Test retry functionality
        await page.route('**/api/projects/search', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ projects: [], total: 0, page: 1, limit: 10 })
            });
        });

        await page.click('[data-testid="retry-button"]');
        await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    test('rate limiting handling', async ({ page }) => {
        // Mock rate limit response
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 429,
                contentType: 'application/json',
                body: JSON.stringify({
                    statusCode: 429,
                    message: 'Too many requests. Please wait a moment and try again.',
                    error: 'Too Many Requests'
                })
            });
        });

        // Login and open AI assistant
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');
        await page.keyboard.press('Meta+k');

        // Trigger rate limit
        await page.fill('[data-testid="ai-input"]', 'Test message');
        await page.click('[data-testid="send-message"]');

        // Verify rate limit message
        await expect(page.locator('[data-testid="rate-limit-message"]')).toBeVisible();
        await expect(page.locator('text=Too many requests')).toBeVisible();

        // Verify input is disabled temporarily
        await expect(page.locator('[data-testid="ai-input"]')).toBeDisabled();
    });

    test('token refresh integration', async ({ page }) => {
        let tokenRefreshCalled = false;

        // Mock initial login
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: { id: '1', email: 'test@test.com', role: 'student' },
                    token: 'expired-token',
                    refreshToken: 'valid-refresh-token'
                })
            });
        });

        // Mock 401 response for expired token
        await page.route('**/api/projects/search', async route => {
            if (!tokenRefreshCalled) {
                await route.fulfill({
                    status: 401,
                    contentType: 'application/json',
                    body: JSON.stringify({ statusCode: 401, message: 'Unauthorized' })
                });
            } else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ projects: [], total: 0, page: 1, limit: 10 })
                });
            }
        });

        // Mock token refresh
        await page.route('**/api/auth/refresh', async route => {
            tokenRefreshCalled = true;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'new-valid-token',
                    refreshToken: 'new-refresh-token'
                })
            });
        });

        // Login and trigger API call
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');
        await page.goto('/projects');

        // Verify token refresh was called and request succeeded
        await page.waitForTimeout(1000);
        expect(tokenRefreshCalled).toBeTruthy();
        await expect(page.locator('[data-testid="projects-grid"]')).toBeVisible();
    });
});