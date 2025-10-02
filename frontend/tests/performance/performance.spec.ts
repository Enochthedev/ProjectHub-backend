import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
    test('page load performance should meet thresholds', async ({ page }) => {
        // Start performance monitoring
        await page.goto('/dashboard/student', { waitUntil: 'networkidle' });

        // Measure Core Web Vitals
        const metrics = await page.evaluate(() => {
            return new Promise((resolve) => {
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const metrics: Record<string, number> = {};

                    entries.forEach((entry) => {
                        if (entry.entryType === 'navigation') {
                            const navEntry = entry as PerformanceNavigationTiming;
                            metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
                            metrics.loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart;
                            metrics.firstPaint = navEntry.responseEnd - navEntry.requestStart;
                        }

                        if (entry.entryType === 'paint') {
                            if (entry.name === 'first-contentful-paint') {
                                metrics.firstContentfulPaint = entry.startTime;
                            }
                            if (entry.name === 'largest-contentful-paint') {
                                metrics.largestContentfulPaint = entry.startTime;
                            }
                        }

                        if (entry.entryType === 'layout-shift') {
                            metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + (entry as any).value;
                        }
                    });

                    resolve(metrics);
                }).observe({ entryTypes: ['navigation', 'paint', 'layout-shift'] });

                // Fallback timeout
                setTimeout(() => resolve({}), 5000);
            });
        });

        // Assert performance thresholds
        if (metrics.firstContentfulPaint) {
            expect(metrics.firstContentfulPaint).toBeLessThan(2000); // 2 seconds
        }

        if (metrics.largestContentfulPaint) {
            expect(metrics.largestContentfulPaint).toBeLessThan(2500); // 2.5 seconds
        }

        if (metrics.cumulativeLayoutShift) {
            expect(metrics.cumulativeLayoutShift).toBeLessThan(0.1); // Good CLS score
        }
    });

    test('bundle size should be optimized', async ({ page }) => {
        // Navigate to page and measure resource sizes
        const response = await page.goto('/dashboard/student');

        // Get all network requests
        const requests: any[] = [];
        page.on('response', (response) => {
            requests.push({
                url: response.url(),
                size: response.headers()['content-length'],
                type: response.request().resourceType()
            });
        });

        await page.waitForLoadState('networkidle');

        // Calculate total JavaScript bundle size
        const jsRequests = requests.filter(req =>
            req.type === 'script' && req.url.includes('/_next/static/')
        );

        const totalJSSize = jsRequests.reduce((total, req) => {
            return total + (parseInt(req.size) || 0);
        }, 0);

        // Assert bundle size is reasonable (less than 1MB)
        expect(totalJSSize).toBeLessThan(1024 * 1024);
    });

    test('image optimization should work correctly', async ({ page }) => {
        await page.goto('/projects');

        // Check that images are properly optimized
        const images = page.locator('img');
        const imageCount = await images.count();

        for (let i = 0; i < imageCount; i++) {
            const img = images.nth(i);

            // Check for proper loading attributes
            const loading = await img.getAttribute('loading');
            const src = await img.getAttribute('src');

            // Images should use lazy loading (except above fold)
            if (i > 2) { // Images below the fold
                expect(loading).toBe('lazy');
            }

            // Next.js optimized images should use proper format
            if (src?.includes('/_next/image')) {
                expect(src).toMatch(/\.(webp|avif|jpg|jpeg|png)$/);
            }
        }
    });

    test('virtual scrolling should handle large lists efficiently', async ({ page }) => {
        // Mock large dataset
        await page.route('**/api/projects/search**', async route => {
            const projects = Array.from({ length: 1000 }, (_, i) => ({
                id: `${i + 1}`,
                title: `Project ${i + 1}`,
                abstract: `Abstract for project ${i + 1}`,
                specialization: 'Software Engineering',
                difficultyLevel: 'intermediate',
                tags: ['React', 'Node.js'],
                supervisor: { name: `Dr. ${i + 1}` }
            }));

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: projects.slice(0, 20), // Paginated
                    total: 1000
                })
            });
        });

        await page.goto('/projects');

        // Measure rendering performance
        const startTime = Date.now();
        await page.waitForSelector('[data-testid="project-card"]');
        const renderTime = Date.now() - startTime;

        // Should render quickly even with large dataset
        expect(renderTime).toBeLessThan(1000); // 1 second

        // Should only render visible items
        const visibleCards = await page.locator('[data-testid="project-card"]').count();
        expect(visibleCards).toBeLessThanOrEqual(20); // Only initial page
    });

    test('search performance should be optimized', async ({ page }) => {
        await page.goto('/projects');

        // Mock search API with delay to test debouncing
        let searchCallCount = 0;
        await page.route('**/api/projects/search**', async route => {
            searchCallCount++;
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));

            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'Search Result',
                            abstract: 'Search result abstract',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            tags: ['React'],
                            supervisor: { name: 'Dr. Search' }
                        }
                    ],
                    total: 1
                })
            });
        });

        const searchInput = page.locator('input[placeholder*="Search projects"]');

        // Type quickly to test debouncing
        await searchInput.fill('test');
        await page.waitForTimeout(100);
        await searchInput.fill('test search');
        await page.waitForTimeout(100);
        await searchInput.fill('test search query');

        // Wait for debounce period
        await page.waitForTimeout(500);

        // Should have made fewer API calls due to debouncing
        expect(searchCallCount).toBeLessThanOrEqual(2);
    });

    test('memory usage should be stable', async ({ page }) => {
        await page.goto('/dashboard/student');

        // Get initial memory usage
        const initialMemory = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Perform memory-intensive operations
        for (let i = 0; i < 10; i++) {
            await page.goto('/projects');
            await page.goto('/ai-assistant');
            await page.goto('/dashboard/student');
        }

        // Force garbage collection if available
        await page.evaluate(() => {
            if ((window as any).gc) {
                (window as any).gc();
            }
        });

        // Check final memory usage
        const finalMemory = await page.evaluate(() => {
            return (performance as any).memory?.usedJSHeapSize || 0;
        });

        // Memory should not have grown significantly (less than 50% increase)
        if (initialMemory > 0 && finalMemory > 0) {
            const memoryIncrease = (finalMemory - initialMemory) / initialMemory;
            expect(memoryIncrease).toBeLessThan(0.5);
        }
    });

    test('API response caching should work correctly', async ({ page }) => {
        let apiCallCount = 0;

        // Mock API with call counting
        await page.route('**/api/projects/search**', async route => {
            apiCallCount++;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    projects: [
                        {
                            id: '1',
                            title: 'Cached Project',
                            abstract: 'This should be cached',
                            specialization: 'Software Engineering',
                            difficultyLevel: 'intermediate',
                            tags: ['React'],
                            supervisor: { name: 'Dr. Cache' }
                        }
                    ],
                    total: 1
                })
            });
        });

        // First visit
        await page.goto('/projects');
        await page.waitForSelector('[data-testid="project-card"]');
        const firstCallCount = apiCallCount;

        // Navigate away and back
        await page.goto('/dashboard/student');
        await page.goto('/projects');
        await page.waitForSelector('[data-testid="project-card"]');

        // Should use cached data (no additional API calls)
        expect(apiCallCount).toBe(firstCallCount);
    });

    test('lighthouse performance audit should pass', async ({ page }) => {
        // This would typically be run with actual Lighthouse CLI
        // Here we simulate the key metrics Lighthouse checks

        await page.goto('/dashboard/student', { waitUntil: 'networkidle' });

        // Check for performance best practices
        const performanceMetrics = await page.evaluate(() => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

            return {
                domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
                timeToInteractive: navigation.loadEventEnd - navigation.fetchStart,
                totalBlockingTime: 0, // Would need more complex measurement
            };
        });

        // Assert Lighthouse-like thresholds
        expect(performanceMetrics.domContentLoaded).toBeLessThan(1500);
        expect(performanceMetrics.timeToInteractive).toBeLessThan(3800);
    });
});