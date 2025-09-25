import { ConfigService } from '@nestjs/config';

export interface SecurityConfig {
  cors: {
    origin: string | string[] | boolean;
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: string[];
        styleSrc: string[];
        scriptSrc: string[];
        imgSrc: string[];
        connectSrc: string[];
        fontSrc: string[];
        objectSrc: string[];
        mediaSrc: string[];
        frameSrc: string[];
      };
    };
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups' | 'same-origin' | 'unsafe-none';
    };
    crossOriginResourcePolicy: {
      policy: 'cross-origin' | 'same-origin' | 'same-site';
    };
    dnsPrefetchControl: { allow: boolean };
    frameguard: { action: 'deny' | 'sameorigin' };
    hidePoweredBy: boolean;
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: { policy: string[] };
    xssFilter: boolean;
  };
}

export const getSecurityConfig = (
  configService: ConfigService,
): SecurityConfig => {
  const frontendUrl = configService.get<string>(
    'FRONTEND_URL',
    'http://localhost:3000',
  );
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  return {
    cors: {
      origin: isProduction
        ? [frontendUrl, configService.get<string>('ADMIN_URL', frontendUrl)]
        : true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Request-ID',
      ],
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", frontendUrl],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable for API compatibility
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' as const },
      crossOriginResourcePolicy: { policy: 'cross-origin' as const },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' as const },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: {
        policy: ['no-referrer', 'strict-origin-when-cross-origin'],
      },
      xssFilter: true,
    },
  };
};
