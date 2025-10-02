import { test, expect } from '@playwright/test';

test.describe('Full User Workflow Integration', () => {
    test.beforeEach(async ({ page }) => {
        // Start with a clean state
        await page.goto('/');
    });

    test('complete student workflow: register → login → discover projects → bookmark → AI assistant', async ({ page }) => {
        // Registration flow
        await page.click('text=Sign up');
        await page.fill('[data-testid="firstName"]', 'John');
        await page.fill('[data-testid="lastName"]', 'Doe');
        await page.fill('[data-testid="email"]', 'john.doe@test.com');
        await page.fill('[data-testid="password"]', 'SecurePass123!');
        await page.fill('[data-testid="confirmPassword"]', 'SecurePass123!');
        await page.selectOption('[data-testid="specialization"]', 'Computer Science');
        await page.fill('[data-testid="year"]', '2024');
        await page.click('[data-testid="register-button"]');

        // Verify email verification message
        await expect(page.locator('text=Please verify your email')).toBeVisible();

        // Simulate email verification (in real test, would need email service mock)
        await page.goto('/verify-email?token=mock-token');
        await expect(page.locator('text=Email verified successfully')).toBeVisible();

        // Login flow
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'john.doe@test.com');
        await page.fill('[data-testid="password"]', 'SecurePass123!');
        await page.click('[data-testid="login-button"]');

        // Verify redirect to student dashboard
        await expect(page).toHaveURL('/dashboard/student');
        await expect(page.locator('text=Welcome, John')).toBeVisible();

        // Project discovery flow
        await page.click('[data-testid="browse-projects"]');
        await expect(page).toHaveURL('/projects');

        // Search for projects
        await page.fill('[data-testid="search-input"]', 'machine learning');
        await page.waitForTimeout(500); // Debounce

        // Apply filters
        await page.click('[data-testid="filter-specialization"]');
        await page.click('text=Computer Science');
        await page.click('[data-testid="filter-difficulty"]');
        await page.click('text=Intermediate');

        // Bookmark a project
        const firstProject = page.locator('[data-testid="project-card"]').first();
        await firstProject.locator('[data-testid="bookmark-button"]').click();
        await expect(firstProject.locator('[data-testid="bookmark-button"][data-bookmarked="true"]')).toBeVisible();

        // View project details
        await firstProject.click();
        await expect(page.locator('[data-testid="project-detail"]')).toBeVisible();

        // AI Assistant interaction
        await page.keyboard.press('Meta+k'); // Cmd+K shortcut
        await expect(page.locator('[data-testid="ai-assistant-modal"]')).toBeVisible();

        await page.fill('[data-testid="ai-input"]', 'What skills do I need for this project?');
        await page.click('[data-testid="send-message"]');

        // Wait for AI response
        await expect(page.locator('[data-testid="ai-message"]')).toBeVisible({ timeout: 10000 });

        // Bookmark AI response
        await page.locator('[data-testid="bookmark-message"]').first().click();

        // Close AI assistant
        await page.keyboard.press('Escape');

        // Check bookmarks
        await page.click('[data-testid="bookmarks-nav"]');
        await expect(page).toHaveURL('/bookmarks');
        await expect(page.locator('[data-testid="bookmarked-project"]')).toBeVisible();
        await expect(page.locator('[data-testid="bookmarked-message"]')).toBeVisible();
    });

    test('supervisor workflow: login → manage projects → monitor students → generate reports', async ({ page }) => {
        // Login as supervisor
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'supervisor@test.com');
        await page.fill('[data-testid="password"]', 'SupervisorPass123!');
        await page.click('[data-testid="login-button"]');

        // Verify supervisor dashboard
        await expect(page).toHaveURL('/dashboard/supervisor');
        await expect(page.locator('text=Supervisor Dashboard')).toBeVisible();

        // Create new project
        await page.click('[data-testid="create-project"]');
        await page.fill('[data-testid="project-title"]', 'AI-Powered Web Application');
        await page.fill('[data-testid="project-abstract"]', 'Building a modern web app with AI integration');
        await page.selectOption('[data-testid="specialization"]', 'Computer Science');
        await page.selectOption('[data-testid="difficulty"]', 'Advanced');
        await page.fill('[data-testid="technology-stack"]', 'React, Node.js, Python');
        await page.click('[data-testid="submit-project"]');

        // Verify project creation
        await expect(page.locator('text=Project created successfully')).toBeVisible();

        // Monitor student progress
        await page.click('[data-testid="students-nav"]');
        await expect(page.locator('[data-testid="student-list"]')).toBeVisible();

        // View student details
        await page.locator('[data-testid="student-card"]').first().click();
        await expect(page.locator('[data-testid="student-progress"]')).toBeVisible();

        // Review AI interactions
        await page.click('[data-testid="ai-monitoring"]');
        await expect(page.locator('[data-testid="ai-interactions"]')).toBeVisible();

        // Escalate a conversation
        await page.locator('[data-testid="escalate-conversation"]').first().click();
        await page.fill('[data-testid="escalation-reason"]', 'Student needs additional guidance');
        await page.click('[data-testid="confirm-escalation"]');

        // Generate report
        await page.click('[data-testid="generate-report"]');
        await page.selectOption('[data-testid="report-type"]', 'student-progress');
        await page.selectOption('[data-testid="report-format"]', 'pdf');
        await page.click('[data-testid="download-report"]');

        // Verify download initiated
        await expect(page.locator('text=Report generation started')).toBeVisible();
    });

    test('admin workflow: manage users → approve projects → system analytics', async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'admin@test.com');
        await page.fill('[data-testid="password"]', 'AdminPass123!');
        await page.click('[data-testid="login-button"]');

        // Verify admin dashboard
        await expect(page).toHaveURL('/dashboard/admin');
        await expect(page.locator('text=Admin Dashboard')).toBeVisible();

        // User management
        await page.click('[data-testid="user-management"]');
        await expect(page.locator('[data-testid="user-list"]')).toBeVisible();

        // Create new user
        await page.click('[data-testid="create-user"]');
        await page.fill('[data-testid="user-email"]', 'newuser@test.com');
        await page.selectOption('[data-testid="user-role"]', 'student');
        await page.click('[data-testid="send-invitation"]');
        await expect(page.locator('text=Invitation sent')).toBeVisible();

        // Project approval
        await page.click('[data-testid="project-approval"]');
        await expect(page.locator('[data-testid="pending-projects"]')).toBeVisible();

        // Approve a project
        await page.locator('[data-testid="approve-project"]').first().click();
        await page.fill('[data-testid="approval-comment"]', 'Project meets all requirements');
        await page.click('[data-testid="confirm-approval"]');

        // System analytics
        await page.click('[data-testid="analytics"]');
        await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-growth-chart"]')).toBeVisible();
        await expect(page.locator('[data-testid="project-stats"]')).toBeVisible();

        // AI system management
        await page.click('[data-testid="ai-management"]');
        await expect(page.locator('[data-testid="ai-config"]')).toBeVisible();

        // Update AI configuration
        await page.fill('[data-testid="ai-model-config"]', 'gpt-4');
        await page.fill('[data-testid="ai-temperature"]', '0.7');
        await page.click('[data-testid="save-ai-config"]');
        await expect(page.locator('text=Configuration updated')).toBeVisible();
    });

    test('real-time features integration', async ({ page, context }) => {
        // Open two browser contexts to simulate real-time updates
        const page2 = await context.newPage();

        // Login as student in first page
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'student1@test.com');
        await page.fill('[data-testid="password"]', 'Student123!');
        await page.click('[data-testid="login-button"]');

        // Login as supervisor in second page
        await page2.goto('/login');
        await page2.fill('[data-testid="email"]', 'supervisor@test.com');
        await page2.fill('[data-testid="password"]', 'SupervisorPass123!');
        await page2.click('[data-testid="login-button"]');

        // Student updates milestone
        await page.goto('/milestones');
        await page.locator('[data-testid="milestone-card"]').first().click();
        await page.selectOption('[data-testid="milestone-status"]', 'completed');
        await page.click('[data-testid="update-milestone"]');

        // Verify supervisor receives real-time notification
        await expect(page2.locator('[data-testid="notification-toast"]')).toBeVisible({ timeout: 5000 });
        await expect(page2.locator('text=Milestone completed')).toBeVisible();

        // Test bookmark synchronization
        await page.goto('/projects');
        await page.locator('[data-testid="project-card"]').first().locator('[data-testid="bookmark-button"]').click();

        // Check bookmark appears in bookmarks page immediately
        await page.goto('/bookmarks');
        await expect(page.locator('[data-testid="bookmarked-project"]')).toBeVisible();

        await page2.close();
    });

    test('error handling and recovery', async ({ page }) => {
        // Test network error handling
        await page.route('**/api/**', route => route.abort());

        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Verify error message
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
        await expect(page.locator('text=Network error')).toBeVisible();

        // Test retry functionality
        await page.unroute('**/api/**');
        await page.click('[data-testid="retry-button"]');

        // Should proceed normally after network recovery
        await expect(page.locator('[data-testid="error-message"]')).not.toBeVisible();
    });

    test('accessibility compliance throughout workflow', async ({ page }) => {
        await page.goto('/');

        // Test keyboard navigation
        await page.keyboard.press('Tab');
        await expect(page.locator(':focus')).toBeVisible();

        // Test screen reader compatibility
        const loginLink = page.locator('a[href="/login"]');
        await expect(loginLink).toHaveAttribute('aria-label');

        // Test color contrast and focus indicators
        await page.goto('/login');
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');

        // Verify focus indicator is visible
        const focusStyles = await focusedElement.evaluate(el => {
            const styles = window.getComputedStyle(el);
            return {
                outline: styles.outline,
                boxShadow: styles.boxShadow,
            };
        });

        expect(focusStyles.outline !== 'none' || focusStyles.boxShadow !== 'none').toBeTruthy();
    });
});