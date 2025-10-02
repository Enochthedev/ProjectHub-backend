import { test, expect } from '@playwright/test';

test.describe('AI Assistant', () => {
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

        await page.goto('/ai-assistant');
    });

    test('should display AI assistant interface', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('AI Assistant');
        await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
        await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
        await expect(page.locator('button:has-text("Send")')).toBeVisible();
    });

    test('should handle sending messages', async ({ page }) => {
        // Mock AI response
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: '2',
                        content: 'Hello! I\'m here to help you with your project questions. What would you like to know?',
                        type: 'assistant',
                        timestamp: new Date().toISOString(),
                        confidenceScore: 0.95,
                        sources: []
                    }
                })
            });
        });

        await page.fill('[data-testid="message-input"]', 'Hello, I need help with my project');
        await page.click('button:has-text("Send")');

        // Should show user message
        await expect(page.locator('text=Hello, I need help with my project')).toBeVisible();

        // Should show typing indicator
        await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();

        // Should show AI response
        await expect(page.locator('text=Hello! I\'m here to help you')).toBeVisible();
    });

    test('should handle keyboard shortcuts', async ({ page }) => {
        // Test Enter to send
        await page.fill('[data-testid="message-input"]', 'Test message');
        await page.press('[data-testid="message-input"]', 'Enter');

        await expect(page.locator('text=Test message')).toBeVisible();

        // Test Shift+Enter for new line
        await page.fill('[data-testid="message-input"]', 'Line 1');
        await page.press('[data-testid="message-input"]', 'Shift+Enter');
        await page.type('[data-testid="message-input"]', 'Line 2');

        const inputValue = await page.inputValue('[data-testid="message-input"]');
        expect(inputValue).toContain('\n');
    });

    test('should display confidence scores', async ({ page }) => {
        // Mock AI response with confidence score
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: '2',
                        content: 'Based on your interests, I recommend exploring machine learning projects.',
                        type: 'assistant',
                        timestamp: new Date().toISOString(),
                        confidenceScore: 0.87,
                        sources: [
                            { title: 'ML Project Guide', url: 'https://example.com/ml-guide' }
                        ]
                    }
                })
            });
        });

        await page.fill('[data-testid="message-input"]', 'What projects should I consider?');
        await page.click('button:has-text("Send")');

        // Should show confidence score
        await expect(page.locator('text=87% confident')).toBeVisible();

        // Should show sources
        await expect(page.locator('text=Sources:')).toBeVisible();
        await expect(page.locator('a:has-text("ML Project Guide")')).toBeVisible();
    });

    test('should handle message bookmarking', async ({ page }) => {
        // First send a message to get a response
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: '2',
                        content: 'This is a helpful response about project management.',
                        type: 'assistant',
                        timestamp: new Date().toISOString(),
                        confidenceScore: 0.92
                    }
                })
            });
        });

        // Mock bookmark API
        await page.route('**/api/ai-assistant/messages/2/bookmark', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Message bookmarked successfully' })
            });
        });

        await page.fill('[data-testid="message-input"]', 'How do I manage my project timeline?');
        await page.click('button:has-text("Send")');

        // Bookmark the AI response
        await page.click('[data-testid="bookmark-message-2"]');
        await expect(page.locator('text=Message bookmarked')).toBeVisible();
    });

    test('should handle message rating', async ({ page }) => {
        // First send a message to get a response
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: '2',
                        content: 'Here are some project ideas for you to consider.',
                        type: 'assistant',
                        timestamp: new Date().toISOString(),
                        confidenceScore: 0.88
                    }
                })
            });
        });

        // Mock rating API
        await page.route('**/api/ai-assistant/messages/2/rate', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Rating submitted successfully' })
            });
        });

        await page.fill('[data-testid="message-input"]', 'Give me project ideas');
        await page.click('button:has-text("Send")');

        // Rate the response
        await page.click('[data-testid="rate-message-2"] button:has-text("👍")');
        await expect(page.locator('text=Thank you for your feedback')).toBeVisible();
    });

    test('should display suggested follow-up questions', async ({ page }) => {
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    message: {
                        id: '2',
                        content: 'Machine learning projects are great for developing AI skills.',
                        type: 'assistant',
                        timestamp: new Date().toISOString(),
                        confidenceScore: 0.91,
                        suggestedFollowUps: [
                            'What programming languages should I learn?',
                            'How long does a typical ML project take?',
                            'What datasets should I use?'
                        ]
                    }
                })
            });
        });

        await page.fill('[data-testid="message-input"]', 'Tell me about ML projects');
        await page.click('button:has-text("Send")');

        // Should show suggested questions
        await expect(page.locator('text=Suggested questions:')).toBeVisible();
        await expect(page.locator('text=What programming languages should I learn?')).toBeVisible();
        await expect(page.locator('text=How long does a typical ML project take?')).toBeVisible();
    });

    test('should handle conversation history', async ({ page }) => {
        // Mock conversation history API
        await page.route('**/api/ai-assistant/conversations', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    conversations: [
                        {
                            id: '1',
                            title: 'Project Planning Discussion',
                            lastMessageAt: new Date().toISOString(),
                            messageCount: 5
                        },
                        {
                            id: '2',
                            title: 'Technology Stack Questions',
                            lastMessageAt: new Date(Date.now() - 86400000).toISOString(),
                            messageCount: 3
                        }
                    ]
                })
            });
        });

        await page.click('[data-testid="conversation-history"]');

        await expect(page.locator('text=Project Planning Discussion')).toBeVisible();
        await expect(page.locator('text=Technology Stack Questions')).toBeVisible();
    });

    test('should handle error states gracefully', async ({ page }) => {
        // Mock API error
        await page.route('**/api/ai-assistant/chat', async route => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'AI service temporarily unavailable' })
            });
        });

        await page.fill('[data-testid="message-input"]', 'This will cause an error');
        await page.click('button:has-text("Send")');

        await expect(page.locator('text=Sorry, I\'m having trouble right now')).toBeVisible();
        await expect(page.locator('button:has-text("Try Again")')).toBeVisible();
    });
});