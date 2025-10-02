import { test, expect } from '@playwright/test';

test.describe('Project Discovery', () => {
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

        // Mock projects API
        await page.route('**/api/projects/search**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'AI-Powered Chat Application',
                            abstract: 'A modern chat application using AI for smart responses',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            tags: ['AI', 'React', 'Node.js'],
                            supervisor: { name: 'Dr. Smith' },
                            bookmarkCount: 15,
                            viewCount: 120
                        },
                        {
                            id: '2',
                            title: 'IoT Smart Home System',
                            abstract: 'Complete home automation system with IoT devices',
                            specialization: 'Computer Engineering',
                            difficultyLevel: 'advanced',
                            tags: ['IoT', 'Arduino', 'Python'],
                            supervisor: { name: 'Prof. Johnson' },
                            bookmarkCount: 8,
                            viewCount: 85
                        }
                    ],
                    total: 2,
                    page: 1,
                    limit: 10
                })
            });
        });

        await page.goto('/projects');
    });

    test('should display project search interface', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Discover Projects');
        await expect(page.locator('input[placeholder*="Search projects"]')).toBeVisible();
        await expect(page.locator('text=Filters')).toBeVisible();
    });

    test('should display project cards', async ({ page }) => {
        await expect(page.locator('[data-testid="project-card"]')).toHaveCount(2);
        await expect(page.locator('text=AI-Powered Chat Application')).toBeVisible();
        await expect(page.locator('text=IoT Smart Home System')).toBeVisible();
    });

    test('should handle search functionality', async ({ page }) => {
        // Mock search results
        await page.route('**/api/projects/search?q=AI**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'AI-Powered Chat Application',
                            abstract: 'A modern chat application using AI for smart responses',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            tags: ['AI', 'React', 'Node.js'],
                            supervisor: { name: 'Dr. Smith' },
                            bookmarkCount: 15,
                            viewCount: 120
                        }
                    ],
                    total: 1,
                    page: 1,
                    limit: 10
                })
            });
        });

        await page.fill('input[placeholder*="Search projects"]', 'AI');
        await page.press('input[placeholder*="Search projects"]', 'Enter');

        await expect(page.locator('[data-testid="project-card"]')).toHaveCount(1);
        await expect(page.locator('text=AI-Powered Chat Application')).toBeVisible();
    });

    test('should handle global search with Cmd+K', async ({ page }) => {
        await page.keyboard.press('Meta+k');
        await expect(page.locator('[data-testid="global-search-modal"]')).toBeVisible();

        await page.fill('[data-testid="global-search-input"]', 'machine learning');
        await expect(page.locator('text=Search suggestions')).toBeVisible();
    });

    test('should handle project filtering', async ({ page }) => {
        // Open filters
        await page.click('text=Filters');

        // Apply specialization filter
        await page.selectOption('select[name="specialization"]', 'Software Engineering');
        await page.click('button:has-text("Apply Filters")');

        // Should update URL with filter parameters
        await expect(page.url()).toContain('specialization=Software%20Engineering');
    });

    test('should handle project bookmarking', async ({ page }) => {
        // Mock bookmark API
        await page.route('**/api/bookmarks', async route => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Project bookmarked successfully' })
            });
        });

        await page.click('[data-testid="bookmark-button"]:first-child');
        await expect(page.locator('text=Project bookmarked')).toBeVisible();
    });

    test('should navigate to project details', async ({ page }) => {
        // Mock project details API
        await page.route('**/api/projects/1', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: '1',
                    title: 'AI-Powered Chat Application',
                    abstract: 'A modern chat application using AI for smart responses',
                    description: 'Detailed project description...',
                    specialization: 'Software Engineering',
                    difficultyLevel: 'intermediate',
                    tags: ['AI', 'React', 'Node.js'],
                    supervisor: { name: 'Dr. Smith', email: 'smith@university.edu' },
                    requirements: ['React experience', 'Basic AI knowledge'],
                    deliverables: ['Working application', 'Documentation', 'Presentation']
                })
            });
        });

        await page.click('[data-testid="project-card"]:first-child');
        await expect(page.url()).toContain('/projects/1');
        await expect(page.locator('h1')).toContainText('AI-Powered Chat Application');
    });

    test('should handle responsive design on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        // Mobile menu should be visible
        await expect(page.locator('[aria-label="Toggle navigation menu"]')).toBeVisible();

        // Project cards should stack vertically
        const projectCards = page.locator('[data-testid="project-card"]');
        const firstCard = projectCards.first();
        const secondCard = projectCards.nth(1);

        const firstCardBox = await firstCard.boundingBox();
        const secondCardBox = await secondCard.boundingBox();

        // Second card should be below first card (not side by side)
        expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y! + firstCardBox?.height!);
    });
});