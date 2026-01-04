# 🐳 Docker Quick Start

Run ProjectHub with **just 3 commands**. No Node.js, PostgreSQL, or Redis installation needed!

## Prerequisites

Install ONE of these:
- **Docker Desktop** (Windows/Mac): https://www.docker.com/products/docker-desktop
- **OrbStack** (Mac, faster): https://orbstack.dev
- **Docker Engine** (Linux): https://docs.docker.com/engine/install/

## Quick Start (3 Steps)

### 1. Get API Keys

You need these API keys (free to sign up):

- **OpenRouter**: https://openrouter.ai/keys (for AI chat)
- **HuggingFace**: https://huggingface.co/settings/tokens (for embeddings)

### 2. Configure Environment

```bash
# Clone the repo
git clone <your-repo>
cd ProjectHub-backend

# Copy environment template
cp .env.docker .env

# Edit .env and add your API keys
nano .env  # or use any text editor
```

**Required in `.env`**:
```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
HUGGING_FACE_API_KEY=hf_your-key-here
JWT_SECRET=your-random-secret-here
JWT_REFRESH_SECRET=your-other-random-secret
```

> **Generate secrets**: `openssl rand -base64 32`

### 3. Start Everything

**Option A: Using the start script** (Recommended)
```bash
./docker-start.sh
```

**Option B: Manual commands**
```bash
docker-compose up -d
```

**That's it!** 🎉

The backend is now running at http://localhost:3000

## Verify It's Working

```bash
# Check health
curl http://localhost:3000/health

# Expected:
# {"status":"ok","database":"connected","redis":"connected"}

# View logs
docker-compose logs -f backend
```

## Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart backend
docker-compose restart backend

# Access database
docker-compose exec postgres psql -U postgres -d projecthub

# Run migrations manually
docker-compose exec backend npm run migration:run

# Seed AI models
docker-compose exec backend npm run seed:ai-models

# Clean everything (WARNING: deletes data!)
docker-compose down -v
```

## What's Running?

| Service | Port | Purpose |
|---------|------|---------|
| Backend | 3000 | NestJS API |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache |
| Qdrant | 6333 | Vector DB for AI |

## Development Mode

For development with hot-reload:

```bash
# Start dev environment
npm run docker:dev

# Or manually
docker-compose -f docker-compose.dev.yml up

# Attach debugger on port 9229
```

## Troubleshooting

### "Port already in use"

```bash
# Check what's using port 3000
lsof -i :3000

# Or change the port in .env
PORT=3001
```

### Database connection errors

```bash
# Check postgres is running
docker-compose ps postgres

# View postgres logs
docker-compose logs postgres

# Restart postgres
docker-compose restart postgres
```

### Migrations not running

```bash
# Run manually
docker-compose exec backend npm run migration:run
```

### Need to reset everything

```bash
# Stop and remove all data
docker-compose down -v

# Start fresh
docker-compose up -d
```

## Full Documentation

For detailed Docker documentation, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)

## NPM Scripts

Convenient shortcuts added to `package.json`:

```bash
npm run docker:build    # Build images
npm run docker:up       # Start services
npm run docker:down     # Stop services
npm run docker:logs     # View logs
npm run docker:dev      # Dev mode with hot-reload
npm run docker:restart  # Restart backend
npm run docker:clean    # Remove everything
```

## Deployment

For production deployment, see [DOCKER_SETUP.md](./DOCKER_SETUP.md#production-deployment)

**Remember**:
- Change all secrets in production
- Use strong passwords
- Enable SSL/TLS
- Set up backups
- Monitor logs

## Support

- Docker issues: https://docs.docker.com/
- ProjectHub issues: See main README.md
- Full Docker guide: [DOCKER_SETUP.md](./DOCKER_SETUP.md)
