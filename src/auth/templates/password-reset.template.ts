import { PasswordResetData } from '../interfaces/email.interface';

export const passwordResetTemplate = (
  data: PasswordResetData,
): { html: string; text: string } => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - FYP Platform</title>
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
                background-color: #dc3545;
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
                background-color: #dc3545;
                color: white;
                padding: 12px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }
            .button:hover {
                background-color: #c82333;
            }
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #dee2e6;
                font-size: 14px;
                color: #6c757d;
            }
            .warning {
                background-color: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .security-notice {
                background-color: #d1ecf1;
                border: 1px solid #bee5eb;
                color: #0c5460;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>We received a request to reset the password for your FYP Platform account (${data.email}).</p>
            <p>If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
                <a href="${data.resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 3px;">
                ${data.resetUrl}
            </p>
            
            <div class="warning">
                <strong>Important:</strong> This password reset link will expire in ${data.expiresIn}. After that, you'll need to request a new password reset.
            </div>
            
            <div class="security-notice">
                <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Consider reviewing your account security if you receive multiple unexpected password reset emails.
            </div>
            
            <p><strong>For your security:</strong></p>
            <ul>
                <li>Never share your password with anyone</li>
                <li>Use a strong, unique password</li>
                <li>Log out from shared computers</li>
                <li>Contact support if you notice any suspicious activity</li>
            </ul>
            
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
Password Reset Request

Hello ${data.name},

We received a request to reset the password for your FYP Platform account (${data.email}).

If you made this request, visit this link to reset your password:

${data.resetUrl}

Important: This password reset link will expire in ${data.expiresIn}. After that, you'll need to request a new password reset.

Security Notice: If you didn't request a password reset, please ignore this email. Your password will remain unchanged. Consider reviewing your account security if you receive multiple unexpected password reset emails.

For your security:
- Never share your password with anyone
- Use a strong, unique password
- Log out from shared computers
- Contact support if you notice any suspicious activity

Best regards,
The FYP Platform Team
University of Ibadan

This is an automated email. Please do not reply to this message.
  `;

  return { html, text };
};
