# Docker Setup Guide

This guide explains how to run ProjectHub using Docker. **No local Node.js, PostgreSQL, or Redis installation required!**

## Prerequisites

Install ONE of these:
- **Docker Desktop** (Windows/Mac): https://www.docker.com/products/docker-desktop
- **OrbStack** (Mac, recommended): https://orbstack.dev
- **Docker Engine** (Linux): https://docs.docker.com/engine/install/

## Quick Start (3 steps)

### 1. Clone & Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd ProjectHub-backend

# Copy environment file
cp .env.docker .env

# Edit .env and add your API keys
nano .env  # or use any text editor
```

**Required API Keys**:
- `OPENROUTER_API_KEY` - Get from https://openrouter.ai/keys
- `HUGGING_FACE_API_KEY` - Get from https://huggingface.co/settings/tokens
- `JWT_SECRET` - Generate a random string (e.g., `openssl rand -base64 32`)
- `JWT_REFRESH_SECRET` - Generate another random string

### 2. Start Everything

```bash
# Start all services (PostgreSQL, Redis, Qdrant, Backend)
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### 3. Verify It's Running

```bash
# Check health
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected"}
```

**That's it!** 🎉 The backend is now running on http://localhost:3000

---

## What Gets Started?

Docker Compose starts these services:

| Service | Port | Description |
|---------|------|-------------|
| **backend** | 3000 | NestJS API server |
| **postgres** | 5432 | PostgreSQL database |
| **redis** | 6379 | Redis cache |
| **qdrant** | 6333 | Vector database for AI |
| **migrations** | - | Runs once to set up database |

---

## Common Commands

### Starting & Stopping

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data (CAUTION: deletes database!)
docker-compose down -v

# Restart a specific service
docker-compose restart backend
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d projecthub

# Run SQL query
docker-compose exec postgres psql -U postgres -d projecthub -c "SELECT COUNT(*) FROM users;"

# Backup database
docker-compose exec postgres pg_dump -U postgres projecthub > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres projecthub < backup.sql
```

### Running Commands Inside Container

```bash
# Open shell in backend container
docker-compose exec backend sh

# Run migrations manually
docker-compose exec backend npm run migration:run

# Seed AI models
docker-compose exec backend npm run seed:ai-models

# Check installed packages
docker-compose exec backend npm list
```

---

## Development Setup

For development with hot-reload:

```bash
# Use development docker-compose
docker-compose -f docker-compose.dev.yml up

# Or use the shortcut
npm run docker:dev
```

**Development Features**:
- Hot-reload on code changes
- Debug port exposed (9229)
- Source code mounted as volume
- Full logging

**Attach Debugger** (VS Code):
```json
{
  "type": "node",
  "request": "attach",
  "name": "Docker: Attach to Node",
  "port": 9229,
  "address": "localhost",
  "restart": true,
  "sourceMaps": true,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app"
}
```

---

## Production Deployment

### Build for Production

```bash
# Build optimized image
docker build -t projecthub-backend:latest .

# Or use docker-compose
docker-compose build
```

### Environment Variables

**Production .env checklist**:
- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Change `JWT_REFRESH_SECRET` to a strong random value
- [ ] Change `REDIS_PASSWORD` to a strong password
- [ ] Change `DB_PASSWORD` to a strong password
- [ ] Add real `OPENROUTER_API_KEY`
- [ ] Add real `HUGGING_FACE_API_KEY`
- [ ] Set `NODE_ENV=production`
- [ ] Configure email settings
- [ ] Update `APP_URL` and `FRONTEND_URL` to production URLs

### Deploy to Cloud

**Using Docker Compose** (VPS/EC2):
```bash
# Copy files to server
scp -r . user@server:/opt/projecthub

# SSH into server
ssh user@server

# Start services
cd /opt/projecthub
docker-compose up -d
```

**Using Docker Swarm**:
```bash
docker stack deploy -c docker-compose.yml projecthub
```

**Using Kubernetes**:
```bash
# Convert docker-compose to k8s manifests
kompose convert

