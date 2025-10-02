# ProjectHub Frontend Deployment Guide

This guide provides comprehensive instructions for deploying the ProjectHub frontend application to various hosting platforms and environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Build Process](#build-process)
- [Deployment Platforms](#deployment-platforms)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher (or yarn/pnpm equivalent)
- **Git**: For version control and deployment
- **Docker**: For containerized deployments (optional)

### Development Tools

- **Code Editor**: VS Code, WebStorm, or similar
- **Terminal**: Command line interface
- **Browser**: Chrome, Firefox, Safari, or Edge for testing

### Access Requirements

- **Repository Access**: GitHub/GitLab repository permissions
- **Hosting Platform**: Account on chosen deployment platform
- **Domain**: Custom domain (optional)
- **SSL Certificate**: For HTTPS (usually provided by hosting platform)

## Environment Configuration

### Environment Variables

Create environment files for each deployment stage:

#### Development (.env.development)
```bash
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXTAUTH_SECRET=dev-secret-key
NEXTAUTH_URL=http://localhost:3001
NEXT_PUBLIC_DEBUG_MODE=true
```

#### Staging (.env.staging)
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api-staging.projecthub.com/api
NEXT_PUBLIC_APP_URL=https://staging.projecthub.com
NEXTAUTH_SECRET=staging-secret-key-replace-with-secure-value
NEXTAUTH_URL=https://staging.projecthub.com
NEXT_PUBLIC_DEBUG_MODE=false
```

#### Production (.env.production)
```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.projecthub.com/api
NEXT_PUBLIC_APP_URL=https://projecthub.com
NEXTAUTH_SECRET=production-secret-key-replace-with-secure-value
NEXTAUTH_URL=https://projecthub.com
NEXT_PUBLIC_DEBUG_MODE=false
```

### Security Configuration

#### Environment Secrets

**Required Secrets:**
- `NEXTAUTH_SECRET`: Secure random string for JWT signing
- `API_URL_*`: Backend API endpoints for each environment
- `APP_URL_*`: Frontend URLs for each environment

**Optional Secrets:**
- `GOOGLE_ANALYTICS_ID`: For analytics tracking
- `SENTRY_DSN`: For error reporting
- `MIXPANEL_TOKEN`: For user analytics

#### Security Headers

Configure security headers in `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

## Build Process

### Local Build

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Test Build Locally**
   ```bash
   npm run start
   ```

### Production Build

1. **Clean Previous Builds**
   ```bash
   npm run clean
   ```

2. **Type Check**
   ```bash
   npm run type-check
   ```

3. **Lint and Format**
   ```bash
   npm run lint
   npm run format:check
   ```

4. **Run Tests**
   ```bash
   npm run test:coverage
   ```

5. **Build for Production**
   ```bash
   NODE_ENV=production npm run build
   ```

6. **Analyze Bundle (Optional)**
   ```bash
   npm run build:analyze
   ```

## Deployment Platforms

### Vercel (Recommended)

Vercel provides the best Next.js deployment experience with zero configuration.

#### Automatic Deployment

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel automatically detects Next.js

2. **Configure Environment Variables**
   ```bash
   # In Vercel dashboard, add environment variables:
   NEXTAUTH_SECRET=your-production-secret
   NEXT_PUBLIC_API_URL=https://your-api-url.com/api
   NEXT_PUBLIC_APP_URL=https://your-app-url.com
   ```

3. **Deploy**
   - Push to main branch for automatic deployment
   - Or trigger manual deployment from Vercel dashboard

#### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   cd frontend
   vercel --prod
   ```

#### Custom Domain

1. **Add Domain in Vercel Dashboard**
   - Go to Project Settings > Domains
   - Add your custom domain

2. **Configure DNS**
   - Add CNAME record pointing to Vercel
   - Or use Vercel nameservers

### Netlify

Alternative deployment platform with good Next.js support.

#### Setup

1. **Create netlify.toml**
   ```toml
   [build]
     base = "frontend/"
     publish = "out/"
     command = "npm run build"

   [build.environment]
     NODE_VERSION = "18"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Deploy**
   - Connect GitHub repository
   - Configure build settings
   - Set environment variables
   - Deploy automatically on push

### AWS S3 + CloudFront

For enterprise deployments requiring AWS infrastructure.

#### Setup S3 Bucket

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://projecthub-frontend-prod
   ```

2. **Configure Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::projecthub-frontend-prod/*"
       }
     ]
   }
   ```

3. **Enable Static Website Hosting**
   ```bash
   aws s3 website s3://projecthub-frontend-prod \
     --index-document index.html \
     --error-document error.html
   ```

#### Setup CloudFront

1. **Create Distribution**
   ```bash
   aws cloudfront create-distribution \
     --distribution-config file://cloudfront-config.json
   ```

2. **Configure Caching**
   - Set appropriate cache behaviors
   - Configure error pages
   - Enable compression

#### Deploy Script

```bash
#!/bin/bash
# deploy-aws.sh

# Build the application
npm run build

# Sync to S3
aws s3 sync ./out s3://projecthub-frontend-prod --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Docker Deployment

For containerized deployments on any platform.

#### Build Docker Image

1. **Build Image**
   ```bash
   docker build -t projecthub-frontend:latest .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_API_URL=https://api.projecthub.com/api \
     -e NEXTAUTH_SECRET=your-secret \
     projecthub-frontend:latest
   ```

#### Docker Compose

```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.projecthub.com/api
      - NEXTAUTH_SECRET=your-secret
    restart: unless-stopped
```

### Kubernetes Deployment

For scalable enterprise deployments.

#### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: projecthub-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: projecthub-frontend
  template:
    metadata:
      labels:
        app: projecthub-frontend
    spec:
      containers:
      - name: frontend
        image: projecthub-frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: NEXT_PUBLIC_API_URL
          valueFrom:
            secretKeyRef:
              name: frontend-secrets
              key: api-url
```

#### Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: projecthub-frontend-service
spec:
  selector:
    app: projecthub-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

## CI/CD Pipeline

### GitHub Actions

The project includes a comprehensive GitHub Actions workflow for automated deployment.

#### Workflow Features

- **Quality Checks**: Linting, type checking, formatting
- **Testing**: Unit tests, E2E tests, accessibility tests
- **Security**: Dependency scanning, vulnerability checks
- **Performance**: Bundle analysis, Lighthouse CI
- **Multi-environment**: Development, staging, production
- **Notifications**: Slack/email notifications on deployment status

#### Setup

1. **Configure Secrets**
   ```bash
   # In GitHub repository settings, add secrets:
   VERCEL_TOKEN=your-vercel-token
   VERCEL_ORG_ID=your-org-id
   VERCEL_PROJECT_ID=your-project-id
   NEXTAUTH_SECRET=your-secret
   API_URL_DEVELOPMENT=http://localhost:3000/api
   API_URL_STAGING=https://api-staging.projecthub.com/api
   API_URL_PRODUCTION=https://api.projecthub.com/api
   ```

2. **Trigger Deployment**
   - Push to `develop` branch for staging deployment
   - Push to `main` branch for production deployment
   - Create pull request for preview deployment

### GitLab CI/CD

Alternative CI/CD configuration for GitLab.

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:18
  script:
    - cd frontend
    - npm ci
    - npm run lint
    - npm run type-check
    - npm run test:coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: frontend/coverage/cobertura-coverage.xml

build:
  stage: build
  image: node:18
  script:
    - cd frontend
    - npm ci
    - npm run build
  artifacts:
    paths:
      - frontend/.next/
    expire_in: 1 hour

deploy_staging:
  stage: deploy
  image: node:18
  script:
    - cd frontend
    - npm install -g vercel
    - vercel --token $VERCEL_TOKEN
  only:
    - develop

deploy_production:
  stage: deploy
  image: node:18
  script:
    - cd frontend
    - npm install -g vercel
    - vercel --prod --token $VERCEL_TOKEN
  only:
    - main
```

## Monitoring and Maintenance

### Health Monitoring

#### Health Check Endpoint

The application includes a health check endpoint at `/api/health`:

```bash
# Check application health
curl https://your-app-url.com/api/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400000,
  "checks": {
    "api": { "status": "pass", "responseTime": 150 },
    "websocket": { "status": "pass" },
    "localStorage": { "status": "pass" },
    "memory": { "status": "pass", "usage": "45%" }
  }
}
```

#### Monitoring Setup

1. **Uptime Monitoring**
   - Use services like Pingdom, UptimeRobot, or StatusPage
   - Monitor `/api/health` endpoint
   - Set up alerts for downtime

2. **Performance Monitoring**
   - Configure Lighthouse CI for performance tracking
   - Use Web Vitals monitoring
   - Set up Core Web Vitals alerts

3. **Error Tracking**
   - Integrate Sentry for error reporting
   - Configure error boundaries
   - Set up error rate alerts

### Analytics and Metrics

#### Application Metrics

Access metrics at `/api/metrics`:

```bash
curl https://your-app-url.com/api/metrics
```

#### Performance Metrics

- **Core Web Vitals**: LCP, FID, CLS
- **Bundle Size**: Track JavaScript bundle size
- **Load Times**: Monitor page load performance
- **API Response Times**: Track backend performance

#### Business Metrics

- **User Engagement**: Page views, session duration
- **Feature Usage**: AI assistant usage, project searches
- **Conversion Rates**: Project applications, registrations

### Maintenance Tasks

#### Regular Maintenance

1. **Dependency Updates**
   ```bash
   # Check for outdated packages
   npm outdated
   
   # Update dependencies
   npm update
   
   # Update major versions carefully
   npm install package@latest
   ```

2. **Security Updates**
   ```bash
   # Audit dependencies
   npm audit
   
   # Fix vulnerabilities
   npm audit fix
   ```

3. **Performance Optimization**
   ```bash
   # Analyze bundle size
   npm run build:analyze
   
   # Run performance tests
   npm run test:performance
   ```

#### Backup and Recovery

1. **Code Backup**
   - Ensure code is backed up in version control
   - Tag releases for easy rollback
   - Maintain deployment history

2. **Configuration Backup**
   - Export environment variables
   - Document deployment configurations
   - Backup SSL certificates

3. **Rollback Procedures**
   ```bash
   # Rollback to previous version
   vercel rollback
   
   # Or deploy specific version
   vercel --prod --target=production-abc123
   ```

## Troubleshooting

### Common Deployment Issues

#### Build Failures

**Issue**: Build fails with TypeScript errors
**Solution**:
```bash
# Check TypeScript configuration
npm run type-check

# Fix type errors
# Update tsconfig.json if needed
```

**Issue**: Build fails with dependency issues
**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

#### Runtime Issues

**Issue**: Application not loading
**Solution**:
1. Check browser console for errors
2. Verify environment variables are set
3. Check API connectivity
4. Review server logs

**Issue**: API calls failing
**Solution**:
1. Verify API URL configuration
2. Check CORS settings
3. Verify authentication tokens
4. Test API endpoints directly

#### Performance Issues

**Issue**: Slow loading times
**Solution**:
1. Analyze bundle size with `npm run build:analyze`
2. Implement code splitting
3. Optimize images and assets
4. Enable compression on server

**Issue**: High memory usage
**Solution**:
1. Check for memory leaks in components
2. Optimize large lists with virtualization
3. Implement proper cleanup in useEffect
4. Monitor memory usage in production

### Platform-Specific Issues

#### Vercel Issues

**Issue**: Function timeout errors
**Solution**:
- Optimize API routes for faster execution
- Increase timeout limits in vercel.json
- Use edge functions for better performance

**Issue**: Build size limits
**Solution**:
- Optimize bundle size
- Use dynamic imports
- Remove unused dependencies

#### Netlify Issues

**Issue**: Redirect loops
**Solution**:
- Check _redirects file configuration
- Verify netlify.toml settings
- Test redirects locally

#### Docker Issues

**Issue**: Container startup failures
**Solution**:
- Check Dockerfile configuration
- Verify environment variables
- Review container logs
- Test image locally

### Getting Help

#### Support Resources

1. **Documentation**
   - Next.js documentation
   - Platform-specific guides
   - Community forums

2. **Community Support**
   - Stack Overflow
   - GitHub Discussions
   - Discord/Slack communities

3. **Professional Support**
   - Platform support teams
   - Consulting services
   - Enterprise support plans

#### Reporting Issues

When reporting deployment issues, include:

- **Environment**: Development, staging, or production
- **Platform**: Vercel, Netlify, AWS, etc.
- **Error Messages**: Complete error logs
- **Steps to Reproduce**: Detailed reproduction steps
- **Configuration**: Relevant configuration files
- **Timing**: When the issue started occurring

---

For additional deployment support, consult the platform-specific documentation or contact the development team.