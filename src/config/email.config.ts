import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  service: process.env.EMAIL_SERVICE || '', // e.g., 'gmail', 'outlook'
  user: process.env.EMAIL_USER || '',
  password: process.env.EMAIL_PASSWORD || '',

  // Security settings
  tlsRejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false',

  // Connection settings
  connectionTimeout: parseInt(process.env.EMAIL_CONNECTION_TIMEOUT || '60000', 10),
  socketTimeout: parseInt(process.env.EMAIL_SOCKET_TIMEOUT || '60000', 10),

  // Pool settings
  pool: process.env.EMAIL_POOL !== 'false',
  maxConnections: parseInt(process.env.EMAIL_MAX_CONNECTIONS || '5', 10),
  maxMessages: parseInt(process.env.EMAIL_MAX_MESSAGES || '100', 10),
}));
