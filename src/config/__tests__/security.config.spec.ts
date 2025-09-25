import { ConfigService } from '@nestjs/config';
import { getSecurityConfig } from '../security.config';

describe('SecurityConfig', () => {
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
  });

  describe('getSecurityConfig', () => {
    it('should return development configuration when NODE_ENV is development', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          switch (key) {
            case 'NODE_ENV':
              return 'development';
            case 'FRONTEND_URL':
              return 'http://localhost:3000';
            default:
              return defaultValue;
          }
        });

      const config = getSecurityConfig(configService);

      expect(config.cors.origin).toBe(true); // Allow all origins in development
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
      expect(config.cors.allowedHeaders).toContain('Authorization');
    });

    it('should return production configuration when NODE_ENV is production', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          switch (key) {
            case 'NODE_ENV':
              return 'production';
            case 'FRONTEND_URL':
              return 'https://fyp-platform.ui.edu.ng';
            case 'ADMIN_URL':
              return 'https://admin.fyp-platform.ui.edu.ng';
            default:
              return defaultValue;
          }
        });

      const config = getSecurityConfig(configService);

      expect(config.cors.origin).toEqual([
        'https://fyp-platform.ui.edu.ng',
        'https://admin.fyp-platform.ui.edu.ng',
      ]);
      expect(config.cors.credentials).toBe(true);
    });

    it('should configure helmet security headers correctly', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          switch (key) {
            case 'NODE_ENV':
              return 'production';
            case 'FRONTEND_URL':
              return 'https://fyp-platform.ui.edu.ng';
            default:
              return defaultValue;
          }
        });

      const config = getSecurityConfig(configService);

      expect(config.helmet.hidePoweredBy).toBe(true);
      expect(config.helmet.frameguard.action).toBe('deny');
      expect(config.helmet.hsts.maxAge).toBe(31536000); // 1 year
      expect(config.helmet.hsts.includeSubDomains).toBe(true);
      expect(config.helmet.hsts.preload).toBe(true);
      expect(config.helmet.noSniff).toBe(true);
      expect(config.helmet.xssFilter).toBe(true);
    });

    it('should configure CSP directives correctly', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          switch (key) {
            case 'FRONTEND_URL':
              return 'https://fyp-platform.ui.edu.ng';
            default:
              return defaultValue;
          }
        });

      const config = getSecurityConfig(configService);
      const csp = config.helmet.contentSecurityPolicy.directives;

      expect(csp.defaultSrc).toContain("'self'");
      expect(csp.scriptSrc).toContain("'self'");
      expect(csp.styleSrc).toContain("'self'");
      expect(csp.styleSrc).toContain("'unsafe-inline'");
      expect(csp.objectSrc).toContain("'none'");
      expect(csp.frameSrc).toContain("'none'");
      expect(csp.connectSrc).toContain("'self'");
      expect(csp.connectSrc).toContain('https://fyp-platform.ui.edu.ng');
    });

    it('should use default values when environment variables are not set', () => {
      jest
        .spyOn(configService, 'get')
        .mockImplementation((key: string, defaultValue?: any) => {
          return defaultValue;
        });

      const config = getSecurityConfig(configService);

      expect(config.cors.origin).toBe(true); // Development default
      expect(
        config.helmet.contentSecurityPolicy.directives.connectSrc,
      ).toContain('http://localhost:3000');
    });

    it('should include required CORS headers', () => {
      const config = getSecurityConfig(configService);

      expect(config.cors.allowedHeaders).toContain('Origin');
      expect(config.cors.allowedHeaders).toContain('Content-Type');
      expect(config.cors.allowedHeaders).toContain('Authorization');
      expect(config.cors.allowedHeaders).toContain('X-API-Key');
      expect(config.cors.allowedHeaders).toContain('X-Request-ID');
    });

    it('should include all required HTTP methods', () => {
      const config = getSecurityConfig(configService);

      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
      expect(config.cors.methods).toContain('PUT');
      expect(config.cors.methods).toContain('PATCH');
      expect(config.cors.methods).toContain('DELETE');
      expect(config.cors.methods).toContain('OPTIONS');
    });
  });
});
