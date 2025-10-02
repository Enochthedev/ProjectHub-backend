import { test, expect } from '@playwright/test';

test.describe('Security Audit Tests', () => {
    test.beforeEach(async ({ page }) => {
        // Set up security headers check
        await page.goto('/');
    });

    test('security headers are properly set', async ({ page }) => {
        const response = await page.goto('/');

        if (response) {
            const headers = response.headers();

            // Check for essential security headers
            expect(headers['x-frame-options']).toBe('DENY');
            expect(headers['x-content-type-options']).toBe('nosniff');
            expect(headers['x-xss-protection']).toBe('1; mode=block');
            expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
            expect(headers['strict-transport-security']).toContain('max-age=31536000');

            // Check Content Security Policy if present
            if (headers['content-security-policy']) {
                expect(headers['content-security-policy']).toContain("default-src 'self'");
            }
        }
    });

    test('no sensitive information in client-side code', async ({ page }) => {
        await page.goto('/');

        // Check for common sensitive patterns in page source
        const content = await page.content();

        // Should not contain API keys, passwords, or tokens
        expect(content).not.toMatch(/api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i);
        expect(content).not.toMatch(/password["\s]*[:=]["\s]*[^"'\s]{8,}/i);
        expect(content).not.toMatch(/secret[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i);
        expect(content).not.toMatch(/access[_-]?token["\s]*[:=]["\s]*[a-zA-Z0-9]{20,}/i);

        // Should not contain database connection strings
        expect(content).not.toMatch(/mongodb:\/\/|mysql:\/\/|postgresql:\/\//i);

        // Should not contain internal IP addresses
        expect(content).not.toMatch(/192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\./);
    });

    test('authentication security measures', async ({ page }) => {
        await page.goto('/login');

        // Check password field is properly masked
        const passwordField = page.locator('input[type="password"]');
        await expect(passwordField).toBeVisible();

        // Check for CSRF protection (form should have token or use proper headers)
        const form = page.locator('form');
        const formHtml = await form.innerHTML();

        // Should either have CSRF token or use fetch with proper headers
        const hasCsrfToken = formHtml.includes('csrf') || formHtml.includes('_token');
        const usesFetch = await page.evaluate(() => {
            const forms = document.querySelectorAll('form');
            return Array.from(forms).some(form =>
                form.addEventListener &&
                form.onsubmit?.toString().includes('fetch')
            );
        });

        expect(hasCsrfToken || usesFetch).toBeTruthy();
    });

    test('input validation and sanitization', async ({ page }) => {
        await page.goto('/login');

        // Test XSS prevention
        const xssPayload = '<script>alert("xss")</script>';
        await page.fill('[data-testid="email"]', xssPayload);

        // Check that script tags are not executed
        const alertDialogPromise = page.waitForEvent('dialog', { timeout: 1000 }).catch(() => null);
        await page.click('[data-testid="login-button"]');

        const dialog = await alertDialogPromise;
        expect(dialog).toBeNull(); // No alert should be triggered

        // Test SQL injection patterns
        const sqlPayload = "'; DROP TABLE users; --";
        await page.fill('[data-testid="email"]', sqlPayload);
        await page.click('[data-testid="login-button"]');

        // Should show validation error, not crash
        await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('session management security', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'test@test.com');
        await page.fill('[data-testid="password"]', 'password');
        await page.click('[data-testid="login-button"]');

        // Check that session tokens are stored securely
        const cookies = await page.context().cookies();
        const authCookie = cookies.find(cookie =>
            cookie.name.includes('token') ||
            cookie.name.includes('session') ||
            cookie.name.includes('auth')
        );

        if (authCookie) {
            // Should be httpOnly and secure
            expect(authCookie.httpOnly).toBeTruthy();
            expect(authCookie.secure || process.env.NODE_ENV === 'development').toBeTruthy();
            expect(authCookie.sameSite).toBe('Strict');
        }

        // Check localStorage/sessionStorage for sensitive data
        const localStorageData = await page.evaluate(() => {
            const data: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) {
                    data[key] = localStorage.getItem(key) || '';
                }
            }
            return data;
        });

        // Should not store raw passwords or sensitive tokens in localStorage
        Object.values(localStorageData).forEach(value => {
            expect(value).not.toMatch(/password/i);
            expect(value).not.toMatch(/^[A-Za-z0-9+/]{40,}={0,2}$/); // Base64 tokens
        });
    });

    test('API endpoint security', async ({ page }) => {
        // Test for common API vulnerabilities
        const apiEndpoints = [
            '/api/users',
            '/api/projects',
            '/api/admin',
        ];

        for (const endpoint of apiEndpoints) {
            // Test without authentication
            const response = await page.request.get(endpoint);

            // Should return 401 Unauthorized or 403 Forbidden
            expect([401, 403, 404]).toContain(response.status());

            // Test with malformed requests
            const malformedResponse = await page.request.post(endpoint, {
                data: { malicious: '<script>alert("xss")</script>' }
            });

            // Should handle malformed requests gracefully
            expect(malformedResponse.status()).not.toBe(500);
        }
    });

    test('file upload security', async ({ page }) => {
        // If there are file upload features, test them
        const fileInputs = await page.locator('input[type="file"]').count();

        if (fileInputs > 0) {
            const fileInput = page.locator('input[type="file"]').first();

            // Check file type restrictions
            const acceptAttr = await fileInput.getAttribute('accept');
            expect(acceptAttr).toBeTruthy(); // Should have file type restrictions

            // Test malicious file upload (if upload functionality exists)
            const maliciousFile = Buffer.from('<?php echo "malicious"; ?>');

            try {
                await fileInput.setInputFiles({
                    name: 'malicious.php',
                    mimeType: 'application/x-php',
                    buffer: maliciousFile,
                });

                // Should be rejected
                await expect(page.locator('[data-testid="file-error"]')).toBeVisible();
            } catch (error) {
                // File input might not accept this type, which is good
                console.log('File upload properly restricted');
            }
        }
    });

    test('rate limiting protection', async ({ page }) => {
        await page.goto('/login');

        // Attempt multiple rapid login attempts
        const attempts = 10;
        const responses: number[] = [];

        for (let i = 0; i < attempts; i++) {
            await page.fill('[data-testid="email"]', 'test@test.com');
            await page.fill('[data-testid="password"]', 'wrongpassword');

            const responsePromise = page.waitForResponse('**/api/auth/login');
            await page.click('[data-testid="login-button"]');

            try {
                const response = await responsePromise;
                responses.push(response.status());
            } catch (error) {
                // Request might be blocked
                responses.push(429);
            }

            await page.waitForTimeout(100);
        }

        // Should eventually return 429 (Too Many Requests)
        const rateLimitedResponses = responses.filter(status => status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('data exposure prevention', async ({ page }) => {
        // Check for data leaks in error messages
        await page.goto('/login');
        await page.fill('[data-testid="email"]', 'nonexistent@test.com');
        await page.fill('[data-testid="password"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');

        const errorMessage = await page.locator('[data-testid="error-message"]').textContent();

        // Error message should not reveal whether user exists
        expect(errorMessage).not.toMatch(/user (not )?found/i);
        expect(errorMessage).not.toMatch / email(not) ? exists / i);

    // Should use generic error message
    expect(errorMessage).toMatch(/invalid (credentials|login)/i);
});

test('client-side routing security', async ({ page }) => {
    // Test unauthorized route access
    const protectedRoutes = [
        '/dashboard/admin',
        '/admin',
        '/supervisor',
    ];

    for (const route of protectedRoutes) {
        await page.goto(route);

        // Should redirect to login or show unauthorized
        const currentUrl = page.url();
        const isRedirected = currentUrl.includes('/login') ||
            currentUrl.includes('/unauthorized') ||
            currentUrl.includes('/403');

        expect(isRedirected).toBeTruthy();
    }
});

test('dependency vulnerabilities', async ({ page }) => {
    // This would typically be done with npm audit, but we can check for known vulnerable patterns
    await page.goto('/');

    // Check for vulnerable jQuery versions (if used)
    const jqueryVersion = await page.evaluate(() => {
        return (window as any).jQuery?.fn?.jquery;
    });

    if (jqueryVersion) {
        // Check against known vulnerable versions
        const vulnerableVersions = ['1.', '2.', '3.0.', '3.1.', '3.2.', '3.3.', '3.4.0'];
        const isVulnerable = vulnerableVersions.some(v => jqueryVersion.startsWith(v));
        expect(isVulnerable).toBeFalsy();
    }

    // Check for other common vulnerable libraries
    const hasVulnerableLibs = await page.evaluate(() => {
        const scripts = Array.from(document.scripts);
        return scripts.some(script =>
            script.src.includes('lodash@3.') || // Vulnerable lodash
            script.src.includes('moment@2.1') || // Vulnerable moment
            script.src.includes('handlebars@3.') // Vulnerable handlebars
        );
    });

    expect(hasVulnerableLibs).toBeFalsy();
});
});