# 🚀 ProjectHub Full Stack - Complete Setup

Run **both frontend and backend** with one command!

## Quick Start (3 Steps)

### 1. Install Docker
- **Mac**: [OrbStack](https://orbstack.dev) or [Docker Desktop](https://docker.com)
- **Windows**: [Docker Desktop](https://docker.com)
- **Linux**: [Docker Engine](https://docs.docker.com/engine/install/)

### 2. Configure
```bash
# Clone repo
git clone <your-repo>
cd ProjectHub-backend

# Copy environment template
cp .env.docker .env

# Edit and add your API keys
nano .env
```

**Required API Keys**:
```bash
# AI Services (REQUIRED)
OPENROUTER_API_KEY=sk-or-v1-...        # https://openrouter.ai/keys
HUGGING_FACE_API_KEY=hf_...            # https://huggingface.co/settings/tokens

# Secrets (REQUIRED - generate with: openssl rand -base64 32)
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NEXTAUTH_SECRET=...
```

### 3. Start Everything
```bash
# Option A: Use the script (recommended)
./docker-start-full.sh

# Option B: Manual
docker-compose -f docker-compose.full.yml up -d
```

**Done!** 🎉

- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:3000

## What Gets Started

| Service | Port | What It Does |
|---------|------|--------------|
| **Frontend** | 3001 | Next.js web app |
| **Backend** | 3000 | NestJS API |
| **PostgreSQL** | 5432 | Database |
| **Redis** | 6379 | Cache |
| **Qdrant** | 6333 | Vector DB |

## Using the App

### 1. Open Frontend
Go to http://localhost:3001

### 2. Register
- Click "Sign Up"
- Use email ending in `@ui.edu.ng`
- Create strong password

### 3. Use AI Chat
- Go to "AI Assistant" in sidebar
- Ask questions about your project
- Chat with AI powered by Claude Opus 4.5

## Common Commands

```bash
# View logs
docker-compose -f docker-compose.full.yml logs -f

# View specific service logs
docker-compose -f docker-compose.full.yml logs -f frontend
docker-compose -f docker-compose.full.yml logs -f backend

# Stop everything
docker-compose -f docker-compose.full.yml down

# Restart a service
docker-compose -f docker-compose.full.yml restart frontend

# Clean everything (WARNING: deletes data!)
docker-compose -f docker-compose.full.yml down -v
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Browser (localhost:3001)        │
│              Next.js Frontend           │
└───────────────┬─────────────────────────┘
                │ HTTP/WebSocket
                ↓
┌─────────────────────────────────────────┐
│       Backend API (localhost:3000)      │
│           NestJS + TypeScript           │
└─┬─────────┬──────────┬─────────────────┘
  │         │          │
  │         │          └──→ OpenRouter (Claude Opus 4.5)
  │         └─────────────→ HuggingFace (Embeddings)
  │
  ├──→ PostgreSQL (Database)
  ├──→ Redis (Cache)
  └──→ Qdrant (Vector DB)
```

## Troubleshooting

### Frontend won't connect to backend
**Check backend is running**:
```bash
curl http://localhost:3000/health
```

**Expected**: `{"status":"ok",...}`

### "API key not configured" error
Add API keys to `.env`:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
HUGGING_FACE_API_KEY=hf_...
```

Then restart:
```bash
docker-compose -f docker-compose.full.yml restart backend
```

### Port already in use
**Find what's using the port**:
```bash
lsof -i :3000  # Backend
lsof -i :3001  # Frontend
```

**Change port** in `.env`:
```bash
PORT=3002  # Backend port
```

### Database connection errors
```bash
# Check postgres health
docker-compose -f docker-compose.full.yml ps postgres

# View logs
docker-compose -f docker-compose.full.yml logs postgres

# Restart postgres
docker-compose -f docker-compose.full.yml restart postgres
```

## Development vs Production

### Development (with hot-reload)
```bash
# Start dev mode
docker-compose -f docker-compose.dev.yml up

# Backend: http://localhost:3000
# Frontend: Run separately with `npm run dev`
```

### Production (optimized)
```bash
# Use full stack compose
docker-compose -f docker-compose.full.yml up -d

# Both services optimized and production-ready
```

## Environment Variables

### Backend (.env)
```bash
# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=projecthub

# Redis
REDIS_PASSWORD=redis_password

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI
OPENROUTER_API_KEY=sk-or-v1-...
HUGGING_FACE_API_KEY=hf_...

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
```

### Frontend (auto-configured)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## Testing It Works

### 1. Backend Health
```bash
curl http://localhost:3000/health
```

### 2. Frontend Loads
Open http://localhost:3001 in browser

### 3. AI Chat Works
1. Register/Login
2. Go to AI Assistant
3. Type: "How do I write a research proposal?"
4. Should get AI response

## Performance

### Initial Build Time
- Backend: ~2-3 minutes
- Frontend: ~3-5 minutes
- **Total**: ~5-8 minutes first time

### Subsequent Starts
- **All services**: ~10-15 seconds

### Resource Usage
- **RAM**: ~2-3GB total
- **Disk**: ~5GB (with data)
- **CPU**: Low (spikes during AI requests)

## Security Checklist

Before deploying to production:

- [ ] Change `JWT_SECRET` to strong random value
- [ ] Change `JWT_REFRESH_SECRET` to strong random value
- [ ] Change `NEXTAUTH_SECRET` to strong random value
- [ ] Change `DB_PASSWORD` to strong password
- [ ] Change `REDIS_PASSWORD` to strong password
- [ ] Set `NODE_ENV=production`
- [ ] Add real API keys (not test keys)
- [ ] Configure email settings
- [ ] Set up SSL/TLS
- [ ] Enable backups
- [ ] Set up monitoring

## Deployment

### VPS/Cloud (DigitalOcean, AWS, etc.)

```bash
# 1. Copy to server
scp -r . user@server:/opt/projecthub

# 2. SSH to server
ssh user@server
cd /opt/projecthub

# 3. Configure
cp .env.docker .env
nano .env  # Add production values

# 4. Start
docker-compose -f docker-compose.full.yml up -d
```

### Domain Setup
1. Point domain to server IP
2. Use nginx/Traefik for SSL
3. Update environment variables with production URLs

## Support

- **Backend only**: See [README_DOCKER.md](./README_DOCKER.md)
- **Full documentation**: See [DOCKER_SETUP.md](./DOCKER_SETUP.md)
- **AI setup**: See [AI_SYSTEM_SETUP.md](./AI_SYSTEM_SETUP.md)

## Summary

**Before**: Complex setup, multiple services, hard to run

**After**: One command, everything works, AI chat included

```bash
./docker-start-full.sh
```

**Result**: Full stack running with AI chat 🚀
