# ProjectHub Deployment Guide

## Overview
This guide covers the complete deployment process for ProjectHub, including both backend and frontend services.

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
│   Port: 3000    │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼────────┐      ┌──────────────┐
│   Backend       │◄────►│   Redis      │
│   (NestJS)      │      │   Cache      │
│   Port: 10000   │      └──────────────┘
└────────┬────────┘
         │
         │
┌────────▼────────┐
│   PostgreSQL    │
│   Database      │
└─────────────────┘
```

## Prerequisites

### Required Accounts
- [ ] Render.com account (or alternative hosting provider)
- [ ] GitHub account (for repository)
- [ ] Email service account (Gmail, SendGrid, etc.)
- [ ] Hugging Face account (for AI features)
- [ ] OpenAI account (optional, for enhanced AI)

### Required Tools
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] PostgreSQL client (for local testing)

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the root directory:

```bash
# Application
NODE_ENV=production
PORT=10000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://your-frontend-url.com
CORS_ORIGIN=https://your-frontend-url.com

# Redis
REDIS_URL=redis://default:password@host:6379

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@projecthub.com

# AI Services
HUGGING_FACE_API_KEY=your-hugging-face-api-key
OPENAI_API_KEY=your-openai-api-key (optional)

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100

# Features
CALENDAR_SYNC_ENABLED=true
AI_ASSISTANT_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760
```

### Frontend Environment Variables

Create a `frontend/.env.production` file:

```bash
# Application
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1

# API Configuration
NEXT_PUBLIC_API_URL=https://your-backend-url.com
NEXT_PUBLIC_WS_URL=wss://your-backend-url.com
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_NAME=ProjectHub

# Build Configuration
BUILD_STANDALONE=false
```

## Deployment Steps

### Option 1: Deploy to Render (Recommended)

#### 1. Prepare Repository

```bash
# Ensure all changes are committed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 2. Connect to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml`

#### 3. Configure Environment Variables

In Render Dashboard, add the following secret environment variables:

**Backend Service:**
- `HUGGING_FACE_API_KEY`
- `OPENAI_API_KEY` (optional)
- `EMAIL_USER`
- `EMAIL_PASSWORD`

**Note:** Other variables are auto-configured in `render.yaml`

#### 4. Deploy

1. Click "Apply" to create all services
2. Wait for deployment to complete (5-10 minutes)
3. Verify services are running

#### 5. Run Database Migrations

```bash
# SSH into backend service or use Render Shell
npm run migration:run
```

### Option 2: Deploy to Docker

#### 1. Build Docker Images

```bash
# Build backend
docker build -t projecthub-backend .

# Build frontend
docker build -f frontend/Dockerfile.production -t projecthub-frontend ./frontend
```

#### 2. Run with Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.production.yml up -d
```

#### 3. Verify Deployment

```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### Option 3: Manual Deployment

#### 1. Install Dependencies

```bash
# Backend
npm ci --only=production

# Frontend
cd frontend
npm ci --only=production
cd ..
```

#### 2. Build Applications

```bash
# Backend
npm run build

# Frontend
cd frontend
npm run build
cd ..
```

#### 3. Run Database Migrations

```bash
npm run migration:run
```

#### 4. Start Services

```bash
# Backend (in one terminal)
npm run start:prod

# Frontend (in another terminal)
cd frontend
npm start
```

## Post-Deployment Checklist

### Immediate Verification
- [ ] Backend health check: `https://your-backend-url.com/health`
- [ ] Frontend loads: `https://your-frontend-url.com`
- [ ] User registration works
- [ ] User login works
- [ ] API endpoints respond correctly
- [ ] WebSocket connection establishes
- [ ] Email sending works

### Security Verification
- [ ] HTTPS is enabled
- [ ] Security headers are set
- [ ] CORS is properly configured
- [ ] Rate limiting is active
- [ ] JWT tokens are secure
- [ ] Environment variables are not exposed

### Performance Verification
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] Database queries are optimized
- [ ] Redis caching is working
- [ ] CDN is configured (if applicable)

### Monitoring Setup
- [ ] Error tracking configured (Sentry, LogRocket)
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Log aggregation setup
- [ ] Alerts configured for critical errors

## Monitoring and Maintenance

### Health Checks

```bash
# Backend health
curl https://your-backend-url.com/health

# Frontend health
curl https://your-frontend-url.com/api/health

# Database connection
curl https://your-backend-url.com/health/db
```

### Logs

```bash
# Render logs
render logs -s projecthub-backend
render logs -s projecthub-frontend

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Backups

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore backup
psql $DATABASE_URL < backup-20240101.sql
```

## Rollback Procedure

### Render Rollback

1. Go to Render Dashboard
2. Select the service
3. Click "Rollback" to previous deployment

### Docker Rollback

```bash
# Stop current deployment
docker-compose down

# Pull previous image version
docker pull projecthub-backend:previous-tag
docker pull projecthub-frontend:previous-tag

# Start with previous version
docker-compose up -d
```

### Manual Rollback

```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild and restart
npm run build
npm run start:prod
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### 2. Redis Connection Failed
```bash
# Check REDIS_URL
echo $REDIS_URL

# Test connection
redis-cli -u $REDIS_URL ping
```

#### 3. Frontend Can't Connect to Backend
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration
- Verify backend is running

#### 4. Email Not Sending
- Verify email credentials
- Check EMAIL_HOST and EMAIL_PORT
- Enable "Less secure app access" for Gmail
- Use App Password for Gmail

#### 5. AI Assistant Not Working
- Verify HUGGING_FACE_API_KEY is set
- Check API quota limits
- Review AI service logs

### Debug Mode

Enable debug logging:

```bash
# Backend
DEBUG=* npm run start:prod

# Frontend
NODE_ENV=development npm start
```

## Performance Optimization

### Backend Optimization
- Enable Redis caching
- Optimize database queries
- Use connection pooling
- Enable compression
- Implement CDN for static assets

### Frontend Optimization
- Enable Next.js image optimization
- Implement code splitting
- Use lazy loading
- Enable service worker
- Optimize bundle size

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use strong JWT secrets** (32+ characters)
3. **Enable HTTPS** everywhere
4. **Implement rate limiting** on all endpoints
5. **Validate all inputs** on backend
6. **Use prepared statements** for database queries
7. **Keep dependencies updated** regularly
8. **Monitor for vulnerabilities** with npm audit
9. **Implement proper CORS** configuration
10. **Use security headers** (CSP, HSTS, etc.)

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (Render handles this automatically)
- Implement session storage in Redis
- Use database read replicas
- Implement CDN for static assets

### Vertical Scaling
- Upgrade Render plan
- Increase database resources
- Optimize Redis memory usage

## Support and Resources

- **Documentation**: [Project README](./README.md)
- **API Documentation**: [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md)
- **Frontend Guide**: [FRONTEND_DEVELOPMENT_SUMMARY.md](./FRONTEND_DEVELOPMENT_SUMMARY.md)
- **Render Support**: https://render.com/docs
- **GitHub Issues**: [Project Issues](https://github.com/your-repo/issues)

## Maintenance Schedule

### Daily
- Monitor error logs
- Check system health
- Review performance metrics

### Weekly
- Review security alerts
- Update dependencies (if needed)
- Backup database
- Review user feedback

### Monthly
- Security audit
- Performance optimization
- Dependency updates
- Feature deployment

## Emergency Contacts

- **DevOps Lead**: [email]
- **Backend Lead**: [email]
- **Frontend Lead**: [email]
- **Database Admin**: [email]

---

**Last Updated**: January 2025
**Version**: 1.0.0