# Apply to cluster
kubectl apply -f .
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs backend

# Check if ports are in use
lsof -i :3000
lsof -i :5432
```

### Database Connection Errors

```bash
# Verify postgres is healthy
docker-compose ps postgres

# Check postgres logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres -d projecthub -c "SELECT 1;"
```

### "Cannot find module" Errors

```bash
# Rebuild with fresh dependencies
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### Migrations Not Running

```bash
# Run migrations manually
docker-compose exec backend npm run migration:run

# Check migration status
docker-compose exec backend npm run typeorm migration:show
```

### Out of Memory

Edit `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
```

### Permission Errors (Linux)

```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Or run with sudo
sudo docker-compose up -d
```

---

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml`:
```yaml
postgres:
  environment:
    POSTGRES_SHARED_BUFFERS: "256MB"
    POSTGRES_EFFECTIVE_CACHE_SIZE: "1GB"
    POSTGRES_MAX_CONNECTIONS: "100"
```

### Redis

Edit `docker-compose.yml`:
```yaml
redis:
  command: >
    redis-server
    --appendonly yes
    --requirepass ${REDIS_PASSWORD}
    --maxmemory 256mb
    --maxmemory-policy allkeys-lru
```

### Backend

Edit `docker-compose.yml`:
```yaml
backend:
  environment:
    NODE_OPTIONS: "--max-old-space-size=2048"
```

---

## Monitoring

### Health Checks

```bash
# Check all services health
docker-compose ps

# Backend health endpoint
curl http://localhost:3000/health

# PostgreSQL health
docker-compose exec postgres pg_isready

# Redis health
docker-compose exec redis redis-cli ping
```

### Resource Usage

```bash
# Monitor resource usage
docker stats

# Specific container
docker stats projecthub-backend
```

### Logs to File

```bash
# Save logs to file
docker-compose logs > logs.txt

# Continuous logging to file
docker-compose logs -f >> logs.txt 2>&1 &
```

---

## Backup & Restore

### Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres projecthub | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup volumes
docker run --rm -v projecthub_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data.tar.gz -C /data .
```

### Restore

```bash
# Restore database
gunzip < backup-20240115.sql.gz | docker-compose exec -T postgres psql -U postgres projecthub

# Restore volumes
docker run --rm -v projecthub_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres-data.tar.gz -C /data
```

---

## Updating

```bash
# Pull latest code
git pull

# Rebuild images
docker-compose build

# Restart with new images
docker-compose up -d

# Run new migrations
docker-compose exec backend npm run migration:run
```

---

## Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (DELETES ALL DATA!)
docker-compose down -v

# Remove unused images
docker image prune -a

# Remove everything Docker-related (CAUTION!)
docker system prune -a --volumes
```

---

## Advanced Configuration

### Custom Network

```yaml
networks:
  projecthub-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### Named Volumes Location

```bash
# Find volume location
docker volume inspect projecthub_postgres_data

# Backup volume to tar
docker run --rm -v projecthub_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz -C /data .
```

### Resource Limits

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## FAQ

**Q: Do I need to install Node.js?**
A: No! Docker handles everything.

**Q: Where is the database stored?**
A: In Docker volumes. Data persists across restarts. Use `docker volume ls` to see volumes.

**Q: Can I use this for production?**
A: Yes, but change all secrets in `.env` first!

**Q: How do I update environment variables?**
A: Edit `.env`, then run `docker-compose up -d` to restart.

**Q: Can I run this on Windows?**
A: Yes! Install Docker Desktop for Windows.

**Q: How much resources does this use?**
A: ~2GB RAM, ~5GB disk space (with data).

**Q: Can I expose services to the internet?**
A: Yes, but use a reverse proxy (nginx, Traefik) with SSL.

---

## Support

- Docker Issues: https://docs.docker.com/
- OrbStack: https://docs.orbstack.dev/
- ProjectHub Backend: See main README.md
