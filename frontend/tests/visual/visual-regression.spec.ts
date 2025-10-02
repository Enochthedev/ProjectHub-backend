import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication
        await page.addInitScript(() => {
            localStorage.setItem('auth-token', 'mock-token');
            localStorage.setItem('user', JSON.stringify({
                id: '1',
                email: 'test@example.com',
                role: 'student',
                profile: { firstName: 'John', lastName: 'Doe' }
            }));
        });

        // Mock consistent data for visual tests
        await page.route('**/api/projects/search**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'AI-Powered Chat Application',
                            abstract: 'A modern chat application using AI for smart responses and natural language processing.',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            tags: ['AI', 'React', 'Node.js', 'WebSocket'],
                            supervisor: { name: 'Dr. Smith' },
                            bookmarkCount: 15,
                            viewCount: 120
                        },
                        {
                            id: '2',
                            title: 'IoT Smart Home System',
                            abstract: 'Complete home automation system with IoT devices, sensors, and mobile control interface.',
                            specialization: 'Computer Engineering',
                            difficultyLevel: 'advanced',
                            tags: ['IoT', 'Arduino', 'Python', 'Mobile'],
                            supervisor: { name: 'Prof. Johnson' },
                            bookmarkCount: 8,
                            viewCount: 85
                        }
                    ],
                    total: 2
                })
            });
        });
    });

    test('login page visual appearance', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        // Wait for any animations to complete
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('login-page.png');
    });

    test('registration page visual appearance', async ({ page }) => {
        await page.goto('/register');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('registration-page.png');
    });

    test('student dashboard visual appearance', async ({ page }) => {
        // Mock dashboard data
        await page.route('**/api/dashboard/student', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    currentProject: {
                        id: '1',
                        title: 'AI-Powered Chat Application',
                        progress: 65,
                        nextMilestone: 'Backend API Implementation',
                        dueDate: '2024-02-15'
                    },
                    recentActivity: [
                        { type: 'milestone_completed', description: 'Completed UI Design', timestamp: '2024-01-20' },
                        { type: 'ai_conversation', description: 'Asked about React best practices', timestamp: '2024-01-19' }
                    ],
                    recommendations: [
                        { title: 'Machine Learning Fundamentals', type: 'resource' },
                        { title: 'Advanced React Patterns', type: 'resource' }
                    ]
                })
            });
        });

        await page.goto('/dashboard/student');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('student-dashboard.png');
    });

    test('project discovery page visual appearance', async ({ page }) => {
        await page.goto('/projects');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('project-discovery.png');
    });

    test('project discovery with filters open', async ({ page }) => {
        await page.goto('/projects');
        await page.waitForLoadState('networkidle');

        // Open filters
        await page.click('text=Filters');
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot('project-discovery-filters.png');
    });

    test('AI assistant interface visual appearance', async ({ page }) => {
        await page.goto('/ai-assistant');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('ai-assistant-empty.png');
    });

    test('AI assistant with conversation', async ({ page }) => {
        // Mock conversation data
        await page.route('**/api/ai-assistant/conversations/1/messages', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    messages: [
                        {
                            id: '1',
                            content: 'Hello! I need help choosing a project topic.',
                            type: 'user',
                            timestamp: '2024-01-20T10:00:00Z'
                        },
                        {
                            id: '2',
                            content: 'I\'d be happy to help you choose a project topic! Based on your profile, I can see you\'re interested in software engineering. Here are some trending areas you might consider:\n\n1. **AI/Machine Learning Projects**\n2. **Web Development with Modern Frameworks**\n3. **Mobile App Development**\n4. **IoT and Smart Systems**\n\nWhat interests you most?',
                            type: 'assistant',
                            timestamp: '2024-01-20T10:00:30Z',
                            confidenceScore: 0.92,
                            sources: [
                                { title: 'Project Trends 2024', url: 'https://example.com/trends' }
                            ]
                        }
                    ]
                })
            });
        });

        await page.goto('/ai-assistant');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('ai-assistant-conversation.png');
    });

    test('mobile responsive design - login', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('mobile-login.png');
    });

    test('mobile responsive design - dashboard', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        // Mock mobile dashboard data
        await page.route('**/api/dashboard/student', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    currentProject: {
                        id: '1',
                        title: 'AI Chat App',
                        progress: 65,
                        nextMilestone: 'Backend API',
                        dueDate: '2024-02-15'
                    },
                    recentActivity: [
                        { type: 'milestone_completed', description: 'Completed UI Design', timestamp: '2024-01-20' }
                    ]
                })
            });
        });

        await page.goto('/dashboard/student');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('mobile-dashboard.png');
    });

    test('mobile navigation menu', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard/student');
        await page.waitForLoadState('networkidle');

        // Open mobile menu
        await page.click('[aria-label="Toggle navigation menu"]');
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot('mobile-navigation-menu.png');
    });

    test('tablet responsive design', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/projects');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('tablet-projects.png');
    });

    test('dark mode compatibility (if implemented)', async ({ page }) => {
        // This test assumes dark mode is implemented
        // For now, we'll test the black and white theme consistency
        await page.goto('/dashboard/student');
        await page.waitForLoadState('networkidle');

        // Check that the design maintains consistency
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('theme-consistency.png');
    });

    test('error states visual appearance', async ({ page }) => {
        // Mock API error
        await page.route('**/api/projects/search**', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal server error' })
            });
        });

        await page.goto('/projects');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('error-state.png');
    });

    test('loading states visual appearance', async ({ page }) => {
        // Mock slow API response
        await page.route('**/api/projects/search**', async route => {
            await new Promise(resolve => setTimeout(resolve, 2000));
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ projects: [], total: 0 })
            });
        });

        await page.goto('/projects');

        // Capture loading state
        await page.waitForTimeout(500);
        await expect(page).toHaveScreenshot('loading-state.png');
    });

    test('empty states visual appearance', async ({ page }) => {
        // Mock empty response
        await page.route('**/api/projects/search**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ projects: [], total: 0 })
            });
        });

        await page.goto('/projects');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('empty-state.png');
    });

    test('form validation visual states', async ({ page }) => {
        await page.goto('/login');

        // Trigger validation errors
        await page.fill('input[type="email"]', 'invalid-email');
        await page.fill('input[type="password"]', '123');
        await page.click('button[type="submit"]');

        await page.waitForTimeout(300);
        await expect(page).toHaveScreenshot('form-validation-errors.png');
    });

    test('modal and overlay visual appearance', async ({ page }) => {
        await page.goto('/projects');

        // Open global search modal
        await page.keyboard.press('Meta+k');
        await page.waitForTimeout(300);

        await expect(page).toHaveScreenshot('search-modal.png');
    });

    test('button states and interactions', async ({ page }) => {
        await page.goto('/login');

        // Test different button states
        const submitButton = page.locator('button[type="submit"]');

        // Normal state
        await expect(submitButton).toHaveScreenshot('button-normal.png');

        // Hover state
        await submitButton.hover();
        await page.waitForTimeout(100);
        await expect(submitButton).toHaveScreenshot('button-hover.png');

        // Focus state
        await submitButton.focus();
        await page.waitForTimeout(100);
        await expect(submitButton).toHaveScreenshot('button-focus.png');
    });
});