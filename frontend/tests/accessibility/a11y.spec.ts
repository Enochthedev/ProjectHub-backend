import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication for protected pages
        await page.addInitScript(() => {
            localStorage.setItem('auth-token', 'mock-token');
            localStorage.setItem('user', JSON.stringify({
                id: '1',
                email: 'test@example.com',
                role: 'student',
                profile: { firstName: 'John', lastName: 'Doe' }
            }));
        });
    });

    test('login page should be accessible', async ({ page }) => {
        await page.goto('/login');
        await injectAxe(page);

        const violations = await getViolations(page);
        expect(violations).toHaveLength(0);
    });

    test('registration page should be accessible', async ({ page }) => {
        await page.goto('/register');
        await injectAxe(page);

        await checkA11y(page, null, {
            detailedReport: true,
            detailedReportOptions: { html: true },
        });
    });

    test('dashboard should be accessible', async ({ page }) => {
        await page.goto('/dashboard/student');
        await injectAxe(page);

        // Check for common accessibility issues
        await checkA11y(page, null, {
            rules: {
                'color-contrast': { enabled: true },
                'keyboard-navigation': { enabled: true },
                'focus-management': { enabled: true },
                'aria-labels': { enabled: true },
            }
        });
    });

    test('project discovery page should be accessible', async ({ page }) => {
        // Mock projects API
        await page.route('**/api/projects/search**', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'Test Project',
                            abstract: 'Test abstract',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            tags: ['React', 'Node.js'],
                            supervisor: { name: 'Dr. Test' }
                        }
                    ],
                    total: 1
                })
            });
        });

        await page.goto('/projects');
        await injectAxe(page);

        await checkA11y(page);
    });

    test('AI assistant should be accessible', async ({ page }) => {
        await page.goto('/ai-assistant');
        await injectAxe(page);

        // Check specific accessibility requirements for chat interface
        await checkA11y(page, null, {
            rules: {
                'aria-live-regions': { enabled: true },
                'keyboard-navigation': { enabled: true },
                'focus-visible': { enabled: true },
            }
        });
    });

    test('keyboard navigation should work throughout the app', async ({ page }) => {
        await page.goto('/dashboard/student');

        // Test tab navigation
        await page.keyboard.press('Tab');
        let focusedElement = await page.locator(':focus').first();
        await expect(focusedElement).toBeVisible();

        // Continue tabbing through interactive elements
        for (let i = 0; i < 10; i++) {
            await page.keyboard.press('Tab');
            focusedElement = await page.locator(':focus').first();
            await expect(focusedElement).toBeVisible();
        }
    });

    test('screen reader announcements should work', async ({ page }) => {
        await page.goto('/projects');

        // Check for proper ARIA live regions
        await expect(page.locator('[aria-live="polite"]')).toBeAttached();
        await expect(page.locator('[aria-live="assertive"]')).toBeAttached();

        // Check for proper heading structure
        const headings = page.locator('h1, h2, h3, h4, h5, h6');
        const headingCount = await headings.count();
        expect(headingCount).toBeGreaterThan(0);

        // Ensure h1 exists and is unique
        const h1Elements = page.locator('h1');
        const h1Count = await h1Elements.count();
        expect(h1Count).toBe(1);
    });

    test('form accessibility should be compliant', async ({ page }) => {
        await page.goto('/login');

        // Check form labels
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');

        await expect(emailInput).toHaveAttribute('aria-label');
        await expect(passwordInput).toHaveAttribute('aria-label');

        // Check error message association
        await page.fill('input[type="email"]', 'invalid-email');
        await page.click('button[type="submit"]');

        const errorMessage = page.locator('[role="alert"]');
        await expect(errorMessage).toBeVisible();

        // Check that error is properly associated with input
        const emailInputId = await emailInput.getAttribute('id');
        const errorId = await errorMessage.getAttribute('id');
        await expect(emailInput).toHaveAttribute('aria-describedby', errorId);
    });

    test('color contrast should meet WCAG standards', async ({ page }) => {
        await page.goto('/dashboard/student');
        await injectAxe(page);

        await checkA11y(page, null, {
            rules: {
                'color-contrast': { enabled: true },
            },
            tags: ['wcag2a', 'wcag2aa']
        });
    });

    test('focus management in modals should work correctly', async ({ page }) => {
        await page.goto('/projects');

        // Open search modal with Cmd+K
        await page.keyboard.press('Meta+k');

        // Focus should be trapped in modal
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();

        // First focusable element should be focused
        const firstFocusable = modal.locator('input, button, [tabindex="0"]').first();
        await expect(firstFocusable).toBeFocused();

        // Escape should close modal and restore focus
        await page.keyboard.press('Escape');
        await expect(modal).not.toBeVisible();
    });

    test('mobile accessibility should be maintained', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/dashboard/student');
        await injectAxe(page);

        // Check mobile-specific accessibility
        await checkA11y(page, null, {
            rules: {
                'touch-target-size': { enabled: true },
                'mobile-navigation': { enabled: true },
            }
        });

        // Check that mobile menu is accessible
        const mobileMenuButton = page.locator('[aria-label="Toggle navigation menu"]');
        await expect(mobileMenuButton).toBeVisible();
        await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');

        await mobileMenuButton.click();
        await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
    });

    test('dynamic content updates should be announced', async ({ page }) => {
        await page.goto('/ai-assistant');

        // Mock AI response
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: '2',
                        content: 'This is an AI response',
                        type: 'assistant',
                        timestamp: new Date().toISOString()
                    }
                })
            });
        });

        // Send message and check for live region updates
        await page.fill('[data-testid="message-input"]', 'Test message');
        await page.click('button:has-text("Send")');

        // Check that new messages are announced
        const liveRegion = page.locator('[aria-live="polite"]');
        await expect(liveRegion).toContainText('AI response received');
    });
});