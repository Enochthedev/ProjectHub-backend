# ProjectHub - Final Year Project Management Platform

A comprehensive platform for managing final year projects with AI-powered guidance, real-time collaboration, and intelligent project recommendations.

## ⚡ Quick Start

**Get started in 5 minutes:**

```bash
chmod +x setup.sh && ./setup.sh
```

Then start all services:

```bash
./start.sh
```

Access at: http://localhost:3000

📖 **New to ProjectHub?** See [QUICKSTART.md](./QUICKSTART.md) for the fastest way to get running!

📚 **Need detailed setup?** Check [SETUP_GUIDE.md](./SETUP_GUIDE.md) for comprehensive instructions.

## 🚀 Features

- **User Management**: Multi-role authentication (Students, Supervisors, Admins)
- **Project Discovery**: Advanced search and filtering with intelligent recommendations
- **AI Assistant**: Context-aware guidance powered by Hugging Face and OpenAI
- **Real-time Collaboration**: WebSocket-based updates and notifications
- **Milestone Tracking**: Comprehensive project progress monitoring
- **Calendar Integration**: Sync with Google Calendar and Outlook
- **Bookmark System**: Save and organize projects and AI conversations
- **Analytics Dashboard**: Insights for supervisors and administrators
- **Email Notifications**: Automated updates and reminders

## 📋 Table of Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
│  - Server-side rendering                                 │
│  - Real-time updates via WebSocket                       │
│  - Responsive design with Tailwind CSS                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ REST API / WebSocket
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Backend (NestJS)                        │
│  - RESTful API                                           │
│  - WebSocket Gateway                                     │
│  - JWT Authentication                                    │
│  - Rate Limiting & Security                              │
└────────┬──────────┬──────────┬─────────────────────────┘
         │          │          │
         │          │          │
    ┌────▼───┐  ┌──▼────┐  ┌──▼──────┐
    │ PostgreSQL│  │ Redis │  │ AI APIs │
    │ Database  │  │ Cache │  │ (HF/OAI)│
    └──────────┘  └───────┘  └─────────┘
```

## 📦 Prerequisites

### Required
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **Redis** 6+ ([Download](https://redis.io/download))
- **npm** or **yarn**

### Optional
- **Docker** & **Docker Compose** (for containerized deployment)
- **Git** (for version control)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/projecthub.git
cd projecthub
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure Environment Variables

#### Backend Configuration

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/projecthub

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Redis
REDIS_URL=redis://localhost:6379

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# AI Services
HUGGING_FACE_API_KEY=your-hugging-face-key
OPENAI_API_KEY=your-openai-key
```

#### Frontend Configuration

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### 5. Setup Database

```bash
# Run migrations
npm run migration:run

# Seed database (optional)
npm run seed
```

## 🚀 Development

### Start Backend

```bash
npm run start:dev
```

Backend will run on `http://localhost:3001`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:3000`

### Start Redis (if not running)

```bash
redis-server
```

### Development with Docker

```bash
docker-compose up -d
```

This starts all services (backend, frontend, PostgreSQL, Redis)

## 🧪 Testing

### Backend Tests

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Frontend Tests

```bash
cd frontend

# Unit tests
npm test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y

# Performance tests
npm run test:performance
```

### Run All Tests

```bash
npm run test:all
```

## 📦 Building for Production

### Backend Build

```bash
npm run build
```

### Frontend Build

```bash
cd frontend
npm run build
```

### Build Both

```bash
./scripts/build.sh
```

## 🚢 Deployment

### Quick Deploy to Render

```bash
./scripts/render-deploy.sh
```

This script will:
1. Run tests
2. Build applications
3. Validate configuration
4. Push to repository
5. Provide deployment instructions

### Manual Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guide.

### Deployment Options

- **Render** (Recommended) - Automated deployment with `render.yaml`
- **Docker** - Containerized deployment with Docker Compose
- **Manual** - Traditional server deployment

### Pre-Deployment Checklist

Review [PRE_DEPLOYMENT_CHECKLIST.md](./PRE_DEPLOYMENT_CHECKLIST.md) before deploying.

## 📚 API Documentation

### Quick Reference

See [API_QUICK_REFERENCE.md](./API_QUICK_REFERENCE.md) for API endpoints.

### Full Documentation

- **Backend API**: [FRONTEND_API_DOCUMENTATION.md](./FRONTEND_API_DOCUMENTATION.md)
- **Data Structures**: [API_DATA_STRUCTURES.md](./API_DATA_STRUCTURES.md)
- **Frontend Guide**: [FRONTEND_DEVELOPMENT_SUMMARY.md](./FRONTEND_DEVELOPMENT_SUMMARY.md)

### API Endpoints

```
POST   /auth/register          - Register new user
POST   /auth/login             - Login user
POST   /auth/refresh           - Refresh access token
GET    /projects               - List projects
POST   /projects               - Create project
GET    /projects/:id           - Get project details
POST   /bookmarks              - Create bookmark
GET    /ai-assistant/chat      - AI chat endpoint
GET    /health                 - Health check
```

## 🔒 Security

- JWT-based authentication
- Bcrypt password hashing
- Rate limiting on all endpoints
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Security headers (HSTS, CSP, etc.)

## 🎯 Performance

- Redis caching
- Database query optimization
- Code splitting and lazy loading
- Image optimization
- Bundle size optimization
- CDN integration
- Service worker caching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Update documentation
- Follow commit message conventions
- Ensure all tests pass before submitting PR

## 📝 Environment Variables

### Backend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_REFRESH_SECRET` | Refresh token secret | Yes | - |
| `REDIS_URL` | Redis connection string | Yes | - |
| `EMAIL_HOST` | SMTP host | Yes | - |
| `EMAIL_USER` | SMTP username | Yes | - |
| `EMAIL_PASSWORD` | SMTP password | Yes | - |
| `HUGGING_FACE_API_KEY` | Hugging Face API key | Yes | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `PORT` | Server port | No | 3001 |

### Frontend

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | Yes | - |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL | Yes | - |
| `NEXT_PUBLIC_APP_ENV` | Environment | No | development |

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
pg_isready

# Verify DATABASE_URL format
echo $DATABASE_URL
```

**Redis Connection Failed**
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

**Frontend Can't Connect to Backend**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS configuration in backend
- Ensure backend is running

See [DEPLOYMENT.md](./DEPLOYMENT.md) for more troubleshooting tips.

## 📊 Monitoring

- Health checks: `/health` endpoint
- Metrics: `/api/metrics` (Prometheus format)
- Logs: Structured logging with Winston
- Error tracking: Sentry integration (optional)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Lead**: [Your Name]
- **Frontend Lead**: [Your Name]
- **DevOps**: [Your Name]

## 🙏 Acknowledgments

- NestJS framework
- Next.js framework
- Hugging Face for AI models
- All contributors and supporters

## 📞 Support

- **Documentation**: See `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/your-username/projecthub/issues)
- **Email**: support@projecthub.com

---

**Built with ❤️ for Final Year Project Management**
