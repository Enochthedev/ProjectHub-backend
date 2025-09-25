import { EmailVerificationData } from '../interfaces/email.interface';

export const emailVerificationTemplate = (
  data: EmailVerificationData,
): { html: string; text: string } => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - FYP Platform</title>
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
                background-color: #007bff;
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
                background-color: #007bff;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }
            .button:hover {
                background-color: #0056b3;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                font-size: 14px;
                color: #6c757d;
            }
            .warning {
                background-color: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Welcome to FYP Platform!</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Thank you for registering with the Final Year Project Selection & Guidance Platform at the University of Ibadan.</p>
            <p>To complete your registration and start using the platform, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 3px;">
                ${data.verificationUrl}
            </p>
            
            <div class="warning">
                <strong>Important:</strong> This verification link will expire in 24 hours. If you don't verify your email within this time, you'll need to register again.
            </div>
            
            <p>Once verified, you'll be able to:</p>
            <ul>
                <li>Browse available final year projects</li>
                <li>Get AI-powered project recommendations</li>
                <li>Connect with supervisors</li>
                <li>Track your project progress</li>
            </ul>
            
            <p>If you didn't create an account with us, please ignore this email.</p>
            
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
Welcome to FYP Platform!

Hello ${data.name},

Thank you for registering with the Final Year Project Selection & Guidance Platform at the University of Ibadan.

To complete your registration and start using the platform, please verify your email address by visiting this link:

${data.verificationUrl}

Important: This verification link will expire in 24 hours. If you don't verify your email within this time, you'll need to register again.

Once verified, you'll be able to:
- Browse available final year projects
- Get AI-powered project recommendations
- Connect with supervisors
- Track your project progress

If you didn't create an account with us, please ignore this email.

Best regards,
The FYP Platform Team
University of Ibadan

This is an automated email. Please do not reply to this message.
  `;

  return { html, text };
};
