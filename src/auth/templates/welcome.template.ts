import { WelcomeEmailData } from '../interfaces/email.interface';

export const welcomeTemplate = (
  data: WelcomeEmailData,
): { html: string; text: string } => {
  const roleSpecificContent = {
    student: {
      title: 'Welcome, Student!',
      features: [
        'Browse and search available final year projects',
        'Get AI-powered project recommendations based on your interests',
        'Connect with supervisors and view their specializations',
        'Track your project application status',
        'Access project resources and guidelines',
      ],
    },
    supervisor: {
      title: 'Welcome, Supervisor!',
      features: [
        'Create and manage your project listings',
        'Review and manage student applications',
        'Set your availability and student capacity',
        'Access supervision tools and resources',
        'Monitor student progress and milestones',
      ],
    },
    admin: {
      title: 'Welcome, Administrator!',
      features: [
        'Manage user accounts and permissions',
        'Monitor platform usage and analytics',
        'Configure system settings and parameters',
        'Access administrative reports',
        'Manage project categories and specializations',
      ],
    },
  };

  const content =
    roleSpecificContent[data.role as keyof typeof roleSpecificContent] ||
    roleSpecificContent.student;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to FYP Platform</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background-color: #28a745;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 8px 8px 0 0;
            }
            .content {
                background-color: #f8f9fa;
                padding: 30px;
                border-radius: 0 0 8px 8px;
            }
            .button {
                display: inline-block;
                background-color: #28a745;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }
            .button:hover {
                background-color: #218838;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                font-size: 14px;
                color: #6c757d;
            }
            .features {
                background-color: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 20px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .tips {
                background-color: #e2e3e5;
                border: 1px solid #d6d8db;
                color: #383d41;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${content.title}</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Congratulations! Your email has been successfully verified and your account is now active on the Final Year Project Selection & Guidance Platform.</p>
            
            <div class="features">
                <h3>What you can do now:</h3>
                <ul>
                    ${content.features.map((feature) => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            
            <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Start Using the Platform</a>
            </div>
            
            <div class="tips">
                <h3>Getting Started Tips:</h3>
                <ul>
                    <li><strong>Complete your profile:</strong> Add your skills, interests, and preferences for better recommendations</li>
                    <li><strong>Explore projects:</strong> Browse available projects and use filters to find what interests you</li>
                    <li><strong>Stay updated:</strong> Check your notifications regularly for important updates</li>
                    <li><strong>Need help?:</strong> Visit our help section or contact support if you have questions</li>
                </ul>
            </div>
            
            <p>We're excited to have you on board and look forward to helping you succeed in your final year project journey!</p>
            
            <div class="footer">
                <p>Best regards,<br>
                The FYP Platform Team<br>
                University of Ibadan</p>
                
                <p><small>This is an automated email. Please do not reply to this message.</small></p>
            </div>
        </div>
    </body>
    </html>
  `;

  const text = `
${content.title}

Hello ${data.name},

Congratulations! Your email has been successfully verified and your account is now active on the Final Year Project Selection & Guidance Platform.

What you can do now:
${content.features.map((feature) => `- ${feature}`).join('\n')}

Visit the platform: ${process.env.FRONTEND_URL || 'http://localhost:3000'}

Getting Started Tips:
- Complete your profile: Add your skills, interests, and preferences for better recommendations
- Explore projects: Browse available projects and use filters to find what interests you
- Stay updated: Check your notifications regularly for important updates
- Need help?: Visit our help section or contact support if you have questions

We're excited to have you on board and look forward to helping you succeed in your final year project journey!

Best regards,
The FYP Platform Team
University of Ibadan

This is an automated email. Please do not reply to this message.
  `;

  return { html, text };
};
