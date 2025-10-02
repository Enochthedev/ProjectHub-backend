import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display login form on initial visit', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Welcome to ProjectHub');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for invalid credentials', async ({ page }) => {
        await page.fill('input[type="email"]', 'invalid-email');
        await page.fill('input[type="password"]', '123');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
        await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should navigate to registration form', async ({ page }) => {
        await page.click('text=Create an account');
        await expect(page.url()).toContain('/register');
        await expect(page.locator('h1')).toContainText('Create Account');
    });

    test('should handle login with valid credentials', async ({ page }) => {
        // Mock successful login response
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    user: {
                        id: '1',
                        email: 'test@example.com',
                        role: 'student',
                        isEmailVerified: true,
                        profile: {
                            firstName: 'John',
                            lastName: 'Doe',
                            studentId: 'S123456'
                        }
                    },
                    token: 'mock-jwt-token',
                    refreshToken: 'mock-refresh-token'
                })
            });
        });

        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');

        // Should redirect to dashboard
        await expect(page.url()).toContain('/dashboard/student');
        await expect(page.locator('text=Welcome, John')).toBeVisible();
    });

    test('should handle registration flow', async ({ page }) => {
        await page.goto('/register');

        // Mock successful registration response
        await page.route('**/api/auth/register', async route => {
            await route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: 'Registration successful. Please check your email for verification.',
                    user: {
                        id: '1',
                        email: 'newuser@example.com',
                        isEmailVerified: false
                    }
                })
            });
        });

        await page.fill('input[name="firstName"]', 'Jane');
        await page.fill('input[name="lastName"]', 'Smith');
        await page.fill('input[name="email"]', 'newuser@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.fill('input[name="confirmPassword"]', 'password123');
        await page.selectOption('select[name="role"]', 'student');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Please check your email for verification')).toBeVisible();
    });

    test('should handle logout', async ({ page }) => {
        // First login
        await page.goto('/dashboard/student');

        // Mock logout response
        await page.route('**/api/auth/logout', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Logged out successfully' })
            });
        });

        await page.click('[aria-label="User menu"]');
        await page.click('text=Logout');

        // Should redirect to login
        await expect(page.url()).toContain('/login');
    });
});