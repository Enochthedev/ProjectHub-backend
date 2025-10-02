import { NextRequest, NextResponse } from 'next/server';

interface FeedbackData {
    type: 'bug' | 'feature' | 'improvement' | 'general';
    rating: number;
    message: string;
    email?: string;
    page: string;
    userAgent: string;
    timestamp: string;
}

export async function POST(request: NextRequest) {
    try {
        const feedback: FeedbackData = await request.json();

        // Validate required fields
        if (!feedback.type || !feedback.rating || !feedback.message || !feedback.page) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Validate rating range
        if (feedback.rating < 1 || feedback.rating > 5) {
            return NextResponse.json(
                { error: 'Rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        // Validate message length
        if (feedback.message.length > 1000) {
            return NextResponse.json(
                { error: 'Message too long' },
                { status: 400 }
            );
        }

        // Sanitize input
        const sanitizedFeedback = {
            ...feedback,
            message: feedback.message.trim(),
            email: feedback.email?.trim() || null,
        };

        // In a real application, you would:
        // 1. Save to database
        // 2. Send notification to team
        // 3. Integrate with feedback management system (e.g., Intercom, Zendesk)

        // For now, we'll log it and simulate saving
        console.log('Feedback received:', {
            id: generateFeedbackId(),
            ...sanitizedFeedback,
            ip: getClientIP(request),
        });

        // Simulate async processing
        await new Promise(resolve => setTimeout(resolve, 500));

        // Send notification to team (in production)
        if (feedback.type === 'bug' || feedback.rating <= 2) {
            await sendUrgentNotification(sanitizedFeedback);
        }

        return NextResponse.json(
            {
                success: true,
                message: 'Feedback submitted successfully',
                id: generateFeedbackId()
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Feedback submission error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

function generateFeedbackId(): string {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    return 'unknown';
}

async function sendUrgentNotification(feedback: FeedbackData): Promise<void> {
    try {
        // In production, integrate with:
        // - Slack webhook
        // - Email service
        // - PagerDuty for critical bugs
        // - Jira for automatic ticket creation

        const notification = {
            type: 'urgent_feedback',
            feedback,
            timestamp: new Date().toISOString(),
        };

        // Example: Send to Slack webhook
        if (process.env.SLACK_WEBHOOK_URL) {
            await fetch(process.env.SLACK_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: `🚨 Urgent Feedback Received`,
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `*Type:* ${feedback.type}\n*Rating:* ${feedback.rating}/5\n*Page:* ${feedback.page}\n*Message:* ${feedback.message}`,
                            },
                        },
                    ],
                }),
            });
        }

        console.log('Urgent notification sent:', notification);
    } catch (error) {
        console.error('Failed to send urgent notification:', error);
    }
}

// GET endpoint for feedback analytics (admin only)
export async function GET(request: NextRequest) {
    try {
        // In production, verify admin authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Mock feedback analytics data
        const analytics = {
            totalFeedback: 156,
            averageRating: 4.2,
            feedbackByType: {
                bug: 23,
                feature: 45,
                improvement: 67,
                general: 21,
            },
            ratingDistribution: {
                1: 5,
                2: 8,
                3: 23,
                4: 67,
                5: 53,
            },
            recentFeedback: [
                {
                    id: 'fb_1234567890_abc123',
                    type: 'feature',
                    rating: 5,
                    message: 'Love the new AI assistant feature!',
                    page: '/ai-assistant',
                    timestamp: '2024-01-15T10:30:00Z',
                },
                // More recent feedback...
            ],
        };

        return NextResponse.json(analytics);
    } catch (error) {
        console.error('Feedback analytics error:', error);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}